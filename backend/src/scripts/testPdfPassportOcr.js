/**
 * Verification Test Suite: Lightweight PDF Passport OCR & Multi-Format Support
 *
 * Scenarios:
 * 1. JPG passport → OCR works
 * 2. PNG passport → OCR works
 * 3. WEBP passport → OCR works
 * 4. PDF containing a passport image (1-page) → OCR works & extracts fields
 * 5. Multi-page PDF (Page 1 non-passport cover, Page 2 passport) → checks next page & extracts fields
 * 6. PDF with no readable passport → graceful error ("We couldn't read this PDF. Please upload a clearer passport scan.")
 * 7. Invalid/corrupted PDF → graceful error ("We couldn't read this PDF. Please upload a clearer passport scan.")
 * 8. PDF response structure matching image OCR response structure
 * 9. Storage preservation: original PDF preserved with application/pdf mimeType
 */

import sharp from 'sharp';
import { passportOcrService } from '../services/passportOcr.service.js';
import {
  determinePassportUploadFlow,
  getNextPassportStep,
  shouldShowBackUploadStep,
  isPdfPassport
} from '../../../src/utils/passportFlow.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Helper: Generates a passport front photo page SVG
function getFrontPassportSvg() {
  return `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F8FAFC"/>
      <rect x="40" y="40" width="1120" height="720" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>
      <text x="80" y="100" font-family="Arial" font-size="28" font-weight="bold" fill="#0B2A63">PASSPORT / PASSEPORT</text>
      <text x="80" y="150" font-family="Arial" font-size="16" fill="#64748B">Type / Code / Passport No.</text>
      <text x="80" y="180" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">P  IND  Z9876543</text>
      <text x="80" y="230" font-family="Arial" font-size="16" fill="#64748B">Given Names / Prénoms</text>
      <text x="80" y="260" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">ROHIT</text>
      <text x="80" y="310" font-family="Arial" font-size="16" fill="#64748B">Surname / Nom</text>
      <text x="80" y="340" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">SHARMA</text>
      <text x="80" y="390" font-family="Arial" font-size="16" fill="#64748B">Date of Issue / Date de délivrance</text>
      <text x="80" y="420" font-family="Arial" font-size="20" font-weight="bold" fill="#0B2A63">15/01/2022</text>
      <rect x="60" y="600" width="1080" height="130" fill="#F1F5F9" rx="8"/>
      <text x="80" y="650" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">P&lt;INDSHARMA&lt;&lt;ROHIT&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
      <text x="80" y="700" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">Z9876543&lt;0IND8704305M3101142&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
    </svg>
  `;
}

// Helper: Generates a blank / non-passport image SVG
function getNonPassportSvg() {
  return `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#E0F2FE"/>
      <circle cx="400" cy="300" r="150" fill="#38BDF8"/>
      <text x="400" y="310" font-family="Arial" font-size="32" text-anchor="middle" fill="#FFFFFF">TRAVEL BROCHURE COVER</text>
    </svg>
  `;
}

// Helper: Generates passport back page SVG
function getBackPassportSvg() {
  return `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F8FAFC"/>
      <rect x="40" y="40" width="1120" height="720" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>
      <text x="80" y="100" font-family="Arial" font-size="24" font-weight="bold" fill="#0B2A63">REPUBLIC OF INDIA</text>
      <text x="80" y="160" font-family="Arial" font-size="18" fill="#64748B">Name of Father / Legal Guardian</text>
      <text x="80" y="195" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">GURUNATH SHARMA</text>
      <text x="80" y="245" font-family="Arial" font-size="18" fill="#64748B">Name of Mother</text>
      <text x="80" y="280" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">PURNIMA SHARMA</text>
      <text x="80" y="330" font-family="Arial" font-size="18" fill="#64748B">Name of Spouse</text>
      <text x="80" y="365" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">RITIKA SAJDEH</text>
      <text x="80" y="415" font-family="Arial" font-size="18" fill="#64748B">Address</text>
      <text x="80" y="450" font-family="Arial" font-size="20" fill="#0B2A63">WORLI SEA FACE, MUMBAI, MAHARASHTRA 400030</text>
      <text x="80" y="520" font-family="Arial" font-size="18" fill="#64748B">File No. / Old Passport No.</text>
      <text x="80" y="555" font-family="Arial" font-size="20" font-weight="bold" fill="#0B2A63">BOM1234567890 / K8765432</text>
    </svg>
  `;
}

