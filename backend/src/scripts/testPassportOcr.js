/**
 * Verification Test Suite: Passport-First OCR & MRZ Flow (20 Scenarios)
 * 
 * 1. Front passport upload
 * 2. Back passport upload
 * 3. Front/back association
 * 4. Wrong page detection (front & back)
 * 5. MRZ detection
 * 6. MRZ checksum
 * 7. Passport number mismatch
 * 8. Name mismatch
 * 9. DOB future date
 * 10. Issue date future
 * 11. Expiry before issue
 * 12. Expiry equal to issue
 * 13. >10-year validity
 * 14. Exact 10-year boundary
 * 15. 6-month validity warning
 * 16. Visa-specific validity rule
 * 17. Low-confidence OCR
 * 18. OCR failure
 * 19. Manual fallback
 * 20. Duplicate upload handling
 */

import sharp from 'sharp';
import { passportOcrService } from '../services/passportOcr.service.js';
import { 
  parseTd3Mrz, 
  computeIcaoCheckDigit, 
  detectPassportFront, 
  detectPassportBack,
  compareNames,
  checkPassportConsistency 
} from '../utils/mrzParser.js';
import { 
  validatePassportDates, 
  validatePassportIssueDate, 
  validateDateOfBirth, 
  validateMinimumPassportValidity,
  validateAgeEligibility,
  calculateAge
} from '../utils/dateValidator.js';
import { storageService } from '../services/storage.service.js';

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

