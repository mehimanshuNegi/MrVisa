/**
 * Date Validation Utility
 * Enforces strict passport/document issue and expiry date business rules:
 * - expiryDate must be strictly AFTER issueDate
 * - expiryDate must be strictly BEFORE addYears(issueDate, 10) (strict calendar arithmetic)
 *
 * Examples:
 * Issue: 15-11-2025 -> Max allowed expiry: 14-11-2035
 * 14-11-2035 -> VALID
 * 15-11-2035 -> INVALID
 * 16-11-2035 -> INVALID
 */

/**
 * Parses date from various input formats:
 * - Date object
 * - YYYY-MM-DD or YYYY/MM/DD
 * - DD-MM-YYYY or DD/MM/YYYY
 * - ISO string
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  const str = String(dateInput).trim();

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(str);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const date = new Date(y, m, d);
    if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
      return date;
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(str);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10) - 1;
    const y = parseInt(dmy[3], 10);
    const date = new Date(y, m, d);
    if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
      return date;
    }
  }

  // Alphanumeric month e.g. 14-DEC-2016 or 14 Dec 2016 or 14/DEC/2016
  const alphaMatch = /^(\d{1,2})[\s/.-]+([A-Za-z]{3,9})[\s/.-]+(\d{4})$/.exec(str);
  if (alphaMatch) {
    const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const mStr = alphaMatch[2].toUpperCase().substring(0, 3);
    if (months[mStr] !== undefined) {
      const d = parseInt(alphaMatch[1], 10);
      const m = months[mStr];
      const y = parseInt(alphaMatch[3], 10);
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        return date;
      }
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

/**
 * Adds exact calendar years to a date.
 * Accurately handles leap years (e.g. Feb 29 + 10 years -> Feb 28 in non-leap year).
 */
export function addYearsCalendar(dateInput, yearsToAdd) {
  const d = parseDate(dateInput);
  if (!d) return null;

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const targetYear = year + yearsToAdd;
  const target = new Date(targetYear, month, day);

  // If month rolled over (e.g. Feb 29 in leap year rolled to Mar 1 in non-leap year)
  if (target.getMonth() !== month) {
    // Return last day of original month
    return new Date(targetYear, month + 1, 0, 0, 0, 0, 0);
  }

  return target;
}

/**
 * Validates passport/document issue and expiry date pair:
 * 1. Expiry must be after Issue date.
 * 2. Expiry must be strictly LESS THAN addYears(issueDate, 10).
 *
 * @param {string|Date} issueDateInput
 * @param {string|Date} expiryDateInput
 * @returns {{ isValid: boolean, error: string|null }}
 */
/**
 * Validates passport issue date:
 * - Cannot be in future
 * - Must be valid calendar date
 */
