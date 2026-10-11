/**
 * End-to-end service integration test for OTP verification & Application Flow
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Enable test simulation for SMS in test environment
process.env.NODE_ENV = 'test';

import { verificationService } from '../services/verification.service.js';
import { applicationService } from '../services/application.service.js';
import { VerificationCode } from '../models/VerificationCode.js';
import { Application } from '../models/Application.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  try {
    const testPhone = '9876543210';
    const testEmail = 'user@gmail.com';

    // Cleanup any existing test verification codes for this target
    await VerificationCode.deleteMany({ target: { $regex: '9876543210' } });

    // ---------------------------------------------------------------
    // Test 7 & 10: Dispatch OTP and check 60s cooldown enforcement
    // ---------------------------------------------------------------
    console.log('Step 1: Dispatch OTP & Cooldown test');
    const sendRes = await verificationService.sendOtp({
      target: testPhone,
      type: 'PHONE'
    });
    assert(sendRes.success === true && sendRes.cooldownSeconds === 60, 'OTP dispatched with 60s cooldown');

    // Immediate second send must be blocked by cooldown
    let cooldownBlocked = false;
    try {
      await verificationService.sendOtp({ target: testPhone, type: 'PHONE' });
    } catch (err) {
      if (err.message.includes('seconds before requesting a new code')) {
        cooldownBlocked = true;
      }
    }
    assert(cooldownBlocked, 'Resending OTP immediately blocked by 60s cooldown');

    // Retrieve the active verification code record
    const record = await VerificationCode.findOne({
      target: '+919876543210',
      type: 'PHONE',
      status: 'PENDING'
    });
    assert(Boolean(record && record.codeHash), 'Verification record created in MongoDB with hashed code');

    // ---------------------------------------------------------------
    // Test 9: Incorrect OTP blocks submission & tracks attempt limit
    // ---------------------------------------------------------------
    console.log('\nStep 2: Incorrect OTP rejection test');
    let incorrectBlocked = false;
    try {
      await verificationService.verifyOtp({
        target: testPhone,
        type: 'PHONE',
        code: '000000'
      });
    } catch (err) {
      if (err.message.includes('Invalid verification code')) {
        incorrectBlocked = true;
      }
    }
    assert(incorrectBlocked, 'Incorrect OTP rejected');

    const updatedRecord = await VerificationCode.findById(record._id);
    assert(updatedRecord.attempts === 1, 'Failed attempt incremented attempts count to 1');

    // ---------------------------------------------------------------
    // Test 9 (cont): Expired OTP blocks submission
    // ---------------------------------------------------------------
    console.log('\nStep 3: Expired OTP rejection test');
    // Artificially expire the record
    updatedRecord.expiresAt = new Date(Date.now() - 5000);
    await updatedRecord.save();

    let expiredBlocked = false;
    try {
      await verificationService.verifyOtp({
        target: testPhone,
        type: 'PHONE',
        code: '123456'
      });
    } catch (err) {
      if (err.message.includes('expired')) {
        expiredBlocked = true;
      }
    }
    assert(expiredBlocked, 'Expired OTP rejected');

    // ---------------------------------------------------------------
    // Test 11: Changing mobile number invalidates old OTP
    // ---------------------------------------------------------------
    console.log('\nStep 4: Phone number change invalidation test');
    // Create another code for testPhone
    await VerificationCode.findOneAndUpdate(
      { target: '+919876543210', type: 'PHONE' },
      {
        lastSentAt: new Date(Date.now() - 70000), // bypass cooldown
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000)
      }
    );
    await verificationService.invalidateOtp({ target: '+919876543210', type: 'PHONE' });
    const invalidated = await VerificationCode.findOne({ target: '+919876543210', type: 'PHONE' });
    assert(invalidated.status === 'EXPIRED', 'Old OTP invalidated when mobile number changes');

    // ---------------------------------------------------------------
    // Test 12: Direct API calls cannot bypass OTP verification
    // ---------------------------------------------------------------
    console.log('\nStep 5: Direct API bypass defense test');
    // Find or pick a valid active visa from database
    const visa = await Visa.findOne({ isActive: true, isDeleted: false });
    if (!visa) {
      console.warn('No active visa found in DB; skipping direct visa submission test.');
    } else {
      const appWithoutOtp = {
        visaId: visa._id.toString(),
        applicantEmail: testEmail,
        applicantPhone: testPhone,
        travellers: [
          {
            name: 'Test Applicant',
            email: testEmail,
            phone: testPhone,
            nationality: 'Indian',
            passportNumber: 'A1234567',
            issueDate: '2022-01-01',
            expiryDate: '2031-12-31'
          }
        ]
      };

      let bypassBlocked = false;
      try {
        await applicationService.createApplication(appWithoutOtp);
      } catch (err) {
        if (err.message.includes('Mobile number OTP verification is required')) {
          bypassBlocked = true;
        }
      }
      assert(bypassBlocked, 'Direct submission without OTP blocked by backend with 400 Bad Request');

      // Test with incorrect OTP directly in createApplication
      let wrongOtpBlocked = false;
      try {
        await applicationService.createApplication({
          ...appWithoutOtp,
          otp: '999999'
        });
      } catch (err) {
        wrongOtpBlocked = true;
      }
      assert(wrongOtpBlocked, 'Direct submission with invalid OTP blocked by backend');

      // ---------------------------------------------------------------
      // Test 8: Correct OTP allows application submission
      // ---------------------------------------------------------------
      console.log('\nStep 6: Correct OTP allows submission');
      // Create fresh code with known value
      const testCode = '753159';
      const testHash = verificationService._hashOtp(testCode, '+919876543210');
      await VerificationCode.findOneAndUpdate(
        { target: '+919876543210', type: 'PHONE' },
        {
          target: '+919876543210',
          type: 'PHONE',
          codeHash: testHash,
          status: 'PENDING',
          attempts: 0,
          lastSentAt: new Date(),
          expiresAt: new Date(Date.now() + 600000)
        },
        { upsert: true, new: true }
      );

      const testAppId = `MV-${Math.floor(100000 + Math.random() * 900000)}`;
      const successfulApp = await applicationService.createApplication({
        ...appWithoutOtp,
        applicationId: testAppId,
        otp: testCode
      });

      assert(Boolean(successfulApp && successfulApp._id), `Application submitted successfully with ref: ${successfulApp.referenceNumber}`);
      assert(successfulApp.status === 'APPLICATION_RECEIVED', 'Application status updated to APPLICATION_RECEIVED');

      // Check OTP record consumed
      const consumedRecord = await VerificationCode.findOne({ target: '+919876543210', type: 'PHONE' });
      assert(consumedRecord.status === 'CONSUMED', 'OTP consumed so it cannot be reused');

      // ---------------------------------------------------------------
      // Test 13: Retrying submission does not create duplicate applications
      // ---------------------------------------------------------------
      console.log('\nStep 7: Idempotency / No duplicate applications on retry');
      const initialCount = await Application.countDocuments({ referenceNumber: successfulApp.referenceNumber });
      assert(initialCount === 1, 'Initial application count is exactly 1');

      // Prepare fresh code for retry simulation
      const retryCode = '852963';
      const retryHash = verificationService._hashOtp(retryCode, '+919876543210');
      await VerificationCode.findOneAndUpdate(
        { target: '+919876543210', type: 'PHONE' },
        {
          target: '+919876543210',
          type: 'PHONE',
          codeHash: retryHash,
          status: 'PENDING',
          attempts: 0,
          lastSentAt: new Date(),
          expiresAt: new Date(Date.now() + 600000)
        },
        { upsert: true, new: true }
      );

      // Submit again with the SAME applicationId
      const retryApp = await applicationService.createApplication({
        ...appWithoutOtp,
        applicationId: successfulApp.referenceNumber,
        otp: retryCode
      });

      const afterRetryCount = await Application.countDocuments({ referenceNumber: successfulApp.referenceNumber });
      assert(afterRetryCount === 1, 'Retrying submission did not create a duplicate application record');
      assert(retryApp._id.toString() === successfulApp._id.toString(), 'Retried submission updated the same application document');

      // Clean up test application
      await Application.findByIdAndDelete(successfulApp._id);
    }

    // Clean up test verification code
    await VerificationCode.deleteMany({ target: '+919876543210' });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('\n====================================================');
    console.log(`INTEGRATION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
