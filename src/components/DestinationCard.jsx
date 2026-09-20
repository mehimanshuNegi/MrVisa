import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';

export default function DestinationCard({ destination, index = 0 }) {
  const {
    id,
    country,
    displayName,
    flagUrl,
    flagEmoji,
    image,
    visaType,
    validity,
    fees,
    documents = "Bank Statements, Photo, Passport",
    documentsSummary
  } = destination;

  const [flagError, setFlagError] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/visa/${id}`);
  };

  // Data-driven Guaranteed Visa delivery time from entity
  const guaranteedDate = destination.guaranteedDate || "25 Sep 2026, 4:00 PM";

  return (
    <div 
      onClick={handleCardClick}
      className="group flex flex-col cursor-pointer select-none transition-transform duration-300"
      style={{
        animationDelay: `${Math.min(index, 5) * 100}ms`,
      }}
    >
      {/* 1. Interactive Visual Card Container */}
      <div className="relative h-[500px] sm:h-[530px] w-full rounded-[28px] sm:rounded-[32px] overflow-hidden bg-slate-950 shadow-[0_12px_36px_-6px_rgba(8,43,97,0.12)] border border-slate-100/40">
        
        {/* Destination Image (Zooms OUT on hover: scale 1.05 -> scale 1.0) */}
        <img
          src={image}
          alt={displayName}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out will-change-transform scale-[1.06] group-hover:scale-100 brightness-[0.98] group-hover:brightness-90"
        />

        {/* Top-Left Destination Pill */}
        <div className="absolute top-5 left-5 z-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-0">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-sm">
            {displayName}
          </span>
        </div>

        {/* Deep Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-60" />

        {/* 
          DEFAULT STATE (Bottom Info):
          Circular Flag + Country Name + 3-Column Specs
        */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 z-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-0">
          {/* Flag + Country Name */}
          <div className="flex flex-col items-center justify-center text-center mb-5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 shadow-sm mb-2.5 flex items-center justify-center bg-white/15">
              {!flagError && flagUrl ? (
                <img 
                  src={flagUrl} 
                  alt={`${displayName} flag`} 
                  className="w-full h-full object-cover"
                  onError={() => setFlagError(true)}
                />
              ) : (
                <span className="text-base leading-none">{flagEmoji}</span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-widest uppercase">
              {country}
            </h3>
          </div>

          {/* 3-Column Specifications Row */}
          <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-white/20 text-center">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                TYPE
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                {visaType}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                VALID
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                {validity}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                FEES
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                {fees}
              </span>
            </div>
          </div>
        </div>

        {/* 
          HOVER STATE: INSIDE-OUT VERTICAL REVEAL PANEL
          Smoothly rises upward from the bottom of the card.
        */}
        <div 
          className="absolute inset-x-0 bottom-0 z-20 px-7 py-6 bg-[#061836]/95 backdrop-blur-md rounded-b-[28px] sm:rounded-b-[32px] border-t border-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out will-change-transform flex flex-col justify-end"
        >
          {/* Top: Centered Flag + Country Name */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 shadow-md mb-2 flex items-center justify-center bg-white/10">
              {!flagError && flagUrl ? (
                <img 
                  src={flagUrl} 
                  alt={`${displayName} flag`} 
                  className="w-full h-full object-cover"
                  onError={() => setFlagError(true)}
                />
              ) : (
                <span className="text-base leading-none">{flagEmoji}</span>
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-widest uppercase">
              {country}
            </h3>
          </div>

          {/* Divider 1 */}
          <div className="border-t border-white/15 my-3 w-full" />

          {/* 3 Columns: TYPE | VALID | FEES */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                TYPE
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-1">
                {visaType}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                VALID
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-1">
                {validity}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
                FEES
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white mt-1">
                {fees}
              </span>
            </div>
          </div>

          {/* Divider 2 */}
          <div className="border-t border-white/15 my-3 w-full" />

          {/* Documents Needed */}
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              DOCUMENTS NEEDED:
            </p>
            <p className="text-xs sm:text-[13px] font-semibold text-white">
              {documentsSummary || documents}
            </p>
          </div>

          {/* Divider 3 */}
          <div className="border-t border-white/15 my-3 w-full" />

          {/* Emergency Assistance Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/contact');
            }}
            className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 mt-1 cursor-pointer"
          >
            <Clock size={14} className="text-slate-300" />
            <span>Get emergency assistance</span>
          </button>
        </div>

      </div>

      {/* 2. Guaranteed Visa Delivery Timestamp (Reference UI Pattern) */}
      <div className="mt-3.5 px-3 flex items-center justify-between">
        <div>
          <span className="block text-xs font-medium text-[#5D7190]">
            Guaranteed Visa On
          </span>
          <span className="block text-sm sm:text-[15px] font-bold text-[#082B61] mt-0.5">
            {guaranteedDate}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1479F5] group-hover:translate-x-1 transition-transform">
          <span>Explore</span>
          <ArrowRight size={13} strokeWidth={2.5} />
        </div>
      </div>

    </div>
  );
}
