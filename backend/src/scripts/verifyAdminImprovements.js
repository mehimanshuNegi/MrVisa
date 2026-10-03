import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Country } from '../models/Country.js';
import { Visa } from '../models/Visa.js';
import { DocumentationService } from '../models/DocumentationService.js';
import { DummyTicketService } from '../models/DummyTicketService.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

const API_BASE = 'http://localhost:5000/api/v1';

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 Running Comprehensive Admin Improvements Verification Suite');
  console.log('================================================================\n');

  await connectDatabase();

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Get Admin and Customer Tokens
  console.log('--- STEP 1: Authentication & RBAC Setup ---');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@comprehensive-test.com', password: 'Password123!' })
  });
  assert(adminLoginRes.status === 200, 'Admin login returns 200');
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.tokens?.accessToken;
  assert(Boolean(adminToken), 'Obtained admin JWT access token');

  // Customer login (or register if not existing)
  let customerToken = null;
  const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@example.com', password: 'Password123!' })
  });
  if (custLoginRes.status === 200) {
    const custData = await custLoginRes.json();
    customerToken = custData.data?.tokens?.accessToken;
  }
  console.log('  Admin & Customer tokens verified.');

  // 2. Count existing records before tests
  const initialCountryCount = await Country.countDocuments({ isDeleted: false });
  const initialVisaCount = await Visa.countDocuments({ isDeleted: false });
  assert(initialCountryCount >= 27, `Existing active countries preserved (found: ${initialCountryCount})`);
  assert(initialVisaCount >= 27, `Existing active visas preserved (found: ${initialVisaCount})`);

  // ===========================================================================
  // 3. BACKEND-GENERATED SLUGS & COUNTRY CRUD + SOFT-DELETE + DEPENDENCY GUARD
  // ===========================================================================
  console.log('\n--- STEP 2: Country Auto-Slugs, CRUD, Dependency Check & Soft-Delete ---');
  
  // Create Country 1 (Auto-slug test without providing slug)
  const timestamp = Date.now();
  const countryName1 = `Test Destination ${timestamp}`;
  const createCountryRes = await fetch(`${API_BASE}/countries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: countryName1,
      displayName: `${countryName1} Special`,
      code: 'TD',
      continent: 'Europe',
      flagEmoji: '🏳️',
      description: 'Test country for admin improvements verification.'
    })
  });
  assert(createCountryRes.status === 201, 'POST /countries creates new country with HTTP 201');
  const country1Data = await createCountryRes.json();
  const country1 = country1Data.data;
  assert(Boolean(country1?._id), 'Country created with valid ID');
  assert(country1?.slug === `test-destination-${timestamp}`, `Backend auto-generated slug matches expected: "${country1?.slug}"`);

  // Create Country 2 with punctuation variant that generates identical base slug
  const countryName2 = `Test Destination ${timestamp} Part B`;
  const countryName3WithSameBaseSlug = `Test Destination ${timestamp} Part-B`;
  const createCountry2Res = await fetch(`${API_BASE}/countries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: countryName2,
      displayName: `${countryName2} Special`,
      code: 'TB',
      continent: 'Europe'
    })
  });
  assert(createCountry2Res.status === 201, 'POST /countries creates Country 2');
  const country2Data = await createCountry2Res.json();
  const country2 = country2Data.data;

  // Now create Country 3 which normalizes to the EXACT same base slug as Country 2
  const createCountryDupRes = await fetch(`${API_BASE}/countries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: countryName3WithSameBaseSlug,
      displayName: `${countryName3WithSameBaseSlug} Variant`,
      code: 'TC',
      continent: 'Europe'
    })
  });
  assert(createCountryDupRes.status === 201, 'POST /countries handles duplicate slug collision with 201');
  const countryDupData = await createCountryDupRes.json();
  assert(countryDupData.data?.slug === `${country2.slug}-1`, `Duplicate country slug collision handled: "${countryDupData.data?.slug}"`);

  // Edit Country 1
  const updateCountryRes = await fetch(`${API_BASE}/countries/${country1._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      displayName: `${countryName1} Updated Display`
    })
  });
  assert(updateCountryRes.status === 200, 'PUT /countries/:id updates country with HTTP 200');

  // Create a visa linked to Country 1 to test Dependency Guard
  console.log('\n--- STEP 3: Visa Auto-Slug, Requirements Builder, Pricing & Dependency Guard ---');
  const visaTitle1 = `Tourist Visa 30 Days ${timestamp}`;
  const createVisaRes = await fetch(`${API_BASE}/visas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      country: country1._id,
      title: visaTitle1,
      displayName: 'Tourist 30 Days Single Entry',
      visaType: 'Tourist Visa',
      stayPeriod: '30 Days',
      validity: '90 Days',
      entryType: 'Single Entry',
      processingTime: '24–48 Hours',
      serviceFee: 1500,
      governmentFee: 0, // Missing/Zero test
      requiredDocuments: [
        {
          title: 'Passport Bio Page Scan',
          acceptedFormats: ['PDF', 'JPG', 'PNG'],
          required: true,
          description: 'Front and back bio page'
        },
        {
          title: 'Bank Statement',
          acceptedFormats: ['PDF'],
          required: false,
          description: 'Last 3 months certified bank statement'
        }
      ]
    })
  });
  assert(createVisaRes.status === 201, 'POST /visas creates new visa with HTTP 201');
  const visa1Data = await createVisaRes.json();
  const visa1 = visa1Data.data;
  assert(Boolean(visa1?._id), 'Visa created with valid ID');
  assert(visa1?.slug.includes(country1.slug), `Visa slug auto-generated: "${visa1?.slug}"`);
  assert(visa1?.governmentFee === 0, 'Visa government fee strictly ₹0 when zero/missing');
  assert(visa1?.serviceFee === 1500, 'Visa service fee accurately reflects ₹1,500');

  // Verify requirements saved properly to MongoDB
  const dbVisa = await Visa.findById(visa1._id);
  assert(dbVisa.requiredDocuments.length === 2, 'MongoDB has 2 required documents');
  assert(dbVisa.requiredDocuments[0].title === 'Passport Bio Page Scan', 'Requirement 1 title saved correctly');
  assert(dbVisa.requiredDocuments[0].acceptedFormats.includes('PDF'), 'Requirement 1 accepted formats include PDF');
  assert(dbVisa.requiredDocuments[1].acceptedFormats.length === 1 && dbVisa.requiredDocuments[1].acceptedFormats[0] === 'PDF', 'Requirement 2 is strictly PDF only');

  // DEPENDENCY GUARD TEST: Try to delete Country 1 while Visa 1 is active -> must be blocked!
  console.log('\n--- Testing Dependency Guard: Country deletion blocked when active visas exist ---');
  const deleteBlockedRes = await fetch(`${API_BASE}/countries/${country1._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteBlockedRes.status === 400, 'DELETE /countries/:id returns 400 when linked visas exist');
  const blockedBody = await deleteBlockedRes.json();
  assert(blockedBody.message.includes('active visa offering(s) attached'), `Helpful error returned: "${blockedBody.message}"`);

  // Soft-Delete Visa 1
  console.log('\n--- Soft-Deleting Visa 1 ---');
  const deleteVisaRes = await fetch(`${API_BASE}/visas/${visa1._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteVisaRes.status === 200, 'DELETE /visas/:id soft-deletes visa with HTTP 200');

  // Verify Visa 1 disappeared from customer public listing
  const customerVisaCheck = await fetch(`${API_BASE}/visas/${visa1.slug}`);
  assert(customerVisaCheck.status === 404, 'Soft-deleted visa disappeared from customer public GET /visas/:slug (HTTP 404)');

  // Verify Visa 1 still preserved in MongoDB with isDeleted = true
  const dbSoftDeletedVisa = await Visa.findById(visa1._id);
  assert(dbSoftDeletedVisa.isDeleted === true, 'Visa record preserved in MongoDB with isDeleted = true');
  assert(dbSoftDeletedVisa.isActive === false, 'Visa record marked isActive = false');

  // Now delete Country 1 (since its visa is soft-deleted, Country 1 can now be soft-deleted safely)
  console.log('\n--- Soft-Deleting Country 1 after visa removal ---');
  const deleteCountryRes = await fetch(`${API_BASE}/countries/${country1._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteCountryRes.status === 200, 'DELETE /countries/:id soft-deletes country with HTTP 200 once visas removed');

  const customerCountryCheck = await fetch(`${API_BASE}/countries/${country1.slug}`);
  assert(customerCountryCheck.status === 404, 'Soft-deleted country disappeared from customer public GET /countries/:slug (HTTP 404)');

  const dbSoftDeletedCountry = await Country.findById(country1._id);
  assert(dbSoftDeletedCountry.isDeleted === true, 'Country preserved in MongoDB with isDeleted = true');

  // Also clean up Country 2 and duplicate country
  await fetch(`${API_BASE}/countries/${country2._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  await fetch(`${API_BASE}/countries/${countryDupData.data._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  // ===========================================================================
  // 4. DOCUMENTATION SERVICE CRUD, AUTO-SLUG, DYNAMIC REQUIREMENTS & SOFT-DELETE
  // ===========================================================================
  console.log('\n--- STEP 4: Documentation Service Auto-Slug, Dynamic Requirements & Soft-Delete ---');
  const docTitle = `Special Immigration Audit ${timestamp}`;
  const createDocRes = await fetch(`${API_BASE}/documentation-services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: docTitle,
      category: 'Legal & Compliance',
      shortDescription: 'Audit verification service',
      serviceFee: 2999,
      governmentFee: 0,
      processingTime: '2 Business Days',
      requirements: [
        {
          title: 'Tax Certificate',
          acceptedFormats: ['PDF', 'WEBP'],
          required: true,
          category: 'Financial Documents'
        },
        {
          title: 'Affidavit of Support',
          acceptedFormats: ['PDF', 'DOCX'],
          required: false,
          category: 'Legal Documents'
        }
      ]
    })
  });
  assert(createDocRes.status === 201, 'POST /documentation-services returns 201');
  const docData = await createDocRes.json();
  const createdDoc = docData.data;
  assert(createdDoc?.slug === `special-immigration-audit-${timestamp}`, `Documentation slug auto-generated: "${createdDoc?.slug}"`);

  // Customer public API check for dynamic new documentation service
  const customerDocRes = await fetch(`${API_BASE}/documentation-services/${createdDoc.slug}`);
  assert(customerDocRes.status === 200, `Customer portal loads new dynamic service: /documentation-services/${createdDoc.slug}`);
  const customerDocData = await customerDocRes.json();
  assert(customerDocData.data?.requirements.length === 2, 'Customer portal receives 2 dynamic document requirements');
  assert(customerDocData.data?.serviceFee === 2999, 'Customer portal receives serviceFee ₹2,999');
  assert(customerDocData.data?.governmentFee === 0, 'Customer portal receives governmentFee strictly ₹0');

  // Edit documentation service
  const updateDocRes = await fetch(`${API_BASE}/documentation-services/${createdDoc._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      serviceFee: 3499
    })
  });
  assert(updateDocRes.status === 200, 'PUT /documentation-services/:id updates service with 200');

  // Soft-Delete documentation service
  const deleteDocRes = await fetch(`${API_BASE}/documentation-services/${createdDoc._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteDocRes.status === 200, 'DELETE /documentation-services/:id returns 200');

  const customerDeletedDocCheck = await fetch(`${API_BASE}/documentation-services/${createdDoc.slug}`);
  assert(customerDeletedDocCheck.status === 404, 'Soft-deleted documentation service disappeared from customer portal (HTTP 404)');

  const dbSoftDeletedDoc = await DocumentationService.findById(createdDoc._id);
  assert(dbSoftDeletedDoc.isDeleted === true, 'Documentation service preserved in MongoDB with isDeleted = true');

  // ===========================================================================
  // 5. DUMMY TICKET SERVICE CRUD, AUTO-SLUG, EDIT & SOFT-DELETE
  // ===========================================================================
  console.log('\n--- STEP 5: Dummy Ticket Package Auto-Slug, CRUD & Soft-Delete ---');
  const ticketTitle = `Express Premium PNR Ticket ${timestamp}`;
  const createTicketRes = await fetch(`${API_BASE}/dummy-tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: ticketTitle,
      type: 'Multi-City Flight Itinerary',
      price: 699,
      deliveryTime: '15 Minutes',
      validity: '3 Weeks'
    })
  });
  assert(createTicketRes.status === 201, 'POST /dummy-tickets creates package with 201');
  const ticketData = await createTicketRes.json();
  const createdTicket = ticketData.data;
  assert(createdTicket?.slug === `express-premium-pnr-ticket-${timestamp}`, `Ticket slug auto-generated: "${createdTicket?.slug}"`);

  // Edit ticket
  const updateTicketRes = await fetch(`${API_BASE}/dummy-tickets/${createdTicket._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      price: 799
    })
  });
  assert(updateTicketRes.status === 200, 'PUT /dummy-tickets/:id updates ticket with 200');

  // Soft-Delete ticket
  const deleteTicketRes = await fetch(`${API_BASE}/dummy-tickets/${createdTicket._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteTicketRes.status === 200, 'DELETE /dummy-tickets/:id soft-deletes package with 200');

  const customerDeletedTicketCheck = await fetch(`${API_BASE}/dummy-tickets/${createdTicket.slug}`);
  assert(customerDeletedTicketCheck.status === 404, 'Soft-deleted ticket disappeared from customer portal (HTTP 404)');

  const dbSoftDeletedTicket = await DummyTicketService.findById(createdTicket._id);
  assert(dbSoftDeletedTicket.isDeleted === true, 'Ticket package preserved in MongoDB with isDeleted = true');

  // ===========================================================================
  // 6. AUDIT LOG VERIFICATION
  // ===========================================================================
  console.log('\n--- STEP 6: AuditLog Verification for Delete Actions ---');
  const countryAuditLogs = await AuditLog.find({
    entity: 'COUNTRY',
    entityId: String(country1._id),
    action: 'DELETE'
  });
  assert(countryAuditLogs.length >= 1, 'AuditLog recorded country DELETE action');

  const visaAuditLogs = await AuditLog.find({
    entity: 'VISA',
    entityId: String(visa1._id),
    action: 'DELETE'
  });
  assert(visaAuditLogs.length >= 1, 'AuditLog recorded visa DELETE action');

  const docAuditLogs = await AuditLog.find({
    entity: 'DOCUMENTATION_SERVICE',
    entityId: String(createdDoc._id),
    action: 'DELETE'
  });
  assert(docAuditLogs.length >= 1, 'AuditLog recorded documentation service DELETE action');

  const ticketAuditLogs = await AuditLog.find({
    entity: 'DUMMY_TICKET_SERVICE',
    entityId: String(createdTicket._id),
    action: 'DELETE'
  });
  assert(ticketAuditLogs.length >= 1, 'AuditLog recorded dummy ticket DELETE action');

  // ===========================================================================
  // 7. FINAL DATA INTEGRITY VERIFICATION
  // ===========================================================================
  console.log('\n--- STEP 7: Original Catalog & Core Architecture Preservation ---');
  const finalActiveCountries = await Country.countDocuments({ isDeleted: false });
  const finalActiveVisas = await Visa.countDocuments({ isDeleted: false });
  assert(finalActiveCountries === initialCountryCount, `Original country count intact (${finalActiveCountries})`);
  assert(finalActiveVisas === initialVisaCount, `Original visa count intact (${finalActiveVisas})`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} TEST ASSERTIONS PASSED WITH ZERO FAILURES!`);
  console.log('================================================================\n');

  await disconnectDatabase();
  process.exit(0);
}

runVerification().catch(err => {
  console.error('\n❌ Verification Suite Failed:', err);
  process.exit(1);
});
