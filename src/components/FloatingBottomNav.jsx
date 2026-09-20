import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, User } from 'lucide-react';

export default function FloatingBottomNav() {
  const location = useLocation();
  const isVisaActive = location.pathname.startsWith('/visa');
  const isAccountActive = location.pathname.startsWith('/contact') || location.pathname.startsWith('/account');

  // Country detail page renders its own dynamic floating action bar with Start Application
  const isCountryDetailPage = location.pathname.startsWith('/visa/') && location.pathname !== '/visa';
  if (isCountryDetailPage) return null;

  return (
    <nav 
      aria-label="Floating Navigation"
      className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-full p-1.5 border border-slate-200/90 shadow-[0_8px_30px_rgba(18,59,122,0.14)] hover:shadow-[0_12px_36px_rgba(18,59,122,0.22)] transition-all duration-300 flex items-center gap-1">
        
        {/* 1. Visa */}
        <Link
          to="/visa"
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            isVisaActive
              ? 'bg-[#123B7A] text-white shadow-sm'
              : 'text-[#123B7A]/75 hover:text-[#123B7A] hover:bg-slate-100/70'
          }`}
          aria-label="Visa Destinations"
        >
          <Compass 
            size={15} 
            strokeWidth={isVisaActive ? 2.6 : 2} 
            className={isVisaActive ? 'text-white' : 'text-[#2563EB]'} 
          />
          <span className="tracking-wide">Visa</span>
        </Link>

        {/* Subtle Divider */}
        <div className="h-4 w-[1px] bg-slate-200" />

        {/* 2. My Account */}
        <Link
          to="/account"
          className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            isAccountActive
              ? 'bg-[#123B7A] text-white shadow-sm'
              : 'text-[#123B7A]/75 hover:text-[#123B7A] hover:bg-slate-100/70'
          }`}
          aria-label="My Account"
        >
          <User 
            size={15} 
            strokeWidth={isAccountActive ? 2.6 : 2} 
            className={isAccountActive ? 'text-white' : 'text-[#2563EB]'} 
          />
          <span className="tracking-wide">My Account</span>
        </Link>

      </div>
    </nav>
  );
}
