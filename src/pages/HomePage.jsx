import React from 'react';
import Hero from '../components/Hero';
import DestinationSection from '../components/DestinationSection';
import ServiceHighlights from '../components/ServiceHighlights';
import CTASection from '../components/CTASection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <DestinationSection />
      <ServiceHighlights />
      <CTASection />
    </>
  );
}
