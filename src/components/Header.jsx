import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, Check, HelpCircle, ChevronDown, Calendar, ArrowRight } from 'lucide-react';
import { countryService, visaService } from '../services';

const searchCountries = countryService.getSearchCountries();
const visaTypes = visaService.getVisaTypes();

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Header filter states
  const [selectedCountry, setSelectedCountry] = useState('Georgia');
  const [selectedVisaType, setSelectedVisaType] = useState('All Visa Types');
  const [selectedDate, setSelectedDate] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [visaDropdownOpen, setVisaDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);
  const visaDropdownRef = useRef(null);
  const dateInputRef = useRef(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Smooth scroll listener for Profile button transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
      if (visaDropdownRef.current && !visaDropdownRef.current.contains(event.target)) {
        setVisaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUnifiedSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/visa?search=${encodeURIComponent(query)}&type=${encodeURIComponent(selectedVisaType)}`);
    } else {
      navigate(`/visa?search=${encodeURIComponent(selectedCountry)}&type=${encodeURIComponent(selectedVisaType)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className={`max-w-[1440px] mx-auto px-6 lg:px-10 transition-all duration-300 flex items-center justify-between gap-4 xl:gap-6 ${isScrolled ? 'h-[74px] lg:h-[76px]' : 'h-[84px] lg:h-[88px]'
        }`}>

        {/* LEFT: Unified Brand Lockup [ MASCOT ] + Mr Visa and [ PAY AFTER VISA APPROVAL ] */}
        <div className="flex items-center gap-3 xl:gap-5 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 focus:outline-none group py-1"
            aria-label="Mr Visa Home"
          >
            {/* Prominent Mascot */}
            <img
              src="/mrvisa-mascot.png"
              alt="Mr Visa Mascot"
              className={`w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-[1.03] ${isScrolled ? 'h-[46px] sm:h-[54px] lg:h-[58px]' : 'h-[54px] sm:h-[62px] lg:h-[68px]'
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

          {/* TRUST BADGE (Pay After Visa Approval) - Prominent and clearly visible */}
          <div className="hidden xl:flex items-center select-none flex-shrink-0">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#F4F8FF] border border-[#1479F5]/30 shadow-sm hover:shadow transition-shadow">
              <div className="w-5 h-5 rounded-full bg-[#1479F5] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Check size={11} strokeWidth={3} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11.5px] font-extrabold text-[#082B61] leading-tight whitespace-nowrap">
                  Pay After Visa Approval
                </span>
                <span className="text-[9.5px] font-semibold text-[#2563EB] leading-tight">
                  No upfront payment
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: COMPACT HORIZONTAL HEADER VISA FILTER BAR */}
        <div className="hidden lg:flex items-center bg-white rounded-full border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(8,43,97,0.08)] hover:shadow-md transition-shadow p-1.5 pl-4 gap-1 text-left flex-shrink-0">

          {/* 1. Where to? */}
          <div className="relative" ref={countryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setCountryDropdownOpen(!countryDropdownOpen);
                setVisaDropdownOpen(false);
              }}
              className="flex flex-col justify-center pr-3 border-r border-slate-200 focus:outline-none cursor-pointer py-0.5"
            >
              <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none">
                Where to?
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[85px] truncate">
                  {selectedCountry}
                </span>
                <ChevronDown size={13} className={`text-[#1479F5] transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {countryDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 w-52 overflow-y-auto z-50 p-2 space-y-1">
                {searchCountries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c);
                      setCountryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${selectedCountry === c ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                      }`}
                  >
                    <span>{c}</span>
                    {selectedCountry === c && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Visa Type */}
          <div className="relative" ref={visaDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setVisaDropdownOpen(!visaDropdownOpen);
                setCountryDropdownOpen(false);
              }}
              className="flex flex-col justify-center px-3 border-r border-slate-200 focus:outline-none cursor-pointer py-0.5"
            >
              <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none">
                Visa Type
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[90px] truncate">
                  {selectedVisaType}
                </span>
                <ChevronDown size={13} className={`text-[#1479F5] transition-transform ${visaDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {visaDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 w-52 overflow-y-auto z-50 p-2 space-y-1">
                {visaTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedVisaType(t);
                      setVisaDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${selectedVisaType === t ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                      }`}
                  >
                    <span>{t}</span>
                    {selectedVisaType === t && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Travel Dates */}
          <div
            onClick={() => {
              try {
                dateInputRef.current?.showPicker();
              } catch (e) {
                dateInputRef.current?.focus();
              }
            }}
            className="flex flex-col justify-center px-3 focus:outline-none cursor-pointer py-0.5"
          >
            <span className="text-[10px] font-bold text-[#5D7190] uppercase tracking-wider leading-none block">
              Travel Dates
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-tight max-w-[85px] truncate">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Select Dates'}
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

          {/* 4. MAIN EXPANDED DARK BLUE SEARCH BAR */}
          <div className="relative flex items-center h-[40px] pl-3.5 pr-2 bg-[#082B61] hover:bg-[#0A326E] text-white rounded-full shadow-sm transition-all duration-200 ml-1">
            <Search size={14} strokeWidth={2.4} className="text-[#60A5FA] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUnifiedSearch(e);
                }
              }}
              placeholder="Search destinations..."
              className="bg-transparent border-none outline-none text-xs sm:text-[13px] text-white placeholder:text-blue-200/70 font-medium px-2.5 w-36 sm:w-44 lg:w-48 xl:w-56"
              aria-label="Search destinations"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
                Ask a Question <span className="transform group-hover:translate-x-0.5 transition-transform text-[10px]">→</span>
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
              className={`overflow-hidden transition-all duration-300 ease-out flex items-center whitespace-nowrap ${isScrolled
                ? 'max-w-0 opacity-0 -translate-x-2'
                : 'max-w-[110px] opacity-100 ml-2 translate-x-0'
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3">
          {/* Mobile Filter Options */}
          <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-200/80">
            <span className="text-[11px] font-bold text-[#5D7190] uppercase tracking-wider block">
              Quick Filter
            </span>
            <div className="flex gap-2">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-1/2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#082B61]"
              >
                {searchCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={selectedVisaType}
                onChange={(e) => setSelectedVisaType(e.target.value)}
                className="w-1/2 p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#082B61]"
              >
                {visaTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={(e) => {
                handleUnifiedSearch(e);
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 bg-[#082B61] hover:bg-[#0A326E] text-white rounded-xl text-xs font-bold transition-colors"
            >
              Search Visas
            </button>
          </div>

          {/* Mobile Search */}
          <form onSubmit={(e) => {
            handleUnifiedSearch(e);
            setMobileMenuOpen(false);
          }} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Search size={15} className="text-[#1479F5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="bg-transparent border-none outline-none text-xs w-full text-[#082B61] font-medium"
            />
          </form>

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
