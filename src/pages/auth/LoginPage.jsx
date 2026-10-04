import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ArrowRight, AlertCircle, Loader2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { authService } from '../../services';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login({
        email: email.trim(),
        password
      });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
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

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs sm:text-sm font-medium transition-all"
              />
              <Mail size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#082B61] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none text-xs sm:text-sm font-medium transition-all"
              />
              <Lock size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
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
            <span>256-bit encrypted authentication</span>
          </div>
        </div>

      </div>
    </div>
  );
}
