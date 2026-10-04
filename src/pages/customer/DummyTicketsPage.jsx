import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  Calendar,
  User,
  Plus,
  Trash2,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { dummyTicketService, authService } from '../../services';

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
  'Visa Extension',
  'Company / Travel Authorization',
  'Other'
];

export default function DummyTicketsPage() {
  const navigate = useNavigate();

  // Trip Type: One Way | Return (Multi Trip removed per specification)
  const [tripType, setTripType] = useState('Return');

  // Travellers List (Person 1, Person 2, ...)
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

  // Contact Details
  const [contact, setContact] = useState({
    dialCode: '+91',
    phone: '',
    email: ''
  });

  // Ticket / Flight Details
  const [flight, setFlight] = useState({
    from: '',
    to: '',
    departureDate: '',
    returnDate: ''
  });

  // Other Details
  const [purpose, setPurpose] = useState('Visa Application');
  const [message, setMessage] = useState('');

  // Receiving Details
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('WhatsApp'); // 'WhatsApp' | 'Email'

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submittedRequest, setSubmittedRequest] = useState(null);

  // Autofill user details if logged in
  useEffect(() => {
    try {
      const user = (typeof authService.getUser === 'function' ? authService.getUser() : authService.getCurrentUser?.()) || null;
      if (user) {
        setContact((prev) => ({
          ...prev,
          email: prev.email || user.email || '',
          phone: prev.phone || user.phone || ''
        }));
        if (travellers.length === 1 && !travellers[0].firstName && (user.firstName || user.name)) {
          const parts = (user.name || '').split(' ');
          setTravellers([
            {
              id: 1,
              title: 'Mr',
              firstName: user.firstName || parts[0] || '',
              lastName: user.lastName || parts.slice(1).join(' ') || '',
              dateOfBirth: '',
              nationality: user.nationality || 'Indian'
            }
          ]);
        }
      }
    } catch (err) {
      console.warn('User load notice in DummyTicketsPage:', err);
    }
  }, []);

  // Add traveller
  const handleAddPerson = () => {
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

  // Remove traveller (only if > 1)
  const handleRemovePerson = (id) => {
    if (travellers.length <= 1) return;
    setTravellers((prev) => prev.filter((t) => t.id !== id));
  };

  // Update traveller field
  const handleUpdateTraveller = (id, field, value) => {
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
    // Clear validation error if field edited
    if (formErrors[`traveller_${id}_${field}`]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[`traveller_${id}_${field}`];
        return next;
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};

    // 1. Travellers validation
    travellers.forEach((t, idx) => {
      if (!t.firstName?.trim()) {
        errors[`traveller_${t.id}_firstName`] = `First name is required for Person ${idx + 1}`;
      }
      if (!t.lastName?.trim()) {
        errors[`traveller_${t.id}_lastName`] = `Last name is required for Person ${idx + 1}`;
      }
    });

    // 2. Contact validation
    if (!contact.phone?.trim()) {
      errors.phone = 'Contact number is required';
    } else if (!/^\d{6,15}$/.test(contact.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (6–15 digits)';
    }

    if (!contact.email?.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // 3. Flight validation
    if (!flight.from?.trim()) {
      errors.from = 'Origin city or airport is required';
    }
    if (!flight.to?.trim()) {
      errors.to = 'Destination city or airport is required';
    }
    if (!flight.departureDate) {
      errors.departureDate = 'Departure date is required';
    }
    if (tripType === 'Return') {
      if (!flight.returnDate) {
        errors.returnDate = 'Return date is required for Return trip';
      } else if (flight.departureDate && flight.returnDate < flight.departureDate) {
        errors.returnDate = 'Return date cannot be earlier than departure date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const firstErrorEl = document.querySelector('.border-red-500');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const pricePerPerson = 499;
      const payload = {
        serviceTitle: 'Verified Flight Reservation',
        tripType,
        travellers,
        contact,
        flight,
        purpose,
        message,
        requiredDate,
        deliveryMethod,
        price: pricePerPerson * travellers.length
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

  const pricePerPerson = 499;
  const totalPrice = pricePerPerson * travellers.length;

  // ----------------------------------------------------
  // SUCCESS CONFIRMATION VIEW
  // ----------------------------------------------------
  if (submittedRequest) {
    const reqId = submittedRequest.requestId || submittedRequest._id || 'DT-PROCESSED';
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100">
            <CheckCircle2 size={36} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
            Reservation Request Submitted
          </h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Your flight reservation is being prepared and will be delivered via {deliveryMethod}.
          </p>

          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Request ID</span>
              <span className="font-bold text-[#082B61] font-mono">{reqId}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Trip Type</span>
              <span className="font-bold text-slate-800">{tripType}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Route</span>
              <span className="font-bold text-slate-800">
                {flight.from} → {flight.to}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Traveller(s)</span>
              <span className="font-bold text-slate-800">{travellers.length} Person(s)</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Delivery Method</span>
              <span className="font-bold text-[#2563EB]">{deliveryMethod}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 font-medium">Total Amount</span>
              <span className="font-bold text-[#082B61]">₹{totalPrice}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSubmittedRequest(null);
                setFlight({ from: '', to: '', departureDate: '', returnDate: '' });
                setMessage('');
                setRequiredDate('');
              }}
              className="px-6 py-3 rounded-xl bg-[#082B61] hover:bg-[#061e44] text-white font-bold text-xs sm:text-sm transition shadow-sm"
            >
              Book Another Ticket
            </button>
            <Link
              to="/"
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN FORM VIEW
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-10 sm:space-y-12">

        {/* Global Error Banner */}
        {formErrors.submit && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle size={18} className="flex-shrink-0 text-red-600" />
            <span>{formErrors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-10 sm:space-y-12">

          {/* ==================================================== */}
          {/* SECTION 1: PERSONAL DETAILS */}
          {/* ==================================================== */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] text-center tracking-tight mb-8">
              Personal Details
            </h2>

            <div className="space-y-8">
              {travellers.map((traveller, index) => (
                <div key={traveller.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-[#082B61]">
                      Person {index + 1}
                    </h3>
                    {travellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePerson(traveller.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Row 1: Title, First Name, Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                    {/* Title */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                        Title
                      </label>
                      <select
                        value={traveller.title}
                        onChange={(e) => handleUpdateTraveller(traveller.id, 'title', e.target.value)}
                        className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                      >
                        <option value="Mr">Mr</option>
                        <option value="Ms">Ms</option>
                        <option value="Mrs">Mrs</option>
                      </select>
                    </div>

                    {/* First Name */}
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={traveller.firstName}
                        onChange={(e) => handleUpdateTraveller(traveller.id, 'firstName', e.target.value)}
                        placeholder="Enter first name"
                        className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                          formErrors[`traveller_${traveller.id}_firstName`]
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:border-[#082B61]'
                        } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                      />
                      {formErrors[`traveller_${traveller.id}_firstName`] && (
                        <p className="text-[11px] text-red-600 mt-1 font-medium">
                          {formErrors[`traveller_${traveller.id}_firstName`]}
                        </p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={traveller.lastName}
                        onChange={(e) => handleUpdateTraveller(traveller.id, 'lastName', e.target.value)}
                        placeholder="Enter last name"
                        className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                          formErrors[`traveller_${traveller.id}_lastName`]
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:border-[#082B61]'
                        } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                      />
                      {formErrors[`traveller_${traveller.id}_lastName`] && (
                        <p className="text-[11px] text-red-600 mt-1 font-medium">
                          {formErrors[`traveller_${traveller.id}_lastName`]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: D.O.B, Nationality */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                        D.O.B
                      </label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={traveller.dateOfBirth}
                        onChange={(e) => handleUpdateTraveller(traveller.id, 'dateOfBirth', e.target.value)}
                        className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>

                    {/* Nationality */}
                    <div>
                      <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                        Nationality
                      </label>
                      <input
                        type="text"
                        value={traveller.nationality}
                        onChange={(e) => handleUpdateTraveller(traveller.id, 'nationality', e.target.value)}
                        placeholder="Indian"
                        className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add A Person Button */}
              <button
                type="button"
                onClick={handleAddPerson}
                className="w-full py-3.5 px-4 rounded-xl bg-[#082B61] hover:bg-[#061e44] text-white font-bold text-sm tracking-wide transition shadow-sm flex items-center justify-center gap-2 mt-4"
              >
                <Plus size={16} />
                <span>Add A Person</span>
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 2: CONTACT DETAILS */}
          {/* ==================================================== */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] text-center tracking-tight mb-8">
              Contact Details
            </h2>

            <div className="space-y-4">
              {/* Row 1: Dial Code, Contact Number */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Dial Code
                  </label>
                  <select
                    value={contact.dialCode}
                    onChange={(e) => setContact((prev) => ({ ...prev, dialCode: e.target.value }))}
                    className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                  >
                    {DIAL_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} ({item.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => {
                      setContact((prev) => ({ ...prev, phone: e.target.value }));
                      if (formErrors.phone) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.phone;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter phone number"
                    className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                      formErrors.phone
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-300 focus:border-[#082B61]'
                    } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Row 2: E-Mail */}
              <div>
                <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => {
                    setContact((prev) => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  placeholder="Enter email address"
                  className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                    formErrors.email
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-300 focus:border-[#082B61]'
                  } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                />
                {formErrors.email && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 3: TICKET DETAILS */}
          {/* ==================================================== */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] text-center tracking-tight mb-6">
              Ticket Details
            </h2>

            {/* Trip Type Selector (One Way and Return only - Multi Trip removed) */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => setTripType('One Way')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition ${
                  tripType === 'One Way'
                    ? 'bg-[#082B61] text-white shadow-sm'
                    : 'bg-[#E2E8F0]/70 text-slate-700 hover:bg-[#E2E8F0]'
                }`}
              >
                One Way
              </button>
              <button
                type="button"
                onClick={() => setTripType('Return')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition ${
                  tripType === 'Return'
                    ? 'bg-[#082B61] text-white shadow-sm'
                    : 'bg-[#E2E8F0]/70 text-slate-700 hover:bg-[#E2E8F0]'
                }`}
              >
                Return
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-[#082B61]">
                Flight 1
              </h3>

              {/* Row 1: Origin, Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Origin
                  </label>
                  <input
                    type="text"
                    value={flight.from}
                    onChange={(e) => {
                      setFlight((prev) => ({ ...prev, from: e.target.value }));
                      if (formErrors.from) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.from;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. New Delhi (DEL)"
                    className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                      formErrors.from
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-300 focus:border-[#082B61]'
                    } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                  />
                  {formErrors.from && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.from}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={flight.to}
                    onChange={(e) => {
                      setFlight((prev) => ({ ...prev, to: e.target.value }));
                      if (formErrors.to) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.to;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Paris (CDG)"
                    className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                      formErrors.to
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-300 focus:border-[#082B61]'
                    } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 transition`}
                  />
                  {formErrors.to && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.to}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Departure Date and Return Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                    Departure
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={flight.departureDate}
                    onChange={(e) => {
                      setFlight((prev) => ({ ...prev, departureDate: e.target.value }));
                      if (formErrors.departureDate) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.departureDate;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                      formErrors.departureDate
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-300 focus:border-[#082B61]'
                    } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:ring-2 focus:ring-blue-100 transition`}
                  />
                  {formErrors.departureDate && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.departureDate}</p>
                  )}
                </div>

                {tripType === 'Return' && (
                  <div>
                    <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                      Return Date
                    </label>
                    <input
                      type="date"
                      min={flight.departureDate || new Date().toISOString().split('T')[0]}
                      value={flight.returnDate}
                      onChange={(e) => {
                        setFlight((prev) => ({ ...prev, returnDate: e.target.value }));
                        if (formErrors.returnDate) {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.returnDate;
                            return next;
                          });
                        }
                      }}
                      className={`w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border ${
                        formErrors.returnDate
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-slate-300 focus:border-[#082B61]'
                      } rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:ring-2 focus:ring-blue-100 transition`}
                    />
                    {formErrors.returnDate && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.returnDate}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 4: OTHER DETAILS */}
          {/* ==================================================== */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] text-center tracking-tight mb-8">
              Other Details
            </h2>

            <div className="space-y-4">
              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                  Purpose to buy dummy ticket
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                >
                  {PURPOSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Any Message */}
              <div>
                <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                  Any Message
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional remarks, airline preference, or special requests..."
                  className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] placeholder:text-slate-400 outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 5: RECEIVING DETAILS */}
          {/* ==================================================== */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#082B61] text-center tracking-tight mb-8">
              Receiving Details
            </h2>

            <div className="space-y-6">
              {/* Subheading: When Do You Want to Receive? */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#082B61] mb-2">
                  When Do You Want to Receive?
                </h3>
                <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                  Receiving Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full bg-[#E2E8F0]/50 hover:bg-[#E2E8F0]/70 focus:bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#082B61] outline-none focus:border-[#082B61] focus:ring-2 focus:ring-blue-100 transition"
                />
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  In order to get a good validity of your flight reservation, either receive it one day before using it or book it one day before only.
                </p>
              </div>

              {/* Subheading: How Do You Want to Receive? */}
              <div className="pt-2">
                <h3 className="text-sm sm:text-base font-bold text-[#082B61] text-center mb-4">
                  How Do You Want to Receive?
                </h3>
                <div className="flex items-center justify-center gap-6">
                  {/* WhatsApp button */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('WhatsApp')}
                    className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 transition ${
                      deliveryMethod === 'WhatsApp'
                        ? 'border-[#082B61] bg-[#082B61] text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="30"
                      height="30"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span className="text-xs font-bold mt-1.5">WhatsApp</span>
                  </button>

                  {/* Email button */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('Email')}
                    className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 transition ${
                      deliveryMethod === 'Email'
                        ? 'border-[#082B61] bg-[#082B61] text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Mail size={30} />
                    <span className="text-xs font-bold mt-1.5">Email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SUBMIT BUTTON & PRICE */}
          {/* ==================================================== */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm sm:text-base font-bold text-[#082B61] mb-4 px-1">
              <span>Total Price ({travellers.length} Traveller{travellers.length > 1 ? 's' : ''})</span>
              <span className="text-xl font-black text-[#2563EB]">₹{totalPrice}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-[#082B61] hover:bg-[#061e44] text-white font-extrabold text-base tracking-wide transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Flight Reservation Request</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
