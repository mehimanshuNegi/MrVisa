/**
 * Phone Number Format Validator for NimuFly (Backend)
 *
 * Rules:
 * - For Indian mobile numbers:
 *   - Accept exactly 10 digits in the number input, excluding the +91 country code.
 *   - Allow only digits in the actual number field.
 *   - Reject letters, spaces, hyphens, brackets, special characters and numbers with fewer or more than 10 digits.
 *   - Must start with 6, 7, 8, or 9.
 *   - Display clear inline message: "Enter a valid 10-digit mobile number."
 *   - Revalidate when the value changes.
 *   - Do not silently transform an invalid number into a different number.
 *   - Normalize to +91XXXXXXXXXX on success.
 * - For international numbers:
 *   - Require 7 to 15 digits when country or dialCode is international.
 *   - Reject letters or arbitrary symbols.
 */

export function validatePhone(rawPhone, { country = 'IN', nationality = 'Indian', dialCode = '+91' } = {}) {
  if (rawPhone === undefined || rawPhone === null) {
    return {
      isValid: false,
      error: 'Enter a valid 10-digit mobile number.',
      cleanNumber: '',
      normalized: ''
    };
  }

  const rawStr = String(rawPhone);
  const trimmed = rawStr.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Enter a valid 10-digit mobile number.',
      cleanNumber: '',
      normalized: ''
    };
  }

  const natLower = String(nationality || '').toLowerCase().trim();
  const cLower = String(country || '').toLowerCase().trim();
  const isIndian =
    cLower === 'in' ||
    cLower === 'india' ||
    natLower === 'indian' ||
    dialCode === '+91' ||
    trimmed.startsWith('+91');

  if (isIndian) {
    let numberPart = rawStr;
    if (trimmed.startsWith('+91')) {
      numberPart = trimmed.slice(3);
    }

    // Must not contain any spaces, hyphens, letters, brackets, or special characters
    // Reject any character that is not a digit
    if (!/^\d+$/.test(numberPart)) {
      return {
        isValid: false,
        error: 'Enter a valid 10-digit mobile number.',
        cleanNumber: rawStr,
        normalized: rawStr
      };
    }

    // Exactly 10 digits
    if (numberPart.length !== 10) {
      return {
        isValid: false,
        error: 'Enter a valid 10-digit mobile number.',
        cleanNumber: rawStr,
        normalized: rawStr
      };
    }

    // Must start with 6, 7, 8, or 9
    if (!/^[6-9]/.test(numberPart)) {
      return {
        isValid: false,
        error: 'Enter a valid 10-digit mobile number.',
        cleanNumber: rawStr,
        normalized: rawStr
      };
    }

    return {
      isValid: true,
      error: null,
      cleanNumber: numberPart,
      normalized: `+91${numberPart}`
    };
  }

  // International numbers
  // Reject letters and unexpected symbols
  if (/[a-zA-Z]/.test(rawStr) || /[^\d+\s\-()]/.test(rawStr)) {
    return {
      isValid: false,
      error: 'International mobile number contains invalid characters.',
      cleanNumber: rawStr,
      normalized: rawStr
    };
  }

  const digits = rawStr.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return {
      isValid: false,
      error: `International phone number must be between 7 and 15 digits (currently ${digits.length}).`,
      cleanNumber: rawStr,
      normalized: rawStr
    };
  }

  return {
    isValid: true,
    error: null,
    cleanNumber: digits,
    normalized: rawStr.startsWith('+') ? `+${digits}` : `+${digits}`
  };
}

export default validatePhone;
