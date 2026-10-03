import React from 'react';

const STATUS_THEMES = {
  // Application statuses
  'APPLICATION_RECEIVED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Application Received' },
  'DOCUMENTS_UNDER_REVIEW': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Docs Under Review' },
  'ADDITIONAL_INFO_REQUIRED': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: 'Action Required' },
  'PROCESSING': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', label: 'Processing' },
  'APPROVED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Approved' },
  'VISA_ISSUED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Visa Issued' },
  'REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Rejected' },
  'COMPLETED': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', label: 'Completed' },

  // Generic / Catalog statuses
  'ACTIVE': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
  'INACTIVE': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Inactive' },
  'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
  'VERIFIED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Verified' },
  'ACTION_REQUIRED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Action Required' }
};

export default function AdminStatusBadge({ status, label = null, className = '' }) {
  if (!status) return null;

  const key = String(status).toUpperCase().replace(/\s+/g, '_');
  const theme = STATUS_THEMES[key] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    label: status
  };

  const textLabel = label || theme.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${theme.bg} ${theme.text} ${theme.border} ${className} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
      <span>{textLabel}</span>
    </span>
  );
}
