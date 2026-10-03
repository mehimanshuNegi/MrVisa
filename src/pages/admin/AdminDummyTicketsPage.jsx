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
  Check
} from 'lucide-react';
import { dummyTicketService } from '../../services';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import DeleteConfirmationModal from '../../components/admin/DeleteConfirmationModal';

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Active', label: 'Active Packages' },
  { value: 'Inactive', label: 'Inactive Packages' }
];

export default function AdminDummyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Delete State
  const [deleteTargetTicket, setDeleteTargetTicket] = useState(null);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Edit Modal State
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Add Modal State
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
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Banner Message
  const [bannerMessage, setBannerMessage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await dummyTicketService.getAllServices();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dummy tickets:', err);
      setLoadError('Failed to load dummy ticket services from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.type?.toLowerCase().includes(q) ||
        t.shortDescription?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && (t.isActive || t.status === 'ACTIVE')) ||
        (statusFilter === 'Inactive' && (!t.isActive || t.status === 'INACTIVE'));

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  const handleEditClick = (ticket) => {
    setEditingTicket(ticket);
    setEditFormData({
      title: ticket.title || '',
      type: ticket.type || 'Round Trip / Onward Reservation',
      shortDescription: ticket.shortDescription || '',
      description: ticket.description || '',
      price: ticket.price !== undefined ? ticket.price : 499,
      deliveryTime: ticket.deliveryTime || '10–30 Minutes',
      validity: ticket.validity || '2–3 Weeks (Live PNR Verifiable)',
      features: Array.isArray(ticket.features) ? ticket.features : [],
      icon: ticket.icon || 'Plane',
      displayOrder: ticket.displayOrder || 0,
      status: ticket.isActive || ticket.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const idToUpdate = editingTicket.id || editingTicket._id;
      const updated = await dummyTicketService.updateService(idToUpdate, editFormData);
      setTickets((prev) =>
        prev.map((t) => ((t.id || t._id) === idToUpdate ? { ...t, ...updated } : t))
      );
      setSaveSuccess(true);
      setBannerMessage(`Dummy ticket package "${updated.title}" updated successfully!`);
      setTimeout(() => {
        setEditingTicket(null);
        setSaveSuccess(false);
      }, 700);
    } catch (err) {
      console.error('Failed to update dummy ticket:', err);
      setSaveError(err.message || 'Failed to update dummy ticket.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await dummyTicketService.createService(addFormData);
      setTickets((prev) => [...prev, created]);
      setBannerMessage(`Dummy ticket package "${created.title}" created successfully!`);
      setIsAddModalOpen(false);
      setAddFormData({
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
    } catch (err) {
      console.error('Failed to create dummy ticket:', err);
      setCreateError(err.message || 'Failed to create dummy ticket.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenDelete = (ticket) => {
    setDeleteTargetTicket(ticket);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTicket) return;
    setIsDeletingTicket(true);
    setDeleteError(null);
    try {
      const idToDelete = deleteTargetTicket.id || deleteTargetTicket._id;
      await dummyTicketService.deleteService(idToDelete);
      setTickets((prev) => prev.filter((t) => (t.id || t._id) !== idToDelete));
      setBannerMessage(`Dummy ticket package "${deleteTargetTicket.title}" safely removed.`);
      setDeleteTargetTicket(null);
    } catch (err) {
      console.error('Failed to delete dummy ticket:', err);
      setDeleteError(err.message || 'Failed to delete dummy ticket.');
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const handleToggleStatus = async (ticket, e) => {
    e.stopPropagation();
    try {
      const idToUpdate = ticket.id || ticket._id;
      const res = await dummyTicketService.toggleServiceStatus(idToUpdate);
      setTickets((prev) =>
        prev.map((t) => ((t.id || t._id) === idToUpdate ? { ...t, ...res } : t))
      );
      setBannerMessage(`Package "${ticket.title}" status toggled!`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to toggle status: ' + err.message);
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
            Dummy Tickets
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage verifiable flight reservation packages, pricing, delivery speed, and live PNR validity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Package</span>
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
              placeholder="Search dummy ticket packages by title, reservation type, or keywords..."
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

      {/* 3. DUMMY TICKETS TABLE */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200/80 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs font-bold text-[#082B61]">Loading packages...</p>
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
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-slate-200/80 space-y-2">
          <Plane size={28} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#082B61]">No dummy ticket packages found</h3>
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
                  <th className="py-2.5 px-3.5">Package Title</th>
                  <th className="py-2.5 px-3.5">Reservation Type</th>
                  <th className="py-2.5 px-3.5">Price</th>
                  <th className="py-2.5 px-3.5">Delivery</th>
                  <th className="py-2.5 px-3.5">PNR Validity</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredTickets.map((ticket) => {
                  const isActive = ticket.status === 'ACTIVE' || ticket.isActive;

                  return (
                    <tr
                      key={ticket.id || ticket._id}
                      onClick={() => handleEditClick(ticket)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Title & Slug */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                            <Plane size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-[#082B61] block leading-tight">
                              {ticket.title}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              /{ticket.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {ticket.type || 'Round Trip'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3.5 font-bold text-[#082B61] whitespace-nowrap">
                        ₹{(ticket.price !== undefined ? Number(ticket.price) : 499).toLocaleString('en-IN')}
                      </td>

                      {/* Delivery */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <Clock size={11} />
                          {ticket.deliveryTime || '10–30 Minutes'}
                        </span>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {ticket.validity || '2–3 Weeks'}
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
                            onClick={() => handleEditClick(ticket)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(ticket, e)}
                            title={isActive ? 'Deactivate Package' : 'Activate Package'}
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
                            onClick={() => handleOpenDelete(ticket)}
                            title="Delete Package"
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

      {/* 4. EDIT TICKET MODAL */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#082B61]">Edit Dummy Ticket Package</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {editingTicket.title} • Backend slug: /{editingTicket.slug}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-6 flex-grow">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Package updated successfully!</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* SECTION 1: Service Information */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Service Information</h4>
                  <p className="text-[11px] text-slate-400">Package naming, reservation route, and descriptions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Package Title *
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      required
                      placeholder="e.g. Return Flight Reservation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Title displayed on ticket booking page</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Reservation Type *
                    </label>
                    <input
                      type="text"
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                      required
                      placeholder="e.g. Round Trip / Onward Reservation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Type of reservation issued to the client</span>
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
                    placeholder="Short summary displayed on pricing cards"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Comprehensive description of what is included in this reservation..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: Pricing */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Pricing</h4>
                  <p className="text-[11px] text-slate-400">Total charge for issuing and holding this reservation.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price charged to customer per reservation.</span>
                </div>
              </div>

              {/* SECTION 3: Delivery */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Delivery</h4>
                  <p className="text-[11px] text-slate-400">Turnaround guarantee for generating verifiable PNR ticket.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Delivery Speed
                  </label>
                  <input
                    type="text"
                    value={editFormData.deliveryTime}
                    onChange={(e) => setEditFormData({ ...editFormData, deliveryTime: e.target.value })}
                    placeholder="e.g. 10–30 Minutes"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Turnaround speed badge shown on customer portal</span>
                </div>
              </div>

              {/* SECTION 4: Validity */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Validity</h4>
                  <p className="text-[11px] text-slate-400">Duration the reservation remains active in the airline GDS system.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    PNR Validity Period
                  </label>
                  <input
                    type="text"
                    value={editFormData.validity}
                    onChange={(e) => setEditFormData({ ...editFormData, validity: e.target.value })}
                    placeholder="e.g. 2–3 Weeks (Live PNR Verifiable)"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Guaranteed live PNR window for embassy scrutiny</span>
                </div>
              </div>

              {/* SECTION 5: Features */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">5. Features</h4>
                  <p className="text-[11px] text-slate-400">Highlight bullet points displayed on the customer pricing card.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Features (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={Array.isArray(editFormData.features) ? editFormData.features.join('\n') : ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    placeholder="Live 6-character airline PNR code&#10;Directly verifiable on airline website&#10;Embassy & consulate visa compliant"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
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
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Lower numbers appear first</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
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

      {/* 5. ADD TICKET MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            <div className="sticky top-0 z-20 bg-white p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#082B61]">Add Dummy Ticket Package</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Create a new verifiable flight reservation package. Slugs are automatically generated.
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

            <form onSubmit={handleCreateTicket} className="p-4 sm:p-6 space-y-6 flex-grow">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* SECTION 1: Service Information */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">1. Service Information</h4>
                  <p className="text-[11px] text-slate-400">Package naming, reservation route, and descriptions.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Package Title *
                    </label>
                    <input
                      type="text"
                      value={addFormData.title}
                      onChange={(e) => setAddFormData({ ...addFormData, title: e.target.value })}
                      required
                      placeholder="e.g. Multi-City Flight Reservation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Title displayed on ticket booking page</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                      Reservation Type *
                    </label>
                    <input
                      type="text"
                      value={addFormData.type}
                      onChange={(e) => setAddFormData({ ...addFormData, type: e.target.value })}
                      required
                      placeholder="e.g. Round Trip / Onward Reservation"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Type of reservation issued to the client</span>
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
                    placeholder="Short summary displayed on pricing cards"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Full Description
                  </label>
                  <textarea
                    rows={2}
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    placeholder="Comprehensive description of what is included in this reservation..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: Pricing */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">2. Pricing</h4>
                  <p className="text-[11px] text-slate-400">Total charge for issuing and holding this reservation.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Package Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addFormData.price}
                    onChange={(e) => setAddFormData({ ...addFormData, price: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Price charged to customer per reservation.</span>
                </div>
              </div>

              {/* SECTION 3: Delivery */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">3. Delivery</h4>
                  <p className="text-[11px] text-slate-400">Turnaround guarantee for generating verifiable PNR ticket.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Delivery Speed
                  </label>
                  <input
                    type="text"
                    value={addFormData.deliveryTime}
                    onChange={(e) => setAddFormData({ ...addFormData, deliveryTime: e.target.value })}
                    placeholder="e.g. 10–30 Minutes"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Turnaround speed badge shown on customer portal</span>
                </div>
              </div>

              {/* SECTION 4: Validity */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">4. Validity</h4>
                  <p className="text-[11px] text-slate-400">Duration the reservation remains active in the airline GDS system.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    PNR Validity Period
                  </label>
                  <input
                    type="text"
                    value={addFormData.validity}
                    onChange={(e) => setAddFormData({ ...addFormData, validity: e.target.value })}
                    placeholder="e.g. 2–3 Weeks (Live PNR Verifiable)"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Guaranteed live PNR window for embassy scrutiny</span>
                </div>
              </div>

              {/* SECTION 5: Features */}
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">5. Features</h4>
                  <p className="text-[11px] text-slate-400">Highlight bullet points displayed on the customer pricing card.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#082B61] mb-1">
                    Features (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={Array.isArray(addFormData.features) ? addFormData.features.join('\n') : ''}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                    placeholder="Live 6-character airline PNR code&#10;Directly verifiable on airline website&#10;Embassy & consulate visa compliant"
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] resize-none"
                  />
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
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Lower numbers appear first</span>
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
                      <span>Create Package</span>
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
        isOpen={Boolean(deleteTargetTicket)}
        onClose={() => setDeleteTargetTicket(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingTicket}
        title="Remove Dummy Ticket Package"
        entityName={deleteTargetTicket?.title}
        entityType="Dummy Ticket Package"
        error={deleteError}
      />

    </div>
  );
}
