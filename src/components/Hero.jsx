import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Calendar,
  MapPin,
  Search,
  Check,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import heroBg from '../assets/hero-bg.png';
import { countryService } from '../services';
import { useFilter } from '../context/FilterContext';
import TravelDatePicker from './TravelDatePicker';

export default function Hero() {
  const {
    selectedCountry,
    setSelectedCountry,
    selectedDate,
    setSelectedDate,
    hasActiveFilters,
    resetFilters,
    setIsFilterBarScrolled
  } = useFilter();

  const [searchCountries, setSearchCountries] = useState(() => countryService.getSearchCountries() || []);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const countryDropdownRef = useRef(null);
  const dateInputRef = useRef(null);
  const heroControlsContainerRef = useRef(null);

  const countryHoverTimerRef = useRef(null);

  const handleCountryMouseEnter = () => {
    if (countryHoverTimerRef.current) clearTimeout(countryHoverTimerRef.current);
    setCountryDropdownOpen(true);
  };

  const handleCountryMouseLeave = () => {
    countryHoverTimerRef.current = setTimeout(() => {
      setCountryDropdownOpen(false);
    }, 220);
  };

  // Dynamically load search options from MongoDB via countryService
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const cList = await countryService.getAllCountries();
        if (isMounted && Array.isArray(cList) && cList.length > 0) {
          const dynamicCountryNames = Array.from(
            new Set(
              cList
                .filter((c) => c.status === 'ACTIVE' || c.isActive !== false)
                .map((c) => c.displayName || c.name)
                .filter(Boolean)
            )
          );
          if (dynamicCountryNames.length > 0) {
            setSearchCountries(dynamicCountryNames);
          }
        }
      } catch (err) {
        console.warn('Failed to load hero destinations:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
      if (countryHoverTimerRef.current) clearTimeout(countryHoverTimerRef.current);
    };
  }, []);

  // Monitor scroll position to trigger floating bottom navigation
  useEffect(() => {
    const handleScroll = () => {
      if (!heroControlsContainerRef.current) {
        setIsFilterBarScrolled(window.scrollY > 280);
        return;
      }
      const rect = heroControlsContainerRef.current.getBoundingClientRect();
      const isPast = rect.bottom < 80 || window.scrollY > 300;
      setIsFilterBarScrolled(isPast);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setIsFilterBarScrolled]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Visa Search button click: smooth scroll to destination cards
  const handleVisaSearch = () => {
    const el = document.getElementById('visa-destinations');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section 
      className="relative z-20 overflow-visible pt-4 sm:pt-6 lg:pt-7 pb-6 sm:pb-8 lg:pb-9 min-h-[290px] sm:min-h-[320px] lg:min-h-[340px] flex items-center bg-cover bg-center"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'right 20% center',
      }}
    >
      {/* Subtle top blend with header */}
      <div className="absolute inset-x-0 top-0 h-10 sm:h-12 bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none z-10" />

      {/* Hero background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent w-full sm:w-[72%] lg:w-[56%] pointer-events-none" />
      
      {/* Soft bottom edge blend */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white via-white/40 to-transparent pointer-events-none" />

      {/* HERO CONTENT */}
      <div className="relative z-20 max-w-[1440px] mx-auto px-6 lg:px-12 w-full">
        <div className="max-w-xl space-y-2 sm:space-y-2.5">

          {/* VISAS MADE SIMPLE Eyebrow */}
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#5D7190] uppercase block">
              VISAS MADE SIMPLE
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#082B61] leading-[1.14] tracking-tight">
            Explore the World <br />
            with <span className="text-[#1479F5]">NimuFly</span>
          </h1>

          {/* Tagline */}
          <p className="text-xs sm:text-[13.5px] font-semibold text-[#5D7190] tracking-tight">
            On time, every time.
          </p>

          {/* 
            ==================================================
            SIMPLIFIED VISA SEARCH BAR (Compact Reference UI)
            ==================================================
          */}
          <div ref={heroControlsContainerRef} className="pt-1.5 sm:pt-2 relative z-30">
            <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl sm:rounded-full border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(8,43,97,0.10)] p-1.5 sm:p-2 sm:pl-3.5 sm:pr-2 gap-2 sm:gap-2.5 max-w-full">
              
              {/* 1. WHERE TO? (Opens on Hover and Click) */}
              <div 
                className="relative flex items-center gap-2.5 sm:pr-3 cursor-pointer" 
                ref={countryDropdownRef}
                onMouseEnter={handleCountryMouseEnter}
                onMouseLeave={handleCountryMouseLeave}
              >
                <div className="w-8 h-8 rounded-full bg-[#EBF3FF] text-[#1479F5] flex items-center justify-center flex-shrink-0">
                  <MapPin size={15} strokeWidth={2.4} />
                </div>
                <button
                  type="button"
                  onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  className="flex flex-col justify-center text-left w-full focus:outline-none cursor-pointer py-1"
                  aria-label="Filter cards by destination country"
                  aria-expanded={countryDropdownOpen}
                >
                  <span className="text-[10px] font-bold text-[#5D7190] tracking-wider leading-none">
                    Where to?
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs sm:text-[14px] font-extrabold text-[#082B61] leading-tight max-w-[130px] truncate">
                      {selectedCountry === 'All Countries' || selectedCountry === 'Any Country' || selectedCountry === 'All Destinations'
                        ? 'Anywhere'
                        : selectedCountry}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-[#082B61] transition-transform duration-200 ${countryDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {countryDropdownOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,43,97,0.25)] border border-slate-200/90 max-h-64 w-64 overflow-y-auto z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                    onMouseEnter={handleCountryMouseEnter}
                    onMouseLeave={handleCountryMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCountry('All Countries');
                        setCountryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        selectedCountry === 'All Countries' || selectedCountry === 'Any Country'
                          ? 'bg-[#F4F8FF] text-[#1479F5]'
                          : 'text-[#082B61] hover:bg-slate-50'
                      }`}
                    >
                      <span>Anywhere (All Destinations)</span>
                      {(selectedCountry === 'All Countries' || selectedCountry === 'Any Country') && (
                        <Check size={14} className="text-[#1479F5]" />
                      )}
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    {searchCountries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setCountryDropdownOpen(false);
                        }}
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

              {/* Vertical Divider */}
              <div className="hidden sm:block h-8 w-[1px] bg-slate-200/80" />

              {/* 2. TRAVEL DATES (Opens on Hover and Click) */}
              <div className="relative sm:px-3 flex-1 min-w-[150px]">
                <TravelDatePicker
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  iconBgClass="bg-[#EBF3FF] text-[#1479F5]"
                />
              </div>

              {/* 3. SEARCH BUTTON: [ Q Search → ] */}
              <div className="flex items-center gap-2 sm:pl-1.5">
                <button
                  type="button"
                  onClick={handleVisaSearch}
                  className="w-full sm:w-auto bg-[#1479F5] hover:bg-[#0B64D6] text-white font-extrabold text-xs sm:text-[13px] px-5 sm:px-6 py-2 sm:py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow-md cursor-pointer flex-shrink-0"
                >
                  <Search size={14} strokeWidth={2.6} />
                  <span>Search</span>
                  <ArrowRight size={14} strokeWidth={2.6} />
                </button>

                {/* Reset Button if filter active */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="p-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1479F5] text-xs font-bold transition-colors cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
