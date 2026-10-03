import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Reusable Admin Dropdown with hover/pointer entry activation on desktop,
 * grace-period mouse leave timer to prevent flickering, and full click/touch support.
 */
export default function AdminDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  labelPrefix = '',
  icon: Icon = null,
  className = '',
  menuClassName = '',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const currentOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = currentOption ? currentOption.label : placeholder;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleToggleClick}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#082B61] transition-colors focus:outline-none focus:border-[#2563EB] cursor-pointer shadow-2xs whitespace-nowrap"
      >
        {Icon && <Icon size={13} className="text-slate-400 flex-shrink-0" />}
        {labelPrefix && <span className="text-slate-400 font-medium">{labelPrefix}:</span>}
        <span className="truncate max-w-[150px]">{displayLabel}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-150 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-[#2563EB]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute top-full mt-1.5 z-50 min-w-[180px] max-h-[300px] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg p-1 animate-in fade-in slide-in-from-top-1 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-[#2563EB] font-bold'
                    : 'text-[#082B61] hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={13} className="text-[#2563EB] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
