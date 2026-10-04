/**
 * ICAO Doc 9303 Machine Readable Zone (MRZ) Parser
 * Handles TD3 (Passport: 2 lines x 44 chars) and TD1 (ID cards: 3 lines x 30 chars).
 * Implements ICAO 9303 check digit verification, date parsing, and country code mapping.
 */

// ISO 3166-1 alpha-3 / ICAO 9303 country code mapping to common demonyms/countries
const COUNTRY_CODES = {
  IND: 'Indian',
  USA: 'American',
  GBR: 'British',
  CAN: 'Canadian',
  AUS: 'Australian',
  DEU: 'German',
  FRA: 'French',
  ITA: 'Italian',
  ESP: 'Spanish',
  ARE: 'Emirati',
  SGP: 'Singaporean',
  MYS: 'Malaysian',
  CHN: 'Chinese',
  JPN: 'Japanese',
  KOR: 'South Korean',
  NPL: 'Nepalese',
  BGD: 'Bangladeshi',
  LKA: 'Sri Lankan',
  PAK: 'Pakistani',
  NZL: 'New Zealander',
  ZAF: 'South African',
  RUS: 'Russian',
  BRA: 'Brazilian',
  MEX: 'Mexican',
  NLD: 'Dutch',
  CHE: 'Swiss',
  SWE: 'Swedish',
  NOR: 'Norwegian',
  DNK: 'Danish',
  FIN: 'Finnish',
  IRL: 'Irish',
  PRT: 'Portuguese',
  GRC: 'Greek',
  TUR: 'Turkish',
  SAU: 'Saudi',
  QAT: 'Qatari',
  KWT: 'Kuwaiti',
  OMN: 'Omani',
  BHR: 'Bahraini',
  THA: 'Thai',
  VNM: 'Vietnamese',
  IDN: 'Indonesian',
  PHL: 'Filipino',
  EGY: 'Egyptian',
  KEN: 'Kenyan',
  NGA: 'Nigerian',
  ISR: 'Israeli',
  POL: 'Polish',
  AUT: 'Austrian',
  BEL: 'Belgian',
  CZE: 'Czech',
  HUN: 'Hungarian',
  ROU: 'Romanian',
  UKR: 'Ukrainian',
  ARG: 'Argentine',
  CHL: 'Chilean',
  COL: 'Colombian',
  PER: 'Peruvian'
};

/**
 * Calculates ICAO 9303 check digit using weights [7, 3, 1]
 */
export function computeIcaoCheckDigit(str) {
  if (!str) return '0';
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    let val = 0;

    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 55; // A = 10, B = 11, etc.
    } else if (char === '<') {
      val = 0;
    } else {
      val = 0;
    }

    sum += val * weights[i % 3];
  }

  return String(sum % 10);
}

/**
 * Verifies check digit
 */
export function verifyCheckDigit(value, expectedDigit) {
  if (!expectedDigit || expectedDigit === '<') return true;
  const computed = computeIcaoCheckDigit(value);
  return computed === expectedDigit;
}

/**
 * Parses YYMMDD string to YYYY-MM-DD
 * @param {string} yymmdd 6-digit date string
 * @param {boolean} isDob Whether the date represents Date of Birth
 */
export function parseMrzDate(yymmdd, isDob = false) {
  if (!yymmdd || yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) {
    return null;
  }

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  const dd = parseInt(yymmdd.substring(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  let fullYear;
  if (isDob) {
    // If DOB year > current 2-digit year, it's 1900s; otherwise 2000s
    fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
  } else {
    // For expiry / issue dates:
    // Expiry dates are typically in future or recent past.
    // If yy <= currentYY + 30, it is 2000s, else 1900s
    fullYear = yy <= currentYY + 30 ? 2000 + yy : 1900 + yy;
  }

  const mmStr = String(mm).padStart(2, '0');
  const ddStr = String(dd).padStart(2, '0');
  return `${fullYear}-${mmStr}-${ddStr}`;
}

/**
 * Normalizes MRZ line: uppercase, replace common OCR errors
 */
export function cleanMrzLine(line) {
  if (!line) return '';
  return line
    .toUpperCase()
    .replace(/[\s\t\r\n]+/g, '')
    .replace(/«/g, '<')
    .replace(/>/g, '<')
    .replace(/\{/g, '<')
    .replace(/\}/g, '<')
    .replace(/\[/g, '<')
    .replace(/\]/g, '<')
    .replace(/\(/g, '<')
    .replace(/\)/g, '<');
}

/**
 * Locates potential MRZ lines from raw OCR text
 */
export function extractMrzLinesFromText(rawText) {
  if (!rawText) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => cleanMrzLine(l))
    .filter((l) => l.length >= 28);

  // Look for 2 consecutive TD3 lines (around 44 chars)
  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[i];
    // Line 1 of TD3 starts with P followed by < or letter
    if (/^P[A-Z0-9<]/.test(l1) && l1.length >= 40 && l1.length <= 48) {
      if (i + 1 < lines.length) {
        const l2 = lines[i + 1];
        // Line 2 has document number, dates, checksums
        if (l2.length >= 40 && l2.length <= 48) {
          // Normalize to exactly 44 chars if close
          const padL1 = l1.padEnd(44, '<').substring(0, 44);
          const padL2 = l2.padEnd(44, '<').substring(0, 44);
          return [padL1, padL2];
        }
      }
    }
  }

  // Fallback: look for any lines with high density of '<'
  const chevronLines = lines.filter((l) => (l.match(/</g) || []).length >= 3 && l.length >= 38);
  if (chevronLines.length >= 2) {
    const l1 = chevronLines[chevronLines.length - 2].padEnd(44, '<').substring(0, 44);
    const l2 = chevronLines[chevronLines.length - 1].padEnd(44, '<').substring(0, 44);
    return [l1, l2];
  }

  return [];
}

