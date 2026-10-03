import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  FileCheck2, 
  Calendar, 
  Search, 
  ChevronDown, 
  Check, 
  FileText,
  X,
  RotateCcw,
  Plane,
  Sparkles
} from 'lucide-react';
import { 
  countryService,
  visaService
} from '../services';
import TravelDatePicker from './TravelDatePicker';

const searchCountries = countryService.getSearchCountries();
const visaTypeOptions = visaService.getVisaTypeOptions();
const documentOptions = visaService.getDocumentOptions();

export default function VisaFilterBar({
  selectedCountry,
  setSelectedCountry,
  selectedVisaType,
  setSelectedVisaType,
  selectedDocument,
  setSelectedDocument,
  selectedDate,
  setSelectedDate,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onReset
}) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [countrySearchInput, setCountrySearchInput] = useState('');
  const [allVisas, setAllVisas] = useState([]);
  const [countriesList, setCountriesList] = useState([]);

  const countryHoverTimerRef = useRef(null);
  const typeHoverTimerRef = useRef(null);
  const docHoverTimerRef = useRef(null);

  const handleCountryMouseEnter = () => {
    if (countryHoverTimerRef.current) clearTimeout(countryHoverTimerRef.current);
    setCountryOpen(true);
    setTypeOpen(false);
    setDocOpen(false);
  };
  const handleCountryMouseLeave = () => {
    countryHoverTimerRef.current = setTimeout(() => {
      setCountryOpen(false);
    }, 220);
  };

  const handleTypeMouseEnter = () => {
    if (typeHoverTimerRef.current) clearTimeout(typeHoverTimerRef.current);
    setTypeOpen(true);
    setCountryOpen(false);
    setDocOpen(false);
  };
  const handleTypeMouseLeave = () => {
    typeHoverTimerRef.current = setTimeout(() => {
      setTypeOpen(false);
    }, 220);
  };

  const handleDocMouseEnter = () => {
    if (docHoverTimerRef.current) clearTimeout(docHoverTimerRef.current);
    setDocOpen(true);
    setCountryOpen(false);
    setTypeOpen(false);
  };
  const handleDocMouseLeave = () => {
    docHoverTimerRef.current = setTimeout(() => {
      setDocOpen(false);
    }, 220);
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      visaService.getAllVisas(),
      countryService.getAllCountries()
    ]).then(([visas, countries]) => {
      if (isMounted) {
        if (visas) setAllVisas(visas);
        if (countries) setCountriesList(countries);
      }
    }).catch(() => {});
    return () => { 
      isMounted = false;
      if (countryHoverTimerRef.current) clearTimeout(countryHoverTimerRef.current);
      if (typeHoverTimerRef.current) clearTimeout(typeHoverTimerRef.current);
      if (docHoverTimerRef.current) clearTimeout(docHoverTimerRef.current);
    };
  }, []);

  const countryRef = useRef(null);
  const typeRef = useRef(null);
  const docRef = useRef(null);
  const dateInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) {
        setCountryOpen(false);
      }
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setTypeOpen(false);
      }
      if (docRef.current && !docRef.current.contains(e.target)) {
        setDocOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = 
    selectedCountry !== 'Any Country' || 
    selectedVisaType !== 'All Visa Types' || 
    selectedDocument !== 'Any Documents' || 
    selectedDate !== '' || 
    searchQuery !== '';

  const countryOptions = useMemo(() => {
    if (countriesList.length > 0) {
      const activeNames = countriesList
        .filter((c) => c.status === 'ACTIVE' || c.isActive !== false)
        .map((c) => c.displayName || c.name)
        .filter(Boolean);
      return ['Any Country', ...Array.from(new Set(activeNames))];
    }
    return countryService.getSearchCountries();
  }, [countriesList]);

  // Filtered countries inside the dropdown search
  const filteredCountryList = countryOptions.filter((c) =>
    c.toLowerCase().includes(countrySearchInput.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto mb-10 relative z-30">
      
      {/* 1. Main Filter Bar Pill */}
      <div className="bg-white rounded-2xl lg:rounded-full border border-slate-200/90 shadow-[0_6px_24px_-4px_rgba(18,59,122,0.08)] hover:shadow-[0_10px_32px_-4px_rgba(18,59,122,0.12)] transition-all duration-300 p-2 lg:p-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-0">
          
          {/* 1. Destination (Where are you going?) */}
          <div 
            className="relative px-3.5 py-1.5 lg:border-r border-slate-200/80 flex-1 min-w-0" 
            ref={countryRef}
            onMouseEnter={handleCountryMouseEnter}
            onMouseLeave={handleCountryMouseLeave}
          >
            <button
              type="button"
              onClick={() => {
                setCountryOpen(!countryOpen);
                setTypeOpen(false);
                setDocOpen(false);
              }}
              className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Destination:
                  </span>
                  <span className="text-xs sm:text-[13.5px] font-extrabold text-[#123B7A] mt-0.5 truncate max-w-[130px]">
                    {selectedCountry}
                  </span>
                </div>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-[#2563EB] transition-transform duration-200 flex-shrink-0 ${countryOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Destination Floating Dropdown Panel */}
            {countryOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,43,97,0.22)] border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={handleCountryMouseEnter}
                onMouseLeave={handleCountryMouseLeave}
              >
                {/* Search Input inside Dropdown */}
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={countrySearchInput}
                    onChange={(e) => setCountrySearchInput(e.target.value)}
                    placeholder="Search destination..."
                    className="w-full h-8.5 pl-8 pr-3 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-[#123B7A] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {filteredCountryList.map((country) => {
                    const matchVisa = allVisas.find((v) => v.displayName === country);
                    const isSelected = selectedCountry === country;
                    return (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setCountryOpen(false);
                          setCountrySearchInput('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F4F8FF] text-[#2563EB]'
                            : 'text-[#123B7A] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {matchVisa && matchVisa.flagUrl ? (
                            <img src={matchVisa.flagUrl} alt="" className="w-4 h-3 object-cover rounded-sm" />
                          ) : (
                            <span className="text-xs">🌐</span>
                          )}
                          <span>{country}</span>
                        </div>
                        {isSelected && <Check size={14} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Visa Type */}
          <div 
            className="relative px-3.5 py-1.5 lg:border-r border-slate-200/80 flex-1 min-w-0" 
            ref={typeRef}
            onMouseEnter={handleTypeMouseEnter}
            onMouseLeave={handleTypeMouseLeave}
          >
            <button
              type="button"
              onClick={() => {
                setTypeOpen(!typeOpen);
                setCountryOpen(false);
                setDocOpen(false);
              }}
              className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                  <Plane size={16} strokeWidth={2.4} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Visa Type:
                  </span>
                  <span className="text-xs sm:text-[13.5px] font-extrabold text-[#123B7A] mt-0.5 truncate max-w-[125px]">
                    {selectedVisaType}
                  </span>
                </div>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-[#2563EB] transition-transform duration-200 flex-shrink-0 ${typeOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Visa Type Floating Dropdown Panel with Mock Counts */}
            {typeOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,43,97,0.22)] border border-slate-200/90 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={handleTypeMouseEnter}
                onMouseLeave={handleTypeMouseLeave}
              >
                <div className="space-y-1">
                  {visaTypeOptions.map((item) => {
                    const isSelected = selectedVisaType === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setSelectedVisaType(item.value);
                          setTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F4F8FF] text-[#2563EB]'
                            : 'text-[#123B7A] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{item.label}</span>
                          <span className="text-[11px] text-slate-400 font-normal">• {item.count}</span>
                        </div>
                        {isSelected && <Check size={14} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Documents */}
          <div 
            className="relative px-3.5 py-1.5 lg:border-r border-slate-200/80 flex-1 min-w-0" 
            ref={docRef}
            onMouseEnter={handleDocMouseEnter}
            onMouseLeave={handleDocMouseLeave}
          >
            <button
              type="button"
              onClick={() => {
                setDocOpen(!docOpen);
                setCountryOpen(false);
                setTypeOpen(false);
              }}
              className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} strokeWidth={2.4} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Documents:
                  </span>
                  <span className="text-xs sm:text-[13.5px] font-extrabold text-[#123B7A] mt-0.5 truncate max-w-[130px]">
                    {selectedDocument}
                  </span>
                </div>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-[#2563EB] transition-transform duration-200 flex-shrink-0 ${docOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Documents Floating Dropdown Panel */}
            {docOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,43,97,0.22)] border border-slate-200/90 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={handleDocMouseEnter}
                onMouseLeave={handleDocMouseLeave}
              >
                <div className="space-y-1">
                  {documentOptions.map((doc) => {
                    const isSelected = selectedDocument === doc.value;
                    return (
                      <button
                        key={doc.value}
                        type="button"
                        onClick={() => {
                          setSelectedDocument(doc.value);
                          setDocOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F4F8FF] text-[#2563EB]'
                            : 'text-[#123B7A] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 pr-2">
                          <span className="leading-snug">{doc.label}</span>
                          <span className="text-[11px] text-slate-400 font-normal whitespace-nowrap">• {doc.count}</span>
                        </div>
                        {isSelected && <Check size={14} strokeWidth={2.5} className="flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Travel Dates (Hover-Activated Popover) */}
          <div className="relative px-3.5 py-1.5 flex-1 min-w-0">
            <TravelDatePicker
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              iconBgClass="bg-purple-50 text-purple-600"
            />
          </div>

          {/* 5. Solid Blue Search CTA Button */}
          <div className="px-2 py-1 flex-shrink-0">
            <button
              type="button"
              onClick={onSearchSubmit}
              className="w-full lg:w-auto bg-[#1479F5] hover:bg-[#0B64D6] text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <Search size={15} strokeWidth={2.6} />
              <span>Search</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Secondary Quick Search & Active Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-3">
        {/* Direct Search input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchSubmit();
            }}
            placeholder="Search by country name..."
            className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-full text-xs font-semibold text-[#123B7A] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] shadow-sm transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active:
            </span>

            {selectedCountry !== 'Any Country' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#2563EB]/30 text-[#123B7A] text-xs font-bold shadow-sm">
                <span>{selectedCountry}</span>
                <button type="button" onClick={() => setSelectedCountry('Any Country')} className="hover:text-red-500 cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedVisaType !== 'All Visa Types' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#2563EB]/30 text-[#123B7A] text-xs font-bold shadow-sm">
                <span>{selectedVisaType}</span>
                <button type="button" onClick={() => setSelectedVisaType('All Visa Types')} className="hover:text-red-500 cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedDocument !== 'Any Documents' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#2563EB]/30 text-[#123B7A] text-xs font-bold shadow-sm">
                <span className="truncate max-w-[150px]">{selectedDocument}</span>
                <button type="button" onClick={() => setSelectedDocument('Any Documents')} className="hover:text-red-500 cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedDate !== '' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#2563EB]/30 text-[#123B7A] text-xs font-bold shadow-sm">
                <span>Date: {selectedDate}</span>
                <button type="button" onClick={() => setSelectedDate('')} className="hover:text-red-500 cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#123B7A] ml-1 cursor-pointer transition-colors"
            >
              <RotateCcw size={12} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
