import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import DestinationCard from './DestinationCard';
import { visaService, countryService, filterDestinations } from '../services';
import { useFilter } from '../context/FilterContext';

export default function DestinationSection() {
  const [destinationsList, setDestinationsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const { selectedCountry, selectedVisaType, hasActiveFilters, resetFilters } = useFilter();

  useEffect(() => {
    let isMounted = true;
    async function loadDestinations() {
      try {
        const [visas, countries] = await Promise.all([
          visaService.getAllVisas(),
          countryService.getAllCountries()
        ]);
        if (isMounted) {
          if (visas) setDestinationsList(visas);
          if (countries) setCountriesList(countries);
        }
      } catch (e) {
        console.warn('Failed to load destinations:', e);
      }
    }
    loadDestinations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter the actual destination cards rendered on the page using the central filter pipeline
  const displayedDestinations = useMemo(() => {
    return filterDestinations({
      visas: destinationsList,
      countries: countriesList,
      searchQuery: '', // Header filter filters cards directly, independent of search text
      selectedCountry,
      selectedVisaType,
      statusFilter: 'ACTIVE'
    });
  }, [destinationsList, countriesList, selectedCountry, selectedVisaType]);

  return (
    <section className="bg-white pt-6 sm:pt-8 pb-16 lg:pb-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#082B61] tracking-tight">
              Explore Visa Destinations
            </h2>
            <p className="text-base sm:text-lg font-medium text-[#5D7190] mt-1">
              Find the right visa for your next journey.
            </p>

            {/* Active Filter Pill Bar */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold text-slate-500">Filtered by:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1479F5] text-xs font-bold border border-blue-200/60">
                  {[
                    selectedCountry !== 'All Countries' && selectedCountry,
                    selectedVisaType !== 'All Visa Types' && selectedVisaType
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-bold text-slate-400 hover:text-[#1479F5] transition-colors cursor-pointer"
                >
                  Show all
                </button>
              </div>
            )}
          </div>

          <div>
            <a
              href="/visa"
              className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#1479F5] hover:text-[#082B61] transition-colors group"
            >
              <span>View All Visas</span>
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* 
          EXACTLY 3 LARGE CARDS PER ROW ON DESKTOP:
          Grid columns: repeat(3, minmax(0, 1fr)) with generous gap
        */}
        {displayedDestinations.length === 0 ? (
          <div className="text-center py-14 px-6 rounded-3xl bg-slate-50 border border-slate-200">
            <p className="text-base font-bold text-[#082B61]">
              No visas found for this selection.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try changing or clearing your filter to view all available destinations.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1479F5] text-white text-xs font-bold hover:bg-[#082B61] transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Filter</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {displayedDestinations.map((dest, index) => (
              <DestinationCard key={dest.id} destination={dest} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
