/**
 * Core Domain Entities & Schemas
 * Standard structure for all entities across NimuFly
 * Ready for future Database and Backend API mapping
 */

import { APPLICATION_STATUS, REQUIRED_ACTION } from './status';

/**
 * Creates a normalized Visa entity
 */
export function createVisa({
  id,
  countryId,
  countryName,
  displayName,
  visaType = 'E-Visa',
  description = '',
  shortDescription = '',
  price = '₹0',
  validity = '30 Days',
  stayPeriod = '30 Days',
  entryType = 'Single Entry',
  processingTime = '24–48 Hours',
  guaranteedDate = '',
  availability = 'Available',
  documentCategory = 'Only Passport',
  documentsSummary = 'Passport, Photo',
  travelPurpose = 'Tourism',
  documents = [],
  requirements = [],
  faqs = [],
  image = '',
  flagUrl = '',
  flagEmoji = '🌍',
  status = 'ACTIVE'
}) {
  return {
    id,
    countryId: countryId || id,
    countryName: countryName || displayName || id,
    displayName: displayName || countryName || id,
    country: (countryName || displayName || id).toUpperCase(),
    visaType,
    description: description || shortDescription,
    shortDescription: shortDescription || description,
    price,
    fees: price, // compatibility alias
    validity,
    stayPeriod,
    entryType,
    processingTime,
    guaranteedDate,
    availability,
    documentCategory,
    documentsSummary,
    travelPurpose,
    documentsRequired: documents,
    documents,
    requirements,
    faqs,
    image,
    flagUrl,
    flagEmoji,
    status
  };
}

/**
 * Creates a normalized Country entity
 */
export function createCountry({
  id,
  name,
  code,
  flagEmoji = '🌍',
  flagUrl = '',
  image = '',
  description = '',
  visas = []
}) {
  return {
    id,
    name,
    displayName: name,
    code,
    flag: flagEmoji,
    flagEmoji,
    flagUrl,
    image,
    description,
    visas
  };
}

/**
 * Creates a normalized Application entity
 */
export function createApplication({
  id,
  userId = 'usr_guest_01',
  visaId,
  countryId,
  countryName,
  destination,
  flagEmoji = '🌍',
  visaType = 'E-Visa',
  travellerCount = 1,
  travellers = [],
  documents = [],
  submittedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  submittedAt = new Date().toISOString(),
  status = APPLICATION_STATUS.APPLICATION_RECEIVED,
  amountPaid = '₹0',
  amount = '₹0',
  expectedDate = '',
  adminMessage = '',
  requiredAction = REQUIRED_ACTION.NONE,
  visaDocNumber = '',
  validUntil = '',
  entryType = '',
  timeline = []
}) {
  return {
    id,
    userId,
    visaId: visaId || countryId,
    countryId: countryId || visaId,
    countryName: countryName || destination,
    destination: destination || countryName,
    flagEmoji,
    visaType,
    travellerCount: travellers.length > 0 ? travellers.length : travellerCount,
    travellers,
    documents,
    submittedDate,
    submittedAt,
    status,
    amountPaid: amountPaid || amount,
    amount: amount || amountPaid,
    expectedDate,
    adminMessage,
    requiredAction,
    visaDocNumber,
    validUntil,
    entryType,
    timeline
  };
}

/**
 * Creates a normalized Traveller entity
 */
export function createTraveller({
  id,
  firstName = '',
  lastName = '',
  name = '',
  dateOfBirth = '',
  dob = '',
  gender = 'Male',
  nationality = 'Indian',
  passportNumber = '',
  passportExpiry = '',
  expiryDate = '',
  passportIssueDate = '',
  issueDate = '',
  placeOfIssue = '',
  email = '',
  phone = '',
  documents = []
}) {
  const resolvedName = name || `${firstName} ${lastName}`.trim();
  return {
    id: id || `trav_${Math.random().toString(36).substr(2, 9)}`,
    firstName: firstName || resolvedName.split(' ')[0] || '',
    lastName: lastName || resolvedName.split(' ').slice(1).join(' ') || '',
    name: resolvedName,
    dateOfBirth: dateOfBirth || dob,
    dob: dob || dateOfBirth,
    gender,
    nationality,
    passportNumber,
    passportExpiry: passportExpiry || expiryDate,
    expiryDate: expiryDate || passportExpiry,
    passportIssueDate: passportIssueDate || issueDate,
    issueDate: issueDate || passportIssueDate,
    placeOfIssue,
    email,
    phone,
    documents
  };
}

/**
 * Creates a normalized User Profile entity
 */
export function createUserProfile({
  id = 'usr_guest_01',
  firstName = 'Rahul',
  lastName = 'Sharma',
  email = 'rahul.sharma@example.com',
  phone = '9876543210',
  nationality = 'Indian'
}) {
  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    phone,
    nationality
  };
}
