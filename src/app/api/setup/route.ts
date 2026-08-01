import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';
import Package from '@/server/models/Package';
import User from '@/server/models/User';
import WeeklyMenu from '@/server/models/WeeklyMenu';
import Zone from '@/server/models/Zone';
import { defaultMenuItems, defaultPackages, mymensinghZones } from '@/server/seed-data';

/**
 * One-time database seeding.
 *
 * In the Express backend this was a public POST — anyone who knew the URL could
 * re-seed the database. It now requires SETUP_SECRET, sent as `x-setup-secret`.
 */
function assertSetupSecret(req: Request) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) throw Object.assign(new Error('SETUP_SECRET is not configured'), { status: 503 });
  if (req.headers.get('x-setup-secret') !== expected) {
    throw Object.assign(new Error('Invalid setup secret'), { status: 401 });
  }
}

// POST /api/setup
export const POST = handler(async (req: Request) => {
  assertSetupSecret(req);
  const { force } = await body<{ force?: boolean }>(req);

  const alreadySeeded = (await Zone.countDocuments()) > 0 || (await Package.countDocuments()) > 0;
  if (alreadySeeded && !force) {
    return fail('Setup already completed. Send { "force": true } to seed anyway.', 400);
  }

  await Zone.insertMany(mymensinghZones, { ordered: false }).catch(() => []);
  await Package.insertMany(defaultPackages, { ordered: false }).catch(() => []);

  const packages = await Package.find();
  const menuRows = packages.flatMap(pkg =>
    defaultMenuItems.map(item => ({ ...item, package: pkg.name, isActive: true }))
  );
  await WeeklyMenu.insertMany(menuRows, { ordered: false }).catch(() => []);

  return ok({
    message: 'Database setup completed!',
    data: {
      zones: await Zone.countDocuments(),
      packages: await Package.countDocuments(),
      menuItems: await WeeklyMenu.countDocuments(),
      users: await User.countDocuments(),
      admins: await Admin.countDocuments(),
    },
  });
});

// GET /api/setup — status check
export const GET = handler(async (req: Request) => {
  assertSetupSecret(req);

  const [adminExists, zonesCount, packagesCount, menuCount] = await Promise.all([
    Admin.findOne(),
    Zone.countDocuments(),
    Package.countDocuments(),
    WeeklyMenu.countDocuments(),
  ]);

  return ok({
    data: {
      isSetup: !!adminExists,
      adminExists: !!adminExists,
      zonesCount,
      packagesCount,
      menuCount,
    },
  });
});
