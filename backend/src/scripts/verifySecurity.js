import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Country } from '../models/Country.js';
import { Visa } from '../models/Visa.js';
import { Application } from '../models/Application.js';
import { Document } from '../models/Document.js';
import { Payment } from '../models/Payment.js';
import { authService } from '../services/auth.service.js';
import { paymentService } from '../services/payment.service.js';
import { storageService } from '../services/storage.service.js';
import { env } from '../config/environment.js';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('\n========================================');
  console.log('STARTING NIMUFLY SECURITY VERIFICATION');
  console.log('========================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const results = [];

  // Helper to record test results
  function record(testNumber, name, expected, actual, passed) {
    results.push({ testNumber, name, expected, actual, passed });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[TEST ${testNumber}] ${name}: ${mark}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual:   ${actual}\n`);
  }

  // Set up test data
  // 1. Ensure Customer A, Customer B, and Admin exist
  let userA = await User.findOne({ email: 'test.customera@nimufly.com' });
  if (!userA) {
    userA = await User.create({
      name: 'Customer A',
      email: 'test.customera@nimufly.com',
      passwordHash: 'Password@123',
      role: 'CUSTOMER'
    });
  }

  let userB = await User.findOne({ email: 'test.customerb@nimufly.com' });
  if (!userB) {
    userB = await User.create({
      name: 'Customer B',
      email: 'test.customerb@nimufly.com',
      passwordHash: 'Password@123',
      role: 'CUSTOMER'
    });
  }

  // Tokens for A and B
  const tokensA = authService._generateTokens(userA);
  const tokensB = authService._generateTokens(userB);

  // 2. Fetch a valid active visa and country
  const validVisa = await Visa.findOne({ isActive: true, isDeleted: false }).populate('country');
  if (!validVisa || !validVisa.country) {
    throw new Error('Valid visa and country required for test');
  }

  // 3. Create an application owned by Customer B
  const appB = await Application.create({
    referenceNumber: `MV-TEST-B-${Date.now().toString().slice(-4)}`,
    customer: userB._id,
    visa: validVisa._id,
    country: validVisa.country._id,
    pricingSnapshot: {
      governmentFee: validVisa.governmentFee,
      serviceFee: validVisa.serviceFee,
      totalAmountPerPerson: validVisa.governmentFee + validVisa.serviceFee,
      travellerCount: 1,
      totalAmount: validVisa.governmentFee + validVisa.serviceFee,
      currency: 'INR'
    },
    travellers: [{ name: 'Traveller B', passportNumber: 'B1234567' }],
    adminNotes: 'INTERNAL_CONFIDENTIAL_AUDIT_NOTE_12345'
  });

  // Create a document belonging to Application B
  const docB = await Document.create({
    application: appB._id,
    documentType: 'Passport',
    name: 'Customer_B_Passport.pdf',
    originalFilename: 'Customer_B_Passport.pdf',
    storageKey: `applications/${appB._id}/confidential_doc.pdf`,
    status: 'PENDING'
  });

  // ----------------------------------------------------
  // TEST 1: Unauthenticated request to GET /applications
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/applications`);
    const data = await res.json();
    const passed = (res.status === 401 || res.status === 403) && (!data.data || data.data.length === 0);
    record(1, 'Unauthenticated GET /applications', 'HTTP 401/403 and NO application data', `HTTP ${res.status}, body: ${JSON.stringify(data).slice(0, 80)}`, passed);
  } catch (err) {
    record(1, 'Unauthenticated GET /applications', 'HTTP 401/403', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 2: Customer A attempts GET Customer B's application
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/applications/${appB._id}`, {
      headers: { Authorization: `Bearer ${tokensA.accessToken}` }
    });
    const data = await res.json();
    const passed = (res.status === 403 || res.status === 404) && !data.data?.referenceNumber;
    record(2, 'Customer A accesses Customer B Application', 'HTTP 403/404 and NO private data', `HTTP ${res.status}, message: ${data.message}`, passed);
  } catch (err) {
    record(2, 'Customer A accesses Customer B Application', 'HTTP 403/404', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 3: Customer A requests Customer B's document signed URL
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/documents/${docB._id}/signed-url`, {
      headers: { Authorization: `Bearer ${tokensA.accessToken}` }
    });
    const data = await res.json();
    const passed = (res.status === 403 || res.status === 404) && !data.data?.signedUrl;
    record(3, 'Customer A requests Customer B Document Signed URL', 'HTTP 403/404 and NO signed URL', `HTTP ${res.status}, message: ${data.message}`, passed);
  } catch (err) {
    record(3, 'Customer A requests Customer B Document Signed URL', 'HTTP 403/404', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 4: Customer A uploads document to Customer B's application
  // ----------------------------------------------------
  try {
    const formData = new FormData();
    formData.append('applicationId', appB._id.toString());
    formData.append('documentType', 'Passport');
    formData.append('file', new Blob(['test dummy content'], { type: 'application/pdf' }), 'dummy.pdf');

    const res = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokensA.accessToken}` },
      body: formData
    });
    const data = await res.json();
    const passed = (res.status === 403 || res.status === 404);
    record(4, 'Customer A uploads document to Customer B Application', 'HTTP 403/404 Forbidden', `HTTP ${res.status}, message: ${data.message}`, passed);
  } catch (err) {
    record(4, 'Customer A uploads document to Customer B Application', 'HTTP 403/404', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 5: Inactive visa rejected on POST /applications
  // ----------------------------------------------------
  let inactiveVisa = null;
  try {
    inactiveVisa = await Visa.create({
      country: validVisa.country._id,
      title: 'Inactive Test Visa',
      slug: `inactive-test-visa-${Date.now()}`,
      visaType: 'Tourist Visa',
      governmentFee: 1000,
      serviceFee: 500,
      isActive: false
    });

    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId: inactiveVisa._id.toString(),
        travellers: [{ name: 'Test Traveller', passportNumber: 'P12345' }]
      })
    });
    const data = await res.json();
    const passed = res.status === 400;
    record(5, 'Inactive Visa on POST /applications', 'Rejected with HTTP 400', `HTTP ${res.status}, message: ${data.message}`, passed);
  } catch (err) {
    record(5, 'Inactive Visa on POST /applications', 'Rejected with HTTP 400', `Error: ${err.message}`, false);
  } finally {
    if (inactiveVisa) await Visa.deleteOne({ _id: inactiveVisa._id });
  }

  // ----------------------------------------------------
  // TEST 6: Inactive country rejected on POST /applications
  // ----------------------------------------------------
  let inactiveCountry = null;
  let visaWithInactiveCountry = null;
  try {
    inactiveCountry = await Country.create({
      name: 'Inactive Land',
      code: 'IL',
      slug: `inactive-land-${Date.now()}`,
      isActive: false
    });

    visaWithInactiveCountry = await Visa.create({
      country: inactiveCountry._id,
      title: 'Visa With Inactive Country',
      slug: `visa-inactive-country-${Date.now()}`,
      visaType: 'Tourist Visa',
      governmentFee: 1000,
      serviceFee: 500,
      isActive: true
    });

    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId: visaWithInactiveCountry._id.toString(),
        travellers: [{ name: 'Test Traveller', passportNumber: 'P12345' }]
      })
    });
    const data = await res.json();
    const passed = res.status === 400;
    record(6, 'Inactive Country on POST /applications', 'Rejected with HTTP 400', `HTTP ${res.status}, message: ${data.message}`, passed);
  } catch (err) {
    record(6, 'Inactive Country on POST /applications', 'Rejected with HTTP 400', `Error: ${err.message}`, false);
  } finally {
    if (visaWithInactiveCountry) await Visa.deleteOne({ _id: visaWithInactiveCountry._id });
    if (inactiveCountry) await Country.deleteOne({ _id: inactiveCountry._id });
  }

  // ----------------------------------------------------
  // TEST 7: Fake payment signature rejected
  // ----------------------------------------------------
  try {
    // Initialize a payment order
    const initRes = await fetch(`${BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appB._id.toString(), paymentMethod: 'UPI' })
    });
    const initData = await initRes.json();
    const orderId = initData.data?.orderId;

    // Attempt verify with fake signature
    const verifyRes = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        paymentId: 'pay_mock_123',
        signature: 'fake_tampered_signature_payload'
      })
    });
    const verifyData = await verifyRes.json();
    const passed = verifyRes.status === 400 && verifyData.message.includes('signature');
    record(7, 'Fake Payment Signature Verification', 'Rejected with HTTP 400 Invalid signature', `HTTP ${verifyRes.status}, message: ${verifyData.message}`, passed);
  } catch (err) {
    record(7, 'Fake Payment Signature Verification', 'Rejected with HTTP 400', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 8: Production mode with missing Razorpay secret fails closed
  // ----------------------------------------------------
  try {
    const originalEnv = env.NODE_ENV;
    const originalSecret = env.RAZORPAY_KEY_SECRET;

    // Simulate production with empty secret
    env.NODE_ENV = 'production';
    env.RAZORPAY_KEY_SECRET = '';

    let failedClosed = false;
    try {
      paymentService._verifyRazorpaySignature({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'sig_123'
      });
    } catch (err) {
      failedClosed = true;
    }

    // Restore
    env.NODE_ENV = originalEnv;
    env.RAZORPAY_KEY_SECRET = originalSecret;

    record(8, 'Production Missing Razorpay Secret', 'Fails closed (throws security error)', failedClosed ? 'Threw security error (Failed closed)' : 'Returned value (Insecure)', failedClosed);
  } catch (err) {
    record(8, 'Production Missing Razorpay Secret', 'Fails closed', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 9: Client submits arbitrary low pricing { totalAmount: 1, price: 1 }
  // ----------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId: validVisa._id.toString(),
        totalAmount: 1,
        price: 1,
        amount: 1,
        travellers: [
          { name: 'Traveller 1', passportNumber: 'T1' },
          { name: 'Traveller 2', passportNumber: 'T2' }
        ]
      })
    });
    const data = await res.json();
    const appCreated = data.data;
    const expectedPerPerson = validVisa.governmentFee + validVisa.serviceFee;
    const expectedTotal = expectedPerPerson * 2;

    const passed = appCreated?.pricingSnapshot?.totalAmount === expectedTotal;
    record(9, 'Client Arbitrary Pricing Tampering Ignored', `Derived amount: ₹${expectedTotal} (per person: ₹${expectedPerPerson} x 2)`, `Actual stored: ₹${appCreated?.pricingSnapshot?.totalAmount}`, passed);

    // Clean up created test application
    if (appCreated?._id) await Application.deleteOne({ _id: appCreated._id });
  } catch (err) {
    record(9, 'Client Arbitrary Pricing Tampering Ignored', 'Calculated from DB Visa pricing', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 10: Customer attempts to provide client-controlled application reference
  // ----------------------------------------------------
  try {
    const maliciousRef = 'MV-HACKED-999999';
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId: validVisa._id.toString(),
        id: maliciousRef,
        applicationId: maliciousRef,
        referenceNumber: maliciousRef,
        travellers: [{ name: 'Traveller Ref Test', passportNumber: 'REF123' }]
      })
    });
    const data = await res.json();
    const assignedRef = data.data?.referenceNumber;
    const passed = assignedRef && assignedRef !== maliciousRef && /^MV-\d{6}$/.test(assignedRef);
    record(10, 'Client-Supplied Application Reference Ignored', 'Server generates reference (e.g. MV-XXXXXX), client ref rejected', `Assigned reference: ${assignedRef}`, passed);

    // Clean up
    if (data.data?._id) await Application.deleteOne({ _id: data.data._id });
  } catch (err) {
    record(10, 'Client-Supplied Application Reference Ignored', 'Server generates reference', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 11: Customer requests application - verify adminNotes & internal fields stripped
  // ----------------------------------------------------
  try {
    // Customer B requests their own application
    const res = await fetch(`${BASE_URL}/applications/${appB._id}`, {
      headers: { Authorization: `Bearer ${tokensB.accessToken}` }
    });
    const data = await res.json();
    const appData = data.data;

    const hasAdminNotes = 'adminNotes' in appData && Boolean(appData.adminNotes);
    const hasStorageKey = appData.documents?.some(d => 'storageKey' in d && Boolean(d.storageKey));

    const passed = !hasAdminNotes && !hasStorageKey;
    record(11, 'Customer Application Response Data Sanitization', 'adminNotes and storageKey stripped from customer response', `adminNotes present: ${hasAdminNotes}, storageKey present: ${hasStorageKey}`, passed);
  } catch (err) {
    record(11, 'Customer Application Response Data Sanitization', 'Fields stripped', `Error: ${err.message}`, false);
  }

  // ----------------------------------------------------
  // TEST 12: Production storage configuration missing fails closed
  // ----------------------------------------------------
  try {
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';

    let failedClosed = false;
    try {
      await storageService.uploadFile({
        buffer: Buffer.from('test doc'),
        originalFilename: 'test.pdf',
        mimeType: 'application/pdf'
      });
    } catch (err) {
      failedClosed = true;
    }

    env.NODE_ENV = originalEnv;
    record(12, 'Missing Production Storage Fails Closed', 'Does not silently store on local disk in production; throws error', failedClosed ? 'Threw error (Failed closed)' : 'Wrote to disk (Insecure)', failedClosed);
  } catch (err) {
    record(12, 'Missing Production Storage Fails Closed', 'Throws error in production', `Error: ${err.message}`, false);
  }

  // Clean up test records
  await Document.deleteMany({ application: appB._id });
  await Payment.deleteMany({ application: appB._id });
  await Application.deleteOne({ _id: appB._id });
  await User.deleteMany({ email: { $in: ['test.customera@nimufly.com', 'test.customerb@nimufly.com'] } });
  await mongoose.disconnect();

  console.log('========================================');
  console.log('SECURITY VERIFICATION SUMMARY:');
  const allPassed = results.every(r => r.passed);
  console.log(`Total tests: ${results.length}, Passed: ${results.filter(r => r.passed).length}, Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Status: ${allPassed ? 'ALL 12 TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
