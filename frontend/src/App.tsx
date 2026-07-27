import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/ui/Navbar';
import { NookViewPage } from './pages/NookViewPage';
import { NookCustomizerPage } from './pages/NookCustomizerPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
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
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};
