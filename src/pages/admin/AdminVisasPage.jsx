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
  Image as ImageIcon
} from 'lucide-react';
import { visaService, countryService } from '../../services';
import { adminService } from '../../services/adminService';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import RequirementsBuilder from '../../components/admin/RequirementsBuilder';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Visas' },
  { value: 'Inactive', label: 'Inactive Visas' }
];

const AVAILABLE_DOC_FORMATS = ['PDF', 'JPG', 'PNG'];

const normalizeVisaDocItem = (d) => {
  if (typeof d === 'object' && d !== null) {
    const title = d.title || d.name || 'Document';
    const acceptedFormats = Array.isArray(d.acceptedFormats) && d.acceptedFormats.length > 0
      ? d.acceptedFormats.map((f) => String(f).toUpperCase())
      : ['PDF', 'JPG', 'PNG'];
    return { title, acceptedFormats };
  }
  const title = String(d || '').trim();
  const lower = title.toLowerCase();
  const defaultFormats = (lower.includes('photo') || lower.includes('portrait'))
    ? ['JPG', 'PNG']
    : ['PDF', 'JPG', 'PNG'];
  return { title, acceptedFormats: defaultFormats };
};

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
    title: '',
    slug: '',
    countryId: '',
    countryName: '',
    visaType: '',
    description: '',
    shortDescription: '',
    validity: '',
    stayPeriod: '',
    processingTime: '',
    entryType: 'Single Entry',
    governmentFee: 0,
    serviceFee: 0,
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
  const [saveError, setSaveError] = useState(null);
  const [deleteTargetVisa, setDeleteTargetVisa] = useState(null);
  const [isDeletingVisa, setIsDeletingVisa] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleOpenDelete = (visa) => {
    setDeleteTargetVisa(visa);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetVisa) return;
    setIsDeletingVisa(true);
    setDeleteError(null);
    try {
      const vId = deleteTargetVisa._id || deleteTargetVisa.id;
      await visaService.deleteVisa(vId);
      setVisas((prev) => prev.filter((v) => (v._id || v.id) !== vId));
      if (selectedVisa && (selectedVisa._id || selectedVisa.id) === vId) {
        setSelectedVisa(null);
      }
      setDeleteTargetVisa(null);
    } catch (err) {
      console.error('Failed to delete visa:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete visa.';
      setDeleteError(msg);
      alert(msg);
    } finally {
      setIsDeletingVisa(false);
    }
  };

  // Add Visa Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAddDocName, setNewAddDocName] = useState('');
  const [newAddDocFormats, setNewAddDocFormats] = useState(['PDF', 'JPG']);
  const [addFormData, setAddFormData] = useState({
    countryId: '',
    countryName: '',
    visaType: 'Tourist Visa',
    description: '',
    stayPeriod: '30 Days',
    validity: '90 Days',
    processingTime: '3–5 Days',
    entryType: 'Single Entry',
    governmentFee: 0,
    serviceFee: 0,
    price: '₹0',
    image: '',
    status: 'ACTIVE',
    documentCategory: 'Only Passport',
    documents: [
      { title: 'Passport Front & Back Scan', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { title: 'Passport Size Photo', acceptedFormats: ['JPG', 'PNG'] }
    ],
    faqs: [
      {
        q: 'Is physical embassy visit required?',
        a: 'No, this visa application process is 100% digital online.'
      }
    ]
  });
  const [newAddFaqQ, setNewAddFaqQ] = useState('');
  const [newAddFaqA, setNewAddFaqA] = useState('');
  const [addFormErrors, setAddFormErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

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

  // Load Visas & Countries
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedVisas, loadedCountries] = await Promise.all([
        visaService.getAllVisas(),
        countryService.getAllCountries()
      ]);
      setVisas(Array.isArray(loadedVisas) ? loadedVisas : []);
      setCountries(Array.isArray(loadedCountries) ? loadedCountries : []);
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

  // Country filter options
  const countryOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Countries' },
      ...countries.map((c) => ({
        value: c.displayName || c.name || c.id,
        label: `${c.flagEmoji || '🌍'} ${c.displayName || c.name}`
      }))
    ];
  }, [countries]);

  // Open Edit Modal
  const handleOpenEdit = (visa) => {
    setSelectedVisa(visa);
    const countryName = visa.displayName || visa.countryName || visa.country || '';
    const visaType = visa.visaType || 'Tourist Visa';
    const govFee = visa.governmentFee !== undefined && visa.governmentFee !== null && !isNaN(Number(visa.governmentFee))
      ? Number(visa.governmentFee)
      : 0;
    const svcFee = visa.serviceFee !== undefined && visa.serviceFee !== null && !isNaN(Number(visa.serviceFee))
      ? Number(visa.serviceFee)
      : 0;

    const rawDocs = Array.isArray(visa.requiredDocuments) && visa.requiredDocuments.length > 0
      ? visa.requiredDocuments
      : Array.isArray(visa.documents) && visa.documents.length > 0
      ? visa.documents
      : Array.isArray(visa.documentsRequired)
      ? visa.documentsRequired
      : [];

    setEditFormData({
      title: visa.title || `${countryName} ${visaType}`.trim(),
      slug: visa.slug || visa.id || '',
      countryId: visa.countryId || visa.id,
      countryName,
      visaType,
      description: visa.description || '',
      shortDescription: visa.shortDescription || '',
      validity: visa.validity || '90 Days',
      stayPeriod: visa.stayPeriod || visa.validity || '30 Days',
      processingTime: visa.processingTime || '24–48 Hours',
      entryType: visa.entryType || 'Single Entry',
      governmentFee: govFee,
      serviceFee: svcFee,
      price: `₹${(govFee + svcFee).toLocaleString('en-IN')}`,
      image: visa.image || '',
      flagEmoji: visa.flagEmoji || '🌍',
      status: visa.status || (visa.isActive ? 'ACTIVE' : 'INACTIVE'),
      documents: rawDocs.map(normalizeVisaDocItem),
      faqs: Array.isArray(visa.faqs) ? JSON.parse(JSON.stringify(visa.faqs)) : []
    });
    setNewDocName('');
    setNewDocFormats(['PDF', 'JPG']);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setSelectedVisa(null);
    setSaveSuccess(false);
    setSaveError(null);
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
      governmentFee: 0,
      serviceFee: 0,
      price: '₹0',
      image: defaultCountry?.image || '',
      status: 'ACTIVE',
      documentCategory: 'Only Passport',
      documents: [
        { title: 'Passport Front & Back Scan', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
        { title: 'Passport Size Photo', acceptedFormats: ['JPG', 'PNG'] }
      ],
      faqs: [
        {
          q: 'Is physical embassy visit required?',
          a: 'No, this visa application process is 100% digital online.'
        }
      ]
    });
    setNewAddDocName('');
    setNewAddDocFormats(['PDF', 'JPG']);
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
    setEditFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'governmentFee' || field === 'serviceFee') {
        const gov = field === 'governmentFee' ? Number(value) || 0 : Number(next.governmentFee) || 0;
        const svc = field === 'serviceFee' ? Number(value) || 0 : Number(next.serviceFee) || 0;
        next.price = `₹${(gov + svc).toLocaleString('en-IN')}`;
      }
      return next;
    });
  };

  const handleAddFieldChange = (field, value) => {
    setAddFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'governmentFee' || field === 'serviceFee') {
        const gov = field === 'governmentFee' ? Number(value) || 0 : Number(next.governmentFee) || 0;
        const svc = field === 'serviceFee' ? Number(value) || 0 : Number(next.serviceFee) || 0;
        next.price = `₹${(gov + svc).toLocaleString('en-IN')}`;
      }
      return next;
    });
  };

  // Document management in Edit Modal
  const handleToggleDocFormat = (index, format) => {
    setEditFormData((prev) => {
      const copy = [...prev.documents];
      const doc = copy[index];
      if (!doc) return prev;
      const current = Array.isArray(doc.acceptedFormats) ? doc.acceptedFormats : [];
      let updated;
      if (current.includes(format)) {
        if (current.length === 1) return prev; // Keep at least one
        updated = current.filter((f) => f !== format);
      } else {
        updated = [...current, format];
      }
      copy[index] = { ...doc, acceptedFormats: updated };
      return { ...prev, documents: copy };
    });
  };

  const handleToggleNewDocFormat = (format) => {
    setNewDocFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      }
      return [...prev, format];
    });
  };

  const handleAddDocument = () => {
    const clean = newDocName.trim();
    if (!clean) return;
    const formats = newDocFormats.length > 0 ? newDocFormats : ['PDF', 'JPG', 'PNG'];
    setEditFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, { title: clean, acceptedFormats: [...formats] }]
    }));
    setNewDocName('');
  };

  const handleRemoveDocument = (indexToRemove) => {
    setEditFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Document management in Add Modal
  const handleToggleAddDocFormat = (index, format) => {
    setAddFormData((prev) => {
      const copy = [...prev.documents];
      const doc = copy[index];
      if (!doc) return prev;
      const current = Array.isArray(doc.acceptedFormats) ? doc.acceptedFormats : [];
      let updated;
      if (current.includes(format)) {
        if (current.length === 1) return prev;
        updated = current.filter((f) => f !== format);
      } else {
        updated = [...current, format];
      }
      copy[index] = { ...doc, acceptedFormats: updated };
      return { ...prev, documents: copy };
    });
  };

  const handleToggleNewAddDocFormat = (format) => {
    setNewAddDocFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      }
      return [...prev, format];
    });
  };

  const handleAddAddDocument = () => {
    const clean = newAddDocName.trim();
    if (!clean) return;
    const formats = newAddDocFormats.length > 0 ? newAddDocFormats : ['PDF', 'JPG', 'PNG'];
    setAddFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, { title: clean, acceptedFormats: [...formats] }]
    }));
    setNewAddDocName('');
  };

  const handleRemoveAddDocument = (indexToRemove) => {
    setAddFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Validation
  const validateAddVisa = () => {
    const errors = {};
    if (!addFormData.countryId) errors.countryId = 'Destination country is required';
    if (!addFormData.visaType.trim()) errors.visaType = 'Visa type is required';
    if (!addFormData.stayPeriod.trim()) errors.stayPeriod = 'Stay duration is required';
    if (!addFormData.validity.trim()) errors.validity = 'Validity period is required';
    if (!addFormData.processingTime.trim()) errors.processingTime = 'Processing time is required';
    if (!addFormData.entryType.trim()) errors.entryType = 'Entry type is required';
    if (!addFormData.description.trim()) errors.description = 'Visa description is required';

    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Visa Handler
  const handleCreateVisa = async (e) => {
    e.preventDefault();
    if (!validateAddVisa()) return;

    setIsCreating(true);
    try {
      const selectedCountryObj = countries.find((c) => c.id === addFormData.countryId);
      const docsPayload = addFormData.documents.map((d) => ({
        title: (d.title || d.name || '').trim(),
        name: (d.title || d.name || '').trim(),
        acceptedFormats: Array.isArray(d.acceptedFormats) ? d.acceptedFormats : ['PDF', 'JPG', 'PNG']
      }));

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
        governmentFee: Number(addFormData.governmentFee) || 0,
        serviceFee: Number(addFormData.serviceFee) || 0,
        image: addFormData.image.trim() || selectedCountryObj?.image || '',
        flagEmoji: selectedCountryObj?.flagEmoji || '🌍',
        flagUrl: selectedCountryObj?.flagUrl || '',
        description: addFormData.description.trim(),
        shortDescription: addFormData.description.trim(),
        documentCategory: addFormData.documentCategory || 'Only Passport',
        documentsRequired: docsPayload,
        documents: docsPayload,
        faqs: addFormData.faqs,
        status: addFormData.status
      });

      setVisas((prev) => [created, ...prev]);
      setCreateSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreateSuccess(false);
      }, 1200);
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
    setSaveError(null);
    try {
      const govFee = Number(editFormData.governmentFee);
      const svcFee = Number(editFormData.serviceFee);
      const docsPayload = editFormData.documents.map((d) => ({
        title: (d.title || d.name || '').trim(),
        name: (d.title || d.name || '').trim(),
        acceptedFormats: Array.isArray(d.acceptedFormats) ? d.acceptedFormats : ['PDF', 'JPG', 'PNG']
      }));

      const updates = {
        title: editFormData.title.trim(),
        countryId: editFormData.countryId,
        countryName: editFormData.countryName.trim(),
        displayName: editFormData.countryName.trim(),
        visaType: editFormData.visaType.trim(),
        description: editFormData.description.trim(),
        shortDescription: editFormData.shortDescription.trim(),
        validity: editFormData.validity.trim(),
        stayPeriod: editFormData.stayPeriod.trim(),
        processingTime: editFormData.processingTime.trim(),
        entryType: editFormData.entryType.trim(),
        governmentFee: !isNaN(govFee) && govFee >= 0 ? govFee : 0,
        serviceFee: !isNaN(svcFee) && svcFee >= 0 ? svcFee : 0,
        image: editFormData.image.trim(),
        status: editFormData.status,
        requiredDocuments: docsPayload,
        documents: docsPayload,
        faqs: editFormData.faqs
      };

      const visaId = selectedVisa._id || selectedVisa.id;
      const updated = await visaService.updateVisa(visaId, updates);

      setVisas((prev) => prev.map((v) => ((v._id && v._id === updated._id) || v.id === updated.id ? updated : v)));
      setSelectedVisa(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save visa updates:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save visa changes.';
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle status
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
      // 1. Text search
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (v.displayName && v.displayName.toLowerCase().includes(q)) ||
        (v.countryName && v.countryName.toLowerCase().includes(q)) ||
        (v.visaType && v.visaType.toLowerCase().includes(q)) ||
        (v.id && v.id.toLowerCase().includes(q));

      // 2. Country filter
      const countryMatches =
        selectedCountryFilter === 'All' ||
        (v.displayName && v.displayName.toLowerCase() === selectedCountryFilter.toLowerCase()) ||
        (v.countryName && v.countryName.toLowerCase() === selectedCountryFilter.toLowerCase()) ||
        (v.countryId && v.countryId.toLowerCase() === selectedCountryFilter.toLowerCase());

      // 3. Status filter
      const itemStatus = (v.status || (v.isActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
      const matchesStatus =
        selectedStatusFilter === 'All' ||
        (selectedStatusFilter === 'Active' && itemStatus === 'ACTIVE') ||
        (selectedStatusFilter === 'Inactive' && itemStatus !== 'ACTIVE');

      return matchesSearch && countryMatches && matchesStatus;
    });
  }, [visas, searchQuery, selectedCountryFilter, selectedStatusFilter]);

  return (
    <div className="space-y-5">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Visa Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure destination visa types, pricing structures, validity, and requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddVisa}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add New Visa</span>
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
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by destination country, visa category, or code..."
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
          <div className="flex items-center gap-2 flex-wrap">
            <AdminDropdown
              value={selectedStatusFilter}
              onChange={setSelectedStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              labelPrefix="Status"
              icon={Filter}
            />

            {/* Hover Country Filter */}
            <AdminDropdown
              value={selectedCountryFilter}
              onChange={setSelectedCountryFilter}
              options={countryOptions}
              labelPrefix="Country"
              icon={MapPin}
            />

            {(searchQuery || selectedStatusFilter !== 'All' || selectedCountryFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatusFilter('All');
                  setSelectedCountryFilter('All');
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
          Showing <strong className="text-[#082B61] font-bold">{filteredVisas.length}</strong> of{' '}
          <strong className="text-[#082B61] font-bold">{visas.length}</strong> visa offerings
        </div>
      </div>

      {/* 3. VISAS TABLE */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-[#082B61]">Loading visa offerings...</p>
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
      ) : filteredVisas.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200/80 space-y-2">
          <Globe size={28} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#082B61]">No visas match your filters</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or reset the filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Country & Destination</th>
                  <th className="py-2.5 px-3.5">Visa Type</th>
                  <th className="py-2.5 px-3.5">Stay Period</th>
                  <th className="py-2.5 px-3.5">Validity</th>
                  <th className="py-2.5 px-3.5">Processing</th>
                  <th className="py-2.5 px-3.5">Embassy Fee</th>
                  <th className="py-2.5 px-3.5">NimuFly Fee</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredVisas.map((visa) => {
                  const countryName = visa.displayName || visa.countryName || visa.country || 'Global';
                  const isVisaActive = (visa.status || (visa.isActive ? 'ACTIVE' : 'INACTIVE')) === 'ACTIVE';

                  return (
                    <tr
                      key={visa.id || visa._id}
                      onClick={() => handleOpenEdit(visa)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Country & Destination Thumbnail */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/80 shadow-2xs">
                            {visa.image ? (
                              <img
                                src={visa.image}
                                alt={countryName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center text-sm">{visa.flagEmoji || '🌍'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#082B61] block leading-tight">{countryName}</span>
                            <span className="text-[10px] text-slate-400 block">{visa.flagEmoji || '🌍'} {visa.visaType || 'Tourist Visa'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Visa Type */}
                      <td className="py-3 px-3.5 font-semibold text-slate-700">
                        {visa.visaType || 'Tourist Visa'}
                      </td>

                      {/* Stay Period */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {visa.stayPeriod || visa.validity || '30 Days'}
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {visa.validity || '90 Days'}
                      </td>

                      {/* Processing */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        {visa.processingTime || '24–48 Hours'}
                      </td>

                      {/* Government Fee */}
                      <td className="py-3 px-3.5 font-semibold text-slate-700">
                        ₹{(visa.governmentFee !== undefined ? Number(visa.governmentFee) : 0).toLocaleString('en-IN')}
                      </td>

                      {/* Service Fee */}
                      <td className="py-3 px-3.5 font-semibold text-slate-700">
                        ₹{(visa.serviceFee !== undefined && visa.serviceFee !== null ? Number(visa.serviceFee) : 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <AdminStatusBadge status={isVisaActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(visa)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(visa, e)}
                            title={isVisaActive ? 'Disable Visa' : 'Activate Visa'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isVisaActive
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
                              handleOpenDelete(visa);
                            }}
                            title="Delete Visa Offering"
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

      {/* 4. EDIT VISA MODAL */}
      {selectedVisa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{editFormData.flagEmoji}</span>
                <div>
                  <h3 className="text-base font-black text-[#082B61]">Edit Visa Configuration</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {editFormData.countryName} • {editFormData.visaType}
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

            {/* Form Body */}
            <form onSubmit={handleSaveChanges} className="p-4 sm:p-5 space-y-4.5 flex-grow">
              
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Visa configuration saved successfully. Customer portal updated.</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* 1. BASIC INFORMATION */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Visa Title *
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Visa Type / Category *
                    </label>
                    <input
                      type="text"
                      value={editFormData.visaType}
                      onChange={(e) => handleFieldChange('visaType', e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.shortDescription}
                    onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
                    placeholder="Brief highlight shown in destination cards"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* 2. TIMING & ENTRY PARAMETERS */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Timing & Entry Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Stay Period</label>
                    <input
                      type="text"
                      value={editFormData.stayPeriod}
                      onChange={(e) => handleFieldChange('stayPeriod', e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Validity</label>
                    <input
                      type="text"
                      value={editFormData.validity}
                      onChange={(e) => handleFieldChange('validity', e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Processing Time</label>
                    <input
                      type="text"
                      value={editFormData.processingTime}
                      onChange={(e) => handleFieldChange('processingTime', e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Entry Type</label>
                    <input
                      type="text"
                      value={editFormData.entryType}
                      onChange={(e) => handleFieldChange('entryType', e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. DESTINATION COVER IMAGE */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Visa / Destination Image
                  </h4>
                  <span className="text-[10px] text-slate-400">Cloud Storage / CDN</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  {/* Current Image Preview */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={editFormData.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                      alt="Visa cover preview"
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
                        placeholder="https://... or uploaded image reference"
                        className="flex-1 h-7 px-2 rounded-md border border-slate-200 text-[11px] text-[#082B61] bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PRICING & FEES (SEPARATE EMBASSY AND SERVICE FEE) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Pricing & Service Fees
                  </h4>
                  <span className="text-xs font-extrabold text-[#082B61]">
                    Total Visa Fee: <span className="text-[#2563EB]">₹{((Number(editFormData.governmentFee) || 0) + (Number(editFormData.serviceFee) || 0)).toLocaleString('en-IN')}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">
                      Embassy / Government Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.governmentFee}
                      onChange={(e) => handleFieldChange('governmentFee', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">
                      NimuFly Service Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.serviceFee}
                      onChange={(e) => handleFieldChange('serviceFee', e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">
                      Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Two-Line Calculation Summary */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Embassy / Government Fee</span>
                    <span className="font-bold text-[#082B61]">₹{(Number(editFormData.governmentFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NimuFly Service Fee</span>
                    <span className="font-bold text-[#082B61]">₹{(Number(editFormData.serviceFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-extrabold text-[#082B61]">
                    <span>Total Visa Fee</span>
                    <span className="text-sm font-black text-[#2563EB]">₹{((Number(editFormData.governmentFee) || 0) + (Number(editFormData.serviceFee) || 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* 5. REQUIRED DOCUMENTS */}
              <div className="pt-2 border-t border-slate-100">
                <RequirementsBuilder
                  requirements={editFormData.documents}
                  onChange={(docs) => setEditFormData((prev) => ({ ...prev, documents: docs }))}
                  helperText="Add the documents the customer must provide before processing. Formats will be validated dynamically."
                />
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

      {/* 5. ADD NEW VISA MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-[#082B61]">Add New Visa Offering</h3>
              <button
                type="button"
                onClick={handleCloseAddVisa}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateVisa} className="p-4 sm:p-5 space-y-4 flex-grow">
              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Visa created successfully!</span>
                </div>
              )}

              {/* Destination Country */}
              <div>
                <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                  Destination Country *
                </label>
                <select
                  value={addFormData.countryId}
                  onChange={(e) => {
                    const cObj = countries.find((c) => c.id === e.target.value);
                    setAddFormData((prev) => ({
                      ...prev,
                      countryId: e.target.value,
                      countryName: cObj?.name || prev.countryName,
                      image: cObj?.image || prev.image
                    }));
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="">Select Destination Country...</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flagEmoji || '🌍'} {c.displayName || c.name}
                    </option>
                  ))}
                </select>
                {addFormErrors.countryId && (
                  <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.countryId}</p>
                )}
              </div>

              {/* Destination Cover Image */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Destination Cover Image
                  </h4>
                  <span className="text-[10px] text-slate-400">Cloud Storage / CDN</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={addFormData.image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'}
                      alt="Visa cover preview"
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
                        placeholder="https://... or uploaded image reference"
                        className="flex-1 h-7 px-2 rounded-md border border-slate-200 text-[11px] text-[#082B61] bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visa Type */}
              <div>
                <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                  Visa Type *
                </label>
                <input
                  type="text"
                  value={addFormData.visaType}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, visaType: e.target.value }))}
                  placeholder="e.g. Tourist Visa"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                />
                {addFormErrors.visaType && (
                  <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.visaType}</p>
                )}
              </div>

              {/* Separate Pricing: Embassy Fee & Service Fee */}
              <div className="space-y-2.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Pricing & Service Fees
                  </h4>
                  <span className="text-xs font-extrabold text-[#082B61]">
                    Total Visa Fee: <span className="text-[#2563EB]">₹{((Number(addFormData.governmentFee) || 0) + (Number(addFormData.serviceFee) || 0)).toLocaleString('en-IN')}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">
                      Embassy / Government Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addFormData.governmentFee}
                      onChange={(e) => handleAddFieldChange('governmentFee', e.target.value)}
                      placeholder="e.g. 5500"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">
                      NimuFly Service Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addFormData.serviceFee}
                      onChange={(e) => handleAddFieldChange('serviceFee', e.target.value)}
                      placeholder="e.g. 1400"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Embassy / Government Fee</span>
                    <span className="font-bold text-[#082B61]">₹{(Number(addFormData.governmentFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NimuFly Service Fee</span>
                    <span className="font-bold text-[#082B61]">₹{(Number(addFormData.serviceFee) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-extrabold text-[#082B61]">
                    <span>Total Visa Fee</span>
                    <span className="text-sm font-black text-[#2563EB]">₹{((Number(addFormData.governmentFee) || 0) + (Number(addFormData.serviceFee) || 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Stay Period</label>
                  <input
                    type="text"
                    value={addFormData.stayPeriod}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, stayPeriod: e.target.value }))}
                    placeholder="30 Days"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Validity</label>
                  <input
                    type="text"
                    value={addFormData.validity}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, validity: e.target.value }))}
                    placeholder="90 Days"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-[#082B61] mb-1">Processing</label>
                  <input
                    type="text"
                    value={addFormData.processingTime}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, processingTime: e.target.value }))}
                    placeholder="3–5 Days"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  value={addFormData.description}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Overview of visa terms and consulate specifications..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                />
                {addFormErrors.description && (
                  <p className="text-[10.5px] text-rose-600 font-bold mt-1">{addFormErrors.description}</p>
                )}
              </div>

              {/* 5. REQUIRED DOCUMENTS */}
              <div className="pt-2 border-t border-slate-100">
                <RequirementsBuilder
                  requirements={addFormData.documents}
                  onChange={(docs) => setAddFormData((prev) => ({ ...prev, documents: docs }))}
                  helperText="Add the documents the customer must provide before processing. Formats will be validated dynamically."
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseAddVisa}
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
                      <span>Create Visa</span>
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
        isOpen={Boolean(deleteTargetVisa)}
        onClose={() => {
          setDeleteTargetVisa(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Visa Offering"
        entityName={deleteTargetVisa?.title || `${deleteTargetVisa?.countryName || ''} ${deleteTargetVisa?.visaType || 'Visa'}`}
        entityType="Visa Offering"
        warningMessage="This visa offering will be removed from customer-facing destination pages and search listings. Existing customer applications will remain safely stored."
        isDeleting={isDeletingVisa}
      />

    </div>
  );
}
