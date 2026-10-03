import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { DummyTicketRequest } from '../models/DummyTicketRequest.js';

import { User } from '../models/User.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting Final Architecture & Dummy Ticket Verification Suite');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ [DB CONNECTED] Connected to MongoDB Atlas');

  // Login as Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@comprehensive-test.com', password: 'Password123!' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  const adminToken = adminLoginData.data.tokens.accessToken;
  console.log('✓ [AUTH] Admin logged in successfully');

  // Customer Login or Register
  let customerToken = null;
  const customerEmail = 'customer@example.com';
  const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: 'Password123!' })
  });
  if (customerLoginRes.ok) {
    const customerLoginData = await customerLoginRes.json();
    customerToken = customerLoginData.data.tokens.accessToken;
  } else {
    // Register if doesn't exist
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: customerEmail,
        password: 'Password123!',
        phone: '9876543210'
      })
    });
    const regData = await regRes.json();
    if (regRes.ok) {
      customerToken = regData.data.tokens.accessToken;
    }
  }
  console.log(`✓ [AUTH] Customer token ready: ${Boolean(customerToken)}`);

  // -------------------------------------------------------------
  // TEST 1: NO DUPLICATE COUNTRY CREATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: No Duplicate Country Creation ---');
  const initialCountryCount = await Country.countDocuments();
  console.log(`Initial total countries in MongoDB: ${initialCountryCount}`);

  // Create a Thailand visa with countryCode "TH" and countryName "Thailand"
  const newVisaPayload = {
    countryName: 'Thailand',
    countryCode: 'TH',
    countryFlag: '🇹🇭',
    countryImage: 'https://images.unsplash.com/photo-thailand-test',
    title: 'Thailand Digital Nomad E-Visa Test',
    visaType: 'E-Visa',
    category: 'Tourism',
    description: 'Digital nomad entry permit',
    stayPeriod: '60 Days',
    validity: '180 Days',
    processingTime: '24 Hours',
    entryType: 'Multiple Entry',
    governmentFee: 5000,
    serviceFee: 1500,
    isPopular: true,
    displayOrder: 2,
    status: 'ACTIVE',
    requiredDocuments: [
      { title: 'Passport Bio Page', required: true, acceptedFormats: ['PDF', 'JPG'] },
      { title: 'Bank Statement', required: true, acceptedFormats: ['PDF'] }
    ]
  };

  const createVisaRes = await fetch(`${BASE_URL}/visas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(newVisaPayload)
  });
  const createdVisaData = await createVisaRes.json();
  if (!createVisaRes.ok) throw new Error(`Failed to create visa: ${JSON.stringify(createdVisaData)}`);
  const createdVisa = createdVisaData.data;

  const afterCountryCount = await Country.countDocuments();
  if (afterCountryCount !== initialCountryCount) {
    throw new Error(`Duplicate country created! Initial: ${initialCountryCount}, After: ${afterCountryCount}`);
  }
  console.log('✓ [NO DUPLICATE COUNTRY] Verified existing country record was reused (count remained ' + initialCountryCount + ')');
  console.log(`✓ [AUTO SLUG] Backend auto-generated unique slug: "${createdVisa.slug}"`);

  // -------------------------------------------------------------
  // TEST 2: POPULAR DESTINATIONS TOGGLE & HOMEPAGE LOGIC
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Popular Destinations Toggle ---');
  if (!createdVisa.isPopular) throw new Error('isPopular was expected to be true');
  console.log('✓ [POPULAR FLAG] Visa created with isPopular = true');

  // Query popular visas from API
  const popularRes = await fetch(`${BASE_URL}/visas?isPopular=true`);
  const popularData = await popularRes.json();
  const popularItems = popularData.data.items || popularData.data;
  const foundPopular = popularItems.some((v) => v.slug === createdVisa.slug);
  if (!foundPopular) throw new Error('Created visa was not returned in GET /visas?isPopular=true');
  console.log(`✓ [POPULAR FILTER] GET /visas?isPopular=true returned ${popularItems.length} popular visas including our new visa`);

  // Toggle popular OFF
  const togglePopularRes = await fetch(`${BASE_URL}/visas/${createdVisa._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ isPopular: false })
  });
  const toggledData = await togglePopularRes.json();
  if (!togglePopularRes.ok) throw new Error(`Failed to toggle popularity: ${JSON.stringify(toggledData)}`);

  const popularAfterRes = await fetch(`${BASE_URL}/visas?isPopular=true`);
  const popularAfterData = await popularAfterRes.json();
  const popularAfterItems = popularAfterData.data.items || popularAfterData.data;
  const stillPopular = popularAfterItems.some((v) => v.slug === createdVisa.slug);
  if (stillPopular) throw new Error('Visa should not appear in popular list after toggling isPopular to false');
  console.log('✓ [POPULAR TOGGLE OFF] Visa disappeared from popular listings when isPopular set to false');

  // Clean up created visa
  await Visa.findByIdAndDelete(createdVisa._id);
  console.log('✓ [CLEANUP] Deleted test visa');

  // -------------------------------------------------------------
  // TEST 3: DUMMY TICKET SUBMISSION & VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Dummy Ticket Booking Submission ---');

  // Test Return without returnDate should fail
  const invalidBookingRes = await fetch(`${BASE_URL}/dummy-tickets/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tripType: 'Return',
      flight: { from: 'Delhi (DEL)', to: 'Paris (CDG)', departureDate: '2026-11-01' },
      travellers: [{ firstName: 'Rahul', lastName: 'Sharma' }],
      contact: { phone: '9876543210', email: 'rahul@test.com' }
    })
  });
  if (invalidBookingRes.status !== 400) {
    throw new Error(`Expected 400 when Return is missing returnDate, got ${invalidBookingRes.status}`);
  }
  console.log('✓ [VALIDATION] Verified return date is required for Return trip type');

  // Submit valid One Way Dummy Ticket Request
  const validRequestPayload = {
    tripType: 'One Way',
    flight: {
      from: 'Mumbai (BOM)',
      to: 'London (LHR)',
      departureDate: '2026-12-15'
    },
    travellers: [
      {
        title: 'Mr',
        firstName: 'Aarav',
        lastName: 'Mehta',
        dateOfBirth: '1992-05-20',
        nationality: 'Indian'
      },
      {
        title: 'Mrs',
        firstName: 'Pooja',
        lastName: 'Mehta',
        dateOfBirth: '1995-08-14',
        nationality: 'Indian'
      }
    ],
    contact: {
      dialCode: '+91',
      phone: '9876543210',
      email: customerEmail
    },
    purpose: 'Visa Application',
    message: 'Prefer British Airways flight if available',
    requiredDate: '2026-12-01',
    deliveryMethod: 'WhatsApp',
    price: 499
  };

  const submitRes = await fetch(`${BASE_URL}/dummy-tickets/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify(validRequestPayload)
  });
  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Failed to submit dummy ticket request: ${JSON.stringify(submitData)}`);
  const createdRequest = submitData.data;

  if (!createdRequest.requestId.startsWith('DT-')) {
    throw new Error(`Invalid requestId format: ${createdRequest.requestId}`);
  }
  console.log(`✓ [BOOKING CREATED] Generated stable Request ID: ${createdRequest.requestId}`);
  console.log(`✓ [STATUS DEFAULT] Initial status is "${createdRequest.status}"`);
  console.log(`✓ [TRAVELLERS STORED] Saved ${createdRequest.travellers.length} passengers in MongoDB`);

  // -------------------------------------------------------------
  // TEST 4: ADMIN DUMMY TICKETS MANAGEMENT & STATUS UPDATE
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Admin Dummy Tickets Management ---');
  const adminRequestsRes = await fetch(`${BASE_URL}/dummy-tickets/requests`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminRequestsData = await adminRequestsRes.json();
  const allRequests = adminRequestsData.data.items || adminRequestsData.data;
  const foundRequest = allRequests.some((r) => r.requestId === createdRequest.requestId);
  if (!foundRequest) throw new Error('Submitted request not found in admin requests table');
  console.log(`✓ [ADMIN LISTING] Admin retrieved ${allRequests.length} requests including ${createdRequest.requestId}`);

  // Admin updates status to "Ready" with PNR notes
  const updateStatusRes = await fetch(`${BASE_URL}/dummy-tickets/requests/${createdRequest._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'Ready',
      adminNotes: 'Issued on BA PNR: 7KJ9PQ'
    })
  });
  const updateStatusData = await updateStatusRes.json();
  if (!updateStatusRes.ok) throw new Error(`Failed to update status: ${JSON.stringify(updateStatusData)}`);
  const updatedReq = updateStatusData.data;
  if (updatedReq.status !== 'Ready' || updatedReq.adminNotes !== 'Issued on BA PNR: 7KJ9PQ') {
    throw new Error('Status or notes not updated properly');
  }
  console.log('✓ [STATUS UPDATE] Updated status to "Ready" with PNR notes');

  // Customer fetches My Requests
  const myRequestsRes = await fetch(`${BASE_URL}/dummy-tickets/requests/my`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  const myRequestsData = await myRequestsRes.json();
  const myItems = Array.isArray(myRequestsData.data) ? myRequestsData.data : [];
  const foundInMy = myItems.some((r) => r.requestId === createdRequest.requestId);
  if (!foundInMy) throw new Error('Request not found in customer My Account');
  console.log(`✓ [CUSTOMER ACCOUNT] Request ${createdRequest.requestId} verified in Customer My Account`);

  // Cleanup dummy ticket request
  await DummyTicketRequest.findByIdAndDelete(createdRequest._id);
  console.log('✓ [CLEANUP] Deleted test dummy ticket request from MongoDB');

  // -------------------------------------------------------------
  // TEST 5: REGRESSION OF PACKAGE CATALOG ROUTES
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Dummy Ticket Package Catalog Regression ---');
  const packagesRes = await fetch(`${BASE_URL}/dummy-tickets`);
  const packagesData = await packagesRes.json();
  if (!packagesRes.ok || !Array.isArray(packagesData.data)) {
    throw new Error('Package catalog route failed');
  }
  console.log(`✓ [PACKAGES CATALOG] Public packages endpoint returned ${packagesData.data.length} packages`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 ALL FINAL ARCHITECTURE & DUMMY TICKET CHECKS PASSED PERFECTLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
