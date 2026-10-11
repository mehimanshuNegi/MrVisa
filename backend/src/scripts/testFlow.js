/**
 * Test Suite for NimuFly:
 * 1. Mobile Number Validation (Digits Only, exactly 10 digits for Indian)
 * 2. Stronger Name Validation (Unicode letters, accents, hyphen/apostrophe, reject numbers/symbols/dots)
 * 3. Email Format Validation
 * 4. Application Schema Validation
 */

import { validateEmail as frontendValidateEmail } from '../../../src/utils/emailValidator.js';
import { validatePhone as frontendValidatePhone } from '../../../src/utils/phoneValidator.js';
import {
  validateName as frontendValidateName,
  validateFirstName as frontendValidateFirstName,
  validateLastName as frontendValidateLastName,
  validateBusinessName as frontendValidateBusinessName
} from '../../../src/utils/nameValidator.js';

import { validateEmail as backendValidateEmail } from '../utils/emailValidator.js';
import { validatePhone as backendValidatePhone } from '../utils/phoneValidator.js';
import {
  validateName as backendValidateName,
  validateFirstName as backendValidateFirstName,
  validateLastName as backendValidateLastName,
  validateBusinessName as backendValidateBusinessName
} from '../utils/nameValidator.js';
import { validatePassportDates } from '../utils/dateValidator.js';
import { createApplicationSchema } from '../validators/application.validator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('RUNNING NIMUFLY VERIFICATION, MOBILE & NAME VALIDATION SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------
// 1. Valid Email Format Testing
// -----------------------------------------------------------------
console.log('Test 1: Valid email formats');
const validEmails = [
  'user@gmail.com',
  'name@yahoo.com',
  'person@outlook.com',
  'contact@company.org',
  'support@travel.agency',
  'john.doe@custom-domain.co.in'
];

validEmails.forEach((email) => {
  const fe = frontendValidateEmail(email);
  const be = backendValidateEmail(email);
  assert(fe.isValid && !fe.error, `Frontend accepts valid email: ${email}`);
  assert(be.isValid && !be.error, `Backend accepts valid email: ${email}`);
});

// -----------------------------------------------------------------
// 2. Invalid Email Format Testing
// -----------------------------------------------------------------
console.log('\nTest 2: Invalid email formats & domain typos');
const invalidEmails = [
  { email: 'user@gmail.con', reason: 'Common typo .con' },
  { email: 'user@gmail.vov', reason: 'Invalid TLD .vov' },
  { email: 'user@@gmail.com', reason: 'Multiple @' },
  { email: 'user@gmail', reason: 'Missing extension' },
  { email: 'user @gmail.com', reason: 'Spaces in email' },
  { email: 'user@gmail .com', reason: 'Spaces in domain' }
];

invalidEmails.forEach(({ email, reason }) => {
  const fe = frontendValidateEmail(email);
  const be = backendValidateEmail(email);
  assert(!fe.isValid && fe.error, `Frontend rejects (${reason}): ${email}`);
  assert(!be.isValid && be.error, `Backend rejects (${reason}): ${email}`);
});

// -----------------------------------------------------------------
// 3. Mobile Number — Valid 10-Digit Indian Numbers
// -----------------------------------------------------------------
console.log('\nTest 3: Valid 10-digit Indian mobile numbers (Digits Only)');
const validMobiles = [
  '9876543210',
  '8123456789',
  '7000123456',
  '6234567890',
  '+919876543210'
];

validMobiles.forEach((mob) => {
  const fe = frontendValidatePhone(mob, { country: 'IN', nationality: 'Indian' });
  const be = backendValidatePhone(mob, { country: 'IN', nationality: 'Indian' });
  assert(fe.isValid && fe.cleanNumber.length === 10, `Frontend accepts valid 10-digit: ${mob}`);
  assert(be.isValid && be.cleanNumber.length === 10, `Backend accepts valid 10-digit: ${mob}`);
});

