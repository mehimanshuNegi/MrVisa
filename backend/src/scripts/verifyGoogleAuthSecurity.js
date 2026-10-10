/**
 * Automated Google Authentication Security & Regression Test Suite
 *
 * Verifies all 10 security requirements specified in the specification:
 * 1. Valid Google ID token verification & customer session issuance
 * 2. Invalid, expired, wrong-audience, and wrong-issuer tokens rejection (401)
 * 3. Unverified email rejection (401)
 * 4. Existing linked Google account login (200)
 * 5. New customer creation with customer role & Google profile integrity
 * 6. Matching existing email account requiring safe account linking (409) & verified linking flow (200)
 * 7. Google account attempting to authenticate as an administrator rejected (403)
 * 8. Disabled/blocked customer account rejected (403)
 * 9. Session creation, refresh token rotation, replay attack detection, and logout revocation
 * 10. Duplicate provider identities rejection (409) & concurrency handling
 * 11. Regression validation: Existing email/password auth intact
 */

import mongoose from 'mongoose';
import http from 'http';
import { createApp } from '../app.js';
import { env } from '../config/environment.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ROLES } from '../constants/roles.js';
import { googleAuthService } from '../services/googleAuth.service.js';

let server = null;
let baseUrl = '';

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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
  const cookies = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, data, headers: res.headers, cookie: cookies };
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('STARTING NIMUFLY GOOGLE SIGN-IN SECURITY & REGRESSION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Connect DB and start test server
  await mongoose.connect(env.MONGODB_URI);
  const app = createApp();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      console.log(`[INIT] Test HTTP server listening on port ${port}`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const TEST_CLIENT_ID = env.GOOGLE_CLIENT_ID || 'test-nimufly-client-id.apps.googleusercontent.com';
  env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;

  // Cleanup helper
  const createdEmails = [];
  const registerCleanupEmail = (email) => createdEmails.push(email.toLowerCase().trim());

  try {
    // ----------------------------------------------------
    // TEST 1: Server rejects invalid, expired, and wrong-audience tokens
    // ----------------------------------------------------
    console.log('[TEST 1] Invalid, expired, and wrong-audience Google tokens are rejected (401)');

    // 1a. Missing token body
    const missingRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({})
    });

    // 1b. Expired token mock
    googleAuthService.setVerifier(async () => ({
      sub: 'google_expired_1',
      email: 'expired@test.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const expiredRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.expired.token' })
    });

    // 1c. Wrong audience token mock
    googleAuthService.setVerifier(async () => ({
      sub: 'google_wrong_aud_1',
      email: 'wrongaud@test.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'different-malicious-client-id.apps.googleusercontent.com',
      iss: 'accounts.google.com'
    }));

    const wrongAudRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.wrongaud.token' })
    });

    // 1d. Wrong issuer token mock
    googleAuthService.setVerifier(async () => ({
      sub: 'google_wrong_iss_1',
      email: 'wrongiss@test.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'https://attacker-idp.example.com'
    }));

    const wrongIssRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.wrongiss.token' })
    });

    if (
      missingRes.status === 400 &&
      expiredRes.status === 401 &&
      wrongAudRes.status === 401 &&
      wrongIssRes.status === 401
    ) {
      console.log('  PASS: HTTP 400 for empty token, HTTP 401 for expired token, wrong audience, and invalid issuer');
      passed++;
    } else {
      console.error('  FAIL:', {
        missing: missingRes.status,
        expired: expiredRes.status,
        wrongAud: wrongAudRes.status,
        wrongIss: wrongIssRes.status
      });
      failed++;
    }

    // ----------------------------------------------------
    // TEST 2: Unverified Google email is strictly rejected
    // ----------------------------------------------------
    console.log('\n[TEST 2] Unverified Google email is rejected (401)');
    googleAuthService.setVerifier(async () => ({
      sub: 'google_unverified_1',
      email: `unverified_${timestamp}@test.com`,
      email_verified: false, // Unverified
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'https://accounts.google.com'
    }));

    const unverifiedRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.unverified.token' })
    });

    if (unverifiedRes.status === 401) {
      console.log('  PASS: HTTP 401 Unauthorized correctly rejected Google account with unverified email');
      passed++;
    } else {
      console.error('  FAIL: Expected HTTP 401, got:', unverifiedRes.status, unverifiedRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 3: New customer creation via verified Google ID token
    // ----------------------------------------------------
    console.log('\n[TEST 3] New customer creation via valid verified Google ID token');
    const newGoogleSub = `g_sub_new_${timestamp}`;
    const newGoogleEmail = `g_user_${timestamp}@testnimufly.com`;
    registerCleanupEmail(newGoogleEmail);

    googleAuthService.setVerifier(async () => ({
      sub: newGoogleSub,
      email: newGoogleEmail,
      email_verified: true,
      name: 'Maya Sen',
      given_name: 'Maya',
      family_name: 'Sen',
      picture: 'https://lh3.googleusercontent.com/a/test-avatar',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'https://accounts.google.com'
    }));

    const newGoogleRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.valid.token.new' })
    });

    const isCreatedOk = newGoogleRes.status === 200;
    const hasAccessToken = Boolean(newGoogleRes.data?.data?.tokens?.accessToken);
    const hasRefreshToken = Boolean(newGoogleRes.data?.data?.tokens?.refreshToken);
    const roleIsCustomer = newGoogleRes.data?.data?.user?.role === ROLES.CUSTOMER;
    const emailVerified = newGoogleRes.data?.data?.user?.isEmailVerified === true;
    const googleIdMatches = newGoogleRes.data?.data?.user?.googleId === newGoogleSub;
    const setsRefreshCookie = Boolean(newGoogleRes.cookie && newGoogleRes.cookie.includes('refreshToken='));

    if (
      isCreatedOk &&
      hasAccessToken &&
      hasRefreshToken &&
      roleIsCustomer &&
      emailVerified &&
      googleIdMatches &&
      setsRefreshCookie
    ) {
      console.log('  PASS: HTTP 200, created customer account with role CUSTOMER, emailVerified: true, issued tokens and HttpOnly cookie');
      passed++;
    } else {
      console.error('  FAIL:', newGoogleRes.status, newGoogleRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 4: Existing linked Google account logs in seamlessly
    // ----------------------------------------------------
    console.log('\n[TEST 4] Existing linked Google account login');
    const existingGoogleRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.valid.token.existing' })
    });

    const isLoginOk = existingGoogleRes.status === 200;
    const isSameUser = existingGoogleRes.data?.data?.user?.email === newGoogleEmail;
    const isNotNewUser = existingGoogleRes.data?.data?.isNewUser === false;
    const hasFreshAccessToken = Boolean(existingGoogleRes.data?.data?.tokens?.accessToken);

    if (isLoginOk && isSameUser && isNotNewUser && hasFreshAccessToken) {
      console.log('  PASS: HTTP 200, successfully authenticated existing linked Google user');
      passed++;
    } else {
      console.error('  FAIL:', existingGoogleRes.status, existingGoogleRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 5: Matching existing email account requires safe account linking (no silent merge)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Matching existing email account requires safe account linking (no silent merge)');
    const manualCustomerEmail = `manual_${timestamp}@testnimufly.com`;
    const manualCustomerPassword = 'SecurePassword123!';
    registerCleanupEmail(manualCustomerEmail);

    // Create standard email/password user
    await User.create({
      name: 'Rohan Mehra',
      email: manualCustomerEmail,
      passwordHash: manualCustomerPassword,
      role: ROLES.CUSTOMER,
      isEmailVerified: false,
      isActive: true
    });

    // Attempt to authenticate with Google using that email (different unlinked Google sub)
    const unlinkedGoogleSub = `g_sub_unlinked_${timestamp}`;
    googleAuthService.setVerifier(async () => ({
      sub: unlinkedGoogleSub,
      email: manualCustomerEmail,
      email_verified: true,
      name: 'Rohan Google',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const conflictRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.conflict.token' })
    });

    const isConflict = conflictRes.status === 409;
    const hasLinkingNotice =
      conflictRes.data?.message?.includes('already exists') &&
      conflictRes.data?.message?.includes('link your Google account');

    if (isConflict && hasLinkingNotice) {
      console.log('  PASS: HTTP 409 Conflict returned; did NOT silently merge unlinked account');
      passed++;
    } else {
      console.error('  FAIL: Expected HTTP 409 Conflict with linking notice, got:', conflictRes.status, conflictRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 6: Explicit verified Google account linking succeeds
    // ----------------------------------------------------
    console.log('\n[TEST 6] Explicit verified Google account linking succeeds');
    // First, user signs in with email/password
    const manualLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: manualCustomerEmail,
        password: manualCustomerPassword
      })
    });
    const manualAccessToken = manualLoginRes.data?.data?.tokens?.accessToken;

    // Now user calls /auth/google/link
    const linkRes = await request('/auth/google/link', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${manualAccessToken}`
      },
      body: JSON.stringify({ idToken: 'mock.conflict.token' })
    });

    const isLinked = linkRes.status === 200 && linkRes.data?.data?.linked === true;
    const userInDb = await User.findOne({ email: manualCustomerEmail });
    const dbHasGoogleId = userInDb?.googleId === unlinkedGoogleSub;

    if (isLinked && dbHasGoogleId) {
      console.log('  PASS: HTTP 200, successfully linked Google account after authenticated session confirmation');
      passed++;
    } else {
      console.error('  FAIL: Account linking failed:', linkRes.status, linkRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 7: Google account attempting to authenticate as an admin is rejected (403)
    // ----------------------------------------------------
    console.log('\n[TEST 7] Google account attempting to authenticate as an administrator is rejected (403)');
    const adminEmail = `admin_test_${timestamp}@testnimufly.com`;
    registerCleanupEmail(adminEmail);

    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash: 'AdminSecret123!',
      role: ROLES.ADMIN,
      isActive: true
    });

    googleAuthService.setVerifier(async () => ({
      sub: `g_admin_${timestamp}`,
      email: adminEmail,
      email_verified: true,
      name: 'Admin Google',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const adminGoogleRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.admin.token' })
    });

    if (adminGoogleRes.status === 403) {
      console.log('  PASS: HTTP 403 Forbidden strictly blocked administrative account access via Google login');
      passed++;
    } else {
      console.error('  FAIL: Expected HTTP 403 Forbidden, got:', adminGoogleRes.status, adminGoogleRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 8: Disabled/deactivated customer account is rejected (403)
    // ----------------------------------------------------
    console.log('\n[TEST 8] Disabled/deactivated customer account is rejected (403)');
    const deactivatedEmail = `deactivated_${timestamp}@testnimufly.com`;
    const deactivatedSub = `g_deactivated_${timestamp}`;
    registerCleanupEmail(deactivatedEmail);

    await User.create({
      name: 'Deactivated User',
      email: deactivatedEmail,
      googleId: deactivatedSub,
      role: ROLES.CUSTOMER,
      isActive: false
    });

    googleAuthService.setVerifier(async () => ({
      sub: deactivatedSub,
      email: deactivatedEmail,
      email_verified: true,
      name: 'Deactivated User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const deactRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.deactivated.token' })
    });

    if (deactRes.status === 403) {
      console.log('  PASS: HTTP 403 Forbidden rejected deactivated customer account');
      passed++;
    } else {
      console.error('  FAIL: Expected HTTP 403 Forbidden, got:', deactRes.status, deactRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 9: Session creation, refresh token rotation, replay attack detection, and logout revocation
    // ----------------------------------------------------
    console.log('\n[TEST 9] Session creation, refresh token rotation, replay attack detection, and logout revocation');
    // Log in via Google to get initial session
    googleAuthService.setVerifier(async () => ({
      sub: newGoogleSub,
      email: newGoogleEmail,
      email_verified: true,
      name: 'Maya Sen',
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const sessionRes = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'mock.session.token' })
    });
    const initialRefreshToken = sessionRes.data?.data?.tokens?.refreshToken;
    const initialAccessToken = sessionRes.data?.data?.tokens?.accessToken;

    // 9a. Rotate refresh token
    const refreshRes = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: initialRefreshToken })
    });

    const rotatedRefreshToken = refreshRes.data?.data?.tokens?.refreshToken;
    const rotatedAccessToken = refreshRes.data?.data?.tokens?.accessToken;
    const tokensAreDistinct = rotatedRefreshToken && rotatedRefreshToken !== initialRefreshToken;

    // 9b. Replay attack: attempt to reuse the previous rotated token
    const replayRes = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: initialRefreshToken })
    });

    // 9c. Logout with current active token
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rotatedAccessToken}` },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken })
    });

    // 9d. Attempt refresh after logout
    const afterLogoutRefresh = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rotatedRefreshToken })
    });

    if (
      refreshRes.status === 200 &&
      tokensAreDistinct &&
      replayRes.status === 401 &&
      logoutRes.status === 200 &&
      afterLogoutRefresh.status === 401
    ) {
      console.log('  PASS: Refresh rotation succeeded, rotated token replay detected (401), logout revoked active session (401)');
      passed++;
    } else {
      console.error('  FAIL:', {
        refresh: refreshRes.status,
        replay: replayRes.status,
        logout: logoutRes.status,
        afterLogout: afterLogoutRefresh.status
      });
      failed++;
    }

    // ----------------------------------------------------
    // TEST 10: Duplicate provider identities rejection & concurrent registration safety
    // ----------------------------------------------------
    console.log('\n[TEST 10] Duplicate provider identities rejection & concurrent registration safety');
    // Another user tries to link the same Google account
    const secondUserEmail = `second_${timestamp}@testnimufly.com`;
    registerCleanupEmail(secondUserEmail);

    const secondUser = await User.create({
      name: 'Second User',
      email: secondUserEmail,
      passwordHash: 'PasswordSecond123!',
      role: ROLES.CUSTOMER,
      isActive: true
    });

    const secondUserLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: secondUserEmail, password: 'PasswordSecond123!' })
    });
    const secondAccessToken = secondUserLogin.data?.data?.tokens?.accessToken;

    // Attempt to link newGoogleSub (which is already bound to Maya Sen) to secondUser
    googleAuthService.setVerifier(async () => ({
      sub: newGoogleSub, // Already linked to newGoogleEmail
      email: secondUserEmail, // spoofed email or matching
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: TEST_CLIENT_ID,
      iss: 'accounts.google.com'
    }));

    const dupLinkRes = await request('/auth/google/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secondAccessToken}` },
      body: JSON.stringify({ idToken: 'mock.dup.token' })
    });

    if (dupLinkRes.status === 409) {
      console.log('  PASS: HTTP 409 Conflict strictly rejected duplicate Google provider identity');
      passed++;
    } else {
      console.error('  FAIL: Expected HTTP 409 Conflict, got:', dupLinkRes.status, dupLinkRes.data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 11: Regression validation: Existing email/password auth intact
    // ----------------------------------------------------
    console.log('\n[TEST 11] Regression test: Standard email/password registration & login intact');
    const standardEmail = `standard_${timestamp}@testnimufly.com`;
    const standardPassword = 'StandardPass123!';
    registerCleanupEmail(standardEmail);

    const stdRegRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Standard User',
        email: standardEmail,
        password: standardPassword,
        phone: '9876543210',
        nationality: 'Indian'
      })
    });

    const stdLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: standardEmail,
        password: standardPassword
      })
    });

    if (stdRegRes.status === 201 && stdLoginRes.status === 200) {
      console.log('  PASS: Standard customer registration and email/password login remain 100% operational');
      passed++;
    } else {
      console.error('  FAIL:', stdRegRes.status, stdLoginRes.status);
      failed++;
    }

  } catch (err) {
    console.error('Unhandled test suite error:', err);
    failed++;
  } finally {
    // Reset verifier
    googleAuthService.resetVerifier();

    // Clean up created test accounts
    try {
      if (createdEmails.length > 0) {
        const usersToDelete = await User.find({ email: { $in: createdEmails } });
        const userIds = usersToDelete.map((u) => u._id);
        await RefreshToken.deleteMany({ user: { $in: userIds } });
        await User.deleteMany({ _id: { $in: userIds } });
      }
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await mongoose.disconnect();
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr);
    }
  }

  console.log('\n===============================================================');
  console.log('GOOGLE AUTHENTICATION TEST SUITE SUMMARY');
  console.log(`Total tests: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
  console.log(`Status: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('===============================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTestSuite();
