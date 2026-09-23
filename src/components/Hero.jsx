import React from 'react';
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
        <div className="max-w-xl space-y-3 sm:space-y-4">

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-[#082B61] leading-[1.1] tracking-tight">
            Explore the World <br />
            with <span className="text-[#1479F5]">NimuFly</span>
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg font-semibold text-[#1479F5] tracking-tight">
            On time, every time.
          </p>

        </div>
      </div>

    </section>
  );
}
