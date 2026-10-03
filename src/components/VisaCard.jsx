import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function VisaCard({ visa }) {
  const {
    id,
    country,
    displayName,
    flagUrl,
    flagEmoji,
    image,
    visaType,
    validity,
    processingTime,
    fees,
    guaranteedDate,
    availability = "Visa available for application"
  } = visa;

  const [flagError, setFlagError] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/visa/${id}`);
  };

  const countryTitle = displayName || country;

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-2xl sm:rounded-[22px] border border-slate-200/90 shadow-[0_2px_10px_-2px_rgba(8,43,97,0.06)] hover:shadow-[0_14px_28px_-4px_rgba(8,43,97,0.12)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer select-none"
    >
      {/* 1. TOP: Destination Image with Badges */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100 flex-shrink-0">
        <img
          src={image}
          alt={countryTitle}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Top-Left: Visa Type Pill Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[10px] sm:text-[10.5px] font-extrabold text-[#082B61] tracking-wider uppercase shadow-2xs border border-white/50">
            {visaType || 'Tourist Visa'}
          </span>
        </div>

        {/* Top-Right: Online Status Pill Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#082B61]/85 backdrop-blur-xs text-[10px] font-bold text-white shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </span>
        </div>
      </div>

      {/* 2. BOTTOM: Flag, Title, Circular Arrow Action, and 3-Column Stats */}
      <div className="p-4 sm:p-4.5 flex flex-col justify-between flex-1 bg-white">
        
        {/* Row 1: Flag Circle + Country Name + Circular Arrow Action */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200/80 flex items-center justify-center bg-slate-50 flex-shrink-0 text-xs shadow-2xs">
              {!flagError && flagUrl ? (
                <img
                  src={flagUrl}
                  alt={`${countryTitle} flag`}
                  className="w-full h-full object-cover"
                  onError={() => setFlagError(true)}
                />
              ) : (
                <span className="leading-none">{flagEmoji || '🌍'}</span>
              )}
            </div>

            <h3 className="text-xs sm:text-[14px] font-extrabold text-[#082B61] group-hover:text-[#1479F5] transition-colors truncate">
              {countryTitle}
            </h3>
          </div>

          {/* Circular Light-Blue Arrow Action */}
          <div className="w-6 h-6 rounded-full bg-[#EBF3FF] text-[#1479F5] group-hover:bg-[#1479F5] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
            <ArrowRight size={11} strokeWidth={2.4} className="transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Row 2: Clean 3-Column Specifications Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-left">
          {/* TYPE */}
          <div>
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              TYPE
            </span>
            <span className="block text-xs font-bold text-[#082B61] mt-1 truncate">
              {visaType || 'Tourist Visa'}
            </span>
          </div>

          {/* VALIDITY */}
          <div className="border-x border-slate-100 px-2">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              VALIDITY
            </span>
            <span className="block text-xs font-bold text-[#082B61] mt-1 truncate">
              {validity || '30 Days'}
            </span>
          </div>

          {/* FEES */}
          <div className="pl-1">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none">
              FEES
            </span>
            <span className="block text-xs font-bold text-[#1479F5] mt-1 truncate">
              {fees || 'From ₹999'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
