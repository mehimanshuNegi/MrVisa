import React, { useState, useEffect, useMemo } from 'react';
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
  Tag,
  Plus,
  Power,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { countryService, visaService, getFlagEmojiFromCode } from '../../services';

const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Inactive'];

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
    code: '',
    flagEmoji: '',
    description: '',
    image: '',
    status: 'ACTIVE'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setCountries(loadedCountries);
      setVisas(loadedVisas);
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

  // Open Edit Modal
  const handleOpenEdit = (country) => {
    setSelectedCountry(country);
    setEditFormData({
      name: country.name || country.displayName || '',
      code: country.code || '',
      flagEmoji: country.flagEmoji || country.flag || '🌍',
      description: country.description || '',
      image: country.image || country.imageUrl || '',
      status: country.status || 'ACTIVE'
    });
    setSaveSuccess(false);
  };

  const handleCloseEdit = () => {
    setSelectedCountry(null);
    setSaveSuccess(false);
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

    // Check for duplicate name or code
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
      }, 1400);
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
    try {
      const updates = {
        name: editFormData.name.trim(),
        displayName: editFormData.name.trim(),
        code: editFormData.code.trim().toUpperCase(),
        flagEmoji: editFormData.flagEmoji.trim(),
        description: editFormData.description.trim(),
        image: editFormData.image.trim(),
        status: editFormData.status
      };

      const updated = await countryService.updateCountry(selectedCountry.id, updates);

      setCountries((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSelectedCountry(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save country updates:', err);
      alert('Failed to save country changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick toggle status directly
  const handleToggleStatus = async (country, e) => {
    e.stopPropagation();
    try {
      const updated = await countryService.toggleCountryStatus(country.id);
      setCountries((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
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
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q));

      // 2. Status filter
      const isActive = c.status === 'ACTIVE' || !c.status;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && isActive) ||
        (statusFilter === 'Inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [countries, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          PAGE HEADER
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
            Countries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage destination countries and active visa offerings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#082B61] text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Country</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SEARCH & FILTER CONTROLS
          ======================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-grow">
            <Search size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by country name or code..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'All' ? 'All Statuses' : opt}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-[#082B61]">{filteredCountries.length}</strong> of{' '}
            <strong className="text-[#082B61]">{countries.length}</strong> countries
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Click any country to edit details or toggle active status
          </span>
        </div>
      </div>

      {/* ========================================================
          DATA VIEW (Table / Grid)
          ======================================================== */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-14 border border-slate-200/80 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-sm font-bold text-[#082B61]">Loading destination countries...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl p-10 border border-red-200 text-center space-y-3">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <p className="text-sm font-bold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Globe size={36} className="text-slate-300 mx-auto" />
          <p className="text-base font-bold text-[#082B61]">No countries found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No destination countries match your current search query or filter.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add New Country</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Offerings</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredCountries.map((country) => {
                  const isActive = country.status === 'ACTIVE' || !country.status;
                  const visaCount = getVisaCount(country);

                  return (
                    <tr
                      key={country.id}
                      onClick={() => handleOpenEdit(country)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Name & Flag */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl select-none leading-none">
                            {country.flagEmoji || country.flag || '🌍'}
                          </span>
                          <div>
                            <span className="font-bold text-[#082B61] block group-hover:text-[#2563EB] transition-colors">
                              {country.name || country.displayName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {country.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ISO Code */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 text-xs">
                          {country.code || '—'}
                        </span>
                      </td>

                      {/* Visas count */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#082B61]">
                          <Tag size={12} className="text-[#2563EB]" />
                          <span>{visaCount} {visaCount === 1 ? 'Visa' : 'Visas'}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500">
                        {country.description || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(country, e)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                          title={`Click to switch to ${isActive ? 'Inactive' : 'Active'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(country);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-bold text-[#082B61] transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 size={12} className="text-[#2563EB]" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD COUNTRY MODAL
          Strict structure:
          Label → Short helper instruction → Clean input
          ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#082B61]">
                  Add Destination Country
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Create a new destination country for visa offerings
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseAddModal}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 flex-grow">
              
              {createSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Country created successfully! It is now available across customer pages.</span>
                </div>
              )}

              <form onSubmit={handleCreateCountry} className="space-y-4">
                
                {/* 1. Country Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Name *
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Official destination country name (e.g. Japan, Germany, Australia)
                  </span>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    placeholder=""
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none transition-all ${
                      addFormErrors.name
                        ? 'border-red-400 bg-red-50/15 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                    }`}
                  />
                  {addFormErrors.name && (
                    <span className="text-[11px] font-bold text-red-600 block mt-1">
                      {addFormErrors.name}
                    </span>
                  )}
                </div>

                {/* 2. ISO Code & Flag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      ISO Country Code *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Standard 2-letter ISO code (e.g. JP, DE, AU)
                    </span>
                    <input
                      type="text"
                      maxLength={3}
                      value={addFormData.code}
                      onChange={(e) => handleAddCodeChange(e.target.value)}
                      placeholder=""
                      className={`w-full px-3.5 py-2.5 rounded-xl border uppercase font-mono text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none transition-all ${
                        addFormErrors.code
                          ? 'border-red-400 bg-red-50/15 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                      }`}
                    />
                    {addFormErrors.code && (
                      <span className="text-[11px] font-bold text-red-600 block mt-1">
                        {addFormErrors.code}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Flag Emoji *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Auto-derived from ISO code or customized
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={addFormData.flagEmoji}
                        onChange={(e) => setAddFormData({ ...addFormData, flagEmoji: e.target.value })}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                      <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0 select-none">
                        {addFormData.flagEmoji || '🌍'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Description *
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Overview displayed on customer search and destination cards
                  </span>
                  <textarea
                    rows={3}
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder=""
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none transition-all ${
                      addFormErrors.description
                        ? 'border-red-400 bg-red-50/15 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                    }`}
                  />
                  {addFormErrors.description && (
                    <span className="text-[11px] font-bold text-red-600 block mt-1">
                      {addFormErrors.description}
                    </span>
                  )}
                </div>

                {/* 4. Image Reference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Image URL
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    High-quality destination photography URL (optional, defaults to verified travel image)
                  </span>
                  <input
                    type="url"
                    value={addFormData.image}
                    onChange={(e) => setAddFormData({ ...addFormData, image: e.target.value })}
                    placeholder=""
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                </div>

                {/* 5. Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Status
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Active destination countries appear on the customer website
                  </span>
                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    disabled={isCreating}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} strokeWidth={2.5} />
                    )}
                    <span>Create Country</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          EDIT COUNTRY MODAL
          ======================================================== */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none leading-none">
                  {editFormData.flagEmoji || '🌍'}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#082B61]">
                    Edit {selectedCountry.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    ID: {selectedCountry.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 flex-grow">
              
              {/* Success Notification */}
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Country information updated successfully. Customer pages reflect these changes immediately.</span>
                </div>
              )}

              <form onSubmit={handleSaveChanges} className="space-y-4">
                
                {/* Country Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Name
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Official country name
                  </span>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Country Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Country Code
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      2-letter ISO code
                    </span>
                    <input
                      type="text"
                      maxLength={3}
                      value={editFormData.code}
                      onChange={(e) => handleFieldChange('code', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 uppercase font-mono text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                    />
                  </div>

                  {/* Flag Emoji */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Flag Emoji
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Flag emoji symbol
                    </span>
                    <input
                      type="text"
                      value={editFormData.flagEmoji}
                      onChange={(e) => handleFieldChange('flagEmoji', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Country Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Description
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Destination overview displayed on customer pages
                  </span>
                  <textarea
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                </div>

                {/* Image Reference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Image URL
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Destination photography URL
                  </span>
                  <input
                    type="text"
                    value={editFormData.image}
                    onChange={(e) => handleFieldChange('image', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Status
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Active or inactive for customer exploration
                  </span>
                  <select
                    value={editFormData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
