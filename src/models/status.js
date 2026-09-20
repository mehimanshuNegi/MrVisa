/**
 * Application Status and Action Constants
 * Centralized configuration for all application lifecycle states
 */

export const APPLICATION_STATUS = Object.freeze({
  APPLICATION_RECEIVED: 'APPLICATION_RECEIVED',
  DOCUMENTS_UNDER_REVIEW: 'DOCUMENTS_UNDER_REVIEW',
  PROCESSING: 'PROCESSING',
  ADDITIONAL_INFORMATION_REQUIRED: 'ADDITIONAL_INFORMATION_REQUIRED',
  APPROVED: 'APPROVED',
  VISA_ISSUED: 'VISA_ISSUED',
  COMPLETED: 'COMPLETED'
});

export const REQUIRED_ACTION = Object.freeze({
  UPDATE_PHOTO: 'UPDATE_PHOTO',
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
  VIEW_VISA: 'VIEW_VISA',
  VIEW_APPLICATION: 'VIEW_APPLICATION',
  NONE: 'NONE'
});

/**
 * Visual and operational configuration for each status
 */
export const STATUS_CONFIG = Object.freeze({
  [APPLICATION_STATUS.APPLICATION_RECEIVED]: {
    label: 'Application Received',
    badgeBg: 'bg-blue-50/80',
    badgeText: 'text-[#1479F5]',
    badgeBorder: 'border-blue-200/60',
    dotColor: 'bg-[#1479F5]',
    timelineStep: 1, // 1: Submitted, 2: Documents, 3: Processing, 4: Visa Issued
    defaultAction: REQUIRED_ACTION.VIEW_APPLICATION,
    actionLabel: 'View Application →',
    isActionRequired: false
  },
  [APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW]: {
    label: 'Documents Under Review',
    badgeBg: 'bg-amber-50/80',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200/60',
    dotColor: 'bg-amber-500',
    timelineStep: 2,
    defaultAction: REQUIRED_ACTION.VIEW_APPLICATION,
    actionLabel: 'View Application →',
    isActionRequired: false
  },
  [APPLICATION_STATUS.PROCESSING]: {
    label: 'Processing',
    badgeBg: 'bg-blue-50/80',
    badgeText: 'text-[#2563EB]',
    badgeBorder: 'border-blue-200/60',
    dotColor: 'bg-[#2563EB]',
    timelineStep: 3,
    defaultAction: REQUIRED_ACTION.VIEW_APPLICATION,
    actionLabel: 'View Application →',
    isActionRequired: false
  },
  [APPLICATION_STATUS.ADDITIONAL_INFORMATION_REQUIRED]: {
    label: 'Additional Information Required',
    badgeBg: 'bg-red-50/80',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200/60',
    dotColor: 'bg-red-500',
    timelineStep: 2,
    defaultAction: REQUIRED_ACTION.UPDATE_PHOTO,
    actionLabel: 'Update Information →',
    isActionRequired: true
  },
  [APPLICATION_STATUS.APPROVED]: {
    label: 'Approved',
    badgeBg: 'bg-emerald-50/80',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200/60',
    dotColor: 'bg-emerald-600',
    timelineStep: 3,
    defaultAction: REQUIRED_ACTION.VIEW_APPLICATION,
    actionLabel: 'View Application →',
    isActionRequired: false
  },
  [APPLICATION_STATUS.VISA_ISSUED]: {
    label: 'Visa Issued',
    badgeBg: 'bg-emerald-50/90',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    dotColor: 'bg-emerald-600',
    timelineStep: 4,
    defaultAction: REQUIRED_ACTION.VIEW_VISA,
    actionLabel: 'View Visa →',
    isActionRequired: false
  },
  [APPLICATION_STATUS.COMPLETED]: {
    label: 'Completed',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-400',
    timelineStep: 4,
    defaultAction: REQUIRED_ACTION.VIEW_APPLICATION,
    actionLabel: 'View Application →',
    isActionRequired: false
  }
});

/**
 * Normalizes any status string (including legacy human-readable strings)
 * to a standard status config object.
 */
export function getStatusConfig(status) {
  if (!status) return STATUS_CONFIG[APPLICATION_STATUS.APPLICATION_RECEIVED];

  // If directly matching enum key
  if (STATUS_CONFIG[status]) {
    return STATUS_CONFIG[status];
  }

  // Handle human-readable string matches
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (STATUS_CONFIG[normalized]) {
    return STATUS_CONFIG[normalized];
  }

  // Fallback map for loose string matches
  switch (status.toLowerCase()) {
    case 'application received':
      return STATUS_CONFIG[APPLICATION_STATUS.APPLICATION_RECEIVED];
    case 'documents under review':
      return STATUS_CONFIG[APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW];
    case 'processing':
      return STATUS_CONFIG[APPLICATION_STATUS.PROCESSING];
    case 'additional information required':
    case 'information required':
    case 'action required':
      return STATUS_CONFIG[APPLICATION_STATUS.ADDITIONAL_INFORMATION_REQUIRED];
    case 'approved':
      return STATUS_CONFIG[APPLICATION_STATUS.APPROVED];
    case 'visa issued':
      return STATUS_CONFIG[APPLICATION_STATUS.VISA_ISSUED];
    case 'completed':
      return STATUS_CONFIG[APPLICATION_STATUS.COMPLETED];
    default:
      return STATUS_CONFIG[APPLICATION_STATUS.APPLICATION_RECEIVED];
  }
}
