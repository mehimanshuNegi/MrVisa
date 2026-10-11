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
  Sparkles,
  ArrowRight,
  Eye,
  Edit2,
  Building2,
  Briefcase,
  Layers,
  FileCheck,
  Info,
  DollarSign,
  HelpCircle,
  Ship,
  ChevronRight
} from 'lucide-react';
import { documentationService, documentService } from '../../services';
import { validateName } from '../../utils/nameValidator';
import { validateEmail } from '../../utils/emailValidator';
import { validatePhone } from '../../utils/phoneValidator';

// Rich fallback catalog if service is not yet loaded from backend database
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
      { id: 'req_passport', title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_visatype', title: 'Visa application form or visa type', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Tourist E-Visa, Business Visa, Schengen C-Type' },
      { id: 'req_dates', title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. 15 Nov 2026 – 28 Nov 2026' },
      { id: 'req_purpose', title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'select', options: ['Tourism', 'Business Travel', 'Family / Friend Visit', 'Conference / Event', 'Other'] },
      { id: 'req_dest', title: 'Destination country and cities', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. France (Paris, Nice, Lyon)' },
      { id: 'req_employment', title: 'Employment/business details', category: 'Basic Information', required: true, inputType: 'textarea', placeholder: 'Company name, designation, nature of work, years of experience' },
      { id: 'req_hotel', title: 'Hotel booking', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_flight', title: 'Flight reservation', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_bank', title: 'Bank/financial details', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if relevant', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_history', title: 'Previous travel/visa history', category: 'Optional / If Available', required: false, inputType: 'textarea', condition: 'if relevant', placeholder: 'Past visits in last 5–10 years, valid US/UK/Schengen visas' },
      { id: 'req_notes', title: 'Specific information you want included', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Ties to home country, leave approval, sponsors or special circumstances' },
      // Conditional Business Section
      { id: 'req_invitation', title: 'Invitation letter', category: 'Business Travel Details', required: false, inputType: 'file', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_company', title: 'Company details', category: 'Business Travel Details', required: false, inputType: 'text', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Inviting company name, address & contact person' },
      { id: 'req_meeting', title: 'Meeting/event details', category: 'Business Travel Details', required: false, inputType: 'textarea', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Agenda of meeting, conference title, project discussions' },
      { id: 'req_meeting_dates', title: 'Meeting/event dates and location', category: 'Business Travel Details', required: false, inputType: 'text', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Venue and scheduled dates' }
    ]
  },
  'travel-itinerary': {
    title: 'Travel Itinerary',
    slug: 'travel-itinerary',
    category: 'Visa & Travel Documentation',
    shortDescription: 'Embassy-ready, day-by-day travel plan matching your flight and hotel bookings.',
    description: 'A comprehensive, realistic day-wise travel schedule mapped to your visa application.',
    processingTime: '24 Hours',
    price: 1199,
    serviceFee: 1199,
    currency: 'INR',
    requirements: [
      { id: 'req_passport', title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_dest', title: 'Destination country', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Switzerland & Italy' },
      { id: 'req_dates', title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. 10 Dec 2026 – 24 Dec 2026' },
      { id: 'req_cities', title: 'Cities to be visited', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Zurich, Lucerne, Interlaken, Milan, Rome' },
      { id: 'req_purpose', title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'select', options: ['Tourism & Leisure', 'Honeymoon', 'Business & Sightseeing', 'Cultural / Heritage Tour', 'Family Vacation'] },
      { id: 'req_travellers', title: 'Number of travellers', category: 'Basic Information', required: true, inputType: 'number', placeholder: 'e.g. 2' },
      { id: 'req_hotel', title: 'Preferred hotels or existing bookings', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked or preferred', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_flight', title: 'Existing flight details or reservations', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_activities', title: 'Preferred places and activities', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Must-visit attractions (e.g. Eiffel Tower, Jungfraujoch, Colosseum, city tours)' },
      { id: 'req_appointments', title: 'Fixed appointments or events', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Any scheduled concerts, train journeys, conferences, or specific appointment dates' }
    ]
  },
  'itr': {
    title: 'Income Tax Return + Computation',
    slug: 'itr',
    category: 'Tax & Financial Compliance',
    shortDescription: 'Certified ITR filing with computation of total income statement for visa financial proof.',
    description: 'Expert-assisted Income Tax Return preparation, computation of total income, and e-filing tailored specifically to meet consulate financial requirements.',
    processingTime: '24–48 Hours',
    price: 1499,
    serviceFee: 1499,
    currency: 'INR',
    requirements: [
      { id: 'req_income_cat', title: 'Income Category', category: 'Income Classification', required: true, inputType: 'select', options: ['Salaried individual', 'Business / professional or self-employed', 'Other income', 'Multiple income sources'] },
      { id: 'req_pan', title: 'PAN card', category: 'Identity & Tax Credentials', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_aadhaar', title: 'Aadhaar card', category: 'Identity & Tax Credentials', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_mobile', title: 'Mobile number', category: 'Identity & Tax Credentials', required: true, inputType: 'text', placeholder: '10-digit Aadhaar/PAN linked mobile' },
      { id: 'req_fy', title: 'Assessment Year / Financial Year', category: 'Tax Period', required: true, inputType: 'select', options: ['AY 2025-26 (FY 2024-25)', 'AY 2024-25 (FY 2023-24)', 'AY 2023-24 (FY 2022-23)', 'Multiple Years (2-3 Years for Visa)'] },
      { id: 'req_employer', title: 'Employer details', category: 'Employment Details', required: false, inputType: 'text', condition: 'for salaried individual', conditionField: 'incomeType', conditionValue: 'Salaried individual', placeholder: 'Employer name, designation, city' },
      { id: 'req_form16', title: 'Form 16 / Salary slips', category: 'Income Documents', required: false, inputType: 'file', condition: 'Form 16 or last 3 months salary slips', conditionField: 'incomeType', conditionValue: 'Salaried individual', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_business', title: 'Business/firm details', category: 'Business Details', required: false, inputType: 'text', condition: 'for business / self-employed', conditionField: 'incomeType', conditionValue: 'Business / professional or self-employed', placeholder: 'Trade/firm name, nature of business/profession' },
      { id: 'req_bank_stmt', title: 'Business bank statements / financials', category: 'Business Documents', required: false, inputType: 'file', condition: 'business account statement or financials', conditionField: 'incomeType', conditionValue: 'Business / professional or self-employed', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_other_income', title: 'Details of income sources', category: 'Other Income', required: false, inputType: 'textarea', condition: 'for other or multiple income sources', conditionField: 'incomeType', conditionValue: 'Other income,Multiple income sources', placeholder: 'Rental income, capital gains, consultancy, interest, etc.' },
      { id: 'req_extra_bank', title: 'Bank statement / financial proof', category: 'Optional Documents', required: false, inputType: 'file', condition: 'as relevant for visa', acceptedFormats: ['PDF', 'JPG', 'PNG'] }
    ]
  },
  'import-export': {
    title: 'Import Export Code (IEC)',
    slug: 'import-export',
    category: 'International Trade',
    shortDescription: '10-digit DGFT Import Export Code license for global trade and international business.',
    description: 'Obtain your official 10-digit Import Export Code issued by the Directorate General of Foreign Trade (DGFT), Ministry of Commerce.',
    processingTime: '1–2 Business Days',
    price: 1499,
    serviceFee: 1499,
    currency: 'INR',
    requirements: [
      { id: 'req_entity', title: 'Entity Type', category: 'Entity Selection', required: true, inputType: 'select', options: ['Proprietorship', 'Partnership', 'Company', 'LLP'] },
      { id: 'req_pan', title: 'PAN card', category: 'Identity & Contact', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Individual PAN for Proprietorship, Entity PAN for Firm/Company' },
      { id: 'req_aadhaar', title: 'Aadhaar/identity proof', category: 'Identity & Contact', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Proprietor / Partner / Director identity proof' },
      { id: 'req_mobile', title: 'Mobile number', category: 'Identity & Contact', required: true, inputType: 'text', placeholder: '10-digit mobile number' },
      { id: 'req_email', title: 'Email ID', category: 'Identity & Contact', required: true, inputType: 'text', placeholder: 'official@company.com' },
      { id: 'req_business_details', title: 'Business/proprietorship/company details', category: 'Business Details', required: true, inputType: 'text', placeholder: 'Trade name, date of inception' },
      { id: 'req_address_proof', title: 'Business address proof', category: 'Business Proof', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Electricity bill / Rent agreement / Property deed' },
      { id: 'req_bank_acc', title: 'Bank account details', category: 'Banking Information', required: true, inputType: 'text', placeholder: 'Bank Account Number, Bank Name, IFSC code' },
      { id: 'req_cheque', title: 'Cancelled cheque / bank proof', category: 'Banking Information', required: false, inputType: 'file', condition: 'as applicable', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_incorporation', title: 'Company/LLP incorporation documents', category: 'Corporate Documents', required: false, inputType: 'file', condition: 'if Company, LLP or Partnership', conditionField: 'entityType', conditionValue: 'Company,LLP,Partnership', acceptedFormats: ['PDF', 'JPG', 'PNG'] },
      { id: 'req_dsc', title: 'DSC (Digital Signature Certificate)', category: 'Corporate Documents', required: false, inputType: 'file', condition: 'where applicable for entity type', conditionField: 'entityType', conditionValue: 'Company,LLP', acceptedFormats: ['PDF', 'JPG', 'PNG'] }
    ]
  },
  'msme': {
    title: 'Udyam Registration (MSME)',
    slug: 'msme',
    category: 'Government Certification',
    shortDescription: 'Official Ministry of MSME Udyam registration with lifetime valid certificate.',
    description: 'Paperless online registration for Micro, Small, and Medium Enterprises under the Government of India Udyam portal.',
    processingTime: '24 Hours',
    price: 999,
    serviceFee: 999,
    currency: 'INR',
    requirements: [
      { id: 'req_aadhaar', title: 'Aadhaar', category: 'Identity & Authentication', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Aadhaar of Proprietor / Director / Partner' },
      { id: 'req_pan', title: 'PAN', category: 'Identity & Authentication', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'PAN of Proprietor or Business Enterprise' },
      { id: 'req_mobile', title: 'Mobile number', category: 'Identity & Authentication', required: true, inputType: 'text', placeholder: '10-digit mobile number linked with Aadhaar' },
      { id: 'req_business_name', title: 'Business name', category: 'Enterprise Details', required: true, inputType: 'text', placeholder: 'Official legal trade name of the enterprise' },
      { id: 'req_business_addr', title: 'Business address', category: 'Enterprise Details', required: true, inputType: 'textarea', placeholder: 'Complete plant / office address including pincode' },
      { id: 'req_activity', title: 'Business activity/nature of business', category: 'Enterprise Details', required: true, inputType: 'select', options: ['Manufacturing', 'Services', 'Trading'] },
      { id: 'req_bank_acc', title: 'Bank account details', category: 'Banking Information', required: true, inputType: 'text', placeholder: 'Bank Account Number & IFSC code' },
      { id: 'req_employees', title: 'Number of employees', category: 'Operations & Scale', required: true, inputType: 'number', placeholder: 'Total employees (male + female)' },
      { id: 'req_investment', title: 'Investment/turnover information', category: 'Operations & Scale', required: false, inputType: 'text', condition: 'where required', placeholder: 'Approximate investment in plant & machinery and turnover' },
      { id: 'req_extra_doc', title: 'Additional business document / electricity bill', category: 'Optional Documents', required: false, inputType: 'file', condition: 'optional / if available', acceptedFormats: ['PDF', 'JPG', 'PNG'] }
    ]
  }
};

const FORM_STEPS = [
  { id: 1, title: 'Contact', desc: 'Applicant details' },
  { id: 2, title: 'Service Details', desc: 'Questionnaire' },
  { id: 3, title: 'Documents', desc: 'Secure uploads' },
  { id: 4, title: 'Review & Submit', desc: 'Final confirmation' }
];

export default function DocumentationApplyPlaceholderPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-step navigation state (1: Contact, 2: Questionnaire, 3: Documents, 4: Review)
  const [currentStep, setCurrentStep] = useState(1);

  // Applicant contact form state
  const [applicant, setApplicant] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [applicantErrors, setApplicantErrors] = useState({});
  const [emailFormatValid, setEmailFormatValid] = useState(false);
  const [mobileFormatValid, setMobileFormatValid] = useState(false);

  // Dynamic answers to text/select/date requirement fields: { [fieldId]: string }
  const [fieldAnswers, setFieldAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Uploaded document records: { [reqId]: { storageKey, documentId, name, originalFilename, fileSize, mimeType, uploaded, error, isUploading } }
  const [documentStates, setDocumentStates] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});
  const fileInputRefs = useRef({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Scroll to top on step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Load documentation service from backend or fallback
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        let data = await documentationService.getServiceBySlug(slug);
        const fallback = FALLBACK_SERVICES[slug];

        // Merge backend data with fallback requirements if backend has empty or unconfigured requirements
        if (!data && fallback) {
          data = fallback;
        } else if (data && fallback && (!Array.isArray(data.requirements) || data.requirements.length === 0)) {
          data = { ...fallback, ...data, requirements: fallback.requirements };
        }

        if (isMounted && data) {
          setService(data);

          const initialDocs = {};
          const initialAnswers = {};
          const reqs = Array.isArray(data.requirements) && data.requirements.length > 0
            ? data.requirements
            : (fallback?.requirements || []);

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
              // Sensible initial dropdown selections
              if (r.inputType === 'select' && Array.isArray(r.options) && r.options.length > 0) {
                initialAnswers[key] = r.options[0];
              }
            }
          });

          setDocumentStates(initialDocs);
          setFieldAnswers(initialAnswers);
        }
      } catch (err) {
        console.warn('Failed to load service for apply page:', err);
        if (FALLBACK_SERVICES[slug] && isMounted) {
          setService(FALLBACK_SERVICES[slug]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [slug]);

  // Active requirements lists
  const allRequirements = useMemo(() => {
    if (!service) return [];
    if (Array.isArray(service.requirements) && service.requirements.length > 0) {
      return service.requirements.filter((r) => r.isActive !== false);
    }
    return FALLBACK_SERVICES[slug]?.requirements || [];
  }, [service, slug]);

  // Helper to determine if a conditional requirement is currently visible
  const isRequirementVisible = (req) => {
    if (!req.conditionField || !req.conditionValue) return true;

    // Find the value of conditionField in answers or applicant
    let currentVal = '';
    const condFieldKey = req.conditionField.toLowerCase().trim();

    // Check applicant fields
    if (condFieldKey === 'email') currentVal = applicant.email;
    else if (condFieldKey === 'phone' || condFieldKey === 'mobile') currentVal = applicant.phone;
    else {
      // Check fieldAnswers by matching field key or title
      for (const [key, val] of Object.entries(fieldAnswers)) {
        const matchingReq = allRequirements.find((r) => (r._id || r.id) === key);
        const reqTitle = (matchingReq?.title || '').toLowerCase().trim();
        if (
          key.toLowerCase() === condFieldKey ||
          reqTitle === condFieldKey ||
          (condFieldKey === 'purpose' && reqTitle.includes('purpose')) ||
          (condFieldKey === 'entitytype' && (reqTitle.includes('entity') || reqTitle.includes('business type'))) ||
          (condFieldKey === 'incometype' && (reqTitle.includes('income category') || reqTitle.includes('income type')))
        ) {
          currentVal = val;
          break;
        }
      }
    }

    if (!currentVal) return false;

    const targets = req.conditionValue.split(',').map((t) => t.trim().toLowerCase());
    const valLower = String(currentVal).toLowerCase().trim();
    return targets.some((target) => valLower.includes(target) || target.includes(valLower));
  };

  // Filtered visible question fields (non-file)
  const visibleQuestionFields = useMemo(() => {
    return allRequirements
      .filter((r) => r.inputType && r.inputType !== 'file')
      .filter(isRequirementVisible);
  }, [allRequirements, fieldAnswers, applicant]);

  // Filtered visible document uploads
  const visibleDocumentFields = useMemo(() => {
    return allRequirements
      .filter((r) => r.inputType === 'file' || !r.inputType)
      .filter(isRequirementVisible);
  }, [allRequirements, fieldAnswers, applicant]);

  // Group questionnaire fields by category
  const categorizedQuestions = useMemo(() => {
    const groups = {};
    visibleQuestionFields.forEach((q) => {
      const cat = q.category || 'Service Details';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(q);
    });
    return groups;
  }, [visibleQuestionFields]);

  // Group documents by category
  const categorizedDocuments = useMemo(() => {
    const groups = {};
    visibleDocumentFields.forEach((d) => {
      const cat = d.category || 'Required Documents';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [visibleDocumentFields]);

  // Contact Field Validation
  const handleApplicantChange = (field, value) => {
    setApplicant((prev) => ({ ...prev, [field]: value }));

    if (field === 'email') {
      const check = validateEmail(value);
      setEmailFormatValid(check.isValid);
      if (applicantErrors.email) {
        setApplicantErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    }

    if (field === 'phone') {
      const check = validatePhone(value);
      setMobileFormatValid(check.isValid);
      if (applicantErrors.phone) {
        setApplicantErrors((prev) => {
          const next = { ...prev };
          delete next.phone;
          return next;
        });
      }
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

  const handleApplicantBlur = (field) => {
    if (field === 'name') {
      if (!applicant.name.trim()) return;
      const check = validateName(applicant.name);
      if (!check.isValid) {
        setApplicantErrors((prev) => ({ ...prev, name: check.error }));
      }
    } else if (field === 'email') {
      if (!applicant.email.trim()) return;
      const check = validateEmail(applicant.email);
      if (!check.isValid) {
        setEmailFormatValid(false);
        setApplicantErrors((prev) => ({ ...prev, email: check.error }));
      } else {
        setEmailFormatValid(true);
      }
    } else if (field === 'phone') {
      if (!applicant.phone.trim()) return;
      const check = validatePhone(applicant.phone);
      if (!check.isValid) {
        setMobileFormatValid(false);
        setApplicantErrors((prev) => ({ ...prev, phone: check.error }));
      } else {
        setMobileFormatValid(true);
      }
    }
  };

  // Questionnaire Field Changes
  const handleAnswerChange = (key, value) => {
    setFieldAnswers((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (submitError) setSubmitError('');
  };

  // Real Cloudflare R2 Upload
  const handleFileUpload = async (key, event, doc) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so user can re-select same file if needed
    event.target.value = '';

    const maxSizeMb = Number(doc?.maxSizeMb) || 25;
    const MAX_SIZE_BYTES = maxSizeMb * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      setDocumentStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          uploaded: false,
          isUploading: false,
          error: `File exceeds the configured ${maxSizeMb} MB limit. Please compress or select a smaller file.`
        }
      }));
      return;
    }

    const acceptedFormats = Array.isArray(doc?.acceptedFormats) && doc.acceptedFormats.length > 0
      ? doc.acceptedFormats
      : ['PDF', 'JPG', 'JPEG', 'PNG', 'WEBP', 'DOCX'];

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toUpperCase() : '';
    const isAllowed = acceptedFormats.map((f) => f.toUpperCase()).includes(fileExt);

    if (!isAllowed) {
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

    const prevStorageKey = documentStates[key]?.storageKey || '';
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
      formData.append('documentType', doc.title || 'Documentation File');
      formData.append('serviceType', 'DOCUMENTATION');
      if (service?._id) formData.append('serviceId', service._id);
      if (prevStorageKey) formData.append('previousStorageKey', prevStorageKey);

      const result = await documentService.uploadDocumentDirect(formData);

      if (!result || !result.storageKey) {
        throw new Error('Upload was not confirmed by Cloudflare storage server.');
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
          uploaded: true,
          isUploading: false,
          error: null
        }
      }));

      if (documentErrors[key]) {
        setDocumentErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    } catch (uploadErr) {
      console.error('File upload failed:', uploadErr);
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

  // Step 1 Validation (Contact)
  const validateStep1 = () => {
    const errors = {};
    const nameCheck = validateName(applicant.name);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const emailCheck = validateEmail(applicant.email);
    if (!emailCheck.isValid) errors.email = emailCheck.error;

    const phoneCheck = validatePhone(applicant.phone);
    if (!phoneCheck.isValid) errors.phone = phoneCheck.error;

    setApplicantErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation (Questionnaire)
  const validateStep2 = () => {
    const errors = {};
    visibleQuestionFields.forEach((q) => {
      const isReq = q.required !== false && q.isRequired !== false;
      if (isReq) {
        const key = q._id || q.id;
        const val = fieldAnswers[key];
        const strVal = typeof val === 'string' ? val.trim() : (val !== undefined && val !== null ? String(val).trim() : '');
        if (!strVal) {
          errors[key] = `${q.title} is required.`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 Validation (Documents)
  const validateStep3 = () => {
    const errors = {};
    visibleDocumentFields.forEach((d) => {
      const isReq = d.required !== false && d.isRequired !== false;
      if (isReq) {
        const key = d._id || d.id;
        const docState = documentStates[key];
        if (!docState?.uploaded || !docState?.storageKey) {
          errors[key] = `${d.title} is required. Please upload a clear copy.`;
        }
      }
    });

    setDocumentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step Navigation Handlers
  const handleNextStep = () => {
    setSubmitError('');
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setSubmitError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final Submission to Backend
  const handleSubmitApplication = async () => {
    setSubmitError('');

    // Re-verify all steps before submitting
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    try {
      const docsToSubmit = Object.entries(documentStates)
        .filter(([_, state]) => state.uploaded && state.storageKey)
        .map(([key, state]) => {
          const reqItem = allRequirements.find((r) => (r._id || r.id) === key);
          return {
            documentType: reqItem?.title || state.name || 'Supporting Document',
            name: state.name || state.originalFilename || 'Document',
            originalFilename: state.originalFilename || state.name,
            storageKey: state.storageKey,
            mimeType: state.mimeType,
            fileSize: state.fileSize
          };
        });

      // Format answers map cleanly with readable labels
      const formattedAnswers = { ...fieldAnswers };
      visibleQuestionFields.forEach((q) => {
        const key = q._id || q.id;
        if (fieldAnswers[key] !== undefined) {
          formattedAnswers[q.title] = fieldAnswers[key];
        }
      });

      const payload = {
        serviceId: service?._id || null,
        serviceSlug: service?.slug || slug,
        serviceTitle: service?.title || (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'Documentation Service'),
        applicant: {
          name: applicant.name.trim(),
          email: applicant.email.trim(),
          phone: applicant.phone.trim()
        },
        details: formattedAnswers,
        documents: docsToSubmit,
        price: service?.serviceFee || service?.price || 999
      };

      const result = await documentationService.submitRequest(payload);
      setSubmissionSuccess(result);
    } catch (err) {
      console.error('Submission error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit application. Please check all fields and try again.';
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceTitle = service?.title || (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'Documentation Service');
  const servicePrice = service?.serviceFee !== undefined
    ? `₹${Number(service.serviceFee).toLocaleString('en-IN')}`
    : (service?.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : '₹999');

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Loading state guard
  if (isLoading) {
    return (
      <div className="bg-[#FAFBFD] min-h-[75vh] flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
        <p className="text-sm font-bold text-[#082B61]">Loading application form...</p>
      </div>
    );
  }

  // SUCCESS CONFIRMATION VIEW
  if (submissionSuccess) {
    return (
      <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Application Successfully Registered
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] mt-2 tracking-tight">
              {serviceTitle} Application Received
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              Your details and uploaded documents have been securely processed and stored. A NimuFly documentation specialist will review your file and prepare your verified documents.
            </p>
          </div>

          {/* Reference pill */}
          <div className="p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 inline-block text-left w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Application Reference Number
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-[#2563EB] tracking-wider block mt-0.5">
              {submissionSuccess.requestId || 'DOC-CONFIRMED'}
            </span>
          </div>

          {/* Applicant & Documents Summary */}
          <div className="text-left bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Applicant:</span>
              <span className="font-bold text-[#082B61]">{applicant.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Email / Mobile:</span>
              <span className="font-semibold text-slate-700">{applicant.email} • {applicant.phone}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Expected Turnaround:</span>
              <span className="font-bold text-emerald-600">{service?.processingTime || '24–48 Hours'}</span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#082B61] mb-1.5">
                Attached Documents ({submissionSuccess.documents?.length || Object.values(documentStates).filter(s => s.uploaded).length})
              </h4>
              <div className="space-y-1 text-xs text-slate-600">
                {(submissionSuccess.documents || Object.values(documentStates).filter(s => s.uploaded)).map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check size={13} className="text-emerald-600 stroke-[3]" />
                    <span className="font-semibold text-slate-700">{doc.documentType || doc.name}</span>
                    {doc.originalFilename && <span className="text-[11px] text-slate-400 font-mono">({doc.originalFilename})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/documentation"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition text-center"
            >
              Back to Documentation Services
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition text-center shadow-xs"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Back Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to={`/documentation/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition"
          >
            <ArrowLeft size={14} />
            <span>Back to {serviceTitle} overview</span>
          </Link>

          <span className="text-xs font-bold text-[#082B61] bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Clock size={12} className="text-[#2563EB]" />
            <span>Turnaround: {service?.processingTime || '24–48 Hours'}</span>
          </span>
        </div>

        {/* Hero Card with Service Details & Price */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                {service?.category || 'Consulate & Government Documentation'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight mt-0.5">
                {serviceTitle} Application
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-2xl leading-relaxed">
                {service?.description || service?.shortDescription || 'Complete the intake questionnaire and attach supporting documents. Our specialists will format and prepare your consulate-compliant file.'}
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-0 border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Fee</span>
              <span className="text-2xl sm:text-3xl font-black text-[#082B61] block">{servicePrice}</span>
              <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">All taxes included</span>
            </div>
          </div>

          {/* Legend for Required Fields */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-rose-500 font-bold">*</span>
              <span>Indicates required field</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Lock size={12} className="text-[#2563EB]" />
              <span>Encrypted Cloudflare R2 Storage</span>
            </div>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
          <div className="grid grid-cols-4 gap-2">
            {FORM_STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (isPast) setCurrentStep(step.id);
                  }}
                  disabled={!isPast && currentStep !== step.id}
                  className={`flex flex-col sm:flex-row items-center gap-2 p-2 rounded-xl text-left transition cursor-pointer disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-blue-50 text-[#2563EB] font-bold border border-blue-200/60'
                      : isPast
                      ? 'text-slate-700 font-semibold hover:bg-slate-50'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check size={12} strokeWidth={3} /> : step.id}
                  </div>
                  <div className="text-center sm:text-left min-w-0">
                    <span className="text-[11px] sm:text-xs block truncate leading-tight font-bold">{step.title}</span>
                    <span className="text-[9px] sm:text-[10px] hidden sm:block text-slate-400 truncate">{step.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error notification banner if any */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-medium">
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Submission Problem</span>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: APPLICANT & CONTACT DETAILS                       */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#082B61]">1. Applicant & Contact Information</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Provide your primary contact details for status updates, notifications, and finalized document delivery.
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={applicant.name}
                    onChange={(e) => handleApplicantChange('name', e.target.value)}
                    onBlur={() => handleApplicantBlur('name')}
                    placeholder="As printed on passport / official ID"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                      applicantErrors.name
                        ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                        : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                    }`}
                  />
                </div>
                {applicantErrors.name && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>{applicantErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Two Column Row: Email and Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={applicant.email}
                      onChange={(e) => handleApplicantChange('email', e.target.value)}
                      onBlur={() => handleApplicantBlur('email')}
                      placeholder="e.g. name@example.com"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                        applicantErrors.email
                          ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                          : emailFormatValid
                          ? 'border-emerald-300 bg-emerald-50/20 text-slate-900 focus:border-emerald-500'
                          : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                      }`}
                    />
                    {emailFormatValid && (
                      <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 stroke-[3]" />
                    )}
                  </div>
                  {applicantErrors.email ? (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>{applicantErrors.email}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Format validation only — no email OTP required.</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={applicant.phone}
                      onChange={(e) => handleApplicantChange('phone', e.target.value)}
                      onBlur={() => handleApplicantBlur('phone')}
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                        applicantErrors.phone
                          ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                          : mobileFormatValid
                          ? 'border-emerald-300 bg-emerald-50/20 text-slate-900 focus:border-emerald-500'
                          : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                      }`}
                    />
                    {mobileFormatValid && (
                      <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 stroke-[3]" />
                    )}
                  </div>
                  {applicantErrors.phone ? (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>{applicantErrors.phone}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Exactly 10 digits for Indian numbers, excluding +91.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Step 1 of 4</span>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Continue to Service Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: SERVICE DETAILS & QUESTIONNAIRE                  */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#082B61]">2. {serviceTitle} Specific Details</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Please complete the following details so NimuFly can accurately tailor and draft your embassy-compliant documentation.
              </p>
            </div>

            {/* Special Notice for Financial & Government Services */}
            {(slug === 'itr' || slug === 'msme') && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3 text-amber-900 text-xs">
                <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Strict Privacy & Zero Authentication Secrets Notice</span>
                  <span>
                    NimuFly will <strong>never</strong> ask you to enter net banking passwords, Aadhaar OTPs, or government authentication credentials. We only collect the necessary business and identification details to prepare your forms.
                  </span>
                </div>
              </div>
            )}

            {/* Dynamic Categorized Questionnaire Fields */}
            {Object.keys(categorizedQuestions).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No specific questionnaire required for this service. Proceed to document uploads.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(categorizedQuestions).map(([categoryName, fields]) => (
                  <div key={categoryName} className="space-y-4 pt-2">
                    <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#082B61]">
                        {categoryName}
                      </h3>
                      <span className="text-[11px] text-slate-400">{fields.length} {fields.length === 1 ? 'field' : 'fields'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {fields.map((field) => {
                        const key = field._id || field.id;
                        const isRequired = field.required !== false && field.isRequired !== false;
                        const isFullWidth = field.inputType === 'textarea' || (field.title && field.title.length > 30);
                        const hasError = fieldErrors[key];

                        return (
                          <div key={key} className={isFullWidth ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              {field.title} {isRequired ? <span className="text-rose-500">*</span> : <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>}
                            </label>

                            {/* SELECT INPUT */}
                            {field.inputType === 'select' ? (
                              <select
                                value={fieldAnswers[key] || ''}
                                onChange={(e) => handleAnswerChange(key, e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition bg-slate-50/50 ${
                                  hasError
                                    ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                                    : 'border-slate-200 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                                }`}
                              >
                                {(!field.options || field.options.length === 0) && (
                                  <option value="">Select option</option>
                                )}
                                {field.options?.map((opt, i) => (
                                  <option key={i} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.inputType === 'textarea' ? (
                              /* TEXTAREA INPUT */
                              <textarea
                                rows={3}
                                value={fieldAnswers[key] || ''}
                                onChange={(e) => handleAnswerChange(key, e.target.value)}
                                placeholder={field.placeholder || `Enter ${field.title.toLowerCase()}...`}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition resize-none ${
                                  hasError
                                    ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                                    : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                                }`}
                              />
                            ) : (
                              /* TEXT / NUMBER / DATE INPUT */
                              <input
                                type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
                                value={fieldAnswers[key] || ''}
                                onChange={(e) => handleAnswerChange(key, e.target.value)}
                                placeholder={field.placeholder || `Enter ${field.title.toLowerCase()}...`}
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                                  hasError
                                    ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500'
                                    : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white'
                                }`}
                              />
                            )}

                            {field.description && (
                              <p className="text-[10px] text-slate-400 mt-1">{field.description}</p>
                            )}
                            {hasError && (
                              <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>{hasError}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Continue to Document Uploads</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: DOCUMENT UPLOADS                                 */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#082B61]">3. Upload Supporting Documents</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Upload clear, high-resolution scans or photos. Files are directly stored in private, encrypted Cloudflare R2 storage.
              </p>
            </div>

            {/* Categorized Document Upload List */}
            {Object.keys(categorizedDocuments).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No document uploads required for this service.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(categorizedDocuments).map(([categoryName, docItems]) => (
                  <div key={categoryName} className="space-y-4 pt-1">
                    <div className="border-b border-slate-100 pb-1.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#082B61]">
                        {categoryName}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {docItems.map((doc) => {
                        const key = doc._id || doc.id;
                        const isReq = doc.required !== false && doc.isRequired !== false;
                        const docState = documentStates[key] || {};
                        const hasError = documentErrors[key] || docState.error;
                        const formats = doc.acceptedFormats || ['PDF', 'JPG', 'PNG'];
                        const maxSize = doc.maxSizeMb || 25;

                        return (
                          <div
                            key={key}
                            className={`p-4 sm:p-5 rounded-2xl border transition ${
                              docState.uploaded
                                ? 'bg-emerald-50/30 border-emerald-300'
                                : hasError
                                ? 'bg-rose-50/20 border-rose-300'
                                : 'bg-slate-50/50 border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left Document Details */}
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-[#082B61]">
                                    {doc.title}
                                  </h4>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      isReq
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                  >
                                    {isReq ? 'Required *' : 'Optional'}
                                  </span>
                                  {doc.condition && (
                                    <span className="text-[10px] text-slate-400 italic">
                                      ({doc.condition})
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {doc.description || `Supported: ${formats.join(', ')} • Max ${maxSize} MB`}
                                </p>
                              </div>

                              {/* Right Upload Action Area */}
                              <div className="shrink-0 flex items-center gap-2">
                                <input
                                  type="file"
                                  ref={(el) => (fileInputRefs.current[key] = el)}
                                  onChange={(e) => handleFileUpload(key, e, doc)}
                                  className="hidden"
                                  accept={formats.map((f) => `.${f.toLowerCase()}`).join(',')}
                                />

                                {docState.isUploading ? (
                                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Uploading to Cloudflare...</span>
                                  </div>
                                ) : docState.uploaded ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                                      <Check size={14} strokeWidth={3} className="text-emerald-600" />
                                      <span className="truncate max-w-[150px]">{docState.name}</span>
                                      <span className="text-[10px] text-emerald-600 font-mono">({formatBytes(docState.fileSize)})</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.current[key]?.click()}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 transition cursor-pointer"
                                      title="Replace file"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDocument(key)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                      title="Remove file"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[key]?.click()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#082B61] border border-slate-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                                  >
                                    <Upload size={14} className="text-[#2563EB]" />
                                    <span>Choose File</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Error inline message */}
                            {hasError && (
                              <p className="text-[11px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>{hasError}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3 Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Review Application Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: REVIEW & SUBMIT                                  */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#082B61]">4. Review Details & Submit</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Carefully review all applicant information, service answers, and uploaded documentation before final submission.
              </p>
            </div>

            {/* Review Section 1: Contact Details */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#082B61]">
                  Applicant Contact Details
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Full Name</span>
                  <span className="font-bold text-slate-800">{applicant.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Email Address</span>
                  <span className="font-bold text-slate-800">{applicant.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Mobile Number</span>
                  <span className="font-bold text-slate-800">{applicant.phone}</span>
                </div>
              </div>
            </div>

            {/* Review Section 2: Service Responses */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#082B61]">
                  Service Questionnaire Responses
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              {visibleQuestionFields.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No specific questionnaire answers.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {visibleQuestionFields.map((q) => {
                    const key = q._id || q.id;
                    const val = fieldAnswers[key];
                    return (
                      <div key={key}>
                        <span className="text-slate-400 font-medium block text-[10px]">{q.title}</span>
                        <span className="font-bold text-slate-800">
                          {val ? String(val) : <em className="text-slate-400 font-normal">Not provided</em>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Review Section 3: Uploaded Documents */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#082B61]">
                  Attached Documentation Files
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-2">
                {visibleDocumentFields.map((d) => {
                  const key = d._id || d.id;
                  const docState = documentStates[key];
                  const hasFile = docState?.uploaded && docState?.storageKey;

                  return (
                    <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 last:border-0">
                      <div className="flex items-center gap-2">
                        {hasFile ? (
                          <Check size={14} className="text-emerald-600 stroke-[3]" />
                        ) : (
                          <Paperclip size={14} className="text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-800">{d.title}</span>
                      </div>

                      <div>
                        {hasFile ? (
                          <span className="text-emerald-600 font-bold font-mono text-[11px]">
                            {docState.name} ({formatBytes(docState.fileSize)})
                          </span>
                        ) : d.required !== false && d.isRequired !== false ? (
                          <span className="text-rose-500 font-bold text-[11px]">Missing (Required)</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Optional (Not uploaded)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Confirmation & Disclaimer */}
            <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] block">Payable Summary</span>
                <h4 className="text-sm font-extrabold text-[#082B61]">{serviceTitle} Professional Fee</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Includes document preparation, consulate standard formatting, and CA/specialist verification.
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <span className="text-2xl font-black text-[#082B61] block">{servicePrice}</span>
                <span className="text-[10px] text-slate-500 font-medium">Standard Processing ({service?.processingTime || '24–48 Hours'})</span>
              </div>
            </div>

            {/* Step 4 Actions: Final Submit */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Submit Application</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
