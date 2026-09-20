import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import QuerySupportCard from './QuerySupportCard';

export default function CTASection() {
  return (
    <section className="bg-white py-10 lg:py-14">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main CTA Banner */}
          <div className="lg:col-span-8 bg-[#F5F9FF] border border-[#1479F5]/15 rounded-3xl p-8 sm:p-12 lg:p-14 flex flex-col justify-center text-left relative overflow-hidden">
            <div className="max-w-xl space-y-3 relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1479F5]">
                Start Your Journey
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B2A63] tracking-tight">
                Ready for your next journey?
              </h2>
              <p className="text-lg font-bold text-[#1479F5]">
                Let Mr Visa Take You There
              </p>
              <div className="pt-2">
                <Link
                  to="/visa"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#1479F5] hover:bg-[#0B2A63] text-white font-bold text-sm transition-colors duration-200 shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>

          {/* Highlighted "Have a Question?" Support Box */}
          <div className="lg:col-span-4 flex">
            <div className="w-full">
              <QuerySupportCard />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
