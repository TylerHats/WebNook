import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, token: authToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'notice'>(token ? 'verifying' : 'notice');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/verify-email?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setStatus('error');
            setMessage(data.error);
          } else {
            setStatus('success');
            setMessage(data.message);
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage('Failed to verify email token. Please try again.');
        });
    }
  }, [token]);

  const handleResend = async () => {
    if (!authToken) {
      showToast('Please log in to resend verification email.', 'error');
      navigate('/login');
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to resend verification email', 'error');
      }
    } catch (e) {
      showToast('Error sending verification email', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="nook-panel" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        {status === 'verifying' && (
          <div>
            <Sparkles size={40} className="animate-spin" color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Verifying Email Address</h2>
            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Please wait while we confirm your email token...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Email Verified! 🎉</h2>
            <p style={{ opacity: 0.8, fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              {message || 'Your email address has been successfully verified.'}
            </p>
            <button onClick={() => window.location.href = '/onboarding'} className="btn-primary" style={{ margin: '0 auto', fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
              <span>Start Nook Onboarding Wizard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {(status === 'notice' || status === 'error') && (
          <div>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Mail size={38} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Email Verification Required</h2>
            <p style={{ opacity: 0.8, fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {status === 'error' ? message : `Please check your email inbox${user ? ` (${user.email})` : ''} and click the verification button or link to unlock full Nook features.`}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem', opacity: 0.9 }}>• Styled verification emails are sent with an active action button.</p>
              <p style={{ margin: 0, opacity: 0.7 }}>• If the button doesn't render in your email client, use the raw link section at the bottom of the email.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleResend} className="btn-primary" disabled={isResending}>
                <RefreshCw size={16} />
                <span>{isResending ? 'Sending...' : 'Resend Verification Email'}</span>
              </button>
              <Link to="/" className="btn-secondary">Return Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
