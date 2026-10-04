import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import FloatingBottomNav from './components/common/FloatingBottomNav';
import ErrorBoundary from './components/common/ErrorBoundary';
import HomePage from './pages/customer/HomePage';
import VisaPage from './pages/customer/VisaPage';
import CountryDetailPage from './pages/customer/CountryDetailPage';
import VisaApplicationPage from './pages/customer/VisaApplicationPage';
import AboutPage from './pages/customer/AboutPage';
import ContactPage from './pages/customer/ContactPage';
import AccountPage from './pages/customer/AccountPage';
import DocumentationPage from './pages/customer/DocumentationPage';
import DocumentationDetailPage from './pages/customer/DocumentationDetailPage';
import DocumentationApplyPlaceholderPage from './pages/customer/DocumentationApplyPlaceholderPage';
import DummyTicketsPage from './pages/customer/DummyTicketsPage';
import DummyTicketApplyPlaceholderPage from './pages/customer/DummyTicketApplyPlaceholderPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';
import AdminVisasPage from './pages/admin/AdminVisasPage';
import AdminCountriesPage from './pages/admin/AdminCountriesPage';
import AdminDocumentationPage from './pages/admin/AdminDocumentationPage';
import AdminDummyTicketsPage from './pages/admin/AdminDummyTicketsPage';
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/my-account" element={<AccountPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/travel-support" element={<ContactPage />} />

          {/* Documentation Routes */}
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/documentation/:slug" element={<DocumentationDetailPage />} />
          <Route path="/documentation/:slug/apply" element={<DocumentationApplyPlaceholderPage />} />

          {/* Dummy Ticket Routes (supporting both singular and plural) */}
          <Route path="/dummy-tickets" element={<DummyTicketsPage />} />
          <Route path="/dummy-tickets/apply" element={<DummyTicketApplyPlaceholderPage />} />
          <Route path="/dummy-tickets/:slug/apply" element={<DummyTicketApplyPlaceholderPage />} />
          <Route path="/dummy-ticket" element={<DummyTicketsPage />} />
          <Route path="/dummy-ticket/apply" element={<DummyTicketApplyPlaceholderPage />} />
          <Route path="/dummy-ticket/:slug/apply" element={<DummyTicketApplyPlaceholderPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/applications" replace />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route path="visas" element={<AdminVisasPage />} />
            <Route path="countries" element={<Navigate to="/admin/visas" replace />} />
            <Route path="documentation" element={<AdminDocumentationPage />} />
            <Route path="dummy-tickets" element={<AdminDummyTicketsPage />} />
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


