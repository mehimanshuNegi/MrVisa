import React, { createContext, useContext, useState, useMemo } from 'react';

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [selectedVisaType, setSelectedVisaType] = useState('All Visa Types');
  const [selectedDate, setSelectedDate] = useState('');

  const hasActiveFilters = useMemo(() => {
    return (
      (selectedCountry &&
        selectedCountry !== 'All Countries' &&
        selectedCountry !== 'Any Country' &&
        selectedCountry !== 'All Destinations' &&
        selectedCountry !== 'Anywhere') ||
      (selectedVisaType &&
        selectedVisaType !== 'All Visa Types' &&
        selectedVisaType !== 'All Types') ||
      Boolean(selectedDate)
    );
  }, [selectedCountry, selectedVisaType, selectedDate]);

  const resetFilters = () => {
    setSelectedCountry('All Countries');
    setSelectedVisaType('All Visa Types');
    setSelectedDate('');
  };

  const value = {
    selectedCountry,
    setSelectedCountry,
    selectedVisaType,
    setSelectedVisaType,
    selectedDate,
    setSelectedDate,
    hasActiveFilters,
    resetFilters
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
