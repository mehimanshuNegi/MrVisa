import React from 'react';
import { Link } from 'react-router-dom';
import { Headphones, HelpCircle, MessageSquare, ArrowRight } from 'lucide-react';

export default function TravelSupportSection() {
  return (
    <section id="travel-support-section" className="bg-[#FAFBFD] pt-12 sm:pt-16 pb-16 sm:pb-24 border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_-6px_rgba(8,43,97,0.06)] p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold mb-3 border border-blue-100">
              <Headphones size={14} />
              <span>Dedicated Visa & Travel Support</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#082B61] tracking-tight">
              Have Questions About Your Travel or Visa?
            </h2>

            <p className="text-sm sm:text-base text-slate-500 font-medium mt-2 leading-relaxed">
              Whether you need document checklist verification, embassy guidance, or assistance with flight proof, our support team is here to assist on time, every time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0">
            <Link
              to="/contact?ask=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-[#082B61] transition-all cursor-pointer shadow-2xs hover:border-[#2563EB]/40"
            >
              <HelpCircle size={15} className="text-[#2563EB]" />
              <span>Ask a Question</span>
            </Link>

            <Link
              to="/contact?support=true"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              <MessageSquare size={15} />
              <span>Contact Support</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
