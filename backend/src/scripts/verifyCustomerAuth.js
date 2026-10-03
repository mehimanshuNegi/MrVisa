/**
 * Phase 5 Automated Customer Authentication & Account Verification Test Suite
 * Validates the 12 required test cases for customer authentication, password security,
 * JWT tokens, refresh rotation & revocation, profile integrity, and authorization boundaries.
 */

import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { User } from '../models/User.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { Application } from '../models/Application.js';
import { Document } from '../models/Document.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ROLES } from '../constants/roles.js';

const API_BASE = 'http://localhost:5000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // not JSON
  }
  return { status: res.status, ok: res.ok, data };
}

async function runPhase5Verification() {
  console.log('\n====================================================');
  console.log('STARTING NIMUFLY PHASE 5 CUSTOMER AUTH VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  await mongoose.connect(env.MONGODB_URI);

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@testnimufly.com`;
  const testCustomerPassword = 'SecurePassword123!';
  const testCustomerName = 'Aarav Sharma';
  const testCustomerPhone = '9876543210';

  let customerATokens = null;
  let customerAId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Customer registration succeeds
    // ----------------------------------------------------
    console.log('[TEST 1] Customer registration succeeds');
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: testCustomerName,
        email: testCustomerEmail,
        phone: testCustomerPhone,
        password: testCustomerPassword,
        nationality: 'Indian'
      })
    });

    const isCreated = regRes.status === 201;
    const hasTokens = regRes.data?.data?.tokens?.accessToken && regRes.data?.data?.tokens?.refreshToken;
    const userRoleIsCustomer = regRes.data?.data?.user?.role === ROLES.CUSTOMER;
    const noPasswordHash = regRes.data?.data?.user?.passwordHash === undefined;

    if (isCreated && hasTokens && userRoleIsCustomer && noPasswordHash) {
      console.log('  ✅ PASS: HTTP 201 Created, received valid tokens, role is strictly CUSTOMER, passwordHash omitted');
      customerATokens = regRes.data.data.tokens;
      customerAId = regRes.data.data.user.id;
      passed++;
    } else {
      console.error('  ❌ FAIL:', regRes.status, regRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 2: Duplicate email registration is rejected
    // ----------------------------------------------------
    console.log('\n[TEST 2] Duplicate email registration is rejected');
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Another User',
        email: testCustomerEmail,
        phone: '9999999999',
        password: 'Password999!',
        nationality: 'Indian'
      })
    });

    if (dupRes.status === 409) {
      console.log('  ✅ PASS: HTTP 409 Conflict returned for duplicate registration');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 409 Conflict, got:', dupRes.status, dupRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 3: Invalid password login is rejected
    // ----------------------------------------------------
    console.log('\n[TEST 3] Invalid password login is rejected');
    const badPassRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomerEmail,
        password: 'WrongPassword123!'
      })
    });

    if (badPassRes.status === 401) {
      console.log('  ✅ PASS: HTTP 401 Unauthorized for invalid password credentials');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 401, got:', badPassRes.status, badPassRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 4: Valid login returns valid authentication credentials
    // ----------------------------------------------------
    console.log('\n[TEST 4] Valid login returns valid authentication credentials');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPassword
      })
    });

    const loginSuccess = loginRes.status === 200;
    const loginTokensValid = loginRes.data?.data?.tokens?.accessToken && loginRes.data?.data?.tokens?.refreshToken;
    const loginRoleValid = loginRes.data?.data?.user?.role === ROLES.CUSTOMER;

    if (loginSuccess && loginTokensValid && loginRoleValid) {
      console.log('  ✅ PASS: HTTP 200 OK, valid accessToken and refreshToken issued, role is CUSTOMER');
      customerATokens = loginRes.data.data.tokens;
      passed++;
    } else {
      console.error('  ❌ FAIL:', loginRes.status, loginRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 5: Customer can access /auth/me
    // ----------------------------------------------------
    console.log('\n[TEST 5] Customer can access /auth/me');
    const meRes = await request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerATokens.accessToken}`
      }
    });

    const meSuccess = meRes.status === 200;
    const meMatchesEmail = meRes.data?.data?.email?.toLowerCase() === testCustomerEmail.toLowerCase();
    const meRoleCustomer = meRes.data?.data?.role === ROLES.CUSTOMER;

    if (meSuccess && meMatchesEmail && meRoleCustomer) {
      console.log('  ✅ PASS: HTTP 200 OK, authenticated user profile returned correctly');
      passed++;
    } else {
      console.error('  ❌ FAIL:', meRes.status, meRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 6: Customer cannot access ADMIN endpoints
    // ----------------------------------------------------
    console.log('\n[TEST 6] Customer cannot access ADMIN endpoints');
    const adminRes = await request('/countries', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerATokens.accessToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized Republic',
        code: 'UR',
        continent: 'Asia'
      })
    });

    if (adminRes.status === 403) {
      console.log('  ✅ PASS: HTTP 403 Forbidden when customer attempts admin endpoint');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 403, got:', adminRes.status, adminRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 7: Customer A cannot retrieve Customer B's application
    // ----------------------------------------------------
    console.log("\n[TEST 7] Customer A cannot retrieve Customer B's application");
    const testCustomerBEmail = `customer_b_${timestamp}@testnimufly.com`;
    const regBRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Customer B',
        email: testCustomerBEmail,
        phone: '9888877777',
        password: 'PasswordB123!',
        nationality: 'Indian'
      })
    });
    const customerBTokens = regBRes.data?.data?.tokens;

    // Create an application as Customer B
    const sampleVisa = await Visa.findOne({ isActive: true });
    const sampleCountry = await Country.findById(sampleVisa.country);

    const appBRes = await request('/applications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerBTokens.accessToken}`
      },
      body: JSON.stringify({
        visaId: sampleVisa._id.toString(),
        countryId: sampleCountry._id.toString(),
        travellers: [
          {
            name: 'Customer B Traveller',
            email: testCustomerBEmail,
            phone: '9888877777',
            passportNumber: 'Z9876543'
          }
        ]
      })
    });

    const bAppId = appBRes.data?.data?.id || appBRes.data?.data?.referenceNumber;

    // Customer A attempts to fetch Customer B's application
    const bolaRes = await request(`/applications/${bAppId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerATokens.accessToken}`
      }
    });

    if (bolaRes.status === 403) {
      console.log('  ✅ PASS: HTTP 403 Forbidden prevented Customer A from accessing Customer B application');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 403, got:', bolaRes.status, bolaRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 8: Customer A cannot access Customer B's document
    // ----------------------------------------------------
    console.log("\n[TEST 8] Customer A cannot access Customer B's document");
    // Find or create document on Customer B application
    let docB = await Document.findOne({ application: appBRes.data?.data?._id || appBRes.data?.data?.id });
    if (!docB) {
      docB = await Document.create({
        application: appBRes.data?.data?._id,
        travellerId: 'trav_1',
        documentType: 'Passport Front',
        name: 'passport.pdf',
        originalFilename: 'passport.pdf',
        storageKey: `test/${appBRes.data?.data?._id}/passport.pdf`,
        status: 'VERIFIED'
      });
    }

    const docIdorRes = await request(`/documents/${docB._id}/signed-url`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerATokens.accessToken}`
      }
    });

    if (docIdorRes.status === 403) {
      console.log('  ✅ PASS: HTTP 403 Forbidden prevented Customer A from accessing Customer B document');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 403, got:', docIdorRes.status, docIdorRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 9: Refresh token rotation works
    // ----------------------------------------------------
    console.log('\n[TEST 9] Refresh token rotation works');
    const oldRefreshToken = customerATokens.refreshToken;
    const rotateRes = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: oldRefreshToken
      })
    });

    const rotateSuccess = rotateRes.status === 200;
    const newAccessToken = rotateRes.data?.data?.tokens?.accessToken;
    const newRefreshToken = rotateRes.data?.data?.tokens?.refreshToken;
    const isDistinct = newRefreshToken && newRefreshToken !== oldRefreshToken;

    if (rotateSuccess && newAccessToken && isDistinct) {
      console.log('  ✅ PASS: HTTP 200 OK, refresh token rotated, new distinct credentials issued');
      customerATokens.refreshToken = newRefreshToken;
      customerATokens.accessToken = newAccessToken;
      passed++;
    } else {
      console.error('  ❌ FAIL:', rotateRes.status, rotateRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 10: Revoked refresh token cannot be reused
    // ----------------------------------------------------
    console.log('\n[TEST 10] Revoked refresh token cannot be reused');
    const reuseRes = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: oldRefreshToken // previously rotated, now revoked
      })
    });

    if (reuseRes.status === 401) {
      console.log('  ✅ PASS: HTTP 401 Unauthorized prevents replay of rotated/revoked refresh token');
      passed++;
    } else {
      console.error('  ❌ FAIL: Expected HTTP 401, got:', reuseRes.status, reuseRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 11: Logout revokes the refresh token
    // ----------------------------------------------------
    console.log('\n[TEST 11] Logout revokes the refresh token');
    const currentRefresh = customerATokens.refreshToken;
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerATokens.accessToken}`
      },
      body: JSON.stringify({
        refreshToken: currentRefresh
      })
    });

    const logoutOk = logoutRes.status === 200;

    // Now attempt to use that refresh token
    const afterLogoutRefresh = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: currentRefresh
      })
    });

    if (logoutOk && afterLogoutRefresh.status === 401) {
      console.log('  ✅ PASS: Logout succeeded and revoked token cannot be refreshed (HTTP 401)');
      passed++;
    } else {
      console.error('  ❌ FAIL: Logout or subsequent refresh verification failed:', logoutRes.status, afterLogoutRefresh.status);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 12: Customer profile cannot modify privileged fields such as role
    // ----------------------------------------------------
    console.log('\n[TEST 12] Customer profile cannot modify privileged fields such as role');
    // Log back in to obtain fresh accessToken
    const relogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPassword
      })
    });

    const freshAccessToken = relogin.data?.data?.tokens?.accessToken;

    const escalateRes = await request('/auth/me', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${freshAccessToken}`
      },
      body: JSON.stringify({
        name: 'Aarav Updated Sharma',
        role: 'ADMIN',
        isAdmin: true,
        permissions: ['*'],
        isActive: false
      })
    });

    const checkMe = await request('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${freshAccessToken}`
      }
    });

    const roleRemainsCustomer = checkMe.data?.data?.role === ROLES.CUSTOMER;
    const nameWasUpdated = checkMe.data?.data?.name === 'Aarav Updated Sharma';
    const noPrivilegedFields = checkMe.data?.data?.isAdmin === undefined && checkMe.data?.data?.permissions === undefined;

    if (escalateRes.status === 200 && roleRemainsCustomer && nameWasUpdated && noPrivilegedFields) {
      console.log('  ✅ PASS: Profile update allowed safe field (name), strictly rejected role escalation (role = CUSTOMER)');
      passed++;
    } else {
      console.error('  ❌ FAIL: Role privilege escalation not blocked:', checkMe.data?.data);
      failed++;
    }

  } catch (err) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    // Cleanup test data
    try {
      await User.deleteMany({ email: { $in: [testCustomerEmail, `customer_b_${timestamp}@testnimufly.com`] } });
      await RefreshToken.deleteMany({ user: customerAId });
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }

  console.log('\n====================================================');
  console.log('PHASE 5 VERIFICATION SUMMARY');
  console.log(`Total tests: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Status: ${failed === 0 ? 'ALL 12 TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('====================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runPhase5Verification();
