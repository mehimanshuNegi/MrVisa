import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, RotateCcw, X, Loader2 } from 'lucide-react';
import DestinationCard from './DestinationCard';
import { visaService, countryService, filterDestinations } from '../services';
import { useFilter } from '../context/FilterContext';

export default function DestinationSection() {
  const [destinationsList, setDestinationsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCountry, selectedVisaType, hasActiveFilters, resetFilters } = useFilter();

  useEffect(() => {
    let isMounted = true;
    async function loadDestinations() {
      setIsLoading(true);
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
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadDestinations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter and display database-driven destinations directly from MongoDB
  const displayedDestinations = useMemo(() => {
    let allVisas = Array.isArray(destinationsList) ? [...destinationsList] : [];

    // Ensure visa image fallback dynamically resolves to its parent country's image if not already set
    allVisas = allVisas.map((v) => {
      if (v.image) return v;
      const matchedCountry = countriesList.find(
        (c) => c.slug === v.countryId || c.id === v.countryId || c._id === v.countryId
      );
      if (matchedCountry?.image) {
        return { ...v, image: matchedCountry.image };
      }
      return v;
    });

    const filtered = filterDestinations({
      visas: allVisas,
      countries: countriesList,
      searchQuery: '',
      selectedCountry,
      selectedVisaType,
      statusFilter: 'ACTIVE'
    });

    // If customer has selected an active filter (country / visa type), show filtered results
    if (hasActiveFilters) {
      return filtered;
    }

    // Homepage logic:
    // Active visa/destination records -> isPopular === true -> displayOrder -> Popular Visa Destinations
    // If admin switches Thailand -> Popular ON, it appears. If OFF, it disappears.
    return filtered
      .filter((v) => Boolean(v.isPopular))
      .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
  }, [destinationsList, countriesList, selectedCountry, selectedVisaType, hasActiveFilters]);

  return (
    <section id="visa-destinations" className="bg-white pt-4 sm:pt-6 pb-6 sm:pb-8 relative z-10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-5 pb-2.5 border-b border-slate-100 gap-2.5">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-[#082B61] tracking-tight">
              Popular Visa Destinations
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#5D7190] mt-0.5">
              Find the right visa for your next journey.
            </p>

            {/* Active Filter Pill Bar */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-2.5">
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
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#1479F5] hover:text-[#082B61] transition-colors group"
            >
              <span>View All Visas</span>
              <ArrowRight size={15} className="transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* 
          POPULAR VISA CARDS ROW:
          6 compact cards across on desktop matching the reference UI
        */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#1479F5] animate-spin" />
          </div>
        ) : displayedDestinations.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl bg-slate-50 border border-slate-200">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {displayedDestinations.map((dest, index) => (
              <DestinationCard key={dest.id || dest._id || index} destination={dest} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
