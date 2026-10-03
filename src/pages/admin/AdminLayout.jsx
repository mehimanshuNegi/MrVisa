import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  FileText,
  Globe,
  MapPin,
  Layers,
  Plane,
  ExternalLink,
  User,
  LogIn,
  LogOut,
  KeyRound,
  Loader2,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import { tokenStore, apiClient } from '../../services/apiClient';

export default function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isApplicationsActive =
    location.pathname.includes('/admin/applications') || location.pathname === '/admin';
  const isVisasActive = location.pathname.includes('/admin/visas');
  const isCountriesActive = location.pathname.includes('/admin/countries');
  const isDocumentationActive = location.pathname.includes('/admin/documentation');
  const isDummyTicketsActive = location.pathname.includes('/admin/dummy-tickets');

  // Admin authentication and RBAC state
  const [token, setToken] = useState(() => tokenStore.getToken());
  const [user, setUser] = useState(() => tokenStore.getUser());
  const isAdmin = Boolean(token && user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));
  const [showLoginModal, setShowLoginModal] = useState(!tokenStore.getToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password }
      });
      const receivedToken = res?.data?.tokens?.accessToken || res?.tokens?.accessToken;
      const loggedUser = res?.data?.user || res?.user;

      if (!receivedToken) {
        throw new Error('Access token not returned from server');
      }

      if (!loggedUser || (loggedUser.role !== 'ADMIN' && loggedUser.role !== 'SUPER_ADMIN')) {
        throw new Error('Access denied: This account does not possess administrator privileges.');
      }

      tokenStore.setAuth({
        accessToken: receivedToken,
        refreshToken: res?.data?.tokens?.refreshToken || res?.tokens?.refreshToken,
        user: loggedUser
      });

      setToken(receivedToken);
      setUser(loggedUser);
      setShowLoginModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Admin login error:', err);
      setLoginError(err.message || 'Invalid admin credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    tokenStore.clearToken();
    setToken(null);
    setUser(null);
    setShowLoginModal(true);
  };

  const navLinks = [
    { name: 'Applications', path: '/admin/applications', active: isApplicationsActive, icon: FileText },
    { name: 'Visas', path: '/admin/visas', active: isVisasActive, icon: Globe },
    { name: 'Countries', path: '/admin/countries', active: isCountriesActive, icon: MapPin },
    { name: 'Documentation', path: '/admin/documentation', active: isDocumentationActive, icon: Layers },
    { name: 'Dummy Tickets', path: '/admin/dummy-tickets', active: isDummyTicketsActive, icon: Plane }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#082B61] flex flex-col font-sans selection:bg-[#2563EB]/15 selection:text-[#082B61]">
      {/* 1. TOP ADMIN NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          
          {/* Brand & Admin Lockup */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/admin/applications" className="flex items-center gap-2 group">
              <span className="text-xl font-black text-[#2563EB] tracking-tight">
                NimuFly
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-[#2563EB] text-[10px] font-black uppercase tracking-wider">
                ADMIN
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200/80 pl-4 sm:pl-6 text-xs font-semibold">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap ${
                      item.active
                        ? 'bg-blue-50/90 text-[#2563EB] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-[#082B61] hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} className={item.active ? 'text-[#2563EB]' : 'text-slate-400'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Customer View & Admin Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/account"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#082B61] text-xs font-semibold transition-all shadow-2xs"
            >
              <span>Customer Portal</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>

            <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#2563EB] font-bold text-xs shadow-2xs">
                <User size={14} />
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <span className="text-xs font-extrabold text-[#082B61] block truncate max-w-[120px]">
                  {user?.name || user?.email?.split('@')[0] || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  Operations
                </span>
              </div>

              {token ? (
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  title="Sign out of Admin session"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="px-3 py-1 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    item.active
                      ? 'bg-blue-50 text-[#2563EB] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} className={item.active ? 'text-[#2563EB]' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/account"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <span>Customer Portal</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN ADMIN CONTENT */}
      <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!token ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2563EB] mb-4 shadow-2xs">
              <KeyRound size={24} />
            </div>
            <h2 className="text-xl font-black text-[#082B61] mb-1.5">Administrator Sign In Required</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-5 leading-relaxed font-medium">
              Please authenticate with valid administrator credentials to access immigration operations, visa configurations, and applicant queues.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign In to Console
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-2xs">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-red-950 mb-1.5">Access Denied: Customer Account Detected</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-2 font-medium">
              You are currently authenticated as a standard customer (<span className="font-semibold text-slate-900">{user?.email || 'Customer'}</span>).
            </p>
            <p className="text-xs text-slate-400 max-w-md mb-5">
              Administrative and immigration operator privileges are strictly required to view this console.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/account"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Go to Customer Dashboard
              </Link>
              <button
                onClick={handleAdminLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Sign In with Admin Account
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Admin Login Modal (When unauthenticated in API mode) */}
      {showLoginModal && !token && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#082B61]">Admin Authorization</h3>
                <p className="text-xs text-slate-500 font-medium">Authenticate to manage countries, visas & applications</p>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operator Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      <span>Sign In as Admin</span>
                    </>
                  )}
                </button>
              </div>


            </form>
          </div>
        </div>
      )}
    </div>
  );
}
