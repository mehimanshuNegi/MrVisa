import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const links = [
    { name: 'Home', path: '/' },
    { name: 'Visa', path: '/visa' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="bg-white border-t border-slate-100 py-12 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-slate-100">

          {/* Brand Lockup */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3.5 focus:outline-none group" aria-label="NimuFly Home">
              <img
                src="/mrvisa-mascot.png"
                alt="NimuFly Mascot"
                className="h-16 w-auto object-contain flex-shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col justify-center">
                <span className="text-2xl font-extrabold text-[#123B7A] tracking-tight leading-none">
                  NimuFly
                </span>
                <span className="text-xs font-semibold tracking-wider text-[#2563EB] mt-1.5 leading-none">
                  On Time, Every Time.
                </span>
              </div>
            </Link>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-8" aria-label="Footer Navigation">
            {links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-semibold text-[#64748B] hover:text-[#1479F5] transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[#64748B]">
          <p>© {new Date().getFullYear()} NimuFly. All rights reserved.</p>
          <p className="text-slate-400">
            Premium Global Visa Facilitation
          </p>
        </div>
      </div>
    </footer>
  );
}
