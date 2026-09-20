/**
 * Backwards Compatibility Data Adapter
 * Re-exports from mockVisas and mockCountries to ensure existing imports
 * continue working seamlessly while referencing the single source of truth.
 */

import { mockVisas } from './mockVisas';
import { searchCountriesList } from './mockCountries';
import { DOCUMENT_CATEGORIES } from './mockDocuments';

export const visas = mockVisas;
export const searchCountries = searchCountriesList;

export const visaTypeOptions = [
  { label: 'All Visa Types', count: 12, value: 'All Visa Types' },
  { label: 'E-Visa', count: 8, value: 'E-Visa' },
  { label: 'Tourist Visa', count: 3, value: 'Tourist Visa' },
  { label: 'Sticker Visa', count: 1, value: 'Sticker Visa' },
  { label: 'Business Visa', count: 1, value: 'Business Visa' },
  { label: 'Transit Visa', count: 1, value: 'Transit Visa' }
];

export const visaTypes = [
  'All Visa Types',
  'E-Visa',
  'Tourist Visa',
  'Sticker Visa',
  'Business Visa',
  'Transit Visa'
];

export const documentOptions = [
  { label: 'Any Documents', count: 147, value: 'Any Documents' },
  { label: 'Only Passport', count: 44, value: 'Only Passport' },
  { label: 'Passport & Bank Statements', count: 15, value: 'Passport & Bank Statements' },
  { label: 'Passport, Bank Statements & Income Tax Return', count: 43, value: 'Passport, Bank Statements & Income Tax Return' },
  { label: 'With US/UK/Schengen visa', count: 4, value: 'With US/UK/Schengen visa' }
];

export const documentFilters = DOCUMENT_CATEGORIES.map((d) => d.label);

export const travelPurposes = [
  'All Travel Purposes',
  'Tourism',
  'Business',
  'Transit'
];

export const processingTimeFilters = [
  'All Processing Times',
  '24–48 Hours',
  '3–5 Days',
  '5–7 Days',
  'Extended'
];
