import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Calendar,
  Receipt,
  Globe,
  Building2,
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { documentationService } from '../../services';

// Exact service visual configurations matching the UI reference
const SERVICE_CONFIG = {
  'cover-letter': {
    icon: Mail,
    iconBoxClass: 'bg-red-50 text-red-500 border border-red-200/80',
    title: 'Cover Letter',
    description: 'Professional cover letter for visa and travel purposes.'
  },
  'travel-itinerary': {
    icon: Calendar,
    iconBoxClass: 'bg-blue-50 text-blue-500 border border-blue-200/80',
    title: 'Travel Itinerary',
    description: 'Day-by-day travel itinerary with hotels, places and activities.'
  },
  'itr': {
    icon: Receipt,
    iconBoxClass: 'bg-purple-50 text-purple-500 border border-purple-200/80',
    title: 'Income Tax Return',
    description: 'ITR filing with computation support.'
  },
  'import-export': {
    icon: Globe,
    iconBoxClass: 'bg-amber-50 text-amber-500 border border-amber-200/80',
    title: 'Import Export Code (IEC)',
    description: 'Get your IEC for import export business.'
  },
  'msme': {
    icon: Building2,
    iconBoxClass: 'bg-teal-50 text-teal-500 border border-teal-200/80',
    title: 'Udyam Registration (MSME)',
    description: 'Udyam registration for MSME businesses.'
  },
  'gst': {
    icon: FileText,
    iconBoxClass: 'bg-yellow-50 text-yellow-600 border border-yellow-200/80',
    title: 'GST Registration',
    description: 'GST registration and filing support.'
  }
};

export default function DocumentationHomeSection() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await documentationService.getAllServices({ status: 'ACTIVE' });
        if (isMounted && Array.isArray(data)) {
          // Strictly exclude GST from homepage presentation as requested
          const filteredDocs = data.filter(
            (s) => s.slug !== 'gst' && s.id !== 'gst' && !s.title?.toLowerCase().includes('gst')
          );
          
          // Exact 5 services: cover-letter, travel-itinerary, itr, import-export, msme
          const order = ['cover-letter', 'travel-itinerary', 'itr', 'import-export', 'msme'];
          const sorted = [...filteredDocs].sort((a, b) => {
            const aIdx = order.indexOf(a.slug);
            const bIdx = order.indexOf(b.slug);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });
          setServices(sorted);
        }
      } catch (err) {
        console.warn('Failed to load documentation services for homepage:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="documentation-section" className="bg-white pt-4 sm:pt-6 pb-10 sm:pb-14 border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-5 pb-2.5 border-b border-slate-100 gap-2.5">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-[#082B61] tracking-tight">
              Documentation Services
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#5D7190] mt-0.5">
              Get your travel and business documents prepared easily and correctly.
            </p>
          </div>

          <div>
            <Link
              to="/documentation"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#1479F5] hover:text-[#082B61] transition-colors group"
            >
              <span>View All Documentation</span>
              <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 5-Card Documentation Services Row (Excluding GST) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-[#1479F5]" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-500">
            No documentation services currently listed.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {services.map((service) => {
              const cfg = SERVICE_CONFIG[service.slug] || {};
              const IconComp = cfg.icon || FileText;
              const boxClass = cfg.iconBoxClass || 'bg-blue-50 text-blue-500 border border-blue-200/80';
              // Single source of truth: prioritize database values from MongoDB
              const title = service.title || cfg.title;
              const desc = service.shortDescription || service.description || cfg.description;

              return (
                <Link
                  key={service.slug || service.id}
                  to={`/documentation/${service.slug}`}
                  className="group bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(8,43,97,0.06)] hover:shadow-[0_10px_20px_-4px_rgba(8,43,97,0.12)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none min-h-[148px] sm:min-h-[158px]"
                >
                  <div>
                    {/* Colored Icon Box */}
                    <div className={`w-7 h-7 rounded-xl ${boxClass} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform flex-shrink-0`}>
                      <IconComp size={15} />
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-[13px] font-extrabold text-[#082B61] leading-snug group-hover:text-[#1479F5] transition-colors mb-1 line-clamp-1">
                      {title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  {/* Circular Light-Blue Arrow Action */}
                  <div className="pt-2 flex justify-end">
                    <div className="w-5.5 h-5.5 rounded-full bg-[#EBF3FF] text-[#1479F5] group-hover:bg-[#1479F5] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                      <ArrowRight size={10.5} strokeWidth={2.4} className="transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
