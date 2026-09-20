import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowRight, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function QuerySupportCard({ inline = false }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#1479F5]/25 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_-6px_rgba(20,121,245,0.09)] relative overflow-hidden group hover:border-[#1479F5]/50 transition-all duration-200">
      {/* Subtle blue accent background dot */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1479F5]/5 rounded-bl-full pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header with blue accent icon */}
        <div className="flex items-center gap-2.5 text-[#1479F5]">
          <div className="w-8 h-8 rounded-lg bg-[#F5F9FF] border border-[#1479F5]/20 flex items-center justify-center">
            <HelpCircle size={17} strokeWidth={2.2} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1479F5]">
            Quick Support
          </span>
        </div>

        {/* Content */}
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2A63] tracking-tight">
          Have a question?
        </h3>

        <p className="text-sm font-medium text-[#64748B] leading-relaxed">
          Need help with your visa? <br className="hidden sm:inline" />
          Our team is here to help.
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            to="/contact?ask=true"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1479F5] hover:bg-[#0B2A63] text-white text-xs font-bold transition-colors shadow-sm"
          >
            <span>Ask a Question</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
