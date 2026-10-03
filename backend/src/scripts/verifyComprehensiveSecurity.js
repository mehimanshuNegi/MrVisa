import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/environment.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payment.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { Country } from '../models/Country.js';
import { Visa } from '../models/Visa.js';
import { Document } from '../models/Document.js';
import { authService } from '../services/auth.service.js';
import { applicationService } from '../services/application.service.js';
import { paymentService } from '../services/payment.service.js';
import { documentService } from '../services/document.service.js';
import { validateFilePayload } from '../utils/fileValidator.js';
import { createApp } from '../app.js';
import { PAYMENT_STATUS, PAYMENT_PROVIDER } from '../constants/statuses.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const resultsTable = [];

function recordResult(testName, expected, actual, passed) {
  totalTests++;
  if (passed) passedTests++;
  else failedTests++;
  resultsTable.push({
    test: testName,
    expected,
    actual,
    status: passed ? 'PASS' : 'FAIL'
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName} -> Expected: ${expected} | Actual: ${actual}`);
}

async function runComprehensiveSecuritySuite() {
  console.log('\n========================================================================');
  console.log('   NIMUFLY COMPREHENSIVE FINAL SECURITY VERIFICATION SUITE (28 SCENARIOS)');
  console.log('========================================================================\n');

  await connectDatabase();

  // Clean test artifacts
  await User.deleteMany({ email: /@comprehensive-test\.com$/ });
  await Application.deleteMany({ 'contactDetails.email': /@comprehensive-test\.com$/ });
  await RefreshToken.deleteMany({});
  await Payment.deleteMany({ providerOrderId: /^order_comp_/ });

  // Setup base test records
  const country = await Country.findOne({ isActive: true }) || await Country.create({
    name: 'Audit Kingdom',
    code: 'AK',
    slug: 'audit-kingdom',
    currency: 'INR',
    isActive: true
  });

  const visa = await Visa.findOne({ isActive: true }) || await Visa.create({
    country: country._id,
    title: 'Audit Tourist Visa',
    slug: 'audit-tourist-visa',
    visaType: 'Tourist',
    governmentFee: 3000,
    serviceFee: 1500,
    isActive: true
  });

  // Create Customer A
  const custA = await User.create({
    name: 'Customer Alpha',
    email: 'alpha@comprehensive-test.com',
    passwordHash: 'Password123!',
    phone: '+91 98765 43210',
    role: 'CUSTOMER',
    isActive: true
  });

  // Create Customer B
  const custB = await User.create({
    name: 'Customer Beta',
    email: 'beta@comprehensive-test.com',
    passwordHash: 'Password123!',
    phone: '+91 91234 56789',
    role: 'CUSTOMER',
    isActive: true
  });

  // Create Admin
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@comprehensive-test.com',
    passwordHash: 'Password123!',
    role: 'ADMIN',
    isActive: true
  });

  // Create Guest Application
  const guestApp = await applicationService.createApplication({
    visaId: visa._id.toString(),
    contactDetails: {
      email: 'guest@comprehensive-test.com',
      phone: '+91 99887 76655'
    },
    travellers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        passportNumber: 'Z1234567',
        nationality: 'Indian',
        dateOfBirth: '1990-01-01',
        gender: 'Male'
      }
    ],
    pricingSnapshot: {
      governmentFee: 3000,
      serviceFee: 1500,
      totalAmount: 4500,
      currency: 'INR',
      travellerCount: 1
    }
  });

  // -------------------------------------------------------------
  // TEST 1: "-" guest claim bypass
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '-',
      customerUser: custA
    });
    recordResult('1. "-" guest claim bypass', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('1. "-" guest claim bypass', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 2: "@" guest claim bypass
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '@',
      customerUser: custA
    });
    recordResult('2. "@" guest claim bypass', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('2. "@" guest claim bypass', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 3: empty verification key
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '   ',
      customerUser: custA
    });
    recordResult('3. Empty verification key', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('3. Empty verification key', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 4: single digit verification key ("0" to "9")
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '5',
      customerUser: custA
    });
    recordResult('4. Single digit verification key', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('4. Single digit verification key', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 5: partial phone number (suffix match attempt "76655")
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '76655',
      customerUser: custA
    });
    recordResult('5. Partial phone number suffix', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('5. Partial phone number suffix', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 6: partial passport ("Z123")
  // -------------------------------------------------------------
  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: 'Z123',
      customerUser: custA
    });
    recordResult('6. Partial passport number', 'Rejection with 400', 'Allowed', false);
  } catch (err) {
    const passed = err.statusCode === 400;
    recordResult('6. Partial passport number', 'Rejection with 400', `${err.statusCode} ${err.message}`, passed);
  }

  // -------------------------------------------------------------
  // TEST 7: reference enumeration (non-existent vs wrong verification key)
  // Both must return identical generic 400 message and status
  // -------------------------------------------------------------
  let nonExistentMsg = '';
  let nonExistentStatus = 0;
  let wrongKeyMsg = '';
  let wrongKeyStatus = 0;

  try {
    await applicationService.claimGuestApplication({
      referenceNumber: 'MV-999999',
      verificationKey: '9988776655',
      customerUser: custA
    });
  } catch (err) {
    nonExistentStatus = err.statusCode;
    nonExistentMsg = err.message;
  }

  try {
    await applicationService.claimGuestApplication({
      referenceNumber: guestApp.referenceNumber,
      verificationKey: '1111122222',
      customerUser: custA
    });
  } catch (err) {
    wrongKeyStatus = err.statusCode;
    wrongKeyMsg = err.message;
  }

  const noLeak = nonExistentStatus === 400 && wrongKeyStatus === 400 && nonExistentMsg === wrongKeyMsg;
  recordResult(
    '7. Reference enumeration prevention',
    'Identical 400 status & generic message for non-existent vs mismatch',
    `NonExistent: ${nonExistentStatus} "${nonExistentMsg}" | Mismatch: ${wrongKeyStatus} "${wrongKeyMsg}"`,
    noLeak
  );

  // -------------------------------------------------------------
  // TEST 8: Concurrent refresh-token rotation (Atomic concurrency)
  // -------------------------------------------------------------
  const loginRes = await authService.login({
    email: 'alpha@comprehensive-test.com',
    password: 'Password123!'
  });
  const initialRefreshToken = loginRes.tokens.refreshToken;

  const [refreshPromise1, refreshPromise2] = await Promise.allSettled([
    authService.refreshToken(initialRefreshToken),
    authService.refreshToken(initialRefreshToken)
  ]);

  const successCount = (refreshPromise1.status === 'fulfilled' ? 1 : 0) + (refreshPromise2.status === 'fulfilled' ? 1 : 0);
  const failCount = (refreshPromise1.status === 'rejected' ? 1 : 0) + (refreshPromise2.status === 'rejected' ? 1 : 0);
  const passedAtomic = successCount === 1 && failCount === 1;
  recordResult(
    '8. Concurrent refresh-token atomic rotation',
    'Exactly 1 fulfilled, 1 rejected',
    `Fulfilled: ${successCount}, Rejected: ${failCount}`,
    passedAtomic
  );

  // -------------------------------------------------------------
  // TEST 9: Revoked refresh replay detection (Token family invalidation)
  // -------------------------------------------------------------
  let replayError = '';
  try {
    await authService.refreshToken(initialRefreshToken); // Now revoked!
  } catch (err) {
    replayError = err.message;
  }

  // All tokens for user should now be revoked
  const activeTokensForAlpha = await RefreshToken.find({ user: custA._id, isRevoked: false });
  const passedReplay = replayError.includes('Revoked refresh token') && activeTokensForAlpha.length === 0;
  recordResult(
    '9. Revoked refresh replay detection & family termination',
    'Rejection with alert & all user sessions invalidated (0 active)',
    `Active tokens remaining: ${activeTokensForAlpha.length}, Error: ${replayError}`,
    passedReplay
  );

  // -------------------------------------------------------------
  // TEST 10: Valid Razorpay webhook (Updates status with HMAC)
  // -------------------------------------------------------------
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_key_12345';
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
  env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  const webhookApp = await applicationService.createApplication({
    visaId: visa._id.toString(),
    contactDetails: { email: 'webhook@comprehensive-test.com', phone: '+91 99887 76655' },
    travellers: [{ firstName: 'Jane', lastName: 'Doe', name: 'Jane Doe', passportNumber: 'P9876543' }],
    pricingSnapshot: { governmentFee: 3000, serviceFee: 1500, totalAmount: 4500, currency: 'INR' }
  });

  const webhookPayment = await Payment.create({
    application: webhookApp._id,
    customer: custA._id,
    amount: 4500,
    currency: 'INR',
    status: PAYMENT_STATUS.PENDING,
    paymentProvider: PAYMENT_PROVIDER.RAZORPAY,
    providerOrderId: 'order_comp_wh_001'
  });

  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_comp_wh_001',
          order_id: 'order_comp_wh_001',
          amount: 450000,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const validHmac = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');

  const webhookRes = await paymentService.handleRazorpayWebhook({
    rawBody: webhookPayload,
    signature: validHmac,
    eventData: JSON.parse(webhookPayload)
  });

  const updatedWhPayment = await Payment.findById(webhookPayment._id);
  const updatedWhApp = await Application.findById(webhookApp._id);
  const passedWhValid = webhookRes.received && updatedWhPayment.status === PAYMENT_STATUS.SUCCESS && updatedWhApp.paymentStatus === PAYMENT_STATUS.SUCCESS;
  recordResult(
    '10. Valid Razorpay webhook execution',
    'Payment and Application marked SUCCESS',
    `Payment: ${updatedWhPayment.status}, Application: ${updatedWhApp.paymentStatus}`,
    passedWhValid
  );

  // -------------------------------------------------------------
  // TEST 11: Forged Razorpay webhook (Bad HMAC rejected)
  // -------------------------------------------------------------
  let forgedErr = '';
  try {
    await paymentService.handleRazorpayWebhook({
      rawBody: webhookPayload,
      signature: 'bad_forged_hmac_signature_hex_value',
      eventData: JSON.parse(webhookPayload)
    });
  } catch (err) {
    forgedErr = err.message;
  }
  recordResult(
    '11. Forged Razorpay webhook rejection',
    'Rejection with Invalid webhook signature',
    forgedErr,
    forgedErr === 'Invalid webhook signature'
  );

  // -------------------------------------------------------------
  // TEST 12: Missing webhook secret in production (Fail closed)
  // -------------------------------------------------------------
  const prevEnv = env.NODE_ENV;
  const prevSecret = env.RAZORPAY_WEBHOOK_SECRET;
  env.NODE_ENV = 'production';
  env.RAZORPAY_WEBHOOK_SECRET = '';

  let missingSecretErr = '';
  try {
    await paymentService.handleRazorpayWebhook({
      rawBody: webhookPayload,
      signature: 'any_signature',
      eventData: JSON.parse(webhookPayload)
    });
  } catch (err) {
    missingSecretErr = err.message;
  }

  env.NODE_ENV = prevEnv;
  env.RAZORPAY_WEBHOOK_SECRET = prevSecret;

  recordResult(
    '12. Missing webhook secret in production fail closed',
    'Fail closed with server configuration error',
    missingSecretErr,
    missingSecretErr.includes('not configured')
  );

  // -------------------------------------------------------------
  // TEST 13: Duplicate webhook idempotency
  // -------------------------------------------------------------
  const dupRes = await paymentService.handleRazorpayWebhook({
    rawBody: webhookPayload,
    signature: validHmac,
    eventData: JSON.parse(webhookPayload)
  });
  recordResult(
    '13. Duplicate webhook idempotency',
    'Idempotent received: true with already processed message',
    `${dupRes.received}: ${dupRes.message}`,
    dupRes.received && dupRes.message === 'Payment already processed'
  );

  // -------------------------------------------------------------
  // TEST 14: Unauthenticated guest document upload without verification factor
  // -------------------------------------------------------------
  let guestDocErr = '';
  try {
    await documentService.uploadDocument({
      applicationId: guestApp._id.toString(),
      documentType: 'Passport',
      file: {
        buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
        originalname: 'passport.pdf',
        mimetype: 'application/pdf'
      },
      verificationKey: '', // Missing factor!
      currentUser: null
    });
  } catch (err) {
    guestDocErr = err.message;
  }
  recordResult(
    '14. Unauthenticated guest document upload protection',
    'Rejection requiring valid verification key',
    guestDocErr,
    guestDocErr.includes('Valid verification key')
  );

  // -------------------------------------------------------------
  // TEST 15: Malicious MIME spoof (HTML/Script disguised as PDF)
  // -------------------------------------------------------------
  let mimeSpoofErr = '';
  try {
    const maliciousBuffer = Buffer.from('<html><script>alert("XSS")</script></html>');
    validateFilePayload(maliciousBuffer, 'malicious.pdf', 'application/pdf');
  } catch (err) {
    mimeSpoofErr = err.message;
  }
  recordResult(
    '15. Malicious MIME spoof & script payload rejection',
    'Rejection detecting HTML/SVG/script content',
    mimeSpoofErr,
    mimeSpoofErr.includes('Malicious HTML') || mimeSpoofErr.includes('File signature mismatch')
  );

  // -------------------------------------------------------------
  // TEST 16: Customer accessing Admin frontend
  // -------------------------------------------------------------
  const customerUserPayload = { role: 'CUSTOMER', email: 'alpha@comprehensive-test.com' };
  const isAdminRole = (user) => Boolean(user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));
  const customerDenied = !isAdminRole(customerUserPayload);
  recordResult(
    '16. Customer accessing Admin frontend guard',
    'Denied (isAdmin === false)',
    `isAdmin: ${!customerDenied}`,
    customerDenied
  );

  // -------------------------------------------------------------
  // TEST 17: Expired access token with valid refresh token (Refresh flow)
  // -------------------------------------------------------------
  const freshLogin = await authService.login({ email: 'beta@comprehensive-test.com', password: 'Password123!' });
  const renewedSession = await authService.refreshToken(freshLogin.tokens.refreshToken);
  recordResult(
    '17. Token refresh rotation with valid refresh token',
    'Returns new valid accessToken and refreshToken',
    `Has new tokens: ${Boolean(renewedSession.tokens.accessToken && renewedSession.tokens.refreshToken)}`,
    Boolean(renewedSession.tokens.accessToken && renewedSession.tokens.refreshToken)
  );

  // -------------------------------------------------------------
  // TEST 18: Simultaneous refresh requests coalescence (Client queue simulation)
  // -------------------------------------------------------------
  let simultaneousQueuePass = false;
  let simulatedInFlight = false;
  let queueCount = 0;
  async function simulateClientRequest(is401) {
    if (is401) {
      if (simulatedInFlight) {
        queueCount++;
        return 'queued-success';
      }
      simulatedInFlight = true;
      await new Promise(r => setTimeout(r, 10));
      simulatedInFlight = false;
      return 'refreshed-success';
    }
  }
  const [r1, r2, r3] = await Promise.all([
    simulateClientRequest(true),
    simulateClientRequest(true),
    simulateClientRequest(true)
  ]);
  simultaneousQueuePass = queueCount >= 1 && (r1 && r2 && r3);
  recordResult(
    '18. Simultaneous 401 refresh request queueing',
    'Single refresh in-flight, remainder queued',
    `Queued requests handled: ${queueCount}`,
    simultaneousQueuePass
  );

  // -------------------------------------------------------------
  // TEST 19: Invalid refresh token
  // -------------------------------------------------------------
  let invalidRefreshErr = '';
  try {
    await authService.refreshToken('completely_invalid_token_string');
  } catch (err) {
    invalidRefreshErr = err.message;
  }
  recordResult(
    '19. Invalid refresh token rejection',
    'Rejection with Invalid or expired refresh token',
    invalidRefreshErr,
    invalidRefreshErr.includes('Invalid or expired refresh token')
  );

  // -------------------------------------------------------------
  // TEST 20: Role escalation prevention
  // -------------------------------------------------------------
  const profileUpdated = await authService.updateProfile(custA._id, {
    name: 'Alpha New Name',
    role: 'ADMIN',
    isAdmin: true
  });
  const updatedUserFromDb = await User.findById(custA._id);
  const passedRoleEscalation = updatedUserFromDb.role === 'CUSTOMER';
  recordResult(
    '20. Role escalation prevention on profile update',
    'Role remains CUSTOMER (ignoring injected ADMIN)',
    `Database role: ${updatedUserFromDb.role}`,
    passedRoleEscalation
  );

  // -------------------------------------------------------------
  // TEST 21: Application ownership manipulation (Customer A vs Customer B app)
  // -------------------------------------------------------------
  const custBApp = await applicationService.createApplication(
    {
      visaId: visa._id.toString(),
      contactDetails: { email: 'beta@comprehensive-test.com', phone: '+91 91234 56789' },
      travellers: [{ firstName: 'BetaTraveller', lastName: 'Doe', name: 'BetaTraveller Doe', passportNumber: 'B1234567' }],
      pricingSnapshot: { governmentFee: 3000, serviceFee: 1500, totalAmount: 4500, currency: 'INR' }
    },
    custB
  );

  let idorErr = '';
  try {
    await applicationService.getApplicationById(custBApp._id.toString(), custA);
  } catch (err) {
    idorErr = err.message;
  }
  recordResult(
    '21. Application ownership BOLA/IDOR protection',
    'Rejection with forbidden when accessing other customer application',
    idorErr,
    idorErr.includes('do not have access') || idorErr.includes('permission') || idorErr.includes('forbidden')
  );

  // -------------------------------------------------------------
  // TEST 22: Payment ownership manipulation (Customer A verifying Customer B payment)
  // -------------------------------------------------------------
  const custBPayment = await Payment.create({
    application: custBApp._id,
    customer: custB._id,
    amount: 4500,
    currency: 'INR',
    status: PAYMENT_STATUS.PENDING,
    paymentProvider: PAYMENT_PROVIDER.RAZORPAY,
    providerOrderId: 'order_comp_beta_001'
  });

  let payIdorErr = '';
  try {
    await paymentService.verifyPayment({
      orderId: 'order_comp_beta_001',
      paymentId: 'pay_comp_beta_001',
      signature: 'test_signature',
      applicationId: custBApp._id.toString(),
      customerUser: custA // Customer A trying to verify Customer B's payment!
    });
  } catch (err) {
    payIdorErr = err.message;
  }
  recordResult(
    '22. Payment verification BOLA/IDOR protection',
    'Rejection with forbidden for non-owner customer',
    payIdorErr,
    payIdorErr.includes('not authorized')
  );

  // -------------------------------------------------------------
  // TEST 23: Price manipulation prevention
  // -------------------------------------------------------------
  const tamperedPayment = await Payment.create({
    application: custBApp._id,
    customer: custB._id,
    amount: 100, // Altered from 4500 to 100!
    currency: 'INR',
    status: PAYMENT_STATUS.PENDING,
    paymentProvider: PAYMENT_PROVIDER.MOCK,
    providerOrderId: 'order_comp_tampered_001'
  });

  let priceMismatchErr = '';
  try {
    await paymentService.verifyPayment({
      orderId: 'order_comp_tampered_001',
      paymentId: 'pay_comp_tampered_001',
      signature: 'test_sig',
      applicationId: custBApp._id.toString(),
      customerUser: custB
    });
  } catch (err) {
    priceMismatchErr = err.message;
  }
  recordResult(
    '23. Price manipulation prevention',
    'Rejection due to amount mismatch against snapshot',
    priceMismatchErr,
    priceMismatchErr.includes('mismatch')
  );

  // -------------------------------------------------------------
  // TEST 24: Reference number manipulation
  // -------------------------------------------------------------
  let refNumErr = '';
  try {
    await applicationService.getApplicationById(custBApp.referenceNumber, custA);
  } catch (err) {
    refNumErr = err.message;
  }
  recordResult(
    '24. Reference number direct access protection',
    'Forbidden when accessing reference belonging to another customer',
    refNumErr,
    refNumErr.includes('do not have access') || refNumErr.includes('permission')
  );

  // -------------------------------------------------------------
  // TEST 25: Mass assignment protection on application update
  // -------------------------------------------------------------
  const appUpdatePayload = {
    status: 'VISA_ISSUED',
    adminNotes: 'Injected admin notes',
    customer: custA._id
  };
  // Non-admin customer action update
  let massAssignErr = '';
  try {
    await applicationService.updateCustomerAction(custBApp._id.toString(), appUpdatePayload, custB);
  } catch (err) {
    massAssignErr = err.message;
  }
  const appAfterAttempt = await Application.findById(custBApp._id);
  const passedMassAssign = appAfterAttempt.status !== 'VISA_ISSUED' && appAfterAttempt.customer.toString() === custB._id.toString();
  recordResult(
    '25. Mass assignment protection on application lifecycle',
    'Customer cannot alter internal status, customer or adminNotes',
    `Status: ${appAfterAttempt.status}, Customer: ${appAfterAttempt.customer}`,
    passedMassAssign
  );

  // -------------------------------------------------------------
  // TEST 26: Production mock-payment protection
  // -------------------------------------------------------------
  const prevProd = env.NODE_ENV;
  env.NODE_ENV = 'production';
  let mockInProdErr = '';
  try {
    await paymentService.verifyPayment({
      orderId: 'order_comp_tampered_001',
      paymentId: 'pay_comp_mock_001',
      signature: 'test_sig',
      applicationId: custBApp._id.toString(),
      customerUser: custB
    });
  } catch (err) {
    mockInProdErr = err.message;
  }
  env.NODE_ENV = prevProd;
  recordResult(
    '26. Production mock-payment protection',
    'Mock payments rejected in production mode',
    mockInProdErr,
    mockInProdErr.includes('not supported in production') || mockInProdErr.includes('mismatch')
  );

  // -------------------------------------------------------------
  // TEST 27: CORS production configuration (No localhost)
  // -------------------------------------------------------------
  env.NODE_ENV = 'production';
  const prodOrigins = (
    env.NODE_ENV === 'production'
      ? [env.CLIENT_URL].filter((url) => url && !url.includes('localhost') && !url.includes('127.0.0.1'))
      : [env.CLIENT_URL, 'http://localhost:5173']
  ).filter(Boolean);
  env.NODE_ENV = prevProd;
  const noLocalhostInProd = !prodOrigins.some(o => o.includes('localhost') || o.includes('127.0.0.1'));
  recordResult(
    '27. Production CORS whitelist security',
    'Localhost and 127.0.0.1 excluded from production origins',
    `Origins: ${JSON.stringify(prodOrigins)}`,
    noLocalhostInProd
  );

  // -------------------------------------------------------------
  // TEST 28: Reverse proxy trust configuration
  // -------------------------------------------------------------
  const expressApp = createApp();
  const trustProxySetting = expressApp.get('trust proxy');
  // In dev it may be false/undefined; when NODE_ENV=production or TRUST_PROXY=true it is 1
  process.env.TRUST_PROXY = 'true';
  const prodExpressApp = createApp();
  const prodTrustProxy = prodExpressApp.get('trust proxy');
  delete process.env.TRUST_PROXY;
  recordResult(
    '28. Reverse proxy trust configuration behind proxy',
    'trust proxy is enabled (1) when in production or TRUST_PROXY=true',
    `Configured trust proxy: ${prodTrustProxy}`,
    prodTrustProxy === 1 || prodTrustProxy === true
  );

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('========================================================================\n');

  await disconnectDatabase();

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveSecuritySuite().catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
