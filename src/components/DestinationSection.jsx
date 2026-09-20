import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import DestinationCard from './DestinationCard';
import { visaService } from '../services';

export default function DestinationSection() {
  const [destinationsList, setDestinationsList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDestinations() {
      try {
        const data = await visaService.getAllVisas();
        if (isMounted && data) {
          setDestinationsList(data);
        }
      } catch (e) {
        console.warn('Failed to load destinations:', e);
      }
    }
    loadDestinations();
    return () => { isMounted = false; };
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {destinationsList.map((dest, index) => (
            <DestinationCard key={dest.id} destination={dest} index={index} />
          ))}
        </div>

      </div>
    </section>
  );
}
