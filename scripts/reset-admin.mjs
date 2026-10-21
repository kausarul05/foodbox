/**
 * Clear every admin account so the panel asks for a new one.
 *
 *   node scripts/reset-admin.mjs          # show what would be deleted
 *   node scripts/reset-admin.mjs --yes    # actually delete
 *
 * This is the handover step. `/admin/login` shows its first-run setup form
 * only while the admins collection is empty, so running this is what hands the
 * panel to its new owner: they open the page, pick their own email and
 * password, and nobody else ever knows them.
 *
 * It touches nothing else — customers, orders, wallets and deposits are not
 * admin accounts and are not read here. Still, you are deleting the only way
 * into the panel, so the dry run is the default and `--yes` is required.
 */
import fs from 'node:fs';
import mongoose from 'mongoose';

function readUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  const file = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = file.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  if (!match) throw new Error('MONGODB_URI not found in .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const confirmed = process.argv.includes('--yes');

await mongoose.connect(readUri());
const admins = mongoose.connection.db.collection('admins');

const rows = await admins.find({}, { projection: { email: 1, fullName: 1, role: 1 } }).toArray();
console.log('database:', mongoose.connection.db.databaseName);

if (rows.length === 0) {
  console.log('\nNo admin accounts. /admin/login already shows the setup form.');
} else {
  console.log(`\n${rows.length} admin account(s) would be deleted:`);
  for (const row of rows) console.log(`  ${row.email}  (${row.fullName || '—'}, ${row.role})`);

  if (!confirmed) {
    console.log('\nDry run. Re-run with --yes to delete them:');
    console.log('  node scripts/reset-admin.mjs --yes');
  } else {
    const { deletedCount } = await admins.deleteMany({});
    console.log(`\nDeleted ${deletedCount}. Open /admin/login — it now asks for a new`);
    console.log('email and password, and the first person to submit becomes the admin.');
    console.log('Do that straight away: until then anyone who finds the page can.');
  }
}

await mongoose.disconnect();