/**
 * Disambiguates OCR characters in alpha-only zones (e.g. Nationality, Names)
 */
export function fixAlphaChars(str) {
  if (!str) return '';
  return str
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B')
    .replace(/5/g, 'S')
    .replace(/2/g, 'Z');
}

/**
 * Disambiguates OCR characters in numeric-only zones (e.g. Dates, Checksums)
 */
export function fixNumericChars(str) {
  if (!str) return '';
  return str
    .replace(/O/g, '0')
    .replace(/o/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/B/g, '8')
    .replace(/S/g, '5')
    .replace(/Z/g, '2');
}

/**
 * Parses ICAO Doc 9303 TD3 (Passport) format:
 * Line 1 (44 chars):
 * Pos 0-1: Document Code ('P<')
 * Pos 2-4: Issuing State (3 chars)
 * Pos 5-43: Name (Surname<<Given names<<<<)
 *
 * Line 2 (44 chars):
 * Pos 0-8: Document Number (9 chars)
 * Pos 9: Check Digit
 * Pos 10-12: Nationality (3 chars)
 * Pos 13-18: Date of Birth (YYMMDD)
 * Pos 19: DOB Check Digit
 * Pos 20: Sex (M/F/<)
 * Pos 21-26: Expiry Date (YYMMDD)
 * Pos 27: Expiry Check Digit
 * Pos 28-41: Personal Number / Optional data
 * Pos 42: Optional Check Digit
 * Pos 43: Composite Check Digit
 */
export function parseTd3Mrz(line1, line2) {
  const l1 = line1.padEnd(44, '<').substring(0, 44);
  const l2 = line2.padEnd(44, '<').substring(0, 44);

  // 1. Issuing state & Names
  const issuingState = fixAlphaChars(l1.substring(2, 5).replace(/</g, '').trim());
  const nameSection = l1.substring(5);
  const nameParts = nameSection.split('<<');
  const surname = fixAlphaChars((nameParts[0] || '').replace(/</g, ' ').trim());
  const givenNames = fixAlphaChars((nameParts[1] || '').replace(/</g, ' ').trim());
  const fullName = [givenNames, surname].filter(Boolean).join(' ') || surname || givenNames;

  // 2. Document Number & Check Digit
  const docNumberRaw = l2.substring(0, 9);
  const docNumber = docNumberRaw.replace(/</g, '').trim();
  const docNumberCheckDigit = fixNumericChars(l2.charAt(9));
  const isDocNumberValid = verifyCheckDigit(docNumberRaw, docNumberCheckDigit);

  // 3. Nationality (Strictly 3 alpha letters)
  const rawNationalityCode = l2.substring(10, 13).replace(/</g, '').trim();
  const nationalityCode = fixAlphaChars(rawNationalityCode);
  const nationality = COUNTRY_CODES[nationalityCode] || nationalityCode || 'Indian';

  // 4. Date of Birth (Strictly 6 numeric digits)
  const dobRaw = fixNumericChars(l2.substring(13, 19));
  const dobCheckDigit = fixNumericChars(l2.charAt(19));
  const isDobValid = verifyCheckDigit(dobRaw, dobCheckDigit);
  const dateOfBirth = parseMrzDate(dobRaw, true);

  // 5. Sex / Gender
  const sexChar = l2.charAt(20).toUpperCase();
  let gender = 'Male';
  if (sexChar === 'F') gender = 'Female';
  else if (sexChar === 'M') gender = 'Male';
  else if (sexChar === 'X' || sexChar === '<') gender = 'Other';

  // 6. Expiry Date (Strictly 6 numeric digits)
  const expiryRaw = fixNumericChars(l2.substring(21, 27));
  const expiryCheckDigit = fixNumericChars(l2.charAt(27));
  const isExpiryValid = verifyCheckDigit(expiryRaw, expiryCheckDigit);
  const expiryDate = parseMrzDate(expiryRaw, false);

  // 7. Composite Check Digit (chars 0-10, 13-20, 21-43 of line 2)
  const compositeStr = l2.substring(0, 10) + l2.substring(13, 20) + l2.substring(21, 43);
  const compositeCheckDigit = fixNumericChars(l2.charAt(43));
  const isCompositeValid = verifyCheckDigit(compositeStr, compositeCheckDigit);

  // Determine Field-Level Confidence
  const fieldStatus = {
    fullName: fullName && fullName.length >= 2 ? 'HIGH' : 'MEDIUM',
    passportNumber: isDocNumberValid && docNumber.length >= 6 ? 'HIGH' : 'MEDIUM',
    dateOfBirth: isDobValid && dateOfBirth ? 'HIGH' : dateOfBirth ? 'MEDIUM' : 'LOW',
    nationality: nationalityCode ? 'HIGH' : 'MEDIUM',
    gender: ['M', 'F'].includes(sexChar) ? 'HIGH' : 'MEDIUM',
    expiryDate: isExpiryValid && expiryDate ? 'HIGH' : expiryDate ? 'MEDIUM' : 'LOW',
    issueDate: 'MISSING' // Not in MRZ, filled from VIZ or manual
  };

  return {
    format: 'TD3',
    issuingState,
    surname,
    givenNames,
    fullName,
    firstName: givenNames.split(' ')[0] || givenNames,
    lastName: surname || givenNames.split(' ').slice(1).join(' '),
    passportNumber: docNumber,
    nationality,
    nationalityCode,
    dateOfBirth,
    gender,
    expiryDate,
    checks: {
      docNumber: isDocNumberValid,
      dob: isDobValid,
      expiry: isExpiryValid,
      composite: isCompositeValid
    },
    fieldStatus
  };
}

