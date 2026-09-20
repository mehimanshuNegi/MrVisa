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

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col cursor-pointer select-none transition-all duration-300"
    >
      {/* 1. Main Visual Card Container */}
      <div className="relative h-[340px] sm:h-[380px] lg:h-[400px] w-full rounded-[26px] sm:rounded-[28px] overflow-hidden bg-slate-900 border border-slate-200/60 shadow-[0_8px_24px_-4px_rgba(18,59,122,0.08)] group-hover:shadow-[0_20px_40px_-8px_rgba(18,59,122,0.18)] group-hover:-translate-y-1.5 transition-all duration-400 ease-out">
        
        {/* Large Destination Image */}
        <img
          src={image}
          alt={displayName}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Subtle, Bright Bottom Gradient Overlay (Not overly dark) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 group-hover:from-black/90 transition-colors duration-300 pointer-events-none" />

        {/* Top Left: Visa Type Pill */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-extrabold text-[#123B7A] tracking-wider uppercase shadow-sm border border-white/40">
            {visaType}
          </span>
        </div>

        {/* Top Right: Status / Availability Pill */}
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold text-white shadow-sm border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[90px]">Online</span>
          </span>
        </div>

        {/* Bottom Content Area */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 z-10 text-white flex flex-col justify-end">
          
          {/* Centered Flag + Country Name */}
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/70 shadow-md mb-2 flex items-center justify-center bg-white/20">
              {!flagError && flagUrl ? (
                <img
                  src={flagUrl}
                  alt={`${displayName} flag`}
                  className="w-full h-full object-cover"
                  onError={() => setFlagError(true)}
                />
              ) : (
                <span className="text-sm leading-none">{flagEmoji}</span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase leading-tight drop-shadow-md">
              {country}
            </h3>
          </div>

          {/* Clean 3-Column Specifications Row */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20 text-center bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
            {/* TYPE */}
            <div>
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
                TYPE
              </span>
              <span className="block text-xs sm:text-[13px] font-extrabold text-white mt-0.5 truncate">
                {visaType}
              </span>
            </div>

            {/* VALID */}
            <div className="border-x border-white/15">
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
                VALID
              </span>
              <span className="block text-xs sm:text-[13px] font-extrabold text-white mt-0.5 truncate">
                {validity}
              </span>
            </div>

            {/* FEES */}
            <div>
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
                FEES
              </span>
              <span className="block text-xs sm:text-[13px] font-extrabold text-[#60A5FA] mt-0.5 truncate">
                {fees}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/90 hover:bg-[#2563EB] text-[#123B7A] hover:text-white text-xs font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md group-hover:bg-[#2563EB] group-hover:text-white cursor-pointer"
            >
              <span>View Visa</span>
              <ArrowRight size={13} strokeWidth={2.5} className="transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>

      </div>

      {/* 2. Underneath Info: Guaranteed Visa On Timestamp */}
      <div className="mt-3 px-2 flex items-center justify-between">
        <div>
          <span className="block text-[11px] font-semibold text-slate-500">
            Guaranteed Visa On
          </span>
          <span className="block text-xs sm:text-[13px] font-extrabold text-[#123B7A] mt-0.5">
            {guaranteedDate}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-extrabold text-[#2563EB] group-hover:text-[#123B7A] transition-colors">
          <span>Apply</span>
          <ArrowRight size={12} strokeWidth={2.5} className="transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

    </div>
  );
}
