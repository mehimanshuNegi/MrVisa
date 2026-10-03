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
  Plus,
  Power,
  Trash2,
  ShieldCheck,
  Tag,
  Clock,
  ListChecks,
  ChevronDown,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { documentationService, adminService } from '../../services';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';
import RequirementsBuilder from '../../components/admin/RequirementsBuilder';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Services' },
  { value: 'Inactive', label: 'Inactive Services' }
];

export default function AdminDocumentationPage() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Delete State
  const [deleteTargetService, setDeleteTargetService] = useState(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Image Upload State
  const editImageInputRef = useRef(null);
  const addImageInputRef = useRef(null);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [isUploadingAddImage, setIsUploadingAddImage] = useState(false);

  // Edit Modal State
  const [editingService, setEditingService] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: '',
    shortDescription: '',
    description: '',
    icon: 'FileText',
    image: '',
    processingTime: '24–48 Hours',
    serviceFee: 0,
    governmentFee: 0,
    displayOrder: 0,
    status: 'ACTIVE',
    requirements: [],
    deliverablesHeader: 'What NimuFly will prepare for you',
    deliverables: [],
    conditionPrompt: '',
    conditionOptions: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Add Service Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    title: '',
    category: 'Visa & Travel Documentation',
    shortDescription: '',
    description: '',
    icon: 'FileText',
    image: '',
    processingTime: '24–48 Hours',
    serviceFee: 0,
    governmentFee: 0,
    displayOrder: 0,
    status: 'ACTIVE',
    requirements: [],
    deliverablesHeader: 'What NimuFly will prepare for you',
    deliverables: [],
    conditionPrompt: '',
    conditionOptions: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await documentationService.getAllServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load documentation services:', err);
      setLoadError('Failed to load documentation services from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.shortDescription?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && (s.isActive || s.status === 'ACTIVE')) ||
        (statusFilter === 'Inactive' && (!s.isActive || s.status === 'INACTIVE'));

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  // Open Edit Modal
  const handleEditClick = (service) => {
    setEditingService(service);
    setEditFormData({
      title: service.title || '',
      category: service.category || 'Visa & Travel Documentation',
      shortDescription: service.shortDescription || '',
      description: service.description || '',
      icon: service.icon || 'FileText',
      image: service.image || '',
      processingTime: service.processingTime || '24–48 Hours',
      serviceFee: service.serviceFee !== undefined && service.serviceFee !== null ? Number(service.serviceFee) : 0,
      governmentFee: service.governmentFee !== undefined && service.governmentFee !== null ? Number(service.governmentFee) : 0,
      displayOrder: service.displayOrder || 0,
      status: service.isActive || service.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      requirements: Array.isArray(service.requirements) ? service.requirements : [],
      deliverablesHeader: service.deliverablesHeader || 'What NimuFly will prepare for you',
      deliverables: Array.isArray(service.deliverables) ? service.deliverables : [],
      conditionPrompt: service.conditionPrompt || '',
      conditionOptions: Array.isArray(service.conditionOptions) ? service.conditionOptions : []
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const idToUpdate = editingService.id || editingService._id;
      const updated = await documentationService.updateService(idToUpdate, editFormData);
      setServices((prev) =>
        prev.map((s) => ((s.id || s._id) === idToUpdate ? { ...s, ...updated } : s))
      );
      setSaveSuccess(true);
      setBannerMessage(`Service "${updated.title}" updated successfully!`);
      setTimeout(() => {
        setEditingService(null);
        setSaveSuccess(false);
      }, 700);
    } catch (err) {
      console.error('Failed to update documentation service:', err);
      setSaveError(err.message || 'Failed to update service.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Add Service Form
  const handleSaveCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await documentationService.createService(addFormData);
      setServices((prev) => [...prev, created]);
      setBannerMessage(`New service "${created.title}" created successfully!`);
      setIsAddModalOpen(false);
      setAddFormData({
        title: '',
        category: 'Visa & Travel Documentation',
        shortDescription: '',
        description: '',
        icon: 'FileText',
        image: '',
        processingTime: '24–48 Hours',
        serviceFee: 0,
        governmentFee: 0,
        displayOrder: 0,
        status: 'ACTIVE',
        requirements: [],
        deliverablesHeader: 'What NimuFly will prepare for you',
        deliverables: [],
        conditionPrompt: '',
        conditionOptions: []
      });
    } catch (err) {
      console.error('Failed to create documentation service:', err);
      setCreateError(err.message || 'Failed to create service.');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete Action Handlers
  const handleOpenDelete = (service) => {
    setDeleteTargetService(service);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetService) return;
    setIsDeletingService(true);
    setDeleteError(null);
    try {
      const idToDelete = deleteTargetService.id || deleteTargetService._id;
      await documentationService.deleteService(idToDelete);
      setServices((prev) => prev.filter((s) => (s.id || s._id) !== idToDelete));
      setBannerMessage(`Documentation service "${deleteTargetService.title}" removed safely.`);
      setDeleteTargetService(null);
    } catch (err) {
      console.error('Failed to delete documentation service:', err);
      setDeleteError(err.message || 'Failed to delete documentation service.');
    } finally {
      setIsDeletingService(false);
    }
  };

  // Image Upload Handlers
  const handleImageUpload = async (file, isEdit = true) => {
    if (!file) return;
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
      console.error('Failed to upload service image:', err);
      if (isEdit) setSaveError('Image upload failed: ' + (err.message || ''));
      else setCreateError('Image upload failed: ' + (err.message || ''));
    } finally {
      if (isEdit) setIsUploadingEditImage(false);
      else setIsUploadingAddImage(false);
    }
  };

  // Quick toggle status
  const handleToggleStatus = async (service, e) => {
    e.stopPropagation();
    try {
      const idToUpdate = service.id || service._id;
      const newStatus = (service.status === 'ACTIVE' || service.isActive) ? 'INACTIVE' : 'ACTIVE';
      const updated = await documentationService.updateService(idToUpdate, {
        status: newStatus,
        isActive: newStatus === 'ACTIVE'
      });
      setServices((prev) =>
        prev.map((s) => ((s.id || s._id) === idToUpdate ? { ...s, ...updated } : s))
      );
    } catch (err) {
      console.error('Failed to toggle service status:', err);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Banner */}
      {bannerMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Documentation Services
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage consulate-verified documentation products, fees, turnarounds, and checklist requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Service</span>
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
              placeholder="Search documentation services by title, category, or keyword..."
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
      </div>

      {/* 3. DOCUMENTATION SERVICES TABLE */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-[#082B61]">Loading services...</p>
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
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200/80 space-y-2">
          <FileText size={28} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#082B61]">No documentation services found</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or reset the filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Service Name</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Processing</th>
                  <th className="py-2.5 px-3.5">Service Fee</th>
                  <th className="py-2.5 px-3.5">Govt Fee</th>
                  <th className="py-2.5 px-3.5">Requirements</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredServices.map((service) => {
                  const reqCount = Array.isArray(service.requirements) ? service.requirements.length : 0;
                  const isActive = service.status === 'ACTIVE' || service.isActive;

                  return (
                    <tr
                      key={service.id || service._id}
                      onClick={() => handleEditClick(service)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Title & Slug */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                            <FileText size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-[#082B61] block leading-tight">
                              {service.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              /{service.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {service.category || 'Documentation'}
                      </td>

                      {/* Processing */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        {service.processingTime || '24–48 Hours'}
                      </td>

                      {/* Service Fee */}
                      <td className="py-3 px-3.5 font-bold text-[#082B61] whitespace-nowrap">
                        ₹{(service.serviceFee !== undefined && service.serviceFee !== null ? Number(service.serviceFee) : 0).toLocaleString('en-IN')}
                      </td>

                      {/* Govt Fee */}
                      <td className="py-3 px-3.5 font-medium text-slate-500 whitespace-nowrap">
                        {service.governmentFee && Number(service.governmentFee) > 0
                          ? `₹${Number(service.governmentFee).toLocaleString('en-IN')}`
                          : '₹0'}
                      </td>

                      {/* Requirements Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[11px] font-bold border border-blue-100">
                          <ListChecks size={12} />
                          <span>{reqCount} {reqCount === 1 ? 'doc' : 'docs'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <AdminStatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleEditClick(service)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(service, e)}
                            title={isActive ? 'Deactivate Service' : 'Activate Service'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isActive
                                ? 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(service)}
                            title="Delete Service"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
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

      {/* 4. EDIT SERVICE MODAL */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#082B61]">Edit Documentation Service</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {editingService.title} • Backend slug: /{editingService.slug}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-6 flex-grow">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Service updated successfully!</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* SECTION 1: Basic Information */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Basic Information</h4>
                  <p className="text-[11px] text-slate-400">Primary service identification and customer-facing name.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      required
                      placeholder="e.g. Income Tax Return (ITR) Filing"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Customer-facing service title</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      placeholder="e.g. Visa & Travel Documentation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Categorization for navigation filters</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={editFormData.shortDescription}
                    onChange={(e) => setEditFormData({ ...editFormData, shortDescription: e.target.value })}
                    placeholder="Concise overview shown on service cards"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Displayed on search results and catalog cards</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Full explanation of the service and preparation steps..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: Service Details & Turnaround */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Service Details & Turnaround</h4>
                  <p className="text-[11px] text-slate-400">Processing timelines and deliverables prepared by NimuFly.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Processing / Turnaround Time
                  </label>
                  <input
                    type="text"
                    value={editFormData.processingTime}
                    onChange={(e) => setEditFormData({ ...editFormData, processingTime: e.target.value })}
                    placeholder="e.g. 24–48 Hours"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Expected turnaround shown on product card and checkout</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Deliverables (What NimuFly will prepare for you, one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={Array.isArray(editFormData.deliverables) ? editFormData.deliverables.join('\n') : ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        deliverables: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    placeholder="Official embassy-standard cover letter&#10;Verified itinerary breakdown"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 3: Pricing & Fees */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Pricing & Fees</h4>
                  <p className="text-[11px] text-slate-400">All pricing is backend-authoritative. Transparent breakdown between NimuFly and official fees.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Service Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.serviceFee}
                      onChange={(e) => setEditFormData({ ...editFormData, serviceFee: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Amount charged by NimuFly to the customer.</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Government / Embassy Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.governmentFee}
                      onChange={(e) => setEditFormData({ ...editFormData, governmentFee: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Official fee charged by the embassy or government. Leave empty if not applicable; the customer portal will show ₹0.</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Required Documents & Formats */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Required Documents & Formats</h4>
                  <p className="text-[11px] text-slate-400">Configure applicant upload requirements, mandatory flags, and accepted file extensions.</p>
                </div>

                <RequirementsBuilder
                  requirements={editFormData.requirements}
                  onChange={(reqs) => setEditFormData({ ...editFormData, requirements: reqs })}
                />
              </div>

              {/* SECTION 5: Service Image */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">5. Service Image</h4>
                  <p className="text-[11px] text-slate-400">Upload an image or specify an image URL stored in Cloudflare R2 / media storage.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={editFormData.image || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'}
                      alt="Service preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80';
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
                            <Loader2 size={13} className="animate-spin text-[#2563EB]" />
                            <span>Uploading to Storage...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            <span>Upload Image</span>
                          </>
                        )}
                      </button>

                      {editFormData.image && (
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, image: '' })}
                          className="text-xs text-rose-600 hover:underline px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={editFormData.image}
                      onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                      placeholder="Or enter direct image URL (https://...)"
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: Visibility & Ordering */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">6. Visibility & Ordering</h4>
                  <p className="text-[11px] text-slate-400">Control active publication status on the customer portal.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE (Published to Customer Portal)</option>
                      <option value="INACTIVE">INACTIVE (Hidden from Customers)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Inactive services will not be visible to clients</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Display Order Rank
                    </label>
                    <input
                      type="number"
                      value={editFormData.displayOrder}
                      onChange={(e) => setEditFormData({ ...editFormData, displayOrder: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Lower numbers appear first on the page</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
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
                      <span>Saving to Database...</span>
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

      {/* 5. ADD SERVICE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#082B61]">Add Documentation Service</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Create a new documentation product. Backend automatically generates clean unique slugs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-4 sm:p-6 space-y-6 flex-grow">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* SECTION 1: Basic Information */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Basic Information</h4>
                  <p className="text-[11px] text-slate-400">Primary service identification and customer-facing name.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      value={addFormData.title}
                      onChange={(e) => setAddFormData({ ...addFormData, title: e.target.value })}
                      required
                      placeholder="e.g. Cover Letter Preparation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Customer-facing service title</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={addFormData.category}
                      onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                      placeholder="e.g. Visa & Travel Documentation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Categorization for navigation filters</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={addFormData.shortDescription}
                    onChange={(e) => setAddFormData({ ...addFormData, shortDescription: e.target.value })}
                    placeholder="Concise overview shown on service cards"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Displayed on search results and catalog cards</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={2}
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder="Full explanation of the service and preparation steps..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: Service Details & Turnaround */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Service Details & Turnaround</h4>
                  <p className="text-[11px] text-slate-400">Processing timelines and deliverables prepared by NimuFly.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Processing / Turnaround Time
                  </label>
                  <input
                    type="text"
                    value={addFormData.processingTime}
                    onChange={(e) => setAddFormData({ ...addFormData, processingTime: e.target.value })}
                    placeholder="e.g. 24–48 Hours"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Expected turnaround shown on product card and checkout</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Deliverables (What NimuFly will prepare for you, one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={Array.isArray(addFormData.deliverables) ? addFormData.deliverables.join('\n') : ''}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        deliverables: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    placeholder="Official embassy-standard cover letter&#10;Verified itinerary breakdown"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 3: Pricing & Fees */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Pricing & Fees</h4>
                  <p className="text-[11px] text-slate-400">All pricing is backend-authoritative. Transparent breakdown between NimuFly and official fees.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Service Fee (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addFormData.serviceFee}
                      onChange={(e) => setAddFormData({ ...addFormData, serviceFee: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Amount charged by NimuFly to the customer.</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Government / Embassy Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addFormData.governmentFee}
                      onChange={(e) => setAddFormData({ ...addFormData, governmentFee: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Official fee charged by the embassy or government. Leave empty if not applicable; the customer portal will show ₹0.</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Required Documents & Formats */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Required Documents & Formats</h4>
                  <p className="text-[11px] text-slate-400">Configure applicant upload requirements, mandatory flags, and accepted file extensions.</p>
                </div>

                <RequirementsBuilder
                  requirements={addFormData.requirements}
                  onChange={(reqs) => setAddFormData({ ...addFormData, requirements: reqs })}
                />
              </div>

              {/* SECTION 5: Service Image */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">5. Service Image</h4>
                  <p className="text-[11px] text-slate-400">Upload an image or specify an image URL stored in Cloudflare R2 / media storage.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/60">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 relative shadow-2xs">
                    <img
                      src={addFormData.image || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'}
                      alt="Service preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80';
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
                            <Loader2 size={13} className="animate-spin text-[#2563EB]" />
                            <span>Uploading to Storage...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            <span>Upload Image</span>
                          </>
                        )}
                      </button>

                      {addFormData.image && (
                        <button
                          type="button"
                          onClick={() => setAddFormData({ ...addFormData, image: '' })}
                          className="text-xs text-rose-600 hover:underline px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={addFormData.image}
                      onChange={(e) => setAddFormData({ ...addFormData, image: e.target.value })}
                      placeholder="Or enter direct image URL (https://...)"
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: Visibility & Ordering */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">6. Visibility & Ordering</h4>
                  <p className="text-[11px] text-slate-400">Control active publication status on the customer portal.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Status
                    </label>
                    <select
                      value={addFormData.status}
                      onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE (Published to Customer Portal)</option>
                      <option value="INACTIVE">INACTIVE (Hidden from Customers)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Inactive services will not be visible to clients</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Display Order Rank
                    </label>
                    <input
                      type="number"
                      value={addFormData.displayOrder}
                      onChange={(e) => setAddFormData({ ...addFormData, displayOrder: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Lower numbers appear first on the page</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                      <span>Creating in Database...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Create Service</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTargetService)}
        onClose={() => setDeleteTargetService(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingService}
        title="Remove Documentation Service"
        entityName={deleteTargetService?.title}
        entityType="Documentation Service"
        error={deleteError}
      />

    </div>
  );
}
