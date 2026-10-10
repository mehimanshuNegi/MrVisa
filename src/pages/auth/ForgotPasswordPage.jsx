import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowRight, ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authService } from '../../services';
import { validateEmail } from '../../utils/emailValidator';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error);
      return;
    }

    setSubmitting(true);

    try {
      await authService.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Unable to process your request. Please try again.');
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
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-black text-[#082B61] tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Enter your email to receive secure password recovery instructions
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5 text-center animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-[#082B61]">Instructions Sent</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                If an account exists for <span className="font-bold text-[#082B61]">{email}</span>, we've dispatched a single-use password reset link. Please check your inbox and spam folder.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all"
              >
                <ArrowLeft size={15} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#082B61] mb-1.5">
                  Account Email Address
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer Navigation */}
            <div className="pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                Remember your password?{' '}
                <Link to="/login" className="font-bold text-[#2563EB] hover:underline">
                  Sign In
                </Link>
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Single-use cryptographic reset link</span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
