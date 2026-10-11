/**
 * Test Suite for NimuFly: Email Format Validation, Mobile Validation & Final Submission OTP
 */

import { validateEmail as frontendValidateEmail } from '../../../src/utils/emailValidator.js';
import { validatePhone as frontendValidatePhone } from '../../../src/utils/phoneValidator.js';
import { validateEmail as backendValidateEmail } from '../utils/emailValidator.js';
import { validatePhone as backendValidatePhone } from '../utils/phoneValidator.js';
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
console.log('RUNNING NIMUFLY VERIFICATION & FLOW SUITE');
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
// 3. Valid 10-Digit Indian Mobile Number Testing
// -----------------------------------------------------------------
console.log('\nTest 3: Valid 10-digit Indian mobile numbers');
const validMobiles = [
  '9876543210',
  '8123456789',
  '7000123456',
  '6234567890',
  '+919876543210',
  '+91 9876543210'
];

validMobiles.forEach((mob) => {
  const fe = frontendValidatePhone(mob, { country: 'IN', nationality: 'Indian' });
  const be = backendValidatePhone(mob, { country: 'IN', nationality: 'Indian' });
  assert(fe.isValid && fe.cleanNumber.length === 10, `Frontend accepts 10-digit Indian number: ${mob}`);
  assert(be.isValid && be.cleanNumber.length === 10, `Backend accepts 10-digit Indian number: ${mob}`);
});

// -----------------------------------------------------------------
// 4. Invalid Indian Mobile Numbers (9 or 11 digits, letters, symbols)
// -----------------------------------------------------------------
console.log('\nTest 4: Invalid Indian mobile numbers (9/11 digits, letters, symbols)');
const invalidMobiles = [
  { phone: '987654321', reason: '9 digits' },
  { phone: '98765432101', reason: '11 digits' },
  { phone: '98765abcde', reason: 'Contains letters' },
  { phone: '98765@4321', reason: 'Contains symbols' },
  { phone: '1234567890', reason: 'Invalid prefix (starts with 1)' },
  { phone: '5234567890', reason: 'Invalid prefix (starts with 5)' }
];

invalidMobiles.forEach(({ phone, reason }) => {
  const fe = frontendValidatePhone(phone, { country: 'IN', nationality: 'Indian' });
  const be = backendValidatePhone(phone, { country: 'IN', nationality: 'Indian' });
  assert(!fe.isValid && fe.error, `Frontend rejects (${reason}): ${phone} -> ${fe.error}`);
  assert(!be.isValid && be.error, `Backend rejects (${reason}): ${phone} -> ${be.error}`);
});

// -----------------------------------------------------------------
// 5. International Numbers Support
// -----------------------------------------------------------------
console.log('\nTest 5: International mobile number validation by country');
const usValid = frontendValidatePhone('4155552671', { country: 'US', nationality: 'American', dialCode: '+1' });
assert(usValid.isValid, 'Accepts valid US number');

const shortIntl = frontendValidatePhone('12345', { country: 'US', nationality: 'American', dialCode: '+1' });
assert(!shortIntl.isValid, 'Rejects short international number');

// -----------------------------------------------------------------
// 6. Passport & Date Validations Preserved
// -----------------------------------------------------------------
console.log('\nTest 6: Passport date rules & formatting preserved');
const validPassportDate = validatePassportDates('2020-01-01', '2029-12-31');
assert(validPassportDate.isValid, 'Valid 10-year passport dates accepted (2020-01-01 to 2029-12-31)');

const over10Years = validatePassportDates('2015-01-01', '2030-01-01');
assert(!over10Years.isValid, 'Passport exceeding 10 years rejected');

const expiredPassport = validatePassportDates('2010-01-01', '2020-01-01');
assert(!expiredPassport.isValid, 'Expired passport rejected');

// -----------------------------------------------------------------
// 7. Backend Joi Schema Validation for Applications
// -----------------------------------------------------------------
console.log('\nTest 7: Backend Joi application schema validation');
// Missing visaId
const invalidApp1 = createApplicationSchema.validate({});
assert(invalidApp1.error && invalidApp1.error.details[0].message.includes('visaId'), 'Schema requires visaId');

// Valid application payload with OTP
const validAppPayload = {
  visaId: 'visa_uae_30d',
  countryId: 'country_uae',
  applicantEmail: 'user@gmail.com',
  applicantPhone: '9876543210',
  otp: '123456',
  travellers: [
    {
      name: 'Rahul Sharma',
      email: 'user@gmail.com',
      phone: '9876543210',
      nationality: 'Indian',
      passportNumber: 'Z1234567'
    }
  ]
};
const validAppRes = createApplicationSchema.validate(validAppPayload);
assert(!validAppRes.error, 'Valid application with 10-digit mobile and OTP passes Joi schema');

// Invalid mobile in traveller
const invalidAppPhone = {
  ...validAppPayload,
  applicantPhone: '987654321', // 9 digits
  travellers: [
    {
      ...validAppPayload.travellers[0],
      phone: '987654321'
    }
  ]
};
const invalidAppPhoneRes = createApplicationSchema.validate(invalidAppPhone);
assert(invalidAppPhoneRes.error, 'Application with 9-digit mobile rejected by schema');

// Invalid email in traveller
const invalidAppEmail = {
  ...validAppPayload,
  applicantEmail: 'user@gmail.con',
  travellers: [
    {
      ...validAppPayload.travellers[0],
      email: 'user@gmail.con'
    }
  ]
};
const invalidAppEmailRes = createApplicationSchema.validate(invalidAppEmail);
assert(invalidAppEmailRes.error, 'Application with typo domain .con rejected by schema');

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
