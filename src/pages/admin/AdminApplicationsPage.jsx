import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  CreditCard,
  User,
  MapPin,
  Calendar,
  X,
  Save,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Download,
  Star,
  Trash2
} from 'lucide-react';
import { applicationService, documentService } from '../../services';
import {
  APPLICATION_STATUS,
  REQUIRED_ACTION,
  STATUS_CONFIG,
  getStatusConfig
} from '../../models/status';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Application Received', label: 'Application Received' },
  { value: 'Documents Under Review', label: 'Docs Under Review' },
  { value: 'Additional Information Required', label: 'Action Required' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Visa Issued', label: 'Visa Issued' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' }
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');

  // Selected Application for Details & Edit Panel
  const [selectedApp, setSelectedApp] = useState(null);

  // Edit form state for selected application
  const [editStatus, setEditStatus] = useState('');
  const [editAdminMessage, setEditAdminMessage] = useState('');
  const [editRequiredAction, setEditRequiredAction] = useState('');
  const [editDocuments, setEditDocuments] = useState([]);

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete operation state
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState(null);

  // Handle permanent deletion of an application
  const handleConfirmDelete = async () => {
    if (!applicationToDelete) return;
    const targetId = applicationToDelete.id || applicationToDelete._id;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await applicationService.deleteApplication(targetId);
      // Remove from table immediately
      setApplications((prev) => prev.filter((a) => a.id !== targetId && a._id !== targetId));
      // Close details modal if open
      if (selectedApp && (selectedApp.id === targetId || selectedApp._id === targetId)) {
        setSelectedApp(null);
      }
      setApplicationToDelete(null);
      setDeleteSuccessNotice('Application deleted successfully.');
      setTimeout(() => setDeleteSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Failed to delete application:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete application. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load all applications from applicationService
  const loadApplications = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await applicationService.getApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setLoadError('Failed to load applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Preview & Download states
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState(null);
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  // When opening an application, populate the edit form controls and fetch live documents
  const handleOpenDetails = async (app) => {
    setSelectedApp(app);
    setEditStatus(app.status || APPLICATION_STATUS.APPLICATION_RECEIVED);
    setEditAdminMessage(app.adminMessage || '');
    setEditRequiredAction(app.requiredAction || REQUIRED_ACTION.NONE);
    setEditDocuments(app.documents ? JSON.parse(JSON.stringify(app.documents)) : []);
    setSaveSuccess(false);

    // Refresh application documents with live signed URLs
    const appId = app.id || app.referenceNumber;
    if (appId) {
      try {
        const freshDocs = await documentService.getDocumentsByApplication(appId);
        if (Array.isArray(freshDocs) && freshDocs.length > 0) {
          setEditDocuments(freshDocs);
          setSelectedApp((prev) => (prev && (prev.id === appId || prev.referenceNumber === appId) ? { ...prev, documents: freshDocs } : prev));
        }
      } catch (err) {
        console.warn('Could not refresh application documents:', err);
      }
    }

    // Fetch feedback if not attached
    if (!app.feedback && app.id) {
      applicationService.getApplicationFeedback(app.id)
        .then((fb) => {
          if (fb) {
            setSelectedApp((prev) => (prev && prev.id === app.id ? { ...prev, feedback: fb } : prev));
          }
        })
        .catch(() => {});
    }
  };

  // Document preview handler
  const handleOpenPreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl('');
    setPreviewError(null);

    const appId = selectedApp?.id || selectedApp?.referenceNumber || '';

    try {
      let finalUrl = '';

      // Check if doc already has a valid signedUrl
      if (doc.signedUrl && typeof doc.signedUrl === 'string' && doc.signedUrl.startsWith('http')) {
        finalUrl = doc.signedUrl;
      } else if (doc.fileUrl && typeof doc.fileUrl === 'string' && doc.fileUrl.startsWith('http')) {
        finalUrl = doc.fileUrl;
      }

      // If not yet available, request a fresh signed preview URL from backend
      if (!finalUrl && (doc.id || doc.documentId || doc.storageKey)) {
        finalUrl = await documentService.getDocumentPreviewUrl(doc, appId);
      }

      if (!finalUrl) {
        throw new Error('Unable to retrieve document preview link.');
      }

      setPreviewUrl(finalUrl);
    } catch (e) {
      console.warn('Could not retrieve presigned preview URL:', e);
      setPreviewError('Unable to load document preview. Please check connection or try downloading.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Original customer document download handler
  const handleDownloadDoc = async (doc) => {
    const docId = doc.id || doc.documentId;
    const appId = selectedApp?.id || selectedApp?.referenceNumber || '';
    setDownloadingDocId(docId);

    try {
      await documentService.downloadDocument(doc, appId);
    } catch (e) {
      console.error('Download document failed:', e);
      alert('Unable to download document. Please check connection and try again.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Close details panel
  const handleCloseDetails = () => {
    setSelectedApp(null);
    setSaveSuccess(false);
    setPreviewDoc(null);
    setPreviewUrl('');
    setPreviewError(null);
  };

  // Update specific document verification status in local edit state
  const handleDocumentStatusChange = (docId, newStatus) => {
    setEditDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: newStatus, verificationStatus: newStatus } : d
      )
    );
  };

  // Save changes through applicationService
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsSaving(true);
    try {
      const updates = {
        status: editStatus,
        adminMessage: editAdminMessage.trim(),
        requiredAction: editRequiredAction,
        documents: editDocuments
      };

      const updated = await applicationService.updateApplication(selectedApp.id, updates);

      // Update in applications list
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setSelectedApp(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save application changes:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Unique country list for dropdown
  const countryOptions = useMemo(() => {
    const set = new Set();
    applications.forEach((a) => {
      const c = a.destination || a.countryName;
      if (c) set.add(c);
    });
    return [
      { value: 'All', label: 'All Destinations' },
      ...Array.from(set).sort().map((c) => ({ value: c, label: c }))
    ];
  }, [applications]);

  // Operational metrics directly derived from real data
  const metrics = useMemo(() => {
    const total = applications.length;
    const received = applications.filter(
      (a) => a.status === APPLICATION_STATUS.APPLICATION_RECEIVED
    ).length;
    const docsReview = applications.filter(
      (a) => a.status === APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW
    ).length;
    const processing = applications.filter(
      (a) => a.status === APPLICATION_STATUS.PROCESSING
    ).length;
    const completed = applications.filter(
      (a) => a.status === APPLICATION_STATUS.APPROVED || a.status === APPLICATION_STATUS.VISA_ISSUED || a.status === APPLICATION_STATUS.COMPLETED
    ).length;
    return { total, received, docsReview, processing, completed };
  }, [applications]);

  // Filtered applications based on search query, status filter, and country filter
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // 1. Search filter: match ID, traveller name, email, or country
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        app.id.toLowerCase().includes(q) ||
        (app.destination && app.destination.toLowerCase().includes(q)) ||
        (app.countryName && app.countryName.toLowerCase().includes(q)) ||
        (app.travellers &&
          app.travellers.some(
            (t) =>
              (t.name && t.name.toLowerCase().includes(q)) ||
              (t.email && t.email.toLowerCase().includes(q)) ||
              (t.passportNumber && t.passportNumber.toLowerCase().includes(q))
          ));

      // 2. Status filter
      const appStatusCfg = getStatusConfig(app.status);
      const matchesStatus =
        statusFilter === 'All' ||
        app.status === statusFilter ||
        appStatusCfg.label.toLowerCase() === statusFilter.toLowerCase();

      // 3. Country filter
      const appCountry = app.destination || app.countryName;
      const matchesCountry = countryFilter === 'All' || appCountry === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [applications, searchQuery, statusFilter, countryFilter]);

  return (
    <div className="space-y-5">
      {/* Small Success Notification */}
      {deleteSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{deleteSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Applications
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review and manage customer visa applications and document queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadApplications}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#2563EB]' : 'text-slate-400'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL SUMMARY BLOCKS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Applications
          </span>
          <span className="text-2xl font-black text-[#082B61] mt-0.5 block">
            {metrics.total}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-600 block">
            Docs Under Review
          </span>
          <span className="text-2xl font-black text-[#082B61] mt-0.5 block">
            {metrics.docsReview}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 block">
            In Processing
          </span>
          <span className="text-2xl font-black text-[#082B61] mt-0.5 block">
            {metrics.processing}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-600 block">
            Approved / Completed
          </span>
          <span className="text-2xl font-black text-[#082B61] mt-0.5 block">
            {metrics.completed}
          </span>
        </div>
      </div>

      {/* 3. SEARCH & HOVER DROPDOWN FILTERS */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by application ID, traveller name, email, or destination..."
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

          {/* Hover Status Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <AdminDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              labelPrefix="Status"
              icon={Filter}
            />

            {/* Hover Country Filter Dropdown */}
            <AdminDropdown
              value={countryFilter}
              onChange={setCountryFilter}
              options={countryOptions}
              labelPrefix="Country"
              icon={MapPin}
            />

            {(searchQuery || statusFilter !== 'All' || countryFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setCountryFilter('All');
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
          Showing <strong className="text-[#082B61] font-bold">{filteredApplications.length}</strong> of{' '}
          <strong className="text-[#082B61] font-bold">{applications.length}</strong> total records
        </div>
      </div>

      {/* 4. APPLICATIONS TABLE */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-[#082B61]">Loading customer applications...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl p-8 border border-red-200 text-center space-y-2">
          <AlertCircle size={24} className="text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={loadApplications}
            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200/80 space-y-2">
          <FileText size={28} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#082B61]">No applications match criteria</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or clear the active filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Application ID</th>
                  <th className="py-2.5 px-3.5">Applicant</th>
                  <th className="py-2.5 px-3.5">Visa / Country</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Documents</th>
                  <th className="py-2.5 px-3.5">Payment</th>
                  <th className="py-2.5 px-3.5">Submitted</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredApplications.map((app) => {
                  const primaryName = app.travellers?.[0]?.name || 'Applicant';
                  const primaryEmail = app.travellers?.[0]?.email || 'customer@example.com';
                  const docCount = Array.isArray(app.documents) ? app.documents.length : 0;
                  const verifiedDocs = Array.isArray(app.documents)
                    ? app.documents.filter((d) => d.status === 'VERIFIED').length
                    : 0;
                  const isSelected = selectedApp?.id === app.id;

                  return (
                    <tr
                      key={app.id}
                      onClick={() => handleOpenDetails(app)}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Application ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                        {app.id}
                      </td>

                      {/* Customer Name & Email */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#082B61] leading-tight">{primaryName}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                          {primaryEmail}
                        </div>
                      </td>

                      {/* Destination / Visa Type */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="text-sm select-none">{app.flagEmoji}</span>
                          <span className="font-bold text-[#082B61]">{app.destination || app.countryName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{app.visaType}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <AdminStatusBadge status={app.status} />
                      </td>

                      {/* Documents Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-600">
                        {docCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <FileCheck size={13} className="text-[#2563EB]" />
                            <span>{verifiedDocs}/{docCount} Verified</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0 Uploaded</span>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-[#082B61]">{app.amountPaid || app.amount}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block leading-none">Paid</span>
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {app.submittedDate}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(app);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setApplicationToDelete(app);
                              setDeleteError(null);
                            }}
                            title="Delete Application"
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
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

      {/* 5. APPLICATION DETAILS MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">{selectedApp.flagEmoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-md border border-blue-200/60">
                      {selectedApp.id}
                    </span>
                    <AdminStatusBadge status={selectedApp.status} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {selectedApp.destination || selectedApp.countryName} • {selectedApp.visaType} • Submitted on {selectedApp.submittedDate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-5 flex-grow">
              
              {/* Save Success Alert */}
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Application updated successfully. Customer will see the updated status immediately.</span>
                </div>
              )}

              {/* SECTION 1: APPLICANT */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User size={13} className="text-[#2563EB]" />
                  <span>Applicant Information</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Full Name</span>
                    <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.travellers?.[0]?.name || 'Applicant'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                    <span className="font-medium text-slate-600 mt-0.5 block truncate">
                      {selectedApp.travellers?.[0]?.email || 'customer@example.com'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone</span>
                    <span className="font-medium text-slate-600 mt-0.5 block">
                      {selectedApp.travellers?.[0]?.phone || '+91 98765 43210'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Passport No.</span>
                    <span className="font-mono font-medium text-slate-700 mt-0.5 block">
                      {selectedApp.travellers?.[0]?.passportNumber || 'A1234567'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VISA & TRAVEL DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Visa Spec */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#2563EB]" />
                    <span>Visa Details</span>
                  </h4>
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Destination</span>
                      <span className="font-bold text-[#082B61]">{selectedApp.destination || selectedApp.countryName}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Visa Type</span>
                      <span className="font-bold text-[#082B61]">{selectedApp.visaType}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Entry Type</span>
                      <span className="font-medium text-slate-700">{selectedApp.entryType || 'Single Entry'}</span>
                    </div>
                  </div>
                </div>

                {/* Travel & Payment Details */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CreditCard size={13} className="text-emerald-600" />
                    <span>Payment & Schedule</span>
                  </h4>
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Amount Paid</span>
                      <span className="font-bold text-[#082B61]">{selectedApp.amountPaid || selectedApp.amount}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Payment Status</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={11} strokeWidth={3} /> Paid • Confirmed
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Expected Delivery</span>
                      <span className="font-medium text-slate-700">{selectedApp.expectedDate || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ADDITIONAL INFORMATION & VISA REFUSAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Additional Information */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText size={13} className="text-[#2563EB]" />
                    <span>Additional Information</span>
                  </h4>
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 text-xs">
                    <span className="text-slate-700 font-medium whitespace-pre-wrap block">
                      {selectedApp.additionalInformation && selectedApp.additionalInformation.trim()
                        ? selectedApp.additionalInformation
                        : 'Not provided'}
                    </span>
                  </div>
                </div>

                {/* Previous Visa Refusal */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[#2563EB]" />
                    <span>Previous Visa Refusal</span>
                  </h4>
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Country</span>
                      <span className="font-bold text-[#082B61]">
                        {selectedApp.previousVisaRefusalCountry || selectedApp.destination || selectedApp.countryName || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Refused</span>
                      <span className={`font-bold ${selectedApp.previousVisaRefusal === true ? 'text-rose-600' : 'text-slate-700'}`}>
                        {selectedApp.previousVisaRefusal === true ? 'Yes' : selectedApp.previousVisaRefusal === false ? 'No' : 'Not provided'}
                      </span>
                    </div>
                    {selectedApp.previousVisaRefusal && selectedApp.previousVisaRefusalReason && (
                      <div className="pt-1 border-t border-slate-200/60 mt-1">
                        <span className="text-[11px] text-slate-400 block mb-0.5">Reason:</span>
                        <span className="font-medium text-slate-700 block whitespace-pre-wrap">
                          {selectedApp.previousVisaRefusalReason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: CUSTOMER FEEDBACK */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Star size={13} className="text-amber-500" />
                  <span>Customer Feedback</span>
                </h4>
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 text-xs">
                  {selectedApp.feedback?.rating ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= selectedApp.feedback.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300'
                              }
                            />
                          ))}
                        </div>
                        <span className="font-black text-[#082B61]">
                          {selectedApp.feedback.rating} / 5
                        </span>
                      </div>
                      {selectedApp.feedback.comment && (
                        <p className="text-slate-600 font-medium italic mt-1">
                          "{selectedApp.feedback.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No feedback submitted</span>
                  )}
                </div>
              </div>

              {/* SECTION 3: SUBMITTED DOCUMENTS */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} className="text-[#2563EB]" />
                    <span>Submitted Documents</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {editDocuments.length} Document(s)
                  </span>
                </h4>

                {editDocuments.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">No documents currently uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {editDocuments.map((doc) => {
                      const isVerified = (doc.status === 'VERIFIED' || doc.status === 'Verified' || doc.verificationStatus === 'VERIFIED' || doc.verificationStatus === 'Verified');
                      const isActionReq = (doc.status === 'ACTION_REQUIRED' || doc.status === 'Action Required' || doc.verificationStatus === 'ACTION_REQUIRED');
                      const docName = doc.name || doc.originalFilename || 'Document';
                      const docType = doc.documentType || doc.category || 'Visa Document';
                      const extMatch = docName.match(/\.([a-zA-Z0-9]+)$/);
                      const format = doc.fileFormat || doc.format || (extMatch ? extMatch[1].toUpperCase() : 'PDF');

                      return (
                        <div
                          key={doc.id || doc.documentId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#082B61] truncate block">{docName}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                {format}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">{docType}</span>
                              <span className="text-slate-300">•</span>
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                isVerified
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : isActionReq
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/70'
                              }`}>
                                {isVerified ? 'Verified' : isActionReq ? 'Action Required' : 'Pending Review'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Preview Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#2563EB] bg-blue-50/60 hover:bg-blue-50 border border-blue-200/70 transition-colors cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>

                            {/* Download Button */}
                            <button
                              type="button"
                              disabled={downloadingDocId === (doc.id || doc.documentId)}
                              onClick={() => handleDownloadDoc(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {downloadingDocId === (doc.id || doc.documentId) ? (
                                <RefreshCw size={12} className="animate-spin text-[#2563EB]" />
                              ) : (
                                <Download size={12} />
                              )}
                              <span>Download</span>
                            </button>

                            {/* Verification Toggle Buttons */}
                            <button
                              type="button"
                              onClick={() => handleDocumentStatusChange(doc.id, 'VERIFIED')}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer ${
                                isVerified
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              ✓ Verify
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDocumentStatusChange(doc.id, 'ACTION_REQUIRED')}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer ${
                                isActionReq
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Action Required
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 4: APPLICATION STATUS & ACTION FORM */}
              <form onSubmit={handleSaveChanges} className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Update Application Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Current Status *
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      {Object.values(APPLICATION_STATUS).map((st) => (
                        <option key={st} value={st}>
                          {STATUS_CONFIG[st]?.label || st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Required Action Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Required Customer Action
                    </label>
                    <select
                      value={editRequiredAction}
                      onChange={(e) => setEditRequiredAction(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-[#082B61] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    >
                      <option value="NONE">None — Normal Flow</option>
                      <option value="UPLOAD_DOCUMENT">Upload Missing Document</option>
                      <option value="CLARIFY_INFO">Clarify Travel Information</option>
                      <option value="CONTACT_SUPPORT">Contact Travel Support</option>
                    </select>
                  </div>
                </div>

                {/* Message to customer */}
                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Message for Customer (Visible in Customer Portal)
                  </label>
                  <textarea
                    rows={2}
                    value={editAdminMessage}
                    onChange={(e) => setEditAdminMessage(e.target.value)}
                    placeholder="e.g. Your passport scan was accepted. Application submitted to consulate."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApplicationToDelete(selectedApp);
                      setDeleteError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Application</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseDetails}
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
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DOCUMENT PREVIEW MODAL
          ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <FileText size={18} className="text-[#2563EB] flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#082B61] truncate">
                    {previewDoc.name || previewDoc.originalFilename || 'Document Preview'}
                  </h3>
                  <span className="text-[10px] text-slate-400 block">
                    {previewDoc.documentType || previewDoc.category || 'Customer Document'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  disabled={downloadingDocId === (previewDoc.id || previewDoc.documentId)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors cursor-pointer disabled:opacity-50"
                  title="Download original file"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewUrl('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-grow overflow-auto flex items-center justify-center min-h-[300px] bg-slate-50/50">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400 text-xs font-medium py-12">
                  <Loader2 size={24} className="animate-spin text-[#2563EB]" />
                  <span>Generating secure presigned preview...</span>
                </div>
              ) : previewError ? (
                <div className="text-center py-10 space-y-3 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#082B61]">Preview unavailable</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {previewError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDoc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Original File</span>
                  </button>
                </div>
              ) : previewUrl ? (
                (() => {
                  const docName = previewDoc.name || previewDoc.originalFilename || '';
                  const extMatch = docName.match(/\.([a-zA-Z0-9]+)$/);
                  const ext = extMatch ? extMatch[1].toUpperCase() : '';
                  const format = (previewDoc.fileFormat || previewDoc.format || ext).toUpperCase();
                  const isPdf = format.includes('PDF') || (typeof previewUrl === 'string' && previewUrl.toLowerCase().includes('.pdf'));
                  const isImage = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].some(f => format.includes(f)) ||
                                  previewDoc.mimeType?.startsWith('image/') ||
                                  (typeof previewUrl === 'string' && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(previewUrl)) ||
                                  !isPdf;

                  if (isPdf) {
                    return (
                      <div className="w-full space-y-3">
                        <iframe
                          src={previewUrl}
                          title={docName}
                          className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                        />
                        <div className="flex justify-center">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
                          >
                            <span>Open in new tab</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  }

                  if (isImage) {
                    return (
                      <div className="max-h-[65vh] w-full flex items-center justify-center p-2">
                        <img
                          src={previewUrl}
                          alt={docName}
                          className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-sm border border-slate-200"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-10 space-y-3 max-w-sm">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                        <FileText size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-[#082B61]">Preview unavailable</h4>
                        <p className="text-[11px] text-slate-400">
                          Direct in-browser preview is unavailable for {format || 'this'} file type. Please download the original file to view.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(previewDoc)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Download Original File</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-10 space-y-3 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#082B61]">Preview unavailable</h4>
                    <p className="text-[11px] text-slate-400">
                      Could not generate preview link. You can still download the original document.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDoc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Original File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE CONFIRMATION MODAL
          ======================================================== */}
      {applicationToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#082B61]">Delete Application?</h3>
                <p className="text-xs font-mono text-slate-500 font-semibold">{applicationToDelete.id || applicationToDelete.referenceNumber || 'Application'}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              This will permanently delete this application and its associated uploaded documents. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setApplicationToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
