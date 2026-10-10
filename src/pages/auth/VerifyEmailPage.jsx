import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MailCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { authService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmailPage() {
  const location = useLocation();
  const { refreshProfile } = useAuth();

  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  // Resend form state
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');

  // Extract and automatically trigger verification if token present in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      const cleanToken = urlToken.trim();
      setToken(cleanToken);
      performVerification(cleanToken);
    }
  }, [location.search]);

  const performVerification = async (tok) => {
    setVerifying(true);
    setError('');
    try {
      await authService.verifyEmail({ token: tok });
      setVerified(true);
      await refreshProfile();
    } catch (err) {
      console.error('Email verification error:', err);
      setError(err.message || 'Verification token is invalid or has expired.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setResendError('');
    setResendSuccess('');

    if (!resendEmail.trim() || !resendEmail.includes('@')) {
      setResendError('Please provide a valid email address.');
      return;
    }

    setResending(true);
    try {
      const res = await authService.resendVerification({ email: resendEmail.trim() });
      setResendSuccess(res.message || 'If an account exists, a new verification link has been sent.');
      setResendEmail('');
    } catch (err) {
      console.error('Resend verification error:', err);
      setResendError(err.message || 'Unable to send verification link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F8FAFC] py-12 px-4 sm:px-6 flex items-center justify-center font-sans text-[#082B61]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm p-7 sm:p-9 space-y-6">
        
        {/* Header Lockup */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] mb-1">
            <MailCheck size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Email Verification
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Confirm your email address to secure your NimuFly account
          </p>
        </div>

        {/* 1. Loading State */}
        {verifying && (
          <div className="py-8 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
            <p className="text-sm font-bold text-[#082B61]">
              Verifying your email address...
            </p>
            <p className="text-xs text-slate-400">
              Validating cryptographic security token
            </p>
          </div>
        )}

        {/* 2. Success State */}
        {!verifying && verified && (
          <div className="space-y-5 text-center animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-[#082B61]">
                Email Successfully Verified!
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Your email address has been verified. You now have full access to manage your applications and documents.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/account"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all"
              >
                <span>Go to My Account</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* 3. Error or Missing Token State -> Provide Resend Link */}
        {!verifying && !verified && (
          <div className="space-y-5 animate-in fade-in">
            {error ? (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : !token ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center">
                Please click the verification link sent to your inbox, or request a fresh link below.
              </div>
            ) : null}

            {resendSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}

            {resendError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{resendError}</span>
              </div>
            )}

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div>
                <h4 className="text-xs font-extrabold text-[#082B61]">Resend Verification Link</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter your email address to receive a fresh verification link.
                </p>
              </div>

              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs font-medium transition-all bg-white"
                  />
                  <Mail size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={resending}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {resending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      <span>Resend Verification Link</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/account"
                className="text-xs font-bold text-[#2563EB] hover:underline"
              >
                Return to My Account
              </Link>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>256-bit encrypted authentication</span>
        </div>

      </div>
    </div>
  );
}
