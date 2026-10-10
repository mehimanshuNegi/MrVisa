/**
 * Email Syntax & Structure Validator for NimuFly
 *
 * Requirements:
 * - Validate whether an entered email has a reasonable, correctly formatted email structure.
 * - Accept valid addresses: user@gmail.com, name@yahoo.com, person@outlook.com, custom domains.
 * - Reject malformed addresses: user@gmail, user@gmail.con, user@gmail.vov, user@@gmail.com, spaces, missing parts.
 * - Detect common domain typos without rejecting legitimate email providers or custom domains.
 * - Syntax validation only: does NOT claim that the mailbox exists or can receive emails.
 */

// Well-known domain typos mapped to their intended domain
const COMMON_DOMAIN_TYPOS = {
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'yahoo.con': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'ymail.con': 'ymail.com',
  'outlook.con': 'outlook.com',
  'outlok.com': 'outlook.com',
  'hotmail.con': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'icloud.con': 'icloud.com'
};

// Known typo / invalid TLD extensions
const INVALID_TLD_TYPOS = {
  con: 'Did you mean ".com"?',
  cmo: 'Did you mean ".com"?',
  coom: 'Did you mean ".com"?',
  cpm: 'Did you mean ".com"?',
  comm: 'Did you mean ".com"?',
  ccom: 'Did you mean ".com"?',
  col: 'Did you mean ".com"?',
  come: 'Did you mean ".com"?',
  xom: 'Did you mean ".com"?',
  vov: 'Invalid domain extension ".vov". Please check your email address.',
  cm: 'Did you mean ".com"?'
};

// Recognized standard TLD set covering popular gTLDs, new gTLDs, and 2-letter ccTLDs
const COMMON_VALID_GTLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'io', 'ai', 'co',
  'me', 'dev', 'app', 'tech', 'store', 'online', 'agency', 'global', 'cloud', 'travel',
  'club', 'live', 'life', 'site', 'world', 'pro', 'ltd', 'inc', 'xyz', 'mobi', 'name',
  'asia', 'aero', 'coop', 'museum', 'design', 'media', 'digital', 'guru', 'expert',
  'solutions', 'services', 'center', 'company', 'network', 'systems', 'group', 'team',
  'today', 'space', 'website', 'press', 'news', 'studio', 'top', 'vip', 'work', 'zone',
  'link', 'click', 'help', 'shop', 'law', 'health', 'art', 'eco', 'bio', 'bank',
  'finance', 'capital', 'fund', 'legal', 'security', 'email', 'chat', 'social', 'direct',
  'express', 'support', 'guide', 'events', 'trade', 'market', 'host', 'pub', 'care',
  'fitness', 'estate', 'tours', 'flights', 'voyage', 'vacations', 'rentals', 'auto', 'cars'
]);

/**
 * Validates the structure and format of an email address.
 *
 * @param {string} rawEmail - Email address to validate
 * @param {Object} [options]
 * @param {boolean} [options.required=true] - Whether the field is mandatory
 * @returns {{ isValid: boolean, error: string|null, normalized: string, typoSuggestion?: string }}
 */
export function validateEmail(rawEmail, { required = true } = {}) {
  if (rawEmail === undefined || rawEmail === null) {
    if (!required) return { isValid: true, error: null, normalized: '' };
    return { isValid: false, error: 'Email address is required.', normalized: '' };
  }

  const str = String(rawEmail).trim();

  if (!str) {
    if (!required) return { isValid: true, error: null, normalized: '' };
    return { isValid: false, error: 'Email address is required.', normalized: '' };
  }

  // Reject spaces anywhere in the address
  if (/\s/.test(str)) {
    return { isValid: false, error: 'Email address cannot contain spaces.', normalized: str };
  }

  // Must have exactly one '@' symbol
  const atParts = str.split('@');
  if (atParts.length === 1) {
    return { isValid: false, error: 'Email address is missing "@" symbol.', normalized: str };
  }
  if (atParts.length > 2) {
    return { isValid: false, error: 'Email address cannot contain multiple "@" symbols.', normalized: str };
  }

  const [localPart, domainPart] = atParts;

  // Validate local part (before @)
  if (!localPart) {
    return { isValid: false, error: 'Email username is missing before "@".', normalized: str };
  }
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email username cannot exceed 64 characters.', normalized: str };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, error: 'Email username cannot start or end with a dot.', normalized: str };
  }
  if (/\.{2,}/.test(localPart)) {
    return { isValid: false, error: 'Email username cannot contain consecutive dots.', normalized: str };
  }
  // Standard RFC 5322 characters for local part
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
    return { isValid: false, error: 'Email username contains invalid characters.', normalized: str };
  }

  // Validate domain part (after @)
  if (!domainPart) {
    return { isValid: false, error: 'Email domain is missing after "@".', normalized: str };
  }
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { isValid: false, error: 'Email domain cannot start or end with a dot.', normalized: str };
  }
  if (/\.{2,}/.test(domainPart)) {
    return { isValid: false, error: 'Email domain cannot contain consecutive dots.', normalized: str };
  }

  // Domain must contain at least one dot separating domain name and TLD
  if (!domainPart.includes('.')) {
    return {
      isValid: false,
      error: 'Email domain must include an extension (e.g., .com, .org).',
      normalized: str
    };
  }

  const domainLower = domainPart.toLowerCase();

  // Check common domain typos
  if (COMMON_DOMAIN_TYPOS[domainLower]) {
    const suggested = COMMON_DOMAIN_TYPOS[domainLower];
    return {
      isValid: false,
      error: `Invalid domain "${domainPart}". Did you mean "${localPart}@${suggested}"?`,
      normalized: str,
      typoSuggestion: `${localPart}@${suggested}`
    };
  }

  const labels = domainLower.split('.');
  for (const label of labels) {
    if (!label) {
      return { isValid: false, error: 'Email domain contains empty segment.', normalized: str };
    }
    if (label.length > 63) {
      return { isValid: false, error: 'Email domain segment is too long.', normalized: str };
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)) {
      return { isValid: false, error: 'Email domain contains invalid characters or leading/trailing hyphens.', normalized: str };
    }
  }

  // Validate TLD (the final extension label)
  const tld = labels[labels.length - 1];

  if (tld.length < 2) {
    return { isValid: false, error: 'Email domain extension must be at least 2 characters.', normalized: str };
  }
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: 'Email domain extension must contain only letters.', normalized: str };
  }

  // Check known typo extensions
  if (INVALID_TLD_TYPOS[tld]) {
    return {
      isValid: false,
      error: INVALID_TLD_TYPOS[tld],
      normalized: str
    };
  }

  // TLD validation: 2-letter ISO ccTLD (e.g. in, us, uk, de, fr, ca, au) or recognized gTLD
  const is2LetterCcTld = tld.length === 2 && /^[a-z]{2}$/.test(tld);
  const isRecognizedGTLD = COMMON_VALID_GTLDS.has(tld);

  // If TLD is 3 or more letters and not recognized, check if it looks like an obvious typo or random letters (e.g., vov)
  if (!is2LetterCcTld && !isRecognizedGTLD) {
    if (tld.length <= 4 && !/^(?:net|org|com|gov|mil|edu|int|biz|xyz|app|dev|pro|pub|top|vip|art|bio|eco|law)$/.test(tld)) {
      return {
        isValid: false,
        error: `Invalid or unrecognized domain extension ".${tld}". Please check your email address.`,
        normalized: str
      };
    }
  }

  const normalized = `${localPart}@${domainLower}`;

  return {
    isValid: true,
    error: null,
    normalized
  };
}

export default validateEmail;
