import React from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

/**
 * Clean, safe confirmation modal for admin deletion actions.
 * Explains soft-delete safety, checks dependencies, and protects historic applications.
 */
export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  entityName = '',
  entityType = 'Item',
  warningMessage = '',
  dependencyWarning = null,
  isDeleting = false,
  canDelete = true
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100 leading-tight">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Delete {entityType.toLowerCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-slate-300">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-white">"{entityName || `this ${entityType.toLowerCase()}`}"</span>?
            </p>
            {warningMessage ? (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{warningMessage}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                This {entityType.toLowerCase()} will be hidden from customer-facing searches, category listings, and checkout.
              </p>
            )}
          </div>

          {/* Dependency Warning */}
          {dependencyWarning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <span className="font-semibold block text-amber-200">Dependency Alert</span>
                <p className="text-amber-300/90 leading-relaxed">{dependencyWarning}</p>
              </div>
            </div>
          )}

          {/* Soft Delete Safety Assurance */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Past customer applications, payments, and audit logs will remain safely preserved.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-950/60 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-300 bg-slate-800/80 hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting || !canDelete}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-900/30 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {entityType}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
