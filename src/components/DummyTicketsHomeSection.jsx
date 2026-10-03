import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, ArrowRight, CheckCircle2, Loader2, Clock, Calendar } from 'lucide-react';
import { dummyTicketService } from '../services';

export default function DummyTicketsHomeSection() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await dummyTicketService.getAllServices({ status: 'ACTIVE' });
        if (isMounted && Array.isArray(data)) {
          setTickets(data);
        }
      } catch (err) {
        console.warn('Failed to load dummy ticket services for homepage:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="dummy-tickets-section" className="bg-white pt-12 sm:pt-16 pb-16 sm:pb-20 border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#082B61] tracking-tight">
              Flight Reservations for Visa Applications
            </h2>
            <p className="text-sm sm:text-base font-medium text-[#5D7190] mt-1">
              Simple flight reservation options.
            </p>
          </div>

          <div>
            <Link
              to="/dummy-tickets"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2563EB] hover:text-[#082B61] transition-colors group"
            >
              <span>View All Options</span>
              <ArrowRight size={15} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Small & Clean Dummy Ticket Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#2563EB]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-500">
            No flight reservation options currently listed.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 max-w-4xl gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.id || ticket._id}
                className="bg-[#FAFBFD] hover:bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 hover:border-[#2563EB]/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Plane size={18} />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                      <CheckCircle2 size={11} />
                      <span>Live 6-Digit PNR</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-[#082B61] group-hover:text-[#2563EB] transition-colors mb-1.5">
                    {ticket.name || ticket.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {ticket.description || 'Embassy compliant airline booking reservation with verifiable PNR.'}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-4">
                    <span className="text-xl font-black text-[#082B61]">
                      ₹{ticket.price?.toLocaleString('en-IN') || ticket.amount || 499}
                    </span>
                    <span className="text-xs font-medium text-slate-400">/ reservation</span>
                  </div>

                  {/* Delivery & Validity Specs */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#5D7190] py-2 border-t border-slate-100 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-[#2563EB]" />
                      <span>{ticket.deliveryTime || '10-30 min delivery'}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-[#2563EB]" />
                      <span>{ticket.validity || '14 Days Validity'}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Official Airline Ticket</span>
                  <Link
                    to="/dummy-tickets"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
                  >
                    <span>Reserve Flight Proof</span>
                    <ArrowRight size={12} className="transform group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