export function validatePassportIssueDate(issueDateInput) {
  const issue = parseDate(issueDateInput);
  if (!issue) {
    return {
      isValid: false,
      error: 'Passport issue date appears invalid. Please review it.'
    };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (issue > today) {
    return {
      isValid: false,
      error: 'Passport issue date appears invalid. Please review it.'
    };
  }

  return { isValid: true, error: null, date: issue };
}

/**
 * Validates passport/document issue and expiry date pair:
 * 1. Issue date cannot be in the future.
 * 2. Expiry must be strictly AFTER issue date.
 * 3. STRICT 10-YEAR RULE: Expiry date cannot be more than 10 years after the issue date.
 *    The maximum permitted date is exactly: issueDate + 10 years - 1 day.
 *
 * @param {string|Date} issueDateInput
 * @param {string|Date} expiryDateInput
 * @returns {{ isValid: boolean, error: string|null, maxPermittedExpiry?: string }}
 */
export function validatePassportDates(issueDateInput, expiryDateInput) {
  if (!issueDateInput || !expiryDateInput) {
    return {
      isValid: false,
      error: 'Both issue date and expiry date are required.'
    };
  }

  const issueCheck = validatePassportIssueDate(issueDateInput);
  if (!issueCheck.isValid) {
    return issueCheck;
  }
  const issue = issueCheck.date;

  const expiry = parseDate(expiryDateInput);
  if (!expiry) {
    return {
      isValid: false,
      error: 'Please enter a valid passport expiry date.'
    };
  }

  // Must be after issue date (cannot be equal to or earlier than issue date)
  if (expiry.getTime() <= issue.getTime()) {
    return {
      isValid: false,
      error: 'Document expiry date must be after the issue date.'
    };
  }

  // Strict 10-year rule: max permitted date is exactly issueDate + 10 years - 1 day
  // That means expiry < addYearsCalendar(issue, 10).
  const tenYearsLimit = addYearsCalendar(issue, 10);
  if (expiry.getTime() >= tenYearsLimit.getTime()) {
    return {
      isValid: false,
      error: 'Passport validity exceeds the allowed 10-year period. Please verify the issue and expiry dates.'
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Calculates remaining passport validity in months from travel date (or current date)
 */
export function calculateRemainingValidityMonths(expiryDateInput, fromDateInput = new Date()) {
  const expiry = parseDate(expiryDateInput);
  const fromDate = parseDate(fromDateInput) || new Date();
  if (!expiry) return 0;

  const diffTime = expiry.getTime() - fromDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(diffDays / 30.4375));
}

/**
 * Validates minimum passport validity (default 6 months)
 */
export function validateMinimumPassportValidity(
  expiryDateInput,
  travelDateInput = null,
  requiredMonths = 6
) {
  const expiry = parseDate(expiryDateInput);
  if (!expiry) {
    return {
      isValid: false,
      warning: 'Please verify your passport expiry date.'
    };
  }

  const refDate = parseDate(travelDateInput) || new Date();
  const monthsRemaining = calculateRemainingValidityMonths(expiry, refDate);

  if (monthsRemaining < requiredMonths) {
    return {
      isValid: false,
      monthsRemaining,
      requiredMonths,
      warning: `Your passport needs to be valid for at least ${requiredMonths} months from your travel date.`
    };
  }

  return {
    isValid: true,
    monthsRemaining,
    requiredMonths,
    warning: null
  };
}

/**
 * Calculates exact age in years from Date of Birth
 */
export function calculateAge(dobInput, refDateInput = new Date()) {
  const dob = parseDate(dobInput);
  if (!dob) return null;

  const refDate = parseDate(refDateInput) || new Date();
  let age = refDate.getFullYear() - dob.getFullYear();
  const m = refDate.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && refDate.getDate() < dob.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Validates Date of Birth (cannot be in future, must be valid)
 */
export function validateDateOfBirth(dobInput) {
  const dob = parseDate(dobInput);
  if (!dob) {
    return { isValid: false, error: 'Please enter a valid date of birth.' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dob > today) {
    return { isValid: false, error: 'Date of birth cannot be in the future.' };
  }

  const age = calculateAge(dob);
  return { isValid: true, age, error: null };
}

/**
 * Checks age eligibility against optional visa restrictions
 */
export function validateAgeEligibility(dobInput, minAge = null, maxAge = null) {
  let min = minAge;
  let max = maxAge;
  if (minAge && typeof minAge === 'object') {
    min = minAge.minimumAge ?? minAge.minAge ?? null;
    max = minAge.maximumAge ?? minAge.maxAge ?? null;
  }

  const dobCheck = validateDateOfBirth(dobInput);
  if (!dobCheck.isValid) return dobCheck;

  const age = dobCheck.age;

  if (min !== null && min !== undefined && age < min) {
    return {
      isValid: false,
      age,
      error: `Applicant must be at least ${min} years old for this visa category.`
    };
  }

  if (max !== null && max !== undefined && age > max) {
    return {
      isValid: false,
      age,
      error: `Applicant age (${age} years) exceeds the maximum allowed age of ${max} years.`
    };
  }

  return { isValid: true, age, error: null };
}

