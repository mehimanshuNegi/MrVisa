/**
 * Centralized Document Requirement Definitions
 * Standard templates used across visa products and document upload steps
 */

export const STANDARD_DOCUMENTS = Object.freeze({
  PASSPORT_FRONT_BACK: {
    id: 'passport-bio-address',
    name: 'Passport Front & Back',
    description: 'Clear color scan of first (bio) page and last (address) page.',
    detail: 'Valid for at least 6 months with 2 blank pages.',
    category: 'IDENTITY',
    allowedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 10,
    required: true
  },
  PASSPORT_PHOTO: {
    id: 'passport-photo',
    name: 'Passport-Size Photograph',
    description: 'Recent color photograph with plain white background.',
    detail: 'White background colored photo taken within 6 months, 35mm x 45mm.',
    category: 'PHOTOGRAPH',
    allowedFormats: ['JPG', 'PNG'],
    maxSizeMb: 5,
    required: true
  },
  FLIGHT_TICKET: {
    id: 'flight-ticket',
    name: 'Confirmed Return Flight Ticket',
    description: 'Round-trip or onward air ticket showing entry and exit dates.',
    detail: 'Confirmed airline booking with valid PNR.',
    category: 'TRAVEL',
    allowedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 10,
    required: false
  },
  HOTEL_BOOKING: {
    id: 'hotel-booking',
    name: 'Hotel Accommodation',
    description: 'Confirmed hotel reservations or host invitation letter.',
    detail: 'Matching applicant travel dates.',
    category: 'ACCOMMODATION',
    allowedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 10,
    required: false
  },
  BANK_STATEMENT: {
    id: 'bank-statement',
    name: 'Bank Statement (Last 6 Months)',
    description: 'Original bank statement with official seal/stamp or net-banking certified statement.',
    detail: 'Showing sufficient funds for your stay.',
    category: 'FINANCIAL',
    allowedFormats: ['PDF'],
    maxSizeMb: 15,
    required: false
  },
  TRAVEL_INSURANCE: {
    id: 'travel-insurance',
    name: 'Overseas Travel Insurance',
    description: 'Valid medical and travel insurance policy.',
    detail: 'Minimum €30,000 medical coverage across destination.',
    category: 'INSURANCE',
    allowedFormats: ['PDF'],
    maxSizeMb: 10,
    required: false
  }
});

export const DOCUMENT_CATEGORIES = [
  { id: 'all', label: 'Any Documents', value: 'Any Documents' },
  { id: 'passport-only', label: 'Only Passport', value: 'Only Passport' },
  { id: 'passport-bank', label: 'Passport & Bank Statements', value: 'Passport & Bank Statements' },
  { id: 'passport-bank-itr', label: 'Passport, Bank Statements & Income Tax Return', value: 'Passport, Bank Statements & Income Tax Return' },
  { id: 'schengen-us', label: 'With US/UK/Schengen visa', value: 'With US/UK/Schengen visa' }
];