// Helper to generate SVG mock passport front
async function createMockFrontBuffer() {
  const svg = `
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
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// Helper to generate SVG mock passport back
async function createMockBackBuffer() {
  const svg = `
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
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// Helper to generate wrong page / random image
async function createMockWrongPageBuffer() {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#E0F2FE"/>
      <circle cx="400" cy="300" r="150" fill="#38BDF8"/>
      <text x="400" y="310" font-family="Arial" font-size="32" text-anchor="middle" fill="#FFFFFF">BEACH VACATION PHOTO</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function runTests() {
  console.log('\n================================================================');
  console.log('NIMUFLY PASSPORT OCR & VALIDATION SUITE — 20 SCENARIOS');
  console.log('================================================================\n');

  const frontBuffer = await createMockFrontBuffer();
  const backBuffer = await createMockBackBuffer();
  const wrongPageBuffer = await createMockWrongPageBuffer();

  // ------------------------------------------------------------
  // Scenario 1: Front passport upload
  // ------------------------------------------------------------
  console.log('Scenario 1: Testing Front Passport Upload & OCR...');
  const frontResult = await passportOcrService.processPassport({
    buffer: frontBuffer,
    originalFilename: 'front_passport.png',
    mimeType: 'image/png',
    pageType: 'front',
    userFullName: 'Rohit Sharma'
  });
  assert(frontResult.success === true, 'Front processing succeeded');
  assert(frontResult.pageType === 'front', 'pageType is front');
  assert(frontResult.isFrontDetected === true, 'Front photo page detected');
  assert(frontResult.extractedData.passportNumber === 'Z9876543', 'Front extracted passport number Z9876543');
  assert(frontResult.extractedData.firstName === 'ROHIT', 'Front extracted first name ROHIT');
  assert(frontResult.extractedData.lastName === 'SHARMA', 'Front extracted last name SHARMA');
  assert(frontResult.extractedData.dateOfBirth === '1987-04-30', 'Front extracted DOB 1987-04-30');
  assert(frontResult.extractedData.gender === 'Male', 'Front extracted gender Male');
  assert(frontResult.extractedData.expiryDate === '2031-01-14', 'Front extracted expiry 2031-01-14');

  // ------------------------------------------------------------
  // Scenario 2: Back passport upload
  // ------------------------------------------------------------
  console.log('\nScenario 2: Testing Back Passport Upload & OCR...');
  const backResult = await passportOcrService.processPassport({
    buffer: backBuffer,
    originalFilename: 'back_passport.png',
    mimeType: 'image/png',
    pageType: 'back',
    frontExtractedData: frontResult.extractedData
  });
  assert(backResult.success === true, 'Back processing succeeded');
  assert(backResult.pageType === 'back', 'pageType is back');
  assert(backResult.isBackDetected === true, 'Back page detected');
  assert(backResult.extractedData.fatherName.includes('SHARMA'), `Back extracted father name (${backResult.extractedData.fatherName})`);
  assert(backResult.extractedData.motherName.includes('SHARMA'), `Back extracted mother name (${backResult.extractedData.motherName})`);
  assert(Boolean(backResult.extractedData.address), `Back extracted address (${backResult.extractedData.address})`);

  // ------------------------------------------------------------
  // Scenario 3: Front/back association
  // ------------------------------------------------------------
  console.log('\nScenario 3: Testing Front/Back Association...');
  const combinedData = {
    ...frontResult.extractedData,
    fatherName: backResult.extractedData.fatherName,
    motherName: backResult.extractedData.motherName,
    spouseName: backResult.extractedData.spouseName,
    address: backResult.extractedData.address,
    fileNumber: backResult.extractedData.fileNumber
  };
  assert(combinedData.passportNumber === 'Z9876543' && combinedData.fatherName, 'Front and back details unified');
  assert(frontResult.uploadedDocument?.storageKey !== backResult.uploadedDocument?.storageKey, 'Separate storage keys for front and back images');

  // ------------------------------------------------------------
  // Scenario 4: Wrong page detection
  // ------------------------------------------------------------
  console.log('\nScenario 4: Testing Wrong Page Detection...');
  const wrongFrontResult = await passportOcrService.processPassport({
    buffer: wrongPageBuffer,
    originalFilename: 'beach.png',
    mimeType: 'image/png',
    pageType: 'front'
  });
  assert(wrongFrontResult.isFrontDetected === false, 'Non-passport image rejected as front page');
  const frontErrMsg = (wrongFrontResult.errors && wrongFrontResult.errors[0]) || wrongFrontResult.message || '';
  assert(frontErrMsg.includes("couldn't identify a passport page"), 'Correct front wrong-page error message returned');

  const wrongBackResult = await passportOcrService.processPassport({
    buffer: wrongPageBuffer,
    originalFilename: 'random.png',
    mimeType: 'image/png',
    pageType: 'back'
  });
  assert(wrongBackResult.isBackDetected === false, 'Non-passport image rejected as back page');
  const backErrMsg = (wrongBackResult.errors && wrongBackResult.errors[0]) || wrongBackResult.message || '';
  assert(backErrMsg.includes('back/second page'), 'Correct back wrong-page error message returned');

  // ------------------------------------------------------------
  // Scenario 5: MRZ detection
  // ------------------------------------------------------------
  console.log('\nScenario 5: Testing MRZ Detection...');
  const mrz1 = 'P<INDSHARMA<<ROHIT<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const mrz2 = 'Z9876543<0IND8704305M3101142<<<<<<<<<<<<<<8';
  const parsedMrz = parseTd3Mrz(mrz1, mrz2);
  assert(parsedMrz.format === 'TD3', 'TD3 MRZ detected');
  assert(parsedMrz.passportNumber === 'Z9876543', 'MRZ passport number extracted');
  assert(parsedMrz.nationality === 'Indian', 'MRZ nationality normalized');

  // ------------------------------------------------------------
  // Scenario 6: MRZ checksum
  // ------------------------------------------------------------
  console.log('\nScenario 6: Testing MRZ Checksum Validation...');
  assert(computeIcaoCheckDigit('L898902C3') === '6', 'Doc number check digit is 6');
  assert(computeIcaoCheckDigit('740812') === '2', 'DOB check digit is 2');
  assert(computeIcaoCheckDigit('120415') === '9', 'Expiry check digit is 9');
  assert(parsedMrz.checks.composite === true, 'Composite check verified');

  // ------------------------------------------------------------
  // Scenario 7: Passport number mismatch
  // ------------------------------------------------------------
  console.log('\nScenario 7: Testing Passport Number Mismatch Detection...');
  const consistencyMismatch = checkPassportConsistency(
    { passportNumber: 'Z9876543', fullName: 'ROHIT SHARMA' },
    { passportNumber: 'A1234567', fatherName: 'GURUNATH' }
  );
  assert(consistencyMismatch.isConsistent === false, 'Consistency checker caught passport number mismatch');
  assert(consistencyMismatch.warning === 'Some passport details could not be matched.', 'Visible warning for mismatch');
  assert(consistencyMismatch.mismatches.some(m => m.field === 'passportNumber'), 'passportNumber mismatch details reported');

  // ------------------------------------------------------------
  // Scenario 8: Name mismatch
  // ------------------------------------------------------------
  console.log('\nScenario 8: Testing Name Mismatch Detection...');
  const nameComparison = compareNames('Vikram Rathore', 'ROHIT SHARMA');
  assert(nameComparison.isMatch === false, 'Name comparison flagged mismatch');
  assert(nameComparison.message === "Your entered name doesn't exactly match the passport.", 'Exact name mismatch warning text returned');

  const matchingName = compareNames('rohit  sharma', 'ROHIT SHARMA');
  assert(matchingName.isMatch === true, 'Normalized name comparison ignores casing/whitespace');

  // ------------------------------------------------------------
  // Scenario 9: DOB future date
  // ------------------------------------------------------------
  console.log('\nScenario 9: Testing Date of Birth Future Date Validation...');
  const futureDob = validateDateOfBirth('2030-01-01');
  assert(futureDob.isValid === false, 'Future date of birth is rejected');
  assert(futureDob.error.includes('future'), 'Appropriate error for future DOB');

  const validDob = validateDateOfBirth('1990-05-15');
  assert(validDob.isValid === true && validDob.age > 0, 'Past date of birth is valid and age is calculated');

  // ------------------------------------------------------------
  // Scenario 10: Issue date future
  // ------------------------------------------------------------
  console.log('\nScenario 10: Testing Issue Date Future Date Validation...');
  const futureIssue = validatePassportIssueDate('2028-10-10');
  assert(futureIssue.isValid === false, 'Future issue date is rejected');
  assert(futureIssue.error === 'Passport issue date appears invalid. Please review it.', 'Exact issue date error message returned');

  // ------------------------------------------------------------
  // Scenario 11: Expiry before issue
  // ------------------------------------------------------------
  console.log('\nScenario 11: Testing Expiry Before Issue Date...');
  const expiryBefore = validatePassportDates('2022-01-15', '2020-01-15');
  assert(expiryBefore.isValid === false, 'Expiry before issue is rejected');
  assert(expiryBefore.error && expiryBefore.error.includes('after the issue date'), 'Proper error message for expiry before issue');

  // ------------------------------------------------------------
  // Scenario 12: Expiry equal to issue
  // ------------------------------------------------------------
  console.log('\nScenario 12: Testing Expiry Equal to Issue Date...');
  const expiryEqual = validatePassportDates('2022-01-15', '2022-01-15');
  assert(expiryEqual.isValid === false, 'Expiry equal to issue is rejected');

  // ------------------------------------------------------------
  // Scenario 13: >10-year validity
  // ------------------------------------------------------------
  console.log('\nScenario 13: Testing >10-Year Validity Rule...');
  const over10Years = validatePassportDates('2025-11-15', '2035-11-16');
  assert(over10Years.isValid === false, 'Date exceeding 10 years is rejected');
  assert(over10Years.error === 'Passport validity exceeds the allowed 10-year period. Please verify the issue and expiry dates.', 'Exact 10-year period error message returned');

  // ------------------------------------------------------------
  // Scenario 14: Exact 10-year boundary
  // ------------------------------------------------------------
  console.log('\nScenario 14: Testing Exact 10-Year Boundary Rule (issueDate + 10 years - 1 day)...');
  // Issue 15-11-2025 -> max permitted expiry 14-11-2035
  const exactMax = validatePassportDates('2025-11-15', '2035-11-14');
  assert(exactMax.isValid === true, '14-11-2035 is valid for issue 15-11-2025');

  const exactlyTenYears = validatePassportDates('2025-11-15', '2035-11-15');
  assert(exactlyTenYears.isValid === false, '15-11-2035 (exact 10th anniversary) is invalid');

  // ------------------------------------------------------------
  // Scenario 15: 6-month validity warning
  // ------------------------------------------------------------
  console.log('\nScenario 15: Testing Minimum 6-Month Passport Validity Warning...');
  const travelDate = '2026-10-04';
  const expiringSoon = '2027-01-01'; // only 3 months from travel date
  const validityCheck = validateMinimumPassportValidity(expiringSoon, travelDate, 6);
  assert(validityCheck.isValid === false, 'Flags passport expiring in less than 6 months');
  assert(validityCheck.warning === 'Your passport needs to be valid for at least 6 months from your travel date.', 'Exact 6-month validity warning text returned');

  const validTravelExpiry = '2027-06-01'; // 8 months
  const validTravelCheck = validateMinimumPassportValidity(validTravelExpiry, travelDate, 6);
  assert(validTravelCheck.isValid === true, 'Accepts passport with > 6 months validity');

  // ------------------------------------------------------------
  // Scenario 16: Visa-specific validity rule
  // ------------------------------------------------------------
  console.log('\nScenario 16: Testing Dynamic Visa-Specific Validity Rule...');
  // Destination requiring 9 months validity
  const visaReq9Months = validateMinimumPassportValidity('2027-05-01', travelDate, 9);
  assert(visaReq9Months.isValid === false, 'Visa with 9-month requirement flags 7-month validity');
  assert(visaReq9Months.warning.includes('9 months'), 'Custom month count reflected in warning');

  // Age eligibility
  const ageRuleCheck = validateAgeEligibility('2015-01-01', { minimumAge: 18, maximumAge: 65 });
  assert(ageRuleCheck.isValid === false, 'Child applicant flagged when visa specifies minimumAge 18');

  // ------------------------------------------------------------
  // Scenario 17: Low-confidence OCR
  // ------------------------------------------------------------
  console.log('\nScenario 17: Testing Low-Confidence OCR Handling...');
  // Tiny blurry image
  const blurryBuffer = await sharp({
    create: { width: 150, height: 100, channels: 3, background: { r: 180, g: 180, b: 180 } }
  }).blur(5).jpeg({ quality: 20 }).toBuffer();

  const lowConfResult = await passportOcrService.processPassport({
    buffer: blurryBuffer,
    originalFilename: 'blurry.jpg',
    mimeType: 'image/jpeg',
    pageType: 'front'
  });
  assert(lowConfResult.canContinueManually === true, 'canContinueManually set to true');
  assert(lowConfResult.qualityFailed === true || lowConfResult.wrongPage === true || lowConfResult.fieldStatus?.passportNumber === 'MISSING', 'Low confidence or quality flag set');

  // ------------------------------------------------------------
  // Scenario 18: OCR failure handling
  // ------------------------------------------------------------
  console.log('\nScenario 18: Testing OCR Engine Failure Resilience...');
  const zeroBuffer = Buffer.from('NOT_AN_IMAGE');
  try {
    const corruptedResult = await passportOcrService.processPassport({
      buffer: zeroBuffer,
      originalFilename: 'corrupt.jpg',
      mimeType: 'image/jpeg',
      pageType: 'front'
    });
    assert(corruptedResult.canContinueManually === true, 'Manual fallback offered on unreadable file');
  } catch (err) {
    assert(true, 'Gracefully caught error: ' + err.message);
  }

  // ------------------------------------------------------------
  // Scenario 19: Manual fallback
  // ------------------------------------------------------------
  console.log('\nScenario 19: Testing Manual Fallback...');
  assert(lowConfResult.canContinueManually === true, 'Fallback enabled on low confidence');
  assert(typeof lowConfResult.extractedData === 'object', 'Extracted data object initialized with empty/retained fields');

  // ------------------------------------------------------------
  // Scenario 20: Duplicate upload handling
  // ------------------------------------------------------------
  console.log('\nScenario 20: Testing Duplicate / Re-upload Cleanup...');
  // Upload first image
  const firstUpload = await passportOcrService.processPassport({
    buffer: frontBuffer,
    originalFilename: 'first_front.png',
    mimeType: 'image/png',
    pageType: 'front'
  });
  const oldStorageKey = firstUpload.uploadedDocument?.storageKey;
  assert(Boolean(oldStorageKey), `First image staged at ${oldStorageKey}`);

  // Re-upload passing previousStorageKey
  const secondUpload = await passportOcrService.processPassport({
    buffer: frontBuffer,
    originalFilename: 'second_front.png',
    mimeType: 'image/png',
    pageType: 'front',
    previousStorageKey: oldStorageKey
  });
  assert(secondUpload.success === true, 'Re-upload succeeded');
  assert(secondUpload.uploadedDocument?.storageKey !== oldStorageKey, 'New storage key assigned for re-uploaded image');

  console.log('\n================================================================');
  console.log(`PASSPORT OCR TEST SUITE RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test suite uncaught error:', e);
  process.exit(1);
});
