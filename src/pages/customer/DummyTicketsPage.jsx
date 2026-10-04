import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  ShieldCheck,
  FileText,
  Search,
  ChevronDown,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { dummyTicketService, authService } from '../../services';

const DEFAULT_PACKAGES = [
  {
    _id: 'round-trip',
    id: 'round-trip',
    slug: 'round-trip',
    title: 'Round Trip Flight Reservation',
    shortDescription: 'Verifiable round-trip airline ticket with live 6-digit PNR for visa submission.',
    description: 'Genuine airline booking reservation with active PNR verifiable on airline portals. Valid for Schengen, UK, US, Canada, UAE, Japan and all global embassies.',
    price: 499,
    currency: 'INR',
    type: 'Round Trip / Return',
    deliveryTime: '10–30 Minutes',
    validity: '14–21 Days Validity',
    popular: true,
    features: [
      'Official IATA e-ticket with live 6-digit PNR',
      'Verifiable on the official airline website',
      '100% Embassy & VFS / BLS / TLS compliant',
      'Instant PDF delivered via Email & WhatsApp',
      'Free itinerary date adjustment if appointment is rescheduled'
    ]
  },
  {
    _id: 'one-way',
    id: 'one-way',
    slug: 'one-way',
    title: 'One-Way / Onward Flight Proof',
    shortDescription: 'Single journey or proof of onward travel for immigration and border clearance.',
    description: 'Official airline flight reservation for visa applications, entry clearance, or onward journey requirements without purchasing full non-refundable tickets.',
    price: 349,
    currency: 'INR',
    type: 'One Way / Onward',
    deliveryTime: '10–30 Minutes',
    validity: '14 Days Validity',
    popular: false,
    features: [
      'Official 6-digit airline confirmation code',
      'Verifiable on airline manage-booking portals',
      'Accepted by airlines & immigration border control',
      'Fast delivery in PDF format'
    ]
  },
  {
    _id: 'multi-city',
    id: 'multi-city',
    slug: 'multi-city',
    title: 'Multi-City / Complex Itinerary',
    shortDescription: 'Multi-leg flight reservations connecting multiple destinations across your tour.',
    description: 'Designed for European multi-country Schengen tours, US road trips, or multi-stop holidays requiring complete interconnected flight reservations.',
    price: 899,
    currency: 'INR',
    type: 'Multi-City (Up to 4 Flights)',
    deliveryTime: '30–60 Minutes',
    validity: '21 Days Validity',
    popular: false,
    features: [
      'Covers up to 4 connecting or regional flights',
      'All individual PNRs verifiable on airline websites',
      'Matches your custom day-by-day travel itinerary',
      'Priority consulate support assistance'
    ]
  }
];

const FAQS = [
  {
    q: 'What is a flight reservation for a visa application?',
    a: 'A flight reservation (also known as a dummy flight ticket or flight itinerary) is a genuine, temporary flight booking with a verifiable 6-digit PNR issued by an airline. Embassies and consulates require proof of your travel plans without requiring you to purchase an expensive, non-refundable ticket prior to visa approval.'
  },
  {
    q: 'Can I verify this flight reservation on the airline website?',
    a: 'Yes! Every flight reservation generated through NimuFly comes with an official 6-digit PNR (Passenger Name Record). You can go directly to the airline website (such as Emirates, Qatar Airways, Lufthansa, Singapore Airlines, etc.) and view your booking under the "Manage Booking" section.'
  },
  {
    q: 'Will the embassy or VFS accept this reservation?',
    a: 'Absolutely. Embassies worldwide explicitly advise applicants not to purchase non-refundable airline tickets before visa issuance. Our flight reservations comply with all official consulate, VFS Global, BLS, and TLS requirements.'
  },
  {
    q: 'How fast will I receive my flight reservation PDF?',
    a: 'Most flight reservations are processed and delivered within 10 to 30 minutes during business hours. The official booking PDF is delivered directly to your registered email and WhatsApp number.'
  },
  {
    q: 'What happens if my visa appointment is postponed?',
    a: 'If your embassy appointment date changes or is delayed, our support team can adjust your flight reservation dates at no additional cost.'
  }
];

