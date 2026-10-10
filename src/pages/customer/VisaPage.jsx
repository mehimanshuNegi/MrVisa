import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import VisaFilterBar from '../../components/visa/VisaFilterBar';
import VisaGrid from '../../components/visa/VisaGrid';
import EmptyState from '../../components/common/EmptyState';
import { visaService, normalizeVisaType, normalizeCountryName } from '../../services';
import { useFilter } from '../../context/FilterContext';

export default function VisaPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial params from URL (e.g. from header search)
  const initialSearch = searchParams.get('search') || '';
  const initialType = searchParams.get('type') || 'All Visa Types';

  const [visasList, setVisasList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const {
    selectedCountry,
    setSelectedCountry,
    selectedVisaType,
    setSelectedVisaType,
    selectedDate,
    setSelectedDate,
    resetFilters: resetContextFilters
  } = useFilter();

  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Load visas from service layer
  const loadVisas = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await visaService.getAllVisas();
      setVisasList(data);
    } catch (err) {
      console.error('Failed to load visas:', err);
      setLoadError('Unable to load visa information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisas();
  }, []);

  // Sync state if search params change
  useEffect(() => {
    const s = searchParams.get('search');
    const t = searchParams.get('type');
    const c = searchParams.get('country');
    if (s !== null) setSearchQuery(s);
    if (t !== null) setSelectedVisaType(t);
    if (c !== null) setSelectedCountry(c === 'All Countries' ? 'Any Country' : c);
  }, [searchParams]);

  // Frontend filtering logic
  const filteredVisas = useMemo(() => {
    return visasList.filter((v) => {
      // 1. Keyword search (by country or display name)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (v.displayName && v.displayName.toLowerCase().includes(q)) ||
        (v.countryName && v.countryName.toLowerCase().includes(q)) ||
        (v.countryId && v.countryId.toLowerCase().includes(q)) ||
        (v.country && v.country.toLowerCase().includes(q));

      // 2. Destination filter (dropdown)
      const filterCountry = normalizeCountryName(selectedCountry);
      const matchesCountry =
        filterCountry === 'all' ||
        (v.displayName && v.displayName.toLowerCase() === filterCountry) ||
        (v.countryName && v.countryName.toLowerCase() === filterCountry) ||
        (v.countryId && v.countryId.toLowerCase() === filterCountry) ||
        (v.country && v.country.toLowerCase() === filterCountry);

      // 3. Visa type filter (Exact data-driven comparison)
      const filterType = normalizeVisaType(selectedVisaType);
      const itemType = normalizeVisaType(v.visaType);
      const matchesVisaType = filterType === 'all' || itemType === filterType;

      return matchesSearch && matchesCountry && matchesVisaType;
    });
  }, [visasList, searchQuery, selectedCountry, selectedVisaType]);

  const handleResetFilters = () => {
    resetContextFilters();
    setSearchQuery('');
    setSearchParams({});
  };

  const handleSearchSubmit = () => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedVisaType !== 'All Visa Types') params.type = selectedVisaType;
    setSearchParams(params);
  };

  const [sortBy, setSortBy] = useState('Popular');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortTimerRef = React.useRef(null);

  const handleSortMouseEnter = () => {
    if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
    setSortDropdownOpen(true);
  };

  const handleSortMouseLeave = () => {
    sortTimerRef.current = setTimeout(() => {
      setSortDropdownOpen(false);
    }, 200);
  };

  const sortedVisas = useMemo(() => {
    const list = [...filteredVisas];
    if (sortBy === 'Price: Low to High') {
      return list.sort((a, b) => {
        const pA = parseFloat(String(a.fees || a.price || 0).replace(/[^0-9.]/g, '')) || 0;
        const pB = parseFloat(String(b.fees || b.price || 0).replace(/[^0-9.]/g, '')) || 0;
        return pA - pB;
      });
    }
    if (sortBy === 'Price: High to Low') {
      return list.sort((a, b) => {
        const pA = parseFloat(String(a.fees || a.price || 0).replace(/[^0-9.]/g, '')) || 0;
        const pB = parseFloat(String(b.fees || b.price || 0).replace(/[^0-9.]/g, '')) || 0;
        return pB - pA;
      });
    }
    if (sortBy === 'Name: A to Z') {
      return list.sort((a, b) =>
        (a.displayName || a.countryName || '').localeCompare(b.displayName || b.countryName || '')
      );
    }
    return list;
  }, [filteredVisas, sortBy]);

  return (
    <div className="bg-[#FAFBFD] min-h-screen pt-8 sm:pt-10 pb-24 sm:pb-28">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* 1. CENTERED PAGE HEADER MATCHING IMAGE 2 */}
        <div className="text-center max-w-xl mx-auto mb-7 sm:mb-8">
          <p className="text-[11px] font-black tracking-[0.2em] text-[#1479F5] uppercase mb-2">
            VISAS MADE SIMPLE
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0B2A63] tracking-tight leading-tight">
            Explore Visa Destinations
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium mt-2">
            Find the right visa for your next journey.
          </p>
        </div>

        {/* 2. HORIZONTAL FILTER / SEARCH BAR */}
        <VisaFilterBar
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          selectedVisaType={selectedVisaType}
          setSelectedVisaType={setSelectedVisaType}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onReset={handleResetFilters}
        />

        {/* 3. SECTION RESULTS HEADER WITH SORT BY DROPDOWN MATCHING IMAGE 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200/80">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#0B2A63] tracking-tight">
              Visa Destinations
            </h2>
            {!isLoading && (
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                {sortedVisas.length} {sortedVisas.length === 1 ? 'destination' : 'destinations'} available
              </span>
            )}
          </div>

          {/* Sort By Dropdown (Hover Enabled) */}
          <div
            className="relative self-end sm:self-auto"
            onMouseEnter={handleSortMouseEnter}
            onMouseLeave={handleSortMouseLeave}
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span>Sort by</span>
              <span className="font-bold text-[#0B2A63]">{sortBy}</span>
              <span className="text-slate-400">▾</span>
            </div>

            {sortDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150"
                onMouseEnter={handleSortMouseEnter}
                onMouseLeave={handleSortMouseLeave}
              >
                {['Popular', 'Price: Low to High', 'Price: High to Low', 'Name: A to Z'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSortBy(option);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      sortBy === option
                        ? 'bg-blue-50 text-[#1479F5] font-bold'
                        : 'text-[#0B2A63] hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. VISA CARDS GRID / STATES */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-14 border border-slate-200/80 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
            <p className="text-sm font-bold text-[#082B61]">Loading visa destinations...</p>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl p-10 border border-red-200 text-center space-y-3">
            <AlertCircle size={32} className="text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={loadVisas}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : sortedVisas.length > 0 ? (
          <VisaGrid visas={sortedVisas} />
        ) : (
          <EmptyState onReset={handleResetFilters} />
        )}

      </div>
    </div>
  );
}
