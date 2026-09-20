import React from 'react';
import { Zap, Users, FileCheck, Headphones } from 'lucide-react';

export default function ServiceHighlights() {
  const highlights = [
    {
      icon: Zap,
      title: 'Fast Processing',
      subtitle: 'Save time, travel sooner',
    },
    {
      icon: Users,
      title: 'Expert Guidance',
      subtitle: 'Get step by step support',
    },
    {
      icon: FileCheck,
      title: 'Hassle-Free Documentation',
      subtitle: 'We handle the paperwork',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      subtitle: "We're always here",
    },
  ];

  return (
    <section className="bg-white pt-2 pb-10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-3.5 group">
                <div className="w-11 h-11 rounded-full bg-[#1479F5]/10 text-[#1479F5] flex items-center justify-center flex-shrink-0 group-hover:bg-[#1479F5] group-hover:text-white transition-colors duration-200">
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B2A63]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
