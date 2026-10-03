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

  // 2. Seed Default Sample Customer User (Rahul Sharma from frontend mock data)
  let customer = await User.findOne({ email: 'rahul.sharma@example.com' });
  if (!customer) {
    customer = await User.create({
      name: 'Rahul Sharma',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@example.com',
      phone: '9876543210',
      passwordHash: 'Customer@NimuFly2026!',
      role: ROLES.CUSTOMER,
      nationality: 'Indian',
      countryOfResidence: 'India',
      passportNumber: 'Z8765432',
      isActive: true
    });
    console.log(`✓ Created Customer User: ${customer.email}`);
  } else {
    console.log(`✓ Customer User already exists: ${customer.email}`);
  }

  // 3. Migrate and seed Countries & Visas from Excel
  await migrateExcelDatabase();

  // 4. Seed Sample Application for Customer if none exists
  const existingApp = await Application.findOne({ customer: customer._id });
  if (!existingApp) {
    const thailandVisa = await Visa.findOne({ slug: { $regex: 'thailand' } }).populate('country');
    if (thailandVisa && thailandVisa.country) {
      const gov = thailandVisa.governmentFee || 0;
      const svc = thailandVisa.serviceFee || 1200;
      const total = gov + svc;

      await Application.create({
        referenceNumber: 'MV-102845',
        customer: customer._id,
        visa: thailandVisa._id,
        country: thailandVisa.country._id,
        pricingSnapshot: {
          governmentFee: gov,
          serviceFee: svc,
          totalAmountPerPerson: total,
          travellerCount: 1,
          totalAmount: total,
          currency: 'INR'
        },
        travellers: [
          {
            travellerId: 'trav_1',
            firstName: 'Rahul',
            lastName: 'Sharma',
            name: 'Rahul Sharma',
            email: customer.email,
            phone: customer.phone,
            passportNumber: 'Z8765432',
            placeOfIssue: 'New Delhi',
            issueDate: '12/04/2019',
            expiryDate: '11/04/2029',
            nationality: 'Indian',
            dob: '15/08/1992',
            gender: 'Male'
          }
        ],
        status: APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW,
        requiredAction: REQUIRED_ACTION.NONE,
        paymentStatus: PAYMENT_STATUS.SUCCESS,
        adminMessage: 'Application registered. Consulate verification in progress.',
        expectedCompletionDate: thailandVisa.guaranteedDate || 'Within 3 days',
        timeline: [
          { stage: 'Application Submitted', completed: true, current: false, timestamp: new Date(Date.now() - 86400000).toISOString() },
          { stage: 'Documents Verified', completed: false, current: true, timestamp: '' },
          { stage: 'Application Processing', completed: false, current: false, timestamp: '' },
          { stage: 'Visa Issued', completed: false, current: false, timestamp: '' }
        ]
      });
      console.log('✓ Created Sample Application MV-102845 for Rahul Sharma');
    }
  }

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
