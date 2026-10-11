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
  Info,
  Type,
  AlignLeft,
  Calendar,
  Hash,
  List,
  CheckSquare,
  Upload,
  Eye,
  Sliders,
  ExternalLink
} from 'lucide-react';

const COMMON_FORMATS = ['PDF', 'JPG', 'JPEG', 'PNG', 'WEBP', 'DOC', 'DOCX'];

const FIELD_TYPES = [
  { value: 'file', label: 'File Upload', icon: Upload, desc: 'Applicant uploads a file (PDF, image, document)' },
  { value: 'text', label: 'Short Text', icon: Type, desc: 'Single-line input (names, numbers, short answers)' },
  { value: 'textarea', label: 'Long Text', icon: AlignLeft, desc: 'Multi-line text area (descriptions, itineraries, details)' },
  { value: 'date', label: 'Date', icon: Calendar, desc: 'Date picker input' },
  { value: 'number', label: 'Number', icon: Hash, desc: 'Numeric quantity or count' },
  { value: 'select', label: 'Dropdown Select', icon: List, desc: 'Single-choice dropdown menu' },
  { value: 'multi-select', label: 'Multi-Select', icon: List, desc: 'Multiple selectable options' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, desc: 'Yes/No affirmation checkbox' }
];

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
      category: 'Basic Information',
      required: true,
      isRequired: true,
      inputType: 'file',
      placeholder: '',
      options: [],
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSizeMb: 25,
      description: '',
      condition: '',
      conditionField: '',
      conditionValue: '',
      displayOrder: 0,
      isActive: true
    };
  }

  const title = (item.title || item.name || '').trim();
  if (!title) return null;

  const accepted = Array.isArray(item.acceptedFormats) && item.acceptedFormats.length > 0
    ? item.acceptedFormats.map((f) => String(f).trim().toUpperCase()).filter(Boolean)
    : ['PDF', 'JPG', 'PNG'];

  const isReq = item.required !== false && item.isRequired !== false;
  const inputType = item.inputType || 'file';

  return {
    _id: item._id || item.id,
    title,
    name: title,
    category: item.category || 'Basic Information',
    required: isReq,
    isRequired: isReq,
    inputType,
    placeholder: item.placeholder || '',
    options: Array.isArray(item.options) ? item.options : [],
    acceptedFormats: accepted,
    maxSizeMb: Number(item.maxSizeMb) || 25,
    description: (item.description || item.subtitle || '').trim(),
    condition: item.condition || '',
    conditionField: item.conditionField || '',
    conditionValue: item.conditionValue || '',
    displayOrder: Number(item.displayOrder) || 0,
    isActive: item.isActive !== false
  };
}

/**
 * Interactive Admin Document & Field Requirements Builder
 * Supports adding, editing, deleting, reordering, toggling Required/Optional,
 * field types, dropdown options, conditional logic, and customer form preview.
 */
