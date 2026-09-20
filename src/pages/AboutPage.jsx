import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Headphones, ArrowRight, CheckCircle, Globe, Lock, HeartHandshake } from 'lucide-react';

export default function AboutPage() {
  const approachItems = [
    {
      icon: FileCheck2,
      title: "Simple Process",
      description: "Intuitive digital workflows that replace bulky embassy paperwork with straightforward, 5-minute online submissions."
    },
    {
      icon: ShieldCheck,
      title: "Clear Documentation",
      description: "Exact, verified checklists customized for your nationality and destination. No guesswork, no missing forms."
    },
    {
      icon: Headphones,
      title: "Reliable Support",
      description: "Direct access to real travel and visa specialists ready to answer questions and troubleshoot edge cases promptly."
    }
  ];

  const pillars = [
    {
      icon: HeartHandshake,
      title: "Pay After Approval",
      description: "Our hallmark guarantee: we work tirelessly on your application, and you only pay once your visa is approved."
    },
    {
      icon: Globe,
      title: "Direct Embassy Compliance",
      description: "Applications prepared and formatted strictly adhering to current consulate and immigration regulations."
    },
    {
      icon: Lock,
      title: "Confidential & Secure",
      description: "Your sensitive identity documents and financial records are protected with bank-grade encryption."
    },
    {
      icon: CheckCircle,
      title: "Transparent Pricing",
      description: "Fixed rates with zero surprise fees or unexpected add-on costs throughout your entire journey."
    }
  ];

  return (
    <div className="bg-white min-h-screen py-12 lg:py-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        
        {/* HERO SECTION */}
        <div className="max-w-3xl mb-16 lg:mb-24">
          <p className="text-xs font-bold tracking-[0.2em] text-[#1479F5] uppercase mb-3">
            ABOUT MR VISA
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0B2A63] tracking-tight leading-[1.15]">
            Making Visa Applications Simpler
          </h1>
          <p className="text-lg sm:text-xl text-[#64748B] font-medium mt-5 leading-relaxed">
            At Mr Visa, we believe international travel should be centered around the wonder of discovery, not the anxiety of complex government bureaucracy. We streamline the entire visa lifecycle through transparent requirements, verified guidance, and our traveler-first promise.
          </p>
        </div>

        {/* OUR APPROACH */}
        <section className="mb-20 lg:mb-28">
          <div className="mb-10 pb-4 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A63] tracking-tight">
              Our Approach
            </h2>
            <p className="text-base text-[#64748B] font-medium mt-1">
              Engineered to make every visa submission predictable and stress-free
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {approachItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className="p-8 rounded-3xl bg-[#F5F9FF] border border-[#1479F5]/15 space-y-4 hover:border-[#1479F5]/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white text-[#1479F5] flex items-center justify-center shadow-sm">
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0B2A63]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#64748B] leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* WHY CHOOSE MR VISA */}
        <section className="mb-20 lg:mb-28">
          <div className="mb-10 pb-4 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A63] tracking-tight">
              Why Choose Mr Visa?
            </h2>
            <p className="text-base text-[#64748B] font-medium mt-1">
              A modern service built upon honesty, clarity, and traveler satisfaction
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div 
                  key={idx} 
                  className="p-6 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors shadow-sm space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F5F9FF] text-[#1479F5] flex items-center justify-center">
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-bold text-[#0B2A63]">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed font-medium">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="bg-[#F5F9FF] border border-[#1479F5]/20 rounded-3xl p-10 sm:p-14 lg:p-16 text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B2A63] tracking-tight">
              Ready to Start Your Journey?
            </h2>
            <p className="text-base sm:text-lg font-medium text-[#64748B]">
              Let our experienced team take care of your visa details today.
            </p>
            <div className="pt-2">
              <Link
                to="/visa"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#1479F5] hover:bg-[#0B2A63] text-white font-bold text-base transition-colors duration-200 shadow-sm"
              >
                <span>Get Started</span>
                <ArrowRight size={17} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
