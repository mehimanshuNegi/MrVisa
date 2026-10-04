import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  User,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Calendar,
  Check,
  RotateCcw,
  FileText,
  Receipt,
  Briefcase,
  Ship,
  Layers
} from 'lucide-react';
import { countryService, visaService, documentationService, searchCountryDestinations } from '../../services';
import { useFilter } from '../../context/FilterContext';

const DOC_ICON_MAP = {
  FileText,
  Receipt,
  Briefcase,
  Ship,
  Layers
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter context
  const {
    selectedCountry,
    setSelectedCountry,
    selectedVisaType,
    setSelectedVisaType,
    selectedDate,
    setSelectedDate,
    hasActiveFilters,
    resetFilters,
    isFilterBarScrolled
  } = useFilter();

  // Dynamic Service-Backed Data Lists (used for destination search suggestions & doc menu)
  const [visasList, setVisasList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [docServices, setDocServices] = useState([]);
  const [searchCountries, setSearchCountries] = useState(() => countryService.getSearchCountries() || []);
  const [visaTypes, setVisaTypes] = useState(() => visaService.getVisaTypes() || []);

  // Hover Dropdown for Documentation
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const docDropdownTimerRef = useRef(null);

  // Search input and autocomplete suggestions state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs for search dropdown handling
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Load live data from services
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [vList, cList, dList] = await Promise.all([
          visaService.getAllVisas(),
          countryService.getAllCountries(),
          documentationService.getAllServices({ status: 'ACTIVE' })
        ]);
        if (isMounted) {
          if (Array.isArray(vList) && vList.length > 0) setVisasList(vList);
          if (Array.isArray(cList) && cList.length > 0) {
            setCountriesList(cList);
            const dynamicCountryNames = Array.from(
              new Set(
                cList
                  .filter((c) => c.status === 'ACTIVE' || c.isActive !== false)
                  .map((c) => c.displayName || c.name)
                  .filter(Boolean)
              )
            );
            if (dynamicCountryNames.length > 0) setSearchCountries(dynamicCountryNames);
          }
          if (Array.isArray(dList) && dList.length > 0) {
            // Strictly exclude GST from all customer-facing navigation
            const activeDocsWithoutGst = dList.filter(
              (s) => s.slug !== 'gst' && s.id !== 'gst' && !s.title?.toLowerCase().includes('gst')
            );
            setDocServices(activeDocsWithoutGst);
          }
          const types = visaService.getVisaTypes();
          if (Array.isArray(types) && types.length > 0) setVisaTypes(types);
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

  // Hover handlers with grace period for Documentation dropdown
  const handleDocMouseEnter = () => {
    if (docDropdownTimerRef.current) clearTimeout(docDropdownTimerRef.current);
    setDocDropdownOpen(true);
  };

  const handleDocMouseLeave = () => {
    docDropdownTimerRef.current = setTimeout(() => {
      setDocDropdownOpen(false);
    }, 180);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inDesktop = desktopSearchRef.current && desktopSearchRef.current.contains(event.target);
      const inMobile = mobileSearchRef.current && mobileSearchRef.current.contains(event.target);
      if (!inDesktop && !inMobile) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SEARCH SUGGESTIONS: Country/destination discovery only
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

  const navLinkClass = (path, exact = false) => {
    let isActive = false;
    if (path === '/visa') {
      isActive = location.pathname === '/' || location.pathname.startsWith('/visa');
    } else if (exact) {
      isActive = location.pathname === path;
    } else {
      isActive = location.pathname.startsWith(path);
    }
    return `px-3 py-1.5 text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer relative ${
      isActive
        ? 'text-[#1479F5] font-bold after:content-[""] after:absolute after:bottom-[-6px] after:left-3 after:right-3 after:h-[2.5px] after:bg-[#1479F5] after:rounded-full'
        : 'text-slate-600 hover:text-[#082B61]'
    }`;
  };

  // Reusable Suggestions Dropdown UI
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
    <>
      {/* 
        ==================================================
        1. MAIN TOP FLOATING HEADER (FIXED/STICKY)
        At the top of the page, stays fixed/floating above the content.
        ==================================================
      */}
      <header className="sticky top-0 z-50 pt-2 sm:pt-3 pb-1 px-3 sm:px-6 lg:px-8 transition-all">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl lg:rounded-full border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(8,43,97,0.07)] px-3.5 sm:px-6 lg:px-7 h-[60px] sm:h-[64px] lg:h-[66px] flex items-center justify-between gap-3 lg:gap-4 xl:gap-6">
            
            {/* LEFT: NimuFly Unified Mascot + Typography Brand Lockup */}
            <Link
              to="/"
              className="flex items-center gap-2.5 sm:gap-3 focus:outline-none group py-1 flex-shrink-0"
              aria-label="NimuFly Home"
            >
              <img
                src="/mrvisa-mascot.png"
                alt="NimuFly Mascot"
                className="h-[40px] sm:h-[46px] w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-[1.03]"
              />

              <div className="flex flex-col justify-center select-none">
                <span className="text-xl sm:text-2xl font-extrabold text-[#2563EB] tracking-tight leading-none">
                  NimuFly
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.03em] text-[#2563EB] mt-1 leading-none">
                  On Time, Every Time.
                </span>
              </div>
            </Link>

            {/* CENTER / NAVIGATION: Visa -> Documentation -> Dummy Tickets -> Travel Support -> About Us */}
            <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 xl:gap-2">
              <Link to="/visa" className={navLinkClass('/visa')}>
                Visa
              </Link>

              {/* Documentation with smooth dynamic hover dropdown */}
              <div
                className="relative"
                onMouseEnter={handleDocMouseEnter}
                onMouseLeave={handleDocMouseLeave}
              >
                <Link
                  to="/documentation"
                  className={`${navLinkClass('/documentation')} flex items-center gap-1 group`}
                >
                  <span>Documentation</span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 group-hover:text-[#2563EB] transition-transform duration-200 ${
                      docDropdownOpen ? 'rotate-180 text-[#2563EB]' : ''
                    }`}
                  />
                </Link>

                {/* Minimal floating dropdown loaded dynamically from MongoDB */}
                {docDropdownOpen && docServices.length > 0 && (
                  <div
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_12px_32px_-6px_rgba(8,43,97,0.14)] border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    onMouseEnter={handleDocMouseEnter}
                    onMouseLeave={handleDocMouseLeave}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5D7190] border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>Documentation Services</span>
                      <span className="text-[9px] text-[#2563EB] font-bold">{docServices.length} Services</span>
                    </div>
                    <div className="space-y-0.5">
                      {docServices.map((s) => {
                        const IconComp = DOC_ICON_MAP[s.icon] || FileText;
                        return (
                          <Link
                            key={s.slug || s.id}
                            to={`/documentation/${s.slug}`}
                            onClick={() => setDocDropdownOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#082B61] hover:text-[#2563EB] hover:bg-blue-50/70 transition-colors group/item"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IconComp size={13} className="text-[#2563EB] flex-shrink-0" />
                              <span className="truncate">{s.title}</span>
                            </div>
                            <ArrowRight size={12} className="opacity-0 group-hover/item:opacity-100 text-[#2563EB] transition-opacity flex-shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                      <Link
                        to="/documentation"
                        onClick={() => setDocDropdownOpen(false)}
                        className="block px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#2563EB] hover:bg-blue-50/50 text-center transition-colors"
                      >
                        View All Services →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/dummy-tickets" className={navLinkClass('/dummy-tickets')}>
                Dummy Tickets
              </Link>

              <Link to="/contact?support=true" className={navLinkClass('/contact')}>
                Travel Support
              </Link>
              <Link to="/about" className={navLinkClass('/about', true)}>
                About Us
              </Link>
            </nav>

            {/* RIGHT: Compact Search Destinations | Have a Question? | My Account */}
            <div className="hidden md:flex items-center gap-2 sm:gap-2.5 xl:gap-3 flex-shrink-0">
              {/* Search destinations pill */}
              <div className="relative" ref={desktopSearchRef}>
                <div className="flex items-center h-[36px] pl-3 pr-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-full shadow-2xs transition-all duration-200">
                  <Search size={13} strokeWidth={2.4} className="text-slate-400 flex-shrink-0" />
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
                    className="bg-transparent border-none outline-none text-xs text-[#082B61] placeholder:text-slate-400 font-medium px-2 w-24 sm:w-28 lg:w-32 xl:w-36"
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
                      className="text-slate-400 hover:text-slate-600 p-0.5 mr-1 cursor-pointer"
                      aria-label="Clear search query"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUnifiedSearch}
                    className="w-6 h-6 rounded-full bg-[#082B61] hover:bg-[#0A326E] text-white flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                    aria-label="Submit search"
                    title="Search Visas"
                  >
                    <ArrowRight size={12} strokeWidth={2.6} />
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute top-full right-0 mt-2 w-80 sm:w-96">
                    {renderSuggestionsDropdown()}
                  </div>
                )}
              </div>

              {/* Have a Question? / Ask a Question → */}
              <Link
                to="/contact?ask=true"
                className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-slate-50 transition-all text-left"
                aria-label="Ask a Question"
              >
                <div className="w-7 h-7 rounded-full bg-[#EBF3FF] text-[#1479F5] flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={14} strokeWidth={2.4} />
                </div>
                <div className="flex flex-col select-none">
                  <span className="text-[9.5px] font-semibold text-slate-500 leading-none">
                    Have a Question?
                  </span>
                  <span className="text-[11.5px] font-bold text-[#1479F5] leading-none mt-0.5">
                    Ask a Question →
                  </span>
                </div>
              </Link>

              {/* My Account */}
              <Link
                to="/account"
                className="flex items-center h-[36px] rounded-full border border-slate-200/90 hover:border-[#1479F5]/40 hover:bg-[#F4F8FF] text-[#082B61] transition-all px-3.5 gap-2"
                aria-label="My Account"
                title="My Account"
              >
                <User size={13} className="text-[#1479F5]" strokeWidth={2.5} />
                <span className="text-xs font-bold text-[#082B61]">My Account</span>
              </Link>
            </div>

            {/* Mobile Screen Controls */}
            <div className="md:hidden flex items-center gap-1.5">
              <Link
                to="/contact?ask=true"
                className="p-2 rounded-full text-[#1479F5] bg-[#F4F8FF] border border-[#1479F5]/20"
                aria-label="Ask Question"
              >
                <HelpCircle size={18} />
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full text-[#082B61] hover:bg-slate-100/80 focus:outline-none cursor-pointer"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile / Tablet Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Mobile Search */}
              <div className="relative w-full" ref={mobileSearchRef}>
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
                    className="bg-transparent border-none outline-none text-xs text-white placeholder:text-blue-200/70 font-medium px-2.5 flex-1 min-w-0"
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
                  <div className="absolute top-full left-0 right-0 mt-1.5 w-full z-50">
                    {renderSuggestionsDropdown()}
                  </div>
                )}
              </div>

              {/* Mobile Navigation Links */}
              <div className="pt-2 border-t border-slate-100 flex flex-col space-y-1">
                <Link
                  to="/visa"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-[#082B61] hover:bg-slate-50 transition-colors"
                >
                  Visa
                </Link>
                
                <div className="py-1">
                  <Link
                    to="/documentation"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold text-[#082B61] hover:bg-slate-50 transition-colors block"
                  >
                    Documentation Services
                  </Link>
                  {docServices.length > 0 && (
                    <div className="pl-5 space-y-1 mt-1 border-l-2 border-blue-100 ml-3">
                      {docServices.map((s) => (
                        <Link
                          key={s.slug || s.id}
                          to={`/documentation/${s.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-2 py-1 text-xs font-semibold text-slate-600 hover:text-[#2563EB]"
                        >
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  to="/dummy-tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-[#082B61] hover:bg-slate-50 transition-colors"
                >
                  Dummy Tickets
                </Link>

                <Link
                  to="/contact?support=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-[#082B61] hover:bg-slate-50 transition-colors"
                >
                  Travel Support
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-[#082B61] hover:bg-slate-50 transition-colors"
                >
                  About Us
                </Link>

                <div className="border-t border-slate-100 my-1 pt-1" />

                <Link
                  to="/contact?ask=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#1479F5] hover:bg-blue-50/60 transition-colors"
                >
                  <HelpCircle size={16} />
                  <span>Ask a Question</span>
                </Link>

                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#082B61] hover:bg-slate-50 transition-colors"
                >
                  <User size={16} />
                  <span>My Account</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