export default function DummyTicketsPage() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadPackages() {
      setIsLoading(true);
      try {
        const data = await dummyTicketService.getAllServices({ status: 'ACTIVE' });
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setPackages(data);
          } else {
            setPackages(DEFAULT_PACKAGES);
          }
        }
      } catch (err) {
        console.warn('Failed to load dummy ticket services from API, using default catalog:', err);
        if (isMounted) {
          setPackages(DEFAULT_PACKAGES);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayPackages = (packages && packages.length > 0 ? packages : DEFAULT_PACKAGES).filter((pkg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pkg.title?.toLowerCase().includes(q) ||
      pkg.name?.toLowerCase().includes(q) ||
      pkg.description?.toLowerCase().includes(q) ||
      pkg.shortDescription?.toLowerCase().includes(q)
    );
  });

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="bg-white min-h-screen text-[#0F172A] pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F9FF] to-white border-b border-slate-100 pt-7 pb-10 sm:pb-14">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
            <Link to="/" className="hover:text-[#2563EB] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#082B61] font-bold">Flight Reservations (Dummy Tickets)</span>
          </div>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100 text-xs font-bold">
              <Plane size={14} className="text-[#2563EB]" />
              <span>Verifiable PNR Airline Reservations</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#082B61] tracking-tight leading-tight">
              Flight Reservations for <span className="text-[#2563EB]">Visa Applications</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-2xl">
              Embassy-compliant flight reservations with live 6-digit PNR verifiable directly on the airline website. Apply for your visa confidently without risking non-refundable ticket purchases.
            </p>

            {/* Quick trust metrics */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>100% Embassy & VFS Accepted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Live 6-Digit Verifiable PNR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-[#2563EB] flex-shrink-0" />
                <span>10–30 Min Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATALOG / PACKAGES SECTION */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-10 sm:pt-14">
        {/* Section Heading & Search */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              Select Your Reservation Package
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Choose the flight reservation type that matches your travel itinerary.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flight packages..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition-all bg-white"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#2563EB]" />
          </div>
        ) : displayPackages.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-semibold">
            No flight reservation packages found matching "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayPackages.map((ticket) => {
              const isPopular = ticket.popular || ticket.isPopular;
              const slugOrId = ticket.slug || ticket.id || ticket._id;
              const features = Array.isArray(ticket.features) && ticket.features.length > 0
                ? ticket.features
                : [
                    'Official IATA airline booking with live PNR',
                    'Verifiable directly on the official airline website',
                    '100% Embassy & Consulate compliant',
                    'Instant PDF delivery via Email & WhatsApp'
                  ];

              return (
                <div
                  key={ticket._id || ticket.id}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 border ${
                    isPopular
                      ? 'bg-white border-[#2563EB] shadow-md ring-2 ring-[#2563EB]/15'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-6">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                        <Sparkles size={11} />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                        <Plane size={20} />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                        <CheckCircle2 size={12} />
                        <span>Live PNR</span>
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-[#082B61] tracking-tight mb-2">
                      {ticket.title || ticket.name}
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed mb-5">
                      {ticket.shortDescription || ticket.description || 'Embassy compliant airline booking reservation with verifiable PNR.'}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 pb-4 mb-4 border-b border-slate-100">
                      <span className="text-2xl sm:text-3xl font-black text-[#082B61]">
                        ₹{ticket.price ? ticket.price.toLocaleString('en-IN') : 499}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">/ applicant</span>
                    </div>

                    {/* Delivery & Validity Specs */}
                    <div className="space-y-2 mb-5 text-xs font-semibold text-slate-600 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Delivery:</span>
                        <span className="flex items-center gap-1 text-[#082B61] font-bold">
                          <Clock size={12} className="text-[#2563EB]" />
                          <span>{ticket.deliveryTime || '10–30 Minutes'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Validity:</span>
                        <span className="flex items-center gap-1 text-[#082B61] font-bold">
                          <Calendar size={12} className="text-[#2563EB]" />
                          <span>{ticket.validity || '14–21 Days'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-2.5 mb-6 text-xs text-slate-600">
                      {features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check size={14} strokeWidth={3} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Booking CTA */}
                  <div className="pt-2">
                    <Link
                      to={`/dummy-tickets/${encodeURIComponent(slugOrId)}/apply`}
                      className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                        isPopular
                          ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md hover:shadow-lg'
                          : 'bg-[#082B61] hover:bg-[#0c397e] text-white hover:shadow-md'
                      }`}
                    >
                      <span>Book Flight Reservation</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-16 sm:pt-20">
        <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-3xl p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Simple 3-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              How to Get Your Flight Reservation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Obtain your embassy-compliant flight itinerary in minutes without hassle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#082B61]">Select Route & Dates</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your departure city, destination, and travel dates matching your planned trip or visa appointment schedule.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#082B61]">Enter Passenger Details</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide passenger names as printed on passports so the official PNR reservation is issued accurately in the airline system.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-[#082B61]">Receive Verifiable PDF</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive your official airline itinerary with live 6-digit PNR via Email & WhatsApp within 10 to 30 minutes, ready for submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY EMBASSIES REQUIRE FLIGHT RESERVATIONS */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-16 sm:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Consulate Safe Travel Advice
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              Why Embassies Recommend Flight Reservations
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Visa applications take days or weeks to process, and approval is never 100% guaranteed. Buying full-fare, non-refundable flight tickets before your visa is granted creates unnecessary financial risk.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Most embassies, including Schengen member states, the UK, the US, and Canada, explicitly instruct visa applicants to provide a <strong>verifiable flight reservation or itinerary</strong> rather than purchasing actual tickets.
            </p>
            <div className="pt-2">
              <Link
                to="/dummy-tickets/apply"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Book a Flight Reservation Now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <ShieldCheck size={24} className="text-[#2563EB]" />
              <h4 className="text-sm font-bold text-[#082B61]">Zero Cancellation Risk</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Save thousands of rupees. You only pay the nominal reservation fee instead of non-refundable flight tickets.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <CheckCircle2 size={24} className="text-emerald-600" />
              <h4 className="text-sm font-bold text-[#082B61]">Airline Website Verifiable</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visa officers can easily verify your 6-digit PNR directly on the airline portal during background inspection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <FileText size={24} className="text-[#2563EB]" />
              <h4 className="text-sm font-bold text-[#082B61]">Official IATA Format</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Formatted with flight numbers, terminal, baggage allowance, and passenger ticket information.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <Clock size={24} className="text-[#2563EB]" />
              <h4 className="text-sm font-bold text-[#082B61]">Fast 10–30 Min Turnaround</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Urgent embassy appointment tomorrow morning? Receive your reservation in your inbox promptly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-16 sm:pt-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Everything you need to know about flight reservations for your visa application.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-xs sm:text-sm text-[#082B61] hover:text-[#2563EB] transition-colors cursor-pointer select-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
