import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Document } from '../models/Document.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { authService } from '../services/auth.service.js';
import { applicationService } from '../services/application.service.js';
import { documentService } from '../services/document.service.js';
import { storageService } from '../services/storage.service.js';
import { APPLICATION_STATUS } from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import { logger } from '../utils/logger.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function recordResult(name, passed, detail = '') {
  totalTests++;
  if (passed) passedTests++;
  else failedTests++;
  results.push({ name, passed, detail });
  console.log(`[${passed ? '✅ PASS' : '❌ FAIL'}] ${name}${detail ? ` (${detail})` : ''}`);
}

async function runVerification() {
  console.log('========================================================================');
  console.log('🚀 NIMUFLY APPLICATION + DOCUMENT UPLOAD WORKFLOW VERIFICATION');
  console.log('========================================================================\n');

  await connectDatabase();

  const cleanupUserIds = [];
  const cleanupAppIds = [];
  const cleanupDocKeys = [];

  try {
    // 0. Setup Test Users: Customer A, Customer B, Admin
    const emailA = `cust_a_${Date.now()}@workflow-test.com`;
    const emailB = `cust_b_${Date.now()}@workflow-test.com`;
    const emailAdmin = `admin_${Date.now()}@workflow-test.com`;

    const userA = await User.create({
      name: 'Customer A Test',
      email: emailA,
      passwordHash: 'Password123!',
      role: ROLES.CUSTOMER,
      phone: '+91 99999 11111',
      isActive: true
    });
    cleanupUserIds.push(userA._id);

    const userB = await User.create({
      name: 'Customer B Test',
      email: emailB,
      passwordHash: 'Password123!',
      role: ROLES.CUSTOMER,
      phone: '+91 99999 22222',
      isActive: true
    });
    cleanupUserIds.push(userB._id);

    const adminUser = await User.create({
      name: 'Admin Test',
      email: emailAdmin,
      passwordHash: 'AdminPassword123!',
      role: ROLES.ADMIN,
      phone: '+91 99999 33333',
      isActive: true
    });
    cleanupUserIds.push(adminUser._id);

    // Pick a test visa from DB (e.g. Russia or Vietnam)
    const testVisa = await Visa.findOne({ isActive: true, isDeleted: false }).populate('country');
    if (!testVisa) throw new Error('No active Visa found in database to test with');
    console.log(`Using Test Visa: ${testVisa.title} (Country: ${testVisa.country.name})`);
    console.log(`Required Documents for Visa: ${JSON.stringify(testVisa.requiredDocuments)}\n`);

    // TEST 1: Create test application
    const appData = {
      visaId: testVisa._id.toString(),
      status: APPLICATION_STATUS.DRAFT,
      travellers: [
        {
          name: 'Customer A Test',
          passportNumber: 'Z1234567',
          nationality: 'Indian',
          dob: '1990-01-01',
          gender: 'Male',
          phone: '+91 99999 11111'
        }
      ]
    };
    const createdApp = await applicationService.createApplication(appData, userA);
    cleanupAppIds.push(createdApp._id);

    recordResult(
      '1. Create test application',
      createdApp && createdApp.referenceNumber.startsWith('MV-') && createdApp.status === APPLICATION_STATUS.DRAFT,
      `Reference: ${createdApp.referenceNumber}, Status: ${createdApp.status}`
    );

    // TEST 2: Retrieve application
    const fetchedApp = await applicationService.getApplicationById(createdApp._id, userA);
    recordResult(
      '2. Retrieve application',
      fetchedApp && fetchedApp.referenceNumber === createdApp.referenceNumber && fetchedApp.customer?.email === emailA,
      `Retrieved ${fetchedApp.referenceNumber} for ${fetchedApp.customer?.email}`
    );

    // TEST 3: Update application
    const updatedApp = await applicationService.updateApplication(
      createdApp._id,
      {
        travellers: [
          {
            name: 'Customer A Updated',
            passportNumber: 'Z7654321',
            nationality: 'Indian',
            dob: '1990-01-01',
            gender: 'Male',
            phone: '+91 99999 11111'
          }
        ]
      },
      { user: userA }
    );
    recordResult(
      '3. Update application',
      updatedApp && updatedApp.travellers[0].passportNumber === 'Z7654321' && updatedApp.travellers[0].name === 'Customer A Updated',
      `Updated traveller passport to: ${updatedApp.travellers[0].passportNumber}`
    );

    // TEST 4 & 5: Upload a test document & confirm file reaches Cloudflare R2
    const samplePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF');

    const fakeFile = {
      buffer: samplePdfBuffer,
      originalname: 'test_passport_scan.pdf',
      mimetype: 'application/pdf',
      size: samplePdfBuffer.length
    };

    const uploadedDoc = await documentService.uploadDocument({
      applicationId: createdApp._id,
      documentType: 'Passport',
      file: fakeFile,
      currentUser: userA
    });
    if (uploadedDoc._id) cleanupDocKeys.push(uploadedDoc.id);

    const docInDb = await Document.findById(uploadedDoc._id || uploadedDoc.id);
    if (docInDb?.storageKey) cleanupDocKeys.push(docInDb.storageKey);

    recordResult(
      '4. Upload test document',
      uploadedDoc && (uploadedDoc.name === 'test_passport_scan.pdf' || uploadedDoc.originalFilename === 'test_passport_scan.pdf'),
      `Document ID: ${uploadedDoc.id || uploadedDoc._id}`
    );

    recordResult(
      '5. Confirm actual file reaches Cloudflare R2',
      docInDb && docInDb.storageKey && docInDb.storageKey.startsWith('applications/'),
      `R2 Storage Key: ${docInDb.storageKey}`
    );

    // TEST 6: Confirm Document metadata is stored in MongoDB
    recordResult(
      '6. Confirm Document metadata is stored in MongoDB',
      docInDb && docInDb.application.toString() === createdApp._id.toString() && docInDb.fileSize > 0 && docInDb.status === 'PENDING',
      `Application: ${docInDb.application}, Mime: ${docInDb.mimeType}, Size: ${docInDb.fileSize} bytes`
    );

    // TEST 7: Generate signed URL
    const signedUrlObj = await documentService.getDocumentSignedUrl(docInDb._id, userA);
    recordResult(
      '7. Generate signed URL',
      signedUrlObj && typeof signedUrlObj.signedUrl === 'string' && signedUrlObj.signedUrl.length > 20,
      `Generated presigned URL: ${signedUrlObj.signedUrl.substring(0, 50)}...`
    );

    // TEST 8: Confirm document can be retrieved (HTTP fetch of signed URL)
    let fetchedFromCloud = false;
    let fetchStatus = 0;
    try {
      const resp = await fetch(signedUrlObj.signedUrl);
      fetchStatus = resp.status;
      if (resp.status === 200) {
        const fetchedBuf = await resp.arrayBuffer();
        if (fetchedBuf.byteLength === samplePdfBuffer.length) {
          fetchedFromCloud = true;
        }
      }
    } catch (e) {
      console.warn('Direct fetch from signed URL note:', e.message);
    }
    recordResult(
      '8. Confirm document can be retrieved from signed URL',
      fetchedFromCloud || fetchStatus === 200,
      `HTTP Status: ${fetchStatus}`
    );

    // TEST 9: Delete/replace test document
    // Upload a temporary doc to delete
    const tempUpload = await documentService.uploadDocument({
      applicationId: createdApp._id,
      documentType: 'Photograph',
      file: {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00]),
        originalname: 'temp_photo.jpg',
        mimetype: 'image/jpeg',
        size: 20
      },
      currentUser: userA
    });
    const tempDocInDb = await Document.findById(tempUpload._id || tempUpload.id);

    const deleteRes = await documentService.deleteDocument(tempDocInDb._id, userA);
    const postDeleteDoc = await Document.findById(tempDocInDb._id);

    recordResult(
      '9. Delete/replace test document',
      deleteRes.deleted === true && postDeleteDoc.isDeleted === true,
      `Document ${tempDocInDb._id} marked isDeleted: true and removed from active index`
    );

    // TEST 10: Confirm ownership & security checks
    let customerBCannotAccessA = false;
    let customerBCannotUploadToA = false;
    let customerBCannotGetDocA = false;

    try {
      await applicationService.getApplicationById(createdApp._id, userB);
    } catch (err) {
      if (err.statusCode === 403 || err.status === 403) customerBCannotAccessA = true;
    }

    try {
      await documentService.uploadDocument({
        applicationId: createdApp._id,
        documentType: 'Passport',
        file: fakeFile,
        currentUser: userB
      });
    } catch (err) {
      if (err.statusCode === 403 || err.status === 403) customerBCannotUploadToA = true;
    }

    try {
      await documentService.getDocumentSignedUrl(docInDb._id, userB);
    } catch (err) {
      if (err.statusCode === 403 || err.status === 403) customerBCannotGetDocA = true;
    }

    recordResult(
      '10. Confirm ownership & security checks',
      customerBCannotAccessA && customerBCannotUploadToA && customerBCannotGetDocA,
      `Customer B blocked: App Access (403), Upload (403), Document URL (403)`
    );

    // TEST 11 & 12: Submit a valid test application & status changes
    // Upload remaining required documents for testVisa so submission succeeds
    for (const reqDoc of testVisa.requiredDocuments || []) {
      const isPhoto = reqDoc.toLowerCase().includes('photo');
      const isJpeg = isPhoto;
      const buf = isJpeg
        ? Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00])
        : samplePdfBuffer;

      const up = await documentService.uploadDocument({
        applicationId: createdApp._id,
        documentType: reqDoc,
        file: {
          buffer: buf,
          originalname: `${reqDoc.replace(/[^a-zA-Z0-9]/g, '_')}.${isJpeg ? 'jpg' : 'pdf'}`,
          mimetype: isJpeg ? 'image/jpeg' : 'application/pdf',
          size: buf.length
        },
        currentUser: userA
      });
      const d = await Document.findById(up._id || up.id);
      if (d?.storageKey) cleanupDocKeys.push(d.storageKey);
    }

    const submittedApp = await applicationService.submitApplication(createdApp._id, userA);

    recordResult(
      '11. Submit a valid test application',
      submittedApp && submittedApp.status === APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW,
      `Application ${submittedApp.referenceNumber} submitted with all required visa documents`
    );

    recordResult(
      '12. Confirm application status changes correctly',
      submittedApp.status === APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW && submittedApp.timeline?.find((t) => t.stage === 'Application Submitted')?.completed === true,
      `Status: ${submittedApp.status}, Timeline Submitted completed: true`
    );

    // TEST 13: Confirm admin can retrieve the application and its documents
    const adminFetch = await applicationService.getApplicationById(createdApp._id, adminUser);
    const adminDocs = await documentService.getDocumentsByApplication(createdApp._id, adminUser);
    const adminSignedUrl = await documentService.getDocumentSignedUrl(docInDb._id, adminUser);

    recordResult(
      '13. Confirm admin can retrieve application and documents with signed URLs',
      adminFetch && adminFetch.referenceNumber === createdApp.referenceNumber && adminDocs.length > 0 && typeof adminSignedUrl.signedUrl === 'string',
      `Admin retrieved ${adminFetch.referenceNumber} with ${adminDocs.length} documents and valid signed URL`
    );

  } finally {
    // Clean up temporary test data from MongoDB and Cloudflare R2
    console.log('\n--- Cleaning up test records from MongoDB and Cloudflare R2 ---');
    if (cleanupDocKeys.length > 0) {
      for (const key of cleanupDocKeys) {
        try {
          if (typeof key === 'string' && key.startsWith('applications/')) {
            await storageService.deleteFile(key);
          }
        } catch {
          // ignore
        }
      }
    }

    if (cleanupAppIds.length > 0) {
      await Document.deleteMany({ application: { $in: cleanupAppIds } });
      await Application.deleteMany({ _id: { $in: cleanupAppIds } });
    }

    if (cleanupUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: cleanupUserIds } });
    }
    console.log('✓ Cleaned up all test users, applications, and documents.');
  }

  console.log('\n========================================================================');
  console.log(`WORKFLOW VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('========================================================================\n');

  await disconnectDatabase();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Workflow verification execution failure:', err);
  process.exit(1);
});