// Helper: Builds a valid single-page PDF containing a JPEG image
function createSinglePagePdfFromJpeg(jpegBuf, width = 1200, height = 800) {
  const head = [
    '%PDF-1.4',
    '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj',
    '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj',
    `3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources <</XObject <</Im1 4 0 R>>>> /Contents 5 0 R>> endobj`,
    `4 0 obj <</Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuf.length}>> stream\n`
  ].join('\n');

  const tail = [
    '\nendstream\nendobj',
    `5 0 obj <</Length 35>> stream\nq ${width} 0 0 ${height} 0 0 cm /Im1 Do Q\nendstream\nendobj`,
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000056 00000 n ',
    '0000000111 00000 n ',
    '0000000216 00000 n ',
    '0000000300 00000 n ',
    'trailer <</Size 6 /Root 1 0 R>>',
    'startxref',
    '600',
    '%%EOF'
  ].join('\n');

  return Buffer.concat([Buffer.from(head), jpegBuf, Buffer.from(tail)]);
}

// Helper: Builds a valid 2-page PDF where page 1 is cover and page 2 is passport
function createTwoPagePdf(jpeg1, jpeg2, w1 = 800, h1 = 600, w2 = 1200, h2 = 800) {
  const part1 = [
    '%PDF-1.4',
    '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj',
    '2 0 obj <</Type /Pages /Kids [3 0 R 6 0 R] /Count 2>> endobj',
    `3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 ${w1} ${h1}] /Resources <</XObject <</Im1 4 0 R>>>> /Contents 5 0 R>> endobj`,
    `4 0 obj <</Type /XObject /Subtype /Image /Width ${w1} /Height ${h1} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg1.length}>> stream\n`
  ].join('\n');

  const part2 = [
    '\nendstream\nendobj',
    `5 0 obj <</Length 35>> stream\nq ${w1} 0 0 ${h1} 0 0 cm /Im1 Do Q\nendstream\nendobj`,
    `6 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 ${w2} ${h2}] /Resources <</XObject <</Im2 7 0 R>>>> /Contents 8 0 R>> endobj`,
    `7 0 obj <</Type /XObject /Subtype /Image /Width ${w2} /Height ${h2} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg2.length}>> stream\n`
  ].join('\n');

  const part3 = [
    '\nendstream\nendobj',
    `8 0 obj <</Length 35>> stream\nq ${w2} 0 0 ${h2} 0 0 cm /Im2 Do Q\nendstream\nendobj`,
    'xref',
    '0 9',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000056 00000 n ',
    '0000000111 00000 n ',
    '0000000216 00000 n ',
    '0000000300 00000 n ',
    '0000000380 00000 n ',
    '0000000450 00000 n ',
    '0000000520 00000 n ',
    'trailer <</Size 9 /Root 1 0 R>>',
    'startxref',
    '700',
    '%%EOF'
  ].join('\n');

  return Buffer.concat([
    Buffer.from(part1),
    jpeg1,
    Buffer.from(part2),
    jpeg2,
    Buffer.from(part3)
  ]);
}

