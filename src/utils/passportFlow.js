/**
 * Format-Dependent Passport Upload Flow Resolver
 * 
 * Rules:
 * 1. PDF (application/pdf / .pdf):
 *    - Treated as a complete passport document.
 *    - Bypasses all flip/back-side upload prompts.
 *    - Directly transitions from processing to review/autofill.
 * 2. Images (JPG, JPEG, PNG, WEBP):
 *    - Two-stage flow preserved: Front -> Ask to Flip -> Back -> Review.
 */

/**
 * Determines whether the uploaded passport file is a PDF or an Image
 * @param {File|Object} file - Browser File or object with type and name
 * @returns {'pdf'|'image'}
 */
export function determinePassportUploadFlow(file) {
  if (!file) return 'image';
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();

  const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
  return isPdf ? 'pdf' : 'image';
}

/**
 * Convenience helper to test if file is PDF
 * @param {File|Object} file
 * @returns {boolean}
 */
export function isPdfPassport(file) {
  return determinePassportUploadFlow(file) === 'pdf';
}

/**
 * Resolves the next navigation step after front passport upload/OCR
 * @param {Object} params
 * @param {'pdf'|'image'} params.flow
 * @param {boolean} [params.wrongPage]
 * @param {boolean} [params.qualityFailed]
 * @param {boolean} [params.ocrSuccess]
 * @returns {'passport_upload'|'passport_review'|'passport_back_upload'}
 */
export function getNextPassportStep({ flow, wrongPage = false, qualityFailed = false, ocrSuccess = true }) {
  // If critically unreadable or wrong document type, stay on upload step to show error
  if (wrongPage || qualityFailed) {
    return 'passport_upload';
  }

  // When uploading a PDF, always proceed directly to review/autofill step.
  // Never show "flip passport" or "upload back side" prompt for PDFs!
  if (flow === 'pdf') {
    return 'passport_review';
  }

  // Images continue the two-stage flow: flip passport to back side
  return 'passport_back_upload';
}

/**
 * Verifies whether the back-side upload screen should be shown
 * @param {File|Object} file - Current passport file
 * @param {string} currentStep - Current step name
 * @returns {boolean}
 */
export function shouldShowBackUploadStep(file, currentStep) {
  if (currentStep !== 'passport_back_upload') return false;
  // Strictly prevent PDF from showing back-side upload screen
  if (isPdfPassport(file)) return false;
  return true;
}
