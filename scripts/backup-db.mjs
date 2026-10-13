/**
 * Read-only dump of every collection to JSON, one file per collection.
 *
 *   node scripts/backup-db.mjs [outputDir]
 *
 * Default output is backups/<timestamp>/ at the repo root, which .gitignore
 * excludes — these files hold real customer phone numbers and addresses and
 * must not reach the repository. Restore with scripts/restore-db.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';

function readUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  const file = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = file.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  if (!match) throw new Error('MONGODB_URI not found in .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.resolve(
  process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', 'backups', stamp)
);

await mongoose.connect(readUri());
const db = mongoose.connection.db;

fs.mkdirSync(outDir, { recursive: true });
console.log('database:', db.databaseName);
console.log('writing to:', outDir);

const manifest = [];
for (const { name } of await db.listCollections().toArray()) {
  const docs = await db.collection(name).find({}).toArray();
  const indexes = await db.collection(name).indexes();
  // EJSON keeps ObjectIds and Dates as themselves rather than flattening them
  // to strings, so a restore puts back what was taken out.
  fs.writeFileSync(path.join(outDir, `${name}.json`), EJSON.stringify(docs, null, 2));
  fs.writeFileSync(path.join(outDir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));
  manifest.push({ collection: name, documents: docs.length });
  console.log(`  ${name}: ${docs.length}`);
}

fs.writeFileSync(
  path.join(outDir, '_manifest.json'),
  JSON.stringify({ database: db.databaseName, takenAt: new Date().toISOString(), manifest }, null, 2)
);

console.log('total documents:', manifest.reduce((n, c) => n + c.documents, 0));
await mongoose.disconnect();
