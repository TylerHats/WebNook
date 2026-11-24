import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PWAProvider } from './context/PWAContext';
import { PWAInstallBanner } from './components/ui/PWAInstallBanner';
import { Navbar } from './components/ui/Navbar';
import { TermsAcceptanceGate } from './components/ui/TermsAcceptanceGate';
import { HomePage } from './pages/HomePage';
import { NookViewPage } from './pages/NookViewPage';
import { NookCustomizerPage } from './pages/NookCustomizerPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { UserOnboardingPage } from './pages/UserOnboardingPage';
import { FriendsPage } from './pages/FriendsPage';
import { MessagesPage } from './pages/MessagesPage';
import { LegalPage } from './pages/LegalPage';
import { Sparkles } from 'lucide-react';

const DocumentTitleHandler: React.FC = () => {
  const location = useLocation();
  const [appName, setAppName] = useState('WebNook');

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = location.pathname;
    if (p === '/') {
      document.title = `${appName} - Social Platform`;
    } else if (p === '/messages') {
      document.title = `Messages | ${appName}`;
    } else if (p === '/friends') {
      document.title = `Friends | ${appName}`;
    } else if (p === '/customize') {
      document.title = `Customizer | ${appName}`;
    } else if (p === '/settings') {
      document.title = `Settings | ${appName}`;
    } else if (p === '/admin') {
      document.title = `Admin | ${appName}`;
    } else if (p === '/login') {
      document.title = `Login | ${appName}`;
    } else if (p === '/register') {
      document.title = `Sign Up | ${appName}`;
    } else if (p === '/forgot-password') {
      document.title = `Forgot Password | ${appName}`;
    } else if (p === '/reset-password') {
      document.title = `Reset Password | ${appName}`;
    } else if (p === '/terms') {
      document.title = `Terms & Conditions | ${appName}`;
    } else if (p === '/privacy') {
      document.title = `Privacy Policy | ${appName}`;
    } else if (p === '/verify-email') {
      document.title = `Verify Email | ${appName}`;
    } else if (p === '/onboarding') {
      document.title = `Onboarding | ${appName}`;
    } else if (p === '/setup') {
      document.title = `Setup | ${appName}`;
    }
  }, [location.pathname, appName]);

  return null;
};

const AppRoutes: React.FC = () => {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (setupCompleted === true) return;
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        setSetupCompleted(Boolean(data.setup_completed));
      })
      .catch(() => setSetupCompleted(true));
  }, [location.pathname, setupCompleted]);

  if (setupCompleted === null || authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.7 }}>
        <Sparkles size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Initializing...</p>
      </div>
    );
  }

  // If initial setup wizard has not been completed, redirect to /setup
  if (!setupCompleted && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  const blockedByTerms = Boolean(user && user.requires_terms_acceptance);

  // If user is logged in but email is not verified, restrict customizer & onboarding access
  if (!blockedByTerms && user && !user.is_email_verified && (location.pathname === '/customize' || location.pathname === '/onboarding')) {
    return <Navigate to="/verify-email" replace />;
  }

  // If user is logged in and email verified but hasn't completed onboarding wizard
  if (!blockedByTerms && user && user.is_email_verified && !user.onboarding_completed && (location.pathname === '/customize' || location.pathname === `/nook/${user.username}`)) {
    return <Navigate to="/onboarding" replace />;
  }

  const showFooter = location.pathname !== '/setup' && location.pathname !== '/messages' && !blockedByTerms;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DocumentTitleHandler />
      {location.pathname !== '/setup' && <Navbar />}
      {blockedByTerms ? (
        <main style={{ flex: 1 }}>
          <TermsAcceptanceGate />
        </main>
      ) : (
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/setup" element={<SetupWizardPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<UserOnboardingPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/nook/:username" element={<NookViewPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/customize" element={<NookCustomizerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/terms" element={<LegalPage defaultTab="terms" />} />
            <Route path="/privacy" element={<LegalPage defaultTab="privacy" />} />
            <Route path="/settings" element={<AccountSettingsPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Routes>
        </main>
      )}
      {showFooter && (
        <footer
          style={{
            padding: '1rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            opacity: 0.68,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms & Conditions</Link>
          <span>•</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
        </footer>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PWAProvider>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
            <PWAInstallBanner />
          </BrowserRouter>
        </ToastProvider>
      </PWAProvider>
    </AuthProvider>
  );
};
