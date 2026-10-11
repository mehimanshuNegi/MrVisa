/**
 * Phone Number Format Validator for NimuFly (Backend)
 *
 * Requirements:
 * - For Indian mobile numbers, require exactly 10 digits in the mobile-number input, excluding +91 country code.
 * - Indian mobile numbers must start with 6, 7, 8, or 9.
 * - Reject fewer or more than 10 digits, alphabetic characters, and invalid formats.
 * - Support international numbers when country / dialCode is not Indian (7 to 15 digits).
 */

export function validatePhone(rawPhone, { country = 'IN', nationality = 'Indian', dialCode = '+91' } = {}) {
  if (rawPhone === undefined || rawPhone === null) {
    return {
      isValid: false,
      error: 'Mobile number is required.',
      cleanNumber: '',
      normalized: ''
    };
  }

  const str = String(rawPhone).trim();
  if (!str) {
    return {
      isValid: false,
      error: 'Mobile number is required.',
      cleanNumber: '',
      normalized: ''
    };
  }

  // Reject alphabetic characters
  if (/[a-zA-Z]/.test(str)) {
    return {
      isValid: false,
      error: 'Mobile number cannot contain letters.',
      cleanNumber: str,
      normalized: str
    };
  }

  // Reject invalid symbols (allow digits, spaces, hyphens, parentheses, and leading +)
  if (/[^\d\s\-+()]/.test(str)) {
    return {
      isValid: false,
      error: 'Mobile number contains invalid characters.',
      cleanNumber: str,
      normalized: str
    };
  }

  const natLower = String(nationality || '').toLowerCase().trim();
  const cLower = String(country || '').toLowerCase().trim();
  const isIndian =
    cLower === 'in' ||
    cLower === 'india' ||
    natLower === 'indian' ||
    dialCode === '+91' ||
    str.startsWith('+91');

  if (isIndian) {
    let digits = str.replace(/\D/g, '');

    // If prefixed with 91 or +91, exclude country code
    if (str.startsWith('+91') && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }

    if (digits.length === 0) {
      return {
        isValid: false,
        error: 'Mobile number is required.',
        cleanNumber: '',
        normalized: ''
      };
    }

    if (digits.length < 10) {
      return {
        isValid: false,
        error: `Mobile number must be exactly 10 digits (currently ${digits.length}).`,
        cleanNumber: digits,
        normalized: digits
      };
    }

    if (digits.length > 10) {
      return {
        isValid: false,
        error: `Mobile number must be exactly 10 digits (currently ${digits.length}).`,
        cleanNumber: digits,
        normalized: digits
      };
    }

    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        error: 'Indian mobile number must start with 6, 7, 8, or 9.',
        cleanNumber: digits,
        normalized: `+91${digits}`
      };
    }

    return {
      isValid: true,
      error: null,
      cleanNumber: digits,
      normalized: `+91${digits}`
    };
  }

  // International numbers
  const digits = str.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return {
      isValid: false,
      error: `International phone number must be between 7 and 15 digits (currently ${digits.length}).`,
      cleanNumber: digits,
      normalized: str.startsWith('+') ? `+${digits}` : digits
    };
  }

  return {
    isValid: true,
    error: null,
    cleanNumber: digits,
    normalized: str.startsWith('+') ? `+${digits}` : digits
  };
}

export default validatePhone;
