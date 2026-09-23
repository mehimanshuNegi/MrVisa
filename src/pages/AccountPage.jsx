import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  X,
  ShieldCheck,
  Compass,
  UploadCloud,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { applicationService, userService } from '../services';
import { APPLICATION_STATUS, REQUIRED_ACTION, getStatusConfig } from '../models/status';

export default function AccountPage() {
  const location = useLocation();

  // Data Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Profile state with Service persistence
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: 'Indian'
  });

  // Editing state for Profile section
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [formErrors, setFormErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Applications list
  const [applications, setApplications] = useState([]);

  // Modal / details states
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewVisaModalApp, setViewVisaModalApp] = useState(null);
  const [updateInfoModalApp, setUpdateInfoModalApp] = useState(null);
  const [infoUploaded, setInfoUploaded] = useState(false);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // Load account data from service layer
  const loadAccountData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedApps, userProfile] = await Promise.all([
        applicationService.getApplications(),
        userService.getProfile()
      ]);
      setApplications(loadedApps);
      setProfile(userProfile);
      setFormData(userProfile);
    } catch (err) {
      console.error('Failed to load account data:', err);
      setLoadError('Unable to load applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  // Query parameter auto-open (e.g. ?appId=MV-XXXXXX)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appId = params.get('appId');
    if (appId && applications.length > 0) {
      const target = applications.find((a) => a.id.toLowerCase() === appId.toLowerCase());
      if (target) {
        setSelectedApp(target);
      }
    }
  }, [location.search, applications]);

  // Handle Field Change in Profile
  const handleProfileFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Validation function for Profile Fields
  const validateProfileForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'Enter your first name';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Enter your last name';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'Enter a valid email address';
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!formData.nationality.trim()) {
      errors.nationality = 'Select your nationality';
    }
    return errors;
  };

  // Handle Profile Save via Service Layer
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errors = validateProfileForm();
    if (Object.keys(errors).length > 0) {
      // Validate ALL incorrect fields together at once
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSavingProfile(true);
    try {
      const updated = await userService.updateProfile(formData);
      setProfile(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel profile editing
  const handleCancelEdit = () => {
    setFormData(profile);
    setFormErrors({});
    setIsEditing(false);
  };

  // Handle Document Re-upload via Application Service
  const handleConfirmDocUpload = async () => {
    if (!updateInfoModalApp) return;
    setIsSubmittingDoc(true);
    try {
      const updated = await applicationService.updateApplicationAction(updateInfoModalApp.id, {
        actionType: REQUIRED_ACTION.UPDATE_PHOTO,
        message: 'Updated document submitted by customer. Specialist re-verification underway.'
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      if (selectedApp?.id === updated.id) {
        setSelectedApp(updated);
      }
      setUpdateInfoModalApp(null);
      setInfoUploaded(false);
    } catch (err) {
      console.error('Failed to submit updated document:', err);
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Helper for input field styling
  const getInputClass = (fieldName, hasValue) => {
    if (formErrors[fieldName]) {
      return 'border-red-400 bg-red-50/15 focus:border-red-500 focus:ring-2 focus:ring-red-100';
    }
    if (isEditing && hasValue && !formErrors[fieldName]) {
      return 'border-emerald-300 bg-emerald-50/10 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15';
    }
    return 'border-slate-200 bg-white hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15';
  };

  return (
    <div className="bg-[#F8FAFC]/70 min-h-screen pb-28 pt-4 sm:pt-6 text-[#082B61]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">

        {/* ========================================================
            TOP HEADER (Minimal & Spacious)
            ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#082B61] tracking-tight">
              My Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              View your profile and track visa application status.
            </p>
          </div>

          <Link
            to="/visa"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-bold transition-all shadow-xs"
          >
            <Compass size={14} />
            <span>Explore Visas</span>
          </Link>
        </div>

        {/* ========================================================
            PROFILE SECTION
            Follows the strict structure:
            [Label]
            [Instruction directly below label and above input]
            [Clean input with empty placeholder]
            ======================================================== */}
        <section aria-labelledby="profile-heading" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 id="profile-heading" className="text-base sm:text-lg font-black text-[#082B61]">
                Profile
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Personal details used across your visa applications
              </span>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setFormData(profile);
                  setFormErrors({});
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
              >
                <span>Edit Profile</span>
                <span className="text-sm">→</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSavingProfile}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          {/* Profile Form Fields (Strict Label -> Short Instruction -> Input structure) */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Field 1: First Name */}
              <div>
                <label className="text-xs font-bold text-[#082B61] block leading-none">
                  First Name
                </label>
                <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                  Enter your first name
                </span>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isEditing}
                    placeholder=""
                    value={isEditing ? formData.firstName : profile.firstName}
                    onChange={(e) => handleProfileFieldChange('firstName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${
                      !isEditing ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-default' : getInputClass('firstName', formData.firstName)
                    }`}
                  />
                  {isEditing && formData.firstName.trim() && !formErrors.firstName && (
                    <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {formErrors.firstName && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {formErrors.firstName}
                  </span>
                )}
              </div>

              {/* Field 2: Last Name */}
              <div>
                <label className="text-xs font-bold text-[#082B61] block leading-none">
                  Last Name
                </label>
                <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                  Enter your last name
                </span>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isEditing}
                    placeholder=""
                    value={isEditing ? formData.lastName : profile.lastName}
                    onChange={(e) => handleProfileFieldChange('lastName', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${
                      !isEditing ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-default' : getInputClass('lastName', formData.lastName)
                    }`}
                  />
                  {isEditing && formData.lastName.trim() && !formErrors.lastName && (
                    <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {formErrors.lastName && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {formErrors.lastName}
                  </span>
                )}
              </div>

              {/* Field 3: Email Address */}
              <div>
                <label className="text-xs font-bold text-[#082B61] block leading-none">
                  Email Address
                </label>
                <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                  Enter your email address
                </span>
                <div className="relative">
                  <input
                    type="email"
                    disabled={!isEditing}
                    placeholder=""
                    value={isEditing ? formData.email : profile.email}
                    onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${
                      !isEditing ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-default' : getInputClass('email', formData.email)
                    }`}
                  />
                  {isEditing && formData.email.trim() && !formErrors.email && (
                    <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {formErrors.email && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {formErrors.email}
                  </span>
                )}
              </div>

              {/* Field 4: Phone Number */}
              <div>
                <label className="text-xs font-bold text-[#082B61] block leading-none">
                  Phone Number
                </label>
                <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                  Enter your phone number
                </span>
                <div className="relative">
                  <input
                    type="tel"
                    disabled={!isEditing}
                    placeholder=""
                    value={isEditing ? formData.phone : profile.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${
                      !isEditing ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-default' : getInputClass('phone', formData.phone)
                    }`}
                  />
                  {isEditing && formData.phone.trim() && !formErrors.phone && (
                    <Check size={14} className="text-emerald-600 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {formErrors.phone && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {formErrors.phone}
                  </span>
                )}
              </div>

              {/* Field 5: Nationality */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#082B61] block leading-none">
                  Nationality
                </label>
                <span className="text-[11px] text-slate-400 font-medium block mt-1 mb-1.5">
                  Select your nationality
                </span>
                <select
                  disabled={!isEditing}
                  value={isEditing ? formData.nationality : profile.nationality}
                  onChange={(e) => handleProfileFieldChange('nationality', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-[#082B61] transition-all focus:outline-none ${
                    !isEditing
                      ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-default'
                      : getInputClass('nationality', formData.nationality)
                  }`}
                >
                  <option value="Indian">Indian (🇮🇳)</option>
                  <option value="Emirati">Emirati (🇦🇪)</option>
                  <option value="British">British (🇬🇧)</option>
                  <option value="American">American (🇺🇸)</option>
                  <option value="Canadian">Canadian (🇨🇦)</option>
                  <option value="Australian">Australian (🇦🇺)</option>
                  <option value="Singaporean">Singaporean (🇸🇬)</option>
                  <option value="Other">Other Nationality</option>
                </select>
                {formErrors.nationality && (
                  <span className="text-[11px] font-bold text-red-600 mt-1 block">
                    {formErrors.nationality}
                  </span>
                )}
              </div>

            </div>
          </form>
        </section>

        {/* ========================================================
            MY APPLICATIONS SECTION
            Data-Driven application cards
            ======================================================== */}
        <section aria-labelledby="applications-heading" className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 id="applications-heading" className="text-base sm:text-lg font-black text-[#082B61]">
                My Applications
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Live visa status, submissions, and issued permits
              </span>
            </div>
            
            {applications.length > 0 && !isLoading && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {applications.length} {applications.length === 1 ? 'Application' : 'Applications'}
              </span>
            )}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-[#2563EB] mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-[#082B61]">Loading your visa applications...</p>
            </div>
          ) : loadError ? (
            /* Error State */
            <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3">
              <AlertCircle size={28} className="text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={loadAccountData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-bold"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : applications.length === 0 ? (
            /* ========================================================
               EMPTY STATE
               ======================================================== */
            <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                <FileText size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-[#082B61]">
                  No applications yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Your visa applications will appear here.
                </p>
              </div>
              <Link
                to="/visa"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-extrabold transition-all shadow-xs"
              >
                <span>Explore Visas</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            /* ========================================================
               APPLICATIONS LIST
               ======================================================== */
            <div className="space-y-4">
              {applications.map((app) => {
                const statusCfg = getStatusConfig(app.status);
                const isVisaReady = app.status === APPLICATION_STATUS.VISA_ISSUED || statusCfg.defaultAction === REQUIRED_ACTION.VIEW_VISA;
                const isActionReq = statusCfg.isActionRequired || app.requiredAction === REQUIRED_ACTION.UPDATE_PHOTO;
                const isRejected = app.status === APPLICATION_STATUS.REJECTED || app.status === 'REJECTED' || statusCfg.isRejected;

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Top: Destination Visa Title + ID */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl select-none" role="img" aria-label={app.destination || app.countryName}>
                          {app.flagEmoji}
                        </span>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-[#082B61]">
                            {app.destination || app.countryName} {app.visaType}
                          </h3>
                          <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                            <span>Application ID</span>
                            <span className="font-mono font-bold text-[#082B61]">{app.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Display */}
                      <div className="self-start sm:self-auto flex items-center gap-2">
                        <div className="flex flex-col sm:items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Status
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                            <span className={`text-xs font-bold ${statusCfg.badgeText}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Info Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                          Travellers
                        </span>
                        <span className="font-bold text-[#082B61] mt-0.5 block">
                          {app.travellerCount} {app.travellerCount === 1 ? 'Traveller' : 'Travellers'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                          Submitted
                        </span>
                        <span className="font-bold text-[#082B61] mt-0.5 block">
                          {app.submittedDate}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                          Amount Paid
                        </span>
                        <span className="font-bold text-[#082B61] mt-0.5 block">
                          {app.amountPaid || app.amount}
                        </span>
                      </div>
                    </div>

                    {/* Visa Issued Prominent Callout */}
                    {isVisaReady && (
                      <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={16} strokeWidth={3} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-emerald-900 block">
                              Your visa is ready
                            </span>
                            <span className="text-[11px] text-emerald-700 font-medium">
                              Official verified electronic travel visa
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewVisaModalApp(app)}
                          className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                        >
                          View Visa →
                        </button>
                      </div>
                    )}

                    {/* Application Rejected Professional Callout */}
                    {isRejected && (
                      <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5">
                            <X size={15} strokeWidth={2.8} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-rose-900 block">
                              Application Rejected
                            </span>
                            <span className="text-xs text-rose-700 font-medium block mt-0.5">
                              {app.adminMessage || 'The visa application was declined upon consular review.'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        >
                          View Application →
                        </button>
                      </div>
                    )}

                    {/* Additional Info Notice with Dynamic Admin Message */}
                    {isActionReq && (
                      <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-red-700">
                            {app.adminMessage || 'Consulate requested additional information.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUpdateInfoModalApp(app);
                            setInfoUploaded(false);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                        >
                          {statusCfg.actionLabel || 'Update Information →'}
                        </button>
                      </div>
                    )}

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 font-medium">
                        Expected: <strong className="text-slate-600">{app.expectedDate || 'Within processing window'}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {isActionReq ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUpdateInfoModalApp(app);
                              setInfoUploaded(false);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          >
                            <span>{statusCfg.actionLabel || 'Update Information →'}</span>
                          </button>
                        ) : isVisaReady ? (
                          <button
                            type="button"
                            onClick={() => setViewVisaModalApp(app)}
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer"
                          >
                            <span>View Visa →</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            className="inline-flex items-center gap-1 font-bold text-[#2563EB] hover:text-[#123B7A] transition-colors cursor-pointer"
                          >
                            <span>View Application</span>
                            <span className="text-sm">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* ========================================================
          APPLICATION DETAILS & STATUS MODAL
          ======================================================== */}
      {selectedApp && (() => {
        const selectedStatusCfg = getStatusConfig(selectedApp.status);
        const isVisaReady = selectedApp.status === APPLICATION_STATUS.VISA_ISSUED || selectedStatusCfg.defaultAction === REQUIRED_ACTION.VIEW_VISA;
        const isRejected = selectedApp.status === APPLICATION_STATUS.REJECTED || selectedApp.status === 'REJECTED' || selectedStatusCfg.isRejected;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">{selectedApp.flagEmoji}</span>
                  <div>
                    <h3 className="text-base font-black text-[#082B61]">Application Details</h3>
                    <span className="text-xs text-slate-400 font-mono font-bold">{selectedApp.id}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Key Application Meta */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Destination</span>
                  <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.destination || selectedApp.countryName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Visa Type</span>
                  <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.visaType}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Travellers</span>
                  <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.travellerCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Submission Date</span>
                  <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.submittedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Amount Paid</span>
                  <span className="font-bold text-[#082B61] mt-0.5 block">{selectedApp.amountPaid || selectedApp.amount}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Current Status</span>
                  <span className={`font-bold mt-0.5 block ${selectedStatusCfg.badgeText}`}>
                    {selectedStatusCfg.label}
                  </span>
                </div>
              </div>

              {/* Rejection Notice in Modal */}
              {isRejected && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
                  <div className="flex items-center gap-2 font-black text-rose-900 mb-1">
                    <X size={14} strokeWidth={2.8} className="text-rose-600" />
                    <span>Application Rejected</span>
                  </div>
                  <p className="text-rose-700 font-medium leading-relaxed">
                    {selectedApp.adminMessage || 'The visa application was declined upon consular review.'}
                  </p>
                </div>
              )}

              {/* ====================================================
                  APPLICATION STATUS TIMELINE
                  - Application Submitted (✓)
                  - Documents Verified (✓)
                  - Application Processing (● in NimuFly blue)
                  - Visa Issued (○)
                  ==================================================== */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                  Application Status
                </h4>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  
                  {/* Stage 1: Application Submitted */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="font-bold text-[#082B61]">Application Submitted</span>
                    </div>
                    <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                  </div>

                  {/* Stage 2: Documents Verified */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {selectedStatusCfg.timelineStep < 2 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                          ○
                        </span>
                      ) : selectedStatusCfg.isActionRequired ? (
                        <span className="w-5 h-5 rounded-full bg-red-50 text-red-600 border border-red-300 flex items-center justify-center text-[10px] font-bold">
                          !
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <span className={`font-bold ${
                        selectedStatusCfg.isActionRequired ? 'text-red-700' : 'text-[#082B61]'
                      }`}>
                        Documents Verified
                      </span>
                    </div>

                    {selectedStatusCfg.timelineStep < 2 ? (
                      <span className="text-slate-300 font-bold text-xs">○</span>
                    ) : selectedStatusCfg.isActionRequired ? (
                      <span className="text-red-600 font-bold text-xs">Action Required</span>
                    ) : (
                      <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                    )}
                  </div>

                  {/* Stage 3: Application Processing */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {selectedStatusCfg.timelineStep === 3 ? (
                        <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                          ●
                        </span>
                      ) : selectedStatusCfg.timelineStep > 3 ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                          ○
                        </span>
                      )}
                      <span className={`font-bold ${
                        selectedStatusCfg.timelineStep === 3 ? 'text-[#2563EB] font-black' : 'text-[#082B61]'
                      }`}>
                        Application Processing
                      </span>
                    </div>

                    {selectedStatusCfg.timelineStep === 3 ? (
                      <span className="text-[#2563EB] font-black text-xs">●</span>
                    ) : selectedStatusCfg.timelineStep > 3 ? (
                      <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                    ) : (
                      <span className="text-slate-300 font-bold text-xs">○</span>
                    )}
                  </div>

                  {/* Stage 4: Visa Issued or Rejected */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {isRejected ? (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                          <X size={12} strokeWidth={3} />
                        </span>
                      ) : isVisaReady ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-[10px] font-bold">
                          ○
                        </span>
                      )}
                      <span className={`font-bold ${
                        isRejected ? 'text-rose-700 font-black' : isVisaReady ? 'text-emerald-800 font-black' : 'text-slate-400'
                      }`}>
                        {isRejected ? 'Application Rejected' : 'Visa Issued'}
                      </span>
                    </div>

                    {isRejected ? (
                      <span className="text-rose-700 font-extrabold text-xs">✗</span>
                    ) : isVisaReady ? (
                      <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                    ) : (
                      <span className="text-slate-300 font-bold text-xs">○</span>
                    )}
                  </div>

                </div>
              </div>

              {/* Travellers Info */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                  Travellers ({selectedApp.travellers?.length || selectedApp.travellerCount})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                  {(selectedApp.travellers || []).map((t, idx) => (
                    <div key={t.id || idx} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#082B61] block">{t.name}</span>
                        <span className="text-slate-400 text-[11px]">Passport: {t.passportNumber} • {t.nationality}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md">
                        {t.dob || t.gender || 'Traveller'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#082B61] uppercase tracking-wider">
                  Uploaded Documents
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                  {(selectedApp.documents || []).map((d, idx) => (
                    <div key={d.id || idx} className="p-3 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <span className="font-medium text-[#082B61]">{d.name}</span>
                      </div>
                      <span className={`text-[11px] font-bold ${
                        d.status === 'Verified' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Banner inside Modal */}
              {isVisaReady && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Your official visa is issued and verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewVisaModalApp(selectedApp);
                      setSelectedApp(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <span>View Visa →</span>
                  </button>
                </div>
              )}

              {/* Action Required Banner inside Modal with Dynamic Admin Message */}
              {selectedStatusCfg.isActionRequired && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-900">
                    <AlertCircle size={16} className="text-red-600" />
                    <span>Consulate Action Required</span>
                  </div>
                  <p className="font-medium text-red-700">
                    {selectedApp.adminMessage || 'Consulate requested additional information.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUpdateInfoModalApp(selectedApp);
                      setSelectedApp(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <span>{selectedStatusCfg.actionLabel || 'Update Information →'}</span>
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================
          VISA ISSUED DOCUMENT VIEWER MODAL
          ======================================================== */}
      {viewVisaModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200/90 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                <h3 className="text-base font-black text-[#082B61]">Electronic Visa Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewVisaModalApp(null)}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#082B61] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Official Looking Visa Preview Document */}
            <div className="p-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{viewVisaModalApp.flagEmoji}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Official E-Visa Grant</span>
                    <h4 className="text-sm sm:text-base font-black text-[#082B61]">{viewVisaModalApp.destination || viewVisaModalApp.countryName}</h4>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black tracking-wide uppercase">
                  Approved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Visa Document No.</span>
                  <span className="font-mono font-bold text-[#082B61]">{viewVisaModalApp.visaDocNumber || 'SG-EV-2026-99214'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Entry Authorization</span>
                  <span className="font-bold text-[#082B61]">{viewVisaModalApp.entryType || 'Multiple Entries • Tourist'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Primary Applicant</span>
                  <span className="font-bold text-[#082B61]">{viewVisaModalApp.travellers?.[0]?.name || profile.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Passport Number</span>
                  <span className="font-mono font-bold text-[#082B61]">{viewVisaModalApp.travellers?.[0]?.passportNumber || 'M8921456'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Valid Until</span>
                  <span className="font-bold text-emerald-700">{viewVisaModalApp.validUntil || '10 Dec 2026'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Verification Status</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <Check size={12} strokeWidth={3} /> Verified at Immigration
                  </span>
                </div>
              </div>

              {/* Barcode Mock Representation */}
              <div className="pt-2 border-t border-emerald-100/80 flex flex-col items-center justify-center gap-1 text-slate-300">
                <div className="h-8 w-48 bg-slate-200/90 rounded flex items-center justify-around px-2">
                  <div className="w-1 h-6 bg-slate-800" />
                  <div className="w-2 h-6 bg-slate-800" />
                  <div className="w-0.5 h-6 bg-slate-800" />
                  <div className="w-2 h-6 bg-slate-800" />
                  <div className="w-1.5 h-6 bg-slate-800" />
                  <div className="w-0.5 h-6 bg-slate-800" />
                  <div className="w-3 h-6 bg-slate-800" />
                </div>
                <span className="text-[10px] font-mono text-slate-400">MRV-ELECTRONIC-TOKEN-AUTHENTICATED</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewVisaModalApp(null)}
                className="px-5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:text-[#082B61]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('E-Visa PDF download will be connected to storage backend. Verified on screen.');
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download size={14} />
                <span>Download E-Visa PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          UPDATE INFORMATION MODAL (Action Required State)
          ======================================================== */}
      {updateInfoModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                <AlertCircle size={18} />
                <span>Update Information Required</span>
              </div>
              <button
                type="button"
                onClick={() => setUpdateInfoModalApp(null)}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#082B61]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dynamic Admin Instruction Notice */}
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <strong className="block font-bold">Consulate Message:</strong>
              <p className="font-medium">
                {updateInfoModalApp.adminMessage || 'Embassy requested an updated photograph.'}
              </p>
            </div>

            {/* Re-upload Area */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#2563EB] bg-slate-50/50 text-center space-y-2 cursor-pointer transition-colors">
              <UploadCloud size={32} className="text-[#2563EB] mx-auto" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#082B61] block">
                  Click to select replacement document
                </span>
                <span className="text-[11px] text-slate-400 block">
                  JPG, PNG or PDF (Max 10MB)
                </span>
              </div>
            </div>

            {infoUploaded && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Replacement file attached and ready for submission.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingDoc}
                onClick={() => setUpdateInfoModalApp(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-500 hover:text-[#082B61] transition-colors"
              >
                Close
              </button>

              {!infoUploaded ? (
                <button
                  type="button"
                  onClick={() => setInfoUploaded(true)}
                  className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#123B7A] text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Attach Document
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmittingDoc}
                  onClick={handleConfirmDocUpload}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDoc && <Loader2 size={13} className="animate-spin" />}
                  <span>Submit to Embassy</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
