import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LegalDocumentsPayload, LegalDocumentsView } from './LegalDocumentsView';

export const TermsAcceptanceGate: React.FC = () => {
  const { user, token, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [legalData, setLegalData] = useState<LegalDocumentsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDocs = async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/legal/documents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load legal policies');
      setLegalData(data);
    } catch (err: any) {
      setLoadError(err.message || 'Unable to load legal policies.');
    }
  };

  useEffect(() => {
    loadDocs();
  }, [user?.required_terms_version]);

  if (!user || !user.requires_terms_acceptance) return null;

  const targetVersion = legalData?.version || user.required_terms_version || '1.0';
  const appName = legalData?.instance?.appName || 'this WebNook instance';

  const handleAccept = async () => {
    if (!token || !hasAgreed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ accepted: true, version: targetVersion })
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        showToast('Terms & Privacy Policy accepted. Welcome back!', 'success');
      } else {
        showToast(data.error || 'Could not record acceptance. Please retry.', 'error');
        await loadDocs();
      }
    } catch {
      showToast('Network error while accepting policies.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    logout();
    navigate('/', { replace: true });
    showToast('You declined the policies and were logged out to guest view.', 'info');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-heading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 10, 18, 0.94)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '820px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 id="terms-gate-heading" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
              Updated Terms & Privacy Policy Required
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', opacity: 0.82, lineHeight: 1.45 }}>
              Signed in as <strong>@{user.username}</strong>. Before accessing any site features on <strong>{appName}</strong>, please review and accept version <strong>v{targetVersion}</strong> of our Terms & Conditions and Privacy Policy.
            </p>
          </div>
        </div>

        {loadError ? (
          <div style={{ padding: '1.25rem', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.75rem', color: '#f87171' }}>{loadError}</p>
            <button type="button" className="btn-secondary" onClick={loadDocs}>Retry Loading Policies</button>
          </div>
        ) : (
          <LegalDocumentsView
            data={legalData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            maxHeight="340px"
          />
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            padding: '0.75rem 0.9rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            lineHeight: 1.45
          }}
        >
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--accent-color)', cursor: 'pointer', flexShrink: 0 }}
          />
          <span>
            I have read and agree to the <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong> (v{targetVersion}) for {appName}.
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleDecline}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              borderColor: 'rgba(239, 68, 68, 0.45)',
              color: '#f87171'
            }}
          >
            <LogOut size={16} />
            <span>Decline & Log Out</span>
          </button>

          <button
            type="button"
            disabled={!hasAgreed || isSubmitting || !legalData}
            onClick={handleAccept}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.35rem',
              opacity: !hasAgreed || isSubmitting || !legalData ? 0.55 : 1,
              cursor: !hasAgreed || isSubmitting || !legalData ? 'not-allowed' : 'pointer'
            }}
          >
            <CheckCircle2 size={17} />
            <span>{isSubmitting ? 'Saving Acceptance...' : 'Accept & Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

