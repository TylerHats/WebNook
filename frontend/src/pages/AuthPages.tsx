import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, ShieldCheck, Mail, Lock, User, Sparkles, ArrowLeft, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { PasswordComplexityIndicator } from '../components/ui/PasswordComplexityIndicator';
import { LegalDocumentsPayload, LegalDocumentsView } from '../components/ui/LegalDocumentsView';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPostLoginDestination = (username: string) => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return redirect;
    }
    return `/nook/${username}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail,
          password,
          totp_code: totpCode || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.requires_mfa) {
          setRequiresMfa(true);
          showToast('TOTP 2FA code required', 'info');
        } else {
          login(data.token, data.user);
          showToast('Logged in successfully!', 'success');
          navigate(getPostLoginDestination(data.user.username));
        }
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      setIsLoading(true);
      const optRes = await fetch('/api/mfa/passkey/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail || undefined })
      });

      const { options, session_id } = await optRes.json();
      const asseResp = await startAuthentication(options);

      const verifyRes = await fetch('/api/mfa/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, response: asseResp })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.verified) {
        login(verifyData.token, verifyData.user);
        showToast('Passkey authentication successful!', 'success');
        navigate(getPostLoginDestination(verifyData.user.username));
      } else {
        showToast(verifyData.error || 'Passkey login failed', 'error');
      }
    } catch (err: any) {
      showToast('Passkey login cancelled or failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="nook-panel" style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={32} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Welcome Back</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Log in to your account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Username or Email</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-btn)', border: '1px solid var(--border-color)' }}>
              <User size={18} style={{ opacity: 0.6 }} />
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                placeholder="username or email"
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-btn)', border: '1px solid var(--border-color)' }}>
              <Lock size={18} style={{ opacity: 0.6 }} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          </div>

          {requiresMfa && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--accent-color)' }}>TOTP 2FA Authentication Code</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-btn)', border: '1px solid var(--accent-color)' }}>
                <ShieldCheck size={18} color="var(--accent-color)" />
                <input
                  type="text"
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  placeholder="6-digit TOTP code"
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={isLoading}>
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <button
          onClick={handlePasskeyLogin}
          type="button"
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          disabled={isLoading}
        >
          <KeyRound size={18} color="var(--accent-color)" />
          <span>Sign In with Passkey / Biometrics</span>
        </button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.8 }}>
          Don't have a Nook yet? <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Sign up here</Link>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalData, setLegalData] = useState<LegalDocumentsPayload | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/legal/documents', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setLegalData(data);
      })
      .catch(() => {});
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      showToast('Please read and accept the Terms & Conditions and Privacy Policy to continue.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          display_name: displayName,
          accepted_terms: true,
          accepted_terms_version: legalData?.version || '1.0'
        })
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast('Account created! Welcome aboard!', 'success');
        if (data.user.is_email_verified === false) {
          navigate('/verify-email');
        } else {
          navigate(`/nook/${data.user.username}`);
        }
      } else {
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (e) {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="nook-panel" style={{ maxWidth: '460px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={32} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Create Your Nook</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Join {legalData?.instance?.appName || 'WebNook'} social spaces
          </p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Username Handle</label>
            <input
              type="text"
              required
              placeholder="e.g. cyber_kat"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
            <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px', display: 'block' }}>
              Your Nook URL will be: {typeof window !== 'undefined' ? window.location.origin : ''}/nook/{username || 'username'}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Display Name</label>
            <input
              type="text"
              placeholder="e.g. Kat ⭐"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
            <PasswordComplexityIndicator password={password} />
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.75rem 0.85rem'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.84rem', lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                required
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--accent-color)', cursor: 'pointer', flexShrink: 0 }}
              />
              <span>
                I confirm that I meet the minimum age requirement ({legalData?.instance?.minAge ?? 13}+) and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('terms')}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-color)', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}
                >
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('privacy')}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-color)', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}
                >
                  Privacy Policy
                </button>
                {legalData ? ` (v${legalData.version})` : ''}.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: !acceptedTerms || isLoading ? 0.65 : 1 }}
            disabled={isLoading || !acceptedTerms}
          >
            <span>{isLoading ? 'Creating Nook...' : 'Create Account'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.8 }}>
          Already have a Nook? <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Login here</Link>
        </div>
      </div>

      {/* Inline Legal Document Preview Modal */}
      {legalModalTab && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(8, 10, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: '780px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>Legal Policies Preview</span>
              <button type="button" onClick={() => setLegalModalTab(null)} className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }}>
                <X size={18} />
              </button>
            </div>
            <LegalDocumentsView
              data={legalData}
              activeTab={legalModalTab}
              onTabChange={setLegalModalTab}
              maxHeight="60vh"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <Link to={legalModalTab === 'terms' ? '/terms' : '/privacy'} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem' }}>
                Open Full Page ↗
              </Link>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setAcceptedTerms(true);
                  setLegalModalTab(null);
                }}
              >
                Agree & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        showToast(data.message || 'Check your inbox for a password reset link.', 'success');
      } else {
        showToast(data.error || 'Could not process password reset request.', 'error');
      }
    } catch {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="nook-panel" style={{ maxWidth: '430px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Mail size={34} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Reset Your Password</h2>
          <p style={{ opacity: 0.75, fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Enter your account email address and we&apos;ll send you a secure reset link.
          </p>
        </div>

        {submitted ? (
          <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
            <CheckCircle2 size={28} color="#4ade80" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent. Please check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Account Email Address</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-btn)', border: '1px solid var(--border-color)' }}>
                <Mail size={18} style={{ opacity: 0.6 }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
              <span>{isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.86rem' }}>
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}>
            <ArrowLeft size={15} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const resetToken = searchParams.get('token') || '';
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid'>(resetToken ? 'checking' : 'invalid');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!resetToken) {
      setTokenStatus('invalid');
      return;
    }
    let active = true;
    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(resetToken)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (active) setTokenStatus(data.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (active) setTokenStatus('invalid');
      });
    return () => {
      active = false;
    };
  }, [resetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCompleted(true);
        showToast(data.message || 'Password reset successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to reset password.', 'error');
      }
    } catch {
      showToast('Error connecting to server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="nook-panel" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <KeyRound size={34} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Set New Password</h2>
        </div>

        {tokenStatus === 'checking' && (
          <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.75 }}>
            Verifying your reset link...
          </div>
        )}

        {tokenStatus === 'invalid' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '1.1rem', width: '100%' }}>
              <AlertTriangle size={28} color="#f87171" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 700 }}>Invalid or Expired Reset Link</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', opacity: 0.8 }}>
                Password reset links expire after 1 hour or after being used once.
              </p>
            </div>
            <Link to="/forgot-password" className="btn-primary" style={{ textDecoration: 'none' }}>
              Request a New Reset Link
            </Link>
          </div>
        )}

        {tokenStatus === 'valid' && completed && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '10px', padding: '1.1rem', width: '100%' }}>
              <CheckCircle2 size={28} color="#4ade80" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 700 }}>Password Updated!</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', opacity: 0.8 }}>
                Your password has been changed. You can now sign in with your new credentials.
              </p>
            </div>
            <button type="button" onClick={() => navigate('/login')} className="btn-primary">
              Continue to Login
            </button>
          </div>
        )}

        {tokenStatus === 'valid' && !completed && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
              <PasswordComplexityIndicator password={newPassword} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
              <span>{isSubmitting ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