// -----------------------------------------------------------------
// 4. Mobile Number — Reject Letters, Spaces, Punctuation, Wrong Length
// -----------------------------------------------------------------
console.log('\nTest 4: Reject letters, spaces, hyphens, brackets, symbols, wrong length');
const invalidMobiles = [
  { phone: '98765 43210', reason: 'Internal spaces' },
  { phone: ' 9876543210 ', reason: 'Leading/trailing spaces' },
  { phone: '98765-43210', reason: 'Hyphens' },
  { phone: '(987)6543210', reason: 'Brackets' },
  { phone: '+91 9876543210', reason: 'Spaces after country code' },
  { phone: '987654321', reason: '9 digits' },
  { phone: '98765432101', reason: '11 digits' },
  { phone: '98765abcde', reason: 'Letters' },
  { phone: '98765@4321', reason: 'Special characters' },
  { phone: '1234567890', reason: 'Invalid Indian prefix (starts with 1)' },
  { phone: '5234567890', reason: 'Invalid Indian prefix (starts with 5)' }
];

invalidMobiles.forEach(({ phone, reason }) => {
  const fe = frontendValidatePhone(phone, { country: 'IN', nationality: 'Indian' });
  const be = backendValidatePhone(phone, { country: 'IN', nationality: 'Indian' });
  assert(!fe.isValid && fe.error === 'Enter a valid 10-digit mobile number.', `Frontend rejects (${reason}): "${phone}" -> ${fe.error}`);
  assert(!be.isValid && be.error === 'Enter a valid 10-digit mobile number.', `Backend rejects (${reason}): "${phone}" -> ${be.error}`);
});

// -----------------------------------------------------------------
// 5. Mobile Number — International Numbers Support
// -----------------------------------------------------------------
console.log('\nTest 5: International mobile number validation');
const usValid = frontendValidatePhone('4155552671', { country: 'US', nationality: 'American', dialCode: '+1' });
assert(usValid.isValid, 'Accepts valid US 10-digit number');

const shortIntl = frontendValidatePhone('12345', { country: 'US', nationality: 'American', dialCode: '+1' });
assert(!shortIntl.isValid, 'Rejects short international number');

// -----------------------------------------------------------------
// 6. Name Validation — Acceptance Criteria
// -----------------------------------------------------------------
console.log('\nTest 6: Valid names (Unicode letters, accents, hyphens, apostrophes, mononyms)');
const validNames = [
  'Rahul Sharma',
  'Anne-Marie',
  "O'Connor",
  'René',
  'राहुल शर्मा',      // Hindi / Devanagari
  'রবীন্দ্রনাথ ঠাকুর', // Bengali
  'രവീന്ദ്രൻ നായർ',    // Malayalam
  'Mary Jane',
  'Rahul',            // Mononym / single word
  'Dr. Jekyll'        // Wait: check if personal name allows dots or only letters?
];

// Note: Test acceptance cases from prompt
const promptAccepted = [
  'Rahul Sharma',
  'Anne-Marie',
  "O'Connor",
  'René',
  'राहुल शर्मा'
];

promptAccepted.forEach((name) => {
  const fe = frontendValidateName(name);
  const be = backendValidateName(name);
  assert(fe.isValid && !fe.error, `Frontend accepts valid name: "${name}"`);
  assert(be.isValid && !be.error, `Backend accepts valid name: "${name}"`);
});

// Test mononym
assert(frontendValidateName('Rahul').isValid, 'Frontend accepts valid single-word name (mononym)');
assert(backendValidateName('Rahul').isValid, 'Backend accepts valid single-word name (mononym)');

// -----------------------------------------------------------------
// 7. Name Validation — Rejection Criteria
// -----------------------------------------------------------------
console.log('\nTest 7: Reject invalid names (digits, repeated punctuation, malformed)');
const promptRejected = [
  { name: 'Rahul123', reason: 'Contains digits' },
  { name: '...', reason: 'Only punctuation / dots' },
  { name: '-Rahul', reason: 'Leading hyphen' },
  { name: 'Rahul..Sharma', reason: 'Repeated dots' },
  { name: 'Rahul--Sharma', reason: 'Repeated hyphens' },
  { name: "Rahul''Sharma", reason: 'Repeated apostrophes' },
  { name: '', reason: 'Empty string' },
  { name: '   ', reason: 'Whitespace-only string' }
];

