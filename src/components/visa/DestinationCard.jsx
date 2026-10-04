import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function DestinationCard({ destination, index = 0 }) {
  const {
    id,
    country,
    displayName,
    flagUrl,
    flagEmoji,
    image,
    visaType,
    routeId
  } = destination;

  const [flagError, setFlagError] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/visa/${routeId || id}`);
  };

  const countryTitle = country || displayName;

  // Clean, short visa label matching reference (e.g. Tourist Visa, e-Visa / TDAC, e-Visa)
  const formatVisaType = () => {
    const raw = String(visaType || '').toLowerCase();
    const cLower = String(countryTitle || '').toLowerCase();
    if (cLower.includes('thailand')) return 'e-Visa / TDAC';
    if (cLower.includes('united arab') || cLower.includes('emirates')) return 'Tourist Visa';
    if (raw.includes('arrival card') || raw.includes('tdac')) return 'e-Visa / Arrival Card';
    if (raw.includes('e-visa') || raw.includes('eta')) return 'e-Visa';
    return visaType || 'Tourist Visa';
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(8,43,97,0.06)] hover:shadow-[0_12px_24px_-4px_rgba(8,43,97,0.12)] hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer select-none"
      style={{
        animationDelay: `${Math.min(index, 6) * 50}ms`,
      }}
    >
      {/* TOP: Destination Image matching reference */}
      <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-slate-100 flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt={countryTitle}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 text-2xl">
            {flagEmoji || '🌍'}
          </div>
        )}
      </div>

      {/* BOTTOM: Flag, Country Name, Arrow, Visa Label, High Approval Rate Badge */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-white">
        <div>
          {/* Row 1: Flag + Country Name + Circular Arrow Action */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className="w-4.5 h-4.5 rounded-full overflow-hidden border border-slate-200/80 flex items-center justify-center bg-slate-50 flex-shrink-0 text-xs shadow-2xs">
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

              <h3 className="text-xs sm:text-[13px] font-extrabold text-[#082B61] group-hover:text-[#1479F5] transition-colors truncate">
                {countryTitle}
              </h3>
            </div>

            {/* Circular Light-Blue Arrow Button */}
            <div className="w-5.5 h-5.5 rounded-full bg-[#EBF3FF] text-[#1479F5] group-hover:bg-[#1479F5] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
              <ArrowRight size={10.5} strokeWidth={2.4} className="transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Row 2: Visa Type Label */}
          <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-medium pl-6 truncate mt-0.5">
            {formatVisaType()}
          </p>
        </div>

        {/* Row 3: High Approval Rate Pill Badge */}
        <div className="mt-2">
          <div className="w-full text-center py-0.5 sm:py-1 px-1.5 rounded-md sm:rounded-lg bg-[#EAF8F1] text-[#059669] text-[10px] font-bold leading-none">
            High Approval Rate
          </div>
        </div>
      </div>
    </div>
  );
}
