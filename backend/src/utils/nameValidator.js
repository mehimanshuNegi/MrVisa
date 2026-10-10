/**
 * Backend Name Validator for NimuFly
 * Enforces strict shared name validation identical to frontend.
 */

export function validateName(rawName) {
  if (rawName === undefined || rawName === null) {
    return { isValid: false, error: 'Name is required.', normalized: '' };
  }

  const str = String(rawName);
  const trimmed = str.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Name is required.', normalized: '' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters.', normalized: trimmed };
  }

  if (trimmed.length > 70) {
    return { isValid: false, error: 'Name cannot exceed 70 characters.', normalized: trimmed };
  }

  // Reject digits
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: 'Name must not contain numbers.', normalized: trimmed };
  }

  // Reject leading punctuation / symbols / dots
  if (/^[^\p{L}]/u.test(trimmed)) {
    return { isValid: false, error: 'Name must start with a valid letter.', normalized: trimmed };
  }

  // Reject trailing punctuation / dots / hyphens / apostrophes
  if (/[^\p{L}]$/u.test(trimmed)) {
    return { isValid: false, error: 'Name cannot end with a dot or punctuation.', normalized: trimmed };
  }

  // Reject repeated consecutive separators (-- , '' , .. , -' , etc.)
  if (/[-' ]{2,}/.test(trimmed) || /\.{2,}/.test(trimmed)) {
    return { isValid: false, error: 'Name cannot contain repeated separators.', normalized: trimmed };
  }

  // Strict Unicode Name Pattern:
  const unicodeNamePattern = /^[\p{L}][\p{L}\p{M}]*(?:[ '-][\p{L}\p{M}]+)*$/u;

  if (!unicodeNamePattern.test(trimmed)) {
    return { isValid: false, error: 'Name contains invalid characters or punctuation.', normalized: trimmed };
  }

  const normalized = trimmed.replace(/\s+/g, ' ');

  return {
    isValid: true,
    error: null,
    normalized
  };
}

export default validateName;
