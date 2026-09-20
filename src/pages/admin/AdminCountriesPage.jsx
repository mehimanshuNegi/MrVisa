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
  Tag
} from 'lucide-react';
import { countryService, visaService } from '../../services';

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

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    return Math.max(directCount, matchCount, 1);
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

      // Update state in country list
      setCountries((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSelectedCountry(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
          <span>
            Showing <strong className="text-[#082B61] font-bold">{filteredCountries.length}</strong> of{' '}
            <strong className="text-[#082B61] font-bold">{countries.length}</strong> destination countries
          </span>
          {(searchQuery || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
              }}
              className="text-[#2563EB] hover:underline font-bold text-xs cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          COUNTRIES TABLE
          ======================================================== */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#2563EB] mx-auto" />
          <p className="text-xs sm:text-sm font-bold text-[#082B61]">Loading country records...</p>
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
      ) : filteredCountries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 space-y-3">
          <FileText size={32} className="text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#082B61]">No countries found</h3>
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
                  <th className="py-3 px-4">Country Code</th>
                  <th className="py-3 px-4">Available Visa Types</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[#082B61]">
                {filteredCountries.map((c) => {
                  const isActive = c.status === 'ACTIVE' || !c.status;
                  const visaCount = getVisaCount(c);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Country */}
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">{c.flagEmoji || c.flag}</span>
                          <span className="text-xs sm:text-sm">{c.name || c.displayName}</span>
                        </div>
                      </td>

                      {/* Country Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                        {c.code || '—'}
                      </td>

                      {/* Available Visa Types */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {visaCount} {visaCount === 1 ? 'Visa Type' : 'Visa Types'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(c, e)}
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
                          onClick={() => handleOpenEdit(c)}
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
          EDIT COUNTRY MODAL (STRICT MR VISA FORM PHILOSOPHY)
          ======================================================== */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{editFormData.flagEmoji}</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#082B61]">
                    Edit Country
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {editFormData.name} ({editFormData.code})
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
                  <span>Country information updated successfully. Customer pages will reflect these changes immediately.</span>
                </div>
              )}

              <form onSubmit={handleSaveChanges} className="space-y-4">
                
                {/* Country Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#082B61] block leading-none">
                    Country Name
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Enter the official country name
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
                      Enter 2-letter ISO code
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
                      Enter flag emoji symbol
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
                    Enter destination overview displayed on customer pages
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
                    Country Image Reference
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
