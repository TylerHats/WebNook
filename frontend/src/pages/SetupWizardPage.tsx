import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Shield, User, Image, Upload, CheckCircle2, ArrowRight } from 'lucide-react';

export const SetupWizardPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Whitelabel Branding
  const [appName, setAppName] = useState('WebNook');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('/branding/logo.png');

  // Step 2: Admin Account
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminDisplayName, setAdminDisplayName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 3: Optional System Config
  const [steamApiKey, setSteamApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoFileChange = (file: File | null) => {
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteSetup = async () => {
    if (!adminUsername || !adminEmail || !adminPassword) {
      showToast('Please fill out all required admin account fields!', 'error');
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit OOBE Initialization data
      const initRes = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName,
          admin_username: adminUsername,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_display_name: adminDisplayName
        })
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        showToast(initData.error || 'Setup initialization failed', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Upload custom logo file if selected
      if (logoFile && initData.token) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await fetch('/api/admin/branding/logo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${initData.token}` },
          body: formData
        });
      }

      // 3. Log admin in & hard redirect to Home Page
      login(initData.token, initData.user);
      showToast('OOBE Setup wizard completed successfully!', 'success');
      window.location.href = '/';
    } catch (err) {
      showToast('Error completing setup wizard', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="nook-panel" style={{ maxWidth: '560px', width: '100%' }}>
        {/* Wizard Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Sparkles size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Welcome to {appName}</h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Initial Out-Of-The-Box Experience (OOBE) Setup Wizard</p>
        </div>

        {/* Wizard Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          {[
            { num: 1, label: 'Branding' },
            { num: 2, label: 'Admin Account' },
            { num: 3, label: 'Confirmation' }
          ].map(s => (
            <div
              key={s.num}
              onClick={() => setStep(s.num as any)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: step === s.num ? 'var(--accent-color)' : 'var(--text-muted)',
                fontWeight: step === s.num ? 700 : 500,
                fontSize: '0.85rem'
              }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step === s.num ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Whitelabel Branding */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Image size={20} color="var(--accent-color)" />
              <span>Configure Whitelabel Branding</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="e.g. MyFriendGroup Social"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Branding Logo Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                <img src={logoPreview} alt="Logo Preview" style={{ height: '44px', maxWidth: '180px', objectFit: 'contain' }} />
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Favicon, Navbar & PWA Icon</span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                  <Upload size={15} />
                  <span>{logoFile ? logoFile.name : 'Choose Custom Logo Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleLogoFileChange(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="btn-primary" style={{ marginTop: '0.5rem', alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span>Next: Admin Account</span>
              <ArrowRight size={16} style={{ flexShrink: 0 }} />
            </button>
          </div>
        )}

        {/* STEP 2: Admin Account */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="var(--accent-color)" style={{ flexShrink: 0 }} />
              <span>Create Initial Administrator Account</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Admin Username Handle</label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                placeholder="e.g. admin"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Display Name</label>
              <input
                type="text"
                value={adminDisplayName}
                onChange={e => setAdminDisplayName(e.target.value)}
                placeholder="e.g. System Admin 👑"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Admin Email Address</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span>Next: Confirmation</span>
                <ArrowRight size={16} style={{ flexShrink: 0 }} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation & Complete */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0 }} />
              <span>Confirm & Launch Platform</span>
            </h3>

            <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--accent-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '0.3rem' }}>Setup Overview:</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>• Application Name: <strong>{appName}</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>• Admin Handle: <strong>@{adminUsername}</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>• Admin Email: <strong>{adminEmail}</strong></p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={handleCompleteSetup} className="btn-primary" disabled={isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{isSubmitting ? 'Completing Setup...' : 'Complete & Launch Platform'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
