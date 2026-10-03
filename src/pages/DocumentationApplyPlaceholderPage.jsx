import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Lock,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Paperclip
} from 'lucide-react';
import { documentationService } from '../services';

export default function DocumentationApplyPlaceholderPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Document checklist and upload states: { [docId]: { checked: boolean, fileName: string, uploaded: boolean } }
  const [documentStates, setDocumentStates] = useState({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await documentationService.getServiceBySlug(slug);
        if (isMounted && data) {
          setService(data);
          // Initialize document states
          const initial = {};
          const reqs = Array.isArray(data.requirements) && data.requirements.length > 0
            ? data.requirements
            : (data.requiredDocuments || []).map((title, idx) => ({ title, required: true, id: idx }));

          reqs.forEach((r, idx) => {
            const key = r._id || r.id || r.title || idx;
            initial[key] = { checked: false, fileName: '', uploaded: false };
          });
          setDocumentStates(initial);
        }
      } catch (err) {
        console.warn('Failed to load service for apply placeholder:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [slug]);

  const serviceTitle = service?.title || (slug ? slug.toUpperCase() : 'Documentation Service');

  // Toggle checkmark for document
  const handleToggleCheck = (key) => {
    setDocumentStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key]?.checked
      }
    }));
  };

  // Handle simulated upload with dynamic format validation
  const handleFileChange = (key, event, doc) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isTooLarge = file.size > 5 * 1024 * 1024;
    const acceptedFormats = Array.isArray(doc?.acceptedFormats) && doc.acceptedFormats.length > 0
      ? doc.acceptedFormats
      : ['PDF', 'JPG', 'JPEG', 'PNG'];
    const extPattern = new RegExp(`\\.(${acceptedFormats.map((f) => f.toLowerCase()).join('|')})$`, 'i');
    const isAllowedExt = extPattern.test(file.name);
    const formatsLabel = acceptedFormats.join(', ');

    if (isTooLarge || !isAllowedExt) {
      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          checked: false,
          uploaded: false,
          fileName: '',
          error: isTooLarge
            ? 'File too large (max 5 MB)'
            : `Please upload a ${formatsLabel} file`
        }
      }));
      return;
    }

    setDocumentStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: true,
        uploaded: true,
        fileName: file.name,
        error: null
      }
    }));
  };

  const triggerUpload = (key) => {
    fileInputRefs.current[key]?.click();
  };

  const documentList = useMemo(() => {
    if (!service) return [];
    if (Array.isArray(service.requirements) && service.requirements.length > 0) {
      return service.requirements.filter((r) => r.isActive !== false);
    }
    return (service.requiredDocuments || []).map((doc, idx) => ({
      id: idx,
      title: doc,
      required: true,
      category: 'Required Documents'
    }));
  }, [service]);

  const uploadedCount = Object.values(documentStates).filter((s) => s.uploaded).length;

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 py-4 sm:py-5">
        <div className="max-w-[1000px] mx-auto px-6 flex items-center justify-between">
          <Link
            to={slug ? `/documentation/${slug}` : '/documentation'}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Service Overview</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Lock size={12} className="text-emerald-500" />
            <span>Cloudflare R2 Encrypted Storage</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 pt-8 sm:pt-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
            <p className="text-sm font-bold text-[#082B61]">Preparing application workspace...</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Header info */}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] block mb-1">
                Application Intake Step
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                Apply for {serviceTitle}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Review the required documents below. Attach your files or mark them as ready for submission.
              </p>
            </div>

            {/* Clean Application Container */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#082B61]">Document Intake Checklist</h3>
                    <p className="text-xs text-slate-400">Step 1: Upload or mark your documents</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  <span className="text-[#2563EB]">{uploadedCount}</span> / {documentList.length} Attached
                </div>
              </div>

              {/* Service & Fee Meta Pill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service</span>
                  <span className="text-sm font-bold text-[#082B61] mt-0.5 block">{serviceTitle}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Fee</span>
                  <span className="text-sm font-bold text-[#082B61] mt-0.5 block">
                    {service?.price || (service?.serviceFee ? `₹${Number(service.serviceFee).toLocaleString('en-IN')}` : '₹1,499')}
                  </span>
                </div>
              </div>

              {/* SECTION 13: COMPACT DOCUMENT ROWS */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5D7190]">
                  Required Documents
                </h4>

                {documentList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No specific documents specified.</p>
                ) : (
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    {documentList.map((doc, idx) => {
                      const key = doc._id || doc.id || doc.title || idx;
                      const state = documentStates[key] || { checked: false, uploaded: false, fileName: '' };
                      const isRequired = doc.required !== false;
                      const acceptedFormats = Array.isArray(doc.acceptedFormats) && doc.acceptedFormats.length > 0
                        ? doc.acceptedFormats
                        : null;

                      return (
                        <div
                          key={key}
                          className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Left: ✓ / ○  Title & Required Label */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Interactive Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleCheck(key)}
                              className="focus:outline-none cursor-pointer flex-shrink-0"
                              title={state.checked ? 'Mark as pending' : 'Mark as ready'}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  state.checked || state.uploaded
                                    ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                    : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                              >
                                {(state.checked || state.uploaded) && <Check size={11} strokeWidth={3} />}
                              </div>
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold truncate ${
                                    state.checked || state.uploaded ? 'text-[#082B61]' : 'text-slate-700'
                                  }`}
                                >
                                  {doc.title}
                                </span>

                                {doc.condition && (
                                  <span className="text-[10px] italic text-slate-400">
                                    ({doc.condition})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span
                                  className={`text-[9.5px] font-bold ${
                                    isRequired ? 'text-[#2563EB]' : 'text-slate-400'
                                  }`}
                                >
                                  {isRequired ? 'Required' : 'If applicable'}
                                </span>

                                {/* Accepted formats hint */}
                                {acceptedFormats && (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded tracking-wide">
                                    {acceptedFormats.join(' · ')}
                                  </span>
                                )}

                                {state.fileName && !state.error && (
                                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <Paperclip size={10} />
                                    <span className="truncate max-w-[150px]">{state.fileName}</span>
                                  </span>
                                )}

                                {state.error && (
                                  <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    {state.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Upload Action */}
                          <div className="flex items-center gap-2 sm:justify-end flex-shrink-0">
                            <input
                              type="file"
                              ref={(el) => (fileInputRefs.current[key] = el)}
                              onChange={(e) => handleFileChange(key, e, doc)}
                              className="hidden"
                            />

                            <button
                              type="button"
                              onClick={() => triggerUpload(key)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                state.uploaded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : state.error
                                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                  : 'bg-slate-100 hover:bg-slate-200 text-[#082B61]'
                              }`}
                            >
                              <Upload size={12} />
                              <span>{state.uploaded ? 'Replace' : 'Upload'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(slug ? `/documentation/${slug}` : '/documentation')}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Return to Service Details
                </button>

                <button
                  type="button"
                  disabled
                  className="px-5 py-2 rounded-full bg-[#2563EB]/40 text-white text-xs font-bold cursor-not-allowed"
                >
                  Placeholder Intake Step
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
