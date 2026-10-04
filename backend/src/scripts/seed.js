import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Visa } from '../models/Visa.js';
import { Application } from '../models/Application.js';
import { migrateExcelDatabase } from './migrateExcel.js';
import { ROLES } from '../constants/roles.js';
import { APPLICATION_STATUS, REQUIRED_ACTION, PAYMENT_STATUS } from '../constants/statuses.js';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 Starting Nimufly Database Seeding Process...');
  console.log('====================================================');

  await connectDatabase();

  // 1. Seed Default Admin User
  let admin = await User.findOne({ email: env.DEFAULT_ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      name: env.DEFAULT_ADMIN_NAME,
      firstName: 'NimuFly',
      lastName: 'Admin',
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      phone: '+91 98765 00000',
      passwordHash: env.DEFAULT_ADMIN_PASSWORD,
      role: ROLES.ADMIN,
      nationality: 'Indian',
      isActive: true
    });
    console.log(`✓ Created Admin User: ${admin.email}`);
  } else {
    console.log(`✓ Admin User already exists: ${admin.email}`);
  }

  // 2. Migrate and seed Countries & Visas from Excel (Preserves catalog data)
  await migrateExcelDatabase();

  console.log('====================================================');
  console.log('🎉 Seeding Process Finished Successfully!');
  console.log('====================================================');
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await seedDatabase();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Seeding process failed:', { error: err.message, stack: err.stack });
      process.exit(1);
    }
  })();
}

export default seedDatabase;
