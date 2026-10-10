/**
 * Centralized Travel Support & Business Contact Configuration
 *
 * Requirements:
 * - Only publish confirmed business details present in project or deployment environment.
 * - Never invent phone numbers, email addresses, or office coordinates.
 * - If a value is missing from environment/deployment configuration, mark it as null
 *   and keep that contact action unconfigured until real details are supplied.
 */

export const SUPPORT_CONFIG = {
  // Confirmed support email in project
  email: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_EMAIL) || 'support@nimufly.com',

  // Unconfigured until supplied in deployment environment (VITE_SUPPORT_PHONE)
  phone: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_PHONE) || null,
  displayPhone: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_PHONE) || null,

  // Office & Maps details (unconfigured until supplied via VITE_SUPPORT_OFFICE_ADDRESS / VITE_SUPPORT_MAPS_URL)
  officeName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_OFFICE_NAME) || 'NimuFly Support',
  officeAddress: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_OFFICE_ADDRESS) || null,
  mapsUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPPORT_MAPS_URL) || null,

  workingHours: 'Mon – Sat, 9:00 AM – 7:00 PM IST'
};

export default SUPPORT_CONFIG;
