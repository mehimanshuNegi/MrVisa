import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ArrowRight, CheckCircle2, ChevronDown, HelpCircle, MessageSquare, X } from 'lucide-react';
import { countryService } from '../services';

const searchCountries = countryService.getSearchCountries();

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const shouldOpenAsk = searchParams.get('ask') === 'true';

  const [showForm, setShowForm] = useState(shouldOpenAsk);
  const [formSubmitted, setFormSubmitted] = useState(false);

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
    <div className="bg-white min-h-screen py-12 lg:py-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        
        {/* HERO SECTION */}
        <div className="max-w-3xl mb-14 lg:mb-18">
          <p className="text-xs font-bold tracking-[0.2em] text-[#1479F5] uppercase mb-3">
            CONTACT US
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0B2A63] tracking-tight leading-[1.15]">
            We're Here to Help
          </h1>
          <p className="text-lg text-[#64748B] font-medium mt-3">
            Have a question about your visa or application? Get in touch with our team.
          </p>
        </div>

        {/* TWO-COLUMN CONTACT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mb-20 lg:mb-28">
          
          {/* LEFT: Contact Information */}
          <div className="lg:col-span-5 space-y-7">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0B2A63] tracking-tight">
                Get in Touch Directly
              </h2>
              <p className="text-sm font-medium text-[#64748B] mt-2 leading-relaxed">
                Reach out to our global support desks via phone, email, or drop by our service office during regular hours.
              </p>
            </div>

            <div className="space-y-4">
              {/* Phone */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#F5F9FF] border border-[#1479F5]/15">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1479F5] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Phone size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Phone Support
                  </span>
                  <span className="block text-base font-bold text-[#0B2A63] mt-0.5">
                    +1 (800) 555-VISA
                  </span>
                  <span className="block text-xs text-[#64748B] mt-0.5">
                    Toll-free 24/7 emergency traveler hotline
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#F5F9FF] border border-[#1479F5]/15">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1479F5] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Email Inquiries
                  </span>
                  <span className="block text-base font-bold text-[#0B2A63] mt-0.5">
                    support@nimufly.com
                  </span>
                  <span className="block text-xs text-[#64748B] mt-0.5">
                    Guaranteed response within 2 hours
                  </span>
                </div>
              </div>

              {/* Office */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#F5F9FF] border border-[#1479F5]/15">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1479F5] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MapPin size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Main Office
                  </span>
                  <span className="block text-base font-bold text-[#0B2A63] mt-0.5">
                    NimuFly Global Hub, Suite 400
                  </span>
                  <span className="block text-xs text-[#64748B] mt-0.5">
                    42 Boulevard Financial Center, London & Dubai
                  </span>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-xl bg-white text-[#64748B] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Clock size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Operating Hours
                  </span>
                  <span className="block text-sm font-bold text-[#0B2A63] mt-0.5">
                    Monday – Saturday: 9:00 AM – 8:00 PM
                  </span>
                  <span className="block text-xs text-[#64748B] mt-0.5">
                    Sunday: Dedicated Emergency Line Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Highlighted "Have a Question?" Box / Contact CTA */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#1479F5]/30 shadow-[0_16px_45px_-10px_rgba(20,121,245,0.1)] relative overflow-hidden">
              
              {/* Subtle blue corner accent */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#1479F5]/5 rounded-bl-full pointer-events-none" />

              {!showForm && !formSubmitted ? (
                /* 1. HIGHLIGHTED QUERY BOX (Default State) */
                <div className="space-y-6 py-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F9FF] border border-[#1479F5]/25 flex items-center justify-center text-[#1479F5] shadow-sm">
                    <HelpCircle size={28} strokeWidth={2.2} />
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#1479F5] uppercase tracking-wider block mb-1">
                      Online Visa Inquiries
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B2A63] tracking-tight">
                      Have a Question?
                    </h2>
                  </div>

                  <p className="text-base sm:text-lg text-[#64748B] font-medium leading-relaxed max-w-lg">
                    Tell us what you need help with. Whether it's document requirements, processing times, or status checks, our team is ready to guide you.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#1479F5] hover:bg-[#0B2A63] text-white font-bold text-base shadow-lg shadow-[#1479F5]/20 transition-all duration-200 cursor-pointer"
                    >
                      <span>Ask a Question</span>
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : formSubmitted ? (
                /* 2. SUBMITTED SUCCESS STATE */
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A63]">
                    Thanks! We'll get back to you soon.
                  </h3>
                  <p className="text-sm sm:text-base text-[#64748B] max-w-md mx-auto font-medium">
                    Your inquiry has been received. One of our dedicated visa specialists will reach out via email within 2 hours.
                  </p>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-6 py-2.5 rounded-xl bg-[#F5F9FF] border border-[#1479F5]/25 text-[#1479F5] text-xs font-bold hover:bg-[#1479F5] hover:text-white transition-colors"
                    >
                      Ask Another Question
                    </button>
                  </div>
                </div>
              ) : (
                /* 3. EXPANDED FRONTEND-ONLY CONTACT / QUESTION FORM */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h2 className="text-2xl font-extrabold text-[#0B2A63] tracking-tight">
                        Ask a Question
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Tell us what you need help with.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B2A63] hover:bg-slate-100 transition-colors"
                      title="Close form"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1.5">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. john@example.com"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. +1 234 567 8900"
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors"
                        />
                      </div>

                      {/* Destination Country */}
                      <div>
                        <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1.5">
                          Destination Country
                        </label>
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors cursor-pointer"
                        >
                          {searchCountries.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Question / Message */}
                    <div>
                      <label className="block text-xs font-bold text-[#0B2A63] uppercase tracking-wider mb-1.5">
                        Your Question *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="What would you like assistance with?"
                        className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#0B2A63] focus:outline-none focus:border-[#1479F5] transition-colors resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full h-12 bg-[#1479F5] hover:bg-[#0B2A63] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#1479F5]/25 transition-colors duration-200 cursor-pointer"
                      >
                        <span>Send Question</span>
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <section className="max-w-4xl mx-auto pt-6 pb-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-[#0B2A63] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-[#64748B] font-medium mt-2">
              Everything you need to know about our visa verification and approval procedures
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-[#0B2A63] hover:text-[#1479F5] transition-colors focus:outline-none"
                  >
                    <span className="text-base sm:text-lg">{faq.q}</span>
                    <ChevronDown 
                      size={20} 
                      className={`text-[#1479F5] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-sm text-[#64748B] leading-relaxed font-medium border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