promptRejected.forEach(({ name, reason }) => {
  const fe = frontendValidateName(name);
  const be = backendValidateName(name);
  assert(!fe.isValid && fe.error, `Frontend rejects (${reason}): "${name}" -> ${fe.error}`);
  assert(!be.isValid && be.error, `Backend rejects (${reason}): "${name}" -> ${be.error}`);
});

// -----------------------------------------------------------------
// 8. Specialized Name Validators (First, Last, Business)
// -----------------------------------------------------------------
console.log('\nTest 8: Specialized name validators');
assert(frontendValidateFirstName('Anne-Marie').isValid, 'Frontend validateFirstName accepts "Anne-Marie"');
assert(frontendValidateFirstName('A').isValid === false, 'Frontend validateFirstName rejects 1-character first name');
assert(frontendValidateLastName('O').isValid === true, 'Frontend validateLastName accepts 1-character surname "O"');
assert(frontendValidateLastName('').isValid === false, 'Frontend validateLastName rejects empty surname');

assert(frontendValidateBusinessName('Acme Corp Ltd.').isValid, 'Frontend validateBusinessName accepts "Acme Corp Ltd."');
assert(frontendValidateBusinessName('Tata & Sons').isValid, 'Frontend validateBusinessName accepts "Tata & Sons"');
assert(backendValidateBusinessName('Reliance Industries Ltd.').isValid, 'Backend validateBusinessName accepts "Reliance Industries Ltd."');
assert(backendValidateBusinessName('123').isValid === false, 'Business name without letters is rejected');

// -----------------------------------------------------------------
// 9. Passport & Date Validations Preserved
// -----------------------------------------------------------------
console.log('\nTest 9: Passport date rules & formatting preserved');
const validPassportDate = validatePassportDates('2020-01-01', '2029-12-31');
assert(validPassportDate.isValid, 'Valid 10-year passport dates accepted (2020-01-01 to 2029-12-31)');

const over10Years = validatePassportDates('2015-01-01', '2030-01-01');
assert(!over10Years.isValid, 'Passport exceeding 10 years rejected');

const expiredPassport = validatePassportDates('2010-01-01', '2020-01-01');
assert(!expiredPassport.isValid, 'Expired passport rejected');

// -----------------------------------------------------------------
// 10. Backend Joi Schema Validation for Applications
// -----------------------------------------------------------------
console.log('\nTest 10: Backend Joi application schema validation');
const invalidApp1 = createApplicationSchema.validate({});
assert(invalidApp1.error && invalidApp1.error.details[0].message.includes('visaId'), 'Schema requires visaId');

const validAppPayload = {
  visaId: 'visa_uae_30d',
  countryId: 'country_uae',
  applicantEmail: 'user@gmail.com',
  applicantPhone: '9876543210',
  verificationToken: 'token_mock_abcdef',
  travellers: [
    {
      name: 'Rahul Sharma',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'user@gmail.com',
      phone: '9876543210',
      nationality: 'Indian',
      passportNumber: 'Z1234567'
    }
  ]
};
const validAppRes = createApplicationSchema.validate(validAppPayload);
assert(!validAppRes.error, 'Valid application with 10-digit mobile, verified name and token passes Joi schema');

// Invalid mobile in traveller
const invalidAppPhone = {
  ...validAppPayload,
  applicantPhone: '98765 43210', // space
  travellers: [
    {
      ...validAppPayload.travellers[0],
      phone: '98765 43210'
    }
  ]
};
const invalidAppPhoneRes = createApplicationSchema.validate(invalidAppPhone);
assert(invalidAppPhoneRes.error, 'Application with spaces in mobile rejected by schema');

// Invalid name in traveller
const invalidAppName = {
  ...validAppPayload,
  travellers: [
    {
      ...validAppPayload.travellers[0],
      name: 'Rahul123'
    }
  ]
};
const invalidAppNameRes = createApplicationSchema.validate(invalidAppName);
assert(invalidAppNameRes.error, 'Application with digit in traveller name rejected by schema');

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
