import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  RefreshCw,
  Globe,
  Tag,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { visaService, countryService } from '../../services';

const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Inactive'];

export default function AdminVisasPage() {
  const [visas, setVisas] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Selected Visa for Editing
  const [selectedVisa, setSelectedVisa] = useState(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    countryId: '',
    countryName: '',
    visaType: '',
    description: '',
    validity: '',
    stayPeriod: '',
    processingTime: '',
    entryType: 'Single Entry',
    price: '',
    image: '',
    flagEmoji: '',
    status: 'ACTIVE',
    documents: [],
    faqs: []
  });

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Document Input helper in modal
  const [newDocName, setNewDocName] = useState('');

  // Load Visas & Countries
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedVisas, loadedCountries] = await Promise.all([
        visaService.getAllVisas(),
        countryService.getAllCountries()
      ]);
      setVisas(loadedVisas);
      setCountries(loadedCountries);
    } catch (err) {
      console.error('Failed to load visas:', err);
      setLoadError('Failed to load visa offerings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Edit Modal
  const handleOpenEdit = (visa) => {
    setSelectedVisa(visa);
    setEditFormData({
      countryId: visa.countryId || visa.id,
      countryName: visa.displayName || visa.countryName || visa.country || '',
      visaType: visa.visaType || 'E-Visa',
      description: visa.description || visa.shortDescription || '',
      validity: visa.validity || '30 Days',
      stayPeriod: visa.stayPeriod || visa.validity || '30 Days',
      processingTime: visa.processingTime || '24–48 Hours',
      entryType: visa.entryType || 'Single Entry',
      price: visa.price || '₹0',
      image: visa.image || '',
      flagEmoji: visa.flagEmoji || '🌍',
      status: visa.status || 'ACTIVE',
      documents: Array.isArray(visa.documents)
        ? [...visa.documents]
        : Array.isArray(visa.documentsRequired)
        ? [...visa.documentsRequired]
        : [],
      faqs: Array.isArray(visa.faqs) ? JSON.parse(JSON.stringify(visa.faqs)) : []
    });
    setNewDocName('');
    setSaveSuccess(false);
  };

  const handleCloseEdit = () => {
    setSelectedVisa(null);
    setSaveSuccess(false);
  };

  // Form field change handler
  const handleFieldChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Document management helpers
  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    const docObj = {
      id: `doc_${Date.now()}`,
      name: newDocName.trim(),
      description: 'Required customer document',
      mandatory: true
    };
    setEditFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, docObj]
    }));
    setNewDocName('');
  };

  const handleRemoveDocument = (indexToRemove) => {
    setEditFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // FAQ management helpers
  const handleAddFaq = () => {
    const newFaq = {
      id: `faq_${Date.now()}`,
      question: '',
      answer: ''
    };
    setEditFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, newFaq]
    }));
  };

  const handleFaqChange = (index, field, value) => {
    setEditFormData((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const handleRemoveFaq = (indexToRemove) => {
    setEditFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Save changes via visaService
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedVisa) return;

    setIsSaving(true);
    try {
      const updates = {
        displayName: editFormData.countryName,
        countryName: editFormData.countryName,
        visaType: editFormData.visaType,
        description: editFormData.description,
        shortDescription: editFormData.description,
        validity: editFormData.validity,
        stayPeriod: editFormData.stayPeriod || editFormData.validity,
        processingTime: editFormData.processingTime,
        entryType: editFormData.entryType,
        price: editFormData.price,
        fees: editFormData.price,
        image: editFormData.image,
        flagEmoji: editFormData.flagEmoji,
        status: editFormData.status,
        documents: editFormData.documents,
        documentsRequired: editFormData.documents,
        faqs: editFormData.faqs
      };

      const updated = await visaService.updateVisa(selectedVisa.id, updates);

      // Update state in applications/visas list
      setVisas((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setSelectedVisa(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save visa updates:', err);
      alert('Failed to save visa changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick toggle status directly
  const handleToggleStatus = async (visa, e) => {
    e.stopPropagation();
    try {
      const updated = await visaService.toggleVisaStatus(visa.id);
      setVisas((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selectedVisa?.id === updated.id) {
        setSelectedVisa(updated);
      }
    } catch (err) {
      console.error('Failed to toggle visa status:', err);
    }
  };

  // Filtered visas
  const filteredVisas = useMemo(() => {
    return visas.filter((v) => {
      // 1. Text search (by country or visa type)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (v.displayName && v.displayName.toLowerCase().includes(q)) ||
        (v.countryName && v.countryName.toLowerCase().includes(q)) ||
        (v.visaType && v.visaType.toLowerCase().includes(q)) ||
        (v.id && v.id.toLowerCase().includes(q));

      // 2. Country filter
      const matchesCountry =
        selectedCountryFilter === 'All' ||
        v.countryId?.toLowerCase() === selectedCountryFilter.toLowerCase() ||
        v.displayName?.toLowerCase() === selectedCountryFilter.toLowerCase();

      // 3. Status filter
      const matchesStatus =
        selectedStatusFilter === 'All' ||
        (selectedStatusFilter === 'Active' && (v.status === 'ACTIVE' || !v.status)) ||
        (selectedStatusFilter === 'Inactive' && v.status === 'INACTIVE');

      return matchesSearch && matchesCountry && matchesStatus;
    });
  }, [visas, searchQuery, selectedCountryFilter, selectedStatusFilter]);

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          PAGE HEADER
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
            Visa Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage visa information displayed to customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SEARCH & FILTER BAR
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
              placeholder="Search by country or visa type..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Globe size={15} className="text-slate-400" />
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
            >
              <option value="All">All Countries</option>
              {countries.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={15} className="text-slate-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
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
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
          <span>
            Showing <strong className="text-[#082B61] font-bold">{filteredVisas.length}</strong> of{' '}
            <strong className="text-[#082B61] font-bold">{visas.length}</strong> visa offerings
          </span>
          {(searchQuery || selectedCountryFilter !== 'All' || selectedStatusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCountryFilter('All');
                setSelectedStatusFilter('All');
              }}
              className="text-[#2563EB] hover:underline font-bold text-xs cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          VISAS LIST TABLE
          ======================================================== */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-[#082B61]">Loading visa records...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl p-8 border border-red-200 text-center space-y-3">
          <AlertCircle size={28} className="text-red-500 mx-auto" />
          <p className="text-sm font-bold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : filteredVisas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 space-y-3">
          <FileText size={32} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#082B61]">No visas found</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Visa Type</th>
                  <th className="py-3 px-4">Duration / Validity</th>
                  <th className="py-3 px-4">Processing Time</th>
                  <th className="py-3 px-4">Entry Type</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredVisas.map((v) => {
                  const isActive = v.status === 'ACTIVE' || !v.status;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Country */}
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">{v.flagEmoji}</span>
                          <span>{v.displayName || v.countryName || v.country}</span>
                        </div>
                      </td>

                      {/* Visa Type */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {v.visaType}
                      </td>

                      {/* Duration / Validity */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {v.validity}
                      </td>

                      {/* Processing Time */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {v.processingTime}
                      </td>

                      {/* Entry Type */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {v.entryType}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-black text-[#082B61] whitespace-nowrap">
                        {v.price}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(v, e)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(v)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Edit →</span>
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
          EDIT VISA MODAL (STRICT MR VISA FORM PHILOSOPHY)
          ======================================================== */}
      {selectedVisa && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Top Sticky Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{editFormData.flagEmoji}</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#082B61]">
                    Edit Visa Offering
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {editFormData.countryName} • {editFormData.visaType}
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
                  <span>Visa information updated successfully. Customer pages will reflect these changes immediately.</span>
                </div>
              )}

              <form onSubmit={handleSaveChanges} className="space-y-6">
                
                {/* 1. BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <Globe size={14} className="text-[#2563EB]" />
                    <span>Basic Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Country Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Country
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Select the country
                      </span>
                      <select
                        value={editFormData.countryName}
                        onChange={(e) => {
                          const c = countries.find((item) => item.name === e.target.value);
                          setEditFormData((prev) => ({
                            ...prev,
                            countryName: e.target.value,
                            countryId: c?.id || prev.countryId,
                            flagEmoji: c?.flagEmoji || prev.flagEmoji
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                      >
                        {countries.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Visa Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Type
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Enter the visa type
                      </span>
                      <input
                        type="text"
                        value={editFormData.visaType}
                        onChange={(e) => handleFieldChange('visaType', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Description
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Enter the visa description
                    </span>
                    <textarea
                      rows={3}
                      value={editFormData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                    />
                  </div>
                </div>

                {/* 2. VISA DETAILS & PRICING */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <Tag size={14} className="text-[#2563EB]" />
                    <span>Visa Details & Pricing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Validity */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Validity
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Enter the visa validity
                      </span>
                      <input
                        type="text"
                        value={editFormData.validity}
                        onChange={(e) => handleFieldChange('validity', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Processing Time */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Processing Time
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Enter the expected processing time
                      </span>
                      <input
                        type="text"
                        value={editFormData.processingTime}
                        onChange={(e) => handleFieldChange('processingTime', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Entry Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Entry Type
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Select entry type
                      </span>
                      <select
                        value={editFormData.entryType}
                        onChange={(e) => handleFieldChange('entryType', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                      >
                        <option value="Single Entry">Single Entry</option>
                        <option value="Multiple Entry">Multiple Entry</option>
                        <option value="Double Entry">Double Entry</option>
                      </select>
                    </div>

                    {/* Visa Price */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Price
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Enter the visa price
                      </span>
                      <input
                        type="text"
                        value={editFormData.price}
                        onChange={(e) => handleFieldChange('price', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. REQUIRED DOCUMENTS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                      <FileText size={14} className="text-[#2563EB]" />
                      <span>Required Documents ({editFormData.documents.length})</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editFormData.documents.map((doc, idx) => {
                      const docTitle = typeof doc === 'string' ? doc : doc.name || doc.documentType || 'Document';
                      return (
                        <div
                          key={doc.id || idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                            <span className="font-bold text-[#082B61]">{docTitle}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add Document Control */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="Document title..."
                        className="flex-grow px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={handleAddDocument}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Document</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                      <HelpCircle size={14} className="text-[#2563EB]" />
                      <span>FAQs ({editFormData.faqs.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editFormData.faqs.map((faq, fIdx) => (
                      <div
                        key={faq.id || fIdx}
                        className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2 relative group"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(fIdx)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove FAQ"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="space-y-1 pr-6">
                          <label className="text-[11px] font-bold text-slate-500 uppercase block">
                            Question
                          </label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleFaqChange(fIdx, 'question', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase block">
                            Answer
                          </label>
                          <textarea
                            rows={2}
                            value={faq.answer}
                            onChange={(e) => handleFaqChange(fIdx, 'answer', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. IMAGES & STATUS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <Tag size={14} className="text-[#2563EB]" />
                    <span>Display & Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visa Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Status
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Set active or inactive state
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

                    {/* Visa Image URL Reference */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Image Reference
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Enter image URL reference
                      </span>
                      <input
                        type="text"
                        value={editFormData.image}
                        onChange={(e) => handleFieldChange('image', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>
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
