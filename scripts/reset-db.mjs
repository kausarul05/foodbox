/**
 * Empties the database for a clean end-to-end test.
 *
 *   node scripts/reset-db.mjs               # report what it would do
 *   node scripts/reset-db.mjs --confirm     # do it
 *
 * This is destructive and cannot be undone. It refuses to run unless a backup
 * taken by scripts/backup-db.mjs exists under backups/, so there is always
 * something to go back to.
 *
 * `settings` is left alone — it is one document of site configuration, not
 * test data. Everything else goes, including the reference collections, which
 * POST /api/setup re-seeds afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const confirmed = process.argv.includes('--confirm');

/** Dropped entirely. */
const WIPE = [
  'users',
  'orders',
  'manualorders',
  'subscriptions',
  'transactions',
  'expenses',
  'blockeddates',
  'zones',
  'packages',
  'weeklymenus',
  'admins',
];

/** Left as it is. */
const KEEP = ['settings'];

function readUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  const file = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = file.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  if (!match) throw new Error('MONGODB_URI not found in .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const backupsDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', 'backups');
const backups = fs.existsSync(backupsDir)
  ? fs.readdirSync(backupsDir).filter((d) => fs.existsSync(path.join(backupsDir, d, '_manifest.json')))
  : [];

if (backups.length === 0) {
  console.error('No backup found under backups/. Run `node scripts/backup-db.mjs` first.');
  process.exit(1);
}
console.log('latest backup:', backups.sort().at(-1));

await mongoose.connect(readUri());
const db = mongoose.connection.db;
console.log('database:', db.databaseName);
console.log(confirmed ? '— WIPING —' : '— dry run, nothing will be deleted (pass --confirm) —');

const present = (await db.listCollections().toArray()).map((c) => c.name);

for (const name of WIPE) {
  if (!present.includes(name)) {
    console.log(`  ${name}: absent`);
    continue;
  }
  const n = await db.collection(name).countDocuments();
  if (confirmed) {
    await db.collection(name).drop();
    console.log(`  ${name}: dropped (${n} documents)`);
  } else {
    console.log(`  ${name}: would drop ${n} documents`);
  }
}

for (const name of KEEP) {
  const n = present.includes(name) ? await db.collection(name).countDocuments() : 0;
  console.log(`  ${name}: kept (${n} documents)`);
}

/*
 * Rebuild the user indexes by hand.
 *
 * Dropping the collection took its indexes with it, and Mongoose's autoIndex
 * only runs once a model is first used — the first signup would otherwise race
 * the index build. An empty collection is also the one moment these can be
 * created exactly as the schema intends, with no existing rows to conflict:
 * email unique *and* sparse so accounts without one do not collide, and
 * phoneNumber genuinely unique, which the old database never enforced.
 */
if (confirmed) {
  await db.createCollection('users');
  await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
  await db.collection('users').createIndex({ phoneNumber: 1 }, { unique: true, sparse: true, name: 'phoneNumber_1' });
  const describe = (i) => `${i.name} unique=${!!i.unique} sparse=${!!i.sparse}`;
  console.log('users indexes:', (await db.collection('users').indexes()).map(describe).join(' | '));
}

console.log(confirmed ? 'done — now re-seed with POST /api/setup and POST /api/setup/admin' : 'dry run complete');
await mongoose.disconnect();
