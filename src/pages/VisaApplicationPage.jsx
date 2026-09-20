import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Users,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Upload,
  Check,
  Smartphone,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  QrCode,
  X,
  RefreshCw,
  Lock,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  Edit3,
  Loader2
} from 'lucide-react';
import { visaService, applicationService } from '../services';
import { APPLICATION_STATUS, REQUIRED_ACTION } from '../models/status';

export default function VisaApplicationPage() {
  const { country: countryParam } = useParams();
  const location = useLocation();

  // Find destination matching URL param via visaService
  const [destination, setDestination] = useState(null);
  const [isLoadingVisa, setIsLoadingVisa] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadVisaData() {
      setIsLoadingVisa(true);
      try {
        const found = await visaService.getVisaById(countryParam);
        if (isMounted) {
          setDestination(found);
        }
      } catch (e) {
        console.warn('Failed to load visa in application page:', e);
      } finally {
        if (isMounted) {
          setIsLoadingVisa(false);
        }
      }
    }
    loadVisaData();
    return () => { isMounted = false; };
  }, [countryParam]);

  // Extract initial traveller count if provided from Visa Details page
  const queryParams = new URLSearchParams(location.search);
  const initialTravellerCount = parseInt(
    queryParams.get('travellers') || location.state?.travellerCount || '1',
    10
  );
  const validCount = isNaN(initialTravellerCount) || initialTravellerCount < 1 ? 1 : Math.min(8, initialTravellerCount);

  // Navigation steps: 'travellers' | 'documents' | 'review' | 'payment'
  const [currentStep, setCurrentStep] = useState('travellers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [applicationId] = useState(() => 'MV-' + Math.floor(100000 + Math.random() * 900000));

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

  // Touched map to track user interaction: { [`${travellerId}_${field}`]: true }
  const [touched, setTouched] = useState({});

  // Scroll to top on step or submission change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, isSubmitted]);

  if (isLoadingVisa) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
        <p className="text-sm font-bold text-[#082B61]">Loading visa application...</p>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-3xl font-extrabold text-[#123B7A]">Destination Not Found</h2>
        <p className="text-base text-[#64748B] mt-2 mb-6">
          We couldn't locate visa details for "{countryParam}".
        </p>
        <Link
          to="/visa"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563EB] text-white text-sm font-bold shadow-md hover:bg-[#123B7A] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Browse All Visa Destinations</span>
        </Link>
      </div>
    );
  }

  const {
    displayName,
    flagUrl,
    flagEmoji,
    visaType = 'E-Visa',
    stayPeriod = '60 Days',
    guaranteedDate = '24 Sep 2026, 4:00 PM',
    fees = '₹2,990'
  } = destination;

  const baseFeeNum = fees ? parseInt(fees.replace(/[^0-9]/g, ''), 10) || 2990 : 2990;
  const totalFee = baseFeeNum * travellers.length;
  const embassyFeePerPerson = Math.round(baseFeeNum * 0.7);
  const serviceFeePerPerson = baseFeeNum - embassyFeePerPerson;
  const totalEmbassyFee = embassyFeePerPerson * travellers.length;
  const totalServiceFee = serviceFeePerPerson * travellers.length;

  const effectiveActiveId = travellers.some((t) => t.id === activeTravellerId)
    ? activeTravellerId
    : travellers[0]?.id || '';
  const activeTraveller = travellers.find((t) => t.id === effectiveActiveId) || travellers[0];
  const activeIndex = travellers.findIndex((t) => t.id === effectiveActiveId);

  // Dynamic document requirements per selected visa destination
  const requiredDocs = React.useMemo(() => {
    if (destination?.documentsRequired && destination.documentsRequired.length > 0) {
      return destination.documentsRequired.map((doc, idx) => {
        const lower = doc.name.toLowerCase();
        let id = `doc_${idx}`;
        let title = doc.name;
        let subtitle = 'PDF, JPG or PNG (Max 5 MB)';
        let guidance = doc.detail || 'Upload a clear, readable copy.';
        let errorMsg = `${doc.name} is required`;

        if (lower.includes('passport')) {
          id = 'passport';
          title = 'Passport';
          subtitle = 'PDF, JPG or PNG';
          guidance = 'Make sure all four corners are visible.';
          errorMsg = 'Passport document is required';
        } else if (lower.includes('photo') || lower.includes('portrait')) {
          id = 'photo';
          title = 'Photograph';
          subtitle = 'Recent passport-size photograph';
          guidance = 'Use a clear recent passport-size photo.';
          errorMsg = 'Please upload a valid photograph';
        } else if (lower.includes('ticket') || lower.includes('flight')) {
          id = 'flight_ticket';
          title = 'Confirmed Flight Ticket';
          subtitle = 'PDF, JPG or PNG';
          guidance = 'Confirmed return or onward flight itinerary.';
          errorMsg = 'Confirmed flight ticket is required';
        } else if (lower.includes('itinerary') || lower.includes('hotel')) {
          id = 'itinerary';
          title = 'Travel Itinerary';
          subtitle = 'Hotel booking or trip plan';
          guidance = 'Hotel reservation or trip itinerary.';
          errorMsg = 'Travel itinerary is required';
        }

        return {
          id,
          name: doc.name,
          title,
          subtitle,
          guidance,
          errorMsg
        };
      });
    }

    return [
      {
        id: 'passport',
        name: 'Passport',
        title: 'Passport',
        subtitle: 'PDF, JPG or PNG',
        guidance: 'Make sure all four corners are visible.',
        errorMsg: 'Passport document is required'
      },
      {
        id: 'photo',
        name: 'Photograph',
        title: 'Photograph',
        subtitle: 'Recent passport-size photograph',
        guidance: 'Use a clear recent passport-size photo.',
        errorMsg: 'Please upload a valid photograph'
      }
    ];
  }, [destination]);

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
      return null;
    }

    if (field === 'expiryDate') {
      if (!val) return 'Passport expiry date is required';
      const d = new Date(val);
      if (d <= new Date()) return 'Passport is expired. Must be currently valid';
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

  const getDocsStatus = (t) => {
    if (!t?.docs) return { completed: false, count: 0, total: requiredDocs.length };
    const uploadedDocs = requiredDocs.filter((d) => t.docs[d.id] && !t.docs[d.id].error);
    return {
      completed: uploadedDocs.length === requiredDocs.length,
      count: uploadedDocs.length,
      total: requiredDocs.length
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
      return dStatus.total - dStatus.count;
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
        if (t.docs?.[d.id] && !t.docs[d.id].error) earnedPoints++;
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

  const handleFieldBlur = (_field) => {
    // Blur handler reserved for future extensions
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
    const isAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);

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
                    ? 'File type or size is not supported.'
                    : 'File type or size is not supported.'
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
              return {
                ...t,
                docs: {
                  ...t.docs,
                  [docId]: {
                    name: file.name,
                    size: formatFileSize(file.size),
                    uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    error: null
                  }
                }
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
    const mockNames = {
      passport: 'Passport.pdf',
      photo: 'Passport_Photo.jpg',
      flight_ticket: 'Flight_Ticket.pdf',
      itinerary: 'Travel_Itinerary.pdf'
    };
    const sampleName = mockNames[docId] || `${docId.toUpperCase()}.pdf`;
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
    setTravellers((prev) =>
      prev.map((t) => {
        if (t.id === travellerId) {
          const updatedDocs = { ...t.docs };
          delete updatedDocs[docId];
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

          // Find first missing or errored doc for this traveller
          const firstMissingDoc = requiredDocs.find(
            (d) =>
              !firstTravellerWithDocError.docs?.[d.id] ||
              firstTravellerWithDocError.docs[d.id].error
          );

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
    //   name: 'Mr Visa',
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
        const newApp = {
          id: applicationId,
          visaId: destination.id,
          countryId: destination.countryId || destination.id,
          countryName: displayName,
          destination: displayName,
          flagEmoji: flagEmoji || '✈️',
          visaType: visaType,
          travellerCount: travellers.length,
          travellers: travellers.map((t, idx) => ({
            id: t.id || `trav_${idx + 1}`,
            name: `${t.firstName} ${t.lastName}`.trim() || 'Applicant',
            firstName: t.firstName,
            lastName: t.lastName,
            passportNumber: t.passportNumber || 'Pending',
            nationality: t.nationality || 'Indian',
            dob: t.dob || '—',
            gender: t.gender || '—'
          })),
          documents: requiredDocs.map((d, idx) => ({
            id: `doc_${idx + 1}`,
            name: d.title,
            status: 'Verified'
          })),
          submittedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: APPLICATION_STATUS.APPLICATION_RECEIVED,
          requiredAction: REQUIRED_ACTION.NONE,
          adminMessage: 'Application received and securely registered with consulate queue.',
          expectedDate: guaranteedDate,
          amountPaid: `₹${totalFee.toLocaleString('en-IN')}`,
          amount: `₹${totalFee.toLocaleString('en-IN')}`
        };
        await applicationService.createApplication(newApp);
      } catch (e) {
        console.warn('Failed to save application via service', e);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 900);
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
              {/* Official Mr Visa Brand Lockup (Exactly matching Header.jsx) */}
              <Link
                to="/"
                className="flex items-center gap-2 sm:gap-3 focus:outline-none group select-none pr-3 sm:pr-4 border-r border-slate-200"
                aria-label="Mr Visa Home"
              >
                <img
                  src="/mrvisa-mascot.png"
                  alt="Mr Visa Mascot"
                  className="h-10 sm:h-11 w-auto object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-[1.03]"
                />
                <div className="flex flex-col justify-center select-none">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#123B7A] tracking-tight leading-none">
                    Mr Visa
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.03em] text-[#2563EB] mt-1 leading-none">
                    On Time, Every Time.
                  </span>
                </div>
              </Link>

              {/* ← Back Button */}
              {currentStep === 'travellers' ? (
                <Link
                  to={`/visa/${destination.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100/70"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </Link>
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
                  to={`/visa/${destination.id}`}
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
            
            {/* Simple Horizontal Step Progress: Traveller → Documents → Review → Payment */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 py-1 text-xs font-bold text-slate-400 select-none">
              {/* Step 1: Traveller */}
              <button
                type="button"
                onClick={() => setCurrentStep('travellers')}
                className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentStep === 'travellers'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-600 hover:text-[#082B61]'
                }`}
              >
                {travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed) ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : (
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'travellers' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
                )}
                <span>Traveller</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 2: Documents */}
              <button
                type="button"
                onClick={() => {
                  if (travellers.every((t, i) => getPersonalInfoStatus(t, i === 0).completed && getPassportInfoStatus(t).completed)) {
                    setCurrentStep('documents');
                  }
                }}
                className={`inline-flex items-center gap-1.5 transition-colors ${
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
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'documents' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
                )}
                <span>Documents</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 3: Review */}
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
                className={`inline-flex items-center gap-1.5 transition-colors ${
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
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'review' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
                )}
                <span>Review</span>
              </button>

              <span className="text-slate-300">→</span>

              {/* Step 4: Payment */}
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
                className={`inline-flex items-center gap-1.5 transition-colors ${
                  currentStep === 'payment'
                    ? 'text-[#2563EB] font-black'
                    : 'text-slate-400 hover:text-[#082B61]'
                } cursor-pointer`}
              >
                <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${currentStep === 'payment' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'}`}>4</span>
                <span>Payment</span>
              </button>
            </div>

            {/* ====================================================
                STEP 1: TRAVELLERS (Interactive Form)
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
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        As printed on your official passport
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {/* First Name */}
                      <div>
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          First Name *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Enter your first name
                        </span>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_firstName`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.firstName}
                            onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'firstName',
                              activeIndex === 0
                            )}`}
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Last Name *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Enter your last name
                        </span>
                        <div className="relative">
                          <input
                            ref={(el) => (fieldRefs.current[`${effectiveActiveId}_lastName`] = el)}
                            type="text"
                            placeholder=""
                            value={activeTraveller.lastName}
                            onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            className={`w-full px-3.5 py-2.5 pr-9 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${getFieldStyleClass(
                              activeTraveller,
                              'lastName',
                              activeIndex === 0
                            )}`}
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Date of Birth *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Select your date of birth
                        </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Gender *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Select your gender
                        </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Nationality *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Select your nationality
                        </span>
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
                            <label className="text-xs font-bold text-[#082B61] block leading-none">
                              Email Address *
                            </label>
                            <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                              Enter your email address
                            </span>
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
                            <label className="text-xs font-bold text-[#082B61] block leading-none">
                              Phone Number *
                            </label>
                            <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                              Enter your phone number
                            </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Passport Number *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Enter your passport number
                        </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Place of Issue *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Enter your passport place of issue
                        </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Passport Issue Date *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Select your passport issue date
                        </span>
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
                        <label className="text-xs font-bold text-[#082B61] block leading-none">
                          Passport Expiry Date *
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                          Select your passport expiry date
                        </span>
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
                                    <span>{requiredDocs.length - dStatus.count} required</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200/60">
                                    {requiredDocs.length - dStatus.count} {requiredDocs.length - dStatus.count === 1 ? 'document' : 'documents'} required
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
                      <div className="space-y-4">
                        {requiredDocs.map((doc) => {
                          const docData = activeTraveller.docs?.[doc.id];
                          const isUploading = uploadingProgress[`${effectiveActiveId}_${doc.id}`] !== undefined;
                          const uploadPct = uploadingProgress[`${effectiveActiveId}_${doc.id}`] || 0;
                          const isError = Boolean(docData?.error);
                          const isUploaded = Boolean(docData?.name && !docData?.error && !isUploading);
                          const isMissing = !docData || docData?.error;
                          const hasFieldError = submittedAttempted && isMissing;

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
                                accept=".pdf,.jpg,.jpeg,.png"
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
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                                      Uploaded successfully
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
                                      <h4 className="text-xs sm:text-sm font-black text-[#082B61]">
                                        {doc.title}
                                      </h4>
                                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        {doc.detail || doc.subtitle}
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
                                        PDF, JPG or PNG (Max 5 MB)
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
                        const docEntries = Object.entries(t.docs || {}).filter(([_, d]) => d && !d.error);

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
      {!isSubmitted && (
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] py-3 sm:py-3.5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            
            {/* Left: ← Back Button */}
            <div>
              {currentStep === 'travellers' ? (
                <Link
                  to={`/visa/${destination.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </Link>
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
