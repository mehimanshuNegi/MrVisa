import React from 'react';
import { ShieldCheck } from 'lucide-react';
import heroBg from '../assets/hero-bg.png';

export default function Hero() {
  return (
    <section 
      className="relative overflow-hidden pt-6 pb-8 sm:pt-8 sm:pb-10 lg:pt-9 lg:pb-12 min-h-[350px] sm:min-h-[380px] lg:min-h-[400px] flex items-center bg-cover bg-center"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      
      {/* 
        SUBTLE HEADER → HERO TRANSITION:
        A soft 40–55px white-to-transparent fade extending into the top of the hero,
        eliminating any hard seam so header and hero flow as one continuous visual composition.
      */}
      <div className="absolute inset-x-0 top-0 h-12 sm:h-14 bg-gradient-to-b from-white via-white/50 to-transparent pointer-events-none z-10" />

      {/* 
        HERO BACKGROUND GRADIENT OVERLAY:
        - LEFT: Subtle white/cream fade ensuring 100% text readability
        - CENTER: Normal visibility of ocean and horizon
        - RIGHT: Completely vivid and colorful, showcasing the mascot, beach, and village
      */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/45 to-transparent w-full sm:w-[60%] lg:w-[44%] pointer-events-none" />
      
      {/* Soft bottom edge blend */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/40 to-transparent pointer-events-none" />

      {/* HERO CONTENT: Left Side Only */}
      <div className="relative z-20 max-w-[1440px] mx-auto px-6 lg:px-12 w-full">
        <div className="max-w-xl space-y-4 sm:space-y-5">
          
          {/* Small Eyebrow */}
          <p className="text-xs font-bold tracking-[0.2em] text-[#1479F5] uppercase drop-shadow-sm">
            YOUR VISA • OUR SUPPORT • A BIGGER TOMORROW
          </p>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-[#082B61] leading-[1.1] tracking-tight">
            Explore the World <br />
            with <span className="text-[#1479F5]">Mr Visa</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg font-medium text-[#082B61]/85">
            Simple. Reliable. Visa Support.
          </p>

          {/* Rounded Trust Badge & Guarantee */}
          <div className="pt-1 sm:pt-2">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md border border-[#1479F5]/30 text-[#082B61] shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#1479F5] text-white flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={14} strokeWidth={2.5} />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Pay After Visa Approval
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#082B61]/80 font-medium mt-2 pl-1">
              No upfront payment. Just your dream, our support.
            </p>
          </div>

        </div>
      </div>

    </section>
  );
}
