import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export default function EmptyState({ onReset }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-sm my-12">
      <div className="w-16 h-16 rounded-full bg-[#F4F8FF] border border-[#2563EB]/20 text-[#2563EB] flex items-center justify-center mx-auto mb-5 shadow-sm">
        <SearchX size={32} strokeWidth={2} />
      </div>
      <h3 className="text-2xl font-extrabold text-[#123B7A] tracking-tight">
        No visas found
      </h3>
      <p className="text-sm font-medium text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
        Try adjusting your search keywords, visa types, or document requirements to see available destinations.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
      >
        <RotateCcw size={15} />
        <span>Clear Filters</span>
      </button>
    </div>
  );
}
