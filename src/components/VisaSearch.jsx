import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, FileText, Calendar, ChevronDown, ArrowRight, Check, HelpCircle, Shield } from 'lucide-react';
import { countryService, visaService } from '../services';

const searchCountries = countryService.getSearchCountries();
const visaTypes = visaService.getVisaTypes();

export default function VisaSearch({ onSearch }) {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState('Georgia');
  const [selectedVisaType, setSelectedVisaType] = useState('All Visa Types');
  const [selectedDate, setSelectedDate] = useState('');
  
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [visaDropdownOpen, setVisaDropdownOpen] = useState(false);

  const countryRef = useRef(null);
  const visaRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (countryRef.current && !countryRef.current.contains(event.target)) {
        setCountryDropdownOpen(false);
      }
      if (visaRef.current && !visaRef.current.contains(event.target)) {
        setVisaDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch({
        country: selectedCountry,
        visaType: selectedVisaType,
        date: selectedDate
      });
    } else {
      navigate(`/visa?search=${encodeURIComponent(selectedCountry)}&type=${encodeURIComponent(selectedVisaType)}`);
    }
  };

  return (
    <section className="relative z-30 -mt-16 sm:-mt-20 mb-6 sm:mb-8">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        
        {/* LARGE FLOATING QUERY & SEARCH PANEL */}
        <div className="bg-white rounded-3xl lg:rounded-[32px] p-6 sm:p-8 shadow-[0_20px_50px_-12px_rgba(11,42,99,0.12)] border border-slate-100">
          
          {/* TOP SECTION: 3 BALANCED COMPARTMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-stretch pb-6 lg:pb-7 border-b border-slate-100">
            
            {/* 1. WHERE TO? */}
            <div className="relative md:pr-8 md:border-r md:border-slate-100 flex flex-col justify-center" ref={countryRef}>
              <span className="block text-[11px] font-bold text-[#5D7190] uppercase tracking-wider mb-1.5">
                WHERE TO?
              </span>
              <button
                type="button"
                onClick={() => {
                  setCountryDropdownOpen(!countryDropdownOpen);
                  setVisaDropdownOpen(false);
                }}
                className="w-full text-left py-2 px-3 -ml-3 rounded-xl hover:bg-[#F4F8FF] transition-colors flex items-center justify-between group focus:outline-none cursor-pointer"
              >
                <span className="text-xl sm:text-2xl font-extrabold text-[#082B61] truncate">
                  {selectedCountry}
                </span>
                <ChevronDown size={18} className={`text-slate-400 group-hover:text-[#1479F5] transition-transform ${countryDropdownOpen ? 'rotate-180 text-[#1479F5]' : ''}`} />
              </button>

              {countryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-72 overflow-y-auto z-50 p-2 space-y-1">
                  {searchCountries.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(c);
                        setCountryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                        selectedCountry === c ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                      }`}
                    >
                      <span>{c}</span>
                      {selectedCountry === c && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. VISA TYPE */}
            <div className="relative md:px-8 md:border-r md:border-slate-100 flex flex-col justify-center" ref={visaRef}>
              <span className="block text-[11px] font-bold text-[#5D7190] uppercase tracking-wider mb-1.5">
                VISA TYPE
              </span>
              <button
                type="button"
                onClick={() => {
                  setVisaDropdownOpen(!visaDropdownOpen);
                  setCountryDropdownOpen(false);
                }}
                className="w-full text-left py-2 px-3 -ml-3 rounded-xl hover:bg-[#F4F8FF] transition-colors flex items-center justify-between group focus:outline-none cursor-pointer"
              >
                <span className="text-xl sm:text-2xl font-extrabold text-[#082B61] truncate">
                  {selectedVisaType}
                </span>
                <ChevronDown size={18} className={`text-slate-400 group-hover:text-[#1479F5] transition-transform ${visaDropdownOpen ? 'rotate-180 text-[#1479F5]' : ''}`} />
              </button>

              {visaDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                  {visaTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedVisaType(t);
                        setVisaDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                        selectedVisaType === t ? 'bg-[#F4F8FF] text-[#1479F5]' : 'text-[#082B61] hover:bg-slate-50'
                      }`}
                    >
                      <span>{t}</span>
                      {selectedVisaType === t && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. WHEN DO YOU PLAN TO TRAVEL? */}
            <div className="relative md:pl-8 flex flex-col justify-center">
              <span className="block text-[11px] font-bold text-[#5D7190] uppercase tracking-wider mb-1.5">
                WHEN DO YOU PLAN TO TRAVEL?
              </span>
              <label 
                htmlFor="search-travel-date-picker"
                className="w-full text-left py-2 px-3 -ml-3 rounded-xl hover:bg-[#F4F8FF] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span className="text-xl sm:text-2xl font-extrabold text-[#082B61] truncate">
                  {selectedDate || 'Select Dates'}
                </span>
                <Calendar size={18} className="text-slate-400 group-hover:text-[#1479F5] transition-colors" />
              </label>
              <input
                id="search-travel-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="sr-only"
              />
            </div>

          </div>

          {/* BOTTOM SECTION: PROMINENT BLUE SEARCH BUTTON & TRUST NOTE */}
          <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left Trust Note */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#64748B]">
              <Shield size={16} className="text-[#1479F5]" />
              <span>Official Consulate Verification • Pay Only After Visa Approval</span>
            </div>

            {/* Right: Prominent Blue Search Button */}
            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full sm:w-auto px-8 sm:px-10 h-14 bg-[#1479F5] hover:bg-[#0B2A63] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-[#1479F5]/25 hover:shadow-xl transition-all duration-200 cursor-pointer transform active:scale-[0.98]"
              >
                <span>Search Visas</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
