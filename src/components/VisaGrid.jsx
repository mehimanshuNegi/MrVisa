import React from 'react';
import VisaCard from './VisaCard';

export default function VisaGrid({ visas }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 w-full">
      {visas.map((visa) => (
        <VisaCard key={visa.id} visa={visa} />
      ))}
    </div>
  );
}
