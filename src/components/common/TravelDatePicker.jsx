import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TravelDatePicker({
  selectedDate,
  setSelectedDate,
  variant = 'hero', // 'hero' | 'filterBar'
  iconBgClass = 'bg-[#EBF3FF] text-[#1479F5]'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Month currently displayed in calendar popover
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, key: `pad-${i}` });
    }
    // Days of current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      days.push({
        day: d,
        dateStr,
        key: dateStr
      });
    }
    return days;
  }, [viewDate]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const handleSelectDay = (dateStr, e) => {
    e.stopPropagation();
    setSelectedDate(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDate('');
    setIsOpen(false);
  };

  const displayDateText = useMemo(() => {
    if (!selectedDate) return 'Select Dates';
    const parsed = new Date(selectedDate);
    if (isNaN(parsed.getTime())) return 'Select Dates';
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsOpen((prev) => !prev)}
      className="relative flex items-center justify-between cursor-pointer select-none"
    >
      {/* Trigger display */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 py-1">
        <div className={`w-8 h-8 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
          <Calendar size={15} strokeWidth={2.4} />
        </div>
        <div className="flex flex-col justify-center text-left min-w-0">
          <span className="text-[9.5px] sm:text-[10px] font-bold text-[#5D7190] tracking-wider leading-none">
            Travel Dates:
          </span>
          <span className="text-xs sm:text-[13.5px] font-extrabold text-[#082B61] leading-tight truncate mt-0.5">
            {displayDateText}
          </span>
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(8,43,97,0.22)] border border-slate-200/90 p-3.5 z-50 w-72 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-extrabold text-[#082B61]">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              if (!item.day) {
                return <div key={item.key} className="h-7 w-7" />;
              }
              const isSelected = selectedDate === item.dateStr;
              const isToday = todayStr === item.dateStr;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={(e) => handleSelectDay(item.dateStr, e)}
                  className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1479F5] text-white shadow-xs'
                      : isToday
                      ? 'border border-[#1479F5] text-[#1479F5] hover:bg-blue-50'
                      : 'text-[#082B61] hover:bg-slate-100'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <button
              type="button"
              onClick={(e) => handleSelectDay(todayStr, e)}
              className="text-[#1479F5] hover:underline cursor-pointer"
            >
              Today
            </button>
            {selectedDate && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-red-500 inline-flex items-center gap-1 cursor-pointer"
              >
                <X size={11} />
                <span>Clear Date</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
