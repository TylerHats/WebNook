import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/ui/Navbar';
import { NookViewPage } from './pages/NookViewPage';
import { NookCustomizerPage } from './pages/NookCustomizerPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { Sparkles } from 'lucide-react';

const AppRoutes: React.FC = () => {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        setSetupCompleted(data.setup_completed);
      })
      .catch(() => setSetupCompleted(true));
  }, [location.pathname]);

  if (setupCompleted === null) {
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {location.pathname !== '/setup' && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/setup" element={<SetupWizardPage />} />
          <Route path="/" element={<NookViewPage />} />
          <Route path="/nook/:username" element={<NookViewPage />} />
          <Route path="/customize" element={<NookCustomizerPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/settings" element={<AccountSettingsPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};
