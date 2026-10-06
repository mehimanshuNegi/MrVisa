import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { Application } from '../models/Application.js';
import { DocumentationService } from '../models/DocumentationService.js';
import { DummyTicketService } from '../models/DummyTicketService.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import sharp from 'sharp';

const API_BASE = 'http://localhost:5000/api/v1';

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 Starting Comprehensive Full-Stack Verification...');
  console.log('====================================================\n');

  await connectDatabase();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // =========================================================================
  // TEST SUITE A: Visa Destination Routing
  // =========================================================================
  console.log('--- TEST SUITE A: Visa Destination Routing ---');

  const visaTestTargets = [
    { slug: 'united-arab-emirates-tourism-30-days', countryName: 'United Arab Emirates' },
    { slug: 'georgia-e-visa-30-days', countryName: 'Georgia' },
    { slug: 'thailand-thailand-digital-arrival-card-tdac-30-days', countryName: 'Thailand' },
    { slug: 'russia-e-visa-upto-30-days', countryName: 'Russia' },
    { slug: 'azerbaijan-e-visa-30-days', countryName: 'Azerbaijan' }
  ];

  for (const t of visaTestTargets) {
    const res = await fetch(`${API_BASE}/visas/${t.slug}`);
    assert(res.status === 200, `GET /visas/${t.slug} returns HTTP 200`);
    const data = await res.json();
    assert(data.success === true, `Response success is true for ${t.slug}`);
    assert(data.data?.slug === t.slug, `Resolved visa slug matches ${t.slug}`);
    assert(data.data?.country?.name === t.countryName, `Populated country name matches ${t.countryName}`);
  }

  // Country fallback slug test
  const countryFallbackTargets = ['georgia', 'thailand', 'russia', 'united-arab-emirates', 'azerbaijan'];
  for (const c of countryFallbackTargets) {
    const res = await fetch(`${API_BASE}/visas/${c}`);
    assert(res.status === 200, `GET /visas/${c} (by country slug) returns HTTP 200`);
    const data = await res.json();
    assert(data.success === true, `Response success is true for country slug ${c}`);
    assert(Boolean(data.data?.title), `Returns active visa title: "${data.data?.title}"`);
  }

  // =========================================================================
  // TEST SUITE B: Documentation Services
  // =========================================================================
  console.log('\n--- TEST SUITE B: Documentation Services Catalog ---');

  const docListRes = await fetch(`${API_BASE}/documentation-services`);
  assert(docListRes.status === 200, 'GET /documentation-services returns HTTP 200');
  const docListData = await docListRes.json();
  assert(docListData.success === true, 'Listing success is true');
  assert(docListData.data?.length >= 5, `Listing contains at least 5 services (found: ${docListData.data?.length})`);

  const docServices = [
    { slug: 'cover-letter', minReqs: 10, titleContains: 'Cover Letter' },
    { slug: 'travel-itinerary', minReqs: 8, titleContains: 'Travel Itinerary', hasDeliverables: true },
    { slug: 'itr', minReqs: 3, titleContains: 'Income Tax Return', hasConditionPrompt: true },
    { slug: 'import-export', minReqs: 8, titleContains: 'Import Export Code' },
    { slug: 'msme', minReqs: 8, titleContains: 'Udyam' }
  ];

  for (const s of docServices) {
    const itemRes = await fetch(`${API_BASE}/documentation-services/${s.slug}`);
    assert(itemRes.status === 200, `GET /documentation-services/${s.slug} returns HTTP 200`);
    const itemData = await itemRes.json();
    assert(itemData.success === true, `Individual fetch success for ${s.slug}`);
    assert(itemData.data?.slug === s.slug, `Slug matches ${s.slug}`);
    assert(itemData.data?.title.includes(s.titleContains), `Title matches "${itemData.data?.title}"`);
    assert(Array.isArray(itemData.data?.requirements), `Requirements array present for ${s.slug}`);
    assert(itemData.data?.requirements.length >= s.minReqs, `Has at least ${s.minReqs} requirements (found ${itemData.data?.requirements.length})`);

    if (s.hasDeliverables) {
      assert(Array.isArray(itemData.data?.deliverables) && itemData.data?.deliverables.length > 0, `Deliverables present for ${s.slug}`);
    }
    if (s.hasConditionPrompt) {
      assert(Boolean(itemData.data?.conditionPrompt), `Condition prompt present for ${s.slug}: "${itemData.data?.conditionPrompt}"`);
      assert(Array.isArray(itemData.data?.conditionOptions) && itemData.data?.conditionOptions.length > 0, `Condition options present for ${s.slug}`);
    }
  }

  // =========================================================================
  // TEST SUITE C: Dummy Ticket Services
  // =========================================================================
  console.log('\n--- TEST SUITE C: Dummy Ticket Services Catalog ---');

  const ticketListRes = await fetch(`${API_BASE}/dummy-tickets`);
  assert(ticketListRes.status === 200, 'GET /dummy-tickets returns HTTP 200');
  const ticketListData = await ticketListRes.json();
  assert(ticketListData.success === true, 'Dummy tickets listing success is true');
  assert(ticketListData.data?.length >= 1, `Contains at least 1 ticket package (found: ${ticketListData.data?.length})`);

  const primaryTicket = ticketListData.data[0];
  assert(Boolean(primaryTicket.price), `Ticket has pricing: ₹${primaryTicket.price}`);
  assert(Boolean(primaryTicket.slug), `Ticket has slug: ${primaryTicket.slug}`);

  const singleTicketRes = await fetch(`${API_BASE}/dummy-tickets/${primaryTicket.slug}`);
  assert(singleTicketRes.status === 200, `GET /dummy-tickets/${primaryTicket.slug} returns HTTP 200`);
  const singleTicketData = await singleTicketRes.json();
  assert(singleTicketData.data?.title === primaryTicket.title, 'Fetched package title matches list');

  // =========================================================================
  // TEST SUITE D: Admin CRUD & Data Persistence
  // =========================================================================
  console.log('\n--- TEST SUITE D: Admin CRUD & Persistence ---');

  // Ensure test admin exists
  let adminUser = await User.findOne({ email: 'admin@comprehensive-test.com' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@comprehensive-test.com',
      passwordHash: 'Password123!',
      role: 'ADMIN',
      isActive: true
    });
  }

  // Login as Admin
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@comprehensive-test.com', password: 'Password123!' })
  });
  assert(adminLoginRes.status === 200, 'Admin login succeeds with HTTP 200');
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.tokens?.accessToken;
  assert(Boolean(adminToken), 'Admin received valid JWT access token');

  // Update ITR service fee
  const updateFee = 1699;
  const adminUpdateRes = await fetch(`${API_BASE}/documentation-services/itr`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      serviceFee: updateFee,
      shortDescription: 'Certified Income Tax Return filing for individuals and visa applicants. (Admin Verified)'
    })
  });
  assert(adminUpdateRes.status === 200, 'Admin PUT /documentation-services/itr succeeds with HTTP 200');
  const updatedData = await adminUpdateRes.json();
  assert(updatedData.data?.serviceFee === updateFee, `Updated fee reflects ${updateFee}`);

  // Confirm MongoDB direct query matches updated value
  const mongoDoc = await DocumentationService.findOne({ slug: 'itr' });
  assert(mongoDoc.serviceFee === updateFee, `MongoDB database record directly confirms updated fee ${updateFee}`);

  // Restore fee back to standard 1499
  await fetch(`${API_BASE}/documentation-services/itr`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      serviceFee: 1499,
      shortDescription: 'Certified Income Tax Return filing for individuals, professionals, and visa applicants.'
    })
  });

  // =========================================================================
  // TEST SUITE E: Security & Access Control
  // =========================================================================
  console.log('\n--- TEST SUITE E: Security & RBAC Enforcement ---');

  // 1. Unauthenticated mutation attempts must fail with 401
  const unauthPost = await fetch(`${API_BASE}/documentation-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hacked Service' })
  });
  assert(unauthPost.status === 401, 'Unauthenticated POST /documentation-services rejected with 401 Unauthorized');

  const unauthPut = await fetch(`${API_BASE}/dummy-tickets/verified-flight-reservation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: 1 })
  });
  assert(unauthPut.status === 401, 'Unauthenticated PUT /dummy-tickets rejected with 401 Unauthorized');

  // 2. Customer user attempting admin operation must fail with 403
  const customerUser = await User.findOne({ role: 'CUSTOMER' });
  if (customerUser) {
    // Generate customer login
    const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerUser.email, password: 'Customer@NimuFly2026!' })
    });
    if (custLoginRes.status === 200) {
      const custData = await custLoginRes.json();
      const custToken = custData.data?.tokens?.accessToken;
      const forbiddenRes = await fetch(`${API_BASE}/documentation-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${custToken}`
        },
        body: JSON.stringify({ title: 'Customer Created Service' })
      });
      assert(forbiddenRes.status === 403, 'Customer token receives 403 Forbidden for admin endpoints');
    }
  }

  // =========================================================================
  // TEST SUITE F: Regression Verification (Visas, Countries, Applications)
  // =========================================================================
  console.log('\n--- TEST SUITE F: Regression Verification ---');

  const totalCountries = await Country.countDocuments({ isDeleted: false });
  const totalVisas = await Visa.countDocuments({ isDeleted: false });
  assert(totalCountries >= 27, `Preserved all 27 countries intact in MongoDB (count: ${totalCountries})`);
  assert(totalVisas >= 27, `Preserved all 27 visas intact in MongoDB (count: ${totalVisas})`);

  const countriesRes = await fetch(`${API_BASE}/countries`);
  assert(countriesRes.status === 200, 'Existing GET /countries API continues working with 200');

  const visasRes = await fetch(`${API_BASE}/visas`);
  assert(visasRes.status === 200, 'Existing GET /visas API continues working with 200');

  const appsRes = await fetch(`${API_BASE}/applications`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(appsRes.status === 200, 'Existing GET /applications continues working with 200');

  // =========================================================================
  // TEST SUITE G: Passport Photograph Validation & Linkage
  // =========================================================================
  console.log('\n--- TEST SUITE G: Passport Photograph Validation & Linkage ---');

  // 1. Missing file rejected with HTTP 400
  const emptyPhotoRes = await fetch(`${API_BASE}/applications/passport-photo`, {
    method: 'POST'
  });
  assert(emptyPhotoRes.status === 400, 'POST /applications/passport-photo without file rejected with HTTP 400');

  // 2. Upload valid photograph
  const testPhotoBuffer = await sharp({
    create: {
      width: 600,
      height: 800,
      channels: 3,
      background: { r: 245, g: 245, b: 245 }
    }
  }).jpeg().toBuffer();

  const photoForm = new FormData();
  const photoBlob = new Blob([testPhotoBuffer], { type: 'image/jpeg' });
  photoForm.append('file', photoBlob, 'test_passport_photo.jpg');

  const photoUploadRes = await fetch(`${API_BASE}/applications/passport-photo`, {
    method: 'POST',
    body: photoForm
  });

  assert(photoUploadRes.status === 200, 'POST /applications/passport-photo with valid image returns HTTP 200');
  const photoUploadData = await photoUploadRes.json();
  assert(photoUploadData.success === true, 'Passport photo upload response has success: true');
  assert(photoUploadData.data?.uploadedDocument?.documentType === 'PASSPORT_PHOTO', 'Returned documentType is PASSPORT_PHOTO');
  assert(Boolean(photoUploadData.data?.uploadedDocument?.storageKey), 'Returned uploadedDocument has storageKey');
  assert(photoUploadData.data?.canContinue === true, 'Validation allows applicant to continue (canContinue === true)');
  assert(typeof photoUploadData.data?.validation?.checks === 'object', 'Validation checks object is returned');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
  console.log('====================================================\n');

  await disconnectDatabase();
}

runAllTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
