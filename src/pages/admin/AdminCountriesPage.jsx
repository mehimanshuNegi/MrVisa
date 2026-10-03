import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Save,
  Loader2,
  RefreshCw,
  Globe,
  Plus,
  Power,
  MapPin,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { countryService, visaService, getFlagEmojiFromCode } from '../../services';
import { adminService } from '../../services/adminService';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Destinations' },
  { value: 'Inactive', label: 'Inactive Destinations' }
];

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState([]);
  const [visas, setVisas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Country for Editing
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    displayName: '',
    code: '',
    slug: '',
    flagEmoji: '',
    flagUrl: '',
    description: '',
    image: '',
    status: 'ACTIVE'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteTargetCountry, setDeleteTargetCountry] = useState(null);
  const [isDeletingCountry, setIsDeletingCountry] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleOpenDelete = (country) => {
    setDeleteTargetCountry(country);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetCountry) return;
    setIsDeletingCountry(true);
    setDeleteError(null);
    try {
      const cId = deleteTargetCountry._id || deleteTargetCountry.id;
      await countryService.deleteCountry(cId);
      setCountries((prev) => prev.filter((c) => (c._id || c.id) !== cId));
      if (selectedCountry && (selectedCountry._id || selectedCountry.id) === cId) {
        setSelectedCountry(null);
      }
      setDeleteTargetCountry(null);
    } catch (err) {
      console.error('Failed to delete country:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete country.';
      setDeleteError(msg);
      alert(msg);
    } finally {
      setIsDeletingCountry(false);
    }
  };

  // Add Country Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    code: '',
    flagEmoji: '',
    description: '',
    image: '',
    status: 'ACTIVE'
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Load Countries & Visas
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedCountries, loadedVisas] = await Promise.all([
        countryService.getAllCountries(),
        visaService.getAllVisas()
      ]);
      setCountries(Array.isArray(loadedCountries) ? loadedCountries : []);
      setVisas(Array.isArray(loadedVisas) ? loadedVisas : []);
    } catch (err) {
      console.error('Failed to load countries:', err);
      setLoadError('Failed to load destination countries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available visa count for each country
  const getVisaCount = (country) => {
    const directCount = Array.isArray(country.visas) ? country.visas.length : 0;
    const matchCount = visas.filter(
      (v) =>
        v.countryId?.toLowerCase() === country.id?.toLowerCase() ||
        v.displayName?.toLowerCase() === country.name?.toLowerCase()
    ).length;
    return Math.max(directCount, matchCount, 0);
  };

  // Image Upload State & Refs
  const editImageInputRef = useRef(null);
  const addImageInputRef = useRef(null);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [isUploadingAddImage, setIsUploadingAddImage] = useState(false);

  const handleImageUpload = async (file, isEdit) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please select a JPG, PNG, or WEBP image.');
      return;
    }
    if (isEdit) setIsUploadingEditImage(true);
    else setIsUploadingAddImage(true);
    try {
      const res = await adminService.uploadImage(file);
      if (res?.url) {
        if (isEdit) {
          setEditFormData((prev) => ({ ...prev, image: res.url }));
        } else {
          setAddFormData((prev) => ({ ...prev, image: res.url }));
        }
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to upload image.');
    } finally {
      if (isEdit) setIsUploadingEditImage(false);
      else setIsUploadingAddImage(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (country) => {
    setSelectedCountry(country);
    setEditFormData({
      name: country.name || country.displayName || '',
      displayName: country.displayName || country.name || '',
      code: country.code || '',
      slug: country.slug || country.id || '',
      flagEmoji: country.flagEmoji || country.flag || '🌍',
      flagUrl: country.flagUrl || '',
      description: country.description || '',
      image: country.image || country.imageUrl || '',
      status: country.status || (country.isActive ? 'ACTIVE' : 'INACTIVE')
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setSelectedCountry(null);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleFieldChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Open Add Country Modal
  const handleOpenAddModal = () => {
    setAddFormData({
      name: '',
      code: '',
      flagEmoji: '',
      description: '',
      image: '',
      status: 'ACTIVE'
    });
    setAddFormErrors({});
    setCreateSuccess(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddFormErrors({});
    setCreateSuccess(false);
  };

  // Auto derive flag when typing ISO code in add form
  const handleAddCodeChange = (rawCode) => {
    const codeUpper = rawCode.toUpperCase();
    const derivedFlag = getFlagEmojiFromCode(codeUpper);
    setAddFormData((prev) => ({
      ...prev,
      code: codeUpper,
      flagEmoji: prev.flagEmoji && prev.flagEmoji !== '🌍' ? prev.flagEmoji : (derivedFlag || prev.flagEmoji)
    }));
  };

  // Validation for Add Country form
  const validateAddForm = () => {
    const errors = {};
    const cleanName = addFormData.name.trim();
    const cleanCode = addFormData.code.trim();

    if (!cleanName) {
      errors.name = 'Country name is required';
    }
    if (!cleanCode) {
      errors.code = 'ISO country code is required';
    } else if (!/^[A-Za-z]{2,3}$/.test(cleanCode)) {
      errors.code = 'ISO code must be 2 or 3 letters (e.g. JP, AE, US, FR)';
    }

    if (!addFormData.description.trim()) {
      errors.description = 'Country description is required';
    }

    const isDuplicate = countries.some(
      (c) =>
        c.name?.toLowerCase() === cleanName.toLowerCase() ||
        c.code?.toLowerCase() === cleanCode.toLowerCase()
    );
    if (isDuplicate) {
      errors.name = 'A country with this name or code already exists';
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Country Handler
  const handleCreateCountry = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    setIsCreating(true);
    try {
      const created = await countryService.createCountry({
        name: addFormData.name.trim(),
        code: addFormData.code.trim().toUpperCase(),
        flagEmoji: addFormData.flagEmoji.trim() || getFlagEmojiFromCode(addFormData.code) || '🌍',
        description: addFormData.description.trim(),
        image: addFormData.image.trim(),
        status: addFormData.status
      });

      setCountries((prev) => [created, ...prev]);
      setCreateSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreateSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to create country:', err);
      alert('Failed to create country. Please check details and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Save changes via countryService
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedCountry) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const updates = {
        name: editFormData.name.trim(),
        displayName: editFormData.displayName?.trim() || editFormData.name.trim(),
        code: editFormData.code.trim().toUpperCase(),
        slug: editFormData.slug.trim(),
        flagEmoji: editFormData.flagEmoji.trim(),
        flagUrl: editFormData.flagUrl.trim(),
        description: editFormData.description.trim(),
        image: editFormData.image.trim(),
        status: editFormData.status
      };

      const countryId = selectedCountry._id || selectedCountry.id;
      const updated = await countryService.updateCountry(countryId, updates);

      setCountries((prev) =>
        prev.map((c) => ((c._id && c._id === updated._id) || c.id === updated.id ? updated : c))
      );
      setSelectedCountry(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save country updates:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save country changes.';
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (country, e) => {
    e.stopPropagation();
    try {
      const updated = await countryService.toggleCountryStatus(country.id);
      setCountries((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCountry?.id === updated.id) {
        setSelectedCountry(updated);
      }
    } catch (err) {
      console.error('Failed to toggle country status:', err);
    }
  };

  // Filtered countries
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      // 1. Text search
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q));

      // 2. Status filter
      const itemStatus = (c.status || (c.isActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && itemStatus === 'ACTIVE') ||
        (statusFilter === 'Inactive' && itemStatus !== 'ACTIVE');

      return matchesSearch && matchesStatus;
    });
  }, [countries, searchQuery, statusFilter]);

  return (
    <div className="space-y-5">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Countries
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage destination catalog, ISO codes, metadata, and country visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Country</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#2563EB]' : 'text-slate-400'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & HOVER DROPDOWN FILTERS */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by country name, ISO code (e.g. JP, AE)..."
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Hover Status Filter */}
          <div className="flex items-center gap-2">
            <AdminDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              labelPrefix="Status"
              icon={Filter}
            />

            {(searchQuery || statusFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="text-xs font-bold text-[#2563EB] hover:underline px-2 py-1 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Counter Info */}
        <div className="text-[11px] text-slate-400 font-medium">
          Showing <strong className="text-[#082B61] font-bold">{filteredCountries.length}</strong> of{' '}
          <strong className="text-[#082B61] font-bold">{countries.length}</strong> destination countries
        </div>
      </div>

      {/* 3. COUNTRIES TABLE */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-[#082B61]">Loading countries...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl p-8 border border-red-200 text-center space-y-2">
          <AlertCircle size={24} className="text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200/80 space-y-2">
          <Globe size={28} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#082B61]">No countries match criteria</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or clear the status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Country</th>
                  <th className="py-2.5 px-3.5">ISO Code</th>
                  <th className="py-2.5 px-3.5">Visa Availability</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredCountries.map((country) => {
                  const visaCount = getVisaCount(country);
                  const isCountryActive = (country.status || (country.isActive ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE';

                  return (
                    <tr
                      key={country.id || country._id}
                      onClick={() => handleOpenEdit(country)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Country Flag, Image Thumbnail & Name */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/80 shadow-2xs">
                            {country.image ? (
                              <img
                                src={country.image}
                                alt={country.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-sm">{country.flagEmoji || '🌍'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#082B61] block leading-tight">
                              {country.displayName || country.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {country.flagEmoji || '🌍'} • {country.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ISO Code */}
                      <td className="py-3 px-3.5 font-mono text-slate-600 font-bold uppercase">
                        {country.code || '—'}
                      </td>

                      {/* Visa Count */}
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[11px] font-bold border border-blue-100">
                          {visaCount} {visaCount === 1 ? 'Visa Type' : 'Visa Types'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <AdminStatusBadge status={isCountryActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(country)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(country, e)}
                            title={isCountryActive ? 'Deactivate Country' : 'Activate Country'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isCountryActive
                                ? 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDelete(country);
                            }}
                            title="Delete Country"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EDIT COUNTRY MODAL */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{editFormData.flagEmoji}</span>
                <div>
                  <h3 className="text-base font-black text-[#082B61]">Edit Destination Country</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {editFormData.displayName || editFormData.name} • {editFormData.code}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className="p-4 sm:p-5 space-y-4 flex-grow">
              
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Country updated successfully.</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* SECTION 1: Country Information */}
              <div className="space-y-3 pt-1">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Country Information</h4>
                  <p className="text-[11px] text-slate-400">Core country identity details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Country Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      required
                      placeholder="e.g. Greece"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Official English country name</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      ISO Code *
                    </label>
                    <input
                      type="text"
                      value={editFormData.code}
                      onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                      required
                      placeholder="e.g. GR"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#082B61] uppercase focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">2 or 3-letter country code (e.g. AE, US, GR)</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Display Information */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Display Information</h4>
                  <p className="text-[11px] text-slate-400">Labels and icons shown to travellers.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Display Label *
                    </label>
                    <input
                      type="text"
                      value={editFormData.displayName}
                      onChange={(e) => handleFieldChange('displayName', e.target.value)}
                      required
                      placeholder="e.g. Greece / Schengen"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Appears in search dropdowns and card titles</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Flag Emoji
                    </label>
                    <input
                      type="text"
                      value={editFormData.flagEmoji}
                      onChange={(e) => handleFieldChange('flagEmoji', e.target.value)}
                      placeholder="e.g. 🇬🇷"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Visual flag displayed in navigation</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Destination Image */}
              <div className="space-y-2 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Destination Image</h4>
                  <p className="text-[11px] text-slate-400">High-resolution cover image shown on cards and detail banners.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={editFormData.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                      alt="Country cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={editImageInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, true);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => editImageInputRef.current?.click()}
                        disabled={isUploadingEditImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#082B61] text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {isUploadingEditImage ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-[#2563EB]" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={12} className="text-[#2563EB]" />
                            <span>{editFormData.image ? 'Change Image' : 'Upload Image'}</span>
                          </>
                        )}
                      </button>

                      {editFormData.image && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange('image', '')}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">Image URL:</span>
                      <input
                        type="text"
                        value={editFormData.image}
                        onChange={(e) => handleFieldChange('image', e.target.value)}
                        placeholder="https://... or cloud storage URL"
                        className="flex-1 h-7 px-2 rounded-md border border-slate-200 text-[11px] text-[#082B61] bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Description */}
              <div className="space-y-2 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Description</h4>
                  <p className="text-[11px] text-slate-400">Brief overview of the country and visa guidance.</p>
                </div>
                <textarea
                  rows={2}
                  value={editFormData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Overview of destination tourist attractions and general visa requirements..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                />
              </div>

              {/* SECTION 5: Visibility */}
              <div className="space-y-2 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">5. Visibility</h4>
                  <p className="text-[11px] text-slate-400">Control destination availability on the customer portal.</p>
                </div>
                <select
                  value={editFormData.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE (Visible in customer portal)</option>
                  <option value="INACTIVE">INACTIVE (Hidden from customer portal)</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. ADD COUNTRY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-[#082B61]">Add Destination Country</h3>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCountry} className="p-4 sm:p-5 space-y-3.5 flex-grow">
              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Country created successfully!</span>
                </div>
              )}

              {/* SECTION 1: Country Information */}
              <div className="space-y-3 pt-1">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Country Information</h4>
                  <p className="text-[11px] text-slate-400">Core destination country identity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Country Name *
                    </label>
                    <input
                      type="text"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Greece"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Official English country name</span>
                    {addFormErrors.name && (
                      <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      ISO Code *
                    </label>
                    <input
                      type="text"
                      value={addFormData.code}
                      onChange={(e) => handleAddCodeChange(e.target.value)}
                      placeholder="e.g. GR"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#082B61] uppercase focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">2 or 3-letter code (e.g. AE, US, GR)</span>
                    {addFormErrors.code && (
                      <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.code}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Display Information */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Display Information</h4>
                  <p className="text-[11px] text-slate-400">Labels and icons shown to travellers.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Flag Emoji
                    </label>
                    <input
                      type="text"
                      value={addFormData.flagEmoji}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, flagEmoji: e.target.value }))}
                      placeholder="e.g. 🇬🇷"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-derived or customized</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Catalog Status
                    </label>
                    <select
                      value={addFormData.status}
                      onChange={(e) => setAddFormData((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE (Visible)</option>
                      <option value="INACTIVE">INACTIVE (Hidden)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Availability on customer portal</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Destination Cover Image */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Destination Image</h4>
                  <p className="text-[11px] text-slate-400">High-resolution cover image shown on cards and banners.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={addFormData.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                      alt="Country cover preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={addImageInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, false);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addImageInputRef.current?.click()}
                        disabled={isUploadingAddImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#082B61] text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {isUploadingAddImage ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-[#2563EB]" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={12} className="text-[#2563EB]" />
                            <span>{addFormData.image ? 'Change Image' : 'Upload Image'}</span>
                          </>
                        )}
                      </button>

                      {addFormData.image && (
                        <button
                          type="button"
                          onClick={() => setAddFormData((prev) => ({ ...prev, image: '' }))}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">Image URL:</span>
                      <input
                        type="text"
                        value={addFormData.image}
                        onChange={(e) => setAddFormData((prev) => ({ ...prev, image: e.target.value }))}
                        placeholder="https://... or cloud storage URL"
                        className="flex-1 h-7 px-2 rounded-md border border-slate-200 text-[11px] text-[#082B61] bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Description */}
              <div className="space-y-2 pt-2">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Description</h4>
                  <p className="text-[11px] text-slate-400">Brief overview of the country and visa guidance.</p>
                </div>
                <textarea
                  rows={2}
                  value={addFormData.description}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Overview of destination tourist attractions and visa requirements..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                />
                {addFormErrors.description && (
                  <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.description}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Create Country</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTargetCountry)}
        onClose={() => {
          setDeleteTargetCountry(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Destination Country"
        entityName={deleteTargetCountry?.name || deleteTargetCountry?.displayName || ''}
        entityType="Country"
        warningMessage="This country will be removed from customer destination listings, homepage grids, and new visa applications."
        dependencyWarning={
          deleteTargetCountry && getVisaCount(deleteTargetCountry) > 0
            ? `This country currently has ${getVisaCount(deleteTargetCountry)} active visa offering(s) attached to it. You must delete or reassign those visa offerings before you can delete this destination.`
            : null
        }
        canDelete={deleteTargetCountry ? getVisaCount(deleteTargetCountry) === 0 : true}
        isDeleting={isDeletingCountry}
      />

    </div>
  );
}
