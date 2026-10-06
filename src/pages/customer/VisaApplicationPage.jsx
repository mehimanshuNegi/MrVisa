import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Upload,
  Check,
  Smartphone,
  Clock,
  AlertCircle,
  QrCode,
  X,
  RefreshCw,
  Lock,
  Edit3,
  Building2,
  Loader2,
  Star
} from 'lucide-react';
import { visaService, countryService, applicationService } from '../../services';
import PassportPhotoUploadCard from '../../components/visa/PassportPhotoUploadCard';
import { APPLICATION_STATUS, REQUIRED_ACTION } from '../../constants/status';
import {
  validatePassportDates,
  validatePassportIssueDate,
  validateMinimumPassportValidity,
  calculateAge,
  validateDateOfBirth,
  validateAgeEligibility,
  formatDateToISO
} from '../../utils';
import {
  determinePassportUploadFlow,
  getNextPassportStep,
  shouldShowBackUploadStep,
  isPdfPassport
} from '../../utils/passportFlow';

export default function VisaApplicationPage() {
  const { country: countryParam, visaId: visaParam } = useParams();
  const location = useLocation();

  // Find destination matching URL param via visaService
  const [destination, setDestination] = useState(null);
  const [isLoadingVisa, setIsLoadingVisa] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadVisaData() {
      setIsLoadingVisa(true);
      setLoadError(null);
      try {
        let found = null;
        // 1. Try explicit visaParam if provided
        if (visaParam) {
          found = await visaService.getVisaById(visaParam);
        }
        // 2. Try countryParam directly as visa ID or countryId
        if (!found && countryParam) {
          found = await visaService.getVisaById(countryParam);
        }
        // 3. Try finding all visas for this country
        if (!found && countryParam) {
          const countryVisas = await visaService.getVisasByCountry(countryParam);
          if (countryVisas && countryVisas.length > 0) {
            found = countryVisas[0];
          }
        }
        // 4. Fallback: check if countryParam matches a country record with linked visas
        if (!found && countryParam) {
          const countryData = await countryService.getCountryById(countryParam);
          if (countryData && Array.isArray(countryData.visas) && countryData.visas.length > 0) {
            found = await visaService.getVisaById(countryData.visas[0]);
          }
        }

        if (isMounted) {
          if (found) {
            setDestination(found);
          } else {
            setLoadError(`We couldn't locate visa details for "${countryParam || visaParam}".`);
          }
        }
      } catch (e) {
        console.warn('Failed to load visa in application page:', e);
        if (isMounted) {
          setLoadError('Failed to load visa details. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingVisa(false);
        }
      }
    }
    loadVisaData();
    return () => { isMounted = false; };
  }, [countryParam, visaParam]);

  // Extract initial traveller count if provided from Visa Details page
  const queryParams = new URLSearchParams(location.search);
  const initialTravellerCount = parseInt(
    queryParams.get('travellers') || location.state?.travellerCount || '1',
    10
  );
  const validCount = isNaN(initialTravellerCount) || initialTravellerCount < 1 ? 1 : Math.min(8, initialTravellerCount);

  // Navigation steps: 'name' | 'passport_upload' | 'passport_processing' | 'passport_back_upload' | 'passport_back_processing' | 'passport_review' | 'passport_photo' | 'travellers' | 'documents' | 'review' | 'payment'
  const [currentStep, setCurrentStep] = useState('name');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [applicationId] = useState(() => 'MV-' + Math.floor(100000 + Math.random() * 900000));

  // Passport-size photograph upload state
  const [passportPhotoFile, setPassportPhotoFile] = useState(null);
  const [passportPhotoPreviewUrl, setPassportPhotoPreviewUrl] = useState('');
  const [isUploadingPassportPhoto, setIsUploadingPassportPhoto] = useState(false);
  const [passportPhotoValidation, setPassportPhotoValidation] = useState(null);
  const [passportPhotoDoc, setPassportPhotoDoc] = useState(null);
  const [passportPhotoError, setPassportPhotoError] = useState(null);

  // Passport-First OCR Flow States (Two-Stage: Front Bio Page + Back Second Page)
  const [applicantFullName, setApplicantFullName] = useState('');
  const [nameStepError, setNameStepError] = useState('');
  const [passportFile, setPassportFile] = useState(null);
  const [passportPreviewUrl, setPassportPreviewUrl] = useState('');
  const [passportBackFile, setPassportBackFile] = useState(null);
  const [passportBackPreviewUrl, setPassportBackPreviewUrl] = useState('');
  const [_isProcessingPassport, setIsProcessingPassport] = useState(false);
  const passportFileInputRef = useRef(null);
  const passportBackInputRef = useRef(null);
  const [frontDetectedSuccess, setFrontDetectedSuccess] = useState(false);
  const [passportUploadError, setPassportUploadError] = useState(null);
  const [passportBackUploadError, setPassportBackUploadError] = useState(null);
  const [consistencyMismatches, setConsistencyMismatches] = useState([]);
  const [isOcrNameAuthoritative, setIsOcrNameAuthoritative] = useState(false);
  const [ocrStages, setOcrStages] = useState([
    { id: 'image_checked', label: 'Image quality checked', status: 'pending' },
    { id: 'passport_detected', label: 'Passport detected', status: 'pending' },
    { id: 'mrz_detected', label: 'Document format verified', status: 'pending' },
    { id: 'extracting_details', label: 'Extracting details', status: 'pending' },
    { id: 'verifying_details', label: 'Verifying information', status: 'pending' }
  ]);
  const [ocrExtractedData, setOcrExtractedData] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    passportNumber: '',
    dateOfBirth: '',
    nationality: 'Indian',
    gender: 'Male',
    issueDate: '',
    expiryDate: '',
    placeOfIssue: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    address: '',
    fileNumber: ''
  });
  const [ocrFieldStatus, setOcrFieldStatus] = useState({});
  const [ocrUploadedDoc, setOcrUploadedDoc] = useState(null);
  const [ocrBackUploadedDoc, setOcrBackUploadedDoc] = useState(null);
  const [ocrReviewErrors, setOcrReviewErrors] = useState({});

  // Payment method selection: 'upi' | 'card' | 'netbanking'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentErrors, setPaymentErrors] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Flag set to true when user presses Continue and there are errors
  const [submittedAttempted, setSubmittedAttempted] = useState(false);

  // Upload progress animation states: { [`${travellerId}_${docType}`]: progressNumber (0-100) }
  const [uploadingProgress, setUploadingProgress] = useState({});

  // QR / Phone upload modal state
  const [showPhoneUploadModal, setShowPhoneUploadModal] = useState(false);
  const [phoneUploadSuccess, setPhoneUploadSuccess] = useState(false);

  // Additional information & Previous refusal states
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [previousVisaRefusal, setPreviousVisaRefusal] = useState(false);
  const [previousVisaRefusalReason, setPreviousVisaRefusalReason] = useState('');

  // Post-submission Feedback / Rating states
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Field refs for smooth scroll & focus
  const fieldRefs = useRef({});
  const docCardRefs = useRef({});
  const docInputRefs = useRef({});

  // Travellers list state
  const [travellers, setTravellers] = useState(() => {
    return Array.from({ length: validCount }, (_, i) => ({
      id: `t_${Date.now()}_${i}`,
      firstName: '',
      lastName: '',
      dob: '',
      gender: 'Male',
      nationality: 'Indian',
      email: '',
      phone: '',
      passportNumber: '',
      issueDate: '',
      expiryDate: '',
      placeOfIssue: '',
      docs: {}
    }));
  });

  const [activeTravellerId, setActiveTravellerId] = useState(travellers[0]?.id || '');

  // Scroll to top on step or submission change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, isSubmitted]);

  // Safety guard: Ensure PDF path cannot accidentally trigger back-side upload screen
  useEffect(() => {
    if (currentStep === 'passport_back_upload' && isPdfPassport(passportFile)) {
      const timer = setTimeout(() => {
        setCurrentStep('passport_review');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentStep, passportFile]);

  // Dynamic document requirements per selected visa destination (Admin-configured in MongoDB, no hardcoded fallbacks!)
  const requiredDocs = React.useMemo(() => {
    const rawList = destination?.requiredDocuments || destination?.documentsRequired || destination?.documents;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return [];
    }

    return rawList.map((doc, idx) => {
      const docName = typeof doc === 'string' ? doc : (doc?.name || doc?.title || `Document ${idx + 1}`);
      const lower = docName.toLowerCase();
      const isReq = typeof doc === 'object' && doc !== null
        ? (doc.required !== false && doc.isRequired !== false)
        : true;

      // Identify whether requirement is photograph or passport scan
      const isPhoto = lower.includes('photo') || lower.includes('photograph') || lower.includes('portrait');
      const isPassport = !isPhoto && lower.includes('passport');

      let id = (typeof doc === 'object' && doc?.id) ? doc.id : null;
      if (!id) {
        if (isPhoto) id = 'passport_photo';
        else if (isPassport) id = 'passport';
        else id = `doc_${idx}_${docName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      const title = (typeof doc === 'object' && (doc?.title || doc?.name)) ? (doc.title || doc.name) : docName;
      const acceptedFormats = Array.isArray(doc?.acceptedFormats) && doc.acceptedFormats.length > 0
        ? doc.acceptedFormats.map((f) => String(f).toUpperCase())
        : (isPhoto ? ['JPG', 'JPEG', 'PNG'] : ['PDF', 'JPG', 'PNG']);
      const formatsLabel = acceptedFormats.join(', ');
      const readableFormats = acceptedFormats.length === 1
        ? acceptedFormats[0]
        : `${acceptedFormats.slice(0, -1).join(', ')} or ${acceptedFormats[acceptedFormats.length - 1]}`;

      const subtitle = (typeof doc === 'object' && (doc?.subtitle || doc?.description))
        ? (doc.subtitle || doc.description)
        : `${formatsLabel} (Max 5 MB)`;
      const guidance = (typeof doc === 'object' && (doc?.guidance || doc?.detail || doc?.description))
        ? (doc.guidance || doc.detail || doc.description)
        : (
          isPhoto
            ? 'Recent colored photo with white background, 35mm x 45mm.'
            : isPassport
            ? 'Clear scan of bio and address page. All 4 corners visible.'
            : 'Upload a clear, readable copy.'
        );
      const errorMsg = `Please upload a valid ${readableFormats} file.`;

      return {
        id,
        name: docName,
        title,
        subtitle,
        guidance,
        errorMsg,
        acceptedFormats,
        formatsLabel,
        required: isReq,
        isRequired: isReq,
        isPhoto,
        isPassport
      };
    });
  }, [destination]);

  // Loading State Guard
  if (isLoadingVisa) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
        <p className="text-sm font-bold text-[#082B61]">Loading visa application...</p>
      </div>
    );
  }

  // Not Found State Guard
  if (!destination) {
    return (
      <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#082B61]">Destination Not Found</h2>
        <p className="text-sm text-[#64748B] mt-2 mb-6 max-w-md">
          {loadError || `We couldn't locate visa details for "${countryParam || visaParam}". Please choose a destination from our visa catalogue.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {countryParam && (
            <Link
              to={`/visa/${countryParam}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#082B61] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#123B7A] transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Return to Visa Details</span>
            </Link>
          )}
          <Link
            to="/visa"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#123B7A] transition-colors"
          >
            <span>Browse All Visa Destinations</span>
          </Link>
        </div>
      </div>
    );
  }

  const {
    displayName = destination?.countryName || countryParam || 'Visa',
    flagUrl = '',
    flagEmoji = '🌍',
    visaType = 'E-Visa',
    stayPeriod = '60 Days',
    guaranteedDate = '24 Sep 2026, 4:00 PM'
  } = destination || {};

  const visaBackLink = countryParam && visaParam
    ? `/visa/${countryParam}/${visaParam}`
    : (countryParam ? `/visa/${countryParam}` : `/visa/${destination.id}`);

  // Strictly database-driven fee calculation: missing -> 0
  const embassyFeePerPerson = destination?.governmentFee !== undefined && destination?.governmentFee !== null && !isNaN(Number(destination.governmentFee))
    ? Number(destination.governmentFee)
    : 0;
  const serviceFeePerPerson = destination?.serviceFee !== undefined && destination?.serviceFee !== null && !isNaN(Number(destination.serviceFee))
    ? Number(destination.serviceFee)
    : 0;
  const totalEmbassyFee = embassyFeePerPerson * travellers.length;
  const totalServiceFee = serviceFeePerPerson * travellers.length;
  const totalFee = totalEmbassyFee + totalServiceFee;

  const effectiveActiveId = travellers.some((t) => t.id === activeTravellerId)
    ? activeTravellerId
    : travellers[0]?.id || '';
  const activeTraveller = travellers.find((t) => t.id === effectiveActiveId) || travellers[0] || {};
  const activeIndex = travellers.findIndex((t) => t.id === effectiveActiveId);

  // ------------------------------------------------------------------
  // FIELD VALIDATION RULES (Precise, readable messages)
  // ------------------------------------------------------------------
  const getFieldError = (t, field, isPrimary = false) => {
    const val = (t[field] || '').trim();

    if (field === 'firstName') {
      if (!val) return 'First name is required';
      if (val.length < 2) return 'Enter at least 2 characters';
      return null;
    }

    if (field === 'lastName') {
      if (!val) return 'Last name is required';
      if (val.length < 2) return 'Enter at least 2 characters';
      return null;
    }

    if (field === 'dob') {
      if (!val) return 'Please enter your date of birth';
      const d = new Date(val);
      if (isNaN(d.getTime())) return 'Please enter your date of birth';
      if (d >= new Date()) return 'Date of birth must be in the past';
      return null;
    }

    if (field === 'email' && isPrimary) {
      if (!val) return 'Email address is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
      return null;
    }

    if (field === 'phone' && isPrimary) {
      if (!val) return 'Mobile number is required';
      const cleanPhone = val.replace(/[\s-+]/g, '');
      if (cleanPhone.length < 10) return 'Enter a valid 10-digit mobile number';
      return null;
    }

    if (field === 'passportNumber') {
      if (!val) return 'Passport number is required';
      if (val.length < 6) return 'Enter a valid passport number';
      return null;
    }

    if (field === 'placeOfIssue') {
      if (!val) return 'Place of issue is required';
      if (val.length < 2) return 'Enter at least 2 characters';
      return null;
    }

    if (field === 'issueDate') {
      if (!val) return 'Passport issue date is required';
      const d = new Date(val);
      if (d > new Date()) return 'Issue date cannot be in the future';
      if (t.expiryDate) {
        const dateCheck = validatePassportDates(val, t.expiryDate);
        if (!dateCheck.isValid) return dateCheck.error;
      }
      return null;
    }

    if (field === 'expiryDate') {
      if (!val) return 'Passport expiry date is required';
      const d = new Date(val);
      if (d <= new Date()) return 'Passport is expired. Must be currently valid';
      if (t.issueDate) {
        const dateCheck = validatePassportDates(t.issueDate, val);
        if (!dateCheck.isValid) return dateCheck.error;
      }
      return null;
    }

    return null;
  };

  const isFieldValid = (t, field, isPrimary = false) => {
    const error = getFieldError(t, field, isPrimary);
    const val = (t[field] || '').trim();
    return val.length > 0 && !error;
  };

  // Section-level checks
  const getPersonalInfoStatus = (t, isPrimary = false) => {
    const fields = ['firstName', 'lastName', 'dob'];
    if (isPrimary) fields.push('email', 'phone');
    const validCount = fields.filter((f) => isFieldValid(t, f, isPrimary)).length;
    return {
      completed: validCount === fields.length,
      count: validCount,
      total: fields.length
    };
  };

  const getPassportInfoStatus = (t) => {
    const fields = ['passportNumber', 'placeOfIssue', 'issueDate', 'expiryDate'];
    const validCount = fields.filter((f) => isFieldValid(t, f, false)).length;
    return {
      completed: validCount === fields.length,
      count: validCount,
      total: fields.length
    };
  };

  // Helper to resolve the matching uploaded document object for a given requirement definition
  const getDocForRequirement = (traveller, docDef) => {
    if (!traveller?.docs || !docDef) return null;
    const docs = traveller.docs;

    // 1. Direct match by exact ID
    if (docs[docDef.id]) {
      return docs[docDef.id];
    }

    // 2. Photo requirement match
    if (docDef.isPhoto || docDef.id === 'photo' || docDef.id === 'passport_photo') {
      if (docs.passport_photo) return docs.passport_photo;
      if (docs.photo) return docs.photo;
      if (docs.photograph) return docs.photograph;
    }

    // 3. Passport scan requirement match
    if (docDef.isPassport || docDef.id === 'passport' || docDef.id === 'passport_scan') {
      if (docs.passport) return docs.passport;
      if (docs.passport_front) return docs.passport_front;
    }

    // 4. Case-insensitive key/title search
    const lowerDocTitle = (docDef.title || docDef.name || '').toLowerCase();
    for (const [key, val] of Object.entries(docs)) {
      if (!val) continue;
      const lowerKey = key.toLowerCase();
      if (lowerKey === lowerDocTitle) return val;
      if (docDef.isPhoto && (lowerKey.includes('photo') || lowerKey.includes('portrait'))) return val;
      if (docDef.isPassport && lowerKey.includes('passport') && !lowerKey.includes('photo')) return val;
    }

    return null;
  };

  const getDocsStatus = (t) => {
    if (!requiredDocs || requiredDocs.length === 0) {
      return { completed: true, count: 0, total: 0, missingMandatoryDocs: [] };
    }
    if (!t?.docs) {
      const missingMandatoryDocs = requiredDocs.filter((d) => d.required !== false);
      return {
        completed: missingMandatoryDocs.length === 0,
        count: 0,
        total: requiredDocs.length,
        missingMandatoryDocs
      };
    }

    const uploadedDocs = requiredDocs.filter((d) => {
      const docData = getDocForRequirement(t, d);
      return docData && !docData.error;
    });

    const missingMandatoryDocs = requiredDocs.filter((d) => {
      if (d.required === false) return false;
      const docData = getDocForRequirement(t, d);
      return !docData || docData.error;
    });

    return {
      completed: missingMandatoryDocs.length === 0,
      count: uploadedDocs.length,
      total: requiredDocs.length,
      missingMandatoryDocs
    };
  };

  const getTravellerErrorsCount = (t, isPrimary = false, step = 'travellers') => {
    let errCount = 0;
    if (step === 'travellers') {
      const pFields = ['firstName', 'lastName', 'dob'];
      if (isPrimary) pFields.push('email', 'phone');
      pFields.forEach((f) => {
        if (!isFieldValid(t, f, isPrimary)) errCount++;
      });

      const passFields = ['passportNumber', 'placeOfIssue', 'issueDate', 'expiryDate'];
      passFields.forEach((f) => {
        if (!isFieldValid(t, f, false)) errCount++;
      });
    }

    if (step === 'documents') {
      const dStatus = getDocsStatus(t);
      return dStatus.missingMandatoryDocs?.length || 0;
    }

    return errCount;
  };

  // ------------------------------------------------------------------
  // REAL-TIME PROGRESS PERCENTAGE CALCULATION
  // ------------------------------------------------------------------
  const calculateRealProgress = () => {
    if (isSubmitted) return 100;
    if (currentStep === 'payment') return 90;
    if (currentStep === 'review') return 75;
    if (currentStep === 'name') return 10;
    if (currentStep === 'passport_upload') return 14;
    if (currentStep === 'passport_processing') return 18;
    if (currentStep === 'passport_back_upload') return 20;
    if (currentStep === 'passport_back_processing') return 23;
    if (currentStep === 'passport_review') return 25;
    if (currentStep === 'passport_photo') return 28;

    let totalPoints = 0;
    let earnedPoints = 0;

    travellers.forEach((t, i) => {
      const isPrimary = i === 0;
      const pFields = ['firstName', 'lastName', 'dob'];
      if (isPrimary) pFields.push('email', 'phone');
      pFields.forEach((f) => {
        totalPoints++;
        if (isFieldValid(t, f, isPrimary)) earnedPoints++;
      });

      const passFields = ['passportNumber', 'placeOfIssue', 'issueDate', 'expiryDate'];
      passFields.forEach((f) => {
        totalPoints++;
        if (isFieldValid(t, f, false)) earnedPoints++;
      });

      requiredDocs.forEach((d) => {
        totalPoints++;
        const docData = getDocForRequirement(t, d);
        if (docData && !docData.error) earnedPoints++;
      });
    });

    if (totalPoints === 0) return 20;
    const pct = Math.round((earnedPoints / totalPoints) * 50);
    return Math.min(50, Math.max(20, pct));
  };

  const progressPercentage = calculateRealProgress();

  // Total error count for current step
  const totalStepErrors = travellers.reduce(
    (acc, t, idx) => acc + getTravellerErrorsCount(t, idx === 0, currentStep),
    0
  );

  // ------------------------------------------------------------------
  // PASSPORT-FIRST OCR INTERACTION HANDLERS
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // PASSPORT-FIRST OCR INTERACTION HANDLERS (Two-Stage Flow)
  // ------------------------------------------------------------------
  const handleNameContinue = () => {
    if (!applicantFullName || applicantFullName.trim().length < 2) {
      setNameStepError('Please enter your full name as shown on your passport');
      return;
    }
    setNameStepError('');
    setCurrentStep('passport_upload');
  };

  // STAGE 1: FRONT / PHOTO PAGE UPLOAD
  const handlePassportFrontUpload = async (file) => {
    if (!file) return;
    const isSupported =
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) ||
      /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!isSupported) {
      alert('Please upload your passport in PDF, JPG, JPEG, PNG, or WEBP format.');
      return;
    }

    setPassportUploadError(null);
    setPassportFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPassportPreviewUrl(previewUrl);
    setCurrentStep('passport_processing');
    setIsProcessingPassport(true);
    setFrontDetectedSuccess(false);

    // Initial stage states
    setOcrStages([
      { id: 'image_checked', label: 'Image quality checked', status: 'completed' },
      { id: 'passport_detected', label: 'Passport detected', status: 'in_progress' },
      { id: 'mrz_detected', label: 'Document format verified', status: 'pending' },
      { id: 'extracting_details', label: 'Extracting details', status: 'pending' },
      { id: 'verifying_details', label: 'Verifying information', status: 'pending' }
    ]);

    const flow = determinePassportUploadFlow(file);

    try {
      const [result] = await Promise.all([
        applicationService.processPassportOcr(file, {
          fullName: applicantFullName,
          pageType: 'front',
          previousStorageKey: ocrUploadedDoc?.storageKey || ''
        }),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);

      if (result?.stages) {
        setOcrStages(result.stages);
      } else {
        setOcrStages((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
      }

      // Check wrong page or image quality failure
      if (result?.wrongPage) {
        setIsProcessingPassport(false);
        setPassportUploadError({
          type: 'wrong_page',
          message: result.message || (flow === 'pdf' ? "We couldn't read this PDF. Please upload a clearer passport scan." : "We couldn't identify a passport page in this image.")
        });
        setCurrentStep('passport_upload');
        return;
      }

      if (result?.qualityFailed) {
        setIsProcessingPassport(false);
        setPassportUploadError({
          type: 'quality',
          message: result.message || (flow === 'pdf' ? "We couldn't read this PDF. Please upload a clearer passport scan." : 'Image quality is too low to reliably read this passport.')
        });
        setCurrentStep('passport_upload');
        return;
      }

      if (result?.uploadedDocument) {
        setOcrUploadedDoc(result.uploadedDocument);
      }

      const extracted = result?.extractedData || {};
      const statusMap = result?.fieldStatus || {};
      const ocrFullName = (extracted.fullName || '').trim();
      const hasValidOcrName = ocrFullName.length >= 2;

      if (hasValidOcrName) {
        setIsOcrNameAuthoritative(true);
        setApplicantFullName(ocrFullName);
      }

      setOcrExtractedData((prev) => ({
        ...prev,
        fullName: hasValidOcrName ? ocrFullName : (prev.fullName || applicantFullName || ''),
        firstName: (hasValidOcrName && extracted.firstName) ? extracted.firstName : (extracted.firstName || (applicantFullName ? applicantFullName.split(' ')[0] : prev.firstName || '')),
        lastName: (hasValidOcrName && extracted.lastName !== undefined) ? extracted.lastName : (extracted.lastName || (applicantFullName ? applicantFullName.split(' ').slice(1).join(' ') : prev.lastName || '')),
        passportNumber: extracted.passportNumber || prev.passportNumber || '',
        dateOfBirth: extracted.dateOfBirth || prev.dateOfBirth || '',
        nationality: extracted.nationality || prev.nationality || 'Indian',
        gender: extracted.gender || prev.gender || 'Male',
        issueDate: formatDateToISO(extracted.issueDate || extracted.passportIssuedOn) || extracted.issueDate || extracted.passportIssuedOn || prev.issueDate || '',
        expiryDate: formatDateToISO(extracted.expiryDate) || extracted.expiryDate || prev.expiryDate || '',
        placeOfIssue: extracted.placeOfIssue || prev.placeOfIssue || '',
        fatherName: extracted.fatherName || prev.fatherName || '',
        motherName: extracted.motherName || prev.motherName || '',
        spouseName: extracted.spouseName || prev.spouseName || '',
        address: extracted.address || prev.address || '',
        fileNumber: extracted.fileNumber || prev.fileNumber || ''
      }));

      setOcrFieldStatus((prev) => ({
        ...prev,
        ...statusMap,
        issueDate: statusMap.issueDate || statusMap.passportIssuedOn || prev.issueDate
      }));
      setFrontDetectedSuccess(true);

      // Determine next step based on upload format (PDF -> review directly; Images -> flip passport)
      const nextStep = getNextPassportStep({ flow, ocrSuccess: true });
      setTimeout(() => {
        setIsProcessingPassport(false);
        setCurrentStep(nextStep);
      }, 1000);
    } catch (err) {
      console.warn('OCR front processing notice:', err);
      const fallbackStep = getNextPassportStep({ flow, ocrSuccess: false });
      setIsProcessingPassport(false);
      setCurrentStep(fallbackStep);
    }
  };

  // STAGE 2: BACK / SECOND PAGE UPLOAD
  const handlePassportBackUpload = async (file) => {
    if (!file) return;
    const isSupported =
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) ||
      /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
    if (!isSupported) {
      alert('Please upload your passport second page in PDF, JPG, JPEG, PNG, or WEBP format.');
      return;
    }

    setPassportBackUploadError(null);
    setPassportBackFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPassportBackPreviewUrl(previewUrl);
    setCurrentStep('passport_back_processing');
    setIsProcessingPassport(true);

    try {
      const [result] = await Promise.all([
        applicationService.processPassportOcr(file, {
          pageType: 'back',
          frontExtractedData: ocrExtractedData,
          previousStorageKey: ocrBackUploadedDoc?.storageKey || ''
        }),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);

      const stagedDoc = result?.uploadedDocument || {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: 'Passport Back Page',
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'image/jpeg'
      };
      setOcrBackUploadedDoc(stagedDoc);

      const backExtracted = result?.extractedData || {};
      const merged = result?.mergedData || {};
      const statusMap = result?.fieldStatus || {};

      setOcrExtractedData((prev) => {
        const rawIssue = merged.issueDate || merged.passportIssuedOn || prev.issueDate || prev.passportIssuedOn || '';
        return {
          ...prev,
          ...merged,
          issueDate: formatDateToISO(rawIssue) || rawIssue,
          expiryDate: formatDateToISO(merged.expiryDate) || merged.expiryDate || prev.expiryDate || '',
          dateOfBirth: merged.dateOfBirth || prev.dateOfBirth || '',
          passportNumber: merged.passportNumber || prev.passportNumber || '',
          placeOfIssue: merged.placeOfIssue || prev.placeOfIssue || '',
          fatherName: backExtracted.fatherName || merged.fatherName || prev.fatherName || '',
          motherName: backExtracted.motherName || merged.motherName || prev.motherName || '',
          spouseName: backExtracted.spouseName || merged.spouseName || prev.spouseName || '',
          address: backExtracted.address || merged.address || prev.address || '',
          fileNumber: backExtracted.fileNumber || merged.fileNumber || prev.fileNumber || ''
        };
      });

      setOcrFieldStatus((prev) => ({
        ...prev,
        ...statusMap,
        issueDate: prev.issueDate || statusMap.issueDate || statusMap.passportIssuedOn || 'MEDIUM'
      }));

      if (result?.consistency?.mismatches?.length > 0) {
        setConsistencyMismatches(result.consistency.mismatches);
      } else {
        setConsistencyMismatches([]);
      }

      setTimeout(() => {
        setIsProcessingPassport(false);
        setCurrentStep('passport_review');
      }, 500);
    } catch (err) {
      console.warn('OCR back processing notice:', err);
      const fallbackDoc = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: 'Passport Back Page',
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'image/jpeg'
      };
      setOcrBackUploadedDoc(fallbackDoc);
      setIsProcessingPassport(false);
      setCurrentStep('passport_review');
    }
  };

  const handleSkipBackPage = () => {
    setIsProcessingPassport(false);
    setCurrentStep('passport_review');
  };

  const handleSkipToManualDetails = () => {
    setIsProcessingPassport(false);
    setIsOcrNameAuthoritative(false);
    setOcrExtractedData((prev) => ({
      ...prev,
      fullName: prev.fullName || applicantFullName || '',
      firstName: prev.firstName || (applicantFullName ? applicantFullName.split(' ')[0] : ''),
      lastName: prev.lastName || (applicantFullName ? applicantFullName.split(' ').slice(1).join(' ') : '')
    }));
    setCurrentStep('passport_review');
  };

  const handleReviewFieldChange = (field, value) => {
    setOcrExtractedData((prev) => ({ ...prev, [field]: value }));
    setOcrReviewErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      delete copy.dateRule;
      delete copy.ageRule;
      return copy;
    });
  };

  const handleConfirmPassportReview = () => {
    const errors = {};
    if (!ocrExtractedData.fullName || ocrExtractedData.fullName.trim().length < 2) {
      errors.fullName = 'Full name is required';
    }
    if (!ocrExtractedData.passportNumber || ocrExtractedData.passportNumber.trim().length < 6) {
      errors.passportNumber = 'Valid passport number is required';
    }
    if (!ocrExtractedData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dobCheck = validateDateOfBirth(ocrExtractedData.dateOfBirth);
      if (!dobCheck.isValid) {
        errors.dateOfBirth = dobCheck.error;
      } else {
        // Age eligibility check against destination visa if configured
        const ageCheck = validateAgeEligibility(
          ocrExtractedData.dateOfBirth,
          destination?.minimumAge,
          destination?.maximumAge
        );
        if (!ageCheck.isValid) {
          errors.ageRule = ageCheck.error;
        }
      }
    }

    if (!ocrExtractedData.expiryDate) {
      errors.expiryDate = 'Passport expiry date is required';
    }

    if (ocrExtractedData.issueDate) {
      const issueCheck = validatePassportIssueDate(ocrExtractedData.issueDate);
      if (!issueCheck.isValid) {
        errors.issueDate = issueCheck.error;
      }
    }

    if (ocrExtractedData.issueDate && ocrExtractedData.expiryDate) {
      const dateCheck = validatePassportDates(ocrExtractedData.issueDate, ocrExtractedData.expiryDate);
      if (!dateCheck.isValid) {
        errors.dateRule = dateCheck.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setOcrReviewErrors(errors);
      return;
    }

    // Authoritative passport name is source of truth
    const authoritativeFullName = (ocrExtractedData.fullName || '').trim();
    const parts = authoritativeFullName.split(/\s+/);
    const firstName = ocrExtractedData.firstName || parts[0] || 'Applicant';
    const lastName = ocrExtractedData.lastName || parts.slice(1).join(' ') || '';

    // Synchronize applicantFullName with authoritative passport name
    if (authoritativeFullName) {
      setApplicantFullName(authoritativeFullName);
    }

    // Apply auto-filled data to primary traveller & pre-attach passport document
    setTravellers((prev) =>
      prev.map((t, idx) => {
        if (idx === 0) {
          const docName = passportBackFile
            ? `${passportFile?.name || 'Passport Front'}, ${passportBackFile.name}`
            : (passportFile?.name || 'Passport Front Page');
          const totalSize = (passportFile?.size || 0) + (passportBackFile?.size || 0);

          return {
            ...t,
            firstName,
            lastName,
            passportNumber: ocrExtractedData.passportNumber.trim(),
            dob: ocrExtractedData.dateOfBirth,
            gender: ocrExtractedData.gender || 'Male',
            nationality: ocrExtractedData.nationality || 'Indian',
            issueDate: ocrExtractedData.issueDate || '',
            passportIssuedOn: ocrExtractedData.issueDate || '',
            expiryDate: ocrExtractedData.expiryDate || '',
            placeOfIssue: ocrExtractedData.placeOfIssue || t.placeOfIssue || '—',
            fatherName: ocrExtractedData.fatherName || '',
            motherName: ocrExtractedData.motherName || '',
            address: ocrExtractedData.address || '',
            docs: {
              ...t.docs,
              ...(passportFile || passportBackFile
                ? {
                    passport: {
                      name: docName,
                      size: formatFileSize(totalSize),
                      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      storageKey: ocrUploadedDoc?.storageKey || ocrBackUploadedDoc?.storageKey || '',
                      documentId: ocrUploadedDoc?.documentId || ocrBackUploadedDoc?.documentId || '',
                      frontStorageKey: ocrUploadedDoc?.storageKey || '',
                      frontDocumentId: ocrUploadedDoc?.documentId || '',
                      backStorageKey: ocrBackUploadedDoc?.storageKey || '',
                      backDocumentId: ocrBackUploadedDoc?.documentId || '',
                      error: null
                    }
                  }
                : {})
            }
          };
        }
        return t;
      })
    );

    if (destination?.passportPhotoRequired !== false) {
      setCurrentStep('passport_photo');
    } else {
      setCurrentStep('travellers');
    }
  };

  // Photograph Upload Handlers
  const handlePassportPhotoUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setPassportPhotoError('Photo file size exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setPassportPhotoFile(file);
    setPassportPhotoError(null);
    setIsUploadingPassportPhoto(true);

    const previewUrl = URL.createObjectURL(file);
    setPassportPhotoPreviewUrl(previewUrl);

    try {
      const result = await applicationService.processPassportPhoto(file, {
        visaId: destination?._id || destination?.id || '',
        previousStorageKey: passportPhotoDoc?.storageKey || ''
      });

      if (result) {
        setPassportPhotoDoc(result.uploadedDocument || null);
        setPassportPhotoValidation(result.validation || result);
      }
    } catch (err) {
      console.warn('Passport photo upload notice:', err);
      const isAuth = err?.status === 401 || err?.message?.includes('session has expired');
      const safeMessage = isAuth
        ? 'Your session has expired. Please sign in again.'
        : (err?.message && !err.message.includes('is not defined') && !err.message.includes('ReferenceError')
            ? err.message
            : 'Unable to validate photograph. You can continue or upload another photo.');
      setPassportPhotoError(safeMessage);
    } finally {
      setIsUploadingPassportPhoto(false);
    }
  };

  const handleConfirmPassportPhoto = () => {
    if (passportPhotoDoc || passportPhotoFile) {
      setTravellers((prev) =>
        prev.map((t, idx) => {
          if (idx === 0) {
            const photoEntry = {
              name: passportPhotoDoc?.originalFilename || passportPhotoFile?.name || 'Passport Photograph',
              size: formatFileSize(passportPhotoFile?.size || 0),
              uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              storageKey: passportPhotoDoc?.storageKey || '',
              documentId: passportPhotoDoc?.documentId || '',
              mimeType: passportPhotoDoc?.mimeType || 'image/jpeg',
              validationResult: passportPhotoValidation || null
            };
            return {
              ...t,
              docs: {
                ...t.docs,
                passport_photo: photoEntry,
                photo: photoEntry
              }
            };
          }
          return t;
        })
      );
    }
    setCurrentStep('travellers');
  };

  const handleSkipPassportPhoto = () => {
    setCurrentStep('travellers');
  };

  const renderConfidenceBadge = (fieldName) => {
    const status = ocrFieldStatus[fieldName] || 'MEDIUM';
    const val = ocrExtractedData[fieldName];

    if (!val || status === 'LOW' || status === 'MISSING') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Enter manually
        </span>
      );
    }

    if (status === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
          <Check size={12} strokeWidth={3} className="text-emerald-600" />
          Verified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
        <AlertCircle size={12} className="text-amber-600" />
        Review
      </span>
    );
  };

  // ------------------------------------------------------------------
  // INTERACTION HANDLERS
  // ------------------------------------------------------------------
  const handleAddTraveller = () => {
    if (travellers.length >= 8) return;
    const newId = `t_${Date.now()}_${travellers.length}`;
    const newTraveller = {
      id: newId,
      firstName: '',
      lastName: '',
      dob: '',
      gender: 'Male',
      nationality: 'Indian',
      email: '',
      phone: '',
      passportNumber: '',
      issueDate: '',
      expiryDate: '',
      placeOfIssue: '',
      docs: {}
    };
    setTravellers((prev) => [...prev, newTraveller]);
    setActiveTravellerId(newId);
  };

  const handleRemoveTraveller = (e, idToRemove) => {
    e.stopPropagation();
    if (travellers.length <= 1) return;
    setTravellers((prev) => prev.filter((t) => t.id !== idToRemove));
    if (activeTravellerId === idToRemove) {
      const remaining = travellers.filter((t) => t.id !== idToRemove);
      setActiveTravellerId(remaining[0]?.id || '');
    }
  };

  const handleFieldChange = (field, value) => {
    setTravellers((prev) =>
      prev.map((t) => (t.id === effectiveActiveId ? { ...t, [field]: value } : t))
    );
  };

  const scrollToField = (travellerId, fieldKey) => {
    setActiveTravellerId(travellerId);
    setTimeout(() => {
      const el = fieldRefs.current[`${travellerId}_${fieldKey}`];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
    }, 100);
  };

  // Helper to format file sizes
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '1.2 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.round(kb)} KB`;
  };

  // Handle real file upload with file type & size validation (> 5MB)
  const handleProcessSelectedFile = (travellerId, docId, file) => {
    const isTooLarge = file.size > 5 * 1024 * 1024;

    // Get accepted formats for this specific doc, or fall back to defaults
    const docDef = requiredDocs.find((d) => d.id === docId);
    const acceptedFormats = (docDef?.acceptedFormats && docDef.acceptedFormats.length > 0)
      ? docDef.acceptedFormats.map((f) => f.toUpperCase())
      : ['PDF', 'JPG', 'PNG'];
    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1].toUpperCase() : '';
    const isAllowedExt = acceptedFormats.some((fmt) => {
      const f = fmt.toUpperCase();
      if (f === fileExt) return true;
      if ((f === 'JPG' || f === 'JPEG') && (fileExt === 'JPG' || fileExt === 'JPEG')) return true;
      return false;
    });

    const readableFormats = acceptedFormats.length === 1
      ? acceptedFormats[0]
      : `${acceptedFormats.slice(0, -1).join(', ')} or ${acceptedFormats[acceptedFormats.length - 1]}`;

    if (isTooLarge || !isAllowedExt) {
      setTravellers((all) =>
        all.map((t) => {
          if (t.id === travellerId) {
            return {
              ...t,
              docs: {
                ...t.docs,
                [docId]: {
                  name: file.name,
                  error: isTooLarge
                    ? 'File too large. Maximum size is 5 MB.'
                    : `Please upload a ${readableFormats} file.`
                }
              }
            };
          }
          return t;
        })
      );
      return;
    }

    const key = `${travellerId}_${docId}`;
    setUploadingProgress((prev) => ({ ...prev, [key]: 25 }));

    let progress = 25;
    const interval = setInterval(() => {
      progress += 35;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadingProgress((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        setTravellers((all) =>
          all.map((t) => {
            if (t.id === travellerId) {
              const newDocEntry = {
                name: file.name,
                size: formatFileSize(file.size),
                uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                error: null
              };
              const updatedDocs = {
                ...t.docs,
                [docId]: newDocEntry
              };
              if (docDef?.isPhoto || docId === 'photo' || docId === 'passport_photo') {
                updatedDocs.passport_photo = newDocEntry;
                updatedDocs.photo = newDocEntry;
              }
              if (docDef?.isPassport || docId === 'passport') {
                updatedDocs.passport = newDocEntry;
              }
              return {
                ...t,
                docs: updatedDocs
              };
            }
            return t;
          })
        );
      } else {
        setUploadingProgress((prev) => ({ ...prev, [key]: progress }));
      }
    }, 100);
  };

  // Quick simulation / sample document helper
  const handleSimulateUpload = (travellerId, docId) => {
    const docDef = requiredDocs.find((d) => d.id === docId);
    let sampleName = `${(docDef?.name || docId).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    if (docDef?.isPhoto) sampleName = 'Passport_Photograph.jpg';
    else if (docDef?.isPassport) sampleName = 'Passport_Scan.pdf';
    const mockFile = {
      name: sampleName,
      size: 1420000 // ~1.4 MB
    };
    handleProcessSelectedFile(travellerId, docId, mockFile);
  };

  const handleTriggerFileSelect = (travellerId, docId) => {
    const inputEl = docInputRefs.current[`${travellerId}_${docId}`];
    if (inputEl) {
      inputEl.click();
    }
  };

  const handleRemoveDoc = (travellerId, docId) => {
    const docDef = requiredDocs.find((d) => d.id === docId);
    setTravellers((prev) =>
      prev.map((t) => {
        if (t.id === travellerId) {
          const updatedDocs = { ...t.docs };
          delete updatedDocs[docId];
          if (docDef?.isPhoto || docId === 'photo' || docId === 'passport_photo') {
            delete updatedDocs.passport_photo;
            delete updatedDocs.photo;
            delete updatedDocs.photograph;
          }
          if (docDef?.isPassport || docId === 'passport') {
            delete updatedDocs.passport;
            delete updatedDocs.passport_front;
          }
          return {
            ...t,
            docs: updatedDocs
          };
        }
        return t;
      })
    );
  };

  // Step continuation: User CAN press Continue even if incomplete!
  const handleContinueClick = () => {
    if (currentStep === 'travellers') {
      // Validate all traveller fields across all travellers
      const hasErrors = totalStepErrors > 0;
      if (hasErrors) {
        setSubmittedAttempted(true);

        // Find first traveller with error
        const firstTravellerWithError = travellers.find(
          (t, idx) => getTravellerErrorsCount(t, idx === 0, 'travellers') > 0
        );

        if (firstTravellerWithError) {
          setActiveTravellerId(firstTravellerWithError.id);
          const isPrimary = travellers[0].id === firstTravellerWithError.id;
          const fields = [
            'firstName', 'lastName', 'dob',
            ...(isPrimary ? ['email', 'phone'] : []),
            'passportNumber', 'placeOfIssue', 'issueDate', 'expiryDate'
          ];
          const firstFieldWithError = fields.find((f) => !isFieldValid(firstTravellerWithError, f, isPrimary));
          if (firstFieldWithError) {
            scrollToField(firstTravellerWithError.id, firstFieldWithError);
          }
        }
        return;
      }

      setSubmittedAttempted(false);
      setCurrentStep('documents');
      return;
    }

    if (currentStep === 'documents') {
      const hasDocErrors = travellers.some((t) => !getDocsStatus(t).completed);
      if (hasDocErrors) {
        setSubmittedAttempted(true);

        // Find first traveller with incomplete documents
        const firstTravellerWithDocError = travellers.find(
          (t) => !getDocsStatus(t).completed
        );

        if (firstTravellerWithDocError) {
          setActiveTravellerId(firstTravellerWithDocError.id);

          // Find first missing or errored mandatory doc for this traveller
          const firstMissingDoc = requiredDocs.find((d) => {
            if (d.required === false) return false;
            const docData = getDocForRequirement(firstTravellerWithDocError, d);
            return !docData || docData.error;
          });

          if (firstMissingDoc) {
            setTimeout(() => {
              const el = docCardRefs.current[`${firstTravellerWithDocError.id}_${firstMissingDoc.id}`];
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        }
        return;
      }

      setSubmittedAttempted(false);
      setCurrentStep('review');
      return;
    }

    if (currentStep === 'review') {
      setCurrentStep('payment');
      return;
    }
  };

  // Modular Payment Action (Mock frontend simulation for now, ready for future Razorpay integration)
  const handleProceedToPayment = () => {
    if (!selectedPaymentMethod) {
      setPaymentErrors({ method: 'Please select a payment method.' });
      return;
    }

    setPaymentErrors({});
    setIsSubmitting(true);

    // =========================================================================
    // FUTURE RAZORPAY INTEGRATION HOOK:
    // When integrating Razorpay later, replace this mock timeout with:
    //
    // const options = {
    //   key: 'YOUR_RAZORPAY_KEY_ID',
    //   amount: totalFee * 100, // paise
    //   currency: 'INR',
    //   name: 'NimuFly',
    //   description: `${displayName} ${visaType} Application (${applicationId})`,
    //   order_id: backendOrderId,
    //   prefill: {
    //     name: `${travellers[0]?.firstName || ''} ${travellers[0]?.lastName || ''}`.trim(),
    //     email: travellers[0]?.email || '',
    //     contact: travellers[0]?.phone || ''
    //   },
    //   handler: function (response) {
    //     // On successful payment verification
    //     setReferenceId(applicationId);
    //     setIsSubmitting(false);
    //     setIsSubmitted(true);
    //   },
    //   modal: {
    //     ondismiss: function () {
    //       setIsSubmitting(false);
    //     }
    //   }
    // };
    // const rzp = new window.Razorpay(options);
    // rzp.open();
    // =========================================================================

    // Current: Simulate fast, successful payment confirmation
    setTimeout(async () => {
      setReferenceId(applicationId);

      // Save application record via applicationService
      try {
        const primaryTraveller = travellers[0] || {};
        const newApp = {
          id: applicationId,
          applicationId: applicationId,
          userId: 'usr_mock_01',
          visaId: destination.id,
          countryId: destination.countryId || destination.id,
          countryName: displayName,
          destination: displayName,
          flagEmoji: flagEmoji || '✈️',
          visaType: visaType,
          travellerCount: travellers.length,
          travellers: travellers.map((t, idx) => ({
            id: t.id || `trav_${idx + 1}`,
            travellerId: t.id || `trav_${idx + 1}`,
            name: `${t.firstName} ${t.lastName}`.trim() || 'Applicant',
            firstName: t.firstName,
            lastName: t.lastName,
            email: t.email || (idx === 0 ? primaryTraveller.email : ''),
            phone: t.phone || (idx === 0 ? primaryTraveller.phone : ''),
            passportNumber: t.passportNumber || 'Pending',
            placeOfIssue: t.placeOfIssue || '—',
            issueDate: t.issueDate || '—',
            expiryDate: t.expiryDate || '—',
            nationality: t.nationality || 'Indian',
            dob: t.dob || '—',
            dateOfBirth: t.dob || '—',
            gender: t.gender || '—',
            docs: t.docs || {}
          })),
          documents: requiredDocs.map((d, idx) => {
            const docData = getDocForRequirement(primaryTraveller, d);
            const isUploaded = Boolean(docData && !docData.error);
            return {
              id: `doc_${idx + 1}`,
              documentId: `doc_${idx + 1}`,
              name: d.title,
              documentType: d.title,
              storageKey: docData?.storageKey || '',
              status: isUploaded ? 'Verified' : 'Pending',
              verificationStatus: isUploaded ? 'Verified' : 'Pending'
            };
          }),
          passportOcr: {
            frontStorageKey: ocrUploadedDoc?.storageKey || '',
            backStorageKey: ocrBackUploadedDoc?.storageKey || '',
            extractedData: ocrExtractedData,
            fieldsConfirmed: true,
            photoStorageKey: passportPhotoDoc?.storageKey || '',
            photoValidationResult: passportPhotoValidation || null
          },
          passportPhoto: passportPhotoDoc ? {
            documentId: passportPhotoDoc.documentId,
            storageKey: passportPhotoDoc.storageKey,
            originalFilename: passportPhotoDoc.originalFilename,
            fileSize: passportPhotoDoc.fileSize || (passportPhotoFile?.size || 0),
            mimeType: passportPhotoDoc.mimeType || 'image/jpeg',
            validationResult: passportPhotoValidation || null
          } : null,
          submittedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: APPLICATION_STATUS.APPLICATION_RECEIVED,
          requiredAction: REQUIRED_ACTION.NONE,
          adminMessage: 'Application received and securely registered with consulate queue.',
          expectedDate: guaranteedDate,
          expectedCompletion: guaranteedDate,
          amountPaid: `₹${totalFee.toLocaleString('en-IN')}`,
          amount: `₹${totalFee.toLocaleString('en-IN')}`,
          additionalInformation: additionalInformation.trim(),
          previousVisaRefusal: !!previousVisaRefusal,
          previousVisaRefusalCountry: displayName,
          previousVisaRefusalReason: previousVisaRefusal ? previousVisaRefusalReason.trim() : ''
        };
        await applicationService.createApplication(newApp);
      } catch (e) {
        console.warn('Failed to save application via service', e);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 900);
  };

  // Post-submission feedback submission handler (non-blocking)
  const handleSubmitFeedback = async () => {
    if (feedbackRating < 1 || feedbackRating > 5) return;
    setFeedbackSubmitting(true);
    try {
      await applicationService.submitFeedback(referenceId || applicationId, {
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        userId: 'usr_mock_01'
      });
      setFeedbackSubmitted(true);
    } catch (e) {
      console.warn('Feedback submission notice:', e);
      setFeedbackSubmitted(true);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handlePhoneMockUpload = () => {
    setPhoneUploadSuccess(true);
    requiredDocs.forEach((d) => {
      handleSimulateUpload(effectiveActiveId, d.id);
    });
    setTimeout(() => {
      setShowPhoneUploadModal(false);
      setPhoneUploadSuccess(false);
    }, 1200);
  };

  // Helper to determine field styling state
  const getFieldStyleClass = (t, field, isPrimary = false) => {
    const error = getFieldError(t, field, isPrimary);
    const valid = isFieldValid(t, field, isPrimary);

    if (submittedAttempted && error) {
      return 'border-red-400 bg-red-50/15 focus:border-red-500 focus:ring-2 focus:ring-red-100';
    }
    if (valid) {
      return 'border-emerald-300 bg-emerald-50/15 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15';
    }
    return 'border-slate-200 bg-white hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15';
  };

  const personalStatus = getPersonalInfoStatus(activeTraveller, activeIndex === 0);
  const passportStatus = getPassportInfoStatus(activeTraveller);
  const docsStatus = getDocsStatus(activeTraveller);

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#082B61] selection:bg-[#2563EB]/15 selection:text-[#082B61] flex flex-col justify-between">
      
      <div>
        {/* ========================================================
            1. DEDICATED WORKSPACE TOP BAR (Exact logo from Header.jsx)
            ======================================================== */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            
            {/* Left: Exact Mascot Logo & Back Button */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Official NimuFly Brand Lockup (Exactly matching Header.jsx) */}
              <Link
                to="/"
                className="flex items-center gap-2 sm:gap-3 focus:outline-none group select-none pr-3 sm:pr-4 border-r border-slate-200"
                aria-label="NimuFly Home"
              >
                <img
                  src="/mrvisa-mascot.png"
                  alt="NimuFly Mascot"
                  className="h-10 sm:h-11 w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-[1.03]"
                />
                <div className="flex flex-col justify-center select-none">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#2563EB] tracking-tight leading-none">
                    NimuFly
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.03em] text-[#2563EB] mt-1 leading-none">
                    On Time, Every Time.
                  </span>
                </div>
              </Link>

              {/* ← Back Button */}
              {currentStep === 'name' ? (
                <Link
                  to={visaBackLink}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </Link>
              ) : currentStep === 'passport_upload' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('name')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'passport_processing' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('passport_upload')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'passport_review' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('passport_upload')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'passport_photo' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('passport_review')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'travellers' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(destination?.passportPhotoRequired !== false ? 'passport_photo' : 'passport_review')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'documents' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('travellers')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'review' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('documents')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}

              {/* Selected Destination Pill */}
              <div className="hidden md:flex items-center gap-2 pl-1 text-xs font-bold text-[#082B61]">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center bg-slate-50">
                  {flagUrl ? (
                    <img src={flagUrl} alt={`${displayName} flag`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">{flagEmoji}</span>
                  )}
                </div>
                <span>{displayName} — {visaType}</span>
              </div>
            </div>

            {/* Right: Calculated Progress Indicator */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black tracking-wider text-[#2563EB] uppercase">
                {progressPercentage}% COMPLETED
              </span>
            </div>

          </div>

          {/* Thin Progress Bar Underneath */}
          <div className="w-full h-[2.5px] bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </header>

        {/* ========================================================
            SUBMITTED SUCCESS CONFIRMATION VIEW
            ======================================================== */}
        {isSubmitted ? (
          <main className="max-w-xl mx-auto px-4 sm:px-6 py-12">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
              
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Check size={30} strokeWidth={3} />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#082B61]">
                  Application Submitted
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
                  Your application has been successfully submitted.
                </p>
              </div>

              {/* Minimal Application Status Card */}
              <div className="p-4 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/20 text-left space-y-2.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-blue-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Application ID
                    </span>
                    <span className="text-base font-mono font-black text-[#082B61]">
                      {referenceId || applicationId}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                    Application Received
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Destination</span>
                    <span className="font-bold text-[#082B61]">{displayName} ({visaType})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Amount Paid</span>
                    <span className="font-bold text-[#082B61]">₹{totalFee.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* POST-APPLICATION FEEDBACK / RATING */}
              {!feedbackSubmitted && !feedbackSkipped ? (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 text-left space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#082B61]">
                        How was your application experience?
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Your feedback helps us improve our visa service.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedbackSkipped(true)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>

                  {/* 1–5 Star Rating Buttons */}
                  <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Experience Rating">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (feedbackHoverRating || feedbackRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          onClick={() => setFeedbackRating(star)}
                          onMouseEnter={() => setFeedbackHoverRating(star)}
                          onMouseLeave={() => setFeedbackHoverRating(0)}
                          className="p-1 rounded-lg hover:bg-slate-50 focus:outline-none transition-colors cursor-pointer"
                        >
                          <Star
                            size={24}
                            className={`transition-colors ${
                              active ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                    {feedbackRating > 0 && (
                      <span className="text-xs font-bold text-[#082B61] ml-2">
                        {feedbackRating} / 5
                      </span>
                    )}
                  </div>

                  {/* Optional Comment Textarea */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-400 block">
                      Anything you'd like to share? (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Tell us what went well or how we can improve..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#082B61] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleSubmitFeedback}
                      disabled={feedbackRating === 0 || feedbackSubmitting}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        feedbackRating > 0 && !feedbackSubmitting
                          ? 'bg-[#2563EB] text-white hover:bg-[#123B7A] cursor-pointer shadow-xs'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackSkipped(true)}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              ) : feedbackSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 size={16} />
                    <span>Thank you for your feedback!</span>
                  </div>
                  <p className="text-[11px] text-emerald-600/90 font-medium">
                    Your rating helps us continually improve the visa experience.
                  </p>
                </div>
              ) : null}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/account?appId=${applicationId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer"
                >
                  <span>Track in My Account</span>
                  <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:border-[#2563EB] text-[#082B61] hover:text-[#2563EB] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <span>View Details</span>
                </button>
                <Link
                  to={visaBackLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-[#082B61] text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Back to Visa</span>
                </Link>
              </div>

            </div>
          </main>
        ) : (
          /* ========================================================
              2. MAIN APPLICATION CONTENT (Clean Centered Workspace)
              ======================================================== */
          <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28">
            
            {/* 5-Step Progress Header: Passport → Traveller → Documents → Review → Payment */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-1 text-xs font-bold text-slate-400 select-none overflow-x-auto">
              {/* Step 1: Passport */}
              <button
                type="button"
                onClick={() => {
                  if (ocrExtractedData.passportNumber || travellers[0]?.passportNumber) {
                    setCurrentStep('passport_review');
                  } else {
                    setCurrentStep('name');
                  }
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                  ['name', 'passport_upload', 'passport_processing', 'passport_back_upload', 'passport_back_processing', 'passport_review', 'passport_photo'].includes(currentStep)
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-600 hover:text-[#082B61]'
                }`}
              >
                {travellers[0]?.passportNumber ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${['name', 'passport_upload', 'passport_processing', 'passport_back_upload', 'passport_back_processing', 'passport_review', 'passport_photo'].includes(currentStep) ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
                )}
                <span>Passport</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 2: Traveller */}
              <button
                type="button"
                onClick={() => {
                  if (ocrExtractedData.passportNumber || travellers[0]?.passportNumber) {
                    setCurrentStep('travellers');
                  }
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  currentStep === 'travellers'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-500 hover:text-[#082B61]'
                } ${ocrExtractedData.passportNumber || travellers[0]?.passportNumber ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                {travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed) ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'travellers' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
                )}
                <span>Traveller</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 3: Documents */}
              <button
                type="button"
                onClick={() => {
                  if (travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed)) {
                    setCurrentStep('documents');
                  }
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  currentStep === 'documents'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-500 hover:text-[#082B61]'
                } ${travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                {travellers.every((t) => getDocsStatus(t).completed) ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'documents' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
                )}
                <span>Documents</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 4: Review */}
              <button
                type="button"
                onClick={() => {
                  if (
                    travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed) &&
                    travellers.every((t) => getDocsStatus(t).completed)
                  ) {
                    setCurrentStep('review');
                  }
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  currentStep === 'review'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-500 hover:text-[#082B61]'
                } ${travellers.every((t) => getDocsStatus(t).completed) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                {currentStep === 'payment' ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'review' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>4</span>
                )}
                <span>Review</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 5: Payment */}
              <button
                type="button"
                onClick={() => {
                  if (
                    travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed) &&
                    travellers.every((t) => getDocsStatus(t).completed)
                  ) {
                    setCurrentStep('payment');
                  }
                }}
                className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  currentStep === 'payment'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-400 hover:text-[#082B61]'
                } cursor-pointer`}
              >
                <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'payment' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>5</span>
                <span>Payment</span>
              </button>
            </div>

            {/* ====================================================
                STEP 1: FULL NAME (Simple & Minimal)
                ==================================================== */}
            {currentStep === 'name' && (
              <div className="max-w-xl mx-auto py-8 sm:py-10">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full">
                      Step 1 of 5
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                      Let's get started
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">
                      What's your full name?
                    </p>
                  </div>

                  <div className="space-y-2 text-left max-w-md mx-auto">
                    <input
                      type="text"
                      value={applicantFullName}
                      onChange={(e) => {
                        setApplicantFullName(e.target.value);
                        if (nameStepError) setNameStepError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameContinue();
                      }}
                      placeholder="e.g. Rahul Sharma"
                      autoFocus
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 text-base font-semibold text-[#082B61] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all shadow-2xs"
                    />
                    <p className="text-xs text-slate-400 font-medium pl-1">
                      This should match your passport.
                    </p>
                    {nameStepError && (
                      <p className="text-xs font-semibold text-rose-600 pl-1 flex items-center gap-1">
                        <AlertCircle size={13} />
                        {nameStepError}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={handleNameContinue}
                      className="w-full py-3.5 px-6 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 2: PASSPORT UPLOAD
                ==================================================== */}
            {/* ====================================================
                STEP 2A: PASSPORT FRONT / PHOTO PAGE UPLOAD
                ==================================================== */}
            {currentStep === 'passport_upload' && (
              <div className="max-w-xl mx-auto py-8 sm:py-10">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full">
                      Step 2 of 5 — Front Page
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight leading-tight">
                      Passport,<br />photo page up
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium max-w-sm mx-auto">
                      Upload the front photo page of your passport to begin verification.
                    </p>
                  </div>

                  {/* Image quality or wrong page alert */}
                  {passportUploadError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-xs sm:text-sm">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{passportUploadError.message}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => passportFileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer shadow-2xs"
                        >
                          Upload Again
                        </button>
                        <button
                          type="button"
                          onClick={handleSkipToManualDetails}
                          className="px-3.5 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                        >
                          Enter Details Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden file input for front */}
                  <input
                    type="file"
                    ref={passportFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePassportFrontUpload(file);
                    }}
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                  />

                  {/* Upload Dropzone */}
                  <div
                    onClick={() => passportFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePassportFrontUpload(file);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-[#2563EB] rounded-3xl p-8 sm:p-10 transition-all cursor-pointer group bg-slate-50/50 hover:bg-[#2563EB]/5 max-w-md mx-auto"
                  >
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-200 group-hover:border-[#2563EB]/40 flex items-center justify-center mx-auto text-[#2563EB] shadow-xs transition-transform group-hover:scale-105">
                      <Upload size={24} />
                    </div>
                    <div className="mt-4 space-y-1">
                      <span className="text-sm font-bold text-[#082B61] group-hover:text-[#2563EB] transition-colors block">
                        Upload front / photo page
                      </span>
                      <span className="text-xs text-slate-400 font-medium block">
                        or drag & drop your image or PDF here
                      </span>
                    </div>
                    <div className="mt-4 inline-block text-[11px] font-bold text-slate-500 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
                      Accepted: PDF / JPG / JPEG / PNG / WEBP
                    </div>
                  </div>

                  {/* Fallback to manual entry */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleSkipToManualDetails}
                      className="text-xs font-semibold text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      Having trouble? <span className="underline">Enter details manually</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 2B: FRONT OCR PROCESSING ANIMATION
                ==================================================== */}
            {currentStep === 'passport_processing' && (
              <div className="max-w-xl mx-auto py-8 sm:py-10">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
                  
                  {/* Passport Front Preview with Animated Scanning Line */}
                  <div className="relative w-full max-w-sm mx-auto aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                    {passportFile?.type === 'application/pdf' || passportFile?.name?.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-2 p-4">
                        <FileText size={42} className="text-[#3B82F6]" />
                        <span className="text-sm font-bold tracking-tight">Passport PDF</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{passportFile.name}</span>
                      </div>
                    ) : passportPreviewUrl ? (
                      <img src={passportPreviewUrl} alt="Passport front preview" className="w-full h-full object-cover opacity-85" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                        <FileText size={36} />
                      </div>
                    )}
                    {/* Animated scanning line with blue glow */}
                    <div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent shadow-[0_0_14px_#3B82F6]"
                      style={{
                        animation: 'nimuPassportScan 2.2s ease-in-out infinite'
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    {frontDetectedSuccess ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 rounded-full text-xs font-bold mb-1">
                          <Check size={14} strokeWidth={3} className="text-emerald-600" />
                          <span>{isPdfPassport(passportFile) ? 'Passport verified' : 'Front side detected'}</span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-[#082B61] tracking-tight">
                          {isPdfPassport(passportFile) ? 'Passport verified' : 'Front side detected'}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                          {isPdfPassport(passportFile) ? 'Opening details review...' : 'Next, flip your passport for the second page...'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg sm:text-xl font-black text-[#082B61] tracking-tight">
                          {isPdfPassport(passportFile) ? 'Reading passport document...' : 'Reading passport photo page...'}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                          Verifying passport details...
                        </p>
                      </>
                    )}
                  </div>

                  {/* Backend Stages Checklist */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 max-w-sm mx-auto space-y-2.5 text-left">
                    {ocrStages.map((stage) => {
                      const isDone = stage.status === 'completed';
                      const isWarning = stage.status === 'warning';
                      const isInProgress = stage.status === 'in_progress';

                      return (
                        <div key={stage.id} className="flex items-center gap-2.5 text-xs font-semibold">
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                          ) : isWarning ? (
                            <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                          ) : isInProgress ? (
                            <span className="w-4 h-4 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin flex-shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 ml-0.5 mr-0.5 flex-shrink-0" />
                          )}
                          <span className={isDone ? 'text-slate-700' : isInProgress ? 'text-[#2563EB] font-bold' : 'text-slate-400'}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fallback Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSkipToManualDetails}
                      className="text-xs font-semibold text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                    >
                      Taking too long? <span className="underline">Enter details manually</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 2C: PASSPORT BACK / SECOND PAGE UPLOAD
                ==================================================== */}
            {currentStep === 'passport_back_upload' && shouldShowBackUploadStep(passportFile, currentStep) && (
              <div className="max-w-xl mx-auto py-8 sm:py-10">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
                  
                  {/* Status header with front confirmed pill */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full">
                        Step 2 of 5 — Flip Passport
                      </span>
                      {passportFile && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check size={12} strokeWidth={3} className="text-emerald-600" />
                          Front Saved
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                      Now flip your passport
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">
                      Upload the back side / second page
                    </p>
                  </div>

                  {/* Error banner if back page failed detection */}
                  {passportBackUploadError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-xs sm:text-sm">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{passportBackUploadError.message}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => passportBackInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer shadow-2xs"
                        >
                          Upload Again
                        </button>
                        <button
                          type="button"
                          onClick={handleSkipBackPage}
                          className="px-3.5 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                        >
                          Enter Details Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden file input for back */}
                  <input
                    type="file"
                    ref={passportBackInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePassportBackUpload(file);
                    }}
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                  />

                  {/* Dropzone for Back Page */}
                  <div
                    onClick={() => passportBackInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePassportBackUpload(file);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-[#2563EB] rounded-3xl p-8 sm:p-10 transition-all cursor-pointer group bg-slate-50/50 hover:bg-[#2563EB]/5 max-w-md mx-auto"
                  >
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-200 group-hover:border-[#2563EB]/40 flex items-center justify-center mx-auto text-[#2563EB] shadow-xs transition-transform group-hover:scale-105">
                      <Upload size={24} />
                    </div>
                    <div className="mt-4 space-y-1">
                      <span className="text-sm font-bold text-[#082B61] group-hover:text-[#2563EB] transition-colors block">
                        Upload back / second page
                      </span>
                      <span className="text-xs text-slate-400 font-medium block">
                        or drag & drop your image or PDF here
                      </span>
                    </div>
                    <div className="mt-4 inline-block text-[11px] font-bold text-slate-500 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
                      Accepted: PDF / JPG / JPEG / PNG / WEBP
                    </div>
                  </div>

                  {/* Skip back page fallback */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleSkipBackPage}
                      className="text-xs font-semibold text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      Skip this step
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 2D: BACK OCR PROCESSING ANIMATION
                ==================================================== */}
            {currentStep === 'passport_back_processing' && (
              <div className="max-w-xl mx-auto py-8 sm:py-10">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm text-center space-y-6">
                  
                  {/* Passport Back Preview with Animated Scanning Line */}
                  <div className="relative w-full max-w-sm mx-auto aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                    {passportBackFile?.type === 'application/pdf' || passportBackFile?.name?.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-2 p-4">
                        <FileText size={42} className="text-[#3B82F6]" />
                        <span className="text-sm font-bold tracking-tight">Passport PDF</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{passportBackFile.name}</span>
                      </div>
                    ) : passportBackPreviewUrl ? (
                      <img src={passportBackPreviewUrl} alt="Passport back preview" className="w-full h-full object-cover opacity-85" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                        <FileText size={36} />
                      </div>
                    )}
                    {/* Animated scanning line with blue glow */}
                    <div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent shadow-[0_0_14px_#3B82F6]"
                      style={{
                        animation: 'nimuPassportScan 2.2s ease-in-out infinite'
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-[#082B61] tracking-tight">
                      Processing back page...
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Verifying passport details...
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSkipBackPage}
                      className="text-xs font-semibold text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                    >
                      Taking too long? <span className="underline">Skip to review</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================
                STEP 4: REVIEW AUTO-FILLED PASSPORT DETAILS
                ==================================================== */}
            {currentStep === 'passport_review' && (() => {
              const validityReqMonths = destination?.passportValidityRequiredMonths || 6;
              const validityCheck = validateMinimumPassportValidity(
                ocrExtractedData.expiryDate,
                null,
                validityReqMonths
              );
              const applicantAge = calculateAge(ocrExtractedData.dateOfBirth);

              return (
                <div className="max-w-4xl mx-auto py-8 sm:py-10">
                  <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-7">
                    
                    {/* Header */}
                    <div className="text-left space-y-1.5">
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#2563EB] bg-[#2563EB]/10 px-3 py-1 rounded-full">
                        Step 3 of 5
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                        Review your passport details
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        We've filled these details from your passport. Please check them carefully before continuing.
                      </p>
                    </div>


                    {/* Front + Back Consistency Mismatch Warning (Requirement 2) */}
                    {consistencyMismatches.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-left space-y-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs sm:text-sm">
                          <AlertCircle size={16} className="flex-shrink-0" />
                          <span>Some passport details could not be matched.</span>
                        </div>
                        <div className="space-y-2">
                          {consistencyMismatches.map((m, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-slate-700 space-y-1">
                              <span className="font-bold text-[#082B61]">{m.label || m.field} discrepancy:</span>
                              <div className="flex flex-wrap gap-4 text-[11px]">
                                <span>Front extracted: <strong className="text-[#082B61]">{m.frontValue || '—'}</strong></span>
                                <span>Back extracted: <strong className="text-[#082B61]">{m.backValue || '—'}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Please verify the values in the fields below and correct them manually if needed.
                        </p>
                      </div>
                    )}

                    {/* Two-Column Review Layout: LEFT = Passport Images, RIGHT = Extracted Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                      
                      {/* LEFT: Passport Images Cards */}
                      <div className="lg:col-span-4 space-y-4">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-2">
                          Uploaded Passport
                        </span>

                        {/* Front Page Card */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#082B61]">Front / Photo Page</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Attached
                            </span>
                          </div>
                          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs">
                            {passportPreviewUrl ? (
                              <img src={passportPreviewUrl} alt="Passport Front" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No preview</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => passportFileInputRef.current?.click()}
                            className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-[#2563EB] text-xs font-bold text-slate-600 hover:text-[#2563EB] transition-colors cursor-pointer shadow-2xs"
                          >
                            Change Front Photo
                          </button>
                        </div>

                        {/* Back Page Card */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#082B61]">Back / Second Page</span>
                            {passportBackFile ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ Attached
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs">
                            {passportBackPreviewUrl ? (
                              <img src={passportBackPreviewUrl} alt="Passport Back" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                                <FileText size={20} />
                                <span>No back page</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => passportBackInputRef.current?.click()}
                            className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-[#2563EB] text-xs font-bold text-slate-600 hover:text-[#2563EB] transition-colors cursor-pointer shadow-2xs"
                          >
                            {passportBackFile ? 'Change Back Photo' : '+ Upload Back Page'}
                          </button>
                        </div>
                      </div>

                      {/* RIGHT: Extracted Editable Details */}
                      <div className="lg:col-span-8 space-y-6">
                        
                        {/* Section 1: Personal Details */}
                        <div className="space-y-4">
                          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                            Personal Details
                          </h2>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Full name *</label>
                                {isOcrNameAuthoritative ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                    <Check size={12} strokeWidth={3} className="text-emerald-600" />
                                    Passport verified
                                  </span>
                                ) : (
                                  renderConfidenceBadge('fullName')
                                )}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.fullName}
                                onChange={(e) => {
                                  if (!isOcrNameAuthoritative) {
                                    handleReviewFieldChange('fullName', e.target.value);
                                  }
                                }}
                                readOnly={isOcrNameAuthoritative}
                                placeholder="e.g. Rahul Sharma"
                                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                                  isOcrNameAuthoritative
                                    ? 'bg-slate-50/80 border-slate-200 text-[#082B61] select-none cursor-default'
                                    : 'border-slate-200 text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none'
                                }`}
                              />
                              {ocrReviewErrors.fullName && (
                                <p className="text-[11px] font-semibold text-rose-600">{ocrReviewErrors.fullName}</p>
                              )}
                            </div>

                            {/* Date of Birth with Calculated Age */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">
                                  Date of birth *
                                  {applicantAge !== null && (
                                    <span className="text-[11px] font-semibold text-slate-500 ml-1.5 font-normal">
                                      ({applicantAge} yrs old)
                                    </span>
                                  )}
                                </label>
                                {renderConfidenceBadge('dateOfBirth')}
                              </div>
                              <input
                                type="date"
                                value={ocrExtractedData.dateOfBirth}
                                onChange={(e) => handleReviewFieldChange('dateOfBirth', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                              {ocrReviewErrors.dateOfBirth && (
                                <p className="text-[11px] font-semibold text-rose-600">{ocrReviewErrors.dateOfBirth}</p>
                              )}
                            </div>

                            {/* Gender */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Gender *</label>
                                {renderConfidenceBadge('gender')}
                              </div>
                              <select
                                value={ocrExtractedData.gender || 'Male'}
                                onChange={(e) => handleReviewFieldChange('gender', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none cursor-pointer"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            {/* Nationality */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Nationality *</label>
                                {renderConfidenceBadge('nationality')}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.nationality}
                                onChange={(e) => handleReviewFieldChange('nationality', e.target.value)}
                                placeholder="e.g. Indian"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                            </div>

                            {/* Father's Name */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Father's / Guardian's Name</label>
                                {renderConfidenceBadge('fatherName')}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.fatherName}
                                onChange={(e) => handleReviewFieldChange('fatherName', e.target.value)}
                                placeholder="e.g. Suresh Sharma"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                            </div>

                            {/* Mother's Name */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Mother's Name</label>
                                {renderConfidenceBadge('motherName')}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.motherName}
                                onChange={(e) => handleReviewFieldChange('motherName', e.target.value)}
                                placeholder="e.g. Sunita Sharma"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Passport Details */}
                        <div className="space-y-4 pt-2">
                          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                            Passport Details
                          </h2>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Passport Number */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Passport number *</label>
                                {renderConfidenceBadge('passportNumber')}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.passportNumber}
                                onChange={(e) => handleReviewFieldChange('passportNumber', e.target.value.toUpperCase())}
                                placeholder="e.g. Z9876543"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] uppercase focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                              {ocrReviewErrors.passportNumber && (
                                <p className="text-[11px] font-semibold text-rose-600">{ocrReviewErrors.passportNumber}</p>
                              )}
                            </div>

                            {/* Date of Issue */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Date of issue</label>
                                {renderConfidenceBadge('issueDate')}
                              </div>
                              <input
                                type="date"
                                value={ocrExtractedData.issueDate}
                                onChange={(e) => handleReviewFieldChange('issueDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                              {ocrReviewErrors.issueDate && (
                                <p className="text-[11px] font-semibold text-rose-600">{ocrReviewErrors.issueDate}</p>
                              )}
                            </div>

                            {/* Date of Expiry */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Date of expiry *</label>
                                {renderConfidenceBadge('expiryDate')}
                              </div>
                              <input
                                type="date"
                                value={ocrExtractedData.expiryDate}
                                onChange={(e) => handleReviewFieldChange('expiryDate', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                              {ocrReviewErrors.expiryDate && (
                                <p className="text-[11px] font-semibold text-rose-600">{ocrReviewErrors.expiryDate}</p>
                              )}
                            </div>

                            {/* Place of Issue */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Place of issue</label>
                                {renderConfidenceBadge('placeOfIssue')}
                              </div>
                              <input
                                type="text"
                                value={ocrExtractedData.placeOfIssue || ''}
                                onChange={(e) => handleReviewFieldChange('placeOfIssue', e.target.value)}
                                placeholder="e.g. Amritsar"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none"
                              />
                            </div>

                            {/* Permanent Address */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-[#082B61]">Permanent Address</label>
                                {renderConfidenceBadge('address')}
                              </div>
                              <textarea
                                rows={2}
                                value={ocrExtractedData.address || ''}
                                onChange={(e) => handleReviewFieldChange('address', e.target.value)}
                                placeholder="e.g. Flat 101, Palm Street, Amritsar, Punjab"
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#082B61] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 focus:outline-none resize-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Strict 10-year rule warning banner */}
                        {ocrReviewErrors.dateRule && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{ocrReviewErrors.dateRule}</span>
                          </div>
                        )}

                        {/* Age eligibility restriction error */}
                        {ocrReviewErrors.ageRule && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{ocrReviewErrors.ageRule}</span>
                          </div>
                        )}

                        {/* Minimum Passport Validity Warning (Requirement 4) */}
                        {!validityCheck.isValid && ocrExtractedData.expiryDate && (
                          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2.5">
                            <AlertCircle size={16} className="flex-shrink-0 text-amber-600" />
                            <span>{validityCheck.warning}</span>
                          </div>
                        )}

                        {/* Minimal Verified State */}
                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                            <span>Passport details verified</span>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium">Ready to continue</span>
                        </div>

                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCurrentStep('passport_upload')}
                        className="text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-2 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
                      >
                        Change Passport Photo
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmPassportReview}
                        className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Looks correct — Continue</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>

                    <style>{`
                      @keyframes nimuPassportScan {
                        0% { top: 4%; opacity: 0.9; }
                        50% { top: 92%; opacity: 1; }
                        100% { top: 4%; opacity: 0.9; }
                      }
                    `}</style>
                  </div>
                </div>
              );
            })()}

            {/* ====================================================
                STEP 1.5: PASSPORT-SIZE PHOTOGRAPH (Quality & Compliance)
                ==================================================== */}
            {currentStep === 'passport_photo' && (
              <PassportPhotoUploadCard
                destination={destination}
                photoFile={passportPhotoFile}
                previewUrl={passportPhotoPreviewUrl}
                isUploading={isUploadingPassportPhoto}
                validation={passportPhotoValidation}
                uploadedDoc={passportPhotoDoc}
                error={passportPhotoError}
                onUpload={handlePassportPhotoUpload}
                onConfirm={handleConfirmPassportPhoto}
                onSkip={handleSkipPassportPhoto}
                onBack={() => setCurrentStep('passport_review')}
              />
            )}

            {/* ====================================================
                STEP 2: TRAVELLERS (Existing Interactive Form)
                ==================================================== */}
            {currentStep === 'travellers' && (
              <div className="space-y-6">
                
                {/* Heading Area */}
                <div className="space-y-1 text-left pt-1">
                  <h1 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
                    Traveller Details
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Tell us a few details about the traveller.
                  </p>
                </div>

                {/* Traveller Switcher Cards */}
                <div className="flex flex-wrap items-stretch gap-3">
                  {travellers.map((t, index) => {
                    const isSelected = t.id === effectiveActiveId;
                    const hasName = t.firstName.trim().length > 0;
                    const label = hasName ? `${t.firstName} ${t.lastName || ''}`.trim() : `Traveller ${index + 1}`;
                    const isPrimary = index === 0;
                    const pDone = getPersonalInfoStatus(t, isPrimary).completed && getPassportInfoStatus(t).completed;
                    const errorCount = getTravellerErrorsCount(t, isPrimary, 'travellers');
                    const hasErrors = submittedAttempted && errorCount > 0;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTravellerId(t.id)}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer select-none min-w-[190px] sm:min-w-[210px] ${
                          isSelected
                            ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
                            : hasErrors
                            ? 'bg-red-50/20 border-red-300 hover:border-red-400'
                            : pDone
                            ? 'bg-emerald-50/20 border-emerald-300/80 hover:border-emerald-400'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {isPrimary ? 'Primary Traveller' : `Traveller ${index + 1}`}
                          </span>
                          <span className={`text-xs font-black truncate max-w-[120px] ${isSelected ? 'text-[#2563EB]' : 'text-[#082B61]'}`}>
                            {label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasErrors ? (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200/60 flex items-center gap-0.5">
                              <AlertCircle size={11} />
                              <span>{errorCount} {errorCount === 1 ? 'error' : 'errors'}</span>
                            </span>
                          ) : pDone ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200/60 flex items-center gap-0.5">
                              <Check size={11} strokeWidth={3} />
                              <span>Complete</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200/60">
                              Incomplete
                            </span>
                          )}

                          {travellers.length > 1 && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleRemoveTraveller(e, t.id)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors ml-0.5 cursor-pointer"
                              title="Remove traveller"
                            >
                              <X size={13} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {travellers.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddTraveller}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-dashed border-slate-300 hover:border-[#2563EB] hover:bg-blue-50/30 text-xs font-bold text-[#2563EB] transition-all cursor-pointer whitespace-nowrap min-h-[54px]"
                    >
                      <Plus size={15} />
                      <span>Add another traveller</span>
                    </button>
                  )}
                </div>

                {/* Central Traveller Card */}
                <div className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-xs space-y-7 transition-all ${
                  personalStatus.completed && passportStatus.completed
                    ? 'border-emerald-300/80 ring-1 ring-emerald-300/40'
                    : 'border-slate-200/80'
                }`}>
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#2563EB] uppercase tracking-wider block">
                        {activeIndex === 0 ? 'Primary Applicant' : `Applicant ${activeIndex + 1}`}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-[#082B61] tracking-tight mt-0.5">
                        Traveller {activeIndex + 1}
                        {activeTraveller.firstName && ` — ${activeTraveller.firstName} ${activeTraveller.lastName || ''}`}
                      </h2>
                    </div>
                    {personalStatus.completed && passportStatus.completed && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200/60">
                        <Check size={13} strokeWidth={3} />
                        <span>All Details Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Section 1: Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100/70">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#082B61]">Personal Information</h3>
                        {personalStatus.completed && (
                          <span className="text-emerald-600 flex items-center gap-0.5 text-xs font-bold">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* First Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-[#082B61] block leading-none">
                            First Name *
                          </label>
                          {activeIndex === 0 && isOcrNameAuthoritative && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              Passport verified
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_firstName`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.firstName}
                            onChange={(e) => {
                              if (!(activeIndex === 0 && isOcrNameAuthoritative)) {
                                handleFieldChange('firstName', e.target.value);
                              }
                            }}
                            readOnly={activeIndex === 0 && isOcrNameAuthoritative}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium transition-all focus:outline-none ${
                              activeIndex === 0 && isOcrNameAuthoritative
                                ? 'bg-slate-50/80 border-slate-200 text-[#082B61] select-none cursor-default'
                                : getFieldStyleClass(activeTraveller, 'firstName', activeIndex === 0)
                            }`}
                          />
                          {isFieldValid(activeTraveller, 'firstName', activeIndex === 0) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'firstName', activeIndex === 0) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'firstName', activeIndex === 0) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'firstName', activeIndex === 0)}
                          </span>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-[#082B61] block leading-none">
                            Last Name *
                          </label>
                          {activeIndex === 0 && isOcrNameAuthoritative && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              Passport verified
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_lastName`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.lastName}
                            onChange={(e) => {
                              if (!(activeIndex === 0 && isOcrNameAuthoritative)) {
                                handleFieldChange('lastName', e.target.value);
                              }
                            }}
                            readOnly={activeIndex === 0 && isOcrNameAuthoritative}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium transition-all focus:outline-none ${
                              activeIndex === 0 && isOcrNameAuthoritative
                                ? 'bg-slate-50/80 border-slate-200 text-[#082B61] select-none cursor-default'
                                : getFieldStyleClass(activeTraveller, 'lastName', activeIndex === 0)
                            }`}
                          />
                          {isFieldValid(activeTraveller, 'lastName', activeIndex === 0) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'lastName', activeIndex === 0) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'lastName', activeIndex === 0) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'lastName', activeIndex === 0)}
                          </span>
                        )}
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Date of Birth *
                        </label>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_dob`] = el)}
                            type="date"
                            placeholder=""
                            max={new Date().toISOString().split('T')[0]}
                            value={activeTraveller.dob}
                            onChange={(e) => handleFieldChange('dob', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'dob',
                              activeIndex === 0
                            )}`}
                          />
                          {isFieldValid(activeTraveller, 'dob', activeIndex === 0) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'dob', activeIndex === 0) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'dob', activeIndex === 0) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'dob', activeIndex === 0)}
                          </span>
                        )}
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Gender *
                        </label>
                        <select
                          value={activeTraveller.gender}
                          onChange={(e) => handleFieldChange('gender', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Nationality */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Nationality *
                        </label>
                        <select
                          value={activeTraveller.nationality || 'Indian'}
                          onChange={(e) => handleFieldChange('nationality', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-[#082B61] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                        >
                          <option value="Indian">Indian (🇮🇳)</option>
                          <option value="Emirati">Emirati (🇦🇪)</option>
                          <option value="British">British (🇬🇧)</option>
                          <option value="American">American (🇺🇸)</option>
                          <option value="Canadian">Canadian (🇨🇦)</option>
                          <option value="Australian">Australian (🇦🇺)</option>
                          <option value="Singaporean">Singaporean (🇸🇬)</option>
                          <option value="German">German (🇩🇪)</option>
                          <option value="French">French (🇫🇷)</option>
                          <option value="Other">Other Nationality</option>
                        </select>
                      </div>

                      {/* Contact details if Primary Traveller */}
                      {activeIndex === 0 && (
                        <>
                          <div>
                            <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                              Email Address *
                            </label>
                            <div className="relative">
                              <input
                                ref={(el) => (fieldRefs.current[`${effectiveActiveId}_email`] = el)}
                                type="email"
                                placeholder=""
                                value={activeTraveller.email}
                                onChange={(e) => handleFieldChange('email', e.target.value)}
                                className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                                  activeTraveller,
                                  'email',
                                  true
                                )}`}
                              />
                              {isFieldValid(activeTraveller, 'email', true) ? (
                                <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              ) : submittedAttempted && getFieldError(activeTraveller, 'email', true) ? (
                                <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              ) : null}
                            </div>
                            {submittedAttempted && getFieldError(activeTraveller, 'email', true) && (
                              <span className="text-[11px] font-medium text-red-600 mt-1 block">
                                {getFieldError(activeTraveller, 'email', true)}
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                              Phone Number *
                            </label>
                            <div className="relative">
                              <input
                                ref={(el) => (fieldRefs.current[`${effectiveActiveId}_phone`] = el)}
                                type="tel"
                                placeholder=""
                                value={activeTraveller.phone}
                                onChange={(e) => handleFieldChange('phone', e.target.value)}
                                className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                                  activeTraveller,
                                  'phone',
                                  true
                                )}`}
                              />
                              {isFieldValid(activeTraveller, 'phone', true) ? (
                                <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              ) : submittedAttempted && getFieldError(activeTraveller, 'phone', true) ? (
                                <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              ) : null}
                            </div>
                            {submittedAttempted && getFieldError(activeTraveller, 'phone', true) && (
                              <span className="text-[11px] font-medium text-red-600 mt-1 block">
                                {getFieldError(activeTraveller, 'phone', true)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Passport Information */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100/70">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#082B61]">Passport Information</h3>
                        {passportStatus.completed && (
                          <span className="text-emerald-600 flex items-center gap-0.5 text-xs font-bold">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Passport must be valid for at least 6 months
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* Passport Number */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Passport Number *
                        </label>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_passportNumber`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.passportNumber}
                            onChange={(e) =>
                              handleFieldChange('passportNumber', e.target.value.toUpperCase())
                            }
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-mono font-bold uppercase text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'passportNumber',
                              false
                            )}`}
                          />
                          {isFieldValid(activeTraveller, 'passportNumber', false) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'passportNumber', false) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'passportNumber', false) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'passportNumber', false)}
                          </span>
                        )}
                      </div>

                      {/* Place of Issue */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Place of Issue *
                        </label>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_placeOfIssue`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.placeOfIssue}
                            onChange={(e) => handleFieldChange('placeOfIssue', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'placeOfIssue',
                              false
                            )}`}
                          />
                          {isFieldValid(activeTraveller, 'placeOfIssue', false) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'placeOfIssue', false) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'placeOfIssue', false) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'placeOfIssue', false)}
                          </span>
                        )}
                      </div>

                      {/* Issue Date */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Passport Issue Date *
                        </label>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_issueDate`] = el)}
                            type="date"
                            placeholder=""
                            max={new Date().toISOString().split('T')[0]}
                            value={activeTraveller.issueDate}
                            onChange={(e) => handleFieldChange('issueDate', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'issueDate',
                              false
                            )}`}
                          />
                          {isFieldValid(activeTraveller, 'issueDate', false) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'issueDate', false) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'issueDate', false) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'issueDate', false)}
                          </span>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none mb-1.5">
                          Passport Expiry Date *
                        </label>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_expiryDate`] = el)}
                            type="date"
                            placeholder=""
                            min={new Date().toISOString().split('T')[0]}
                            value={activeTraveller.expiryDate}
                            onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'expiryDate',
                              false
                            )}`}
                          />
                          {isFieldValid(activeTraveller, 'expiryDate', false) ? (
                            <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : submittedAttempted && getFieldError(activeTraveller, 'expiryDate', false) ? (
                            <AlertCircle size={15} className="text-red-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          ) : null}
                        </div>
                        {submittedAttempted && getFieldError(activeTraveller, 'expiryDate', false) && (
                          <span className="text-[11px] font-medium text-red-600 mt-1 block">
                            {getFieldError(activeTraveller, 'expiryDate', false)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Below current traveller: + Add another traveller */}
                {travellers.length < 8 && (
                  <div className="flex items-center justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleAddTraveller}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-dashed border-[#2563EB]/40 hover:border-[#2563EB] bg-blue-50/20 hover:bg-blue-50/50 text-xs font-bold text-[#2563EB] transition-all cursor-pointer shadow-xs"
                    >
                      <Plus size={14} />
                      <span>+ Add another traveller</span>
                    </button>
                  </div>
                )}

                {/* Additional Information & Previous Visa Refusal Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                  
                  {/* Previous Visa Refusal Question (Country-Specific) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-black text-[#082B61]">Previous Visa Refusal</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Country-specific declaration for your application
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#082B61] block">
                        Have you previously had a visa refused for {displayName}? *
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPreviousVisaRefusal(false)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            !previousVisaRefusal
                              ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviousVisaRefusal(true)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            previousVisaRefusal
                              ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                    </div>

                    {previousVisaRefusal && (
                      <div className="pt-2 space-y-1.5 animate-in fade-in duration-200">
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Please tell us about the previous visa refusal *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Provide details such as approximate date, reason given, or application reference
                        </span>
                        <textarea
                          rows={3}
                          value={previousVisaRefusalReason}
                          onChange={(e) => setPreviousVisaRefusalReason(e.target.value)}
                          placeholder="Provide details about the previous refusal..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Additional Information (Optional) */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-black text-[#082B61]">Additional Information</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Optional notes or information for your visa application
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#082B61] block leading-none">
                        Is there anything else you'd like us to know about your application?
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Provide any additional context or details you wish to share with the visa team
                      </span>
                      <textarea
                        rows={3}
                        value={additionalInformation}
                        onChange={(e) => setAdditionalInformation(e.target.value)}
                        placeholder="Type any additional information or comments here..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-[#082B61] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                </div>

                {/* Bottom Navigation in page */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
                  <Link
                    to={`/visa/${destination.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleContinueClick}
                    className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>

              </div>
            )}

                {/* ====================================================
                    STEP 2: DOCUMENTS (Minimal, Friendly Document Upload)
                    ==================================================== */}
                {currentStep === 'documents' && (
                  <div className="space-y-6">
                    
                    {/* Heading Area */}
                    <div className="space-y-1 text-left pt-1">
                      <h1 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
                        Documents
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Attach required documents for {activeTraveller.firstName ? `${activeTraveller.firstName} ${activeTraveller.lastName || ''}`.trim() : `Traveller ${activeIndex + 1}`}.
                      </p>
                    </div>

                    {/* Multi-Traveller Switcher (Clean Stack/Grid) */}
                    {travellers.length > 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {travellers.map((t, index) => {
                          const isSelected = t.id === effectiveActiveId;
                          const hasName = t.firstName.trim().length > 0;
                          const travellerLabel = hasName ? `${t.firstName} ${t.lastName || ''}`.trim() : `Traveller ${index + 1}`;
                          const dStatus = getDocsStatus(t);
                          const hasDocErrors = submittedAttempted && !dStatus.completed;

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setActiveTravellerId(t.id)}
                              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-[#F5F9FF] border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs'
                                  : hasDocErrors
                                  ? 'bg-red-50/20 border-red-300 hover:border-red-400'
                                  : dStatus.completed
                                  ? 'bg-emerald-50/20 border-emerald-300/80 hover:border-emerald-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                                  Traveller {index + 1}
                                </span>
                                <div className={`text-xs sm:text-sm font-black truncate ${isSelected ? 'text-[#2563EB]' : 'text-[#082B61]'}`}>
                                  {travellerLabel}
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                {dStatus.completed ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200/60 flex items-center gap-1">
                                    <Check size={12} strokeWidth={3} />
                                    <span>Documents complete</span>
                                  </span>
                                ) : hasDocErrors ? (
                                  <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200/60 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    <span>{dStatus.missingMandatoryDocs?.length || (requiredDocs.length - dStatus.count)} required</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200/60">
                                    {dStatus.missingMandatoryDocs?.length || (requiredDocs.length - dStatus.count)} {(dStatus.missingMandatoryDocs?.length || (requiredDocs.length - dStatus.count)) === 1 ? 'document' : 'documents'} required
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Central Document Card for Active Traveller */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                      
                      {/* Section Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-extrabold text-[#2563EB] uppercase tracking-wider block">
                            Required Documents
                          </span>
                          <h2 className="text-base sm:text-lg font-black text-[#082B61] tracking-tight mt-0.5">
                            {activeTraveller.firstName
                              ? `${activeTraveller.firstName} ${activeTraveller.lastName || ''}`.trim()
                              : `Traveller ${activeIndex + 1}`}
                          </h2>
                        </div>

                        {/* Completion badge */}
                        {docsStatus.completed ? (
                          <span className="text-emerald-700 bg-emerald-50 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200/70 flex items-center gap-1.5">
                            <Check size={13} strokeWidth={3} />
                            <span>All Documents Uploaded</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200/70">
                            {docsStatus.count} of {requiredDocs.length} uploaded
                          </span>
                        )}
                      </div>

                      {/* Document Upload Cards */}
                      {requiredDocs.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                          <Check className="mx-auto text-emerald-600 mb-2" size={32} />
                          <h4 className="text-sm font-bold text-[#082B61]">No Documents Required</h4>
                          <p className="text-xs text-slate-500 mt-1">This visa offering does not require any document uploads. You may proceed directly to review.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {requiredDocs.map((doc) => {
                            const docData = getDocForRequirement(activeTraveller, doc);
                            const isUploading = uploadingProgress[`${effectiveActiveId}_${doc.id}`] !== undefined;
                            const uploadPct = uploadingProgress[`${effectiveActiveId}_${doc.id}`] || 0;
                            const isError = Boolean(docData?.error);
                            const isUploaded = Boolean(docData?.name && !docData?.error && !isUploading);
                            const isRequired = doc.required !== false;
                            const isMissing = !docData || docData?.error;
                            const hasFieldError = submittedAttempted && isRequired && isMissing;

                            return (
                              <div
                                key={doc.id}
                                ref={(el) => (docCardRefs.current[`${effectiveActiveId}_${doc.id}`] = el)}
                                className={`rounded-2xl p-5 border transition-all ${
                                  isError
                                    ? 'border-red-400 bg-red-50/15 ring-1 ring-red-300/40'
                                    : isUploaded
                                    ? 'border-emerald-300 bg-emerald-50/15 ring-1 ring-emerald-300/40'
                                    : isUploading
                                    ? 'border-[#2563EB]/40 bg-[#F5F9FF]'
                                    : hasFieldError
                                    ? 'border-red-400 bg-red-50/15 ring-1 ring-red-300/40'
                                    : 'border-slate-200/90 bg-white hover:border-slate-300'
                                }`}
                              >
                                {/* Hidden File Input for Native File Selection */}
                                <input
                                  type="file"
                                  ref={(el) => (docInputRefs.current[`${effectiveActiveId}_${doc.id}`] = el)}
                                  accept={doc.acceptedFormats?.map((f) => '.' + f.toLowerCase()).join(',') || '.pdf,.jpg,.jpeg,.png'}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleProcessSelectedFile(effectiveActiveId, doc.id, file);
                                    }
                                    e.target.value = '';
                                  }}
                                />

                                {/* STATE 1: UPLOADING */}
                                {isUploading ? (
                                  <div className="space-y-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#2563EB]">
                                      <RefreshCw size={15} className="animate-spin" />
                                      <span>Uploading {doc.title}... {uploadPct}%</span>
                                    </div>
                                    <div className="w-full max-w-xs mx-auto h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-[#2563EB] transition-all duration-150 rounded-full"
                                        style={{ width: `${uploadPct}%` }}
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                      Uploading file securely...
                                    </p>
                                  </div>
                                ) : isUploaded ? (
                                  /* STATE 2: UPLOADED / APPROVED (Subtle Green Outline) */
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                          <Check size={13} strokeWidth={3} />
                                        </span>
                                        <span className="text-xs sm:text-sm font-black text-[#082B61]">
                                          {doc.title}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                                        <span>Already uploaded</span>
                                        <Check size={12} strokeWidth={3} />
                                      </span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 flex items-center justify-between gap-3 shadow-2xs">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <FileText size={20} className="text-emerald-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <span className="text-xs font-bold text-[#082B61] truncate block">
                                            {docData.name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium block">
                                            {docData.size} • {docData.uploadedAt || 'Verified'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerFileSelect(effectiveActiveId, doc.id)}
                                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#2563EB] bg-white hover:bg-blue-50/50 text-xs font-bold text-[#2563EB] transition-colors cursor-pointer shadow-2xs"
                                        >
                                          Replace
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDoc(effectiveActiveId, doc.id)}
                                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                          title="Remove file"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    {doc.guidance && (
                                      <p className="text-[11px] text-slate-400 font-medium italic">
                                        "{doc.guidance}"
                                      </p>
                                    )}
                                  </div>
                                ) : isError ? (
                                  /* STATE 3: ERROR (Subtle Red Outline) */
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-red-600">
                                        <AlertCircle size={16} />
                                        <span className="text-xs sm:text-sm font-black">{doc.title}</span>
                                      </div>
                                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200/80">
                                        Upload failed
                                      </span>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-white border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <span className="text-xs font-bold text-red-700 truncate block">
                                            {docData.name}
                                          </span>
                                          <span className="text-[11px] text-red-600 font-medium block">
                                            {docData.error || 'File type or size is not supported.'}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleTriggerFileSelect(effectiveActiveId, doc.id)}
                                        className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 border border-red-200 transition-colors cursor-pointer flex-shrink-0"
                                      >
                                        Replace
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* STATE 4: DEFAULT (BEFORE UPLOAD) */
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs sm:text-sm font-black text-[#082B61]">
                                            {doc.title}
                                          </h4>
                                          {isRequired ? (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/80">
                                              Required
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                              Optional
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                          {doc.subtitle || `${doc.formatsLabel || 'PDF, JPG or PNG'} (Max 5 MB)`}
                                        </p>
                                      </div>
                                      {doc.guidance && (
                                        <span className="text-[11px] text-slate-500 font-medium italic bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg hidden sm:inline-block flex-shrink-0">
                                          "{doc.guidance}"
                                        </span>
                                      )}
                                    </div>

                                    {/* Minimal Drop/Upload Box */}
                                    <div
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleProcessSelectedFile(effectiveActiveId, doc.id, file);
                                      }}
                                      className={`p-5 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-2 transition-all ${
                                        hasFieldError
                                          ? 'border-red-300 bg-red-50/20'
                                          : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-[#2563EB]/50'
                                      }`}
                                    >
                                      <div className="w-8 h-8 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500">
                                        <Upload size={14} />
                                      </div>

                                      <div>
                                        <span className="text-xs font-bold text-[#082B61] block">
                                          Upload {doc.title}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium block">
                                          {doc.formatsLabel || 'PDF, JPG or PNG'} (Max 5 MB)
                                        </span>
                                      </div>

                                      <div className="pt-1 flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerFileSelect(effectiveActiveId, doc.id)}
                                          className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] text-xs font-bold text-[#082B61] shadow-2xs transition-all cursor-pointer"
                                        >
                                          Choose File
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleSimulateUpload(effectiveActiveId, doc.id)}
                                          className="text-[11px] font-bold text-[#2563EB] hover:underline px-2 py-1 cursor-pointer"
                                          title="Simulate sample document upload"
                                        >
                                          Use sample
                                        </button>
                                      </div>
                                    </div>

                                    {/* Short error message if Continue was pressed and document is missing */}
                                    {hasFieldError && (
                                      <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 pt-0.5">
                                        <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                                        <span>{doc.errorMsg}</span>
                                      </div>
                                    )}

                                    {doc.guidance && (
                                      <p className="text-[11px] text-slate-400 font-medium italic sm:hidden">
                                        "{doc.guidance}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Optional "Upload from phone" button */}
                      <div className="pt-2 text-center space-y-3">
                        <div className="relative flex items-center justify-center">
                          <div className="border-t border-slate-200 w-full" />
                          <span className="bg-white px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest absolute">
                            OR
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPhoneUploadModal(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 hover:border-[#2563EB] hover:bg-[#F5F9FF]/60 text-xs font-bold text-[#082B61] transition-all cursor-pointer"
                        >
                          <Smartphone size={15} className="text-[#2563EB]" />
                          <span>Upload from phone</span>
                        </button>
                      </div>

                    </div>

                    {/* In-page Bottom Navigation */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setCurrentStep('travellers')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleContinueClick}
                        className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                      >
                        <span>Continue</span>
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>

                  </div>
                )}

                {/* ====================================================
                    STEP 3: REVIEW APPLICATION (No payment fields)
                    ==================================================== */}
                {currentStep === 'review' && (
                  <div className="space-y-6">
                    
                    {/* Header Intro */}
                    <div className="space-y-1 text-left pt-1">
                      <h2 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
                        Review Application
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Verify your traveller details and uploaded documents before continuing to payment.
                      </p>
                    </div>

                    {/* Destination & Trip Summary Banner */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center bg-slate-50 flex-shrink-0">
                            {flagUrl ? (
                              <img src={flagUrl} alt={`${displayName} flag`} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{flagEmoji}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-black text-[#082B61]">
                                {displayName}
                              </h3>
                              <span className="text-[11px] font-bold text-[#2563EB] bg-[#F5F9FF] px-2.5 py-0.5 rounded-full border border-[#2563EB]/20">
                                {visaType}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                              {stayPeriod} stay • Guaranteed processing by {guaranteedDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>100% Online Verified</span>
                          </span>
                        </div>
                      </div>

                      {/* Compact Quick Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Destination</span>
                          <span className="font-black text-[#082B61] mt-0.5 block truncate">{displayName}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Visa Type</span>
                          <span className="font-black text-[#082B61] mt-0.5 block truncate">{visaType}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Total Travellers</span>
                          <span className="font-black text-[#082B61] mt-0.5 block">{travellers.length} {travellers.length === 1 ? 'Person' : 'Persons'}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Reference ID</span>
                          <span className="font-mono font-black text-[#2563EB] mt-0.5 block">{applicationId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Applicant Breakdown */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-[#082B61] uppercase tracking-wider">
                          Applicant Details ({travellers.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep('travellers')}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Edit Travellers</span>
                        </button>
                      </div>

                      {travellers.map((t, idx) => {
                        const isPrimary = idx === 0;
                        const docEntries = Object.entries(t.docs || {}).filter(([, d]) => d && !d.error);

                        return (
                          <div
                            key={t.id}
                            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4"
                          >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-extrabold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="text-sm font-black text-[#082B61]">
                                    {t.firstName || 'Traveller'} {t.lastName || ''}
                                  </span>
                                  {isPrimary && (
                                    <span className="ml-2 text-[10px] font-extrabold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                                      Primary Applicant
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTravellerId(t.id);
                                  setCurrentStep('travellers');
                                }}
                                className="text-xs font-bold text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Edit</span>
                              </button>
                            </div>

                            {/* Info Columns */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                                <span className="font-bold text-[#082B61] mt-0.5 block">{t.dob || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Gender</span>
                                <span className="font-bold text-[#082B61] mt-0.5 block">{t.gender || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Nationality</span>
                                <span className="font-bold text-[#082B61] mt-0.5 block">{t.nationality || 'Indian'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Passport Number</span>
                                <span className="font-mono font-bold text-[#082B61] mt-0.5 block">{t.passportNumber || '—'}</span>
                              </div>
                            </div>

                            {isPrimary && (t.email || t.phone) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Email Address</span>
                                  <span className="font-bold text-[#082B61] mt-0.5 block truncate">{t.email || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Phone Number</span>
                                  <span className="font-bold text-[#082B61] mt-0.5 block">{t.phone || '—'}</span>
                                </div>
                              </div>
                            )}

                            {/* Documents Verified Box */}
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  Verified Documents ({docEntries.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTravellerId(t.id);
                                    setCurrentStep('documents');
                                  }}
                                  className="text-[11px] font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
                                >
                                  Edit Docs
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {docEntries.map(([docKey, docData]) => (
                                  <span
                                    key={docKey}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800"
                                  >
                                    <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                                    <span className="truncate max-w-[150px]">{docData.name || docKey}</span>
                                  </span>
                                ))}
                                {docEntries.length === 0 && (
                                  <span className="text-xs text-slate-400 italic">No documents attached</span>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Declarations & Additional Information Review Card */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-black text-[#082B61] uppercase tracking-wider">
                          Visa History & Additional Notes
                        </h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep('travellers')}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Previous Visa Refusal ({displayName})</span>
                          <span className="font-bold text-[#082B61] mt-0.5 block">
                            {previousVisaRefusal ? `Yes — ${previousVisaRefusalReason.trim() || 'Details provided'}` : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Additional Information</span>
                          <span className="font-medium text-[#082B61] mt-0.5 block">
                            {additionalInformation.trim() || 'Not provided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* In-page Bottom Navigation for Review step */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setCurrentStep('documents')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Documents</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep('payment')}
                        className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                      >
                        <span>Continue to Payment</span>
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>

                  </div>
                )}

                {/* ====================================================
                    STEP 4: FINAL PAYMENT STEP (Separate Dedicated Page)
                    ==================================================== */}
                {currentStep === 'payment' && (
                  <div className="space-y-6">
                    
                    {/* Payment Page Intro */}
                    <div className="space-y-1 text-left pt-1">
                      <h2 className="text-xl sm:text-2xl font-black text-[#082B61] tracking-tight">
                        Complete Your Application
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Review your application summary and complete the payment step.
                      </p>
                    </div>

                    {/* Application Summary (Compact near top) */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                          Application Summary
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(true)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
                        >
                          <span>View Application</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Destination</span>
                          <span className="font-bold text-[#082B61] mt-0.5 block truncate">{displayName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Visa Type</span>
                          <span className="font-bold text-[#082B61] mt-0.5 block truncate">{visaType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Travellers</span>
                          <span className="font-bold text-[#082B61] mt-0.5 block">{travellers.length}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Application ID / Reference</span>
                          <span className="font-mono font-bold text-[#082B61] mt-0.5 block">{applicationId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order / Fee Summary Card */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                          Fee Summary
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">
                          {travellers.length} {travellers.length === 1 ? 'Applicant' : 'Applicants'}
                        </span>
                      </div>

                      <div className="space-y-3 text-xs sm:text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Visa / Embassy Fee</span>
                          <span className="font-bold text-[#082B61]">₹{totalEmbassyFee.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Service Fee</span>
                          <span className="font-bold text-[#082B61]">₹{totalServiceFee.toLocaleString('en-IN')}</span>
                        </div>

                        {/* Strong Visual Hierarchy for Total */}
                        <div className="pt-3 border-t border-slate-200/90 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-black text-[#082B61] block">Total</span>
                            <span className="text-[11px] text-slate-400 font-medium">All taxes and fees included</span>
                          </div>
                          <span className="text-xl sm:text-2xl font-black text-[#2563EB]">
                            ₹{totalFee.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div
                      className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all space-y-4 ${
                        paymentErrors.method
                          ? 'border-red-400 ring-2 ring-red-100 bg-red-50/10'
                          : 'border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                            Payment Method
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Select your preferred payment method to proceed
                          </p>
                        </div>
                        {paymentErrors.method && (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle size={13} />
                            <span>{paymentErrors.method}</span>
                          </span>
                        )}
                      </div>

                      {/* Selectable Options: UPI, Credit / Debit Card, Net Banking */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        
                        {/* Option 1: UPI */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethod('upi');
                            if (paymentErrors.method) {
                              setPaymentErrors((prev) => {
                                const next = { ...prev };
                                delete next.method;
                                return next;
                              });
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            selectedPaymentMethod === 'upi'
                              ? 'border-[#2563EB] bg-[#F5F9FF] ring-2 ring-[#2563EB]/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                selectedPaymentMethod === 'upi'
                                  ? 'border-[#2563EB] bg-[#2563EB]'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {selectedPaymentMethod === 'upi' && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-extrabold text-[#082B61]">
                                UPI
                              </span>
                            </div>
                            <QrCode size={16} className={selectedPaymentMethod === 'upi' ? 'text-[#2563EB]' : 'text-slate-400'} />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium leading-tight">
                            Google Pay, PhonePe, Paytm, QR & BHIM
                          </span>
                        </button>

                        {/* Option 2: Credit / Debit Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethod('card');
                            if (paymentErrors.method) {
                              setPaymentErrors((prev) => {
                                const next = { ...prev };
                                delete next.method;
                                return next;
                              });
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            selectedPaymentMethod === 'card'
                              ? 'border-[#2563EB] bg-[#F5F9FF] ring-2 ring-[#2563EB]/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                selectedPaymentMethod === 'card'
                                  ? 'border-[#2563EB] bg-[#2563EB]'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {selectedPaymentMethod === 'card' && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-extrabold text-[#082B61]">
                                Credit / Debit Card
                              </span>
                            </div>
                            <CreditCard size={16} className={selectedPaymentMethod === 'card' ? 'text-[#2563EB]' : 'text-slate-400'} />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium leading-tight">
                            Visa, Mastercard, RuPay & International Cards
                          </span>
                        </button>

                        {/* Option 3: Net Banking */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethod('netbanking');
                            if (paymentErrors.method) {
                              setPaymentErrors((prev) => {
                                const next = { ...prev };
                                delete next.method;
                                return next;
                              });
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            selectedPaymentMethod === 'netbanking'
                              ? 'border-[#2563EB] bg-[#F5F9FF] ring-2 ring-[#2563EB]/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                selectedPaymentMethod === 'netbanking'
                                  ? 'border-[#2563EB] bg-[#2563EB]'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {selectedPaymentMethod === 'netbanking' && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-extrabold text-[#082B61]">
                                Net Banking
                              </span>
                            </div>
                            <Building2 size={16} className={selectedPaymentMethod === 'netbanking' ? 'text-[#2563EB]' : 'text-slate-400'} />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium leading-tight">
                            HDFC, ICICI, SBI, Axis & 50+ Indian Banks
                          </span>
                        </button>

                      </div>

                      {/* Subtle helper note when a method is selected */}
                      {selectedPaymentMethod && (
                        <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/15 text-xs text-[#082B61] flex items-center gap-2 animate-in fade-in duration-150">
                          <CheckCircle2 size={15} className="text-[#2563EB] flex-shrink-0" />
                          <span>
                            {selectedPaymentMethod === 'upi' && 'Instant payment via any UPI app or QR code upon proceeding.'}
                            {selectedPaymentMethod === 'card' && 'All major credit and debit cards (Visa, Mastercard, RuPay) supported.'}
                            {selectedPaymentMethod === 'netbanking' && 'Direct net banking across all major Indian banks supported.'}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* Security / Trust area (Extremely subtle, as requested) */}
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium py-1">
                      <Lock size={13} className="text-slate-400" />
                      <span>
                        <strong className="text-slate-600 font-bold">Secure Payment</strong> — Your payment information is securely processed.
                      </span>
                    </div>

                    {/* In-page Bottom Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setCurrentStep('review')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Review</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleProceedToPayment}
                        disabled={!selectedPaymentMethod || isSubmitting}
                        className={`inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                          !selectedPaymentMethod
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#2563EB] hover:bg-[#123B7A] text-white shadow-md shadow-[#2563EB]/25 active:scale-98'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Clock size={15} className="animate-spin" />
                            <span>Processing Payment...</span>
                          </>
                        ) : (
                          <>
                            <span>Proceed to Payment</span>
                            <ArrowRight size={15} strokeWidth={2.5} />
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

          </main>
        )}
      </div>

      {/* ========================================================
          3. FIXED / STICKY BOTTOM ACTION BAR
          ======================================================== */}
      {!isSubmitted && !['name', 'passport_upload', 'passport_processing', 'passport_back_upload', 'passport_back_processing', 'passport_review', 'passport_photo'].includes(currentStep) && (
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] py-3 sm:py-3.5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            
            {/* Left: ← Back Button */}
            <div>
              {currentStep === 'travellers' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(destination?.passportPhotoRequired !== false ? 'passport_photo' : 'passport_review')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'documents' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('travellers')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : currentStep === 'review' ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep('documents')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentStep('review')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              )}
            </div>

            {/* Right: Small Error Notice + Primary Action Button */}
            <div className="flex items-center gap-3">
              
              {/* Small notice on travellers step if validation failed */}
              {submittedAttempted && currentStep === 'travellers' && totalStepErrors > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
                  <AlertCircle size={14} className="text-red-500" />
                  <span>Please check highlighted fields</span>
                </div>
              )}

              {/* Notice on payment step if no payment method selected */}
              {paymentErrors.method && currentStep === 'payment' && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
                  <AlertCircle size={14} className="text-red-500" />
                  <span>Please select a payment method</span>
                </div>
              )}

              {/* Step 1: Continue */}
              {currentStep === 'travellers' && (
                <button
                  type="button"
                  onClick={handleContinueClick}
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}

              {/* Step 2: Continue */}
              {currentStep === 'documents' && (
                <button
                  type="button"
                  onClick={handleContinueClick}
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}

              {/* Step 3: Review -> Continue to Payment */}
              {currentStep === 'review' && (
                <button
                  type="button"
                  onClick={() => setCurrentStep('payment')}
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#2563EB]/25 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}

              {/* Step 4: Proceed to Payment */}
              {currentStep === 'payment' && (
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-7 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-extrabold transition-all shadow-md ${
                    !selectedPaymentMethod
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#2563EB] hover:bg-[#123B7A] text-white shadow-[#2563EB]/30 active:scale-98 cursor-pointer'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Clock size={16} className="animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment</span>
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          VIEW APPLICATION MODAL (Compact Summary)
          ======================================================== */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#2563EB]" />
                <h3 className="text-sm sm:text-base font-black text-[#082B61]">
                  Application Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference ID</span>
                  <span className="font-mono font-black text-[#082B61] text-sm">{applicationId}</span>
                </div>
                <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                  {displayName} • {visaType}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Travellers ({travellers.length})
                </span>
                {travellers.map((t, idx) => (
                  <div key={t.id} className="p-3 rounded-xl border border-slate-200/70 bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#082B61]">
                        {idx + 1}. {t.firstName || 'Traveller'} {t.lastName || ''}
                      </span>
                      <span className="font-mono text-slate-500 font-bold text-[11px]">
                        {t.passportNumber || 'No Passport'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>DOB: {t.dob || '—'}</span>
                      <span>Nationality: {t.nationality || 'Indian'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#2563EB]/20 flex items-center justify-between">
                <span className="font-black text-[#082B61]">Total Amount Payable</span>
                <span className="font-black text-base text-[#2563EB]">₹{totalFee.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-full py-2.5 rounded-full bg-[#082B61] hover:bg-[#123B7A] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          UPLOAD FROM PHONE MODAL
          ======================================================== */}
      {showPhoneUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#2563EB]" />
                <h3 className="text-sm font-black text-[#082B61]">
                  Upload from Phone
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center space-y-3">
              <div className="w-36 h-36 mx-auto bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-3 shadow-inner">
                <QrCode size={90} className="text-[#082B61]" />
                <span className="text-[10px] font-bold text-slate-400 mt-1">Scan to capture</span>
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Scan this QR code with your phone camera to snap photos of your passport and photograph.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handlePhoneMockUpload}
                disabled={phoneUploadSuccess}
                className="w-full py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {phoneUploadSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Documents Received from Phone!</span>
                  </>
                ) : (
                  <span>Simulate Instant Phone Upload</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