// Common dictionary / passport label words that must NEVER be accepted as passport numbers
export const PASSPORT_NUMBER_WORD_BLACKLIST = new Set([
  'WITH', 'NAME', 'DATE', 'PLACE', 'ISSUE', 'ADDRESS', 'INDIA', 'INDIAN',
  'REPUBLIC', 'GOVERNMENT', 'MINISTRY', 'PASSPORT', 'NUMBER', 'NONE', 'NIL',
  'NA', 'NOT', 'APPLICABLE', 'PHOTO', 'SIGNATURE', 'FILE', 'DISTRICT', 'STATE',
  'COUNTRY', 'HOLDER', 'FATHER', 'MOTHER', 'SPOUSE', 'LEGAL', 'GUARDIAN',
  'PAGE', 'DIPLOMATIC', 'OFFICIAL', 'ORDINARY', 'PREVIOUS', 'OLD', 'NEW',
  'TRUE', 'FALSE', 'AND', 'THE', 'FOR', 'DE', 'DELIVRANCE', 'PASSEPORT'
]);

/**
 * Validates whether a candidate string has the characteristics of a genuine passport number.
 * Must not be in the blacklist, must not be an all-alphabet dictionary word, and must contain digits.
 */
export function isValidPassportNumberFormat(str = '') {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim().toUpperCase().replace(/[\s-]/g, '');
  if (clean.length < 6 || clean.length > 12) return false;
  if (PASSPORT_NUMBER_WORD_BLACKLIST.has(clean)) return false;

  const hasDigit = /\d/.test(clean);
  const digitCount = (clean.match(/\d/g) || []).length;
  // Passport numbers cannot be pure words; must contain digits (e.g. 4+ digits)
  if (!hasDigit || digitCount < 4) return false;

  // Standard formats: letter + 7-8 digits (e.g. P2206002), or alphanumeric with at least 5 digits
  if (/^[A-Z]{1,2}[0-9]{6,9}[A-Z0-9]?$/.test(clean)) return true;
  if (/^[A-Z0-9]{6,12}$/.test(clean) && digitCount >= 5) return true;

  return false;
}

const MONTH_MAP = {
  JAN: '01', JANU: '01', JANUARY: '01',
  FEB: '02', FEBR: '02', FEBRUARY: '02',
  MAR: '03', MARC: '03', MARCH: '03',
  APR: '04', APRI: '04', APRIL: '04',
  MAY: '05',
  JUN: '06', JUNE: '06',
  JUL: '07', JULY: '07',
  AUG: '08', AUGUST: '08',
  SEP: '09', SEPT: '09', SEPTEMBER: '09',
  OCT: '10', OCTO: '10', OCTOBER: '10',
  NOV: '11', NOVE: '11', NOVEMBER: '11',
  DEC: '12', DECE: '12', DECEMBER: '12'
};

/**
 * Parses freeform date string into normalized ISO YYYY-MM-DD
 * Supports DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MMM YYYY, and ISO strings
 */