export default function RequirementsBuilder({
  requirements = [],
  onChange,
  allowFieldTypes = true,
  previewSlug = '',
  helperText = 'Configure the required fields and document uploads for this service.'
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null means adding new

  // Form state for Modal
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Basic Information');
  const [inputType, setInputType] = useState('file');
  const [placeholder, setPlaceholder] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [selectedFormats, setSelectedFormats] = useState(['PDF', 'JPG', 'PNG']);
  const [maxSizeMb, setMaxSizeMb] = useState(25);
  const [customFormatInput, setCustomFormatInput] = useState('');

  // Dropdown options state
  const [optionsList, setOptionsList] = useState([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Conditional visibility state
  const [hasCondition, setHasCondition] = useState(false);
  const [conditionNote, setConditionNote] = useState('');
  const [conditionField, setConditionField] = useState('');
  const [conditionValue, setConditionValue] = useState('');

  // Safe normalized list
  const items = Array.isArray(requirements)
    ? requirements.map(normalizeRequirement).filter(Boolean)
    : [];

  const openAddModal = () => {
    setEditingIndex(null);
    setTitle('');
    setCategory('Basic Information');
    setInputType('file');
    setPlaceholder('');
    setDescription('');
    setIsRequired(true);
    setSelectedFormats(['PDF', 'JPG', 'PNG']);
    setMaxSizeMb(25);
    setCustomFormatInput('');
    setOptionsList([]);
    setNewOptionInput('');
    setHasCondition(false);
    setConditionNote('');
    setConditionField('');
    setConditionValue('');
    setModalOpen(true);
  };

  const openEditModal = (index) => {
    const item = items[index];
    if (!item) return;
    setEditingIndex(index);
    setTitle(item.title || '');
    setCategory(item.category || 'Basic Information');
    setInputType(item.inputType || 'file');
    setPlaceholder(item.placeholder || '');
    setDescription(item.description || '');
    setIsRequired(item.required !== false && item.isRequired !== false);
    setSelectedFormats(item.acceptedFormats?.length ? [...item.acceptedFormats] : ['PDF', 'JPG', 'PNG']);
    setMaxSizeMb(item.maxSizeMb || 25);
    setCustomFormatInput('');
    setOptionsList(Array.isArray(item.options) ? [...item.options] : []);
    setNewOptionInput('');
    const hasCond = Boolean(item.condition || item.conditionField || item.conditionValue);
    setHasCondition(hasCond);
    setConditionNote(item.condition || '');
    setConditionField(item.conditionField || '');
    setConditionValue(item.conditionValue || '');
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

  const handleAddOption = (e) => {
    e?.preventDefault();
    const clean = newOptionInput.trim();
    if (clean && !optionsList.includes(clean)) {
      setOptionsList([...optionsList, clean]);
      setNewOptionInput('');
    }
  };

  const handleRemoveOption = (idx) => {
    setOptionsList(optionsList.filter((_, i) => i !== idx));
  };

  // Direct quick toggle for Required / Optional on list item
  const handleToggleRequired = (index, e) => {
    e?.stopPropagation();
    const updated = [...items];
    const target = updated[index];
    if (target) {
      const nextRequired = !(target.required !== false && target.isRequired !== false);
      updated[index] = {
        ...target,
        required: nextRequired,
        isRequired: nextRequired
      };
      onChange(updated);
    }
  };

  const handleSaveModal = (e) => {
    e?.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const existingId = editingIndex !== null && items[editingIndex]?._id;

    const newItem = {
      ...(existingId ? { _id: existingId } : {}),
      title: cleanTitle,
      name: cleanTitle,
      category: category.trim() || 'Basic Information',
      inputType: allowFieldTypes ? inputType : 'file',
      placeholder: placeholder.trim(),
      description: description.trim(),
      required: isRequired,
      isRequired,
      acceptedFormats: inputType === 'file' ? (selectedFormats.length > 0 ? selectedFormats : ['PDF', 'JPG', 'PNG']) : [],
      maxSizeMb: inputType === 'file' ? Number(maxSizeMb) || 25 : 25,
      options: ['select', 'multi-select'].includes(inputType) ? optionsList : [],
      condition: hasCondition ? conditionNote.trim() : '',
      conditionField: hasCondition ? conditionField.trim() : '',
      conditionValue: hasCondition ? conditionValue.trim() : '',
      displayOrder: editingIndex !== null ? items[editingIndex]?.displayOrder || (editingIndex + 1) : items.length + 1,
      isActive: true
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

  const getTypeIcon = (type) => {
    const found = FIELD_TYPES.find((f) => f.value === type);
    const IconComp = found?.icon || FileText;
    return <IconComp className="w-3.5 h-3.5" />;
  };

  const getTypeLabel = (type) => {
    const found = FIELD_TYPES.find((f) => f.value === type);
    return found?.label || 'File Upload';
  };

  return (
    <div className="space-y-3">
      {/* Top Header Row with Add & Preview */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="block text-xs font-bold text-[#082B61] dark:text-slate-200">
            Service Requirements & Form Fields ({items.length})
          </label>
          {helperText && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>}
        </div>

        <div className="flex items-center gap-2">
          {previewSlug && (
            <a
              href={`/documentation/${previewSlug}/apply`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-semibold transition"
              title="Preview the live dynamic customer form in a new tab"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Customer Form</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Requirement</span>
          </button>
        </div>
      </div>

      {/* Requirements List */}
      {items.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">No requirements or fields configured yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click the button below to add your first document or questionnaire field.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Requirement</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((req, idx) => {
            const isReq = req.required !== false && req.isRequired !== false;
            return (
              <div
                key={req._id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 transition shadow-2xs group"
              >
                {/* Left Details */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="flex flex-col gap-0.5 shrink-0 text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === items.length - 1}
                      className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#082B61] dark:text-slate-100 truncate">
                        {req.title}
                      </span>

                      {/* Field Type Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getTypeIcon(req.inputType)}
                        <span>{getTypeLabel(req.inputType)}</span>
                      </span>

                      {/* Clickable Quick Toggle Required / Optional Badge */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleRequired(idx, e)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                          isReq
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Required / Optional"
                      >
                        {isReq ? 'Required *' : 'Optional'}
                      </button>

                      {/* Category Badge */}
                      {req.category && req.category !== 'Basic Information' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 border border-blue-100">
                          {req.category}
                        </span>
                      )}

                      {/* Conditional Badge */}
                      {(req.condition || req.conditionField) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                          <Sliders className="w-2.5 h-2.5" />
                          <span>Conditional</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                      {req.inputType === 'file' ? (
                        <>
                          <span className="text-slate-400">Formats:</span>
                          <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                            {req.acceptedFormats?.join(', ') || 'PDF, JPG, PNG'} (Max {req.maxSizeMb || 25}MB)
                          </span>
                        </>
                      ) : ['select', 'multi-select'].includes(req.inputType) ? (
                        <>
                          <span className="text-slate-400">Choices:</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[280px]">
                            {req.options?.join(', ') || 'None defined'}
                          </span>
                        </>
                      ) : req.placeholder ? (
                        <>
                          <span className="text-slate-400">Placeholder:</span>
                          <span className="italic text-slate-500 truncate max-w-[240px]">
                            "{req.placeholder}"
                          </span>
                        </>
                      ) : null}

                      {req.description && (
                        <span className="text-slate-400 truncate max-w-[240px]">
                          • {req.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    title="Edit requirement"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    title="Remove requirement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Requirement Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-[#2563EB]">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#082B61] dark:text-slate-100">
                    {editingIndex !== null ? 'Edit Requirement & Field' : 'Add Requirement / Field'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure customer input, file uploads, mandatory status, and visibility rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Title / Label */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Field Label / Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Passport copy, Purpose of travel, Entity Type, Bank account details"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] text-xs font-semibold"
                />
              </div>

              {/* Requirement Setting (Required vs Optional) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Requirement Setting <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRequired(true)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                      isRequired
                        ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Required * (Mandatory)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRequired(false)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                      !isRequired
                        ? 'bg-blue-50 border-blue-300 text-[#2563EB] dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Optional (If Available)
                  </button>
                </div>
              </div>

              {/* Field Type Selector */}
              {allowFieldTypes && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Field Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FIELD_TYPES.map((ft) => {
                      const active = inputType === ft.value;
                      const IconComp = ft.icon;
                      return (
                        <button
                          key={ft.value}
                          type="button"
                          onClick={() => setInputType(ft.value)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            active
                              ? 'bg-blue-50/80 border-[#2563EB] text-[#2563EB] font-bold shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <IconComp className="w-4 h-4 mb-1" />
                          <span className="text-[11px] leading-tight">{ft.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category & Placeholder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Section Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Basic Information, Business Details"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] text-xs"
                  />
                </div>

                {inputType !== 'file' && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Placeholder Text
                    </label>
                    <input
                      type="text"
                      value={placeholder}
                      onChange={(e) => setPlaceholder(e.target.value)}
                      placeholder="e.g. Enter details..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] text-xs"
                    />
                  </div>
                )}
              </div>

              {/* File Upload Configuration */}
              {inputType === 'file' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Accepted File Formats
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_FORMATS.map((fmt) => {
                        const active = selectedFormats.includes(fmt);
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => toggleFormat(fmt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                              active
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customFormatInput}
                        onChange={(e) => setCustomFormatInput(e.target.value)}
                        placeholder="Custom format (e.g. TIFF)"
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomFormat}
                        className="px-3 py-1.5 text-xs rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
                      >
                        + Add Format
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Maximum File Size Limit (MB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={maxSizeMb}
                      onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 ml-2">Default: 25 MB</span>
                  </div>
                </div>
              )}

              {/* Dropdown Options Builder */}
              {['select', 'multi-select'].includes(inputType) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Dropdown Options List ({optionsList.length})
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      placeholder="Type option title (e.g. Proprietorship, Salaried)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-1.5 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold transition cursor-pointer"
                    >
                      + Add Option
                    </button>
                  </div>

                  {optionsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {optionsList.map((opt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Visibility Rules */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Conditional Display Rules</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCondition}
                      onChange={(e) => setHasCondition(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>

                {hasCondition && (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                        Condition Note / Badge (displayed to customer)
                      </label>
                      <input
                        type="text"
                        value={conditionNote}
                        onChange={(e) => setConditionNote(e.target.value)}
                        placeholder="e.g. for business travellers, if applicable, where available"
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          When Field Key Equals
                        </label>
                        <input
                          type="text"
                          value={conditionField}
                          onChange={(e) => setConditionField(e.target.value)}
                          placeholder="e.g. purpose, entityType, incomeType"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Target Value(s)
                        </label>
                        <input
                          type="text"
                          value={conditionValue}
                          onChange={(e) => setConditionValue(e.target.value)}
                          placeholder="e.g. Business Travel, Company,LLP"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guidance / Description */}
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Customer Guidance / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Upload clear copy with all 4 corners visible; min 6 months validity."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] resize-none text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-5 py-2 rounded-xl font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
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
