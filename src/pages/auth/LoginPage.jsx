import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Link2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, linkGoogleAccount, isAuthenticated, isLoading } = useAuth();

  const from = location.state?.from || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [accountLinkingState, setAccountLinkingState] = useState(null);

  // Redirect already authenticated users away from login screen
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  // Check query params for status messages (e.g. ?verified=true, ?reset=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setSuccessNotice('Email verified successfully! Please sign in with your credentials.');
    } else if (params.get('reset') === 'true') {
      setSuccessNotice('Password reset successfully! You can now log in with your new password.');
    } else if (params.get('notice')) {
      setSuccessNotice(params.get('notice'));
    }
  }, [location.search]);

  // Handle Google Sign-In response
  const handleGoogleSuccess = async (credential) => {
    setError('');
    setSuccessNotice('');
    setGoogleSubmitting(true);

    try {
      await loginWithGoogle({ credential });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err.data?.requiresLinking || err.code === 'ACCOUNT_EXISTS_LINK_REQUIRED') {
        const conflictEmail = err.data?.email || '';
        if (conflictEmail) setEmail(conflictEmail);
        setAccountLinkingState({
          email: conflictEmail,
          pendingToken: credential
        });
        setError(
          'An account with this email already exists. Enter your password below to sign in and securely link your Google account.'
        );
      } else {
        setError(err.message || 'Google authentication failed. Please try again or use your password.');
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleGoogleError = (err) => {
    console.warn('Google Sign-In interaction error:', err);
    setError(err?.message || 'Google sign-in was interrupted. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password
      });

      // If user came from Google account linking flow, complete the secure link now
      if (accountLinkingState?.pendingToken) {
        try {
          await linkGoogleAccount({ credential: accountLinkingState.pendingToken });
        } catch (linkErr) {
          console.warn('Post-login Google account linking failed:', linkErr);
        }
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
            <LogIn size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Sign In to NimuFly
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Access your visa applications, timeline status, and travel documents
          </p>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Account Linking Notice Banner */}
        {accountLinkingState && (
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <Link2 size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Link Your Google Account</p>
              <p className="text-[11px] text-blue-700 font-normal mt-0.5">
                Authenticate with your NimuFly password to securely link <span className="font-semibold">{accountLinkingState.email}</span>.
              </p>
            </div>
          </div>
        )}

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
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs sm:text-sm font-medium transition-all"
              />
              <Mail size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#082B61]">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-[#2563EB] hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs sm:text-sm font-medium transition-all"
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link
              to="/register"
              state={{ from }}
              className="font-bold text-[#2563EB] hover:underline"
            >
              Create Account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>256-bit encrypted session</span>
          </div>
        </div>

      </div>
    </div>
  );
}
