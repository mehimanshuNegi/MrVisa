import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Document } from '../models/Document.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { Feedback } from '../models/Feedback.js';
import { applicationService } from '../services/application.service.js';
import { documentService } from '../services/document.service.js';
import { ROLES } from '../constants/roles.js';
import { APPLICATION_STATUS } from '../constants/statuses.js';
import { validatePassportDates } from '../utils/dateValidator.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertTest(name, condition, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function runPhase1Tests() {
  console.log('========================================================================');
  console.log('🚀 NIMUFLY PHASE 1 FEATURE VERIFICATION SUITE');
  console.log('========================================================================\n');

  await connectDatabase();

  const cleanupUserIds = [];
  const cleanupAppIds = [];
  const cleanupDocIds = [];
  const cleanupFeedbackIds = [];
  const cleanupVisaIds = [];

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: STRICT 10-YEAR DOCUMENT EXPIRY DATE VALIDATION
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: Strict 10-Year Document Expiry Validation ---');

    // Rule: expiryDate must be > issueDate AND < addYears(issueDate, 10)
    // 1. Issue: 15-11-2025, Expiry: 14-11-2035 -> VALID
    const test1 = validatePassportDates('15-11-2025', '14-11-2035');
    assertTest('Issue: 15-11-2025, Expiry: 14-11-2035 is VALID', test1.isValid === true);

    // 2. Issue: 15-11-2025, Expiry: 15-11-2035 -> INVALID (< 10 yrs, not <=)
    const test2 = validatePassportDates('15-11-2025', '15-11-2035');
    assertTest(
      'Issue: 15-11-2025, Expiry: 15-11-2035 is INVALID',
      test2.isValid === false && (test2.error.includes('10-year') || test2.error.includes('10 years'))
    );

    // 3. Issue: 15-11-2025, Expiry: 16-11-2035 -> INVALID
    const test3 = validatePassportDates('15-11-2025', '16-11-2035');
    assertTest('Issue: 15-11-2025, Expiry: 16-11-2035 is INVALID', test3.isValid === false);

    // 4. Issue: 15-11-2025, Expiry: 15-11-2036 -> INVALID
    const test4 = validatePassportDates('15-11-2025', '15-11-2036');
    assertTest('Issue: 15-11-2025, Expiry: 15-11-2036 is INVALID', test4.isValid === false);

    // 5. Issue: 15-11-2025, Expiry: 14-11-2025 -> INVALID (expiry before issue)
    const test5 = validatePassportDates('15-11-2025', '14-11-2025');
    assertTest(
      'Issue: 15-11-2025, Expiry: 14-11-2025 is INVALID (expiry <= issue)',
      test5.isValid === false && test5.error.includes('after the issue date')
    );

    // 6. ISO Date YYYY-MM-DD: 2025-01-01 -> max valid is 2034-12-31
    const test6a = validatePassportDates('2025-01-01', '2034-12-31');
    assertTest('Issue: 2025-01-01, Expiry: 2034-12-31 is VALID', test6a.isValid === true);

    const test6b = validatePassportDates('2025-01-01', '2035-01-01');
    assertTest('Issue: 2025-01-01, Expiry: 2035-01-01 is INVALID', test6b.isValid === false);

    // 7. Leap year handling: 2024-02-29
    const test7a = validatePassportDates('2024-02-29', '2034-02-27');
    assertTest('Leap year: Issue: 2024-02-29, Expiry: 2034-02-27 is VALID', test7a.isValid === true);

    const test7b = validatePassportDates('2024-02-29', '2034-02-28');
    assertTest('Leap year: Issue: 2024-02-29, Expiry: 2034-02-28 is INVALID (exact 10 yrs bound)', test7b.isValid === false);

    // ------------------------------------------------------------------------
    // SETUP TEST USERS & VISA
    // ------------------------------------------------------------------------
    const custEmailA = `cust_phase1_a_${Date.now()}@test.com`;
    const custEmailB = `cust_phase1_b_${Date.now()}@test.com`;
    const adminEmail = `admin_phase1_${Date.now()}@test.com`;

    const userA = await User.create({
      name: 'Phase1 Customer A',
      email: custEmailA,
      passwordHash: 'ValidPass123!',
      role: ROLES.CUSTOMER,
      phone: '+91 91111 22222',
      isActive: true
    });
    cleanupUserIds.push(userA._id);

    const userB = await User.create({
      name: 'Phase1 Customer B',
      email: custEmailB,
      passwordHash: 'ValidPass123!',
      role: ROLES.CUSTOMER,
      phone: '+91 92222 33333',
      isActive: true
    });
    cleanupUserIds.push(userB._id);

    const admin = await User.create({
      name: 'Phase1 Admin',
      email: adminEmail,
      passwordHash: 'AdminPass123!',
      role: ROLES.ADMIN,
      phone: '+91 93333 44444',
      isActive: true
    });
    cleanupUserIds.push(admin._id);

    // Find or create test Country & Visa
    let testCountry = await Country.findOne({ isActive: true });
    if (!testCountry) {
      testCountry = await Country.create({
        name: 'United Kingdom',
        code: 'GB',
        slug: `united-kingdom-${Date.now()}`,
        flagEmoji: '🇬🇧',
        isActive: true
      });
    }

    let testVisa = await Visa.findOne({ status: 'ACTIVE' });
    if (!testVisa) {
      testVisa = await Visa.create({
        country: testCountry._id,
        countryName: 'United Kingdom',
        countryCode: 'GB',
        title: 'UK Standard Visitor Visa',
        slug: `uk-visitor-visa-${Date.now()}`,
        visaType: 'Tourist Visa',
        processingTime: '5 Days',
        governmentFee: 12000,
        serviceFee: 2500,
        status: 'ACTIVE'
      });
    }

    // ------------------------------------------------------------------------
    // SECTION 2: BACKEND APPLICATION DATE VALIDATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Backend Application Date Validation ---');

    // Attempt to create application with invalid passport dates (Issue 2025-11-15, Expiry 2035-11-15)
    let dateRejectPassed = false;
    try {
      await applicationService.createApplication(
        {
          visaId: testVisa._id,
          travellers: [
            {
              firstName: 'John',
              lastName: 'Doe',
              passportNumber: 'Z1234567',
              issueDate: '2025-11-15',
              expiryDate: '2035-11-15' // Invalid: exactly 10 years
            }
          ]
        },
        userA
      );
    } catch (err) {
      dateRejectPassed = err.message.includes('10-year') || err.message.includes('10 years');
    }
    assertTest('Backend rejects application with expiry date >= 10 years from issue date', dateRejectPassed);

    // Attempt to create application with expiry <= issue
    let dateBeforeRejectPassed = false;
    try {
      await applicationService.createApplication(
        {
          visaId: testVisa._id,
          travellers: [
            {
              firstName: 'John',
              lastName: 'Doe',
              passportNumber: 'Z1234567',
              issueDate: '2025-11-15',
              expiryDate: '2024-11-15' // Invalid: expiry before issue
            }
          ]
        },
        userA
      );
    } catch (err) {
      dateBeforeRejectPassed = err.message.includes('after the issue date');
    }
    assertTest('Backend rejects application with expiry date <= issue date', dateBeforeRejectPassed);

    // ------------------------------------------------------------------------
    // SECTION 3: ADDITIONAL INFORMATION & VISA REFUSAL PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Additional Information & Previous Visa Refusal ---');

    // Create valid application with Phase 1 fields
    const validApp = await applicationService.createApplication(
      {
        visaId: testVisa._id,
        travellers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            passportNumber: 'Z1234567',
            issueDate: '2025-11-15',
            expiryDate: '2035-11-14' // Valid: strictly < 10 years
          }
        ],
        additionalInformation: 'Travelling with family for a 2-week holiday.',
        previousVisaRefusal: true,
        previousVisaRefusalCountry: 'United Kingdom',
        previousVisaRefusalReason: 'Refused in 2021 due to incomplete employment letter.'
      },
      userA
    );
    cleanupAppIds.push(validApp._id);

    assertTest('Application created successfully with valid 10-year dates', !!validApp._id);

    // Verify fields persisted in MongoDB
    const fetchedApp = await Application.findById(validApp._id);
    assertTest(
      'additionalInformation persisted in MongoDB',
      fetchedApp.additionalInformation === 'Travelling with family for a 2-week holiday.'
    );
    assertTest('previousVisaRefusal boolean persisted as true', fetchedApp.previousVisaRefusal === true);
    assertTest('previousVisaRefusalCountry persisted correctly', fetchedApp.previousVisaRefusalCountry === 'United Kingdom');
    assertTest(
      'previousVisaRefusalReason persisted correctly',
      fetchedApp.previousVisaRefusalReason === 'Refused in 2021 due to incomplete employment letter.'
    );

    // Verify admin can view the application with all Phase 1 fields
    const adminViewApp = await applicationService.getApplicationById(validApp._id, admin);
    assertTest(
      'Admin can view additionalInformation and refusal data',
      adminViewApp.additionalInformation === 'Travelling with family for a 2-week holiday.' &&
      adminViewApp.previousVisaRefusal === true &&
      adminViewApp.previousVisaRefusalReason.includes('incomplete employment letter')
    );

    // Test No Refusal application: previousVisaRefusal = false
    const noRefusalApp = await applicationService.createApplication(
      {
        visaId: testVisa._id,
        travellers: [
          {
            firstName: 'Alice',
            lastName: 'Doe',
            passportNumber: 'Z7654321',
            issueDate: '2025-11-15',
            expiryDate: '2035-11-14'
          }
        ],
        previousVisaRefusal: false,
        previousVisaRefusalCountry: 'United Kingdom'
      },
      userA
    );
    cleanupAppIds.push(noRefusalApp._id);

    const fetchedNoRefusal = await Application.findById(noRefusalApp._id);
    assertTest('previousVisaRefusal = false does not require refusal reason', fetchedNoRefusal.previousVisaRefusal === false);

    // ------------------------------------------------------------------------
    // SECTION 4: POST-APPLICATION FEEDBACK / RATING
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Post-Application Feedback / Rating ---');

    // 1. Submit valid feedback (rating 5, optional comment) by application owner
    const fbResult = await applicationService.submitFeedback(
      validApp._id,
      {
        rating: 5,
        comment: 'Very smooth application process.'
      },
      userA
    );
    if (fbResult?._id) cleanupFeedbackIds.push(fbResult._id);
    assertTest('Owner can submit valid feedback (rating 5 + comment)', fbResult.rating === 5 && fbResult.comment.includes('Very smooth'));

    // Verify feedback is saved in database
    const savedFb = await Feedback.findOne({ application: validApp._id });
    assertTest('Feedback is persisted in Feedback collection', !!savedFb && savedFb.rating === 5);

    // 2. Fetch feedback via applicationService
    const retrievedFb = await applicationService.getApplicationFeedback(validApp._id, userA);
    assertTest('Retrieved feedback has correct rating and comment', retrievedFb?.rating === 5);

    // 3. Admin can view the feedback
    const adminFb = await applicationService.getApplicationFeedback(validApp._id, admin);
    assertTest('Admin can view customer feedback', adminFb?.rating === 5);

    // 4. Test Rating 0 rejected
    let rejectZero = false;
    try {
      await applicationService.submitFeedback(
        noRefusalApp._id,
        {
          rating: 0,
          comment: 'Invalid'
        },
        userA
      );
    } catch (err) {
      rejectZero = true;
    }
    assertTest('Rating 0 is rejected (minimum is 1)', rejectZero);

    // 5. Test Rating 6 rejected
    let rejectSix = false;
    try {
      await applicationService.submitFeedback(
        noRefusalApp._id,
        {
          rating: 6,
          comment: 'Invalid'
        },
        userA
      );
    } catch (err) {
      rejectSix = true;
    }
    assertTest('Rating 6 is rejected (maximum is 5)', rejectSix);

    // 6. Security: Unauthorized user (userB) cannot submit feedback for userA's application
    let unauthorizedFbRejected = false;
    try {
      await applicationService.submitFeedback(
        validApp._id,
        {
          rating: 4,
          comment: 'Malicious attempt'
        },
        userB
      );
    } catch (err) {
      unauthorizedFbRejected = err.statusCode === 403 || err.message.includes('authorized');
    }
    assertTest('Unauthorized user cannot submit feedback for another user application', unauthorizedFbRejected);

    // ------------------------------------------------------------------------
    // SECTION 5: ADMIN DOCUMENT PREVIEW & DOWNLOAD AUTHORIZATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Admin Document Preview & Download Authorization ---');

    // Create a mock document record for userA's application
    const testDoc = await Document.create({
      application: validApp._id,
      travellerId: 'trav_1',
      documentType: 'Passport Front & Back',
      name: 'Passport_Scan.pdf',
      originalFilename: 'Passport_Scan.pdf',
      storageKey: `applications/${validApp._id}/passport_test.pdf`,
      mimeType: 'application/pdf',
      fileSize: 102400,
      status: 'VERIFIED'
    });
    cleanupDocIds.push(testDoc._id);

    // 1. Admin can get signed download/preview URL
    let adminCanDownload = false;
    try {
      const urlInfo = await documentService.getDocumentSignedUrl(testDoc._id, admin);
      adminCanDownload = typeof urlInfo === 'object' ? !!urlInfo.signedUrl : typeof urlInfo === 'string' && urlInfo.length > 0;
    } catch (err) {
      console.warn('Admin signed URL notice:', err.message);
    }
    assertTest('Authorized Admin can obtain document download/preview URL', adminCanDownload);

    // 2. Document Owner (userA) can get signed download/preview URL
    let ownerCanDownload = false;
    try {
      const urlInfo = await documentService.getDocumentSignedUrl(testDoc._id, userA);
      ownerCanDownload = typeof urlInfo === 'object' ? !!urlInfo.signedUrl : typeof urlInfo === 'string' && urlInfo.length > 0;
    } catch (err) {
      console.warn('Owner signed URL notice:', err.message);
    }
    assertTest('Document Owner can obtain their own document download URL', ownerCanDownload);

    // 3. Unauthorized User (userB) CANNOT get signed URL for userA's document
    let unauthorizedDocBlocked = false;
    try {
      await documentService.getDocumentSignedUrl(testDoc._id, userB);
    } catch (err) {
      unauthorizedDocBlocked = err.statusCode === 403 || err.message.includes('permission') || err.message.includes('authorized');
    }
    assertTest('Unauthorized user CANNOT access another customer document', unauthorizedDocBlocked);

    // ------------------------------------------------------------------------
    // SECTION 6: DYNAMIC DOCUMENT FORMATS
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Dynamic Document Formats ---');

    // Create visa requirement with specific accepted formats: ['PDF', 'JPG']
    const docReqs = [
      {
        title: 'Passport Bio Page',
        required: true,
        acceptedFormats: ['PDF', 'JPG']
      },
      {
        title: 'Bank Statement',
        required: true,
        acceptedFormats: ['PDF']
      }
    ];

    const formatVisa = await Visa.create({
      country: testCountry._id,
      countryName: 'Singapore',
      countryCode: 'SG',
      title: 'Singapore Tourist E-Visa',
      slug: `singapore-tourist-evisa-${Date.now()}`,
      visaType: 'Tourist Visa',
      processingTime: '3 Days',
      governmentFee: 3000,
      serviceFee: 1500,
      requiredDocuments: docReqs,
      status: 'ACTIVE'
    });
    cleanupVisaIds.push(formatVisa._id);

    const fetchedVisa = await Visa.findById(formatVisa._id);
    const reqs = fetchedVisa.requiredDocuments || fetchedVisa.documentsRequired || [];
    assertTest(
      'Visa stores dynamic acceptedFormats on document requirements',
      Array.isArray(reqs) &&
      reqs[0]?.acceptedFormats?.includes('PDF') &&
      reqs[0]?.acceptedFormats?.includes('JPG')
    );
    assertTest(
      'Bank statement requirement specifies PDF only',
      reqs[1]?.acceptedFormats?.length === 1 &&
      reqs[1]?.acceptedFormats[0] === 'PDF'
    );
    await Visa.findByIdAndDelete(formatVisa._id);

  } catch (err) {
    console.error('Test suite error:', err);
    failedTests++;
  } finally {
    // Clean up test data
    console.log('\nCleaning up Phase 1 test records...');
    if (cleanupVisaIds.length) await Visa.deleteMany({ _id: { $in: cleanupVisaIds } });
    if (cleanupFeedbackIds.length) await Feedback.deleteMany({ _id: { $in: cleanupFeedbackIds } });
    if (cleanupDocIds.length) await Document.deleteMany({ _id: { $in: cleanupDocIds } });
    if (cleanupAppIds.length) await Application.deleteMany({ _id: { $in: cleanupAppIds } });
    if (cleanupUserIds.length) await User.deleteMany({ _id: { $in: cleanupUserIds } });
    await disconnectDatabase();
  }

  console.log('\n========================================================================');
  console.log(`PHASE 1 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASS (${failedTests} FAIL)`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase1Tests();
