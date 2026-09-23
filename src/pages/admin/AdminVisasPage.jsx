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
  ChevronRight,
  ShieldCheck,
  Calendar,
  Compass,
  Image as ImageIcon
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
  const [newDocName, setNewDocName] = useState('');

  // Add Visa Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    countryId: '',
    countryName: '',
    visaType: 'Tourist Visa',
    description: '',
    stayPeriod: '30 Days',
    validity: '90 Days',
    processingTime: '3–5 Days',
    entryType: 'Single Entry',
    price: '₹3,500',
    image: '',
    status: 'ACTIVE',
    documentCategory: 'Only Passport',
    documents: ['Passport Front & Back Scan', 'Passport Size Photo'],
    faqs: [
      {
        q: 'Is physical embassy visit required?',
        a: 'No, this visa application process is 100% digital online.'
      }
    ]
  });
  const [newAddDocName, setNewAddDocName] = useState('');
  const [newAddFaqQ, setNewAddFaqQ] = useState('');
  const [newAddFaqA, setNewAddFaqA] = useState('');
  const [addFormErrors, setAddFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

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

  // Open Add Visa Modal
  const handleOpenAddVisa = () => {
    const defaultCountry = countries[0];
    setAddFormData({
      countryId: defaultCountry?.id || '',
      countryName: defaultCountry?.name || '',
      visaType: 'Tourist Visa',
      description: defaultCountry ? `Explore ${defaultCountry.name} with our streamlined electronic visa processing.` : '',
      stayPeriod: '30 Days',
      validity: '90 Days',
      processingTime: '3–5 Days',
      entryType: 'Single Entry',
      price: '₹3,500',
      image: defaultCountry?.image || '',
      status: 'ACTIVE',
      documentCategory: 'Only Passport',
      documents: ['Passport Front & Back Scan', 'Passport Size Photo'],
      faqs: [
        {
          q: 'Is physical embassy visit required?',
          a: 'No, this visa application process is 100% digital online.'
        }
      ]
    });
    setNewAddDocName('');
    setNewAddFaqQ('');
    setNewAddFaqA('');
    setAddFormErrors({});
    setCreateSuccess(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddVisa = () => {
    setIsAddModalOpen(false);
    setAddFormErrors({});
    setCreateSuccess(false);
  };

  // Form field change handler for edit
  const handleFieldChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Document management in Edit Modal
  const handleAddDocument = () => {
    const clean = newDocName.trim();
    if (!clean) return;
    if (!editFormData.documents.includes(clean)) {
      setEditFormData((prev) => ({
        ...prev,
        documents: [...prev.documents, clean]
      }));
    }
    setNewDocName('');
  };

  const handleRemoveDocument = (docName) => {
    setEditFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d !== docName)
    }));
  };

  // FAQ management in Edit Modal
  const handleFaqChange = (index, key, val) => {
    setEditFormData((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [key]: val };
      return { ...prev, faqs: updated };
    });
  };

  const handleAddFaqItem = () => {
    setEditFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { q: 'New Question', a: 'Answer details here.' }]
    }));
  };

  const handleRemoveFaqItem = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, idx) => idx !== index)
    }));
  };

  // Add Visa validation
  const validateAddVisa = () => {
    const errors = {};
    if (!addFormData.countryId) errors.countryId = 'Destination country is required';
    if (!addFormData.visaType.trim()) errors.visaType = 'Visa type is required';
    if (!addFormData.stayPeriod.trim()) errors.stayPeriod = 'Stay duration is required';
    if (!addFormData.validity.trim()) errors.validity = 'Validity period is required';
    if (!addFormData.processingTime.trim()) errors.processingTime = 'Processing time is required';
    if (!addFormData.entryType.trim()) errors.entryType = 'Entry type is required';
    if (!addFormData.price.trim() || !/[0-9]/.test(addFormData.price)) {
      errors.price = 'Valid price amount is required (e.g. ₹3,500)';
    }
    if (!addFormData.description.trim()) errors.description = 'Visa description is required';
    if (!Array.isArray(addFormData.documents) || addFormData.documents.length === 0) {
      errors.documents = 'At least one required document must be listed';
    }

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add Document in Add Modal
  const handleAddModalDoc = () => {
    const clean = newAddDocName.trim();
    if (!clean) return;
    if (!addFormData.documents.includes(clean)) {
      setAddFormData((prev) => ({
        ...prev,
        documents: [...prev.documents, clean]
      }));
    }
    setNewAddDocName('');
  };

  const handleRemoveModalDoc = (docName) => {
    setAddFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d !== docName)
    }));
  };

  // Add FAQ in Add Modal
  const handleAddModalFaq = () => {
    const q = newAddFaqQ.trim();
    const a = newAddFaqA.trim();
    if (!q || !a) return;
    setAddFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { q, a }]
    }));
    setNewAddFaqQ('');
    setNewAddFaqA('');
  };

  const handleRemoveModalFaq = (index) => {
    setAddFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, idx) => idx !== index)
    }));
  };

  // Create Visa Handler
  const handleCreateVisa = async (e) => {
    e.preventDefault();
    if (!validateAddVisa()) return;

    setIsCreating(true);
    try {
      const selectedCountryObj = countries.find((c) => c.id === addFormData.countryId);
      const created = await visaService.createVisa({
        countryId: addFormData.countryId,
        countryName: selectedCountryObj?.name || addFormData.countryName,
        displayName: selectedCountryObj?.name || addFormData.countryName,
        visaType: addFormData.visaType.trim(),
        stayPeriod: addFormData.stayPeriod.trim(),
        validity: addFormData.validity.trim(),
        processingTime: addFormData.processingTime.trim(),
        entryType: addFormData.entryType.trim(),
        price: addFormData.price.trim(),
        fees: addFormData.price.trim(),
        image: addFormData.image.trim() || selectedCountryObj?.image || '',
        flagEmoji: selectedCountryObj?.flagEmoji || '🌍',
        flagUrl: selectedCountryObj?.flagUrl || '',
        description: addFormData.description.trim(),
        shortDescription: addFormData.description.trim(),
        documentCategory: addFormData.documentCategory || 'Only Passport',
        documentsRequired: addFormData.documents,
        documents: addFormData.documents,
        faqs: addFormData.faqs,
        status: addFormData.status
      });

      setVisas((prev) => [created, ...prev]);
      setCreateSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreateSuccess(false);
      }, 1400);
    } catch (err) {
      console.error('Failed to create visa:', err);
      alert('Failed to create visa offering. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Save changes via visaService
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedVisa) return;

    setIsSaving(true);
    try {
      const updates = {
        countryId: editFormData.countryId,
        countryName: editFormData.countryName.trim(),
        displayName: editFormData.countryName.trim(),
        visaType: editFormData.visaType.trim(),
        description: editFormData.description.trim(),
        shortDescription: editFormData.description.trim(),
        validity: editFormData.validity.trim(),
        stayPeriod: editFormData.stayPeriod.trim(),
        processingTime: editFormData.processingTime.trim(),
        entryType: editFormData.entryType.trim(),
        price: editFormData.price.trim(),
        fees: editFormData.price.trim(),
        image: editFormData.image.trim(),
        status: editFormData.status,
        documentsRequired: editFormData.documents,
        documents: editFormData.documents,
        faqs: editFormData.faqs
      };

      const updated = await visaService.updateVisa(selectedVisa.id, updates);

      setVisas((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setSelectedVisa(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
            Manage visa offerings and requirements displayed to customers.
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
            onClick={handleOpenAddVisa}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#082B61] text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Visa</span>
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
              placeholder="Search by country, visa type, or ID..."
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
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-[#082B61]">{filteredVisas.length}</strong> of{' '}
            <strong className="text-[#082B61]">{visas.length}</strong> visa offerings
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Click any row to edit visa details, pricing, documents, or FAQs
          </span>
        </div>
      </div>

      {/* ========================================================
          DATA VIEW (Table / Grid)
          ======================================================== */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-14 border border-slate-200/80 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-sm font-bold text-[#082B61]">Loading visa offerings...</p>
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
      ) : filteredVisas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Globe size={36} className="text-slate-300 mx-auto" />
          <p className="text-base font-bold text-[#082B61]">No visa offerings found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or country/status filters to view visa offerings.
          </p>
          <button
            type="button"
            onClick={handleOpenAddVisa}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Create New Visa</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Country & Visa</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Processing</th>
                  <th className="py-3 px-4">Entry</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredVisas.map((v) => {
                  const isActive = v.status === 'ACTIVE' || !v.status;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => handleOpenEdit(v)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Country & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl select-none leading-none">
                            {v.flagEmoji || '🌍'}
                          </span>
                          <div>
                            <span className="font-bold text-[#082B61] block group-hover:text-[#2563EB] transition-colors">
                              {v.displayName || v.countryName || v.country}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {v.visaType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stay Duration */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {v.stayPeriod || v.validity || '30 Days'}
                      </td>

                      {/* Validity */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {v.validity}
                      </td>

                      {/* Processing */}
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
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
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
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(v);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#082B61] transition-colors shadow-2xs cursor-pointer"
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
          ADD VISA MODAL
          Strict structure:
          Label → Short helper instruction → Clean input
          ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Top Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#082B61]">
                  Add Visa Offering
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  Create a completely new visa offering for customers
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseAddVisa}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 flex-grow">
              
              {createSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Visa offering created successfully! Customer visa pages will display this offering immediately.</span>
                </div>
              )}

              <form onSubmit={handleCreateVisa} className="space-y-6">
                
                {/* 1. BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <Globe size={14} className="text-[#2563EB]" />
                    <span>Basic Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Destination Country */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Destination Country *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Select the associated destination country
                      </span>
                      <select
                        value={addFormData.countryId}
                        onChange={(e) => {
                          const c = countries.find((item) => item.id === e.target.value);
                          setAddFormData((prev) => ({
                            ...prev,
                            countryId: e.target.value,
                            countryName: c?.name || prev.countryName,
                            image: prev.image || c?.image || '',
                            description: prev.description || (c ? `Apply for ${c.name} visa with expedited processing.` : '')
                          }));
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none transition-all cursor-pointer ${
                          addFormErrors.countryId
                            ? 'border-red-400 bg-red-50/15 focus:border-red-500'
                            : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                        }`}
                      >
                        <option value="">Select a country...</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.flagEmoji || '🌍'} {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                      {addFormErrors.countryId && (
                        <span className="text-[11px] font-bold text-red-600 block mt-1">
                          {addFormErrors.countryId}
                        </span>
                      )}
                    </div>

                    {/* Visa Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Type *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Standard visa category
                      </span>
                      <select
                        value={addFormData.visaType}
                        onChange={(e) => setAddFormData({ ...addFormData, visaType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                      >
                        <option value="Tourist Visa">Tourist Visa</option>
                        <option value="E-Visa">E-Visa</option>
                        <option value="Sticker Visa">Sticker Visa</option>
                        <option value="Business Visa">Business Visa</option>
                        <option value="Transit Visa">Transit Visa</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Description *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Overview displayed on the dynamic Visa Details page
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
                </div>

                {/* 2. VISA DETAILS & PRICING */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <DollarSign size={14} className="text-[#2563EB]" />
                    <span>Visa Details & Pricing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Stay Duration */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Stay Duration *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        e.g. 30 Days, 60 Days
                      </span>
                      <input
                        type="text"
                        value={addFormData.stayPeriod}
                        onChange={(e) => setAddFormData({ ...addFormData, stayPeriod: e.target.value })}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Validity */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Validity *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        e.g. 90 Days, 10 Years
                      </span>
                      <input
                        type="text"
                        value={addFormData.validity}
                        onChange={(e) => setAddFormData({ ...addFormData, validity: e.target.value })}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Processing Time */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Processing Time *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        e.g. 24–48 Hours, 3–5 Days
                      </span>
                      <input
                        type="text"
                        value={addFormData.processingTime}
                        onChange={(e) => setAddFormData({ ...addFormData, processingTime: e.target.value })}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Entry Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Entry Type *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Number of consular entries permitted
                      </span>
                      <select
                        value={addFormData.entryType}
                        onChange={(e) => setAddFormData({ ...addFormData, entryType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                      >
                        <option value="Single Entry">Single Entry</option>
                        <option value="Multiple Entry">Multiple Entry</option>
                        <option value="Double Entry">Double Entry</option>
                      </select>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Price (INR) *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        e.g. ₹3,500 or ₹8,900
                      </span>
                      <input
                        type="text"
                        value={addFormData.price}
                        onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value })}
                        placeholder=""
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none transition-all ${
                          addFormErrors.price
                            ? 'border-red-400 bg-red-50/15 focus:border-red-500'
                            : 'border-slate-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                        }`}
                      />
                      {addFormErrors.price && (
                        <span className="text-[11px] font-bold text-red-600 block mt-1">
                          {addFormErrors.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. REQUIRED DOCUMENTS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <FileText size={14} className="text-[#2563EB]" />
                    <span>Required Documents</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium block">
                    Dynamic checklist displayed to customers during application
                  </span>

                  <div className="space-y-2">
                    {addFormData.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-[#082B61]"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>{doc}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModalDoc(doc)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newAddDocName}
                        onChange={(e) => setNewAddDocName(e.target.value)}
                        placeholder="Add required document (e.g. Return Flight Ticket)"
                        className="flex-grow px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={handleAddModalDoc}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#2563EB] hover:text-white text-xs font-bold text-[#082B61] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Add Document
                      </button>
                    </div>
                    {addFormErrors.documents && (
                      <span className="text-[11px] font-bold text-red-600 block mt-1">
                        {addFormErrors.documents}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <HelpCircle size={14} className="text-[#2563EB]" />
                    <span>Frequently Asked Questions</span>
                  </div>

                  <div className="space-y-2.5">
                    {addFormData.faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveModalFaq(idx)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="font-bold text-[#082B61] pr-6">Q: {faq.q}</div>
                        <div className="text-slate-600 text-[11px]">A: {faq.a}</div>
                      </div>
                    ))}

                    <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                      <input
                        type="text"
                        value={newAddFaqQ}
                        onChange={(e) => setNewAddFaqQ(e.target.value)}
                        placeholder="Question (e.g. Can I extend this visa?)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                      />
                      <textarea
                        rows={2}
                        value={newAddFaqA}
                        onChange={(e) => setNewAddFaqA(e.target.value)}
                        placeholder="Answer details..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={handleAddModalFaq}
                        disabled={!newAddFaqQ.trim() || !newAddFaqA.trim()}
                        className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-[#2563EB] hover:text-white text-xs font-bold text-[#082B61] transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Add FAQ Entry
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. DISPLAY & STATUS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <ImageIcon size={14} className="text-[#2563EB]" />
                    <span>Display & Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visa Image URL */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Image URL
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        High-resolution card photography URL
                      </span>
                      <input
                        type="url"
                        value={addFormData.image}
                        onChange={(e) => setAddFormData({ ...addFormData, image: e.target.value })}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Status
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Active offerings appear on customer listings
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
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCloseAddVisa}
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
                    <span>Create Visa Offering</span>
                  </button>
                </div>

              </form>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          EDIT VISA MODAL (STRICT NIMUFLY FORM PHILOSOPHY)
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
                        Associated destination country
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
                        Category (Tourist, E-Visa, Sticker)
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
                      Overview displayed on the dynamic Visa Details page
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
                    <DollarSign size={14} className="text-[#2563EB]" />
                    <span>Visa Details & Pricing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Stay Duration */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Stay Duration
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Maximum length of stay per trip
                      </span>
                      <input
                        type="text"
                        value={editFormData.stayPeriod}
                        onChange={(e) => handleFieldChange('stayPeriod', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>

                    {/* Validity */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Validity
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Total validity period
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
                        Consular turnaround timeframe
                      </span>
                      <input
                        type="text"
                        value={editFormData.processingTime}
                        onChange={(e) => handleFieldChange('processingTime', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Entry Type */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Entry Type
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Single or Multiple entries
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

                    {/* Price */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Price (INR)
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Fees displayed to customers
                      </span>
                      <input
                        type="text"
                        value={editFormData.price}
                        onChange={(e) => handleFieldChange('price', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. REQUIRED DOCUMENTS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <FileText size={14} className="text-[#2563EB]" />
                    <span>Required Documents ({editFormData.documents.length})</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium block">
                    Document checklist required for visa processing
                  </span>

                  <div className="space-y-2">
                    {editFormData.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-[#082B61]"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>{doc}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="Add required document..."
                        className="flex-grow px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={handleAddDocument}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#2563EB] hover:text-white text-xs font-bold text-[#082B61] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Add Document
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                      <HelpCircle size={14} className="text-[#2563EB]" />
                      <span>Frequently Asked Questions ({editFormData.faqs.length})</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFaqItem}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editFormData.faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFaqItem(idx)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>

                        <div className="space-y-1 pr-6">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            Question
                          </label>
                          <input
                            type="text"
                            value={faq.q}
                            onChange={(e) => handleFaqChange(idx, 'q', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] bg-white focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block">
                            Answer
                          </label>
                          <textarea
                            rows={2}
                            value={faq.a}
                            onChange={(e) => handleFaqChange(idx, 'a', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 bg-white focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. DISPLAY & STATUS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <ImageIcon size={14} className="text-[#2563EB]" />
                    <span>Display & Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visa Image URL */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Visa Image URL
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Card and header photography URL
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
                        Active or inactive for customers
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
