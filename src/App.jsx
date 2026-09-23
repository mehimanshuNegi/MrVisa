import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingBottomNav from './components/FloatingBottomNav';
import HomePage from './pages/HomePage';
import VisaPage from './pages/VisaPage';
import CountryDetailPage from './pages/CountryDetailPage';
import VisaApplicationPage from './pages/VisaApplicationPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AccountPage from './pages/AccountPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminVisasPage from './pages/admin/AdminVisasPage';
import AdminCountriesPage from './pages/admin/AdminCountriesPage';
import ErrorBoundary from './components/ErrorBoundary';
import { FilterProvider } from './context/FilterContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const isApplyPage = location.pathname.includes('/apply');
  const isAdminPage = location.pathname.startsWith('/admin');
  const hideCustomerChrome = isApplyPage || isAdminPage;

  return (
    <div className="min-h-screen bg-white text-[#0B2A63] flex flex-col font-sans selection:bg-[#1479F5]/15 selection:text-[#0B2A63]">
      {/* Global Header (Hidden on dedicated visa application checkout workspace and admin) */}
      {!hideCustomerChrome && <Header />}

      {/* Dynamic Routes */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/visa" element={<VisaPage />} />
          <Route path="/visa/:country" element={<CountryDetailPage />} />
          <Route path="/visa/:country/:visaId" element={<CountryDetailPage />} />
          <Route
            path="/visa/:country/apply"
            element={
              <ErrorBoundary>
                <VisaApplicationPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/visa/:country/:visaId/apply"
            element={
              <ErrorBoundary>
                <VisaApplicationPage />
              </ErrorBoundary>
            }
          />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/my-account" element={<AccountPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/applications" replace />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route path="visas" element={<AdminVisasPage />} />
            <Route path="countries" element={<AdminCountriesPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Global Footer (Hidden on dedicated visa application checkout workspace and admin) */}
      {!hideCustomerChrome && <Footer />}

      {/* Minimal Floating Navigation Bar Across All Pages */}
      {!hideCustomerChrome && <FloatingBottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <FilterProvider>
          <ScrollToTop />
          <AppContent />
        </FilterProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}