export function parseDateString(str) {
  if (!str) return null;
  const clean = String(str).trim();

  // 14 Dec 2016 or 14-Dec-2016 or 14/DEC/2016
  const textMonthMatch = clean.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{4})$/);
  if (textMonthMatch) {
    const d = String(parseInt(textMonthMatch[1], 10)).padStart(2, '0');
    const mStr = textMonthMatch[2].toUpperCase().substring(0, 3);
    const m = MONTH_MAP[mStr];
    const y = textMonthMatch[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(clean);
  if (dmy) {
    const d = String(parseInt(dmy[1], 10)).padStart(2, '0');
    const m = String(parseInt(dmy[2], 10)).padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const ymd = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(clean);
  if (ymd) {
    const y = ymd[1];
    const m = String(parseInt(ymd[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymd[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return null;
}

/**
 * Attempts to parse date of issue from Visual Inspection Zone (VIZ) text
 * Searches for keywords like Date of Issue, Issue Date, Date de délivrance, etc.
 * Checks both same-line and next-line patterns.
 */
/**
 * Cleans extracted person name
 */
export function cleanPersonName(str) {
  if (!str) return '';
  return str
    .replace(/^[:\s/.-]+/, '')
    .replace(/[^A-Za-z\s.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Attempts to parse date of issue from Visual Inspection Zone (VIZ) text
 * Searches for keywords like Date of Issue, Issue Date, Date de délivrance, etc.
 * Checks both same-line and next-line patterns.
 */
export function extractIssueDateFromText(text = '') {
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Combined issue and expiry line (e.g. "fa/Date of Issuemic aDate xpiry")
    if (/(?:date\s+of\s+issue|issue\s+date).*?(?:e?xpir)/i.test(line)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const parsed = parseDateString(lines[j]);
        if (parsed) return parsed;
      }
    }

    // Label with value on same line
    const sameLineMatch = line.match(/(?:date\s+of\s+issue|issue\s+date|date\s+d['’]?[eé]mission|date\s+de\s+d[ée]livrance|issued\s+on|d\.o\.i\.?)[:\s]+([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4}|[0-9]{1,2}[\s/-]+[a-zA-Z]{3,9}[\s/-]+[0-9]{4})/i);
    if (sameLineMatch && sameLineMatch[1]) {
      const parsed = parseDateString(sameLineMatch[1]);
      if (parsed) return parsed;
    }

    // Label on line i, value on line i + 1
    if (
      /(?:date\s+of\s+issue|issue\s+date|date\s+de\s+d[ée]livrance|issued\s+on|d\.o\.i\.?)/i.test(line) &&
      i + 1 < lines.length
    ) {
      const nextLine = lines[i + 1];
      const parsed = parseDateString(nextLine);
      if (parsed) return parsed;

      const dateInNextLine = nextLine.match(/([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4}|[0-9]{1,2}[\s/-]+[a-zA-Z]{3,9}[\s/-]+[0-9]{4})/);
      if (dateInNextLine && dateInNextLine[1]) {
        const p = parseDateString(dateInNextLine[1]);
        if (p) return p;
      }
    }
  }

  return null;
}

/**
 * Extracts structured fields from the Visual Inspection Zone (VIZ) of passport front page.
 */
export function extractVizFieldsFromText(text = '') {
  if (!text) {
    return {
      placeOfIssue: '',
      placeOfBirth: '',
      issueDate: '',
      expiryDate: '',
      dateOfBirth: '',
      visibleDocNumber: '',
      nationality: '',
      gender: ''
    };
  }

  const cleanLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let placeOfIssue = '';
  let placeOfBirth = '';
  let issueDate = '';
  let expiryDate = '';
  let dateOfBirth = '';
  let visibleDocNumber = '';
  let nationality = '';
  let gender = '';

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    // Visible Passport Number
    if (!visibleDocNumber) {
      const docMatch = line.match(/(?:passport\s*(?:no|num|number)?[:.\s]+)([A-Z0-9]{6,12})/i);
      if (docMatch && isValidPassportNumberFormat(docMatch[1])) {
        visibleDocNumber = docMatch[1].toUpperCase();
      } else if (isValidPassportNumberFormat(line) && !line.includes('<')) {
        visibleDocNumber = line.toUpperCase();
      }
    }

    // Place of issue
    if (!placeOfIssue && /(?:place\s+of\s+issue|lieu\s+de\s+d[ée]livrance)/i.test(line)) {
      const inlineMatch = line.match(/(?:place\s+of\s+issue|lieu\s+de\s+d[ée]livrance)[:\s]+([A-Za-z\s,.-]+)/i);
      if (inlineMatch && inlineMatch[1] && cleanPersonName(inlineMatch[1]).length >= 3) {
        placeOfIssue = cleanPersonName(inlineMatch[1]);
      } else if (i + 1 < cleanLines.length) {
        for (let j = i + 1; j < Math.min(i + 3, cleanLines.length); j++) {
          const next = cleanLines[j];
          if (/(?:date|issue|expiry|mrz|p<)/i.test(next)) break;
          const cand = cleanPersonName(next);
          if (cand.length >= 3 && /^[A-Z\s,.-]+$/i.test(cand)) {
            placeOfIssue = cand;
            break;
          }
        }
      }
    }

    // Place of birth
    if (!placeOfBirth && /(?:place\s+of\s+birth|lieu\s+de\s+naissance)/i.test(line)) {
      const inlineMatch = line.match(/(?:place\s+of\s+birth|lieu\s+de\s+naissance)[:\s]+([A-Za-z\s,.-]+)/i);
      if (inlineMatch && inlineMatch[1] && cleanPersonName(inlineMatch[1]).length >= 3) {
        placeOfBirth = cleanPersonName(inlineMatch[1]);
      } else if (i + 1 < cleanLines.length) {
        const next = cleanLines[i + 1];
        const cand = cleanPersonName(next);
        if (cand.length >= 3 && !/(?:place\s+of|date|sex|nationality)/i.test(next)) {
          placeOfBirth = cand;
        }
      }
    }

    // Combined issue and expiry line (e.g. "fa/Date of Issuemic aDate xpiry")
    if ((!issueDate || !expiryDate) && /(?:date\s+of\s+issue|issue\s+date).*?(?:e?xpir)/i.test(line)) {
      const dates = [];
      for (let j = i + 1; j < Math.min(i + 4, cleanLines.length); j++) {
        const parsed = parseDateString(cleanLines[j]);
        if (parsed) dates.push(parsed);
      }
      if (dates.length >= 2) {
        if (!issueDate) issueDate = dates[0];
        if (!expiryDate) expiryDate = dates[1];
      } else if (dates.length === 1 && !issueDate) {
        issueDate = dates[0];
      }
    }

    // Standalone Issue Date
    if (!issueDate && /(?:date\s+of\s+issue|issue\s+date|date\s+de\s+d[ée]livrance|issued\s+on|d\.o\.i\.?)/i.test(line)) {
      const parsedInline = parseDateString(line);
      if (parsedInline) {
        issueDate = parsedInline;
      } else if (i + 1 < cleanLines.length) {
        const parsedNext = parseDateString(cleanLines[i + 1]);
        if (parsedNext) issueDate = parsedNext;
      }
    }

    // Standalone Expiry Date
    if (!expiryDate && /(?:date\s+of\s+expiry|expiry\s+date|date\s+d['’]?[eé]xpiration|date\s+xpir)/i.test(line)) {
      const parsedInline = parseDateString(line);
      if (parsedInline) {
        expiryDate = parsedInline;
      } else if (i + 1 < cleanLines.length) {
        const parsedNext = parseDateString(cleanLines[i + 1]);
        if (parsedNext) expiryDate = parsedNext;
      }
    }

    // Standalone Date of Birth
    if (!dateOfBirth && /(?:date\s+of\s+birth|birth\s+date|date\s+de\s+naissance|d\.o\.b\.)/i.test(line)) {
      const parsedInline = parseDateString(line);
      if (parsedInline) {
        dateOfBirth = parsedInline;
      } else {
        for (let j = i + 1; j < Math.min(i + 4, cleanLines.length); j++) {
          const parsed = parseDateString(cleanLines[j]);
          if (parsed) {
            dateOfBirth = parsed;
            break;
          }
        }
      }
    }

    // Nationality from VIZ
    if (!nationality && /(?:nationality|nationalit[ée])/i.test(line)) {
      if (/INDIAN/i.test(line) || (i + 1 < cleanLines.length && /INDIAN/i.test(cleanLines[i + 1]))) {
        nationality = 'Indian';
      }
    }

    // Gender from VIZ
    if (!gender && /(?:sex|sexe|gender)/i.test(line)) {
      if (/\b(?:m|male|masculin)\b/i.test(line) || (i + 1 < cleanLines.length && /^[MF]$/i.test(cleanLines[i + 1]))) {
        const val = /^[MF]$/i.test(cleanLines[i + 1]) ? cleanLines[i + 1].toUpperCase() : 'M';
        gender = val === 'F' ? 'Female' : 'Male';
      }
    }
  }

  return {
    placeOfIssue,
    placeOfBirth,
    issueDate,
    expiryDate,
    dateOfBirth,
    visibleDocNumber,
    nationality,
    gender
  };
}

/**
 * Detects if the image/text is a passport front / bio page.
 * Returns { isFront: boolean, reason?: string }
 */
export function detectPassportFront(ocrText = '', lines = []) {
  const textUpper = (ocrText || '').toUpperCase();
  const mrzLines = extractMrzLinesFromText(ocrText);
  const hasMrz = mrzLines.length >= 2;

  const frontKeywords = [
    'PASSPORT',
    'REPUBLIC',
    'GIVEN NAME',
    'SURNAME',
    'DATE OF BIRTH',
    'DATE OF ISSUE',
    'DATE OF EXPIRY',
    'NATIONALITY',
    'SEX',
    'PLACE OF BIRTH',
    'TYPE',
    'COUNTRY CODE',
    'PASSPORT NO',
    'P<',
    'TRAVEL DOCUMENT'
  ];

  const matchedKeywords = frontKeywords.filter((kw) => textUpper.includes(kw));

  // If it clearly has MRZ, it's definitely a front/bio page
  if (hasMrz) {
    return { isFront: true, confidence: 'HIGH', hasMrz: true };
  }

  // If text contains at least 2 key front keywords, it's a front page without clear MRZ
  if (matchedKeywords.length >= 2) {
    return { isFront: true, confidence: 'MEDIUM', hasMrz: false };
  }

  return {
    isFront: false,
    confidence: 'LOW',
    hasMrz: false,
    message: "We couldn't identify a passport page in this image."
  };
}

/**
 * Detects if the image/text is a passport back / second page.
 * Returns { isBack: boolean, reason?: string }
 */
export function detectPassportBack(ocrText = '') {
  const textUpper = (ocrText || '').toUpperCase();
  const mrzLines = extractMrzLinesFromText(ocrText);

  // If it has a standard TD3 front MRZ starting with P<, user likely re-uploaded the front page!
  if (mrzLines.length >= 2 && /^P[A-Z0-9<]/.test(mrzLines[0])) {
    return {
      isBack: false,
      confidence: 'LOW',
      message: "We couldn't identify the required passport back/second page."
    };
  }

  const backKeywords = [
    'FATHER',
    'MOTHER',
    'SPOUSE',
    'ADDRESS',
    'PIN',
    'FILE NO',
    'OLD PASSPORT',
    'EMIGRATION',
    'POLICE',
    'PLACE OF ISSUE',
    'DISTRICT',
    'GUARDIAN',
    'LEGAL GUARDIAN',
    'NOM DU PERE',
    'PARENTS'
  ];

  const matchedKeywords = backKeywords.filter((kw) => textUpper.includes(kw));

  if (matchedKeywords.length >= 1) {
    return { isBack: true, confidence: matchedKeywords.length >= 2 ? 'HIGH' : 'MEDIUM' };
  }

  return {
    isBack: false,
    confidence: 'LOW',
    message: "We couldn't identify the required passport back/second page."
  };
}

/**
 * Extracts visible passport number from VIZ (e.g. "Passport No: Z1234567")
 * Context-aware: only returns if candidate matches genuine passport number format.
 */
export function extractVisiblePassportNumber(text = '') {
  if (!text) return null;
  const match = text.match(/(?:passport\s*(?:no|num|number)?[:.\s]+)([A-Z0-9]{6,12})/i);
  if (match && match[1]) {
    const raw = match[1].replace(/[\s-]/g, '').toUpperCase();
    if (isValidPassportNumberFormat(raw)) {
      return raw;
    }
  }
  return null;
}

/**
 * Extracts information from the second/back page of passport
 * Dedicated back-page pipeline aware of labels, sections, and positions.
 */
export function extractBackPageDetails(ocrText = '') {
  if (!ocrText) {
    return {
      fatherName: '',
      motherName: '',
      spouseName: '',
      address: '',
      pinCode: '',
      fileNumber: '',
      oldPassportNumber: '',
      passportNumber: ''
    };
  }

  const cleanLines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let fatherName = '';
  let motherName = '';
  let spouseName = '';
  let fileNumber = '';
  let oldPassportNumber = '';
  let backPassportNumber = '';
  const addressLines = [];
  let inAddressSection = false;

  const fatherLabelRegex = /(?:name\s+of\s+father|father['’]?s?\s*name|nom\s+du\s+p[èe]re|legal\s+guardian|tuteur\s+l[ée]gal)/i;
  const motherLabelRegex = /(?:name\s+of\s+mother|mother['’]?s?\s*name|nom\s+de\s+la\s+m[èe]re)/i;
  const spouseLabelRegex = /(?:name\s+of\s+spouse|spouse['’]?s?\s*name|nom\s+de\s+l['’]?[\s]*[ée]poux)/i;
  const fileLabelRegex = /(?:file\s*(?:no\.?|number)|dossier\s*n[°o])/i;
  const oldPassportLabelRegex = /(?:old\s+passport\s*(?:no\.?|number)?)/i;

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    // Check perforated passport number on back page
    if (!backPassportNumber && isValidPassportNumberFormat(line)) {
      backPassportNumber = line.toUpperCase();
    }

    // Check Father
    if (!fatherName && fatherLabelRegex.test(line)) {
      const inlineMatch = line.match(/(?:father(?:\s*\/\s*legal\s+guardian)?|nom\s+du\s+p[èe]re)[:\s]+([A-Za-z\s.]+)/i);
      if (inlineMatch && inlineMatch[1] && cleanPersonName(inlineMatch[1]).length >= 3) {
        fatherName = cleanPersonName(inlineMatch[1]);
      } else {
        // Inspect subsequent lines (skip perforated passport numbers or other labels)
        for (let j = i + 1; j < Math.min(i + 4, cleanLines.length); j++) {
          const next = cleanLines[j];
          if (isValidPassportNumberFormat(next)) {
            if (!backPassportNumber) backPassportNumber = next.toUpperCase();
            continue;
          }
          if (motherLabelRegex.test(next) || spouseLabelRegex.test(next)) break;
          const candidate = cleanPersonName(next);
          if (candidate.length >= 3 && /^[A-Z\s.]+$/i.test(candidate)) {
            fatherName = candidate;
            break;
          }
        }
      }
    }

    // Check Mother
    if (!motherName && motherLabelRegex.test(line)) {
      const inlineMatch = line.match(/(?:mother|nom\s+de\s+la\s+m[èe]re)[:\s]+([A-Za-z\s.]+)/i);
      if (inlineMatch && inlineMatch[1] && cleanPersonName(inlineMatch[1]).length >= 3) {
        motherName = cleanPersonName(inlineMatch[1]);
      } else {
        for (let j = i + 1; j < Math.min(i + 3, cleanLines.length); j++) {
          const next = cleanLines[j];
          if (spouseLabelRegex.test(next) || /(?:address|adresse)/i.test(next)) break;
          const candidate = cleanPersonName(next);
          if (candidate.length >= 3 && /^[A-Z\s.]+$/i.test(candidate)) {
            motherName = candidate;
            break;
          }
        }
      }
    }

    // Check Spouse
    if (!spouseName && spouseLabelRegex.test(line)) {
      const inlineMatch = line.match(/(?:spouse|nom\s+de\s+l['’]?[\s]*[ée]poux)[:\s]+([A-Za-z\s.]+)/i);
      if (inlineMatch && inlineMatch[1] && cleanPersonName(inlineMatch[1]).length >= 3) {
        spouseName = cleanPersonName(inlineMatch[1]);
      }
    }

    // Check Address Section
    if (/(?:^|[\s/])(?:permanent\s+address|address|adresse)/i.test(line)) {
      inAddressSection = true;
      const stripped = line.replace(/.*(?:permanent\s+address|address|adresse)[:\s]*/i, '').trim();
      if (stripped.length > 2) addressLines.push(stripped);
      continue;
    }

    if (inAddressSection) {
      if (
        oldPassportLabelRegex.test(line) ||
        fileLabelRegex.test(line) ||
        /(?:emigration|police|place\s+of\s+issue)/i.test(line)
      ) {
        inAddressSection = false;
      } else {
        addressLines.push(line);
      }
    }

    // Check File No
    if (!fileNumber && fileLabelRegex.test(line)) {
      const inlineMatch = line.match(/(?:file\s*(?:no\.?|number)|dossier\s*n[°o])[:\s]*([A-Z0-9/-]{6,20})/i);
      if (inlineMatch && inlineMatch[1]) {
        const cand = inlineMatch[1].replace(/[\s]/g, '').toUpperCase();
        if (!PASSPORT_NUMBER_WORD_BLACKLIST.has(cand)) {
          fileNumber = cand;
        }
      } else if (i + 1 < cleanLines.length) {
        const next = cleanLines[i + 1].replace(/[\s]/g, '').toUpperCase();
        if (/^[A-Z0-9/-]{6,20}$/.test(next) && !PASSPORT_NUMBER_WORD_BLACKLIST.has(next)) {
          fileNumber = next;
        }
      }
    }

    // Check Old Passport
    if (!oldPassportNumber && oldPassportLabelRegex.test(line)) {
      // Avoid matching words like WITH, DATE, PLACE, ISSUE
      const stripped = line.replace(/.*(?:old\s+passport\s*(?:no\.?|number)?(?:\s+with\s+date\s+and\s+place\s+of\s+issue)?)/i, '').trim();
      if (isValidPassportNumberFormat(stripped)) {
        oldPassportNumber = stripped.toUpperCase();
      } else if (i + 1 < cleanLines.length) {
        const nextFirstWord = cleanLines[i + 1].trim().split(/\s+/)[0];
        if (isValidPassportNumberFormat(nextFirstWord)) {
          oldPassportNumber = nextFirstWord.toUpperCase();
        }
      }
    }
  }

  const address = addressLines
    .join(', ')
    .replace(/,\s*,/g, ',')
    .replace(/^[,.\s]+/, '')
    .trim();

  let pinCode = '';
  const pinMatch = address.match(/\b(?:pin|postal)?[:\s]*(\d{6})\b/i);
  if (pinMatch) pinCode = pinMatch[1];

  return {
    fatherName,
    motherName,
    spouseName,
    address,
    pinCode,
    fileNumber,
    oldPassportNumber,
    passportNumber: backPassportNumber || ''
  };
}

/**
 * Normalizes a name string for loose comparison (case, punctuation, spacing)
 */
export function normalizeName(name = '') {
  return (name || '')
    .toLowerCase()
    .replace(/^(mr|mrs|miss|ms|dr|master)\.?\s+/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares Step 1 user-entered name against passport extracted name.
 * Handles order differences (Surname First vs Given Names First).
 */
export function compareNames(enteredName = '', passportName = '') {
  const normEntered = normalizeName(enteredName);
  const normPassport = normalizeName(passportName);

  if (!normEntered || !normPassport) {
    return { isMatch: true, exact: true };
  }

  if (normEntered === normPassport) {
    return { isMatch: true, exact: true };
  }

  const enteredWords = normEntered.split(' ').sort();
  const passportWords = normPassport.split(' ').sort();

  if (enteredWords.join(' ') === passportWords.join(' ')) {
    return { isMatch: true, exact: false };
  }

  const allEnteredInPassport = enteredWords.every((w) =>
    passportWords.some((pw) => pw === w || pw.startsWith(w) || w.startsWith(pw))
  );

  if (allEnteredInPassport) {
    return { isMatch: true, exact: false };
  }

  return {
    isMatch: false,
    exact: false,
    message: "Your entered name doesn't exactly match the passport."
  };
}

/**
 * Performs consistency check across front and back passport extraction.
 * Context-aware: ONLY compares passportNumber if back contains a VERIFIED valid passport number.
 * Never creates false discrepancies from arbitrary OCR words like 'WITH'.
 */
export function checkPassportConsistency(frontData = {}, backData = {}) {
  const mismatches = [];

  // 1. Passport number check:
  // ONLY compare if backData has a valid passport number format!
  if (
    backData.passportNumber &&
    frontData.passportNumber &&
    isValidPassportNumberFormat(backData.passportNumber) &&
    isValidPassportNumberFormat(frontData.passportNumber)
  ) {
    if (backData.passportNumber.toUpperCase() !== frontData.passportNumber.toUpperCase()) {
      mismatches.push({
        field: 'passportNumber',
        label: 'Passport Number',
        frontValue: frontData.passportNumber,
        backValue: backData.passportNumber,
        message: `Passport number on front (${frontData.passportNumber}) does not match back (${backData.passportNumber}).`
      });
    }
  }

  // 2. Name check if present on back
  if (backData.fullName && frontData.fullName) {
    const comp = compareNames(backData.fullName, frontData.fullName);
    if (!comp.isMatch) {
      mismatches.push({
        field: 'fullName',
        label: 'Full Name',
        frontValue: frontData.fullName,
        backValue: backData.fullName,
        message: `Name on front (${frontData.fullName}) does not match back (${backData.fullName}).`
      });
    }
  }

  return {
    isConsistent: mismatches.length === 0,
    mismatches,
    warning: mismatches.length > 0 ? 'Some passport details could not be matched.' : null
  };
}

/**
 * Merges extracted information intelligently across MRZ, Front VIZ, and Back page.
 * Tracks { value, source, confidence } for every field.
 */
export function mergePassportFrontBack({
  frontData = {},
  backData = {},
  mrzData = null,
  userFullName = '',
  frontFieldStatus = {}
}) {
  const fields = {};

  // Passport number: 1. MRZ (HIGH), 2. Front VIZ (HIGH if valid format), 3. Back (MEDIUM if valid format)
  let passportNumberVal = '';
  let passportNumberSource = 'MISSING';
  let passportNumberConf = 'MISSING';

  if (mrzData?.passportNumber && isValidPassportNumberFormat(mrzData.passportNumber)) {
    passportNumberVal = mrzData.passportNumber;
    passportNumberSource = 'MRZ';
    passportNumberConf = 'HIGH';
  } else if (frontData.passportNumber && isValidPassportNumberFormat(frontData.passportNumber)) {
    passportNumberVal = frontData.passportNumber;
    passportNumberSource = 'FRONT_PAGE_VIZ';
    passportNumberConf = frontFieldStatus.passportNumber || 'HIGH';
  } else if (frontData.visibleDocNumber && isValidPassportNumberFormat(frontData.visibleDocNumber)) {
    passportNumberVal = frontData.visibleDocNumber;
    passportNumberSource = 'FRONT_PAGE_VIZ';
    passportNumberConf = 'HIGH';
  } else if (backData.passportNumber && isValidPassportNumberFormat(backData.passportNumber)) {
    passportNumberVal = backData.passportNumber;
    passportNumberSource = 'BACK_PAGE_LABEL';
    passportNumberConf = 'MEDIUM';
  }

  fields.passportNumber = {
    value: passportNumberVal,
    source: passportNumberSource,
    confidence: passportNumberConf
  };

  // Full Name
  const nameVal = mrzData?.fullName || frontData.fullName || userFullName || '';
  const nameSource = mrzData?.fullName ? 'MRZ' : frontData.fullName ? 'FRONT_PAGE_VIZ' : userFullName ? 'USER_INPUT' : 'MISSING';
  const nameConf = mrzData?.fullName ? 'HIGH' : frontFieldStatus.fullName || (frontData.fullName ? 'HIGH' : userFullName ? 'MEDIUM' : 'MISSING');

  fields.fullName = { value: nameVal, source: nameSource, confidence: nameConf };
  fields.firstName = { value: mrzData?.firstName || frontData.firstName || (nameVal ? nameVal.split(' ')[0] : ''), source: nameSource, confidence: nameConf };
  fields.lastName = { value: mrzData?.lastName || frontData.lastName || (nameVal ? nameVal.split(' ').slice(1).join(' ') : ''), source: nameSource, confidence: nameConf };

  // Date of Birth
  const dobVal = mrzData?.dateOfBirth || frontData.dateOfBirth || '';
  const dobConf = mrzData?.checks?.dob || (mrzData?.dateOfBirth && frontData.dateOfBirth && mrzData.dateOfBirth === frontData.dateOfBirth)
    ? 'HIGH'
    : frontFieldStatus.dateOfBirth || (dobVal ? 'HIGH' : 'MISSING');

  fields.dateOfBirth = {
    value: dobVal,
    source: mrzData?.dateOfBirth ? 'MRZ' : frontData.dateOfBirth ? 'FRONT_PAGE_VIZ' : 'MISSING',
    confidence: dobConf
  };

  // Expiry Date
  const expVal = mrzData?.expiryDate || frontData.expiryDate || '';
  const expConf = mrzData?.checks?.expiry || (mrzData?.expiryDate && frontData.expiryDate && mrzData.expiryDate === frontData.expiryDate)
    ? 'HIGH'
    : frontFieldStatus.expiryDate || (expVal ? 'HIGH' : 'MISSING');

  fields.expiryDate = {
    value: expVal,
    source: mrzData?.expiryDate ? 'MRZ' : frontData.expiryDate ? 'FRONT_PAGE_VIZ' : 'MISSING',
    confidence: expConf
  };

  // Issue Date / passportIssuedOn (MRZ does not have it, VIZ is primary source)
  const issueVal = frontData.issueDate || frontData.passportIssuedOn || backData.issueDate || '';
  const issueConf = frontFieldStatus.issueDate || (issueVal ? 'HIGH' : 'MISSING');
  fields.issueDate = {
    value: issueVal,
    source: issueVal ? 'FRONT_PAGE_VIZ' : 'MISSING',
    confidence: issueConf
  };
  fields.passportIssuedOn = fields.issueDate;

  // Place of Issue
  const placeOfIssueVal = frontData.placeOfIssue || backData.placeOfIssue || '';
  const placeConf = frontFieldStatus.placeOfIssue || (placeOfIssueVal ? 'HIGH' : 'MISSING');
  fields.placeOfIssue = {
    value: placeOfIssueVal,
    source: placeOfIssueVal ? (frontData.placeOfIssue ? 'FRONT_PAGE_VIZ' : 'BACK_PAGE_LABEL') : 'MISSING',
    confidence: placeConf
  };

  // Nationality
  const natVal = mrzData?.nationality || frontData.nationality || 'Indian';
  fields.nationality = {
    value: natVal,
    source: mrzData?.nationality ? 'MRZ' : 'FRONT_PAGE_VIZ',
    confidence: mrzData?.nationality ? 'HIGH' : frontFieldStatus.nationality || 'HIGH'
  };

  // Gender
  const genVal = mrzData?.gender || frontData.gender || 'Male';
  fields.gender = {
    value: genVal,
    source: mrzData?.gender ? 'MRZ' : 'FRONT_PAGE_VIZ',
    confidence: mrzData?.gender ? 'HIGH' : frontFieldStatus.gender || 'HIGH'
  };

  // Back page items
  fields.fatherName = {
    value: backData.fatherName || '',
    source: backData.fatherName ? 'BACK_PAGE_LABEL' : 'MISSING',
    confidence: backData.fatherName ? 'HIGH' : 'MISSING'
  };
  fields.motherName = {
    value: backData.motherName || '',
    source: backData.motherName ? 'BACK_PAGE_LABEL' : 'MISSING',
    confidence: backData.motherName ? 'HIGH' : 'MISSING'
  };
  fields.spouseName = {
    value: backData.spouseName || '',
    source: backData.spouseName ? 'BACK_PAGE_LABEL' : 'MISSING',
    confidence: backData.spouseName ? 'HIGH' : 'MISSING'
  };
  fields.address = {
    value: backData.address || '',
    source: backData.address ? 'BACK_PAGE_LABEL' : 'MISSING',
    confidence: backData.address ? 'HIGH' : 'MISSING'
  };
  fields.fileNumber = {
    value: backData.fileNumber || '',
    source: backData.fileNumber ? 'BACK_PAGE_LABEL' : 'MISSING',
    confidence: backData.fileNumber ? 'HIGH' : 'MISSING'
  };

  const extractedData = {
    fullName: fields.fullName.value,
    firstName: fields.firstName.value,
    lastName: fields.lastName.value,
    passportNumber: fields.passportNumber.value,
    dateOfBirth: fields.dateOfBirth.value,
    nationality: fields.nationality.value,
    gender: fields.gender.value,
    issueDate: fields.issueDate.value,
    passportIssuedOn: fields.issueDate.value,
    expiryDate: fields.expiryDate.value,
    placeOfIssue: fields.placeOfIssue.value,
    fatherName: fields.fatherName.value,
    motherName: fields.motherName.value,
    spouseName: fields.spouseName.value,
    address: fields.address.value,
    fileNumber: fields.fileNumber.value
  };

  const fieldStatus = {};
  for (const [key, fieldObj] of Object.entries(fields)) {
    fieldStatus[key] = fieldObj.confidence || (fieldObj.value ? 'MEDIUM' : 'MISSING');
  }

  return {
    fields,
    extractedData,
    fieldStatus
  };
}

/**
 * Convenience helper to extract and parse MRZ lines
 */
export function parseMrz(ocrText = '') {
  const mrzLines = extractMrzLinesFromText(ocrText);
  if (mrzLines.length >= 2) {
    return parseTd3Mrz(mrzLines[0], mrzLines[1]);
  }
  return null;
}


