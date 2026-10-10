import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Paperclip,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react';
import { documentationService, documentService } from '../../services';
import { validateName } from '../../utils/nameValidator';
import { validateEmail } from '../../utils/emailValidator';

// Fallback catalog definition if service not yet seeded in backend database
const FALLBACK_SERVICES = {
  'cover-letter': {
    title: 'Cover Letter',
    slug: 'cover-letter',
    category: 'Visa & Travel Documentation',
    shortDescription: 'Custom, embassy-compliant cover letter tailored to your visa application and itinerary.',
    description: 'A professionally drafted cover letter highlighting your purpose of travel, itinerary, financial capability, and ties to your home country.',
    processingTime: '24 Hours',
    price: 999,
    serviceFee: 999,
    currency: 'INR',
    requirements: [
      { id: 'req_passport', title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'JPEG', 'PNG'] },
      { id: 'req_visatype', title: 'Visa application form / visa type', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Tourist E-Visa, Business Visa' },
      { id: 'req_dates', title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. 15 Nov 2026 – 28 Nov 2026' },
      { id: 'req_purpose', title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Tourism, conference, family visit' },
      { id: 'req_dest', title: 'Destination and cities', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Paris, Nice, Lyon (France)' },
      { id: 'req_hotel', title: 'Hotel booking', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_flight', title: 'Flight reservation', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_bank', title: 'Bank statement / financial details', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if relevant', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_notes', title: 'Specific details to include in letter', category: 'Optional / If Available', required: false, inputType: 'text', placeholder: 'Any specific ties, sponsors, or details to highlight' }
    ]
  }
};

export default function DocumentationApplyPlaceholderPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Applicant contact form state
  const [applicant, setApplicant] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [applicantErrors, setApplicantErrors] = useState({});
  const [emailValidated, setEmailValidated] = useState(false);

  // Dynamic answers to text/date requirement fields: { [fieldId]: string }
  const [fieldAnswers, setFieldAnswers] = useState({});

  // Uploaded document records: { [reqId]: { storageKey, documentId, name, originalFilename, fileSize, mimeType, uploaded, error, isUploading } }
  const [documentStates, setDocumentStates] = useState({});
  const fileInputRefs = useRef({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        let data = await documentationService.getServiceBySlug(slug);
        if (!data && FALLBACK_SERVICES[slug]) {
          data = FALLBACK_SERVICES[slug];
        }
        if (isMounted && data) {
          setService(data);

          // Initialize document and text requirement states
          const initialDocs = {};
          const initialAnswers = {};
          const reqs = Array.isArray(data.requirements) && data.requirements.length > 0
            ? data.requirements
            : (data.requiredDocuments || []).map((title, idx) => ({ id: `doc_${idx}`, title, required: true, inputType: 'file' }));

          reqs.forEach((r, idx) => {
            const key = r._id || r.id || `req_${idx}`;
            if (r.inputType === 'file' || !r.inputType) {
              initialDocs[key] = {
                storageKey: '',
                documentId: '',
                name: '',
                originalFilename: '',
                fileSize: 0,
                uploaded: false,
                isUploading: false,
                error: null
              };
            } else {
              initialAnswers[key] = '';
            }
          });
          setDocumentStates(initialDocs);
          setFieldAnswers(initialAnswers);
        }
      } catch (err) {
        console.warn('Failed to load service for apply page:', err);
        if (FALLBACK_SERVICES[slug]) {
          setService(FALLBACK_SERVICES[slug]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [slug]);

  const serviceTitle = service?.title || (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'Documentation Service');
  const servicePrice = service?.serviceFee !== undefined ? `₹${Number(service.serviceFee).toLocaleString('en-IN')}` : (service?.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : '₹999');

  // Categorize requirements
  const fileRequirements = useMemo(() => {
    if (!service) return [];
    if (Array.isArray(service.requirements) && service.requirements.length > 0) {
      return service.requirements.filter((r) => r.isActive !== false && (r.inputType === 'file' || !r.inputType));
    }
    return (service.requiredDocuments || []).map((doc, idx) => ({
      id: `doc_${idx}`,
      title: doc,
      required: true,
      inputType: 'file',
      category: 'Required Documents'
    }));
  }, [service]);

  const detailRequirements = useMemo(() => {
    if (!service || !Array.isArray(service.requirements)) return [];
    return service.requirements.filter((r) => r.isActive !== false && r.inputType && r.inputType !== 'file');
  }, [service]);

  // Handle contact field changes
  const handleApplicantChange = (field, value) => {
    setApplicant((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') {
      setEmailValidated(false);
    }
    if (applicantErrors[field]) {
      setApplicantErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) setSubmitError('');
  };

  // Email format validation on blur only
  const handleEmailBlur = () => {
    if (!applicant.email.trim()) {
      setEmailValidated(false);
      return;
    }
    const check = validateEmail(applicant.email);
    if (!check.isValid) {
      setEmailValidated(false);
      setApplicantErrors((prev) => ({ ...prev, email: check.error }));
    } else {
      setEmailValidated(true);
      setApplicantErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  // Name validation on blur
  const handleNameBlur = () => {
    if (!applicant.name.trim()) return;
    const check = validateName(applicant.name);
    if (!check.isValid) {
      setApplicantErrors((prev) => ({ ...prev, name: check.error }));
    } else {
      setApplicantErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  // Handle real Cloudflare R2 file upload via backend
  const handleFileUpload = async (key, event, doc) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so user can re-select same file if needed
    event.target.value = '';

    // Enforce configured 25MB size limit
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          uploaded: false,
          isUploading: false,
          error: 'File exceeds 25 MB limit. Please compress or select a smaller file.'
        }
      }));
      return;
    }

    // Client-side extension verification
    const acceptedFormats = Array.isArray(doc?.acceptedFormats) && doc.acceptedFormats.length > 0
      ? doc.acceptedFormats
      : ['PDF', 'JPG', 'JPEG', 'PNG', 'WEBP', 'DOCX'];
    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toUpperCase() : '';
    const isAllowedExt = acceptedFormats.map((f) => f.toUpperCase()).includes(fileExt);

    if (!isAllowedExt) {
      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          uploaded: false,
          isUploading: false,
          error: `Please upload a supported document (${acceptedFormats.join(', ')})`
        }
      }));
      return;
    }

    // Set uploading indicator
    const previousStorageKey = documentStates[key]?.storageKey || '';
    setDocumentStates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isUploading: true,
        error: null
      }
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', doc.title || 'Documentation Supporting File');
      formData.append('serviceType', 'DOCUMENTATION');
      if (service?._id) formData.append('serviceId', service._id);
      if (previousStorageKey) formData.append('previousStorageKey', previousStorageKey);

      // Dedicated /documents/upload endpoint
      const result = await documentService.uploadDocumentDirect(formData);

      if (!result || !result.storageKey) {
        throw new Error('Upload was not confirmed by storage server.');
      }

      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          storageKey: result.storageKey,
          documentId: result.documentId || result.id || '',
          name: file.name,
          originalFilename: file.name,
          fileSize: file.size,
          mimeType: file.type || result.mimeType || 'application/pdf',
          signedUrl: result.signedUrl || '',
          uploaded: true,
          isUploading: false,
          error: null
        }
      }));
    } catch (uploadErr) {
      console.error('Document upload failed:', uploadErr);
      const errMsg = uploadErr?.response?.data?.message || uploadErr?.message || 'Upload failed. Please try again.';
      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          uploaded: false,
          isUploading: false,
          error: errMsg
        }
      }));
    }
  };

  // Remove uploaded document
  const handleRemoveDocument = (key) => {
    setDocumentStates((prev) => ({
      ...prev,
      [key]: {
        storageKey: '',
        documentId: '',
        name: '',
        originalFilename: '',
        fileSize: 0,
        uploaded: false,
        isUploading: false,
        error: null
      }
    }));
  };

  // Submit documentation application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Validate applicant
    const errors = {};
    const nameCheck = validateName(applicant.name);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const emailCheck = validateEmail(applicant.email);
    if (!emailCheck.isValid) errors.email = emailCheck.error;

    const phoneDigits = applicant.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) errors.phone = 'Please enter a valid 10-digit mobile number';

    // Verify required files are uploaded
    const missingDocs = [];
    fileRequirements.forEach((r, idx) => {
      const key = r._id || r.id || `req_${idx}`;
      if (r.required !== false && !documentStates[key]?.uploaded) {
        missingDocs.push(r.title);
      }
    });

    if (missingDocs.length > 0) {
      setSubmitError(`Please attach all required documents: ${missingDocs.slice(0, 2).join(', ')}${missingDocs.length > 2 ? '...' : ''}`);
    }

    if (Object.keys(errors).length > 0 || missingDocs.length > 0) {
      setApplicantErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Gather documents
      const docsToSubmit = Object.entries(documentStates)
        .filter(([_, state]) => state.uploaded && state.storageKey)
        .map(([key, state]) => {
          const reqItem = fileRequirements.find((r, i) => (r._id || r.id || `req_${i}`) === key);
          return {
            documentType: reqItem?.title || 'Documentation File',
            name: state.name || state.originalFilename || 'Document',
            originalFilename: state.originalFilename || state.name,
            storageKey: state.storageKey,
            mimeType: state.mimeType,
            fileSize: state.fileSize
          };
        });

      const payload = {
        serviceId: service?._id || null,
        serviceSlug: service?.slug || slug,
        serviceTitle: service?.title || serviceTitle,
        applicant: {
          name: nameCheck.normalized,
          email: emailCheck.normalized,
          phone: applicant.phone.trim()
        },
        details: fieldAnswers,
        documents: docsToSubmit,
        price: service?.serviceFee || service?.price || 999
      };

      const result = await documentationService.submitRequest(payload);
      setSubmissionSuccess(result);
    } catch (err) {
      console.error('Documentation application submission error:', err);
      setSubmitError(err?.message || 'Failed to submit application. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadedCount = Object.values(documentStates).filter((s) => s.uploaded).length;
  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // SUCCESS CONFIRMATION VIEW
  if (submissionSuccess) {
    return (
      <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] py-16 px-6">
        <div className="max-w-[700px] mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              Application Successfully Registered
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] mt-1">
              {serviceTitle} Intake Complete
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
              Your details and documents have been securely uploaded to encrypted Cloudflare R2 storage. A specialist will review your file and prepare your embassy-compliant documentation.
            </p>
          </div>

          {/* Reference pill */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 inline-block text-left w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Application Reference Number
            </span>
            <span className="text-lg font-mono font-black text-[#2563EB] tracking-wide block mt-0.5">
              {submissionSuccess.requestId || 'DOC-CONFIRMED'}
            </span>
          </div>

          {/* Uploaded documents summary */}
          <div className="text-left bg-slate-50/70 rounded-2xl p-4 border border-slate-200/50">
            <h4 className="text-xs font-bold text-[#082B61] mb-2">Attached Documents ({submissionSuccess.documents?.length || uploadedCount})</h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              {(submissionSuccess.documents || Object.values(documentStates).filter(s => s.uploaded)).map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-600 stroke-[3]" />
                  <span className="font-semibold text-slate-700">{doc.documentType || doc.name}</span>
                  {doc.originalFilename && <span className="text-[11px] text-slate-400 font-mono">({doc.originalFilename})</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/documentation"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
            >
              Browse Other Services
            </Link>
            <Link
              to="/account"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors text-center shadow-sm"
            >
              View My Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <form onSubmit={handleSubmitApplication} className="space-y-6 sm:space-y-8">
            {/* Header info */}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] block mb-1">
                Application Intake Step
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                Apply for {serviceTitle}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Enter your details and upload the required documents below. Our specialists will format everything according to embassy specifications.
              </p>
            </div>

            {/* Service & Fee Meta Pill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service</span>
                <span className="text-sm font-bold text-[#082B61] mt-0.5 block">{serviceTitle}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Fee</span>
                <span className="text-sm font-bold text-[#082B61] mt-0.5 block">{servicePrice}</span>
              </div>
            </div>

            {/* SECTION 1: APPLICANT DETAILS */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#082B61]">Applicant Contact Details</h3>
                  <p className="text-xs text-slate-400">Where should we deliver your prepared documents?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Full Name (As on Passport) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={applicant.name}
                      onChange={(e) => handleApplicantChange('name', e.target.value)}
                      onBlur={handleNameBlur}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                        applicantErrors.name
                          ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                      }`}
                    />
                    <User size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {applicantErrors.name && (
                    <span className="text-[11px] font-semibold text-red-600 mt-1 block">{applicantErrors.name}</span>
                  )}
                </div>

                {/* Email Address - with format-only validation & green tick on blur */}
                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@gmail.com"
                      value={applicant.email}
                      onChange={(e) => handleApplicantChange('email', e.target.value)}
                      onBlur={handleEmailBlur}
                      className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                        applicantErrors.email
                          ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                          : emailValidated
                          ? 'border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                      }`}
                    />
                    <Mail size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {emailValidated && !applicantErrors.email && (
                      <CheckCircle2 size={15} className="text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                  </div>
                  {applicantErrors.email && (
                    <span className="text-[11px] font-semibold text-red-600 mt-1 block">{applicantErrors.email}</span>
                  )}
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Mobile Phone *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={applicant.phone}
                      onChange={(e) => handleApplicantChange('phone', e.target.value)}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                        applicantErrors.phone
                          ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                      }`}
                    />
                    <Phone size={15} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {applicantErrors.phone && (
                    <span className="text-[11px] font-semibold text-red-600 mt-1 block">{applicantErrors.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: DYNAMIC SERVICE SPECIFICATIONS */}
            {detailRequirements.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#082B61]">Application Specifications</h3>
                    <p className="text-xs text-slate-400">Details required by our documentation specialists</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detailRequirements.map((req, idx) => {
                    const key = req._id || req.id || `req_${idx}`;
                    return (
                      <div key={key}>
                        <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                          {req.title} {req.required !== false && '*'}
                        </label>
                        <input
                          type={req.inputType === 'date' ? 'date' : 'text'}
                          required={req.required !== false}
                          placeholder={req.placeholder || `Enter ${req.title.toLowerCase()}`}
                          value={fieldAnswers[key] || ''}
                          onChange={(e) => setFieldAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 text-xs sm:text-sm font-medium transition-all outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: DOCUMENT UPLOAD CHECKLIST */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs">
                    {detailRequirements.length > 0 ? 3 : 2}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#082B61]">Document Intake Checklist</h3>
                    <p className="text-xs text-slate-400">Upload PDF, JPG, or PNG files (up to 25 MB)</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  <span className="text-[#2563EB]">{uploadedCount}</span> / {fileRequirements.length} Attached
                </div>
              </div>

              {fileRequirements.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No document files required for this service.</p>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {fileRequirements.map((doc, idx) => {
                    const key = doc._id || doc.id || `req_${idx}`;
                    const state = documentStates[key] || { uploaded: false, isUploading: false, name: '' };
                    const isRequired = doc.required !== false;
                    const acceptedFormats = Array.isArray(doc.acceptedFormats) && doc.acceptedFormats.length > 0
                      ? doc.acceptedFormats
                      : ['PDF', 'JPG', 'PNG'];

                    return (
                      <div
                        key={key}
                        className="py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Left: Document info & uploaded metadata */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                              state.uploaded
                                ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {state.uploaded && <Check size={13} strokeWidth={3} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${state.uploaded ? 'text-[#082B61]' : 'text-slate-800'}`}>
                                {doc.title}
                              </span>
                              {doc.condition && (
                                <span className="text-[10px] italic text-slate-400">
                                  ({doc.condition})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`text-[10px] font-bold ${
                                  isRequired ? 'text-[#2563EB]' : 'text-slate-400'
                                }`}
                              >
                                {isRequired ? 'Required' : 'Optional'}
                              </span>

                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded tracking-wide">
                                {acceptedFormats.join(' · ')}
                              </span>

                              {state.uploaded && (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                  <Paperclip size={11} />
                                  <span className="truncate max-w-[200px]">{state.name}</span>
                                  {state.fileSize > 0 && <span className="text-slate-400 font-normal">({formatBytes(state.fileSize)})</span>}
                                </span>
                              )}

                              {state.error && (
                                <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  {state.error}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Upload Actions */}
                        <div className="flex items-center gap-2 sm:justify-end flex-shrink-0">
                          <input
                            type="file"
                            ref={(el) => (fileInputRefs.current[key] = el)}
                            onChange={(e) => handleFileUpload(key, e, doc)}
                            accept={acceptedFormats.map((f) => `.${f.toLowerCase()}`).join(',')}
                            className="hidden"
                          />

                          {state.isUploading ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold">
                              <Loader2 size={13} className="animate-spin" />
                              <span>Uploading to R2...</span>
                            </div>
                          ) : state.uploaded ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[key]?.click()}
                                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(key)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[key]?.click()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white transition-all shadow-xs cursor-pointer"
                            >
                              <Upload size={12} />
                              <span>Upload Document</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {submitError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(slug ? `/documentation/${slug}` : '/documentation')}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Return to Service Details
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application ({servicePrice})</span>
                      <ShieldCheck size={14} />
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        )}
      </div>
    </div>
  );
}
