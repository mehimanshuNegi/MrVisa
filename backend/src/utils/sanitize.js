/**
 * Sanitizes user input for safe usage in MongoDB regular expressions
 * Escapes regex special characters to prevent ReDoS and regex injection attacks
 */
export function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips internal/admin-only fields from Application objects for customer-facing responses
 */
export function sanitizeApplicationForCustomer(application) {
  if (!application) return null;
  const json = typeof application.toJSON === 'function' ? application.toJSON() : JSON.parse(JSON.stringify(application));
  
  // Strip internal operator notes
  delete json.adminNotes;

  // Sanitize attached documents to remove internal storage paths/keys
  if (Array.isArray(json.documents)) {
    json.documents = json.documents.map((doc) => {
      const d = typeof doc?.toJSON === 'function' ? doc.toJSON() : { ...doc };
      delete d.storageKey;
      return d;
    });
  }

  return json;
}

export default {
  escapeRegex,
  sanitizeApplicationForCustomer
};
