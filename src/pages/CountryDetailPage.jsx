import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileText,
  CheckCircle2,
  Calendar,
  Users,
  ChevronDown,
  Star,
  Check,
  X,
  Sparkles,
  Info,
  Building2,
  FileCheck2,
  Send,
  HelpCircle,
  Zap,
  Lock,
  Compass,
  User,
  Loader2
} from 'lucide-react';
import { visaService } from '../services';

export default function CountryDetailPage() {
  const { country: countryParam } = useParams();
  const navigate = useNavigate();
  const [destination, setDestination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeTab, setActiveTab] = useState('visa-info');
  const [travellerCount, setTravellerCount] = useState(1);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  // Pricing card ref and upper sticky nav CTA visibility state
  const pricingCardRef = useRef(null);
  const [showStickyNavApply, setShowStickyNavApply] = useState(false);

  // Interactive Application Flow Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicantForm, setApplicantForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    passportNumber: '',
    travelDate: ''
  });

  // Load destination from visaService
  useEffect(() => {
    let isMounted = true;
    async function loadVisaData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await visaService.getVisaById(countryParam);
        if (isMounted) {
          setDestination(data);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError('Failed to load visa details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadVisaData();
    return () => { isMounted = false; };
  }, [countryParam]);

  // Parse numerical fee
  const baseFeeNum = destination?.fees || destination?.price
    ? parseInt((destination.fees || destination.price).replace(/[^0-9]/g, ''), 10) || 2990
    : 2990;

  const totalFee = baseFeeNum * travellerCount;

  // Nav tabs definition
  const navTabs = [
    { id: 'visa-info', label: 'Visa Info' },
    { id: 'documents', label: 'Documents' },
    { id: 'visa-process', label: 'Visa Process' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'faqs', label: 'FAQs' }
  ];

  // Scroll spy with bidirectional tracking & pricing card visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160; // Offset for header + sticky subnav
      const sectionIds = ['visa-info', 'documents', 'visa-process', 'reviews', 'faqs'];

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveTab(id);
            break;
          }
        }
      }

      // Check if the normal right-side pricing card has scrolled up out of view
      if (pricingCardRef.current) {
        const rect = pricingCardRef.current.getBoundingClientRect();
        // When bottom of pricing card is above 120px, it has left the viewport
        const isPast = rect.bottom < 120;
        setShowStickyNavApply(isPast);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -140; // Accounts for sticky header (~76px) + subnav (~56px) + spacing
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveTab(id);
    }
  };

  const handleApplyClick = () => {
    if (destination) {
      navigate(`/visa/${destination.id}/apply?travellers=${travellerCount}`, {
        state: { travellerCount }
      });
    }
  };

  const handleModalClose = () => {
    setIsApplyModalOpen(false);
    setIsSubmitted(false);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
        <p className="text-sm font-bold text-[#082B61]">Loading visa details...</p>
      </div>
    );
  }

  if (!destination || loadError) {
    return (
      <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-extrabold text-[#123B7A]">Destination Not Found</h2>
        <p className="text-base text-[#64748B] mt-2 mb-6">
          We couldn't locate visa details for "{countryParam}".
        </p>
        <Link
          to="/visa"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] text-white text-sm font-bold shadow-md hover:bg-[#123B7A] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Browse All Visa Destinations</span>
        </Link>
      </div>
    );
  }

  const {
    displayName,
    country,
    flagUrl,
    flagEmoji,
    image,
    visaType = 'E-Visa',
    validity = '90 Days',
    stayPeriod = '60 Days',
    entryType = 'Single Entry',
    processingTime = '3–5 Days',
    guaranteedDate = '24 Sep 2026, 4:00 PM',
    shortDescription,
    documentsRequired = [],
    faqs = []
  } = destination;

  // Curated review items
  const reviewsData = [
    {
      name: 'Rohan Sharma',
      location: 'Mumbai',
      rating: 5,
      date: '3 days ago',
      comment: `Incredible experience applying for my ${displayName} visa. Approved 8 hours earlier than the expected delivery time! The smooth process gives total peace of mind.`
    },
    {
      name: 'Priyanka Verma',
      location: 'Bengaluru',
      rating: 5,
      date: '1 week ago',
      comment: `Zero paperwork hassles. Took photo of my passport on my phone, Mr Visa team formatted everything cleanly. Received official e-visa promptly!`
    },
    {
      name: 'Anand Patel',
      location: 'Ahmedabad',
      rating: 5,
      date: '2 weeks ago',
      comment: `Clear communication, real-time WhatsApp updates, and transparent pricing. Best visa platform in India by far.`
    }
  ];

  // Combined FAQs
  const allFaqs = [
    ...faqs,
    {
      q: `What is the delivery timeline for ${displayName}?`,
      a: `Your visa is expected on or before ${guaranteedDate}. We monitor consular queues in real time and expedite processing immediately upon document submission.`
    },
    {
      q: 'Do I need to visit any embassy or physical visa center?',
      a: 'No! The entire process is 100% digital online. You can complete your application in under 3 minutes directly from your mobile phone or computer.'
    }
  ];

  const docCount = documentsRequired.length > 0 ? documentsRequired.length : 1;

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] selection:bg-[#2563EB]/15 selection:text-[#123B7A]">
      
      {/* TOP COMPACT HERO BANNER */}
      <section className="bg-white border-b border-slate-100 pt-6 pb-8 lg:pt-8 lg:pb-10">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-5">
            <Link to="/" className="hover:text-[#2563EB] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/visa" className="hover:text-[#2563EB] transition-colors">Visas</Link>
            <span>/</span>
            <span className="text-[#123B7A] font-bold">{displayName}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-slate-50">
                  {flagUrl ? (
                    <img src={flagUrl} alt={`${displayName} flag`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl leading-none">{flagEmoji}</span>
                  )}
                </div>
                <span className="text-xs font-extrabold tracking-[0.2em] text-[#2563EB] uppercase">
                  {country || displayName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                  <CheckCircle2 size={12} />
                  100% Online
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#082B61] tracking-tight leading-[1.15]">
                Apply for {displayName} Visa
              </h1>

              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                {shortDescription || `Quick, verified electronic visa for travelers. Fast verification and direct consular tracking.`}
              </p>

              {/* Immediate Hero Action Row */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleApplyClick}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] hover:bg-[#082B61] text-white text-sm font-extrabold shadow-md shadow-[#2563EB]/25 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <span>Apply Now</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 1. STICKY VISA DETAILS NAVIGATION WITH TRANSITIONING START APPLICATION CTA */}
      <nav 
        aria-label="Visa Details Sections"
        className="sticky top-[74px] lg:top-[76px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
          
          {/* Centered/Left Navigation Tabs */}
          <div className="flex items-center overflow-x-auto no-scrollbar gap-2 sm:gap-6 md:gap-8 lg:gap-10 py-1">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToSection(tab.id)}
                  className={`relative py-3.5 px-2.5 sm:px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-[#2563EB]'
                      : 'text-slate-600 hover:text-[#082B61]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2563EB] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Prominent "Start Application" CTA that transitions in when pricing card scrolls past */}
          <div
            className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-out py-1.5 ${
              showStickyNavApply
                ? 'max-w-[210px] opacity-100 translate-x-0'
                : 'max-w-0 opacity-0 translate-x-4 pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={handleApplyClick}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#082B61] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 hover:shadow-lg transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 group"
            >
              <span>Start Application</span>
              <ArrowRight size={14} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </nav>

      {/* MAIN CONTENT AREA: TWO COLUMNS (Content Sections + Sticky Sidebar) */}
      <div className="max-w-[1360px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: SCROLLABLE SECTIONS (8 cols on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-16 sm:space-y-20">
            
            {/* SUCCESS NOTIFICATION IF TRIGGERED */}
            {appliedSuccess && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold">Application Draft Initialized!</div>
                    <div className="text-xs text-emerald-700">Please prepare your passport copy for {displayName}.</div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 1: VISA INFO */}
            <section id="visa-info" className="scroll-mt-36 transition-all duration-300">
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                  Visa Information
                </h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                  A 100% online visa application process
                </p>
              </div>

              {/* 3 Clean Minimal Rounded Cards: Length of Stay, Validity, Entry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6">
                
                {/* Card 1: Length of Stay */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center mb-4">
                    <Clock size={20} strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Length of Stay
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#082B61] mt-1 block">
                    {stayPeriod}
                  </span>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">
                    Per entry into {displayName}
                  </span>
                </div>

                {/* Card 2: Validity */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center mb-4">
                    <Calendar size={20} strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Validity
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#082B61] mt-1 block">
                    {validity}
                  </span>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">
                    From date of visa grant
                  </span>
                </div>

                {/* Card 3: Entry */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center mb-4">
                    <Compass size={20} strokeWidth={2.2} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Entry Type
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#082B61] mt-1 block">
                    {entryType}
                  </span>
                  <span className="text-xs text-slate-500 font-medium mt-1 block">
                    Standard tourist permit
                  </span>
                </div>

              </div>

              {/* Quick Inline Apply CTA Banner for Visa Info Section */}
              <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/25 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#082B61]">
                      Ready to apply for your {displayName} Visa?
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      Fast online application • Settle fees only after visa is approved
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#082B61] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <span>Apply Now</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              </div>

              {/* Destination Photo & Quick Highlight */}
              <div className="rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm relative h-64 sm:h-80 bg-slate-100">
                <img
                  src={image}
                  alt={`${displayName} scenic`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
                    <Sparkles size={13} className="text-amber-300" />
                    Official Government Approved Portal
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">
                    Explore {displayName} Hassle-Free
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-lg">
                    Submit your documents online with fast digital verification and tracking.
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 2: DOCUMENTS */}
            <section id="documents" className="scroll-mt-36 transition-all duration-300">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                    {docCount === 1 ? 'Only 1 document required' : `Only ${docCount} documents required`}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                    Fast, streamlined verification with zero physical embassy visits
                  </p>
                </div>

                {/* Estimated Time Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-xs font-extrabold flex-shrink-0">
                  <Zap size={14} className="fill-[#2563EB]" />
                  <span>~3–5 mins application time</span>
                </div>
              </div>

              {/* Documents Grid / Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {documentsRequired.map((doc, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center font-bold">
                          <FileText size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/50">
                          Digital Scan Only
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#082B61]">
                        {doc.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                        {doc.detail}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CheckCircle2 size={14} className="text-[#2563EB]" />
                      <span>Clear photo or color scan via phone camera</span>
                    </div>
                  </div>
                ))}

                {/* Always show helper card for simple photo/document scan */}
                {documentsRequired.length < 2 && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center font-bold">
                          <FileCheck2 size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/50">
                          Smart Verification
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#082B61]">
                        Digital Photograph
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                        Recent front-facing portrait photo with clear neutral background. You can even take a selfie and our AI will format it.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CheckCircle2 size={14} className="text-[#2563EB]" />
                      <span>Automatic white background adjustment included</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Preparation Tips */}
              <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3 text-xs text-slate-600">
                <Info size={18} className="text-[#2563EB] flex-shrink-0" />
                <span>
                  <strong>Tip:</strong> No physical photocopies, no couriers, and no notary required. We handle complete consular formatting.
                </span>
              </div>
            </section>

            {/* SECTION 3: VISA PROCESS */}
            <section id="visa-process" className="scroll-mt-36 transition-all duration-300">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                  Visa Process
                </h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                  Step-by-step transparent journey from application to approval
                </p>
              </div>

              {/* 4-Step Interactive Horizontal / Vertical Visual Journey */}
              <div className="relative">
                {/* Connecting Line on Desktop */}
                <div className="hidden md:block absolute top-12 left-10 right-10 h-[2px] bg-slate-200 z-0" />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                  
                  {/* Step 1 */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F9FF] text-[#2563EB] border-2 border-white shadow-sm flex items-center justify-center font-black text-sm mb-4">
                        1
                      </div>
                      <h3 className="text-base font-bold text-[#082B61]">
                        Submit Documents
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                        Fill traveler passport details and snap quick photos of required papers in under 3 mins.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563EB]">
                      3 minutes
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F9FF] text-[#2563EB] border-2 border-white shadow-sm flex items-center justify-center font-black text-sm mb-4">
                        2
                      </div>
                      <h3 className="text-base font-bold text-[#082B61]">
                        Application Review
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                        Mr Visa experts verify details against immigration requirements to guarantee zero rejection.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563EB]">
                      Under 2 hours
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F9FF] text-[#2563EB] border-2 border-white shadow-sm flex items-center justify-center font-black text-sm mb-4">
                        3
                      </div>
                      <h3 className="text-base font-bold text-[#082B61]">
                        Embassy Processing
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                        Direct submission to the official {displayName} government portal with expedited priority queue.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-[#2563EB]">
                      {processingTime}
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[#F5F9FF] rounded-2xl p-5 border border-[#2563EB]/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white shadow-md flex items-center justify-center font-black text-sm mb-4">
                        <Check size={20} strokeWidth={3} />
                      </div>
                      <h3 className="text-base font-bold text-[#082B61]">
                        Visa Approved!
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                        Official e-visa delivered straight to your email & WhatsApp ready for departure.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2563EB]/20 text-[11px] font-black text-[#2563EB] uppercase tracking-wider">
                      Instant Download
                    </div>
                  </div>

                </div>
              </div>

              {/* 6. GUARANTEE / DELIVERY SECTION */}
              <div className="mt-10 rounded-3xl bg-gradient-to-br from-[#082B61] to-[#123B7A] text-white p-7 sm:p-9 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-[#2563EB]/30 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-white mb-4">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Mr Visa On-Time Commitment</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
                    Get your visa on or before <span className="text-[#60A5FA]">{guaranteedDate}</span>
                  </h3>

                  <p className="text-sm text-slate-200 mt-2 font-medium leading-relaxed">
                    Know exactly when your visa is expected before you apply. Reliable processing backed by direct consulate coordination.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Live 24/7 Tracking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Verified Document Review</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Instant Digital Download</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. TRUST & COMPARISON SECTION */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
              <div className="mb-6">
                <span className="text-xs font-extrabold text-[#2563EB] tracking-widest uppercase block mb-1">
                  Why Mr Visa
                </span>
                <h3 className="text-2xl font-black text-[#082B61] tracking-tight">
                  Why 100,000+ travelers trust Mr Visa
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  See how we compare to traditional travel agents and offline visa centers
                </p>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-4 font-bold text-slate-500">Feature</th>
                      <th className="py-3 px-4 font-extrabold text-[#2563EB] bg-[#F5F9FF] rounded-t-xl">
                        Mr Visa
                      </th>
                      <th className="py-3 px-4 font-bold text-slate-500">Traditional Agents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">Pricing & Fees</td>
                      <td className="py-3.5 px-4 font-bold text-[#082B61] bg-[#F5F9FF]">
                        Transparent, all-inclusive
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        Hidden extra charges
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">Visa Tracking</td>
                      <td className="py-3.5 px-4 font-bold text-[#082B61] bg-[#F5F9FF]">
                        Real-time 24/7 WhatsApp & SMS
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        Manual phone calls & delays
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">Processing Timeline</td>
                      <td className="py-3.5 px-4 font-bold text-[#082B61] bg-[#F5F9FF]">
                        Guaranteed date & exact hour
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        Vague "few days to weeks"
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-[#082B61]">Application Method</td>
                      <td className="py-3.5 px-4 font-bold text-[#082B61] bg-[#F5F9FF] rounded-b-xl">
                        100% online from phone in 3 mins
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        Physical forms, couriers & visits
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTION 4: REVIEWS */}
            <section id="reviews" className="scroll-mt-36 transition-all duration-300">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                    Traveler Reviews
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    What verified travelers say about our {displayName} visa service
                  </p>
                </div>

                {/* Score badge */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200/90 shadow-sm flex-shrink-0">
                  <div className="text-2xl font-black text-[#082B61]">4.9</div>
                  <div>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className="fill-amber-400" />
                      ))}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      1,840+ verified ratings
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {reviewsData.map((review, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex text-amber-400">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} size={13} className="fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {review.date}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#082B61]">
                          {review.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {review.location}
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 5: FAQS */}
            <section id="faqs" className="scroll-mt-36 transition-all duration-300">
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Everything you need to know about applying for a {displayName} visa
                </p>
              </div>

              <div className="space-y-3">
                {allFaqs.map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                        className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#082B61] hover:text-[#2563EB] transition-colors cursor-pointer"
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
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: APPLICATION / PAYMENT PANEL (Normal page content flow) */}
          <aside ref={pricingCardRef} className="lg:col-span-5 xl:col-span-4 space-y-5">
            
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-[0_8px_30px_rgba(8,43,97,0.06)]">
              
              {/* Delivery Schedule Pill */}
              <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/25 mb-6 flex items-start gap-3">
                <Clock size={18} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Expected Delivery
                  </div>
                  <div className="text-sm font-black text-[#082B61]">
                    On or before {guaranteedDate}
                  </div>
                </div>
              </div>

              {/* Destination & Visa Type Header in Card */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-5">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Destination
                  </span>
                  <span className="text-lg font-black text-[#082B61]">
                    {displayName} {visaType}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Duration
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {stayPeriod}
                  </span>
                </div>
              </div>

              {/* Traveller Counter */}
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Number of Travellers
                </label>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Users size={16} className="text-[#2563EB]" />
                    <span>{travellerCount} {travellerCount === 1 ? 'Adult Traveller' : 'Adult Travellers'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTravellerCount(Math.max(1, travellerCount - 1))}
                      disabled={travellerCount <= 1}
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-base hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-black text-[#082B61] text-sm">
                      {travellerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravellerCount(Math.min(10, travellerCount + 1))}
                      disabled={travellerCount >= 10}
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-base hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pb-5 border-b border-slate-100 text-xs font-medium text-slate-600 mb-5">
                <div className="flex items-center justify-between">
                  <span>Visa & Application Fee ({travellerCount}x)</span>
                  <span className="font-bold text-[#082B61]">₹{totalFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Embassy Document Verification</span>
                  <span className="font-bold text-emerald-600">Included (₹0)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mr Visa Priority Assistance</span>
                  <span className="font-bold text-emerald-600">Included</span>
                </div>
                <div className="pt-2 flex items-center justify-between text-sm font-extrabold text-[#082B61]">
                  <span>Total Payable</span>
                  <span className="text-xl font-black text-[#2563EB]">₹{totalFee.toLocaleString('en-IN')}</span>
                </div>
              </div>



              {/* CTA Button */}
              <button
                type="button"
                onClick={handleApplyClick}
                className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#082B61] text-white font-extrabold text-base shadow-lg shadow-[#2563EB]/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Start Application</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 text-center">
                <Lock size={12} className="text-slate-400" />
                <span>256-bit Bank Grade Encrypted Application</span>
              </div>

            </div>

            {/* Support Callout */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F5F9FF] text-[#2563EB] flex items-center justify-center flex-shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#082B61]">
                  Need guidance with {displayName}?
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Our immigration experts are online 24/7 to assist.
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>

      {/* INTERACTIVE EXPRESS APPLICATION MODAL FLOW */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#082B61] to-[#123B7A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30 shadow-sm flex items-center justify-center bg-white/10 flex-shrink-0">
                  {flagUrl ? (
                    <img src={flagUrl} alt={`${displayName} flag`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg leading-none">{flagEmoji}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                    Express Visa Application
                  </div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {displayName} {visaType}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!isSubmitted ? (
                <form onSubmit={handleModalSubmit} className="space-y-4">


                  {/* Number of Travellers in Modal */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">
                      Number of Travellers
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-extrabold text-[#082B61]">
                        {travellerCount} {travellerCount === 1 ? 'Adult Traveller' : 'Adult Travellers'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTravellerCount(Math.max(1, travellerCount - 1))}
                          disabled={travellerCount <= 1}
                          className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-100 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{travellerCount}</span>
                        <button
                          type="button"
                          onClick={() => setTravellerCount(Math.min(10, travellerCount + 1))}
                          disabled={travellerCount >= 10}
                          className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-100 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Primary Traveler Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">
                      Primary Traveler Full Name (as on Passport) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={applicantForm.fullName}
                      onChange={(e) => setApplicantForm({ ...applicantForm, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  {/* Contact Grid: Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        WhatsApp / Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={applicantForm.phone}
                        onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="rahul@example.com"
                        value={applicantForm.email}
                        onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  {/* Passport & Travel Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Z1234567"
                        value={applicantForm.passportNumber}
                        onChange={(e) => setApplicantForm({ ...applicantForm, passportNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Intended Travel Date
                      </label>
                      <input
                        type="date"
                        value={applicantForm.travelDate}
                        onChange={(e) => setApplicantForm({ ...applicantForm, travelDate: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-500">Guaranteed Delivery:</span>{' '}
                      <span className="font-black text-[#082B61]">{guaranteedDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-500">Total Fee:</span>{' '}
                      <span className="font-black text-[#2563EB]">₹{totalFee.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#2563EB] hover:bg-[#082B61] text-white font-extrabold text-sm shadow-md shadow-[#2563EB]/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Submit Application</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </button>

                  <div className="text-center text-[11px] text-slate-500 font-medium">
                    🔒 Certified safe & confidential. Official government facilitation.
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={36} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold mb-2 border border-emerald-200/60">
                      Application Submitted Successfully
                    </span>
                    <h4 className="text-2xl font-black text-[#082B61]">
                      You're all set!
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-md mx-auto leading-relaxed">
                      Our visa team has received your application for <strong>{displayName}</strong>. We will review your documents and verify everything against embassy guidelines.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-sm mx-auto space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Application Reference:</span>
                      <span className="font-mono font-bold text-[#082B61]">MRV-{displayName.slice(0, 3).toUpperCase()}-2026-9812</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expected Approval:</span>
                      <span className="font-bold text-[#2563EB]">{guaranteedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Service Status:</span>
                      <span className="font-bold text-[#082B61]">Document Review Pending</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-8 py-3 rounded-full bg-[#2563EB] text-white text-xs sm:text-sm font-extrabold hover:bg-[#082B61] transition-colors cursor-pointer"
                    >
                      Done & Return to Page
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
