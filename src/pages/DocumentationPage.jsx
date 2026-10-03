import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Globe,
  Building2,
  ArrowRight,
  ShieldCheck,
  Search,
  Headphones,
  Clock,
  Loader2
} from 'lucide-react';
import { documentationService } from '../services';

const SERVICE_STYLE_MAP = {
  'cover-letter': {
    badgeBg: 'bg-red-50 text-red-500',
    icon: FileText,
    fallbackDesc: 'Professional cover letter tailored to your visa and travel purpose.'
  },
  'travel-itinerary': {
    badgeBg: 'bg-blue-50 text-blue-500',
    icon: Calendar,
    fallbackDesc: 'Day-by-day itinerary with hotels, places and activities for your trip.'
  },
  'income-tax-return': {
    badgeBg: 'bg-purple-50 text-purple-600',
    icon: FileText,
    fallbackDesc: 'ITR filing with computation support for individuals and professionals.'
  },
  'import-export-code': {
    badgeBg: 'bg-amber-50 text-amber-600',
    icon: Globe,
    fallbackDesc: 'Get your IEC for import export business with expert guidance.'
  },
  'udyam-registration': {
    badgeBg: 'bg-emerald-50 text-emerald-600',
    icon: Building2,
    fallbackDesc: 'Official MSME registration with lifetime validity and complete support.'
  }
};

export default function DocumentationPage() {
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await documentationService.getAllServices({ status: 'ACTIVE' });
        if (isMounted) {
          const nonGstServices = (Array.isArray(data) ? data : []).filter(
            (s) => s.slug !== 'gst' && s.id !== 'gst' && !s.title?.toLowerCase().includes('gst')
          );
          setServices(nonGstServices);
        }
      } catch (err) {
        console.error('Failed to load documentation services:', err);
        if (isMounted) {
          setError('Failed to load documentation services. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadServices();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredServices = services.filter((service) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      service.title?.toLowerCase().includes(q) ||
      service.shortDescription?.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white min-h-screen text-[#0F172A] pb-20">
      {/* 1. HERO SECTION MATCHING IMAGE 1 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F9FF] to-white border-b border-slate-100 pt-7 pb-8 sm:pb-10">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <Link to="/" className="hover:text-[#2563EB] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#082B61] font-bold">Documentation</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#2563EB] text-[11.5px] font-bold mb-3 shadow-2xs">
                <ShieldCheck size={14} className="text-[#2563EB]" />
                <span>Consulate & Government Documentation</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#082B61] tracking-tight leading-[1.15]">
                Documentation Services
              </h1>

              <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 leading-relaxed max-w-xl">
                Get your travel and business documents prepared easily and correctly with consulate-verified formats and expert support.
              </p>
            </div>

            {/* Right Artwork Banner */}
            <div className="lg:col-span-5 hidden sm:flex justify-end">
              <div className="relative w-full max-w-[420px] h-[190px] rounded-2xl overflow-hidden shadow-md border border-slate-200/80">
                <img
                  src="/documentation-hero.jpg"
                  alt="Consulate travel documentation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH BAR & EXPERT GUIDANCE ROW */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-7 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search Bar Pill */}
          <div className="lg:col-span-8">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation services..."
                className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-slate-200/90 text-sm font-medium text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-blue-100/70 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Expert Guidance Card */}
          <div className="lg:col-span-4">
            <Link
              to="/contact?ask=true"
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/60 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">Not sure which document you need?</p>
                  <p className="text-xs font-bold text-[#2563EB] group-hover:text-[#082B61] transition-colors flex items-center gap-1">
                    Get Expert Guidance <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. DOCUMENTATION SERVICES GRID (5 CARDS ACROSS MATCHING IMAGE 1) */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={32} className="animate-spin text-[#2563EB] mb-3" />
            <p className="text-xs font-bold text-[#082B61]">Loading services...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 px-6 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto">
            <p className="text-sm font-bold text-red-600 mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-full text-xs font-bold hover:bg-[#1d4ed8] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto">
            <p className="text-sm font-bold text-[#082B61]">No documentation services match your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-bold text-[#2563EB] hover:underline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredServices.map((service) => {
              const slugKey = service.slug || '';
              const style = SERVICE_STYLE_MAP[slugKey] || {
                badgeBg: 'bg-blue-50 text-[#2563EB]',
                icon: FileText,
                fallbackDesc: service.shortDescription || service.description
              };
              const IconComp = style.icon;

              return (
                <div
                  key={service.slug || service.id}
                  onClick={() => navigate(`/documentation/${service.slug}`)}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-[#2563EB]/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Top Icon Badge */}
                    <div className={`w-10 h-10 rounded-2xl ${style.badgeBg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform flex-shrink-0 shadow-2xs`}>
                      <IconComp size={20} strokeWidth={2.2} />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-extrabold text-[#082B61] leading-snug group-hover:text-[#2563EB] transition-colors mb-2 min-h-[40px]">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                      {service.shortDescription || service.description || style.fallbackDesc}
                    </p>
                  </div>

                  {/* Card Footer: View Details & Circular Arrow Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2563EB] group-hover:text-[#082B61] transition-colors flex items-center gap-1">
                      View Details <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>

                    <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-all shadow-2xs">
                      <ArrowRight size={13} strokeWidth={2.4} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. THREE FEATURE STRIP MATCHING IMAGE 1 */}
        <div className="mt-10 rounded-2xl bg-[#F0F6FE] border border-blue-100 p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-blue-200/50">
            {/* Feature 1 */}
            <div className="flex items-center gap-3.5 pt-4 md:pt-0">
              <div className="w-10 h-10 rounded-xl bg-white text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#082B61]">Verified Formats</h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Consulate-ready templates and formats</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-8">
              <div className="w-10 h-10 rounded-xl bg-white text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Headphones size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#082B61]">Expert Support</h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Guidance at every step</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-8">
              <div className="w-10 h-10 rounded-xl bg-white text-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Clock size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#082B61]">Hassle-Free Process</h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Simple online application with quick turnaround</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
