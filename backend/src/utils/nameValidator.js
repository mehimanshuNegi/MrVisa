/**
 * Shared Name Validator for NimuFly (Backend)
 * Enforces comprehensive Unicode-aware name validation identical to frontend.
 *
 * Rules:
 * - Trim leading/trailing whitespace before validation and persistence.
 * - Reject empty or whitespace-only names.
 * - Reject names shorter than 2 characters (or min 1 char for single-letter surnames).
 * - Reject names exceeding reasonable bounds (max 70 chars for personal names, 100 chars for businesses).
 * - Reject digits, emojis, and arbitrary symbols.
 * - Reject leading/trailing punctuation, repeated punctuation (e.g., '..', '--', "''"), and malformed combinations.
 * - Allow legitimate Unicode letters across all scripts (including Devanagari and other Indian scripts, Latin with accents, etc. via \p{L}\p{M}).
 * - Allow reasonable internal single spaces, hyphens, and apostrophes (e.g. Mary Jane, Anne-Marie, O'Connor, René).
 * - Allow mononyms (single-word names) for full names.
 * - Provide specialized validation functions: validateName, validateFullName, validateFirstName, validateMiddleName, validateLastName, validateBusinessName.
 */

const PERSONAL_NAME_REGEX = /^[\p{L}][\p{L}\p{M}]*(?:[ '-][\p{L}\p{M}]+)*$/u;

/**
 * Base validator for personal names
 */
function validatePersonalName(rawName, fieldLabel = 'Name', { minLength = 2, required = true } = {}) {
  if (rawName === undefined || rawName === null) {
    if (!required) return { isValid: true, error: null, normalized: '' };
    return { isValid: false, error: `${fieldLabel} is required.`, normalized: '' };
  }

  const str = String(rawName);
  const trimmed = str.trim();

  if (!trimmed) {
    if (!required) return { isValid: true, error: null, normalized: '' };
    return { isValid: false, error: `${fieldLabel} is required.`, normalized: '' };
  }

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldLabel} must be at least ${minLength} character${minLength > 1 ? 's' : ''}.`,
      normalized: trimmed
    };
  }

  if (trimmed.length > 70) {
    return { isValid: false, error: `${fieldLabel} cannot exceed 70 characters.`, normalized: trimmed };
  }

  // Reject digits
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} cannot contain numbers.`, normalized: trimmed };
  }

  // Reject leading punctuation, symbols, or numbers
  if (/^[^\p{L}]/u.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} must start with a valid letter.`, normalized: trimmed };
  }

  // Reject trailing punctuation, dots, hyphens, or apostrophes
  if (/[^\p{L}\p{M}]$/u.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} cannot end with a dot or punctuation.`, normalized: trimmed };
  }

  // Reject repeated consecutive separators (-- , '' , .. , -' , etc.)
  if (/[-' ]{2,}/.test(trimmed) || /\.{2,}/.test(trimmed) || /[-']\s|\s[-']/.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} cannot contain repeated or malformed punctuation.`, normalized: trimmed };
  }

  // Allows curly apostrophes by normalizing them to standard apostrophe for validation
  const sanitized = trimmed.replace(/[’‘]/g, "'");

  if (!PERSONAL_NAME_REGEX.test(sanitized)) {
    return { isValid: false, error: `${fieldLabel} contains invalid characters or punctuation.`, normalized: trimmed };
  }

  // Normalize internal whitespace to single spaces
  const normalized = sanitized.replace(/\s+/g, ' ');

  return {
    isValid: true,
    error: null,
    normalized
  };
}

/**
 * General Name validator (default)
 */
export function validateName(rawName) {
  return validatePersonalName(rawName, 'Name', { minLength: 2, required: true });
}

/**
 * Full Name validator
 */
export function validateFullName(rawName) {
  return validatePersonalName(rawName, 'Full name', { minLength: 2, required: true });
}

/**
 * First Name validator
 */
export function validateFirstName(rawName) {
  return validatePersonalName(rawName, 'First name', { minLength: 2, required: true });
}

/**
 * Middle Name validator (optional)
 */
export function validateMiddleName(rawName) {
  return validatePersonalName(rawName, 'Middle name', { minLength: 1, required: false });
}

/**
 * Last Name / Surname validator
 */
export function validateLastName(rawName) {
  return validatePersonalName(rawName, 'Last name', { minLength: 1, required: true });
}

export const validateSurname = validateLastName;

/**
 * Business / Organization Name validator
 */
export function validateBusinessName(rawName, fieldLabel = 'Business name') {
  if (rawName === undefined || rawName === null) {
    return { isValid: false, error: `${fieldLabel} is required.`, normalized: '' };
  }

  const str = String(rawName);
  const trimmed = str.trim();

  if (!trimmed) {
    return { isValid: false, error: `${fieldLabel} is required.`, normalized: '' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldLabel} must be at least 2 characters.`, normalized: trimmed };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: `${fieldLabel} cannot exceed 100 characters.`, normalized: trimmed };
  }

  // Must contain at least one letter
  if (!/\p{L}/u.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} must contain at least one letter.`, normalized: trimmed };
  }

  // Must start with letter or digit
  if (/^[^\p{L}\p{N}]/u.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} must start with a letter or number.`, normalized: trimmed };
  }

  // Reject repeated consecutive punctuation
  if (/[-&,.]{2,}/.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} cannot contain repeated punctuation.`, normalized: trimmed };
  }

  const businessPattern = /^[\p{L}\p{N}\p{M}][\p{L}\p{N}\p{M}\s&.,'’/()-]*$/u;
  if (!businessPattern.test(trimmed)) {
    return { isValid: false, error: `${fieldLabel} contains invalid special characters.`, normalized: trimmed };
  }

  const normalized = trimmed.replace(/\s+/g, ' ');

  return {
    isValid: true,
    error: null,
    normalized
  };
}

export default validateName;
