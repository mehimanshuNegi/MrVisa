import assert from 'assert';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { DocumentationService } from '../models/DocumentationService.js';
import { DocumentationRequest } from '../models/DocumentationRequest.js';
import { documentationRequestService } from '../services/documentationRequest.service.js';
import { documentationService } from '../services/documentation.service.js';
import { Visa } from '../models/Visa.js';
import { Application } from '../models/Application.js';
import { Document } from '../models/Document.js';
import { applicationService } from '../services/application.service.js';

async function runTests() {
  console.log('--- Starting Documentation Services & Admin Requirements Test Suite ---\n');
  await connectDatabase();

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  // TEST SUITE 1: VERIFY 5 SERVICES EXIST WITH PROPER CONFIGURATION
  console.log('1. Verifying 5 Documentation Services in MongoDB:');
  const services = await DocumentationService.find({
    slug: { $in: ['cover-letter', 'travel-itinerary', 'itr', 'import-export', 'msme'] }
  });

  test('All 5 core documentation services exist in database', () => {
    assert.strictEqual(services.length, 5, 'Must have 5 documentation services');
  });

  const serviceMap = {};
  services.forEach((s) => {
    serviceMap[s.slug] = s;
  });

  // A. Cover Letter
  test('Cover Letter has proper required and optional fields', () => {
    const cl = serviceMap['cover-letter'];
    assert(cl, 'Cover letter service must exist');
    const titles = cl.requirements.map((r) => r.title);
    assert(titles.includes('Passport copy'), 'Has passport copy requirement');
    assert(titles.includes('Visa application form / visa type'), 'Has visa type requirement');
    assert(titles.includes('Travel dates'), 'Has travel dates requirement');
    assert(titles.includes('Purpose of travel'), 'Has purpose requirement');
    assert(titles.includes('Destination and cities'), 'Has destination requirement');
    assert(titles.includes('Employment/business details'), 'Has employment requirement');

    const passportReq = cl.requirements.find((r) => r.title === 'Passport copy');
    assert.strictEqual(passportReq.required, true, 'Passport copy is required');

    const hotelReq = cl.requirements.find((r) => r.title === 'Hotel booking');
    assert(hotelReq, 'Has hotel booking');
    assert.strictEqual(hotelReq.required, false, 'Hotel booking is optional');

    const flightReq = cl.requirements.find((r) => r.title === 'Flight reservation');
    assert(flightReq, 'Has flight reservation');
    assert.strictEqual(flightReq.required, false, 'Flight reservation is optional');

    const invitationReq = cl.requirements.find((r) => r.title === 'Invitation letter');
    assert(invitationReq, 'Has invitation letter for business travellers');
    assert.strictEqual(invitationReq.conditionField, 'purpose', 'Invitation letter is conditional on purpose');
  });

  // B. Travel Itinerary
  test('Travel Itinerary has day-by-day planning requirements', () => {
    const ti = serviceMap['travel-itinerary'];
    assert(ti, 'Travel Itinerary service must exist');
    const titles = ti.requirements.map((r) => r.title);
    assert(titles.includes('Passport copy'), 'Has passport copy');
    assert(titles.includes('Destination country'), 'Has destination country');
    assert(titles.includes('Travel dates'), 'Has travel dates');
    assert(titles.includes('Cities to be visited'), 'Has cities to visit');
    assert(titles.includes('Purpose of travel'), 'Has purpose of travel');
    assert(titles.includes('Number of travellers'), 'Has number of travellers');

    const hotelReq = ti.requirements.find((r) => r.title === 'Preferred hotels or existing bookings');
    assert(hotelReq && hotelReq.required === false, 'Preferred hotel is optional');

    const flightReq = ti.requirements.find((r) => r.title === 'Existing flight details or reservations');
    assert(flightReq && flightReq.required === false, 'Existing flight details is optional');
  });

  // C. Income Tax Return (ITR)
  test('Income Tax Return has income classification and tax period requirements', () => {
    const itr = serviceMap['itr'];
    assert(itr, 'ITR service must exist');
    const titles = itr.requirements.map((r) => r.title);
    assert(titles.includes('Income Category'), 'Has Income Category selector');
    assert(titles.includes('PAN card'), 'Has PAN card upload');
    assert(titles.includes('Aadhaar card'), 'Has Aadhaar card upload');
    assert(titles.includes('Mobile number'), 'Has Mobile number input');
    assert(titles.includes('Assessment Year / Financial Year'), 'Has AY/FY selector');

    const incomeCatReq = itr.requirements.find((r) => r.title === 'Income Category');
    assert.strictEqual(incomeCatReq.inputType, 'select', 'Income Category is a select input');
    assert(incomeCatReq.options.includes('Salaried individual'), 'Includes Salaried option');
    assert(incomeCatReq.options.includes('Business / professional or self-employed'), 'Includes Business option');

    const form16Req = itr.requirements.find((r) => r.title === 'Form 16 / Salary slips');
    assert(form16Req, 'Has Form 16 / Salary slips requirement');
    assert.strictEqual(form16Req.conditionField, 'incomeType', 'Form 16 is conditional on incomeType');

    const businessReq = itr.requirements.find((r) => r.title === 'Business/firm details');
    assert(businessReq, 'Has business details requirement');
    assert.strictEqual(businessReq.conditionField, 'incomeType', 'Business details conditional on incomeType');
  });

  // D. Import Export Code (IEC)
  test('Import Export Code has entity-type selector and conditional corporate requirements', () => {
    const iec = serviceMap['import-export'];
    assert(iec, 'IEC service must exist');
    const titles = iec.requirements.map((r) => r.title);
    assert(titles.includes('Entity Type'), 'Has Entity Type selector');
    assert(titles.includes('PAN card'), 'Has PAN card');
    assert(titles.includes('Aadhaar/identity proof'), 'Has Aadhaar/identity proof');
    assert(titles.includes('Mobile number'), 'Has mobile number');
    assert(titles.includes('Email ID'), 'Has email id');
    assert(titles.includes('Business/proprietorship/company details'), 'Has business details');
    assert(titles.includes('Business address proof'), 'Has address proof');
    assert(titles.includes('Bank account details'), 'Has bank account details');

    const entityReq = iec.requirements.find((r) => r.title === 'Entity Type');
    assert.strictEqual(entityReq.inputType, 'select');
    assert(entityReq.options.includes('Proprietorship'), 'Includes Proprietorship');
    assert(entityReq.options.includes('Company'), 'Includes Company');
    assert(entityReq.options.includes('LLP'), 'Includes LLP');

    const incorpReq = iec.requirements.find((r) => r.title === 'Company/LLP incorporation documents');
    assert(incorpReq, 'Has incorporation documents');
    assert.strictEqual(incorpReq.conditionField, 'entityType', 'Incorp docs conditional on entityType');

    const dscReq = iec.requirements.find((r) => r.title === 'DSC (Digital Signature Certificate)');
    assert(dscReq, 'Has DSC requirement');
    assert.strictEqual(dscReq.conditionField, 'entityType', 'DSC conditional on entityType');
  });

  // E. Udyam Registration (MSME)
  test('Udyam Registration has MSME scale, employee count and trade activity', () => {
    const msme = serviceMap['msme'];
    assert(msme, 'MSME service must exist');
    const titles = msme.requirements.map((r) => r.title);
    assert(titles.includes('Aadhaar'), 'Has Aadhaar');
    assert(titles.includes('PAN'), 'Has PAN');
    assert(titles.includes('Mobile number'), 'Has Mobile number');
    assert(titles.includes('Business name'), 'Has Business name');
    assert(titles.includes('Business address'), 'Has Business address');
    assert(titles.includes('Business activity/nature of business'), 'Has Business activity');
    assert(titles.includes('Bank account details'), 'Has Bank account details');
    assert(titles.includes('Number of employees'), 'Has Number of employees');

    const actReq = msme.requirements.find((r) => r.title === 'Business activity/nature of business');
    assert.strictEqual(actReq.inputType, 'select');
    assert(actReq.options.includes('Manufacturing'), 'Has Manufacturing option');
    assert(actReq.options.includes('Services'), 'Has Services option');

    const empReq = msme.requirements.find((r) => r.title === 'Number of employees');
    assert.strictEqual(empReq.inputType, 'number');
  });

  // TEST SUITE 2: APPLICATION SUBMISSION AND BACKEND ENFORCEMENT
  console.log('\n2. Testing Customer Intake Submission & Server Validation:');

  // Test 2.1: Valid Cover Letter Submission without optional documents
  await asyncTest('Cover Letter submission succeeds with required fields and without optional hotel/flight', async () => {
    const cl = serviceMap['cover-letter'];
    const payload = {
      serviceId: cl._id,
      applicant: {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '9876543210'
      },
      details: {
        'Visa application form / visa type': 'Schengen Tourist Visa',
        'Travel dates': '15 Nov 2026 – 28 Nov 2026',
        'Purpose of travel': 'Tourism',
        'Destination and cities': 'France (Paris, Nice)',
        'Employment/business details': 'Software Architect, Infosys Ltd, 8 years'
      },
      documents: [
        {
          documentType: 'Passport copy',
          name: 'aarav_passport.pdf',
          originalFilename: 'aarav_passport.pdf',
          storageKey: 'documentation/test/passport_aarav.pdf',
          mimeType: 'application/pdf',
          fileSize: 1048576
        }
      ]
    };

    const result = await documentationRequestService.createRequest(payload);
    assert(result, 'Request created');
    assert(result.requestId.startsWith('DOC-'), 'Request ID starts with DOC-');
    assert.strictEqual(result.applicant.name, 'Aarav Sharma');
    assert(result.applicant.phone.includes('9876543210'), 'Phone contains 10 digits');
    assert(result.requirementsSnapshot?.length > 0, 'Preserved requirementsSnapshot');
  });

  // Test 2.2: Missing Required Document Blocks Submission
  await asyncTest('Missing required Passport copy blocks Cover Letter submission with 400 Bad Request', async () => {
    const cl = serviceMap['cover-letter'];
    const payload = {
      serviceId: cl._id,
      applicant: {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '9876543210'
      },
      details: {
        'Visa application form / visa type': 'Tourist Visa',
        'Travel dates': '15 Nov 2026 – 28 Nov 2026',
        'Purpose of travel': 'Tourism',
        'Destination and cities': 'France',
        'Employment/business details': 'Engineer'
      },
      documents: [] // No passport uploaded!
    };

    let threw = false;
    try {
      await documentationRequestService.createRequest(payload);
    } catch (err) {
      threw = true;
      assert(err.message.includes('Passport copy'), `Error mentions Passport copy: ${err.message}`);
    }
    assert(threw, 'Should throw error when required document is missing');
  });

  // Test 2.3: Missing Required Form Field Blocks Submission
  await asyncTest('Missing required Travel dates blocks Cover Letter submission with 400 Bad Request', async () => {
    const cl = serviceMap['cover-letter'];
    const payload = {
      serviceId: cl._id,
      applicant: {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '9876543210'
      },
      details: {
        'Visa application form / visa type': 'Tourist Visa',
        // Travel dates omitted!
        'Purpose of travel': 'Tourism',
        'Destination and cities': 'France',
        'Employment/business details': 'Engineer'
      },
      documents: [
        {
          documentType: 'Passport copy',
          name: 'passport.pdf',
          storageKey: 'documentation/test/passport.pdf',
          fileSize: 1024
        }
      ]
    };

    let threw = false;
    try {
      await documentationRequestService.createRequest(payload);
    } catch (err) {
      threw = true;
      assert(err.message.includes('Travel dates'), `Error mentions Travel dates: ${err.message}`);
    }
    assert(threw, 'Should throw error when required text field is missing');
  });

  // Test 2.4: Invalid Email & Mobile Validation in Documentation Intake
  await asyncTest('Malformed email (user@gmail.con) is rejected with 400 Bad Request', async () => {
    const cl = serviceMap['cover-letter'];
    const payload = {
      serviceId: cl._id,
      applicant: {
        name: 'Priya Patel',
        email: 'priya@gmail.con',
        phone: '9876543210'
      },
      details: {},
      documents: []
    };

    let threw = false;
    try {
      await documentationRequestService.createRequest(payload);
    } catch (err) {
      threw = true;
      const lower = err.message.toLowerCase();
      assert(lower.includes('email') || lower.includes('domain') || lower.includes('gmail.con'), `Error mentions invalid email/domain: ${err.message}`);
    }
    assert(threw, 'Should reject malformed email');
  });

  await asyncTest('Invalid Indian mobile number (9 digits) is rejected with 400 Bad Request', async () => {
    const cl = serviceMap['cover-letter'];
    const payload = {
      serviceId: cl._id,
      applicant: {
        name: 'Priya Patel',
        email: 'priya@gmail.com',
        phone: '987654321' // 9 digits
      },
      details: {},
      documents: []
    };

    let threw = false;
    try {
      await documentationRequestService.createRequest(payload);
    } catch (err) {
      threw = true;
      const lower = err.message.toLowerCase();
      assert(lower.includes('mobile') || lower.includes('phone') || lower.includes('10 digits'), `Error mentions mobile/phone: ${err.message}`);
    }
    assert(threw, 'Should reject 9-digit mobile number');
  });

  // Test 2.5: Travel Itinerary Valid Submission
  await asyncTest('Travel Itinerary submission succeeds with multi-destination information', async () => {
    const ti = serviceMap['travel-itinerary'];
    const payload = {
      serviceId: ti._id,
      applicant: {
        name: 'Rohan Mehra',
        email: 'rohan.mehra@outlook.com',
        phone: '9811223344'
      },
      details: {
        'Destination country': 'Switzerland & Austria',
        'Travel dates': '10 Dec 2026 – 24 Dec 2026',
        'Cities to be visited': 'Zurich, Lucerne, Interlaken, Vienna, Salzburg',
        'Purpose of travel': 'Tourism & Leisure',
        'Number of travellers': 2,
        'Preferred places and activities': 'Jungfraujoch, Rhine Falls, Schönbrunn Palace'
      },
      documents: [
        {
          documentType: 'Passport copy',
          name: 'rohan_passport.pdf',
          storageKey: 'documentation/test/ti_passport.pdf',
          fileSize: 2048576
        }
      ]
    };

    const result = await documentationRequestService.createRequest(payload);
    assert(result, 'Travel itinerary created');
    assert.strictEqual(result.serviceTitle, 'Travel Itinerary');
    assert(result.requestId.startsWith('DOC-'));
  });

  // Test 2.6: ITR Valid Submission
  await asyncTest('ITR submission succeeds with income type and financial identification', async () => {
    const itr = serviceMap['itr'];
    const payload = {
      serviceId: itr._id,
      applicant: {
        name: 'Vikram Seth',
        email: 'vikram.seth@company.com',
        phone: '9988776655'
      },
      details: {
        'Income Category': 'Salaried individual',
        'Mobile number': '9988776655',
        'Assessment Year / Financial Year': 'AY 2025-26 (FY 2024-25)',
        'Employer details': 'Tata Consultancy Services, Technical Lead'
      },
      documents: [
        {
          documentType: 'PAN card',
          name: 'pan_card.jpg',
          storageKey: 'documentation/test/pan_vikram.jpg',
          fileSize: 524288
        },
        {
          documentType: 'Aadhaar card',
          name: 'aadhaar_card.pdf',
          storageKey: 'documentation/test/aadhaar_vikram.pdf',
          fileSize: 1048576
        }
      ]
    };

    const result = await documentationRequestService.createRequest(payload);
    assert(result, 'ITR application created');
    assert.strictEqual(result.serviceSlug, 'itr');
  });

  // Test 2.7: IEC Valid Submission
  await asyncTest('IEC submission for Proprietorship succeeds without requiring Company incorporation docs', async () => {
    const iec = serviceMap['import-export'];
    const payload = {
      serviceId: iec._id,
      applicant: {
        name: 'Sunita Verma',
        email: 'sunita@vermatraders.in',
        phone: '9822334455'
      },
      details: {
        'Entity Type': 'Proprietorship',
        'Mobile number': '9822334455',
        'Email ID': 'sunita@vermatraders.in',
        'Business/proprietorship/company details': 'Verma Spice Traders, Est. 2020',
        'Bank account details': 'HDFC Bank, A/C: 50100234567890, IFSC: HDFC0001234'
      },
      documents: [
        {
          documentType: 'PAN card',
          name: 'sunita_pan.pdf',
          storageKey: 'documentation/test/sunita_pan.pdf',
          fileSize: 500000
        },
        {
          documentType: 'Aadhaar/identity proof',
          name: 'sunita_aadhaar.pdf',
          storageKey: 'documentation/test/sunita_aadhaar.pdf',
          fileSize: 600000
        },
        {
          documentType: 'Business address proof',
          name: 'electricity_bill.pdf',
          storageKey: 'documentation/test/electricity_bill.pdf',
          fileSize: 800000
        }
      ]
    };

    const result = await documentationRequestService.createRequest(payload);
    assert(result, 'IEC request created successfully');
    assert.strictEqual(result.serviceSlug, 'import-export');
  });

  // Test 2.8: MSME Valid Submission
  await asyncTest('MSME Udyam registration succeeds with enterprise parameters', async () => {
    const msme = serviceMap['msme'];
    const payload = {
      serviceId: msme._id,
      applicant: {
        name: 'Deepak Joshi',
        email: 'deepak@precisioneng.com',
        phone: '9765432109'
      },
      details: {
        'Mobile number': '9765432109',
        'Business name': 'Precision Engineering Works',
        'Business address': 'Plot 42, Industrial Area Phase 2, Pune 411018',
        'Business activity/nature of business': 'Manufacturing',
        'Bank account details': 'State Bank of India, A/C: 30987654321, IFSC: SBIN0004321',
        'Number of employees': 15,
        'Investment/turnover information': 'Plant investment: 25 Lakhs, Turnover: 60 Lakhs'
      },
      documents: [
        {
          documentType: 'Aadhaar',
          name: 'deepak_aadhaar.pdf',
          storageKey: 'documentation/test/deepak_aadhaar.pdf',
          fileSize: 700000
        },
        {
          documentType: 'PAN',
          name: 'deepak_pan.pdf',
          storageKey: 'documentation/test/deepak_pan.pdf',
          fileSize: 450000
        }
      ]
    };

    const result = await documentationRequestService.createRequest(payload);
    assert(result, 'MSME registration application created');
    assert.strictEqual(result.serviceSlug, 'msme');
  });

  // TEST SUITE 3: ADMIN CONFIGURATION & LIVE UPDATE
  console.log('\n3. Testing Admin Dynamic Configuration & Reflection:');

  await asyncTest('Admin can add a new requirement and toggle Required / Optional setting', async () => {
    const cl = await DocumentationService.findOne({ slug: 'cover-letter' });
    const originalCount = cl.requirements.length;

    // Add a custom requirement
    const newReq = {
      title: 'Leave Sanction Letter from Employer',
      category: 'Employment / Business',
      required: false, // Optional
      inputType: 'file',
      acceptedFormats: ['PDF'],
      maxSizeMb: 10,
      description: 'Official approved leave letter on company letterhead'
    };

    const updated = await documentationService.updateService(cl._id, {
      requirements: [...cl.requirements, newReq]
    });

    assert.strictEqual(updated.requirements.length, originalCount + 1, 'Requirement was added');
    const addedItem = updated.requirements.find((r) => r.title === 'Leave Sanction Letter from Employer');
    assert(addedItem, 'Found newly added requirement');
    assert.strictEqual(addedItem.required, false, 'Configured as Optional');

    // Clean up: revert back
    await documentationService.updateService(cl._id, {
      requirements: cl.requirements
    });
  });

  // TEST SUITE 4: VISA DOCUMENT OPTIONAL / REQUIRED INTEGRATION
  console.log('\n4. Testing Visa Optional Document Upload Integration:');

  await asyncTest('Visa optional documents (required: false) do not block application submission', async () => {
    // Find an active visa
    const visa = await Visa.findOne({ isActive: true, isDeleted: false });
    if (!visa) {
      console.log('    (Skipping visa test: no active visa found)');
      return;
    }

    // Set visa requiredDocuments with 1 required and 1 optional document
    const originalDocs = visa.requiredDocuments;
    visa.requiredDocuments = [
      { title: 'Passport Bio Page Scan', required: true },
      { title: 'Hotel Booking Confirmation', required: false } // Optional!
    ];
    await visa.save();

    // Create draft application
    const app = await Application.create({
      referenceNumber: `MV-${Math.floor(100000 + Math.random() * 900000)}`,
      visa: visa._id,
      country: visa.country,
      destinationCountry: visa.country,
      visaType: visa.visaType,
      pricing: { totalAmount: 1999 },
      pricingSnapshot: {
        governmentFee: visa.governmentFee || 0,
        serviceFee: visa.serviceFee || 1999,
        totalAmount: 1999,
        travellerCount: 1,
        totalAmountPerPerson: 1999,
        currency: 'INR'
      },
      travellers: [
        {
          name: 'Ananya Deshmukh',
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          passportNumber: 'Z1234567',
          phone: '9876543210',
          email: 'ananya@example.com'
        }
      ],
      primaryContact: {
        name: 'Ananya Deshmukh',
        email: 'ananya@example.com',
        phone: '9876543210'
      },
      status: 'DRAFT'
    });

    // Upload only the required document (Passport), leaving optional (Hotel) un-uploaded
    await Document.create({
      application: app._id,
      documentType: 'Passport Bio Page Scan',
      name: 'passport.pdf',
      storageKey: `visas/test/passport_${app._id}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 1048576,
      status: 'PENDING'
    });

    // Submit application - should succeed because Hotel Booking is optional!
    const submitted = await applicationService.submitApplication(app._id);
    assert(submitted, 'Application successfully submitted');
    assert.strictEqual(submitted.status, 'DOCUMENTS_UNDER_REVIEW');

    // Clean up
    visa.requiredDocuments = originalDocs;
    await visa.save();
    await Application.findByIdAndDelete(app._id);
    await Document.deleteMany({ application: app._id });
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await disconnectDatabase();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