async function runPdfOcrVerification() {
  console.log('\n================================================================');
  console.log('NIMUFLY PASSPORT OCR: MULTI-FORMAT & PDF VERIFICATION SUITE');
  console.log('================================================================\n');

  const frontSvg = getFrontPassportSvg();
  const nonPassportSvg = getNonPassportSvg();

  const frontPngBuffer = await sharp(Buffer.from(frontSvg)).png().toBuffer();
  const frontJpgBuffer = await sharp(Buffer.from(frontSvg)).jpeg({ quality: 95 }).toBuffer();
  const frontWebpBuffer = await sharp(Buffer.from(frontSvg)).webp({ quality: 95 }).toBuffer();
  const nonPassportJpg = await sharp(Buffer.from(nonPassportSvg)).jpeg({ quality: 85 }).toBuffer();

  // ------------------------------------------------------------
  // Scenario 1: JPG passport → OCR works
  // ------------------------------------------------------------
  console.log('Scenario 1: Testing JPG Passport OCR...');
  const jpgResult = await passportOcrService.processPassport({
    buffer: frontJpgBuffer,
    originalFilename: 'passport.jpg',
    mimeType: 'image/jpeg',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(jpgResult.success === true, 'JPG passport OCR succeeded');
  assert(jpgResult.isFrontDetected === true, 'JPG front passport detected');
  assert(jpgResult.extractedData.passportNumber === 'Z9876543', `JPG extracted passport number: ${jpgResult.extractedData.passportNumber}`);
  assert(jpgResult.extractedData.fullName === 'ROHIT SHARMA', `JPG extracted full name: ${jpgResult.extractedData.fullName}`);

  // ------------------------------------------------------------
  // Scenario 2: PNG passport → OCR works
  // ------------------------------------------------------------
  console.log('\nScenario 2: Testing PNG Passport OCR...');
  const pngResult = await passportOcrService.processPassport({
    buffer: frontPngBuffer,
    originalFilename: 'passport.png',
    mimeType: 'image/png',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(pngResult.success === true, 'PNG passport OCR succeeded');
  assert(pngResult.isFrontDetected === true, 'PNG front passport detected');
  assert(pngResult.extractedData.passportNumber === 'Z9876543', `PNG extracted passport number: ${pngResult.extractedData.passportNumber}`);

  // ------------------------------------------------------------
  // Scenario 3: WEBP passport → OCR works
  // ------------------------------------------------------------
  console.log('\nScenario 3: Testing WEBP Passport OCR...');
  const webpResult = await passportOcrService.processPassport({
    buffer: frontWebpBuffer,
    originalFilename: 'passport.webp',
    mimeType: 'image/webp',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(webpResult.success === true, 'WEBP passport OCR succeeded');
  assert(webpResult.isFrontDetected === true, 'WEBP front passport detected');
  assert(webpResult.extractedData.passportNumber === 'Z9876543', `WEBP extracted passport number: ${webpResult.extractedData.passportNumber}`);

  // ------------------------------------------------------------
  // Scenario 4: PDF containing a passport image → OCR works & extracts fields
  // ------------------------------------------------------------
  console.log('\nScenario 4: Testing Single-Page PDF Passport OCR...');
  const singlePdfBuffer = createSinglePagePdfFromJpeg(frontJpgBuffer, 1200, 800);
  const pdfResult = await passportOcrService.processPassport({
    buffer: singlePdfBuffer,
    originalFilename: 'passport_scan.pdf',
    mimeType: 'application/pdf',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(pdfResult.success === true, 'PDF passport OCR succeeded');
  assert(pdfResult.pageType === 'front', 'pageType is front');
  assert(pdfResult.isFrontDetected === true, 'PDF front passport detected');
  assert(pdfResult.extractedData.passportNumber === 'Z9876543', `PDF extracted passport number: ${pdfResult.extractedData.passportNumber}`);
  assert(pdfResult.extractedData.fullName === 'ROHIT SHARMA', `PDF extracted full name: ${pdfResult.extractedData.fullName}`);
  assert(pdfResult.extractedData.dateOfBirth === '1987-04-30', `PDF extracted DOB: ${pdfResult.extractedData.dateOfBirth}`);
  assert(pdfResult.extractedData.expiryDate === '2031-01-14', `PDF extracted expiry: ${pdfResult.extractedData.expiryDate}`);
  assert(pdfResult.extractedData.nationality === 'Indian', `PDF extracted nationality: ${pdfResult.extractedData.nationality}`);

  // ------------------------------------------------------------
  // Scenario 5: Multi-page PDF (Page 1 cover, Page 2 passport) → checks next page
  // ------------------------------------------------------------
  console.log('\nScenario 5: Testing Multi-Page PDF (Page 1 Cover, Page 2 Passport)...');
  const twoPagePdfBuffer = createTwoPagePdf(nonPassportJpg, frontJpgBuffer, 800, 600, 1200, 800);
  const multiPageResult = await passportOcrService.processPassport({
    buffer: twoPagePdfBuffer,
    originalFilename: 'multipage_passport.pdf',
    mimeType: 'application/pdf',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(multiPageResult.success === true, 'Multi-page PDF OCR succeeded on page 2');
  assert(multiPageResult.isFrontDetected === true, 'Passport detected after evaluating next page');
  assert(multiPageResult.extractedData.passportNumber === 'Z9876543', `Multi-page PDF extracted passport number: ${multiPageResult.extractedData.passportNumber}`);

  // ------------------------------------------------------------
  // Scenario 6: PDF with no readable passport → graceful error
  // ------------------------------------------------------------
  console.log('\nScenario 6: Testing PDF with No Readable Passport...');
  const noPassportPdfBuffer = createSinglePagePdfFromJpeg(nonPassportJpg, 800, 600);
  const unreadableResult = await passportOcrService.processPassport({
    buffer: noPassportPdfBuffer,
    originalFilename: 'brochure.pdf',
    mimeType: 'application/pdf',
    pageType: 'front'
  });
  assert(unreadableResult.success === false, 'Non-passport PDF marked success: false');
  assert(unreadableResult.canContinueManually === true, 'Manual fallback offered');
  assert(
    unreadableResult.message.includes("We couldn't read this PDF"),
    `User-friendly message returned: "${unreadableResult.message}"`
  );

  // ------------------------------------------------------------
  // Scenario 7: Invalid / Corrupted PDF → graceful error
  // ------------------------------------------------------------
  console.log('\nScenario 7: Testing Corrupted / Invalid PDF...');
  const corruptPdfBuffer = Buffer.from('%PDF-1.4\nCorrupted content without valid PDF trailer or objects\n%%EOF');
  const corruptResult = await passportOcrService.processPassport({
    buffer: corruptPdfBuffer,
    originalFilename: 'corrupt.pdf',
    mimeType: 'application/pdf',
    pageType: 'front'
  });
  assert(corruptResult.success === false, 'Corrupted PDF rejected gracefully without crashing');
  assert(corruptResult.canContinueManually === true, 'Manual fallback enabled on corrupted PDF');
  assert(
    corruptResult.message.includes("We couldn't read this PDF"),
    `Clean user error returned on corrupt file: "${corruptResult.message}"`
  );

  // ------------------------------------------------------------
  // Scenario 8: Storage preservation of original PDF
  // ------------------------------------------------------------
  console.log('\nScenario 8: Testing Original PDF Storage Preservation...');
  assert(Boolean(pdfResult.uploadedDocument?.storageKey), 'Original PDF document was staged to storage');
  assert(
    pdfResult.uploadedDocument?.mimeType === 'application/pdf',
    `Storage preserved original PDF mimeType (${pdfResult.uploadedDocument?.mimeType})`
  );
  assert(
    pdfResult.uploadedDocument?.originalFilename.endsWith('.pdf'),
    `Storage preserved original PDF extension (${pdfResult.uploadedDocument?.originalFilename})`
  );

  // ------------------------------------------------------------
  // Scenario 9: Response structure parity between PDF and Image OCR
  // ------------------------------------------------------------
  console.log('\nScenario 9: Testing Response Structure Parity (PDF vs Image)...');
  const requiredKeys = [
    'success',
    'pageType',
    'isFrontDetected',
    'status',
    'stages',
    'extractedData',
    'fields',
    'fieldStatus',
    'canContinueManually',
    'message'
  ];
  const requiredDataKeys = [
    'passportNumber',
    'fullName',
    'dateOfBirth',
    'nationality',
    'gender',
    'issueDate',
    'expiryDate'
  ];

  for (const k of requiredKeys) {
    assert(k in pdfResult, `Key "${k}" present in PDF OCR response`);
  }
  for (const k of requiredDataKeys) {
    assert(k in pdfResult.extractedData, `ExtractedData key "${k}" present in PDF OCR response`);
  }

  // ------------------------------------------------------------
  // Scenario 10: Format-Dependent Front/Back Behavior Verification
  // ------------------------------------------------------------
  console.log('\nScenario 10: Testing Format-Dependent Front/Back Navigation Behavior...');

  // 10.A: PDF upload (general) -> no back-side prompt
  const pdfFile = { type: 'application/pdf', name: 'passport_scan.pdf' };
  const pdfFlow = determinePassportUploadFlow(pdfFile);
  assert(pdfFlow === 'pdf', 'PDF upload resolves flow="pdf"');
  assert(isPdfPassport(pdfFile) === true, 'isPdfPassport returns true for PDF file');
  const pdfNextStep = getNextPassportStep({ flow: pdfFlow, ocrSuccess: true });
  assert(pdfNextStep === 'passport_review', 'PDF upload advances directly to passport_review (no back-side prompt)');
  assert(shouldShowBackUploadStep(pdfFile, 'passport_back_upload') === false, 'PDF cannot trigger or show back-side upload screen');

  // 10.B: Single-page PDF -> no back-side prompt
  const singlePdfFile = { type: 'application/pdf', name: 'single_page.pdf' };
  const singleFlow = determinePassportUploadFlow(singlePdfFile);
  assert(singleFlow === 'pdf', 'Single-page PDF resolves flow="pdf"');
  assert(getNextPassportStep({ flow: singleFlow, ocrSuccess: true }) === 'passport_review', 'Single-page PDF proceeds directly to review without back-side prompt');

  // 10.C: Multi-page PDF -> extracts both front and back, no back-side prompt
  const backJpgBuffer = await sharp(Buffer.from(getBackPassportSvg())).jpeg({ quality: 95 }).toBuffer();
  const twoPagePassportPdf = createTwoPagePdf(frontJpgBuffer, backJpgBuffer, 1200, 800, 1200, 800);
  const multiPdfResult = await passportOcrService.processPassport({
    buffer: twoPagePassportPdf,
    originalFilename: 'complete_passport.pdf',
    mimeType: 'application/pdf',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(multiPdfResult.success === true, 'Multi-page complete passport PDF succeeded');
  assert(multiPdfResult.isCompleteDocument === true, 'Multi-page PDF marked as complete document');
  assert(multiPdfResult.extractedData.passportNumber === 'Z9876543', 'Front details (passportNumber) extracted from PDF Page 1');
  assert(Boolean(multiPdfResult.extractedData.fatherName || multiPdfResult.extractedData.address), 'Back details (parents/address) extracted from PDF Page 2');
  const multiPdfFile = { type: 'application/pdf', name: 'complete_passport.pdf' };
  assert(getNextPassportStep({ flow: determinePassportUploadFlow(multiPdfFile), ocrSuccess: true }) === 'passport_review', 'Multi-page PDF proceeds directly to review without back-side prompt');

  // 10.D: JPG front upload -> back-side prompt remains
  const jpgFile = { type: 'image/jpeg', name: 'front_passport.jpg' };
  const jpgFlow = determinePassportUploadFlow(jpgFile);
  assert(jpgFlow === 'image', 'JPG file resolves flow="image"');
  assert(isPdfPassport(jpgFile) === false, 'isPdfPassport returns false for JPG file');
  const jpgNextStep = getNextPassportStep({ flow: jpgFlow, ocrSuccess: true });
  assert(jpgNextStep === 'passport_back_upload', 'JPG front upload transitions to passport_back_upload (flip prompt remains)');
  assert(shouldShowBackUploadStep(jpgFile, 'passport_back_upload') === true, 'JPG front upload displays back-side upload UI');

  // 10.E: PNG front upload -> back-side prompt remains
  const pngFile = { type: 'image/png', name: 'front_passport.png' };
  const pngFlow = determinePassportUploadFlow(pngFile);
  assert(pngFlow === 'image', 'PNG file resolves flow="image"');
  assert(getNextPassportStep({ flow: pngFlow, ocrSuccess: true }) === 'passport_back_upload', 'PNG front upload transitions to passport_back_upload (flip prompt remains)');
  assert(shouldShowBackUploadStep(pngFile, 'passport_back_upload') === true, 'PNG front upload displays back-side upload UI');

  // 10.F: WEBP front upload -> back-side prompt remains
  const webpFile = { type: 'image/webp', name: 'front_passport.webp' };
  const webpFlow = determinePassportUploadFlow(webpFile);
  assert(webpFlow === 'image', 'WEBP file resolves flow="image"');
  assert(getNextPassportStep({ flow: webpFlow, ocrSuccess: true }) === 'passport_back_upload', 'WEBP front upload transitions to passport_back_upload (flip prompt remains)');
  assert(shouldShowBackUploadStep(webpFile, 'passport_back_upload') === true, 'WEBP front upload displays back-side upload UI');

  // 10.G: Failed PDF OCR -> manual fallback, but still no flip prompt
  const corruptFile = { type: 'application/pdf', name: 'unreadable_scan.pdf' };
  const corruptFlow = determinePassportUploadFlow(corruptFile);
  assert(corruptFlow === 'pdf', 'Corrupt PDF file resolves flow="pdf"');
  const failedPdfNextStep = getNextPassportStep({ flow: corruptFlow, ocrSuccess: false });
  assert(failedPdfNextStep === 'passport_review', 'Failed PDF OCR routes fallback directly to passport_review (still no flip prompt)');
  assert(shouldShowBackUploadStep(corruptFile, 'passport_back_upload') === false, 'Failed PDF OCR cannot show back-side upload screen');

  console.log('\n================================================================');
  console.log(`PDF & MULTI-FORMAT PASSPORT OCR SUITE: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPdfOcrVerification().catch((err) => {
  console.error('Fatal error in PDF OCR test suite:', err);
  process.exit(1);
});
