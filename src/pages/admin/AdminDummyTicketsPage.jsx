import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Plane,
  X,
  Save,
  Loader2,
  RefreshCw,
  Plus,
  Power,
  Trash2,
  Clock,
  Tag,
  Check,
  Eye,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { dummyTicketService } from '../../services';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'New', label: 'New' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' }
];

const PACKAGE_STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Packages' },
  { value: 'Inactive', label: 'Inactive Packages' }
];

const REQUEST_STATUSES = ['New', 'Under Review', 'Processing', 'Ready', 'Completed', 'Cancelled'];

function getRequestStatusBadgeStyle(status) {
  switch (status) {
    case 'New':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Processing':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Ready':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Cancelled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export default function AdminDummyTicketsPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'packages'

  // ==========================================
  // 1. CUSTOMER REQUESTS STATE
  // ==========================================
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState(null);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('All');

  // Selected Request Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedReqStatus, setSelectedReqStatus] = useState('');
  const [selectedReqNotes, setSelectedReqNotes] = useState('');
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const [requestUpdateSuccess, setRequestUpdateSuccess] = useState(false);

  // ==========================================
  // 2. PACKAGES & PRICING STATE (For Regression & Catalog)
  // ==========================================
  const [tickets, setTickets] = useState([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState(null);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');
  const [packageStatusFilter, setPackageStatusFilter] = useState('All');

  // Package Edit State
  const [editingTicket, setEditingTicket] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    type: 'Round Trip / Onward Reservation',
    shortDescription: '',
    description: '',
    price: 499,
    deliveryTime: '10–30 Minutes',
    validity: '2–3 Weeks (Live PNR Verifiable)',
    features: [],
    icon: 'Plane',
    displayOrder: 0,
    status: 'ACTIVE'
  });
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [savePackageSuccess, setSavePackageSuccess] = useState(false);
  const [savePackageError, setSavePackageError] = useState(null);

  // Package Add State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    title: '',
    type: 'Round Trip / Onward Reservation',
    shortDescription: '',
    description: '',
    price: 499,
    deliveryTime: '10–30 Minutes',
    validity: '2–3 Weeks (Live PNR Verifiable)',
    features: [
      'Live 6-character airline PNR code',
      'Directly verifiable on airline website',
      'Embassy & consulate visa compliant',
      'Delivered instantly via WhatsApp and Email',
      'Free date modification if visa delayed'
    ],
    icon: 'Plane',
    displayOrder: 0,
    status: 'ACTIVE'
  });
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [createPackageError, setCreatePackageError] = useState(null);

  // Package Delete State
  const [deleteTargetTicket, setDeleteTargetTicket] = useState(null);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [bannerMessage, setBannerMessage] = useState(null);

  // Load Requests from MongoDB Atlas
  const loadRequests = async () => {
    setIsLoadingRequests(true);
    setRequestsError(null);
    try {
      const data = await dummyTicketService.getAllRequests({
        status: requestStatusFilter === 'All' ? undefined : requestStatusFilter,
        query: requestSearchQuery.trim() || undefined
      });
      const items = Array.isArray(data) ? data : data?.items || [];
      setRequests(items);
    } catch (err) {
      console.error('Failed to load dummy ticket requests:', err);
      setRequestsError('Failed to load booking requests from database.');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Load Packages
  const loadPackages = async () => {
    setIsLoadingPackages(true);
    setPackagesError(null);
    try {
      const data = await dummyTicketService.getAllServices();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load packages:', err);
      setPackagesError('Failed to load dummy ticket packages from database.');
    } finally {
      setIsLoadingPackages(false);
    }
  };

  useEffect(() => {
    loadRequests();
    loadPackages();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [requestStatusFilter]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        !requestSearchQuery ||
        req.requestId?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        req.contact?.email?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        req.contact?.phone?.includes(requestSearchQuery) ||
        req.flight?.from?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        req.flight?.to?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
        req.travellers?.some(
          (t) =>
            t.firstName?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
            t.lastName?.toLowerCase().includes(requestSearchQuery.toLowerCase())
        );

      const matchesStatus =
        requestStatusFilter === 'All' || req.status === requestStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, requestSearchQuery, requestStatusFilter]);

  // Open Request Modal
  const handleOpenRequestModal = (req) => {
    setSelectedRequest(req);
    setSelectedReqStatus(req.status || 'New');
    setSelectedReqNotes(req.adminNotes || '');
    setRequestUpdateSuccess(false);
  };

  // Save Request Status / Notes
  const handleSaveRequestUpdate = async (newStatusOverride = null) => {
    if (!selectedRequest) return;
    setIsUpdatingRequest(true);
    try {
      const targetStatus = newStatusOverride || selectedReqStatus;
      const updated = await dummyTicketService.updateRequestStatus(
        selectedRequest._id || selectedRequest.id,
        {
          status: targetStatus,
          adminNotes: selectedReqNotes
        }
      );
      setSelectedRequest(updated);
      setSelectedReqStatus(updated.status);
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === (updated._id || updated.id) ? updated : r
        )
      );
      setRequestUpdateSuccess(true);
      setTimeout(() => setRequestUpdateSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update request:', err);
      alert(err.message || 'Failed to update request');
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  // Quick mark completed
  const handleMarkCompleted = async () => {
    await handleSaveRequestUpdate('Completed');
  };

  // Package Filter
  const filteredPackages = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        !packageSearchQuery ||
        t.title?.toLowerCase().includes(packageSearchQuery.toLowerCase()) ||
        t.shortDescription?.toLowerCase().includes(packageSearchQuery.toLowerCase());

      const matchesStatus =
        packageStatusFilter === 'All' ||
        (packageStatusFilter === 'Active' ? t.status === 'ACTIVE' : t.status === 'INACTIVE');

      return matchesSearch && matchesStatus;
    });
  }, [tickets, packageSearchQuery, packageStatusFilter]);

  // Package CRUD Handlers
  const handleOpenEditPackage = (ticket) => {
    setEditingTicket(ticket);
    setEditFormData({
      title: ticket.title || '',
      type: ticket.type || 'Round Trip / Onward Reservation',
      shortDescription: ticket.shortDescription || '',
      description: ticket.description || '',
      price: ticket.price || 499,
      deliveryTime: ticket.deliveryTime || '10–30 Minutes',
      validity: ticket.validity || '2–3 Weeks (Live PNR Verifiable)',
      features: Array.isArray(ticket.features) ? [...ticket.features] : [],
      icon: ticket.icon || 'Plane',
      displayOrder: ticket.displayOrder || 0,
      status: ticket.status || 'ACTIVE'
    });
    setSavePackageSuccess(false);
    setSavePackageError(null);
  };

  const handleSavePackageEdit = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;
    setIsSavingPackage(true);
    setSavePackageError(null);
    try {
      const id = editingTicket._id || editingTicket.id;
      const updated = await dummyTicketService.updateService(id, editFormData);
      setTickets((prev) => prev.map((t) => ((t._id || t.id) === id ? updated : t)));
      setSavePackageSuccess(true);
      setTimeout(() => {
        setSavePackageSuccess(false);
        setEditingTicket(null);
      }, 1200);
    } catch (err) {
      setSavePackageError(err.message || 'Failed to save changes');
    } finally {
      setIsSavingPackage(false);
    }
  };

  const handleTogglePackageStatus = async (ticket) => {
    const id = ticket._id || ticket.id;
    try {
      const updated = await dummyTicketService.toggleServiceStatus(id);
      setTickets((prev) => prev.map((t) => ((t._id || t.id) === id ? updated : t)));
    } catch (err) {
      alert(err.message || 'Failed to toggle package status');
    }
  };

  const handleConfirmDeletePackage = async () => {
    if (!deleteTargetTicket) return;
    setIsDeletingTicket(true);
    try {
      const id = deleteTargetTicket._id || deleteTargetTicket.id;
      await dummyTicketService.deleteService(id);
      setTickets((prev) => prev.filter((t) => (t._id || t.id) !== id));
      setDeleteTargetTicket(null);
    } catch (err) {
      alert(err.message || 'Failed to delete package');
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    setIsCreatingPackage(true);
    setCreatePackageError(null);
    try {
      const created = await dummyTicketService.createService(addFormData);
      setTickets((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
    } catch (err) {
      setCreatePackageError(err.message || 'Failed to create package');
    } finally {
      setIsCreatingPackage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
            Dummy Ticket Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage customer flight itinerary requests, operational statuses, and service pricing.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Service Packages & Pricing ({tickets.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CUSTOMER BOOKING REQUESTS                                */}
      {/* ============================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by request ID, passenger name, route, or email..."
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-3">
              <AdminDropdown
                options={STATUS_FILTER_OPTIONS}
                value={requestStatusFilter}
                onChange={setRequestStatusFilter}
                ariaLabel="Filter requests by status"
              />

              <button
                type="button"
                onClick={loadRequests}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh requests"
              >
                <RefreshCw size={15} className={isLoadingRequests ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {isLoadingRequests ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 size={32} className="animate-spin text-[#2563EB] mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading booking requests from MongoDB...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Plane size={20} />
                </div>
                <h3 className="text-sm font-bold text-[#082B61]">No Dummy Ticket Requests Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {requestSearchQuery || requestStatusFilter !== 'All'
                    ? 'No requests matched your filter criteria.'
                    : 'Customer dummy ticket flight booking submissions will appear here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Request ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Trip Type</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Travel Date</th>
                      <th className="py-3 px-4">Required Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const primaryPassenger = req.travellers?.[0];
                      const passengerDisplay = primaryPassenger
                        ? `${primaryPassenger.firstName} ${primaryPassenger.lastName}${req.travellers.length > 1 ? ` (+${req.travellers.length - 1})` : ''}`
                        : 'Traveller';

                      return (
                        <tr key={req._id || req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                            {req.requestId}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#082B61]">{passengerDisplay}</div>
                            <div className="text-[11px] text-slate-400">{req.contact?.phone || req.contact?.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                req.tripType === 'Return'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {req.tripType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#082B61]">
                            {req.flight?.from} → {req.flight?.to}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{req.flight?.departureDate}</div>
                            {req.flight?.returnDate && (
                              <div className="text-[10px] text-slate-400">Ret: {req.flight?.returnDate}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {req.requiredDate || 'Standard'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${getRequestStatusBadgeStyle(
                                req.status
                              )}`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenRequestModal(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs transition-colors cursor-pointer"
                            >
                              <Eye size={13} />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SERVICE PACKAGES & PRICING                               */}
      {/* ============================================================== */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages by title or description..."
                value={packageSearchQuery}
                onChange={(e) => setPackageSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-3">
              <AdminDropdown
                options={PACKAGE_STATUS_FILTER_OPTIONS}
                value={packageStatusFilter}
                onChange={setPackageStatusFilter}
                ariaLabel="Filter packages by status"
              />

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>New Package</span>
              </button>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingPackages ? (
              <div className="col-span-full py-16 text-center">
                <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading packages...</p>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs font-semibold">
                No packages found.
              </div>
            ) : (
              filteredPackages.map((ticket) => (
                <div
                  key={ticket._id || ticket.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs hover:border-blue-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {ticket.type || 'Flight Reservation'}
                      </span>
                      <h3 className="text-base font-bold text-[#082B61] mt-0.5">{ticket.title}</h3>
                    </div>
                    <AdminStatusBadge status={ticket.status} />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                    {ticket.shortDescription || ticket.description || 'Valid airline GDS reservation.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Price</span>
                      <span className="text-base font-black text-[#082B61]">₹{ticket.price}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Delivery</span>
                      <span className="font-bold text-slate-700">{ticket.deliveryTime || '10–30 Mins'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePackageStatus(ticket)}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title={ticket.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    >
                      <Power size={14} className={ticket.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPackage(ticket)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetTicket(ticket)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete package"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: VIEW & MANAGE REQUEST DETAILS (Requirement 16 & 17)   */}
      {/* ============================================================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] block">
                  Dummy Ticket Booking Request
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-xl font-black text-[#082B61] tracking-tight">
                    {selectedRequest.requestId}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRequestStatusBadgeStyle(
                      selectedRequest.status
                    )}`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#082B61]">
              {requestUpdateSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Request status updated successfully in MongoDB Atlas!</span>
                </div>
              )}

              {/* Flight Route & Travel Date Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Flight Itinerary Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">From (Origin)</span>
                    <span className="font-bold text-sm text-[#082B61]">{selectedRequest.flight?.from}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">To (Destination)</span>
                    <span className="font-bold text-sm text-[#082B61]">{selectedRequest.flight?.to}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Departure Date</span>
                    <span className="font-bold text-[#082B61]">{selectedRequest.flight?.departureDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Return Date</span>
                    <span className="font-bold text-[#082B61]">
                      {selectedRequest.tripType === 'Return' ? selectedRequest.flight?.returnDate || '—' : 'One Way'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passengers List */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Passengers ({selectedRequest.travellers?.length || 0})
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {selectedRequest.travellers?.map((traveller, idx) => (
                    <div key={traveller._id || idx} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#082B61]">
                          {traveller.title} {traveller.firstName} {traveller.lastName}
                        </span>
                        <span className="text-slate-400 ml-2 text-[11px]">
                          ({traveller.nationality || 'Indian'})
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        DOB: {traveller.dateOfBirth || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information & Delivery */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Contact & Delivery Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Contact Phone</span>
                    <span className="font-bold text-[#082B61]">
                      {selectedRequest.contact?.dialCode} {selectedRequest.contact?.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Email</span>
                    <span className="font-bold text-[#082B61]">{selectedRequest.contact?.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Delivery Channel</span>
                    <span className="font-bold text-[#2563EB]">{selectedRequest.deliveryMethod || 'WhatsApp'}</span>
                  </div>
                </div>

                {selectedRequest.requiredDate && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">Requested Delivery Date:</span> {selectedRequest.requiredDate}
                  </div>
                )}
                {selectedRequest.purpose && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">Purpose:</span> {selectedRequest.purpose}
                  </div>
                )}
                {selectedRequest.message && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">Customer Note:</span> {selectedRequest.message}
                  </div>
                )}
              </div>

              {/* Operational Status & Admin Notes */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Operational Status
                    </label>
                    <select
                      value={selectedReqStatus}
                      onChange={(e) => setSelectedReqStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#082B61] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {REQUEST_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Admin / Booking Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Issued on EK PNR: ABC123"
                      value={selectedReqNotes}
                      onChange={(e) => setSelectedReqNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={handleMarkCompleted}
                disabled={isUpdatingRequest || selectedRequest.status === 'Completed'}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Mark Completed
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRequestUpdate()}
                  disabled={isUpdatingRequest}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingRequest ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Save Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#082B61]">Edit Service Package</h2>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePackageEdit} className="p-6 space-y-4 text-xs">
              {savePackageSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  Package updated successfully!
                </div>
              )}
              {savePackageError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
                  {savePackageError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Time</label>
                  <input
                    type="text"
                    value={editFormData.deliveryTime}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPackage}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  {isSavingPackage ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#082B61]">New Service Package</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="p-6 space-y-4 text-xs">
              {createPackageError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
                  {createPackageError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Package Title</label>
                <input
                  type="text"
                  placeholder="e.g. Express Urgent PNR Ticket"
                  value={addFormData.title}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={addFormData.price}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Time</label>
                  <input
                    type="text"
                    value={addFormData.deliveryTime}
                    onChange={(e) => setAddFormData((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the package..."
                  value={addFormData.description}
                  onChange={(e) => setAddFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPackage}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  {isCreatingPackage ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Package */}
      {deleteTargetTicket && (
        <DeleteConfirmationModal
          isOpen={Boolean(deleteTargetTicket)}
          onClose={() => setDeleteTargetTicket(null)}
          onConfirm={handleConfirmDeletePackage}
          title={`Delete Package "${deleteTargetTicket.title}"?`}
          message="Are you sure you want to delete this dummy ticket package offering? It will be removed from customer listings."
          isDeleting={isDeletingTicket}
          error={deleteError}
        />
      )}
    </div>
  );
}
