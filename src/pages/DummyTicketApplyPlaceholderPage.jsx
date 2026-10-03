import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Plane,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { dummyTicketService, authService } from '../services';

const DIAL_CODES = [
  { code: '+91', country: 'India' },
  { code: '+971', country: 'UAE' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+65', country: 'Singapore' },
  { code: '+66', country: 'Thailand' },
  { code: '+60', country: 'Malaysia' },
  { code: '+61', country: 'Australia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' }
];

const PURPOSE_OPTIONS = [
  'Visa Application',
  'Proof of Return / Onward Journey',
  'Immigration & Border Control',
  'Flight Transit / Layover',
  'Company / Travel Authorization',
  'Other'
];

export default function DummyTicketApplyPlaceholderPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Package Catalog Details
  const [ticketService, setTicketService] = useState(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(true);

  // Form State
  const [tripType, setTripType] = useState('Return'); // 'One Way' | 'Return'

  const [travellers, setTravellers] = useState([
    {
      id: 1,
      title: 'Mr',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: 'Indian'
    }
  ]);

  const [contact, setContact] = useState({
    dialCode: '+91',
    phone: '',
    email: ''
  });

  const [flight, setFlight] = useState({
    from: '',
    to: '',
    departureDate: '',
    returnDate: ''
  });

  const [purpose, setPurpose] = useState('Visa Application');
  const [message, setMessage] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('WhatsApp'); // 'WhatsApp' | 'Email'

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function loadService() {
      setIsLoadingPackage(true);
      try {
        if (slug) {
          const data = await dummyTicketService.getServiceBySlug(slug);
          if (isMounted && data) setTicketService(data);
        } else {
          const all = await dummyTicketService.getAllServices();
          if (isMounted && all && all.length > 0) setTicketService(all[0]);
        }
      } catch (err) {
        console.warn('Failed to load dummy ticket service package:', err);
      } finally {
        if (isMounted) setIsLoadingPackage(false);
      }
    }
    loadService();
    return () => { isMounted = false; };
  }, [slug]);

  // Autofill user email if authenticated
  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setContact((prev) => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
      if (travellers.length === 1 && !travellers[0].firstName && user.firstName) {
        setTravellers([
          {
            id: 1,
            title: 'Mr',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            dateOfBirth: '',
            nationality: 'Indian'
          }
        ]);
      }
    }
  }, []);

  const addTraveller = () => {
    setTravellers((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: 'Mr',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        nationality: 'Indian'
      }
    ]);
  };

  const removeTraveller = (id) => {
    if (travellers.length <= 1) return;
    setTravellers((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTraveller = (id, field, value) => {
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const validateForm = () => {
    const errors = {};

    // Validate Travellers
    travellers.forEach((t, idx) => {
      if (!t.firstName.trim()) {
        errors[`traveller_${t.id}_firstName`] = `First name is required for Traveller ${idx + 1}`;
      }
      if (!t.lastName.trim()) {
        errors[`traveller_${t.id}_lastName`] = `Last name is required for Traveller ${idx + 1}`;
      }
    });

    // Validate Contact Details
    if (!contact.phone.trim()) {
      errors.phone = 'Contact phone number is required';
    } else if (!/^\d{6,15}$/.test(contact.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (6–15 digits)';
    }

    if (!contact.email.trim()) {
      errors.email = 'Contact email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate Flight Details
    if (!flight.from.trim()) {
      errors.from = 'Departure origin city/airport is required';
    }
    if (!flight.to.trim()) {
      errors.to = 'Destination city/airport is required';
    }
    if (!flight.departureDate) {
      errors.departureDate = 'Departure date is required';
    }
    if (tripType === 'Return') {
      if (!flight.returnDate) {
        errors.returnDate = 'Return date is required for round-trip flights';
      } else if (flight.departureDate && flight.returnDate < flight.departureDate) {
        errors.returnDate = 'Return date cannot precede departure date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        serviceId: ticketService?._id || ticketService?.id || null,
        serviceTitle: ticketService?.title || 'Verified Flight Reservation',
        tripType,
        travellers,
        contact,
        flight,
        purpose,
        message,
        requiredDate,
        deliveryMethod,
        price: ticketService?.price || 499
      };

      const result = await dummyTicketService.submitRequest(payload);
      setSubmittedRequest(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit dummy ticket request:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit request. Please try again.';
      setFormErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const packageTitle = ticketService?.title || 'Verified Flight Reservation';
  const unitPrice = Number(ticketService?.price) || 499;
  const totalPrice = unitPrice * (travellers.length || 1);

  // Success Confirmation State Screen
  if (submittedRequest) {
    return (
      <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] py-16 px-6">
        <div className="max-w-[700px] mx-auto bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] block mb-1">
              Reservation Request Logged
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              Flight Reservation Confirmed
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Your itinerary request has been submitted directly to our reservation desk.
            </p>
          </div>

          {/* Reference pill */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 inline-block text-center mx-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Reservation Reference ID
            </span>
            <span className="text-xl font-black text-[#2563EB] tracking-wider mt-0.5 block">
              {submittedRequest.requestId || 'DT-2026-PENDING'}
            </span>
          </div>

          {/* Request summary box */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Trip Route</span>
              <span className="font-bold text-[#082B61]">{flight.from} → {flight.to} ({tripType})</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Travel Date</span>
              <span className="font-bold text-[#082B61]">
                {flight.departureDate} {flight.returnDate ? `• Return: ${flight.returnDate}` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Passengers ({travellers.length})</span>
              <span className="font-bold text-[#082B61]">
                {travellers.map((t) => `${t.firstName} ${t.lastName}`).join(', ')}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Delivery Channel</span>
              <span className="font-bold text-[#2563EB]">{deliveryMethod} ({contact.phone || contact.email})</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-slate-700">Total Booking Fee</span>
              <span className="font-black text-[#082B61] text-sm">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/account"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              Track in My Account
            </Link>
            <Link
              to="/dummy-tickets"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Back to Flight Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFBFD] min-h-screen text-[#0F172A] pb-24">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-100 py-6">
        <div className="max-w-[1000px] mx-auto px-6 flex items-center justify-between">
          <Link
            to="/dummy-tickets"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Flight Reservations</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Lock size={12} className="text-emerald-500" />
            <span>Embassy Verifiable GDS Reservation</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        {isLoadingPackage ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={36} className="animate-spin text-[#2563EB] mb-3" />
            <p className="text-sm font-bold text-[#082B61]">Loading reservation form...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header info */}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] block mb-1">
                Booking Request Form
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
                {packageTitle}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Fill in your travel route, flight dates, and passenger details. Your verifiable airline PNR itinerary will be generated for visa submission.
              </p>
            </div>

            {/* Error banner */}
            {formErrors.submit && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            {/* MAIN FORM CONTAINER */}
            <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-10">
              
              {/* SECTION 1: TRIP TYPE */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-3">
                  Trip Type
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setTripType('One Way')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tripType === 'One Way'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    One Way
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripType('Return')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tripType === 'Return'
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Return
                  </button>
                </div>
              </div>

              {/* SECTION 2: FLIGHT DETAILS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                  <Plane size={18} className="text-[#2563EB]" />
                  <span>Flight Route & Travel Dates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Origin City */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      From (City / Airport) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New Delhi (DEL)"
                      value={flight.from}
                      onChange={(e) => setFlight((prev) => ({ ...prev, from: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                        formErrors.from ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    />
                    {formErrors.from && <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.from}</p>}
                  </div>

                  {/* Destination City */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      To (City / Airport) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paris (CDG)"
                      value={flight.to}
                      onChange={(e) => setFlight((prev) => ({ ...prev, to: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                        formErrors.to ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    />
                    {formErrors.to && <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.to}</p>}
                  </div>

                  {/* Departure Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Departure Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={flight.departureDate}
                      onChange={(e) => setFlight((prev) => ({ ...prev, departureDate: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                        formErrors.departureDate ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    />
                    {formErrors.departureDate && (
                      <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.departureDate}</p>
                    )}
                  </div>

                  {/* Return Date (Rendered only if tripType === 'Return') */}
                  {tripType === 'Return' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Return Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={flight.returnDate}
                        min={flight.departureDate || undefined}
                        onChange={(e) => setFlight((prev) => ({ ...prev, returnDate: e.target.value }))}
                        className={`w-full px-4 py-2.5 rounded-xl border text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                          formErrors.returnDate ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      />
                      {formErrors.returnDate && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.returnDate}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: PASSENGERS / TRAVELLERS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                    <User size={18} className="text-[#2563EB]" />
                    <span>Passenger Details</span>
                  </div>

                  <button
                    type="button"
                    onClick={addTraveller}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Traveller</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {travellers.map((traveller, index) => (
                    <div
                      key={traveller.id}
                      className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[#2563EB]">
                          Traveller {index + 1}
                        </span>
                        {travellers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTraveller(traveller.id)}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                            title="Remove traveller"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Title */}
                        <div className="sm:col-span-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                          <select
                            value={traveller.title}
                            onChange={(e) => updateTraveller(traveller.id, 'title', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Master">Master</option>
                          </select>
                        </div>

                        {/* First Name */}
                        <div className="sm:col-span-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Given name"
                            value={traveller.firstName}
                            onChange={(e) => updateTraveller(traveller.id, 'firstName', e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                              formErrors[`traveller_${traveller.id}_firstName`] ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                            }`}
                          />
                          {formErrors[`traveller_${traveller.id}_firstName`] && (
                            <p className="text-[11px] text-red-500 mt-1 font-semibold">
                              {formErrors[`traveller_${traveller.id}_firstName`]}
                            </p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div className="sm:col-span-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Surname"
                            value={traveller.lastName}
                            onChange={(e) => updateTraveller(traveller.id, 'lastName', e.target.value)}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                              formErrors[`traveller_${traveller.id}_lastName`] ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                            }`}
                          />
                          {formErrors[`traveller_${traveller.id}_lastName`] && (
                            <p className="text-[11px] text-red-500 mt-1 font-semibold">
                              {formErrors[`traveller_${traveller.id}_lastName`]}
                            </p>
                          )}
                        </div>

                        {/* Date of Birth */}
                        <div className="sm:col-span-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={traveller.dateOfBirth}
                            onChange={(e) => updateTraveller(traveller.id, 'dateOfBirth', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: CONTACT DETAILS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                  <Phone size={18} className="text-[#2563EB]" />
                  <span>Contact Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dial Code */}
                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Country / Dial Code</label>
                    <select
                      value={contact.dialCode}
                      onChange={(e) => setContact((prev) => ({ ...prev, dialCode: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} ({d.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={contact.phone}
                      onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                        formErrors.phone ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    />
                    {formErrors.phone && <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. traveler@example.com"
                      value={contact.email}
                      onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${
                        formErrors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    />
                    {formErrors.email && <p className="text-[11px] text-red-500 mt-1 font-semibold">{formErrors.email}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION 5: DELIVERY DETAILS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                  <Clock size={18} className="text-[#2563EB]" />
                  <span>Delivery & Receiving Preferences</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Required Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Required Date (When do you need the ticket?)
                    </label>
                    <input
                      type="date"
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Leave blank if standard delivery time applies.</p>
                  </div>

                  {/* Delivery Channel Buttons */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Delivery Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('WhatsApp')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          deliveryMethod === 'WhatsApp'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('Email')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          deliveryMethod === 'Email'
                            ? 'bg-blue-50 border-[#2563EB] text-[#2563EB] ring-1 ring-[#2563EB]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: OPTIONAL OTHER DETAILS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-[#082B61]">
                  <MessageSquare size={18} className="text-[#2563EB]" />
                  <span>Other Details (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Purpose */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Purpose of Dummy Ticket
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-[#082B61] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {PURPOSE_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Message */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Additional Message or Airline Preference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Emirates or Qatar Airways preferred"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-[#082B61] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
              </div>

              {/* SUMMARY & SUBMISSION */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Calculated Total ({travellers.length} {travellers.length === 1 ? 'Passenger' : 'Passengers'})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#082B61]">₹{totalPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-500 font-semibold">
                      (₹{unitPrice.toLocaleString('en-IN')} / passenger)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Flight Reservation Request</span>
                      <ArrowRight size={14} />
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
