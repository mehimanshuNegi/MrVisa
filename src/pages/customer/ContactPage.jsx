import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  MessageSquare,
  FileText,
  Clock,
  Plane,
  X
} from 'lucide-react';
import { countryService } from '../../services';
import { SUPPORT_CONFIG } from '../../constants/contactConfig';

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const shouldOpenAsk = searchParams.get('ask') === 'true';

  const [searchCountries, setSearchCountries] = useState(() => countryService.getSearchCountries() || ['Georgia']);
  const [showForm, setShowForm] = useState(shouldOpenAsk);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    countryService.getAllCountries().then((cList) => {
      if (isMounted && Array.isArray(cList) && cList.length > 0) {
        const activeNames = cList
          .filter((c) => c.status === 'ACTIVE' || c.isActive !== false)
          .map((c) => c.displayName || c.name)
          .filter(Boolean);
        if (activeNames.length > 0) {
          setSearchCountries(Array.from(new Set(activeNames)));
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'Georgia',
    message: ''
  });

  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    if (shouldOpenAsk) {
      setShowForm(true);
    }
  }, [shouldOpenAsk]);

  const faqs = [
    {
      q: "How does NimuFly process my visa application?",
      a: "Our experienced visa specialists rigorously verify your documents against current consulate regulations, format submissions to exact embassy standards, and track your application in real-time through official channels until delivery."
    },
    {
      q: "How early before my travel date should I submit my application?",
      a: "We generally advise applying 2 to 4 weeks prior to your planned departure. For urgent cases, many e-visa destinations (such as Georgia, Egypt, and Bahrain) can be processed via fast-track in 2 to 4 business days."
    },
    {
      q: "What happens if my documents need correction or updating?",
      a: "Before submitting any application to government consulates, our senior document specialists rigorously verify every bank statement, passport scan, and photo. If any adjustment is required, we notify you immediately to prevent delays."
    },
    {
      q: "Are visa approvals issued directly by official embassies?",
      a: "Yes, 100%. NimuFly is an accredited visa facilitation agency. All issued e-visas and stamp approvals originate straight from the respective country's Ministry of Foreign Affairs and Immigration Directorate."
    },
    {
      q: "Can I apply for group or family visas simultaneously?",
      a: "Absolutely. Our platform supports grouped applications, allowing families, corporate teams, and travel groups to submit cohesive itineraries with synchronized approvals."
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const handleResetForm = () => {
    setFormSubmitted(false);
    setShowForm(false);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      country: 'Georgia',
      message: ''
    });
  };

  return (
    <div className="bg-white min-h-screen text-[#0F172A] pb-20">
      {/* 1. COMPACT HERO SECTION MATCHING IMAGE 3 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F9FF] to-white border-b border-slate-100 pt-8 pb-8 sm:pb-10">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7">
              <p className="text-xs font-black tracking-[0.2em] text-[#1479F5] uppercase mb-2.5">
                WE'RE HERE TO HELP
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B2A63] tracking-tight leading-[1.15]">
                How can we help?
              </h1>
              <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 leading-relaxed max-w-xl">
                Questions about your visa, documents, application, or travel plans? Our team is here to help.
              </p>
            </div>

            {/* Right Banner Image */}
            <div className="lg:col-span-5 hidden sm:flex justify-end">
              <div className="relative w-full max-w-[420px] h-[190px] rounded-2xl overflow-hidden shadow-md border border-slate-200/80">
                <img
                  src="/travel-support-hero.jpg"
                  alt="Travel support luggage and passport"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN TWO-COLUMN CONTACT SECTION MATCHING IMAGE 3 */}
      <section className="max-w-[1360px] mx-auto px-6 lg:px-12 pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT: Compact Contact Rows */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <h2 className="text-2xl font-black text-[#0B2A63] tracking-tight">
                Get in touch
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Choose the easiest way to reach us.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Phone Row */}
              {SUPPORT_CONFIG.phone ? (
                <a
                  href={`tel:${SUPPORT_CONFIG.phone.replace(/[^+\d]/g, '')}`}
                  className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#1479F5]/40 hover:shadow-sm transition-all duration-200 group cursor-pointer"
                  aria-label={`Call NimuFly support at ${SUPPORT_CONFIG.displayPhone}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1479F5] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      <Phone size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        PHONE SUPPORT
                      </span>
                      <span className="block text-base font-extrabold text-[#0B2A63] group-hover:text-[#1479F5] transition-colors">
                        {SUPPORT_CONFIG.displayPhone}
                      </span>
                      <span className="block text-xs text-slate-500 font-medium">
                        {SUPPORT_CONFIG.workingHours}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#1479F5] group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
                </a>
              ) : (
                <div className="flex items-center justify-between p-4.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                      <Phone size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        PHONE SUPPORT
                      </span>
                      <span className="block text-sm font-bold text-slate-600">
                        Available via Email Support
                      </span>
                      <span className="block text-xs text-slate-400 font-medium">
                        Direct telephone line is currently pending carrier allocation.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Row (Confirmed Business Channel) */}
              <a
                href={`mailto:${SUPPORT_CONFIG.email}`}
                className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#1479F5]/40 hover:shadow-sm transition-all duration-200 group cursor-pointer"
                aria-label={`Email NimuFly support at ${SUPPORT_CONFIG.email}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1479F5] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Mail size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      EMAIL INQUIRIES
                    </span>
                    <span className="block text-base font-extrabold text-[#0B2A63] group-hover:text-[#1479F5] transition-colors">
                      {SUPPORT_CONFIG.email}
                    </span>
                    <span className="block text-xs text-slate-500 font-medium">
                      {SUPPORT_CONFIG.workingHours} • Guaranteed response
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#1479F5] group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
              </a>

              {/* Office Row */}
              {SUPPORT_CONFIG.mapsUrl && SUPPORT_CONFIG.officeAddress ? (
                <a
                  href={SUPPORT_CONFIG.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#1479F5]/40 hover:shadow-sm transition-all duration-200 group cursor-pointer"
                  aria-label={`Open ${SUPPORT_CONFIG.officeName} in Google Maps`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1479F5] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      <MapPin size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        OFFICE LOCATION
                      </span>
                      <span className="block text-base font-extrabold text-[#0B2A63] group-hover:text-[#1479F5] transition-colors">
                        {SUPPORT_CONFIG.officeName}
                      </span>
                      <span className="block text-xs text-slate-500 font-medium">
                        {SUPPORT_CONFIG.officeAddress} (Open in Maps)
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#1479F5] group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
                </a>
              ) : (
                <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/90">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1479F5] flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <MapPin size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        GLOBAL ASSISTANCE
                      </span>
                      <span className="block text-base font-extrabold text-[#0B2A63]">
                        Online Visa Facilitation
                      </span>
                      <span className="block text-xs text-slate-500 font-medium">
                        In-person office visits by prior scheduling via email.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: "Have a Question?" Card */}
          <div className="lg:col-span-7">
            <div className="bg-[#F3F8FF] rounded-3xl p-7 sm:p-9 border border-blue-100/90 relative overflow-hidden shadow-xs">
              
              {/* Corner decorative bubble art matching Image 3 */}
              <div className="absolute top-6 right-6 hidden sm:block opacity-70 pointer-events-none">
                <div className="w-20 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare size={28} className="text-[#1479F5]" />
                </div>
              </div>

              {!showForm && !formSubmitted ? (
                /* DEFAULT STATE: MATCHING IMAGE 3 */
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-[#1479F5] border border-blue-200/60 flex items-center justify-center shadow-2xs">
                    <HelpCircle size={26} strokeWidth={2.2} />
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#0B2A63] tracking-tight">
                    Have a Question?
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-lg">
                    Tell us what you need help with. Whether it's visa requirements, documentation, application status, or travel plans — our team is here to guide you.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-[#1479F5] hover:bg-[#0B2A63] text-white font-bold text-sm shadow-md shadow-[#1479F5]/25 transition-all duration-200 cursor-pointer"
                    >
                      <span>Ask a Question</span>
                      <ArrowRight size={16} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : formSubmitted ? (
                /* SUBMITTED SUCCESS STATE */
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle2 size={30} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-black text-[#0B2A63]">
                    Thanks! We'll get back to you soon.
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto font-medium">
                    Your inquiry has been received. One of our dedicated visa specialists will reach out via email shortly.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-6 py-2.5 rounded-xl bg-white border border-blue-200 text-[#1479F5] text-xs font-bold hover:bg-[#1479F5] hover:text-white transition-colors cursor-pointer"
                    >
                      Ask Another Question
                    </button>
                  </div>
                </div>
              ) : (
                /* QUESTION FORM */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200/50">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0B2A63] tracking-tight">
                        Ask a Question
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Tell us what you need help with.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B2A63] hover:bg-white transition-colors cursor-pointer"
                      title="Close form"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. john@example.com"
                          className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. +1 234 567 8900"
                          className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>

                      {/* Destination Country */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1">
                          Destination Country
                        </label>
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors cursor-pointer"
                        >
                          {searchCountries.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Question / Message */}
                    <div>
                      <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1">
                        Your Question *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="What would you like assistance with?"
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        className="w-full h-11 bg-[#1479F5] hover:bg-[#0B2A63] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#1479F5]/25 transition-colors duration-200 cursor-pointer"
                      >
                        <span>Send Question</span>
                        <ArrowRight size={16} strokeWidth={2.4} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* 3. QUICK HELP STRIP MATCHING IMAGE 3 */}
        <div className="mt-14 pt-8 border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left title */}
            <div className="lg:col-span-3">
              <h3 className="text-xl font-black text-[#0B2A63]">Quick help</h3>
              <p className="text-xs text-slate-500 font-medium">Find answers to common queries.</p>
            </div>

            {/* Right 4 links */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/visa"
                className="flex items-center gap-2.5 text-xs font-bold text-[#1479F5] hover:text-[#0B2A63] transition-colors p-2 rounded-xl hover:bg-slate-50"
              >
                <FileText size={16} className="text-[#1479F5] flex-shrink-0" />
                <span>Visa requirements</span>
                <ArrowRight size={13} className="ml-auto" />
              </Link>

              <Link
                to="/my-account"
                className="flex items-center gap-2.5 text-xs font-bold text-[#1479F5] hover:text-[#0B2A63] transition-colors p-2 rounded-xl hover:bg-slate-50"
              >
                <Clock size={16} className="text-[#1479F5] flex-shrink-0" />
                <span>Application status</span>
                <ArrowRight size={13} className="ml-auto" />
              </Link>

              <Link
                to="/documentation"
                className="flex items-center gap-2.5 text-xs font-bold text-[#1479F5] hover:text-[#0B2A63] transition-colors p-2 rounded-xl hover:bg-slate-50"
              >
                <FileText size={16} className="text-[#1479F5] flex-shrink-0" />
                <span>Document support</span>
                <ArrowRight size={13} className="ml-auto" />
              </Link>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2.5 text-xs font-bold text-[#1479F5] hover:text-[#0B2A63] transition-colors p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-left"
              >
                <Plane size={16} className="text-[#1479F5] flex-shrink-0" />
                <span>Travel questions</span>
                <ArrowRight size={13} className="ml-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. FREQUENTLY ASKED QUESTIONS */}
        <section className="max-w-4xl mx-auto pt-14 pb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B2A63] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Everything you need to know about our visa verification and approval procedures
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-[#0B2A63] hover:text-[#1479F5] transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-[#1479F5] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </section>
    </div>
  );
}

