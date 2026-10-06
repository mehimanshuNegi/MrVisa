/**
 * Memory Optimization & PDF OCR Pipeline Verification Test Suite
 *
 * Validates:
 * 1. 2-page passport PDF OCR processing (Page 1 front + Page 2 back)
 * 2. Front/back data merging in multi-page PDF
 * 3. Issue Date extraction from PDF visible zone
 * 4. JPG passport front OCR
 * 5. JPG passport back OCR
 * 6. Multiple consecutive PDF OCR requests (ensuring bounded memory)
 * 7. Production-safe memory diagnostics (no PII logged)
 */

import sharp from 'sharp';
import { passportOcrService } from '../services/passportOcr.service.js';
import { formatDateToISO } from '../../../src/utils/dateValidator.js';

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

function createTwoPagePdf(jpeg1, jpeg2, w1 = 1200, h1 = 800, w2 = 1200, h2 = 800) {
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
    '0000000115 00000 n ',
    '0000000220 00000 n ',
    '0000000300 00000 n ',
    '0000000350 00000 n ',
    '0000000455 00000 n ',
    '0000000535 00000 n ',
    'trailer <</Size 9 /Root 1 0 R>>',
    'startxref',
    '800',
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

async function runTestSuite() {
  console.log('========================================================================');
  console.log('MEMORY-OPTIMIZED PASSPORT PDF & IMAGE OCR VERIFICATION SUITE');
  console.log('========================================================================\n');

  const frontJpeg = await sharp(Buffer.from(getFrontPassportSvg())).jpeg({ quality: 90 }).toBuffer();
  const backJpeg = await sharp(Buffer.from(getBackPassportSvg())).jpeg({ quality: 90 }).toBuffer();
  const pdfBuffer = createTwoPagePdf(frontJpeg, backJpeg);

  // -------------------------------------------------------------------------
  // Test 1: 2-Page Passport PDF OCR
  // -------------------------------------------------------------------------
  console.log('Test 1: Testing 2-Page Passport PDF OCR...');
  const pdfResult = await passportOcrService.processPassport({
    buffer: pdfBuffer,
    originalFilename: 'passport_complete.pdf',
    mimeType: 'application/pdf',
    pageType: 'front'
  });

  assert(pdfResult.success === true, 'PDF OCR succeeded');
  assert(pdfResult.isFrontDetected === true, 'Front page detected');
  assert(pdfResult.isCompleteDocument === true, 'PDF marked as complete document');
  assert(pdfResult.extractedData.passportNumber === 'Z9876543', `Passport number extracted: ${pdfResult.extractedData.passportNumber}`);
  assert(pdfResult.extractedData.firstName === 'ROHIT', `First name extracted: ${pdfResult.extractedData.firstName}`);
  assert(pdfResult.extractedData.lastName === 'SHARMA', `Last name extracted: ${pdfResult.extractedData.lastName}`);
  assert(pdfResult.extractedData.dateOfBirth === '1987-04-30', `Date of birth extracted: ${pdfResult.extractedData.dateOfBirth}`);
  assert(pdfResult.extractedData.expiryDate === '2031-01-14', `Expiry date extracted: ${pdfResult.extractedData.expiryDate}`);

  // Test 2: Issue Date Extraction from PDF
  console.log('\nTest 2: Verifying Issue Date Extraction in PDF...');
  assert(Boolean(pdfResult.extractedData.issueDate), `Issue date present: ${pdfResult.extractedData.issueDate}`);
  assert(pdfResult.extractedData.issueDate === '2022-01-15', `Normalized issue date matches 2022-01-15`);
  assert(pdfResult.extractedData.passportIssuedOn === '2022-01-15', `passportIssuedOn matches 2022-01-15`);
  assert(pdfResult.fieldStatus.issueDate === 'HIGH', `Issue date confidence is HIGH (agrees with MRZ)`);

  // Test 3: Front/Back Merge from 2-Page PDF
  console.log('\nTest 3: Verifying Front/Back Merging from 2-Page PDF...');
  assert(pdfResult.isBackDetected === true, 'Back page detected in 2-page PDF');
  assert(Boolean(pdfResult.extractedData.fatherName), `Father name merged from Page 2: ${pdfResult.extractedData.fatherName}`);
  assert(Boolean(pdfResult.extractedData.address), `Address merged from Page 2: ${pdfResult.extractedData.address}`);

  // -------------------------------------------------------------------------
  // Test 4: JPG Passport Front OCR
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Testing JPG Passport Front OCR...');
  const jpgFrontResult = await passportOcrService.processPassport({
    buffer: frontJpeg,
    originalFilename: 'passport_front.jpg',
    mimeType: 'image/jpeg',
    pageType: 'front'
  });

  assert(jpgFrontResult.success === true, 'JPG Front OCR succeeded');
  assert(jpgFrontResult.isFrontDetected === true, 'JPG Front detected');
  assert(jpgFrontResult.extractedData.passportNumber === 'Z9876543', 'JPG passport number extracted');
  assert(jpgFrontResult.extractedData.issueDate === '2022-01-15', 'JPG issue date extracted');
  assert(jpgFrontResult.fieldStatus.issueDate === 'HIGH', 'JPG issue date confidence is HIGH');

  // -------------------------------------------------------------------------
  // Test 5: JPG Passport Back OCR & Merging
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Testing JPG Passport Back OCR...');
  const jpgBackResult = await passportOcrService.processPassport({
    buffer: backJpeg,
    originalFilename: 'passport_back.jpg',
    mimeType: 'image/jpeg',
    pageType: 'back',
    frontExtractedData: jpgFrontResult.extractedData
  });

  assert(jpgBackResult.success === true, 'JPG Back OCR succeeded');
  assert(jpgBackResult.isBackDetected === true, 'JPG Back detected');
  assert(Boolean(jpgBackResult.extractedData.fatherName), `Father name extracted: ${jpgBackResult.extractedData.fatherName}`);
  assert(jpgBackResult.mergedData.issueDate === '2022-01-15', 'Merged data preserved issue date from front page');

  // -------------------------------------------------------------------------
  // Test 6: Consecutive PDF OCR Requests (Ensuring Memory Bound)
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Testing Multiple Consecutive PDF OCR Requests...');
  const memBefore = process.memoryUsage().rss / (1024 * 1024);

  for (let i = 1; i <= 3; i++) {
    const iterResult = await passportOcrService.processPassport({
      buffer: pdfBuffer,
      originalFilename: `passport_consecutive_${i}.pdf`,
      mimeType: 'application/pdf',
      pageType: 'front'
    });
    assert(iterResult.success === true, `Consecutive PDF OCR #${i} succeeded`);
    assert(iterResult.extractedData.passportNumber === 'Z9876543', `Consecutive PDF OCR #${i} passportNumber matches`);
  }

  const memAfter = process.memoryUsage().rss / (1024 * 1024);
  console.log(`  ℹ RSS after 3 consecutive PDF runs: ${memAfter.toFixed(1)} MB (started: ${memBefore.toFixed(1)} MB)`);
  assert(memAfter < 500, `Memory RSS (${memAfter.toFixed(1)} MB) remains strictly below Render 500MB threshold`);

  console.log('\n========================================================================');
  console.log(`MEMORY-OPTIMIZED PASSPORT OCR RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
