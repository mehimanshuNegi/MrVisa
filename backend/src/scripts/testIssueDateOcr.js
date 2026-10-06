/**
 * Verification Test Suite: Passport Issue Date Extraction & End-to-End Flow
 *
 * Verifies:
 * 1. Issue date and expiry date on the same line
 * 2. Issue/expiry labels split across OCR lines
 * 3. Issue date on the line immediately below the label
 * 4. Garbled label OCR handling (e.g. "Date of Issu...", "Date of lssue")
 * 5. MRZ + VIZ dates agreeing -> HIGH / Verified confidence
 * 6. VIZ issue date available but MRZ issue date unavailable -> MEDIUM / Review confidence
 * 7. Uncertain / invalid issue date -> LOW / Enter manually confidence
 * 8. Clean date normalization to YYYY-MM-DD
 * 9. JPG front passport OCR end-to-end
 * 10. PDF passport OCR end-to-end
 * 11. Multi-page PDF merge preservation of issueDate
 * 12. Two-stage back-page merge preservation of issueDate
 * 13. Frontend review form state mapping and persistence
 */

import sharp from 'sharp';
import { passportOcrService } from '../services/passportOcr.service.js';
import {
  extractAllDatesFromText,
  extractPassportDatesFromViz,
  extractIssueDateFromText,
  extractVizFieldsFromText,
  parseDateString
} from '../utils/mrzParser.js';
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

// Helper: Generates a passport front photo page SVG with issue date
function getFrontPassportSvgWithDates({ issueDate = '14/12/2016', expiryDate = '13/12/2026' } = {}) {
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
      <text x="80" y="420" font-family="Arial" font-size="20" font-weight="bold" fill="#0B2A63">${issueDate}</text>
      <text x="450" y="390" font-family="Arial" font-size="16" fill="#64748B">Date of Expiry / Date d'expiration</text>
      <text x="450" y="420" font-family="Arial" font-size="20" font-weight="bold" fill="#0B2A63">${expiryDate}</text>
      <rect x="60" y="600" width="1080" height="130" fill="#F1F5F9" rx="8"/>
      <text x="80" y="650" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">P&lt;INDSHARMA&lt;&lt;ROHIT&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
      <text x="80" y="700" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">Z9876543&lt;0IND8704305M2612132&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
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

// Helper: Single-page PDF from JPEG buffer
function createSinglePagePdf(jpegBuf, width = 1200, height = 800) {
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

// Helper: Two-page PDF
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
    '0000000111 00000 n ',
    '0000000216 00000 n ',
    '0000000300 00000 n ',
    '0000000380 00000 n ',
    '0000000480 00000 n ',
    '0000000560 00000 n ',
    'trailer <</Size 9 /Root 1 0 R>>',
    'startxref',
    '900',
    '%%EOF'
  ].join('\n');

  return Buffer.concat([Buffer.from(part1), jpeg1, Buffer.from(part2), jpeg2, Buffer.from(part3)]);
}

