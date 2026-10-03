import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Plane, FileText } from 'lucide-react';
import { useFilter } from '../context/FilterContext';

export default function FloatingBottomNav() {
  const location = useLocation();
  const { isFilterBarScrolled } = useFilter();

  const [isScrolledOnOtherPages, setIsScrolledOnOtherPages] = useState(false);

  const isHomePage = location.pathname === '/';
  const isVisaActive = location.pathname === '/' || location.pathname.startsWith('/visa');
  const isDocActive = location.pathname.startsWith('/documentation');
  const isTicketActive = location.pathname.startsWith('/dummy-tickets');

  // Country detail page renders its own dynamic floating action bar with Start Application
  const isCountryDetailPage = location.pathname.startsWith('/visa/') && location.pathname !== '/visa';

  // Listen to window scroll on non-home pages
  useEffect(() => {
    if (isHomePage) return;

    const handleScroll = () => {
      setIsScrolledOnOtherPages(window.scrollY > 160);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  if (isCountryDetailPage) return null;

  // Visible ONLY when hero filter transitioned to header on home, or scrolled on other pages
  const isVisible = isHomePage ? isFilterBarScrolled : isScrolledOnOtherPages;

  return (
    <nav 
      aria-label="Floating Navigation"
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none transition-all duration-300 ease-out ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-full p-1.5 border border-slate-200/90 shadow-[0_8px_30px_rgba(18,59,122,0.14)] hover:shadow-[0_12px_36px_rgba(18,59,122,0.2)] transition-all duration-300 flex items-center gap-1">
        
        {/* 1. Visa */}
        <Link
          to="/visa"
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            isVisaActive
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#123B7A]/75 hover:text-[#123B7A] hover:bg-slate-100/70'
          }`}
          aria-label="Visa Destinations"
        >
          <Compass 
            size={14} 
            strokeWidth={isVisaActive ? 2.6 : 2} 
            className={isVisaActive ? 'text-white' : 'text-[#2563EB]'} 
          />
          <span className="tracking-wide">Visa</span>
        </Link>

        {/* 2. Documentation */}
        <Link
          to="/documentation"
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            isDocActive
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#123B7A]/75 hover:text-[#123B7A] hover:bg-slate-100/70'
          }`}
          aria-label="Documentation Services"
        >
          <FileText 
            size={14} 
            strokeWidth={isDocActive ? 2.6 : 2} 
            className={isDocActive ? 'text-white' : 'text-[#2563EB]'} 
          />
          <span className="tracking-wide">Documentation</span>
        </Link>

        {/* 3. Dummy Tickets */}
        <Link
          to="/dummy-tickets"
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer ${
            isTicketActive
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#123B7A]/75 hover:text-[#123B7A] hover:bg-slate-100/70'
          }`}
          aria-label="Dummy Tickets"
        >
          <Plane 
            size={14} 
            strokeWidth={isTicketActive ? 2.6 : 2} 
            className={isTicketActive ? 'text-white' : 'text-[#2563EB]'} 
          />
          <span className="tracking-wide whitespace-nowrap">Dummy Tickets</span>
        </Link>

      </div>
    </nav>
  );
}
