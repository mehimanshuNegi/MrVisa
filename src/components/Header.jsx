import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  User,
  HelpCircle,
  ChevronDown,
  Calendar,
  ArrowRight,
  Check,
  RotateCcw
} from 'lucide-react';
import { countryService, visaService, filterDestinations, searchCountryDestinations } from '../services';
import { useFilter } from '../context/FilterContext';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Dynamic Service-Backed Data Lists
  const [visasList, setVisasList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [searchCountries, setSearchCountries] = useState(() => countryService.getSearchCountries() || []);
  const [visaTypes, setVisaTypes] = useState(() => visaService.getVisaTypes() || []);

  // Shared Global Filter Context (Filters the actual cards on the current page)
  const {
    selectedCountry,
    setSelectedCountry,
    selectedVisaType,
    setSelectedVisaType,
    selectedDate,
    setSelectedDate,
    hasActiveFilters,
    resetFilters
  } = useFilter();

  // Dropdown toggles
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [visaDropdownOpen, setVisaDropdownOpen] = useState(false);

  // Search input and autocomplete suggestions state (Strictly for suggestions & navigation)
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs for outside click handling
  const countryDropdownRef = useRef(null);
  const visaDropdownRef = useRef(null);
  const dateInputRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const navigate = useNavigate();

  // Load live data from services
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [vList, cList] = await Promise.all([
          visaService.getAllVisas(),
          countryService.getAllCountries()
        ]);
        if (isMounted) {
          if (Array.isArray(vList) && vList.length > 0) setVisasList(vList);
          if (Array.isArray(cList) && cList.length > 0) {
            setCountriesList(cList);
            const dynamicCountryNames = Array.from(
              new Set(cList.map((c) => c.displayName || c.name).filter(Boolean))
            );
            if (dynamicCountryNames.length > 0) {
              setSearchCountries(dynamicCountryNames);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load header data from service layer:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
      if (visaDropdownRef.current && !visaDropdownRef.current.contains(event.target)) {
        setVisaDropdownOpen(false);
      }
      const inDesktop = desktopSearchRef.current && desktopSearchRef.current.contains(event.target);
      const inMobile = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
      if (!inDesktop && !inMobile) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SEARCH SUGGESTIONS: Country/destination discovery only (independent of visa type filter)
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return searchCountryDestinations({
      query: q,
      countries: countriesList,
      visas: visasList
    }).slice(0, 8);
  }, [visasList, countriesList, searchQuery]);

  // Handle clicking a search suggestion -> Navigates to that destination page
  const handleSelectSuggestion = (item) => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSearchQuery('');
    const targetId = item.routeId || item.id || item.countryId;
    if (targetId) {
      navigate(`/visa/${encodeURIComponent(targetId.toLowerCase())}`);
    }
  };

  // Submit search query to /visa page (Independent destination discovery)
  const handleUnifiedSearch = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setSelectedIndex(-1);

    const query = searchQuery.trim();
    const params = new URLSearchParams();
    if (query) params.set('search', query);

    navigate(`/visa?${params.toString()}`);
  };

  // Keyboard navigation for search suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleUnifiedSearch(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
        handleSelectSuggestion(searchSuggestions[selectedIndex]);
      } else {
        handleUnifiedSearch(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // FILTER HANDLERS: These update the shared filter context, which immediately filters the cards on the current page!
  const handleCountryFilterSelect = (c) => {
    setSelectedCountry(c);
    setCountryDropdownOpen(false);
  };

  const handleVisaTypeFilterSelect = (t) => {
    setSelectedVisaType(t);
    setVisaDropdownOpen(false);
  };

  // Reusable Suggestions Dropdown UI (Rendered directly under search input)
  const renderSuggestionsDropdown = () => {
    if (!showSuggestions || !searchQuery.trim()) return null;

    return (
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
        {searchSuggestions.length === 0 ? (
          <div className="p-4 text-center select-none">
            <p className="text-xs font-bold text-[#082B61]">No destinations found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Try searching for Thailand, Singapore, Dubai, or Georgia
            </p>
          </div>
        ) : (
          <div>
            <div className="p-1.5 space-y-0.5 max-h-[320px] overflow-y-auto">
              {searchSuggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id || item.routeId || idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-3 ${
                      isSelected ? 'bg-[#F4F8FF] text-[#1479F5]' : 'hover:bg-slate-50 text-[#082B61]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200/60 text-xs">
                      {item.flagUrl ? (
                        <img src={item.flagUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{item.flagEmoji || '🌍'}</span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] truncate">
                          {item.displayName || item.countryName}
                        </span>
                        {item.price && (
                          <span className="text-[10.5px] font-bold text-[#1479F5] flex-shrink-0">
                            {item.price}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        <span className="font-semibold text-slate-600">{item.visaType || 'E-Visa'}</span>
                        <span>•</span>
                        <span>{item.processingTime || 'Fast Processing'}</span>
                        {item.stayPeriod && (
                          <>
                            <span>•</span>
                            <span>{item.stayPeriod} stay</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      size={13}
                      className={`flex-shrink-0 transition-opacity ${
                        isSelected ? 'opacity-100 text-[#1479F5]' : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Press ↵ to open</span>
              <button
                type="button"
                onClick={handleUnifiedSearch}
                className="text-[#1479F5] hover:text-[#082B61] font-bold transition-colors cursor-pointer"
              >
                View all ({searchSuggestions.length}) →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div
        className={`max-w-[1440px] mx-auto px-6 lg:px-10 transition-all duration-300 flex items-center justify-between gap-4 xl:gap-6 ${
          isScrolled ? 'h-[74px] lg:h-[76px]' : 'h-[84px] lg:h-[88px]'
        }`}
      >
        {/* LEFT: Unified Brand Lockup [ MASCOT ] + Mr Visa */}
        <div className="flex items-center gap-3 xl:gap-5 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 focus:outline-none group py-1"
            aria-label="Mr Visa Home"
          >
            {/* Mascot */}
            <img
              src="/mrvisa-mascot.png"
              alt="Mr Visa Mascot"
              className={`w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-[1.03] ${
                isScrolled ? 'h-[46px] sm:h-[54px] lg:h-[58px]' : 'h-[54px] sm:h-[62px] lg:h-[68px]'
              }`}
            />

            {/* Brand Typography Lockup */}
            <div className="flex flex-col justify-center select-none">
              <span className="text-2xl sm:text-3xl lg:text-[29px] font-extrabold text-[#123B7A] tracking-tight leading-none">
                Mr Visa
              </span>
              <span className="text-[11.5px] sm:text-[12.5px] font-bold tracking-[0.03em] text-[#2563EB] mt-1.5 leading-none">
                On Time, Every Time.
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: COMPACT HORIZONTAL HEADER VISA FILTER & SEARCH BAR */}
        <div className="hidden lg:flex items-center bg-white rounded-full border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(8,43,97,0.08)] hover:shadow-md transition-shadow p-1.5 pl-4 gap-1 text-left flex-shrink-0">
          {/* 1. Where to? Destination Filter (Filters the cards on the current page!) */}
          <div className="relative" ref={countryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setCountryDropdownOpen(!countryDropdownOpen);
                setVisaDropdownOpen(false);
              }}
              className="flex flex-col justify-center pr-3 border-r border-slate-200 focus:outline-none cursor-pointer py-0.5"
              aria-label="Filter cards by destination country"
              aria-expanded={countryDropdownOpen}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none">
                  Where to?
                </span>
                {selectedCountry && selectedCountry !== 'All Countries' && selectedCountry !== 'Any Country' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1479F5]" title="Destination filter active" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[95px] truncate">
                  {selectedCountry === 'All Countries' || selectedCountry === 'Any Country'
                    ? 'Anywhere'
                    : selectedCountry}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-[#1479F5] transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {countryDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 w-56 overflow-y-auto z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => handleCountryFilterSelect('All Countries')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCountry === 'All Countries' || selectedCountry === 'Any Country'
                      ? 'bg-[#F4F8FF] text-[#1479F5]'
                      : 'text-[#082B61] hover:bg-slate-50'
                  }`}
                >
                  <span>All Destinations</span>
                  {(selectedCountry === 'All Countries' || selectedCountry === 'Any Country') && (
                    <Check size={14} className="text-[#1479F5]" />
                  )}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {searchCountries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCountryFilterSelect(c)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCountry === c ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                    }`}
                  >
                    <span>{c}</span>
                    {selectedCountry === c && <Check size={14} className="text-[#1479F5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Visa Type Filter (Filters the cards on the current page!) */}
          <div className="relative" ref={visaDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setVisaDropdownOpen(!visaDropdownOpen);
                setCountryDropdownOpen(false);
              }}
              className="flex flex-col justify-center px-3 border-r border-slate-200 focus:outline-none cursor-pointer py-0.5"
              aria-label="Filter cards by visa type"
              aria-expanded={visaDropdownOpen}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none">
                  Visa Type
                </span>
                {selectedVisaType && selectedVisaType !== 'All Visa Types' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1479F5]" title="Visa type filter active" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[90px] truncate">
                  {selectedVisaType === 'All Visa Types' ? 'All Types' : selectedVisaType}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-[#1479F5] transition-transform ${visaDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {visaDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 w-52 overflow-y-auto z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {visaTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleVisaTypeFilterSelect(t)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      selectedVisaType === t ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                    }`}
                  >
                    <span>{t}</span>
                    {selectedVisaType === t && <Check size={14} className="text-[#1479F5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Travel Dates Filter */}
          <div
            onClick={() => {
              try {
                dateInputRef.current?.showPicker();
              } catch (e) {
                dateInputRef.current?.focus();
              }
            }}
            className="flex flex-col justify-center px-3 focus:outline-none cursor-pointer py-0.5"
            title="Select travel date"
          >
            <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none block">
              Travel Dates
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[85px] truncate">
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : 'Select Dates'}
              </span>
              <Calendar size={13} className="text-[#1479F5]" />
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="sr-only"
            />
          </div>

          {/* Clear / Reset Filter Button (Restores all cards on the page!) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1479F5] text-[10px] font-bold transition-colors cursor-pointer mr-1"
              title="Reset all filters and show all cards"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          )}

          {/* 4. SEARCH INPUT (Strictly for Suggestions & Destination Navigation) */}
          <div className="relative ml-1" ref={desktopSearchRef}>
            <div className="flex items-center h-[40px] pl-3.5 pr-2 bg-[#082B61] hover:bg-[#0A326E] text-white rounded-full shadow-sm transition-all duration-200">
              <Search size={14} strokeWidth={2.4} className="text-[#60A5FA] flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setShowSuggestions(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(e.target.value.trim().length > 0);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search destinations..."
                className="bg-transparent border-none outline-none text-xs sm:text-[13px] text-white placeholder:text-blue-200/70 font-medium px-2.5 w-36 sm:w-44 lg:w-48 xl:w-56"
                aria-label="Search destinations"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }}
                  className="text-blue-200 hover:text-white p-0.5 mr-1 cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={handleUnifiedSearch}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Submit search"
                title="Search Visas"
              >
                <ArrowRight size={12} strokeWidth={2.6} />
              </button>
            </div>

            {/* Suggestions Dropdown (Directly underneath search input) */}
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute top-full right-0 mt-2 w-80 sm:w-96">
                {renderSuggestionsDropdown()}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Functional Controls (Ask a Question | My Account) */}
        <div className="hidden sm:flex items-center gap-3 xl:gap-4 flex-shrink-0">
          {/* Ask Question */}
          <Link
            to="/contact?ask=true"
            className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F4F8FF] hover:bg-[#EBF3FF] border border-[#1479F5]/25 hover:border-[#1479F5]/45 transition-all duration-200 shadow-sm focus:outline-none"
            aria-label="Ask a Question"
          >
            <div className="w-6 h-6 rounded-lg bg-[#1479F5] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <HelpCircle size={14} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-bold text-[#5D7190] uppercase tracking-wider">
                Have a Question?
              </span>
              <span className="text-[11px] font-bold text-[#1479F5] group-hover:text-[#082B61] transition-colors mt-0.5 flex items-center gap-0.5">
                Ask a Question{' '}
                <span className="transform group-hover:translate-x-0.5 transition-transform text-[10px]">
                  →
                </span>
              </span>
            </div>
          </Link>

          {/* Profile Control */}
          <Link
            to="/account"
            className="group flex items-center h-[42px] rounded-full border border-slate-200/90 hover:border-[#1479F5]/40 hover:bg-[#F4F8FF] text-[#082B61] transition-all duration-300 ease-out px-2.5 hover:shadow-sm focus:outline-none flex-shrink-0"
            aria-label="My Account"
            title="My Account"
          >
            <div className="w-6 h-6 rounded-full bg-[#1479F5]/10 text-[#1479F5] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1479F5] group-hover:text-white transition-colors duration-200">
              <User size={13} strokeWidth={2.4} />
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-out flex items-center whitespace-nowrap ${
                isScrolled ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[110px] opacity-100 ml-2 translate-x-0'
              }`}
            >
              <span className="text-xs font-bold text-[#082B61]">My Account</span>
            </div>
          </Link>
        </div>

        {/* Mobile Controls */}
        <div className="sm:hidden flex items-center gap-2">
          <Link
            to="/contact?ask=true"
            className="p-2 rounded-lg text-[#1479F5] bg-[#F4F8FF] border border-[#1479F5]/20"
            aria-label="Ask Question"
          >
            <HelpCircle size={20} />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#082B61] hover:bg-slate-100/80 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE / TABLET SEARCH BAR (< lg) WITH AUTOCOMPLETE SUGGESTIONS */}
      <div className="lg:hidden px-4 sm:px-6 pt-1 pb-2.5">
        <div className="relative w-full max-w-lg mx-auto" ref={mobileSearchRef}>
          <form
            onSubmit={handleUnifiedSearch}
            className="flex items-center bg-[#082B61] rounded-full pl-3.5 pr-1.5 py-1.5 shadow-inner w-full"
          >
            <Search size={14} className="text-[#3B82F6] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setShowSuggestions(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(e.target.value.trim().length > 0);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search destinations..."
              className="bg-transparent border-none outline-none text-xs sm:text-[13px] text-white placeholder:text-blue-200/70 font-medium px-2.5 flex-1 min-w-0"
              aria-label="Search destinations"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                  setSelectedIndex(-1);
                }}
                className="text-blue-200 hover:text-white p-0.5 mr-1 cursor-pointer"
                aria-label="Clear search query"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={handleUnifiedSearch}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Submit search"
              title="Search Visas"
            >
              <ArrowRight size={12} strokeWidth={2.6} />
            </button>
          </form>

          {/* Mobile Suggestions Dropdown */}
          {showSuggestions && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 w-full">
              {renderSuggestionsDropdown()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3">
          {/* Mobile Quick Filter */}
          <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#5D7190] uppercase tracking-wider">
                Quick Filter (Filters Page Cards)
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-bold text-[#1479F5] flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-1/2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#082B61]"
              >
                <option value="All Countries">All Destinations</option>
                {searchCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={selectedVisaType}
                onChange={(e) => setSelectedVisaType(e.target.value)}
                className="w-1/2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#082B61]"
              >
                {visaTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={(e) => {
                handleUnifiedSearch(e);
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 bg-[#082B61] hover:bg-[#0A326E] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              View Filtered Visas Page
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Link
              to="/contact?ask=true"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 text-sm font-semibold text-[#1479F5] py-2"
            >
              <HelpCircle size={17} />
              <span>Ask a Question</span>
            </Link>

            <Link
              to="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 text-sm font-semibold text-[#082B61] py-2"
            >
              <User size={17} />
              <span>My Account</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
