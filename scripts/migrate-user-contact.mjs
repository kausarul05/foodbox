/**
 * One-off, idempotent migration for the "email optional / WhatsApp required"
 * change. Run it once per database:
 *
 *   node scripts/migrate-user-contact.mjs          # report only
 *   node scripts/migrate-user-contact.mjs --apply  # write
 *
 * It does three things, none of which Mongoose can do on its own:
 *
 * 1. Backfills `whatsappNumber` from `phoneNumber`. The field is `required`, and
 *    Mongoose validates on every save — including the wallet deduction in
 *    POST /api/orders — so existing accounts need a value or those saves fail.
 * 2. Clears stored `null`/`''` emails. A sparse index skips *missing* fields but
 *    still indexes an explicit null, so two of them would collide.
 * 3. Rebuilds `email_1` as unique + sparse. Mongoose will not alter an index
 *    that already exists with different options; it logs an
 *    IndexOptionsConflict and carries on with the old one.
 *
 * It also reports `phoneNumber_1`, which the schema declares unique but the
 * database does not enforce. Pass --fix-phone to rebuild that one too; it
 * refuses if any duplicate numbers exist.
 */
import fs from 'node:fs';
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');
const fixPhone = process.argv.includes('--fix-phone');

function readUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  const file = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = file.match(/^\s*MONGODB_URI\s*=\s*(.+)$/m);
  if (!match) throw new Error('MONGODB_URI not found in .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const say = (...args) => console.log(...args);

await mongoose.connect(readUri());
const users = mongoose.connection.db.collection('users');

say(apply ? '— applying —' : '— dry run, nothing will be written (pass --apply) —');
say('users:', await users.countDocuments());

// 1. whatsappNumber backfill
const missingWhatsapp = { $or: [{ whatsappNumber: { $exists: false } }, { whatsappNumber: null }, { whatsappNumber: '' }] };
const toBackfill = await users.countDocuments(missingWhatsapp);
say('without whatsappNumber:', toBackfill);
if (apply && toBackfill) {
  const res = await users.updateMany(missingWhatsapp, [{ $set: { whatsappNumber: '$phoneNumber' } }]);
  say('  backfilled from phoneNumber:', res.modifiedCount);
}

// 2. blank emails must be absent, not null
const blankEmail = { $or: [{ email: null }, { email: '' }] };
const toUnset = await users.countDocuments(blankEmail);
say('with null/empty email:', toUnset);
if (apply && toUnset) {
  const res = await users.updateMany(blankEmail, { $unset: { email: '' } });
  say('  unset:', res.modifiedCount);
}

// 3. indexes
const indexes = await users.indexes();
const describe = (i) => `${i.name} unique=${!!i.unique} sparse=${!!i.sparse}`;
say('indexes:', indexes.map(describe).join(' | '));

const emailIndex = indexes.find((i) => i.name === 'email_1');
const emailOk = emailIndex && emailIndex.unique && emailIndex.sparse;
say('email_1 needs rebuild:', !emailOk);
if (apply && !emailOk) {
  if (emailIndex) await users.dropIndex('email_1');
  await users.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
  say('  email_1 rebuilt as unique + sparse');
}

const phoneIndex = indexes.find((i) => i.name === 'phoneNumber_1');
const phoneOk = phoneIndex && phoneIndex.unique;
say('phoneNumber_1 unique:', !!phoneOk, phoneOk ? '' : '(schema says it should be)');
if (!phoneOk) {
  const dupes = await users
    .aggregate([
      { $group: { _id: '$phoneNumber', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  say('  duplicate phone numbers:', dupes.length, dupes.map((d) => d._id).join(', '));
  if (apply && fixPhone) {
    if (dupes.length) {
      say('  refusing: resolve the duplicates above first');
    } else {
      if (phoneIndex) await users.dropIndex('phoneNumber_1');
      await users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true, name: 'phoneNumber_1' });
      say('  phoneNumber_1 rebuilt as unique + sparse');
    }
  } else if (!fixPhone) {
    say('  left alone — pass --fix-phone to rebuild it');
  }
}

say('final:', (await users.indexes()).map(describe).join(' | '));
await mongoose.disconnect();
