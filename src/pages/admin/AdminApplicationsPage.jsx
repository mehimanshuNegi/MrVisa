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
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { applicationService } from '../../services';
import {
  APPLICATION_STATUS,
  REQUIRED_ACTION,
  STATUS_CONFIG,
  getStatusConfig
} from '../../models/status';

const STATUS_FILTER_OPTIONS = [
  'All',
  'Application Received',
  'Documents Under Review',
  'Additional Information Required',
  'Processing',
  'Approved',
  'Visa Issued',
  'Completed'
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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

  // Load all applications from applicationService
  const loadApplications = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await applicationService.getApplications();
      setApplications(data);
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

  // When opening an application, populate the edit form controls
  const handleOpenDetails = (app) => {
    setSelectedApp(app);
    setEditStatus(app.status || APPLICATION_STATUS.APPLICATION_RECEIVED);
    setEditAdminMessage(app.adminMessage || '');
    setEditRequiredAction(app.requiredAction || REQUIRED_ACTION.NONE);
    setEditDocuments(app.documents ? JSON.parse(JSON.stringify(app.documents)) : []);
    setSaveSuccess(false);
  };

  // Close details panel
  const handleCloseDetails = () => {
    setSelectedApp(null);
    setSaveSuccess(false);
  };

  // Update specific document verification status in local edit state
  const handleDocumentStatusChange = (docId, newStatus) => {
    setEditDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: newStatus, verificationStatus: newStatus } : d))
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

  // Filtered applications based on search query and status filter
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

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          PAGE HEADER
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
            Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage and track customer visa applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadApplications}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SEARCH & STATUS CONTROLS
          ======================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by application ID, traveller name, email, or country..."
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

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
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
            Showing <strong className="text-[#082B61] font-bold">{filteredApplications.length}</strong> of{' '}
            <strong className="text-[#082B61] font-bold">{applications.length}</strong> applications
          </span>
          {(searchQuery || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
              className="text-[#2563EB] hover:underline font-bold text-xs"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          APPLICATIONS LIST (Clean Table / Card Rows)
          ======================================================== */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-[#082B61]">Loading applications...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl p-8 border border-red-200 text-center space-y-3">
          <AlertCircle size={28} className="text-red-500 mx-auto" />
          <p className="text-sm font-bold text-red-700">{loadError}</p>
          <button
            type="button"
            onClick={loadApplications}
            className="px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 space-y-3">
          <FileText size={32} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#082B61]">No applications found</h3>
          <p className="text-xs text-slate-400 font-medium">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Visa Type</th>
                  <th className="py-3 px-4">Travellers</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expected</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredApplications.map((app) => {
                  const statusCfg = getStatusConfig(app.status);
                  const primaryName = app.travellers?.[0]?.name || 'Applicant';
                  const isSelected = selectedApp?.id === app.id;

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Application ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                        {app.id}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">
                        {primaryName}
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base select-none">{app.flagEmoji}</span>
                          <span className="font-semibold">{app.destination || app.countryName}</span>
                        </div>
                      </td>

                      {/* Visa Type */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {app.visaType}
                      </td>

                      {/* Travellers */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {app.travellerCount} {app.travellerCount === 1 ? 'Person' : 'People'}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {app.submittedDate}
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Expected Completion */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {app.expectedDate || '—'}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-4 font-bold text-[#082B61] whitespace-nowrap">
                        {app.amountPaid || app.amount}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(app)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View</span>
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
          APPLICATION DETAILS & ADMIN CONTROL PANEL (MODAL / SLIDE-OVER)
          ======================================================== */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{selectedApp.flagEmoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#082B61]">
                      Application Details
                    </h2>
                    <span className="font-mono font-bold text-xs bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-md">
                      {selectedApp.id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedApp.destination || selectedApp.countryName} • {selectedApp.visaType} • Submitted on {selectedApp.submittedDate}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 flex-grow">
              
              {/* Feedback Alert if saved */}
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Application updated successfully. Customer Account will reflect these changes immediately.</span>
                </div>
              )}

              {/* 1. Customer Information Card */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                  <User size={14} className="text-[#2563EB]" />
                  <span>Customer Information</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Name</span>
                    <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.travellers?.[0]?.name || 'Applicant'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                    <span className="font-semibold text-slate-600 mt-0.5 block truncate">
                      {selectedApp.travellers?.[0]?.email || 'customer@example.com'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone</span>
                    <span className="font-semibold text-slate-600 mt-0.5 block">
                      {selectedApp.travellers?.[0]?.phone || '+91 98765 43210'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nationality</span>
                    <span className="font-semibold text-slate-600 mt-0.5 block">
                      {selectedApp.travellers?.[0]?.nationality || 'Indian'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Visa & Payment Meta Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Visa Spec */}
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <MapPin size={14} className="text-[#2563EB]" />
                    <span>Visa Information</span>
                  </div>
                  <div className="space-y-1 text-xs">
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
                      <span className="font-bold text-[#082B61]">{selectedApp.entryType || 'Single Entry'}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Spec */}
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-[#082B61] uppercase tracking-wider">
                    <CreditCard size={14} className="text-emerald-600" />
                    <span>Payment Information</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Amount Paid</span>
                      <span className="font-black text-[#082B61]">{selectedApp.amountPaid || selectedApp.amount}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Payment Status</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={12} strokeWidth={3} /> Paid • Confirmed
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Expected Delivery</span>
                      <span className="font-bold text-slate-600">{selectedApp.expectedDate || '—'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Travellers Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                  Travellers ({selectedApp.travellers?.length || selectedApp.travellerCount})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                  {(selectedApp.travellers || []).map((t, idx) => (
                    <div key={t.id || idx} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#082B61] block">{t.name}</span>
                        <span className="text-slate-400 text-[11px]">
                          Passport: <strong className="font-mono text-[#082B61]">{t.passportNumber || 'Pending'}</strong> • {t.nationality || 'Indian'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                        {t.dob || t.gender || 'Traveller'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Documents & Verification Status Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                  Documents & Verification Status
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                  {editDocuments.map((doc, idx) => (
                    <div key={doc.id || idx} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <span className="font-bold text-[#082B61]">{doc.name}</span>
                        </div>
                        {doc.note && (
                          <span className="text-[11px] text-red-600 block pl-5 font-medium">
                            Note: {doc.note}
                          </span>
                        )}
                      </div>

                      {/* Document Status Selector */}
                      <select
                        value={doc.status || doc.verificationStatus || 'Verified'}
                        onChange={(e) => handleDocumentStatusChange(doc.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          doc.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : doc.status === 'Needs Re-upload' || doc.status === 'Rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Verified">Verified</option>
                        <option value="Needs Re-upload">Needs Re-upload (Flagged)</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ========================================================
                  ADMIN CONTROL CENTER (Status, Customer Message, Action)
                  ======================================================== */}
              <form onSubmit={handleSaveChanges} className="space-y-5 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#2563EB]" />
                  <h3 className="text-sm font-black text-[#082B61] uppercase tracking-wider">
                    Application Status & Customer Control
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Control 1: Application Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Application Status *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Controls customer timeline progression stage
                    </span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                    >
                      <option value={APPLICATION_STATUS.APPLICATION_RECEIVED}>Application Received</option>
                      <option value={APPLICATION_STATUS.DOCUMENTS_UNDER_REVIEW}>Documents Under Review</option>
                      <option value={APPLICATION_STATUS.ADDITIONAL_INFORMATION_REQUIRED}>Additional Information Required</option>
                      <option value={APPLICATION_STATUS.PROCESSING}>Processing</option>
                      <option value={APPLICATION_STATUS.APPROVED}>Approved</option>
                      <option value={APPLICATION_STATUS.VISA_ISSUED}>Visa Issued</option>
                      <option value={APPLICATION_STATUS.COMPLETED}>Completed</option>
                    </select>
                  </div>

                  {/* Control 2: Customer Action */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#082B61] block leading-none">
                      Customer Action *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Determines actionable button on customer Account page
                    </span>
                    <select
                      value={editRequiredAction}
                      onChange={(e) => setEditRequiredAction(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                    >
                      <option value={REQUIRED_ACTION.NONE}>None</option>
                      <option value={REQUIRED_ACTION.VIEW_APPLICATION}>View Application</option>
                      <option value={REQUIRED_ACTION.UPDATE_PHOTO}>Update Photo (Update Information →)</option>
                      <option value={REQUIRED_ACTION.UPLOAD_DOCUMENT}>Upload Document</option>
                      <option value={REQUIRED_ACTION.VIEW_VISA}>View Visa (View Visa →)</option>
                    </select>
                  </div>

                </div>

                {/* Control 3: Message to customer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Message to customer
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Write a message for the customer (displayed dynamically in Account page)
                  </span>
                  <textarea
                    rows={3}
                    value={editAdminMessage}
                    onChange={(e) => setEditAdminMessage(e.target.value)}
                    placeholder="e.g. Embassy requested an updated photograph."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseDetails}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors"
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
