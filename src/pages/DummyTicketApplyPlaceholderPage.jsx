import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plane,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  Loader2
} from 'lucide-react';
import { dummyTicketService } from '../services';

export default function DummyTicketApplyPlaceholderPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        if (slug) {
          const data = await dummyTicketService.getServiceBySlug(slug);
          if (isMounted) setTicket(data);
        } else {
          const all = await dummyTicketService.getAllServices();
          if (isMounted && all && all.length > 0) setTicket(all[0]);
        }
      } catch (err) {
        console.warn('Failed to load dummy ticket for apply placeholder:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [slug]);

  const ticketTitle = ticket?.title || 'Verified Flight Reservation';
  const ticketPrice = ticket?.formattedPrice || (ticket?.price ? `₹${Number(ticket.price).toLocaleString('en-IN')}` : '₹499');

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 py-6">
        <div className="max-w-[1000px] mx-auto px-6 flex items-center justify-between">
          <Link
            to="/dummy-tickets"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Flight Reservations</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Lock size={12} className="text-emerald-500" />
            <span>Instant GDS Reservation Gateway</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
            <p className="text-sm font-bold text-[#082B61]">Loading reservation workspace...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] block mb-1">
                Booking Request Step
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                Request {ticketTitle}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                This dedicated booking workspace will generate your itinerary with real airline PNR codes for embassy submission.
              </p>
            </div>

            {/* Clean Placeholder Application Container */}
            <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-8 sm:p-12 space-y-8">
              
              {/* Step indicator */}
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#082B61]">Travel Route & Passenger Details</h3>
                  <p className="text-xs text-slate-400">Departure origin, destination cities, and flight dates</p>
                </div>
              </div>

              {/* Service summary pill */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service</span>
                  <span className="text-sm font-bold text-[#082B61] mt-0.5 block">{ticketTitle}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery</span>
                  <span className="text-sm font-bold text-[#2563EB] mt-0.5 block">{ticket?.deliveryTime || '10–30 Minutes'}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fee</span>
                  <span className="text-sm font-bold text-[#082B61] mt-0.5 block">{ticketPrice}</span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-5 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/20 text-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                  <ShieldCheck size={18} className="text-[#2563EB]" />
                  <span>Legitimate Airline PNR Guarantee</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your ticket itinerary will be generated via real airline CRS/GDS systems. When immigration officers check the 6-character PNR code on Emirates, Qatar, Lufthansa, or Singapore Airlines portals, your active booking will show valid status.
                </p>
              </div>

              {/* Form placeholder */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                  <Plane size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#082B61]">Itinerary Details Form</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Travel route selection, dates, and passenger passport entry fields will be rendered here in the upcoming release.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/dummy-tickets')}
                  className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Return to Dummy Tickets
                </button>

                <button
                  type="button"
                  disabled
                  className="px-6 py-2.5 rounded-full bg-[#2563EB]/40 text-white text-xs font-bold cursor-not-allowed"
                >
                  Form Under Active Development
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
