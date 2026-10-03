import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Receipt,
  Briefcase,
  Ship,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ChevronDown,
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { documentationService } from '../services';

const ICON_MAP = {
  FileText,
  Receipt,
  Briefcase,
  Ship,
  Layers
};

export default function DocumentationDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic condition / income-type state
  const [selectedCondition, setSelectedCondition] = useState('');

  // Interactive customer checklist state ("Do I have this?")
  const [checkedItems, setCheckedItems] = useState({});

  // Expandable category groups
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function loadService() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await documentationService.getServiceBySlug(slug);
        if (isMounted) {
          if (data) {
            setService(data);
            if (data.conditionOptions && data.conditionOptions.length > 0) {
              setSelectedCondition(data.conditionOptions[0]);
            }
            // Expand all categories by default
            const initialExpanded = {};
            const reqs = data.requirements || [];
            reqs.forEach((r) => {
              const cat = r.category || 'Basic Information';
              initialExpanded[cat] = true;
            });
            setExpandedCategories(initialExpanded);
          } else {
            setError(`Service '${slug}' not found.`);
          }
        }
      } catch (err) {
        console.error('Failed to load documentation service detail:', err);
        if (isMounted) {
          setError('Failed to load documentation service details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadService();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Toggle item in customer checklist
  const toggleItemCheck = (key) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle accordion category
  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Dynamically filter and group requirements from MongoDB data
  const { groupedRequirements, totalVisibleCount, checkedCount } = useMemo(() => {
    if (!service) return { groupedRequirements: {}, totalVisibleCount: 0, checkedCount: 0 };

    const allReqs = Array.isArray(service.requirements) && service.requirements.length > 0
      ? service.requirements
      : (service.requiredDocuments || []).map((doc, idx) => ({
          title: doc,
          category: 'Basic Information',
          required: true,
          inputType: 'file',
          displayOrder: idx
        }));

    // Filter by dynamic condition if condition prompt is enabled
    const visible = allReqs.filter((req) => {
      if (req.isActive === false) return false;
      if (!service.conditionPrompt || !selectedCondition) return true;
      if (!req.condition || req.condition === 'all') return true;
      return req.condition.toLowerCase() === selectedCondition.toLowerCase();
    });

    // Group by category
    const grouped = {};
    visible.forEach((req) => {
      const cat = req.category || 'Basic Information';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(req);
    });

    let checked = 0;
    visible.forEach((req) => {
      const key = req._id || req.title;
      if (checkedItems[key]) checked++;
    });

    return {
      groupedRequirements: grouped,
      totalVisibleCount: visible.length,
      checkedCount: checked
    };
  }, [service, selectedCondition, checkedItems]);

  if (isLoading) {
    return (
      <div className="bg-[#FAFBFD] min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={32} className="animate-spin text-[#2563EB] mb-3" />
        <p className="text-xs font-bold text-[#082B61]">Loading service requirements...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-white min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-2xl font-extrabold text-[#082B61]">Service Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6 max-w-md">
          {error || `We couldn't locate documentation details for '${slug}'.`}
        </p>
        <Link
          to="/documentation"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold shadow-sm hover:bg-[#1d4ed8] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Browse All Services</span>
        </Link>
      </div>
    );
  }

  const IconComponent = ICON_MAP[service.icon] || FileText;
  const categories = Object.keys(groupedRequirements);

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] pb-24">
      {/* 1. COMPACT SERVICE HEADER */}
      <section className="bg-white border-b border-slate-100 pt-7 pb-8 sm:pt-9 sm:pb-10">
        <div className="max-w-[1000px] mx-auto px-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <Link to="/" className="hover:text-[#2563EB] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/documentation" className="hover:text-[#2563EB] transition-colors">Documentation</Link>
            <span>/</span>
            <span className="text-[#123B7A] font-bold truncate max-w-[200px]">{service.title}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-1">
              <IconComponent size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight leading-tight">
                {service.title}
              </h1>

              <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed max-w-2xl">
                {service.description || service.shortDescription}
              </p>

              {/* Service Meta Pill Row */}
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 font-bold text-[#082B61]">
                  <span className="text-[#2563EB]">Fee:</span> {service.price || `₹${Number(service.serviceFee || 0).toLocaleString('en-IN')}`}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>{service.processingTime || '24–48 Hours'}</span>
                </span>
                {totalVisibleCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                      {checkedCount}/{totalVisibleCount} ready
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC REQUIREMENTS CHECKLIST */}
      <section className="max-w-[1000px] mx-auto px-6 py-8 sm:py-10">
        
        {/* Dynamic Condition Prompt (e.g. Income Type Selection) */}
        {service.conditionPrompt && service.conditionOptions?.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5D7190] mb-2.5">
              {service.conditionPrompt}
            </p>
            <div className="flex flex-wrap gap-2">
              {service.conditionOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedCondition(opt)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedCondition === opt
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header for Checklist Section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#082B61] tracking-tight">
              What you'll need
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review what's required for your application. Check items as you gather them.
            </p>
          </div>

          {totalVisibleCount > 0 && (
            <div className="text-[11px] font-bold text-slate-500">
              {totalVisibleCount} {totalVisibleCount === 1 ? 'item' : 'items'}
            </div>
          )}
        </div>

        {/* Small Expandable Groups/Cards */}
        {categories.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500">No specific requirements listed for this selection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const items = groupedRequirements[cat] || [];
              const isExpanded = expandedCategories[cat] !== false;

              return (
                <div
                  key={cat}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all"
                >
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-[13px] font-extrabold text-[#082B61]">
                        {cat}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>

                  {/* Compact Requirement Rows */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const itemKey = item._id || item.title || idx;
                        const isChecked = Boolean(checkedItems[itemKey]);

                        return (
                          <div
                            key={itemKey}
                            className="py-2.5 px-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Simple Checkbox: [ ] I have this / [✓] I have this */}
                              <button
                                type="button"
                                onClick={() => toggleItemCheck(itemKey)}
                                className="focus:outline-none cursor-pointer flex-shrink-0"
                                aria-label={isChecked ? `Uncheck ${item.title}` : `Check ${item.title}`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                      : 'border-slate-300 hover:border-slate-400 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check size={11} strokeWidth={3} />}
                                </div>
                              </button>

                              {/* Title */}
                              <span
                                className={`font-semibold truncate ${
                                  isChecked ? 'text-slate-400 line-through' : 'text-[#082B61]'
                                }`}
                              >
                                {item.title}
                              </span>

                              {/* Condition / Note (e.g. if available, where applicable) */}
                              {item.condition && (
                                <span className="text-[10px] text-slate-400 italic flex-shrink-0">
                                  ({item.condition})
                                </span>
                              )}

                              {/* Required / Optional Tag */}
                              {item.required ? (
                                <span className="text-[9.5px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                  Required
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                  If applicable
                                </span>
                              )}

                              {/* Accepted Formats Pills */}
                              {Array.isArray(item.acceptedFormats) && item.acceptedFormats.length > 0 && (
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex-shrink-0 tracking-wide">
                                  {item.acceptedFormats.join(' · ')}
                                </span>
                              )}
                            </div>

                            {/* Action to proceed */}
                            <button
                              type="button"
                              onClick={() => navigate(`/documentation/${service.slug}/apply`)}
                              className="text-[11px] font-bold text-[#2563EB] hover:text-[#082B61] transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
                            >
                              Upload / Add Details
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. DELIVERABLES SECTION (What NimuFly prepares for you) */}
        {service.deliverables && service.deliverables.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#2563EB]" />
              <h3 className="text-xs font-bold text-[#082B61] uppercase tracking-wider">
                {service.deliverablesHeader || 'What NimuFly will prepare for you'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {service.deliverables.map((del, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-700 font-semibold py-1">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span>{del}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CLEAN CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h4 className="text-sm font-extrabold text-[#082B61]">Ready to proceed?</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your information and our specialists will prepare your documents.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/documentation/${service.slug}/apply`)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <span>Apply for {service.title}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </section>
    </div>
  );
}
