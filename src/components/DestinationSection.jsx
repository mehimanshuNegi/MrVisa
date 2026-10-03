import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import DestinationCard from './DestinationCard';
import { visaService, countryService, filterDestinations } from '../services';
import { useFilter } from '../context/FilterContext';
import { mockVisas } from '../data/mockVisas';

// High-definition landmark imagery matching the exact reference design
const POPULAR_IMAGES = {
  japan: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  'united-arab-emirates': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  thailand: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
  georgia: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
  azerbaijan: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
  russia: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=800&q=80'
};

// Exact order of popular countries in front as shown in the UI reference
const POPULAR_ORDER = [
  'japan',
  'united-arab-emirates',
  'thailand',
  'georgia',
  'azerbaijan',
  'russia'
];

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

  // Filter and prioritize popular countries in front
  const displayedDestinations = useMemo(() => {
    let allVisas = Array.isArray(destinationsList) ? [...destinationsList] : [];

    // Ensure Japan is present in front if not returned from backend
    const hasJapan = allVisas.some(
      (v) => String(v.country || v.displayName || v.countryId || v.id).toLowerCase().includes('japan')
    );
    if (!hasJapan) {
      const japanMock = mockVisas.find((v) => v.id === 'japan');
      if (japanMock) {
        allVisas.push({
          ...japanMock,
          routeId: 'japan',
          image: POPULAR_IMAGES.japan
        });
      }
    }

    // Enrich popular cards with reference-matching landmark images if not already configured in DB
    allVisas = allVisas.map((v) => {
      if (v.image) return v;
      const matchedCountry = countriesList.find(
        (c) => c.slug === v.countryId || c.id === v.countryId || c._id === v.countryId
      );
      if (matchedCountry?.image) {
        return { ...v, image: matchedCountry.image };
      }
      const cKey = String(v.countryId || v.country || v.displayName || v.id).toLowerCase();
      for (const [key, img] of Object.entries(POPULAR_IMAGES)) {
        if (cKey.includes(key) || key.includes(cKey)) {
          return { ...v, image: img };
        }
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

    // Sort popular countries to the very front in the exact reference order
    const sorted = [...filtered].sort((a, b) => {
      const aKey = String(a.countryId || a.country || a.displayName || a.id).toLowerCase();
      const bKey = String(b.countryId || b.country || b.displayName || b.id).toLowerCase();

      const aIndex = POPULAR_ORDER.findIndex((p) => aKey.includes(p) || p.includes(aKey));
      const bIndex = POPULAR_ORDER.findIndex((p) => bKey.includes(p) || p.includes(bKey));

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

    // Homepage displays limited popular cards (6 cards) unless active filter is applied
    return hasActiveFilters ? sorted : sorted.slice(0, 6);
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
        {displayedDestinations.length === 0 ? (
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
