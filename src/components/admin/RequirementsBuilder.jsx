import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  FileCheck2,
  Info
} from 'lucide-react';

const COMMON_FORMATS = ['PDF', 'JPG', 'JPEG', 'PNG', 'WEBP', 'DOC', 'DOCX'];

/**
 * Normalizes any format/string or object into a standard requirement structure
 */
export function normalizeRequirement(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const clean = item.trim();
    if (!clean) return null;
    return {
      title: clean,
      name: clean,
      required: true,
      isRequired: true,
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      description: ''
    };
  }
  const title = (item.title || item.name || '').trim();
  if (!title) return null;
  const accepted = Array.isArray(item.acceptedFormats) && item.acceptedFormats.length > 0
    ? item.acceptedFormats.map((f) => String(f).trim().toUpperCase()).filter(Boolean)
    : ['PDF', 'JPG', 'PNG'];
  const isReq = item.required !== false && item.isRequired !== false;
  return {
    title,
    name: title,
    required: isReq,
    isRequired: isReq,
    acceptedFormats: accepted,
    description: (item.description || item.subtitle || '').trim()
  };
}

/**
 * Interactive Admin Document Requirements Builder
 * Allows adding, editing, deleting, reordering, toggling Required/Optional,
 * and configuring accepted formats with dynamic custom format support.
 */
export default function RequirementsBuilder({
  requirements = [],
  onChange,
  helperText = 'Configure the documents customers must upload for this service.'
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null means adding new

  // Form state for Modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [selectedFormats, setSelectedFormats] = useState(['PDF', 'JPG', 'PNG']);
  const [customFormatInput, setCustomFormatInput] = useState('');

  // Safe normalized list
  const items = Array.isArray(requirements)
    ? requirements.map(normalizeRequirement).filter(Boolean)
    : [];

  const openAddModal = () => {
    setEditingIndex(null);
    setTitle('');
    setDescription('');
    setIsRequired(true);
    setSelectedFormats(['PDF', 'JPG', 'PNG']);
    setCustomFormatInput('');
    setModalOpen(true);
  };

  const openEditModal = (index) => {
    const item = items[index];
    if (!item) return;
    setEditingIndex(index);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setIsRequired(item.required !== false && item.isRequired !== false);
    setSelectedFormats(item.acceptedFormats?.length ? [...item.acceptedFormats] : ['PDF', 'JPG', 'PNG']);
    setCustomFormatInput('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingIndex(null);
  };

  const toggleFormat = (format) => {
    const upper = format.trim().toUpperCase();
    if (selectedFormats.includes(upper)) {
      if (selectedFormats.length === 1) return; // Keep at least one format
      setSelectedFormats(selectedFormats.filter((f) => f !== upper));
    } else {
      setSelectedFormats([...selectedFormats, upper]);
    }
  };

  const handleAddCustomFormat = (e) => {
    e?.preventDefault();
    const clean = customFormatInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean && !selectedFormats.includes(clean)) {
      setSelectedFormats([...selectedFormats, clean]);
      setCustomFormatInput('');
    }
  };

  const handleSaveModal = (e) => {
    e?.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const newItem = {
      title: cleanTitle,
      name: cleanTitle,
      required: isRequired,
      isRequired,
      acceptedFormats: selectedFormats.length > 0 ? selectedFormats : ['PDF', 'JPG', 'PNG'],
      description: description.trim()
    };

    let updated;
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
      updated = [...items];
      updated[editingIndex] = newItem;
    } else {
      updated = [...items, newItem];
    }

    onChange(updated);
    closeModal();
  };

  const handleRemove = (index) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(index - 1, 0, moved);
    onChange(updated);
  };

  const handleMoveDown = (index) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(index + 1, 0, moved);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-slate-300">
            Document Requirements ({items.length})
          </label>
          {helperText && <p className="text-[11px] text-slate-400 mt-0.5">{helperText}</p>}
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Requirement</span>
        </button>
      </div>

      {/* Requirements List */}
      {items.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 text-xs">
          <FileText className="w-6 h-6 mx-auto mb-2 text-slate-500 opacity-60" />
          <p>No document requirements configured yet.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-2 text-teal-400 hover:text-teal-300 font-medium inline-block text-[11px]"
          >
            + Click here to add your first requirement
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((req, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition group"
            >
              {/* Left Details */}
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <div className="flex flex-col gap-0.5 shrink-0 text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-0.5 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === items.length - 1}
                    className="p-0.5 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {req.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        req.required
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {req.required ? 'Required' : 'Optional'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="text-slate-500">Formats:</span>
                    <div className="flex items-center gap-1">
                      {req.acceptedFormats?.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 font-mono text-[10px]"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                    {req.description && (
                      <span className="text-slate-500 truncate max-w-[200px]">
                        • {req.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs font-medium inline-flex items-center gap-1"
                  title="Edit requirement"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-xs font-medium inline-flex items-center gap-1"
                  title="Remove requirement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Modal for Add / Edit Requirement */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-100">
                  {editingIndex !== null ? 'Edit Document Requirement' : 'Add Document Requirement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-4 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Document Title / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Passport Front & Back Scan, Bank Statement"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Requirement Type (Required vs Optional) */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Requirement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRequired(true)}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                      isRequired
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    Mandatory (Required)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRequired(false)}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                      !isRequired
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    Optional
                  </button>
                </div>
              </div>

              {/* Accepted Formats */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Accepted File Formats <span className="text-rose-400">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_FORMATS.map((fmt) => {
                    const active = selectedFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => toggleFormat(fmt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition border ${
                          active
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Format Input */}
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    value={customFormatInput}
                    onChange={(e) => setCustomFormatInput(e.target.value)}
                    placeholder="Add custom format (e.g. TIFF)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFormat}
                    className="px-3 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                  >
                    + Add
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Customer upload component will strictly validate against these formats.
                </p>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Customer Guidance / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Must have at least 6 months validity remaining and 2 blank pages."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/80 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || selectedFormats.length === 0}
                  className="px-4 py-1.5 rounded-xl font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-900/20 disabled:opacity-50"
                >
                  {editingIndex !== null ? 'Save Changes' : 'Add Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
