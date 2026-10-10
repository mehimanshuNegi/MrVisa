import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, ShieldCheck, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { authService } from '../../services';

export default function VerifiedFieldBadge({
  target = '',
  type = 'EMAIL', // 'EMAIL' | 'PHONE'
  isVerified = false,
  onVerified,
  onInvalidate,
  disabled = false,
  className = ''
}) {
  const [showModal, setShowModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Format validation
  const isValidFormat = React.useMemo(() => {
    if (!target || !target.trim()) return false;
    if (type === 'EMAIL') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.trim());
    }
    const digits = target.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }, [target, type]);

  // Invalidate previous verification whenever the target value is modified
  const prevTargetRef = React.useRef(target);
  useEffect(() => {
    if (prevTargetRef.current !== target) {
      prevTargetRef.current = target;
      if (isVerified && typeof onInvalidate === 'function') {
        onInvalidate();
      }
    }
  }, [target, isVerified, onInvalidate]);

  // Cooldown timer tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!isValidFormat || disabled) return;
    setIsSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await authService.sendVerificationOtp({
        target: target.trim(),
        type
      });
      setSuccessMsg(res.message || 'Verification code sent!');
      setCooldown(res.cooldownSeconds || 60);
      setShowModal(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        'Failed to send verification code. Please try again.';
      setErrorMsg(msg);
      setShowModal(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp.trim() || otp.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = await authService.verifyOtp({
        target: target.trim(),
        type,
        code: otp.trim()
      });

      if (res.isVerified) {
        setShowModal(false);
        setOtp('');
        if (typeof onVerified === 'function') {
          onVerified({
            target: target.trim(),
            verificationToken: res.verificationToken
          });
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        'Verification failed. Please check the code.';
      setErrorMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // If already verified, show green checkmark
  if (isVerified && isValidFormat) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shadow-2xs ${className}`}>
        <Check size={12} strokeWidth={3} className="text-emerald-600" />
        <span>Verified</span>
      </span>
    );
  }

  // If invalid or empty, don't show verify trigger
  if (!isValidFormat) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || isSending}
        onClick={handleSendOtp}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/80 text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 ${className}`}
        title={`Verify ${type === 'EMAIL' ? 'Email' : 'Phone'}`}
      >
        {isSending ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            <span>Sending...</span>
          </>
        ) : (
          <>
            <ShieldCheck size={12} />
            <span>Verify</span>
          </>
        )}
      </button>

      {/* Verification OTP Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative text-left">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setErrorMsg('');
              }}
              className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
              <ShieldCheck size={22} />
            </div>

            <h3 className="text-lg font-black text-[#082B61] tracking-tight">
              Verify {type === 'EMAIL' ? 'Email Address' : 'Phone Number'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter the 6-digit code sent to <strong className="text-[#082B61]">{target}</strong>.
            </p>

            {successMsg && !errorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 flex items-center gap-2">
                <CheckCircle2 size={14} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  className="w-full h-12 text-center text-xl font-black tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none text-[#082B61] transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                {cooldown > 0 ? (
                  <span className="text-slate-400 font-medium">Resend code in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="text-[#2563EB] hover:underline font-bold cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || otp.length < 4}
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm & Verify</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
