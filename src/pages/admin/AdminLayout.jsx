import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, FileText, ExternalLink, User } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const isApplicationsActive = location.pathname.includes('/admin/applications') || location.pathname === '/admin';
  const isVisasActive = location.pathname.includes('/admin/visas');
  const isCountriesActive = location.pathname.includes('/admin/countries');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#082B61] flex flex-col font-sans">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand & Admin Lockup */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/admin/applications" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
                Mr Visa
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#2563EB] text-[10px] font-extrabold uppercase tracking-wider">
                Admin
              </span>
            </Link>

            <nav className="flex items-center gap-1 border-l border-slate-200 pl-3 sm:pl-6 text-xs font-bold overflow-x-auto">
              <Link
                to="/admin/applications"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isApplicationsActive
                    ? 'bg-blue-50 text-[#2563EB]'
                    : 'text-slate-600 hover:text-[#082B61] hover:bg-slate-50'
                }`}
              >
                Applications
              </Link>
              <Link
                to="/admin/visas"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isVisasActive
                    ? 'bg-blue-50 text-[#2563EB]'
                    : 'text-slate-600 hover:text-[#082B61] hover:bg-slate-50'
                }`}
              >
                Visa Management
              </Link>
              <Link
                to="/admin/countries"
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isCountriesActive
                    ? 'bg-blue-50 text-[#2563EB]'
                    : 'text-slate-600 hover:text-[#082B61] hover:bg-slate-50'
                }`}
              >
                Countries
              </Link>
            </nav>
          </div>

          {/* Right Controls: Customer View & Admin Profile */}
          <div className="flex items-center gap-3">
            <Link
              to="/account"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-[#082B61] text-xs font-bold transition-all shadow-2xs"
            >
              <span>Customer Portal</span>
              <ExternalLink size={12} />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-bold text-xs">
                <User size={15} />
              </div>
              <div className="hidden md:block text-left leading-tight">
                <span className="text-xs font-extrabold text-[#082B61] block">Immigration Ops</span>
                <span className="text-[10px] text-slate-400 font-semibold block">System Admin</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
