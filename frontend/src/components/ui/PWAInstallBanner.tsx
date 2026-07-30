import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { useToast } from '../../context/ToastContext';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isStandalone, promptInstall, dismissBanner, isBannerDismissed } = usePWA();
  const { showToast } = useToast();

  if (isStandalone || !isInstallable || isBannerDismissed) {
    return null;
  }

  const handleDismiss = () => {
    dismissBanner();
    showToast('PWA banner dismissed. You can install anytime from Account Settings!', 'info');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '480px',
        background: 'rgba(26, 30, 50, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--accent-color)',
        borderRadius: '16px',
        padding: '0.85rem 1.1rem',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 20px rgba(99, 102, 241, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.85rem',
        color: '#ffffff'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Smartphone size={22} color="#ffffff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>Install WebNook App</div>
          <div style={{ fontSize: '0.73rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Add to home screen • Install anytime from Settings
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={promptInstall}
          className="btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Download size={14} />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px' }}
          title="Dismiss permanently (Can re-enable from Settings)"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
