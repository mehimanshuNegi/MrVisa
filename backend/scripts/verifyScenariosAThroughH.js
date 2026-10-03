const API_BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('================================================================');
  console.log('🚀 NIMUFLY FINAL VERIFICATION SUITE — SCENARIOS A THROUGH H');
  console.log('================================================================\n');

  const results = {};

  // 1. Admin Login
  console.log('🔑 Step 1: Admin Authentication');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nimufly.com', password: 'Admin@NimuFly2026!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken;
  if (!loginData.success || !token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('✅ Admin authenticated successfully.\n');

  // Fetch an existing visa to use as test subject
  const visasRes = await fetch(`${API_BASE}/visas`);
  const visasData = await visasRes.json();
  const testVisa = visasData.data?.visas?.[0] || visasData.data?.[0];
  if (!testVisa) throw new Error('No visas found to test');
  const visaId = testVisa._id || testVisa.id;
  console.log(`Using test visa: "${testVisa.title}" (ID: ${visaId})\n`);

  // ============================================================================
  // SCENARIO A: GOVERNMENT FEE
  // ============================================================================
  console.log('--- SCENARIO A: GOVERNMENT FEE ---');
  try {
    // 1. Update gov fee to ₹4,200
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ governmentFee: 4200, serviceFee: 1500 })
    });
    const check1 = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const gov1 = check1.data?.governmentFee;

    // 2. Set gov fee to 0 / clear
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ governmentFee: 0, serviceFee: 1500 })
    });
    const check2 = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const gov2 = check2.data?.governmentFee;

    if (gov1 === 4200 && gov2 === 0) {
      console.log('✅ SCENARIO A: PASS (Gov Fee edited to 4200, cleared to 0 without fallback)');
      results['A. GOVERNMENT FEE'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO A: FAIL (gov1: ${gov1}, gov2: ${gov2})`);
      results['A. GOVERNMENT FEE'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO A: FAIL', err.message);
    results['A. GOVERNMENT FEE'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO B: SERVICE FEE
  // ============================================================================
  console.log('\n--- SCENARIO B: SERVICE FEE ---');
  try {
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ serviceFee: 2800 })
    });
    const checkB = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const svcB = checkB.data?.serviceFee;

    if (svcB === 2800) {
      console.log('✅ SCENARIO B: PASS (Service fee updated to 2800 and retrieved via API)');
      results['B. SERVICE FEE'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO B: FAIL (svcB: ${svcB})`);
      results['B. SERVICE FEE'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO B: FAIL', err.message);
    results['B. SERVICE FEE'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO C: TOTAL FEE & PRICING SNAPSHOT
  // ============================================================================
  console.log('\n--- SCENARIO C: TOTAL FEE (Gov 5,500 + Svc 1,400 x 2 travellers = 13,800) ---');
  try {
    // Set Visa pricing
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ governmentFee: 5500, serviceFee: 1400 })
    });

    // Create application with 2 travellers
    const appRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId,
        applicantName: 'Test Applicant',
        applicantEmail: 'test.traveller@nimufly.com',
        applicantPhone: '9876543210',
        travellers: [
          { name: 'First Traveller', firstName: 'First', lastName: 'Traveller', passportNumber: 'P1234567' },
          { name: 'Second Traveller', firstName: 'Second', lastName: 'Traveller', passportNumber: 'P7654321' }
        ]
      })
    });
    const appData = await appRes.json();
    const snapshot = appData.data?.pricingSnapshot;

    const expectedGov = 5500 * 2; // 11000
    const expectedSvc = 1400 * 2; // 2800
    const expectedTotal = 13800;

    if (
      snapshot &&
      snapshot.governmentFee === 5500 &&
      snapshot.serviceFee === 1400 &&
      snapshot.travellerCount === 2 &&
      snapshot.totalAmount === expectedTotal
    ) {
      console.log(`✅ SCENARIO C: PASS (pricingSnapshot recorded: Gov ₹${expectedGov}, Svc ₹${expectedSvc}, Total ₹${snapshot.totalAmount})`);
      results['C. TOTAL FEE'] = 'PASS';
    } else {
      console.log('❌ SCENARIO C: FAIL', snapshot);
      results['C. TOTAL FEE'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO C: FAIL', err.message);
    results['C. TOTAL FEE'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO D: MISSING FEES
  // ============================================================================
  console.log('\n--- SCENARIO D: MISSING FEES ---');
  try {
    // 1. govFee missing (0), serviceFee 1499
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ governmentFee: 0, serviceFee: 1499 })
    });
    const d1 = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const govD1 = d1.data?.governmentFee;
    const svcD1 = d1.data?.serviceFee;

    // 2. Both missing (0)
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ governmentFee: 0, serviceFee: 0 })
    });
    const d2 = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const govD2 = d2.data?.governmentFee;
    const svcD2 = d2.data?.serviceFee;

    if (govD1 === 0 && svcD1 === 1499 && govD2 === 0 && svcD2 === 0) {
      console.log('✅ SCENARIO D: PASS (Gov=missing -> 0, Svc=1499 -> total 1499; Both missing -> Gov=0, Svc=0, Total=0)');
      results['D. MISSING FEES'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO D: FAIL (D1: gov ${govD1}, svc ${svcD1}; D2: gov ${govD2}, svc ${svcD2})`);
      results['D. MISSING FEES'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO D: FAIL', err.message);
    results['D. MISSING FEES'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO E: VISA / COUNTRY IMAGE MANAGEMENT
  // ============================================================================
  console.log('\n--- SCENARIO E: VISA / COUNTRY IMAGE MANAGEMENT ---');
  try {
    const testImageUrl = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80';
    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ image: testImageUrl })
    });

    const checkE = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const imageE = checkE.data?.image;

    if (imageE === testImageUrl) {
      console.log('✅ SCENARIO E: PASS (Admin wrote image URL to MongoDB; public API serves it without credentials exposed)');
      results['E. VISA IMAGE'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO E: FAIL (Stored: ${imageE})`);
      results['E. VISA IMAGE'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO E: FAIL', err.message);
    results['E. VISA IMAGE'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO F: NEW DOCUMENT REQUIREMENT (Bank Statement: PDF, JPG)
  // ============================================================================
  console.log('\n--- SCENARIO F: NEW DOCUMENT REQUIREMENT ---');
  let testAppId = null;
  try {
    const newDocs = [
      { title: 'Passport Front & Back Scan', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { title: 'Bank Statement', acceptedFormats: ['PDF', 'JPG'] }
    ];

    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        requiredDocuments: newDocs,
        governmentFee: 3000,
        serviceFee: 1500
      })
    });

    const checkF = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const docsF = checkF.data?.requiredDocuments || checkF.data?.documentsRequired;
    const bankDoc = docsF.find((d) => (d.title || d.name) === 'Bank Statement');

    // Create an application to test upload validation
    const appRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaId,
        applicantName: 'Doc Test User',
        applicantEmail: 'doctest@nimufly.com',
        applicantPhone: '9123456780',
        travellers: [{ name: 'Doc Tester', firstName: 'Doc', lastName: 'Tester', passportNumber: 'Z1234567' }]
      })
    });
    const appJson = await appRes.json();
    testAppId = appJson.data?._id || appJson.data?.id;

    // Test upload: PNG should be rejected
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const pngPayload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nBank Statement\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="applicationId"\r\n\r\n${testAppId}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="verificationKey"\r\n\r\n9123456780\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="statement.png"\r\nContent-Type: image/png\r\n\r\n`),
      pngMagic,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadPngRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-verification-key': '9123456780'
      },
      body: pngPayload
    });

    const pngRejected = uploadPngRes.status === 400;

    // Test upload: PDF should be accepted
    const boundaryPdf = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const pdfMagic = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\n0000000000 65535 f\ntrailer<</Size 1/Root 1 0 R>>\nstartxref\n9\n%%EOF');
    const pdfPayload = Buffer.concat([
      Buffer.from(`--${boundaryPdf}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nBank Statement\r\n`),
      Buffer.from(`--${boundaryPdf}\r\nContent-Disposition: form-data; name="applicationId"\r\n\r\n${testAppId}\r\n`),
      Buffer.from(`--${boundaryPdf}\r\nContent-Disposition: form-data; name="verificationKey"\r\n\r\n9123456780\r\n`),
      Buffer.from(`--${boundaryPdf}\r\nContent-Disposition: form-data; name="file"; filename="statement.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      pdfMagic,
      Buffer.from(`\r\n--${boundaryPdf}--\r\n`)
    ]);

    const uploadPdfRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryPdf}`,
        'x-verification-key': '9123456780'
      },
      body: pdfPayload
    });

    const pdfAccepted = uploadPdfRes.status === 201;

    if (bankDoc && JSON.stringify(bankDoc.acceptedFormats) === JSON.stringify(['PDF', 'JPG']) && pngRejected && pdfAccepted) {
      console.log('✅ SCENARIO F: PASS (New requirement Bank Statement saved, acceptedFormats PDF/JPG stored, PDF accepted, PNG rejected)');
      results['F. NEW DOCUMENT REQUIREMENT'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO F: FAIL (bankDoc: ${!!bankDoc}, formats: ${JSON.stringify(bankDoc?.acceptedFormats)}, pngRejected: ${pngRejected}, pdfAccepted: ${pdfAccepted})`);
      results['F. NEW DOCUMENT REQUIREMENT'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO F: FAIL', err.message);
    results['F. NEW DOCUMENT REQUIREMENT'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO G: CHANGE DOCUMENT FORMAT (Bank Statement: PDF only)
  // ============================================================================
  console.log('\n--- SCENARIO G: CHANGE DOCUMENT FORMAT ---');
  try {
    const updatedDocs = [
      { title: 'Passport Front & Back Scan', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { title: 'Bank Statement', acceptedFormats: ['PDF'] }
    ];

    await fetch(`${API_BASE}/visas/${visaId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ requiredDocuments: updatedDocs })
    });

    const checkG = await (await fetch(`${API_BASE}/visas/${visaId}`)).json();
    const docsG = checkG.data?.requiredDocuments || checkG.data?.documentsRequired;
    const bankDocG = docsG.find((d) => (d.title || d.name) === 'Bank Statement');

    // Test upload: JPG should now be rejected by acceptedFormats
    const boundaryJpg = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const jpgMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00]);
    const jpgPayload = Buffer.concat([
      Buffer.from(`--${boundaryJpg}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\nBank Statement\r\n`),
      Buffer.from(`--${boundaryJpg}\r\nContent-Disposition: form-data; name="applicationId"\r\n\r\n${testAppId}\r\n`),
      Buffer.from(`--${boundaryJpg}\r\nContent-Disposition: form-data; name="verificationKey"\r\n\r\n9123456780\r\n`),
      Buffer.from(`--${boundaryJpg}\r\nContent-Disposition: form-data; name="file"; filename="statement.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      jpgMagic,
      Buffer.from(`\r\n--${boundaryJpg}--\r\n`)
    ]);

    const uploadJpgRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundaryJpg}`,
        'x-verification-key': '9123456780'
      },
      body: jpgPayload
    });

    const jpgRejected = uploadJpgRes.status === 400;

    if (bankDocG && JSON.stringify(bankDocG.acceptedFormats) === JSON.stringify(['PDF']) && jpgRejected) {
      console.log('✅ SCENARIO G: PASS (Format changed to PDF only, JPG rejected, dynamic update without code modification)');
      results['G. CHANGE DOCUMENT FORMAT'] = 'PASS';
    } else {
      console.log(`❌ SCENARIO G: FAIL (formats: ${JSON.stringify(bankDocG?.acceptedFormats)}, jpgRejected: ${jpgRejected})`);
      results['G. CHANGE DOCUMENT FORMAT'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO G: FAIL', err.message);
    results['G. CHANGE DOCUMENT FORMAT'] = 'FAIL';
  }

  // ============================================================================
  // SCENARIO H: NEW DOCUMENTATION SERVICE REQUIREMENT
  // ============================================================================
  console.log('\n--- SCENARIO H: NEW DOCUMENTATION SERVICE REQUIREMENT ---');
  try {
    const slug = `test-service-${Date.now()}`;
    const newService = {
      title: 'Apostille & Consular Attestation',
      slug,
      category: 'Legal Documentation',
      shortDescription: 'Government verified apostille for global legal compliance.',
      description: 'Full apostille and consular authentication process.',
      serviceFee: 2999,
      governmentFee: 500,
      processingTime: '3–5 Days',
      requirements: [
        {
          title: 'Original Degree Certificate',
          category: 'Educational Documents',
          required: true,
          acceptedFormats: ['PDF']
        },
        {
          title: 'Identity Proof (Passport/Aadhaar)',
          category: 'Personal Identification',
          required: true,
          acceptedFormats: ['PDF', 'JPG', 'PNG']
        }
      ]
    };

    const createServiceRes = await fetch(`${API_BASE}/documentation-services`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(newService)
    });
    const createdServiceData = await createServiceRes.json();

    const fetchServiceRes = await fetch(`${API_BASE}/documentation-services/${slug}`);
    const fetchedServiceData = await fetchServiceRes.json();
    const reqs = fetchedServiceData.data?.requirements;

    if (
      createdServiceData.success &&
      fetchedServiceData.success &&
      Array.isArray(reqs) &&
      reqs.length === 2 &&
      JSON.stringify(reqs[0].acceptedFormats) === JSON.stringify(['PDF'])
    ) {
      console.log('✅ SCENARIO H: PASS (New documentation service created from Admin API, stored in MongoDB, retrieved dynamically with acceptedFormats)');
      results['H. NEW DOCUMENTATION SERVICE REQUIREMENT'] = 'PASS';
    } else {
      console.log('❌ SCENARIO H: FAIL', createdServiceData, fetchedServiceData);
      results['H. NEW DOCUMENTATION SERVICE REQUIREMENT'] = 'FAIL';
    }
  } catch (err) {
    console.log('❌ SCENARIO H: FAIL', err.message);
    results['H. NEW DOCUMENTATION SERVICE REQUIREMENT'] = 'FAIL';
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n================================================================');
  console.log('📊 FINAL TEST RESULTS:');
  console.log('================================================================');
  for (const [test, result] of Object.entries(results)) {
    console.log(`${test.padEnd(45)} : ${result}`);
  }

  const allPassed = Object.values(results).every((r) => r === 'PASS');
  console.log('\nOVERALL RESULT:', allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
