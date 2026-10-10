import React, { useState, useEffect, useRef } from 'react';
import { Plane, Search, X, Check, AlertCircle } from 'lucide-react';
import { searchAirports, formatAirportLabel, findAirportByIata } from '../../data/airports';

export default function AirportAutocomplete({
  id = 'airport-autocomplete',
  label = 'Airport',
  value = '',
  selectedIata = '',
  onChange,
  onClear,
  disabledIata = '',
  error = '',
  placeholder = 'Search by city, airport name or IATA code...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalError, setInternalError] = useState('');

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const suggestions = React.useMemo(() => {
    return searchAirports(query, 8);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // If query was typed but no valid airport matches selectedIata, enforce valid selection
        if (query && !selectedIata) {
          const matched = findAirportByIata(query);
          if (matched) {
            handleSelect(matched);
          } else {
            setInternalError('Please select a valid airport from the suggestions list.');
          }
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [query, selectedIata]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    setInternalError('');

    // If cleared or changed, notify parent that explicit selection is cleared
    if (!val) {
      if (typeof onClear === 'function') onClear();
    }
  };

  const handleSelect = (airport) => {
    if (!airport) return;

    if (disabledIata && airport.iata.toUpperCase() === disabledIata.toUpperCase()) {
      setInternalError(`Origin and destination cannot both be ${airport.name} (${airport.iata}).`);
      return;
    }

    setInternalError('');
    const fullLabel = formatAirportLabel(airport);
    setQuery(fullLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);

    if (typeof onChange === 'function') {
      onChange({
        iata: airport.iata,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        label: fullLabel
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    setInternalError('');
    if (typeof onClear === 'function') {
      onClear();
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const activeError = error || internalError;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#082B61] mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Plane size={16} className="text-[#2563EB]" />
        </div>

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-[#E2E8F0]/40 hover:bg-[#E2E8F0]/60 focus:bg-white border ${
            activeError
              ? 'border-red-500 focus:border-red-500 ring-1 ring-red-300'
              : selectedIata
              ? 'border-blue-400 focus:border-[#2563EB]'
              : 'border-slate-300 focus:border-[#082B61]'
          } rounded-xl pl-10 pr-20 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {selectedIata && (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] text-[11px] font-black uppercase tracking-wider">
              {selectedIata}
            </span>
          )}

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              title="Clear airport"
              aria-label="Clear airport selection"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {activeError && (
        <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{activeError}</span>
        </p>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-[0_12px_36px_rgba(8,43,97,0.18)] border border-slate-200/90 z-50 max-h-72 overflow-y-auto overflow-x-hidden p-1.5 animate-in fade-in duration-100"
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs font-semibold text-slate-500">
                No recognized airports found matching "{query}"
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching by city (e.g. Dubai, Paris), airport name, or 3-letter IATA code.
              </p>
            </div>
          ) : (
            suggestions.map((airport, index) => {
              const isSelected = selectedIata === airport.iata;
              const isDisabled = disabledIata && airport.iata.toUpperCase() === disabledIata.toUpperCase();
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={airport.iata}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(airport)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 transition cursor-pointer ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                      : isSelected
                      ? 'bg-[#F4F8FF] text-[#2563EB] font-bold'
                      : isHighlighted
                      ? 'bg-slate-100 text-[#082B61]'
                      : 'hover:bg-slate-50 text-[#082B61]'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#082B61] truncate block text-[13px]">
                        {airport.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-medium truncate">
                      {airport.city}, {airport.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-1 rounded-md text-[11px] font-black tracking-wide ${
                        isSelected
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-100 text-[#123B7A] border border-slate-200'
                      }`}
                    >
                      {airport.iata}
                    </span>
                    {isSelected && <Check size={14} strokeWidth={3} className="text-[#2563EB]" />}
                    {isDisabled && (
                      <span className="text-[10px] font-bold text-slate-400 italic">
                        Selected as other end
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
