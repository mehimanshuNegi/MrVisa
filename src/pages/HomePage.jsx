import React from 'react';
import Hero from '../components/Hero';
import DestinationSection from '../components/DestinationSection';
import DocumentationHomeSection from '../components/DocumentationHomeSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 1. Compact Hero + Visa Search */}
      <Hero />

      {/* 2. Popular Visa Destinations (Primary service, 6 cards) */}
      <DestinationSection />

      {/* 3. Documentation Services (5 cards, excluding GST) */}
      <DocumentationHomeSection />
    </div>
  );
}
