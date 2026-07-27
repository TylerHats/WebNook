import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, ShieldCheck, Mail, Lock, User, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          navigate(`/nook/${data.user.username}`);
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
        navigate(`/nook/${verifyData.user.username}`);
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
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Log in to your WebNook account</p>
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
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
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, display_name: displayName })
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast('Welcome to WebNook!', 'success');
        navigate(`/nook/${data.user.username}`);
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
      <div className="nook-panel" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={32} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Create Your Nook</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Join your friends on WebNook social</p>
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
            <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px', display: 'block' }}>Your Nook URL will be: website.com/nook/{username || 'username'}</span>
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
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={isLoading}>
            <span>{isLoading ? 'Creating Nook...' : 'Create Account'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.8 }}>
          Already have a Nook? <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Login here</Link>
        </div>
      </div>
    </div>
  );
};