async function runIssueDateVerification() {
  console.log('========================================================================');
  console.log('🔍 PASSPORT ISSUE DATE OCR & PIPELINE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // Scenario 1: Issue date and expiry date on the SAME LINE
  // -------------------------------------------------------------------------
  console.log('Scenario 1: Testing Issue Date and Expiry Date on the Same Line...');
  const sameLineText = 'Date of Issue: 14/12/2016  Date of Expiry: 13/12/2026';
  const sameLineDates = extractPassportDatesFromViz(sameLineText);
  assert(sameLineDates.issueDate === '2016-12-14', 'Extracted issueDate 2016-12-14 from same line');
  assert(sameLineDates.expiryDate === '2026-12-13', 'Extracted expiryDate 2026-12-13 from same line');

  const sameLineBilingual = 'Date of Issue / Date de délivrance 14-DEC-2016 Date of Expiry / Date d\'expiration 13-DEC-2026';
  const sameLineBilingualDates = extractPassportDatesFromViz(sameLineBilingual);
  assert(sameLineBilingualDates.issueDate === '2016-12-14', 'Extracted alphanumeric month issueDate 2016-12-14 from bilingual line');
  assert(sameLineBilingualDates.expiryDate === '2026-12-13', 'Extracted alphanumeric month expiryDate 2026-12-13 from bilingual line');

  // -------------------------------------------------------------------------
  // Scenario 2: Issue/expiry labels split across OCR lines
  // -------------------------------------------------------------------------
  console.log('\nScenario 2: Testing Issue/Expiry Labels Split Across OCR Lines...');
  const splitLinesText = [
    'PASSPORT',
    'Date of Issue',
    'Date of Expiry',
    '14/12/2016  13/12/2026'
  ].join('\n');
  const splitDates = extractPassportDatesFromViz(splitLinesText);
  assert(splitDates.issueDate === '2016-12-14', 'Extracted issueDate 2016-12-14 when labels are stacked and dates on following line');
  assert(splitDates.expiryDate === '2026-12-13', 'Extracted expiryDate 2026-12-13 when labels are stacked and dates on following line');

  const splitMultiLineText = [
    'Date of Issue',
    'Date of Expiry',
    '14/12/2016',
    '13/12/2026'
  ].join('\n');
  const splitMultiDates = extractPassportDatesFromViz(splitMultiLineText);
  assert(splitMultiDates.issueDate === '2016-12-14', 'Extracted issueDate 2016-12-14 across consecutive value lines');
  assert(splitMultiDates.expiryDate === '2026-12-13', 'Extracted expiryDate 2026-12-13 across consecutive value lines');

  // -------------------------------------------------------------------------
  // Scenario 3: Issue date on the line immediately below the label
  // -------------------------------------------------------------------------
  console.log('\nScenario 3: Testing Issue Date on Line Immediately Below the Label...');
  const lineBelowText = [
    'Date of Issue',
    '14/12/2016',
    'Date of Expiry',
    '13/12/2026'
  ].join('\n');
  const lineBelowDates = extractPassportDatesFromViz(lineBelowText);
  assert(lineBelowDates.issueDate === '2016-12-14', 'Extracted issueDate from line immediately below label');
  assert(lineBelowDates.expiryDate === '2026-12-13', 'Extracted expiryDate from line immediately below label');

  // -------------------------------------------------------------------------
  // Scenario 4: Garbled and truncated label OCR handling
  // -------------------------------------------------------------------------
  console.log('\nScenario 4: Testing Garbled/Truncated Label OCR Handling...');
  const garbledText1 = [
    'Date of Issu...',
    '14/12/2016'
  ].join('\n');
  assert(extractIssueDateFromText(garbledText1) === '2016-12-14', 'Handled truncated "Date of Issu..." label');

  const garbledText2 = [
    'Date of lssue', // lowercase L instead of I
    '14/12/2016'
  ].join('\n');
  assert(extractIssueDateFromText(garbledText2) === '2016-12-14', 'Handled OCR confused "Date of lssue" label');

  const garbledText3 = 'जारी करने की तिथि 14/12/2016';
  assert(extractIssueDateFromText(garbledText3) === '2016-12-14', 'Handled Hindi label "जारी करने की तिथि"');

  // -------------------------------------------------------------------------
  // Scenario 5: MRZ + VIZ dates agreeing -> HIGH / Verified
  // -------------------------------------------------------------------------
  console.log('\nScenario 5: Testing MRZ + VIZ Dates Agreeing (HIGH / Verified)...');
  const mrzValid = {
    expiryDate: '2026-12-13',
    dateOfBirth: '1987-04-30',
    passportNumber: 'Z9876543'
  };
  const vizTextAgreed = 'Date of Issue: 14/12/2016\nDate of Expiry: 13/12/2026';
  const agreedResult = extractPassportDatesFromViz(vizTextAgreed, mrzValid);
  assert(agreedResult.issueDate === '2016-12-14', 'Extracted issueDate 2016-12-14');
  assert(agreedResult.confidence.issueDate === 'HIGH', 'Confidence is HIGH when VIZ and MRZ dates agree');

  // -------------------------------------------------------------------------
  // Scenario 6: VIZ issue date available but MRZ issue date unavailable -> MEDIUM / Review
  // -------------------------------------------------------------------------
  console.log('\nScenario 6: Testing VIZ Issue Date Available but MRZ Unavailable (MEDIUM / Review)...');
  const vizTextOnly = 'Date of Issue: 14/12/2016\nDate of Expiry: 13/12/2026';
  const noMrzResult = extractPassportDatesFromViz(vizTextOnly, null);
  assert(noMrzResult.issueDate === '2016-12-14', 'Extracted issueDate 2016-12-14 without MRZ');
  assert(noMrzResult.confidence.issueDate === 'MEDIUM', 'Confidence is MEDIUM when MRZ is unavailable');

  // -------------------------------------------------------------------------
  // Scenario 7: Uncertain / invalid issue date handling
  // -------------------------------------------------------------------------
  console.log('\nScenario 7: Testing Uncertain/Invalid Issue Date (LOW / Enter manually)...');
  const futureDateText = 'Date of Issue: 14/12/2039\nDate of Expiry: 13/12/2049';
  const futureResult = extractPassportDatesFromViz(futureDateText, null);
  assert(!futureResult.issueDate, 'Future issue date is discarded (cannot fabricate/accept future issue)');

  const missingDateText = 'PASSPORT REPUBLIC OF INDIA\nGIVEN NAME ROHIT\nSURNAME SHARMA';
  const missingResult = extractPassportDatesFromViz(missingDateText, null);
  assert(!missingResult.issueDate, 'Missing issue date returns empty string');
  assert(missingResult.confidence.issueDate === 'MISSING', 'Confidence is MISSING when date not found');

  // -------------------------------------------------------------------------
  // Scenario 8: Normalization to YYYY-MM-DD
  // -------------------------------------------------------------------------
  console.log('\nScenario 8: Testing Normalization to YYYY-MM-DD...');
  assert(formatDateToISO('14/12/2016') === '2016-12-14', 'formatDateToISO normalized 14/12/2016 -> 2016-12-14');
  assert(formatDateToISO('14-12-2016') === '2016-12-14', 'formatDateToISO normalized 14-12-2016 -> 2016-12-14');
  assert(formatDateToISO('14.12.2016') === '2016-12-14', 'formatDateToISO normalized 14.12.2016 -> 2016-12-14');
  assert(formatDateToISO('2016-12-14') === '2016-12-14', 'formatDateToISO preserved ISO 2016-12-14');

  // -------------------------------------------------------------------------
  // Scenario 9: JPG front passport OCR end-to-end
  // -------------------------------------------------------------------------
  console.log('\nScenario 9: Testing JPG Front Passport OCR End-to-End...');
  const frontJpg = await sharp(Buffer.from(getFrontPassportSvgWithDates({ issueDate: '14/12/2016', expiryDate: '13/12/2026' })))
    .jpeg({ quality: 95 })
    .toBuffer();

  const jpgResult = await passportOcrService.processPassport({
    buffer: frontJpg,
    originalFilename: 'passport_front.jpg',
    mimeType: 'image/jpeg',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });

  assert(jpgResult.success === true, 'JPG front OCR succeeded');
  assert(jpgResult.extractedData.issueDate === '2016-12-14', `JPG extractedData.issueDate populated with normalized value: ${jpgResult.extractedData.issueDate}`);
  assert(jpgResult.extractedData.passportIssuedOn === '2016-12-14', `JPG extractedData.passportIssuedOn populated with normalized value: ${jpgResult.extractedData.passportIssuedOn}`);
  assert(jpgResult.fieldStatus.issueDate === 'HIGH', `JPG fieldStatus.issueDate has HIGH confidence (actual: ${jpgResult.fieldStatus.issueDate})`);
  assert(jpgResult.fields?.issueDate?.value === '2016-12-14', 'JPG fields.issueDate value is 2016-12-14');
  assert(jpgResult.fields?.issueDate?.confidence === 'HIGH', 'JPG fields.issueDate confidence is HIGH');

  // -------------------------------------------------------------------------
  // Scenario 10: PDF passport OCR end-to-end
  // -------------------------------------------------------------------------
  console.log('\nScenario 10: Testing PDF Passport OCR End-to-End...');
  const singlePdfBuffer = createSinglePagePdf(frontJpg);
  const pdfResult = await passportOcrService.processPassport({
    buffer: singlePdfBuffer,
    originalFilename: 'passport_scan.pdf',
    mimeType: 'application/pdf',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });

  assert(pdfResult.success === true, 'PDF front OCR succeeded');
  assert(pdfResult.extractedData.issueDate === '2016-12-14', `PDF extractedData.issueDate populated with: ${pdfResult.extractedData.issueDate}`);
  assert(pdfResult.extractedData.passportIssuedOn === '2016-12-14', `PDF extractedData.passportIssuedOn populated with: ${pdfResult.extractedData.passportIssuedOn}`);
  assert(pdfResult.fieldStatus.issueDate === 'HIGH', 'PDF fieldStatus.issueDate is HIGH');

  // -------------------------------------------------------------------------
  // Scenario 11: Multi-page PDF merge preservation of issueDate
  // -------------------------------------------------------------------------
  console.log('\nScenario 11: Testing Multi-Page PDF Merge Preservation of issueDate...');
  const backJpg = await sharp(Buffer.from(getBackPassportSvg())).jpeg({ quality: 95 }).toBuffer();
  const twoPagePdfBuffer = createTwoPagePdf(frontJpg, backJpg);
  const multiPdfResult = await passportOcrService.processPassport({
    buffer: twoPagePdfBuffer,
    originalFilename: 'two_page_passport.pdf',
    mimeType: 'application/pdf',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });

  assert(multiPdfResult.success === true, 'Multi-page PDF OCR succeeded');
  assert(multiPdfResult.extractedData.issueDate === '2016-12-14', 'Multi-page PDF preserved issueDate across Page 2 back merge');
  assert(multiPdfResult.extractedData.passportIssuedOn === '2016-12-14', 'Multi-page PDF preserved passportIssuedOn across Page 2 back merge');
  assert(Boolean(multiPdfResult.extractedData.fatherName), 'Multi-page PDF merged fatherName from Page 2');

  // -------------------------------------------------------------------------
  // Scenario 12: Two-stage back-page merge preservation of issueDate
  // -------------------------------------------------------------------------
  console.log('\nScenario 12: Testing Two-Stage Back-Page Merge Preservation of issueDate...');
  const backStageResult = await passportOcrService.processPassport({
    buffer: backJpg,
    originalFilename: 'passport_back.jpg',
    mimeType: 'image/jpeg',
    pageType: 'back',
    frontExtractedData: jpgResult.extractedData
  });

  assert(backStageResult.success === true, 'Back stage processing succeeded');
  assert(backStageResult.mergedData.issueDate === '2016-12-14', 'Back stage mergedData preserved issueDate from front page');
  assert(backStageResult.mergedData.passportIssuedOn === '2016-12-14', 'Back stage mergedData preserved passportIssuedOn from front page');

  // -------------------------------------------------------------------------
  // Scenario 13: Frontend Review Form State Mapping and Persistence
  // -------------------------------------------------------------------------
  console.log('\nScenario 13: Verifying Extracted Issue Date Reaches Final Review Form State...');

  // Simulate VisaApplicationPage handlePassportFrontUpload state mapping
  let ocrExtractedData = {
    fullName: '',
    passportNumber: '',
    dateOfBirth: '',
    nationality: 'Indian',
    gender: 'Male',
    issueDate: '',
    expiryDate: ''
  };
  let ocrFieldStatus = {};

  const frontApiExtracted = jpgResult.extractedData;
  const frontApiStatus = jpgResult.fieldStatus;

  // Frontend handler logic
  ocrExtractedData = {
    ...ocrExtractedData,
    passportNumber: frontApiExtracted.passportNumber,
    dateOfBirth: frontApiExtracted.dateOfBirth,
    issueDate: formatDateToISO(frontApiExtracted.issueDate || frontApiExtracted.passportIssuedOn),
    expiryDate: formatDateToISO(frontApiExtracted.expiryDate)
  };
  ocrFieldStatus = {
    ...ocrFieldStatus,
    ...frontApiStatus,
    issueDate: frontApiStatus.issueDate || frontApiStatus.passportIssuedOn || 'MEDIUM'
  };

  assert(ocrExtractedData.issueDate === '2016-12-14', 'Frontend review state receives normalized issueDate 2016-12-14');
  assert(ocrFieldStatus.issueDate === 'HIGH', 'Frontend confidence badge status is HIGH (Verified)');

  // Simulate Stage 2 back upload in VisaApplicationPage
  const backApiMerged = backStageResult.mergedData;
  const backApiStatus = backStageResult.fieldStatus;
  const rawMergedIssue = backApiMerged.issueDate || backApiMerged.passportIssuedOn || ocrExtractedData.issueDate || '';

  ocrExtractedData = {
    ...ocrExtractedData,
    ...backApiMerged,
    issueDate: formatDateToISO(rawMergedIssue) || rawMergedIssue,
    expiryDate: formatDateToISO(backApiMerged.expiryDate) || ocrExtractedData.expiryDate
  };
  ocrFieldStatus = {
    ...ocrFieldStatus,
    ...backApiStatus,
    issueDate: ocrFieldStatus.issueDate || backApiStatus.issueDate || 'MEDIUM'
  };

  assert(ocrExtractedData.issueDate === '2016-12-14', 'Issue date preserved in review form state after back side upload');
  assert(ocrFieldStatus.issueDate === 'HIGH', 'Issue date confidence preserved as HIGH after back side upload');

  // Simulate handleConfirmPassportReview committing to travellers state
  const travellers = [
    {
      id: 't_primary',
      firstName: 'ROHIT',
      lastName: 'SHARMA',
      passportNumber: ocrExtractedData.passportNumber,
      dob: ocrExtractedData.dateOfBirth,
      issueDate: ocrExtractedData.issueDate,
      passportIssuedOn: ocrExtractedData.issueDate,
      expiryDate: ocrExtractedData.expiryDate
    }
  ];

  assert(travellers[0].issueDate === '2016-12-14', 'Primary traveller receives confirmed issueDate 2016-12-14');
  assert(travellers[0].passportIssuedOn === '2016-12-14', 'Primary traveller receives confirmed passportIssuedOn 2016-12-14');

  console.log('\n========================================================================');
  console.log(`PASSPORT ISSUE DATE OCR TEST SUITE: ${passed} PASSED / ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIssueDateVerification().catch((err) => {
  console.error('Fatal error in Issue Date test suite:', err);
  process.exit(1);
});
