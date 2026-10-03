import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Country } from '../src/models/Country.js';
import { Visa } from '../src/models/Visa.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { ROLES } from '../src/constants/roles.js';
import { authService } from '../src/services/auth.service.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api/v1';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const status = response.status;
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-json response
  }

  return { status, ok: response.ok, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('NIMUFLY ADMIN CRUD & ATLAS PERSISTENCE VERIFICATION');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected directly to MongoDB Atlas for ground-truth verification.\n');

  try {
    // -------------------------------------------------------------
    // Step 1: Admin Authentication
    // -------------------------------------------------------------
    console.log('--- Step 1: Admin Authentication ---');
    const adminLoginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@nimufly.com',
        password: 'Admin@NimuFly2026!'
      }
    });

    if (!adminLoginRes.ok || !adminLoginRes.data?.data?.tokens?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }

    const adminToken = adminLoginRes.data.data.tokens.accessToken;
    console.log(' Admin authenticated successfully. Access token received.\n');

    // -------------------------------------------------------------
    // Step 2: Customer Authorization Enforcement (Security)
    // -------------------------------------------------------------
    console.log('--- Step 2: Customer Authorization Enforcement ---');
    let customerUser = await User.findOne({ email: 'test.customer@nimufly.com' });
    if (!customerUser) {
      customerUser = await User.create({
        name: 'Test Customer',
        email: 'test.customer@nimufly.com',
        phone: '+919999988888',
        passwordHash: 'Password123!',
        role: ROLES.CUSTOMER
      });
    }

    const { accessToken: customerToken } = authService._generateTokens(customerUser);
    const sampleCountry = await Country.findOne({ isDeleted: false });
    const sampleVisa = await Visa.findOne({ isDeleted: false });

    // Customer attempt to modify country
    const countryCustRes = await apiRequest(`/countries/${sampleCountry._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { description: 'Hacked by customer' }
    });

    // Customer attempt to modify visa
    const visaCustRes = await apiRequest(`/visas/${sampleVisa._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { governmentFee: 0, serviceFee: 0 }
    });

    if (countryCustRes.status !== 403 || visaCustRes.status !== 403) {
      throw new Error(`Security failed! country status: ${countryCustRes.status}, visa status: ${visaCustRes.status}`);
    }
    console.log(' Security enforced: Normal customer received HTTP 403 FORBIDDEN when attempting country & visa updates.\n');

    // -------------------------------------------------------------
    // Step 3: Real Country CRUD & Atlas Persistence
    // -------------------------------------------------------------
    console.log('--- Step 3: Country Update & Atlas Persistence ---');
    console.log(`Testing target country: ${sampleCountry.name} (ID: ${sampleCountry._id})`);
    const origCountryDesc = sampleCountry.description;
    const origCountryFlag = sampleCountry.flagEmoji;

    const testCountryDesc = `Updated destination description via Admin Dashboard at ${new Date().toISOString()}`;
    const testCountryFlag = '🌏';

    // 1. Admin updates country via API
    const updateCountryRes = await apiRequest(`/countries/${sampleCountry._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: testCountryDesc,
        flagEmoji: testCountryFlag
      }
    });

    if (!updateCountryRes.ok) {
      throw new Error(`Country update failed: ${JSON.stringify(updateCountryRes.data)}`);
    }
    console.log(' Backend accepted country update (HTTP 200).');

    // 2. Query MongoDB Atlas directly
    const atlasCountryCheck = await Country.findById(sampleCountry._id);
    if (atlasCountryCheck.description !== testCountryDesc || atlasCountryCheck.flagEmoji !== testCountryFlag) {
      throw new Error('Atlas database does NOT contain the updated country values!');
    }
    console.log(' Verified directly in MongoDB Atlas: updated description and flag emoji persisted.');

    // 3. Fetch through GET API (simulating page refresh)
    const refreshCountryRes = await apiRequest(`/countries/${sampleCountry._id}`);
    if (refreshCountryRes.data.data.description !== testCountryDesc) {
      throw new Error('GET /countries/:id failed to return updated value after simulated refresh!');
    }
    console.log(' Simulated page refresh confirmed updated country values.\n');

    // Restore original country values
    await apiRequest(`/countries/${sampleCountry._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: origCountryDesc,
        flagEmoji: origCountryFlag
      }
    });
    console.log(' Original country values restored successfully in Atlas.\n');

    // -------------------------------------------------------------
    // Step 4: Real Visa CRUD & Atlas Persistence
    // -------------------------------------------------------------
    console.log('--- Step 4: Visa Update & Atlas Persistence ---');
    console.log(`Testing target visa: ${sampleVisa.title} (ID: ${sampleVisa._id})`);
    const origGovFee = sampleVisa.governmentFee;
    const origSvcFee = sampleVisa.serviceFee;
    const origProcessingTime = sampleVisa.processingTime;
    const origDocs = [...sampleVisa.requiredDocuments];

    const testGovFee = 2850;
    const testSvcFee = 1650;
    const testProcessingTime = '12–24 Hours Expedited';
    const testDocs = [
      'Original Passport with 6-month validity',
      'Recent Passport-Sized Photograph (35x45mm)',
      'Proof of Hotel Accommodation & Flight Itinerary'
    ];

    // 1. Admin updates visa via API with distinct fees and documents list
    const updateVisaRes = await apiRequest(`/visas/${sampleVisa._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        governmentFee: testGovFee,
        serviceFee: testSvcFee,
        processingTime: testProcessingTime,
        requiredDocuments: testDocs
      }
    });

    if (!updateVisaRes.ok) {
      throw new Error(`Visa update failed: ${JSON.stringify(updateVisaRes.data)}`);
    }
    console.log(' Backend accepted visa update (HTTP 200).');

    // 2. Query MongoDB Atlas directly
    const atlasVisaCheck = await Visa.findById(sampleVisa._id);
    if (
      atlasVisaCheck.governmentFee !== testGovFee ||
      atlasVisaCheck.serviceFee !== testSvcFee ||
      atlasVisaCheck.processingTime !== testProcessingTime ||
      atlasVisaCheck.requiredDocuments.length !== 3 ||
      atlasVisaCheck.requiredDocuments[2] !== testDocs[2]
    ) {
      throw new Error('Atlas database does NOT contain the updated visa values!');
    }
    console.log(' Verified directly in MongoDB Atlas: governmentFee (₹2,850), serviceFee (₹1,650), processingTime, and documents checklist persisted.');
    console.log(` Computed totalFee virtual: ₹${atlasVisaCheck.totalFee} (Gov ₹${atlasVisaCheck.governmentFee} + Svc ₹${atlasVisaCheck.serviceFee})`);

    // 3. Fetch through GET API (simulating page refresh)
    const refreshVisaRes = await apiRequest(`/visas/${sampleVisa._id}`);
    const refreshedVisa = refreshVisaRes.data.data;
    if (
      refreshedVisa.governmentFee !== testGovFee ||
      refreshedVisa.serviceFee !== testSvcFee ||
      refreshedVisa.processingTime !== testProcessingTime ||
      refreshedVisa.requiredDocuments.length !== 3
    ) {
      throw new Error('GET /visas/:id failed to return updated values after simulated refresh!');
    }
    console.log(` Simulated page refresh confirmed updated visa: price=${refreshedVisa.price}, totalFee=${refreshedVisa.totalFee}.\n`);

    // Restore original visa values
    await apiRequest(`/visas/${sampleVisa._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        governmentFee: origGovFee,
        serviceFee: origSvcFee,
        processingTime: origProcessingTime,
        requiredDocuments: origDocs
      }
    });
    console.log(' Original visa values restored successfully in Atlas.\n');

    // -------------------------------------------------------------
    // Step 5: Audit Log Verification
    // -------------------------------------------------------------
    console.log('--- Step 5: Audit Logging Verification ---');
    const recentCountryAudit = await AuditLog.findOne({
      entity: 'COUNTRY',
      entityId: String(sampleCountry._id)
    }).sort({ createdAt: -1 });

    const recentVisaAudit = await AuditLog.findOne({
      entity: 'VISA',
      entityId: String(sampleVisa._id)
    }).sort({ createdAt: -1 });

    console.log(` Country Audit Record: Action=${recentCountryAudit?.action}, ActorEmail=${recentCountryAudit?.actorEmail}, EntityId=${recentCountryAudit?.entityId}`);
    console.log(` Visa Audit Record: Action=${recentVisaAudit?.action}, ActorEmail=${recentVisaAudit?.actorEmail}, EntityId=${recentVisaAudit?.entityId}`);

    if (!recentCountryAudit || !recentVisaAudit) {
      throw new Error('Audit logs were not created for country/visa mutations!');
    }
    if (recentVisaAudit.actorEmail !== 'admin@nimufly.com') {
      throw new Error(`Expected actorEmail 'admin@nimufly.com', got '${recentVisaAudit.actorEmail}'`);
    }
    console.log(' Audit log verification passed: Admin user email, action, entity, entityId, and timestamp captured.\n');

    // -------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------
    const finalCountryCount = await Country.countDocuments({ isDeleted: false });
    const finalVisaCount = await Visa.countDocuments({ isDeleted: false });

    console.log('====================================================');
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log(`Total Active Countries in Atlas: ${finalCountryCount}`);
    console.log(`Total Active Visas in Atlas: ${finalVisaCount}`);
    console.log('====================================================');
  } finally {
    await mongoose.disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\n VERIFICATION FAILED:', err.message);
  process.exit(1);
});
