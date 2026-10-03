import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  RefreshCw,
  Globe,
  MapPin,
  DollarSign,
  Power,
  Upload,
  Image as ImageIcon,
  Flame,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { visaService, countryService } from '../../services';
import { adminService } from '../../services/adminService';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import RequirementsBuilder, { normalizeRequirement } from '../../components/admin/RequirementsBuilder';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Destinations' },
  { value: 'Inactive', label: 'Inactive Destinations' }
];

const POPULAR_FILTER_OPTIONS = [
  { value: 'All', label: 'All Destinations' },
  { value: 'Popular', label: 'Popular Only (Homepage)' },
  { value: 'Standard', label: 'Standard Only' }
];

const VISA_TYPES = [
  'Tourist Visa',
  'E-Visa',
  'Business Visa',
  'Transit Visa',
  'Arrival Card',
  'Sticker Visa'
];

const ENTRY_TYPES = [
  'Single Entry',
  'Multiple Entry',
  'Double Entry'
];

const CATEGORIES = [
  'Tourism',
  'Business',
  'Express',
  'Transit',
  'Standard'
];

export default function AdminVisasPage() {
  const [visas, setVisas] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedPopularFilter, setSelectedPopularFilter] = useState('All');

  // Delete State
  const [deleteTargetVisa, setDeleteTargetVisa] = useState(null);
  const [isDeletingVisa, setIsDeletingVisa] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Edit Visa Modal State
  const [editingVisa, setEditingVisa] = useState(null);
  const [editFormData, setEditFormData] = useState({
    countryName: '',
    countryCode: '',
    countryFlag: '🌍',
    countryImage: '',
    title: '',
    visaType: 'Tourist Visa',
    category: 'Tourism',
    description: '',
    stayPeriod: '30 Days',
    validity: '90 Days',
    processingTime: '3–5 Days',
    entryType: 'Single Entry',
    governmentFee: 0,
    serviceFee: 0,
    isPopular: false,
    displayOrder: 0,
    status: 'ACTIVE',
    image: '', // Visa-specific custom image override
    requiredDocuments: []
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveEditSuccess, setSaveEditSuccess] = useState(false);
  const [saveEditError, setSaveEditError] = useState(null);

  // Add Visa Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    countryName: '',
    countryCode: '',
    countryFlag: '🌍',
    countryImage: '',
    title: '',
    visaType: 'Tourist Visa',
    category: 'Tourism',
    description: '',
    stayPeriod: '30 Days',
    validity: '90 Days',
    processingTime: '3–5 Days',
    entryType: 'Single Entry',
    governmentFee: 0,
    serviceFee: 0,
    isPopular: false,
    displayOrder: 0,
    status: 'ACTIVE',
    image: '',
    requiredDocuments: [
      { title: 'Passport Front & Back Scan', required: true, acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { title: 'Passport Size Photo', required: true, acceptedFormats: ['JPG', 'PNG'] }
    ]
  });
  const [isCreatingVisa, setIsCreatingVisa] = useState(false);
  const [createVisaError, setCreateVisaError] = useState(null);

  // Image Upload Refs
  const editCountryImageInputRef = useRef(null);
  const editVisaImageInputRef = useRef(null);
  const addCountryImageInputRef = useRef(null);
  const addVisaImageInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Load All Visas and Countries from MongoDB
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [visasList, countriesList] = await Promise.all([
        visaService.getAllVisas(),
        countryService.getAllCountries()
      ]);
      setVisas(Array.isArray(visasList) ? visasList : []);
      setCountries(Array.isArray(countriesList) ? countriesList : []);
    } catch (err) {
      console.error('Failed to load visa destinations:', err);
      setLoadError('Failed to load destinations from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Visas List
  const filteredVisas = useMemo(() => {
    return visas.filter((visa) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        visa.title?.toLowerCase().includes(q) ||
        visa.countryName?.toLowerCase().includes(q) ||
        visa.countryCode?.toLowerCase().includes(q) ||
        visa.visaType?.toLowerCase().includes(q) ||
        visa.category?.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatusFilter === 'All' ||
        (selectedStatusFilter === 'Active' ? visa.status === 'ACTIVE' : visa.status === 'INACTIVE');

      const matchesPopular =
        selectedPopularFilter === 'All' ||
        (selectedPopularFilter === 'Popular' ? visa.isPopular === true : !visa.isPopular);

      return matchesSearch && matchesStatus && matchesPopular;
    });
  }, [visas, searchQuery, selectedStatusFilter, selectedPopularFilter]);

  // Image Upload Handler
  const handleUploadImageFile = async (file, onUploaded) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    setIsUploadingImage(true);
    try {
      const result = await adminService.uploadImage(file);
      if (result?.url) {
        onUploaded(result.url);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (visa) => {
    setEditingVisa(visa);
    setEditFormData({
      countryName: visa.countryName || visa.country || '',
      countryCode: visa.countryCode || '',
      countryFlag: visa.countryFlag || visa.flagEmoji || '🌍',
      countryImage: visa.countryImage || '',
      title: visa.title || '',
      visaType: visa.visaType || 'Tourist Visa',
      category: visa.category || 'Tourism',
      description: visa.description || '',
      stayPeriod: visa.stayPeriod || '30 Days',
      validity: visa.validity || '90 Days',
      processingTime: visa.processingTime || '3–5 Days',
      entryType: visa.entryType || 'Single Entry',
      governmentFee: Number(visa.governmentFee) || 0,
      serviceFee: Number(visa.serviceFee) || 0,
      isPopular: Boolean(visa.isPopular),
      displayOrder: visa.displayOrder || 0,
      status: visa.status || 'ACTIVE',
      image: visa.hasCustomImage ? (visa.customImage || visa.image) : '',
      requiredDocuments: Array.isArray(visa.documentsRequired)
        ? visa.documentsRequired.map(normalizeRequirement).filter(Boolean)
        : []
    });
    setSaveEditSuccess(false);
    setSaveEditError(null);
  };

  // Save Edit Submission
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingVisa) return;
    setIsSavingEdit(true);
    setSaveEditError(null);
    try {
      const id = editingVisa._id || editingVisa.id;
      const payload = {
        countryName: editFormData.countryName.trim(),
        countryCode: editFormData.countryCode.trim().toUpperCase(),
        countryFlag: editFormData.countryFlag.trim(),
        countryImage: editFormData.countryImage.trim(),
        title: editFormData.title.trim(),
        visaType: editFormData.visaType,
        category: editFormData.category,
        description: editFormData.description.trim(),
        stayPeriod: editFormData.stayPeriod.trim(),
        validity: editFormData.validity.trim(),
        processingTime: editFormData.processingTime.trim(),
        entryType: editFormData.entryType,
        governmentFee: Number(editFormData.governmentFee) || 0,
        serviceFee: Number(editFormData.serviceFee) || 0,
        isPopular: Boolean(editFormData.isPopular),
        displayOrder: Number(editFormData.displayOrder) || 0,
        status: editFormData.status,
        image: editFormData.image.trim(),
        requiredDocuments: editFormData.requiredDocuments
      };

      const updated = await visaService.updateVisa(id, payload);
      setVisas((prev) => prev.map((v) => ((v._id || v.id) === id ? updated : v)));
      setSaveEditSuccess(true);
      setTimeout(() => {
        setSaveEditSuccess(false);
        setEditingVisa(null);
      }, 1200);
    } catch (err) {
      console.error('Failed to update visa destination:', err);
      setSaveEditError(err.message || 'Failed to update destination');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Create New Visa / Destination Submission
  const handleCreateVisa = async (e) => {
    e.preventDefault();
    if (!addFormData.countryName.trim()) {
      setCreateVisaError('Country Name is required');
      return;
    }
    setIsCreatingVisa(true);
    setCreateVisaError(null);
    try {
      const payload = {
        countryName: addFormData.countryName.trim(),
        countryCode: (addFormData.countryCode || addFormData.countryName.slice(0, 3)).trim().toUpperCase(),
        countryFlag: addFormData.countryFlag.trim() || '🌍',
        countryImage: addFormData.countryImage.trim(),
        title: addFormData.title.trim() || `${addFormData.countryName} ${addFormData.visaType}`,
        visaType: addFormData.visaType,
        category: addFormData.category,
        description: addFormData.description.trim(),
        stayPeriod: addFormData.stayPeriod.trim(),
        validity: addFormData.validity.trim(),
        processingTime: addFormData.processingTime.trim(),
        entryType: addFormData.entryType,
        governmentFee: Number(addFormData.governmentFee) || 0,
        serviceFee: Number(addFormData.serviceFee) || 0,
        isPopular: Boolean(addFormData.isPopular),
        displayOrder: Number(addFormData.displayOrder) || 0,
        status: addFormData.status,
        image: addFormData.image.trim(),
        requiredDocuments: addFormData.requiredDocuments
      };

      const created = await visaService.createVisa(payload);
      setVisas((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to create visa destination:', err);
      setCreateVisaError(err.message || 'Failed to create destination');
    } finally {
      setIsCreatingVisa(false);
    }
  };

  // Quick Toggle Active/Inactive
  const handleToggleStatus = async (visa) => {
    const id = visa._id || visa.id;
    try {
      const nextStatus = visa.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await visaService.updateVisa(id, { status: nextStatus });
      setVisas((prev) => prev.map((v) => ((v._id || v.id) === id ? updated : v)));
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Quick Toggle Popularity ON / OFF (Requirement 5)
  const handleTogglePopular = async (visa) => {
    const id = visa._id || visa.id;
    try {
      const nextPopular = !visa.isPopular;
      const updated = await visaService.updateVisa(id, { isPopular: nextPopular });
      setVisas((prev) => prev.map((v) => ((v._id || v.id) === id ? updated : v)));
    } catch (err) {
      alert(err.message || 'Failed to toggle popularity');
    }
  };

  // Delete Visa Handler
  const handleConfirmDelete = async () => {
    if (!deleteTargetVisa) return;
    setIsDeletingVisa(true);
    setDeleteError(null);
    try {
      const id = deleteTargetVisa._id || deleteTargetVisa.id;
      await visaService.deleteVisa(id);
      setVisas((prev) => prev.filter((v) => (v._id || v.id) !== id));
      setDeleteTargetVisa(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete destination');
    } finally {
      setIsDeletingVisa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
            Visa & Destination Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Single unified hub for destination countries, visa offerings, fees, imagery, and required documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            setCreateVisaError(null);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Destination / Visa</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by country, code, visa title, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <AdminDropdown
            options={STATUS_FILTER_OPTIONS}
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            ariaLabel="Filter destinations by status"
          />

          <AdminDropdown
            options={POPULAR_FILTER_OPTIONS}
            value={selectedPopularFilter}
            onChange={setSelectedPopularFilter}
            ariaLabel="Filter by homepage popularity"
          />

          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh destinations"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Destinations Grid */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading live destinations from MongoDB Atlas...</p>
        </div>
      ) : filteredVisas.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Globe size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#082B61]">No Destinations Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'No destinations matched your search filter.' : 'Click "Add Destination / Visa" to create your first offering.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVisas.map((visa) => {
            const hasCustomImg = visa.hasCustomImage;
            const displayImg = visa.image || visa.countryImage;
            const totalFee = (Number(visa.governmentFee) || 0) + (Number(visa.serviceFee) || 0);

            return (
              <div
                key={visa._id || visa.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col overflow-hidden group"
              >
                {/* Destination Image Preview Bar */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  {displayImg ? (
                    <img
                      src={displayImg}
                      alt={visa.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold mt-1">No Destination Image</span>
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[#082B61] text-[11px] font-black shadow-xs flex items-center gap-1.5">
                      <span>{visa.countryFlag || '🌍'}</span>
                      <span>{visa.countryName || visa.country}</span>
                      {visa.countryCode && <span className="text-slate-400 font-mono text-[10px]">({visa.countryCode})</span>}
                    </span>

                    <AdminStatusBadge status={visa.status} />
                  </div>

                  {/* Popularity Badge Toggle */}
                  <div className="absolute bottom-3 left-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(visa)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer ${
                        visa.isPopular
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/80 text-slate-600 hover:bg-white'
                      }`}
                      title={visa.isPopular ? 'Featured on Homepage (Click to turn OFF)' : 'Click to feature on Homepage'}
                    >
                      <Flame size={12} className={visa.isPopular ? 'fill-white' : ''} />
                      <span>{visa.isPopular ? 'Popular ON' : 'Popular OFF'}</span>
                    </button>
                  </div>

                  {/* Image Source Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                      {hasCustomImg ? 'Custom Visa Img' : 'Country Default'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                        {visa.visaType || 'Tourist Visa'}
                      </span>
                      {visa.category && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {visa.category}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-[#082B61] mt-0.5 line-clamp-1">
                      {visa.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {visa.description || 'Fast online visa application processing.'}
                    </p>
                  </div>

                  {/* Pricing & Processing Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Govt Fee</span>
                      <span className="font-bold text-[#082B61]">₹{visa.governmentFee || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Service Fee</span>
                      <span className="font-bold text-[#082B61]">₹{visa.serviceFee || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Stay / Process</span>
                      <span className="font-bold text-[#2563EB] truncate block">{visa.stayPeriod || '30D'}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(visa)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title={visa.status === 'ACTIVE' ? 'Deactivate destination' : 'Activate destination'}
                    >
                      <Power size={14} className={visa.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(visa)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetVisa(visa)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete visa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD DESTINATION / VISA (Spacious Two-Column Form)      */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] block">
                  New Destination Offering
                </span>
                <h2 className="text-xl font-black text-[#082B61] tracking-tight">
                  Add Destination & Visa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateVisa} className="p-6 overflow-y-auto space-y-8 text-xs text-[#082B61]">
              {createVisaError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{createVisaError}</span>
                </div>
              )}

              {/* 1. DESTINATION INFORMATION SECTION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <Globe size={18} className="text-[#2563EB]" />
                  <span>Destination Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Thailand"
                      value={addFormData.countryName}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, countryName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country ISO Code (2–3 characters)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TH"
                      maxLength={3}
                      value={addFormData.countryCode}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country Flag Emoji
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🇹🇭"
                      value={addFormData.countryFlag}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, countryFlag: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Visa Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Thailand Tourist Visa"
                      value={addFormData.title}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Visa Type
                    </label>
                    <select
                      value={addFormData.visaType}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, visaType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {VISA_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Category
                    </label>
                    <select
                      value={addFormData.category}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Country / Destination Image */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Country / Destination Image (Authoritative Source of Truth)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      placeholder="https://... image URL"
                      value={addFormData.countryImage}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, countryImage: e.target.value }))}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => addCountryImageInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                    <input
                      ref={addCountryImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImageFile(file, (url) => setAddFormData((prev) => ({ ...prev, countryImage: url })));
                      }}
                    />
                  </div>
                  {addFormData.countryImage && (
                    <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border border-slate-200">
                      <img src={addFormData.countryImage} alt="Country preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description for customer listings..."
                    value={addFormData.description}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              </div>

              {/* 2. VISA DETAILS & PRICING SECTION */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <DollarSign size={18} className="text-[#2563EB]" />
                  <span>Visa Details & Pricing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Stay Period</label>
                    <input
                      type="text"
                      value={addFormData.stayPeriod}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, stayPeriod: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Validity</label>
                    <input
                      type="text"
                      value={addFormData.validity}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, validity: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Processing Time</label>
                    <input
                      type="text"
                      value={addFormData.processingTime}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, processingTime: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Entry Type</label>
                    <select
                      value={addFormData.entryType}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, entryType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {ENTRY_TYPES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Govt / Embassy Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={addFormData.governmentFee}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, governmentFee: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">NimuFly Service Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={addFormData.serviceFee}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, serviceFee: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Display Order</label>
                    <input
                      type="number"
                      value={addFormData.displayOrder}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Popular Destination</label>
                    <button
                      type="button"
                      onClick={() => setAddFormData((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        addFormData.isPopular
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Flame size={14} className={addFormData.isPopular ? 'text-amber-500 fill-amber-500' : ''} />
                      <span>{addFormData.isPopular ? 'Popular: ON' : 'Popular: OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. OPTIONAL VISA-SPECIFIC IMAGE OVERRIDE */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Visa-Specific Custom Image (Optional Override)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    If empty, automatically uses the Country Image above.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="url"
                    placeholder="Leave empty to use country image, or paste custom URL..."
                    value={addFormData.image}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, image: e.target.value }))}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => addVisaImageInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload size={14} />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={addVisaImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImageFile(file, (url) => setAddFormData((prev) => ({ ...prev, image: url })));
                    }}
                  />
                </div>
              </div>

              {/* 4. REQUIRED DOCUMENTS BUILDER */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <FileText size={18} className="text-[#2563EB]" />
                  <span>Required Documents Checklist</span>
                </div>

                <RequirementsBuilder
                  requirements={addFormData.requiredDocuments}
                  onChange={(updated) => setAddFormData((prev) => ({ ...prev, requiredDocuments: updated }))}
                  helperText="These documents will automatically render on the customer visa application checkout."
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingVisa}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingVisa ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Create Destination & Visa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT DESTINATION / VISA                               */}
      {/* ============================================================== */}
      {editingVisa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] block">
                  Modify Destination & Visa Offering
                </span>
                <h2 className="text-xl font-black text-[#082B61] tracking-tight">
                  {editFormData.title || editFormData.countryName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingVisa(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-8 text-xs text-[#082B61]">
              {saveEditSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Destination and visa changes saved successfully!</span>
                </div>
              )}
              {saveEditError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{saveEditError}</span>
                </div>
              )}

              {/* 1. DESTINATION INFORMATION SECTION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <Globe size={18} className="text-[#2563EB]" />
                  <span>Destination Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.countryName}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, countryName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country ISO Code
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editFormData.countryCode}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Country Flag Emoji
                    </label>
                    <input
                      type="text"
                      value={editFormData.countryFlag}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, countryFlag: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Visa Title
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Visa Type</label>
                    <select
                      value={editFormData.visaType}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, visaType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {VISA_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Country / Destination Image */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Country / Destination Image (Authoritative Source of Truth)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Updates all visas using this destination's default image.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      placeholder="https://... image URL"
                      value={editFormData.countryImage}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, countryImage: e.target.value }))}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => editCountryImageInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                    <input
                      ref={editCountryImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImageFile(file, (url) => setEditFormData((prev) => ({ ...prev, countryImage: url })));
                      }}
                    />
                  </div>
                  {editFormData.countryImage && (
                    <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border border-slate-200">
                      <img src={editFormData.countryImage} alt="Country preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              </div>

              {/* 2. VISA DETAILS & PRICING */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <DollarSign size={18} className="text-[#2563EB]" />
                  <span>Visa Details & Pricing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Stay Period</label>
                    <input
                      type="text"
                      value={editFormData.stayPeriod}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, stayPeriod: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Validity</label>
                    <input
                      type="text"
                      value={editFormData.validity}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, validity: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Processing Time</label>
                    <input
                      type="text"
                      value={editFormData.processingTime}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, processingTime: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Entry Type</label>
                    <select
                      value={editFormData.entryType}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, entryType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {ENTRY_TYPES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Govt / Embassy Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.governmentFee}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, governmentFee: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">NimuFly Service Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={editFormData.serviceFee}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, serviceFee: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editFormData.displayOrder}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Popular Destination</label>
                    <button
                      type="button"
                      onClick={() => setEditFormData((prev) => ({ ...prev, isPopular: !prev.isPopular }))}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editFormData.isPopular
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Flame size={14} className={editFormData.isPopular ? 'text-amber-500 fill-amber-500' : ''} />
                      <span>{editFormData.isPopular ? 'Popular: ON' : 'Popular: OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. VISA-SPECIFIC IMAGE OVERRIDE */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Visa-Specific Custom Image (Optional Override)
                  </label>
                  {editFormData.image ? (
                    <button
                      type="button"
                      onClick={() => setEditFormData((prev) => ({ ...prev, image: '' }))}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Revert to Country Default Image
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      Using Country Default Image
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="url"
                    placeholder="Leave empty to use country image, or paste custom URL..."
                    value={editFormData.image}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, image: e.target.value }))}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => editVisaImageInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload size={14} />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={editVisaImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImageFile(file, (url) => setEditFormData((prev) => ({ ...prev, image: url })));
                    }}
                  />
                </div>
              </div>

              {/* 4. REQUIRED DOCUMENTS BUILDER */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61] pb-1 border-b border-slate-100">
                  <FileText size={18} className="text-[#2563EB]" />
                  <span>Required Documents Checklist</span>
                </div>

                <RequirementsBuilder
                  requirements={editFormData.requiredDocuments}
                  onChange={(updated) => setEditFormData((prev) => ({ ...prev, requiredDocuments: updated }))}
                  helperText="These documents will automatically render on the customer visa application checkout."
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVisa(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL (Requirement 7)                      */}
      {/* ============================================================== */}
      {deleteTargetVisa && (
        <DeleteConfirmationModal
          isOpen={Boolean(deleteTargetVisa)}
          onClose={() => setDeleteTargetVisa(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${deleteTargetVisa.title || deleteTargetVisa.countryName}?`}
          message="This will remove the destination from customer-facing listings. Existing customer applications will be safely preserved."
          isDeleting={isDeletingVisa}
          error={deleteError}
        />
      )}
    </div>
  );
}
