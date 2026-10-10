import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UserPlus,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import VerifiedFieldBadge from '../../components/common/VerifiedFieldBadge';
import { validateName } from '../../utils/nameValidator';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, isAuthenticated, isLoading } = useAuth();

  const from = location.state?.from || '/account';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    nationality: 'Indian'
  });
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect already authenticated users away
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setGoogleSubmitting(true);

    try {
      await loginWithGoogle({ credential });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign-Up error:', err);
      if (err.data?.requiresLinking || err.code === 'ACCOUNT_EXISTS_LINK_REQUIRED') {
        navigate('/login', {
          state: { from },
          search: `?notice=${encodeURIComponent(
            'An account with this email already exists. Please sign in to link your Google account.'
          )}`
        });
      } else {
        setError(err.message || 'Google account creation failed. Please try again.');
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleGoogleError = (err) => {
    console.warn('Google Sign-Up interaction error:', err);
    setError(err?.message || 'Google sign-up was interrupted. Please try again.');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'name') {
      if (value.trim()) {
        const nameCheck = validateName(value);
        if (!nameCheck.isValid) {
          setFieldErrors((prev) => ({ ...prev, name: nameCheck.error }));
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.name;
            return next;
          });
        }
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.name;
          return next;
        });
      }
    }
    if (field === 'email') {
      setIsEmailVerified(false);
      setEmailToken('');
    }
    if (field === 'phone') {
      setIsPhoneVerified(false);
      setPhoneToken('');
    }
    if (error) setError('');
    if (fieldErrors[field] && field !== 'name') {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const nameCheck = validateName(formData.name);
    if (!nameCheck.isValid) {
      errors.name = nameCheck.error;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'Please provide a valid email address';
    }
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      const nameCheck = validateName(formData.name);
      await register({
        name: nameCheck.isValid ? nameCheck.normalized : formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        nationality: formData.nationality
      });
      navigate('/account', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Unable to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F8FAFC] py-12 px-4 sm:px-6 flex items-center justify-center font-sans text-[#082B61]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm p-7 sm:p-9 space-y-6">
        
        {/* Header Lockup */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] mb-1">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Create NimuFly Account
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Track visa applications, store documents, and manage your travel profile
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In with Divider */}
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          isLoading={googleSubmitting}
          disabled={submitting}
          text="continue_with"
          showDivider={true}
          dividerText="or continue with email"
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#082B61] mb-1.5">
              Full Legal Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="First & Last Name (as per Passport)"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                  fieldErrors.name
                    ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                }`}
              />
              <User size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {fieldErrors.name && (
              <span className="text-[11px] font-bold text-red-600 mt-1 block">{fieldErrors.name}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#082B61]">
                Email Address
              </label>
              <VerifiedFieldBadge
                target={formData.email}
                type="EMAIL"
                isVerified={isEmailVerified}
                onVerified={({ verificationToken }) => {
                  setIsEmailVerified(true);
                  setEmailToken(verificationToken);
                }}
                onInvalidate={() => {
                  setIsEmailVerified(false);
                  setEmailToken('');
                }}
              />
            </div>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="name@example.com"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                  fieldErrors.email
                    ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                    : isEmailVerified
                    ? 'border-emerald-400 focus:border-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                }`}
              />
              <Mail size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {fieldErrors.email && (
              <span className="text-[11px] font-bold text-red-600 mt-1 block">{fieldErrors.email}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#082B61]">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              {formData.phone && (
                <VerifiedFieldBadge
                  target={formData.phone}
                  type="PHONE"
                  isVerified={isPhoneVerified}
                  onVerified={({ verificationToken }) => {
                    setIsPhoneVerified(true);
                    setPhoneToken(verificationToken);
                  }}
                  onInvalidate={() => {
                    setIsPhoneVerified(false);
                    setPhoneToken('');
                  }}
                />
              )}
            </div>
            <div className="relative">
              <input
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border outline-none text-xs sm:text-sm font-medium transition-all ${
                  isPhoneVerified
                    ? 'border-emerald-400 focus:border-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                }`}
              />
              <Phone size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#082B61] mb-1.5">
              Password (min 8 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                  fieldErrors.password
                    ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                }`}
              />
              <Lock size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-[11px] font-bold text-red-600 mt-1 block">{fieldErrors.password}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#082B61] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all outline-none ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 bg-red-50/15 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
                }`}
              />
              <Lock size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="text-[11px] font-bold text-red-600 mt-1 block">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#082B61] mb-1.5">
              Nationality
            </label>
            <select
              value={formData.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs sm:text-sm font-medium bg-white transition-all text-[#082B61]"
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ from }}
              className="font-bold text-[#2563EB] hover:underline"
            >
              Sign In
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>256-bit encrypted authentication</span>
          </div>
        </div>

      </div>
    </div>
  );
}
