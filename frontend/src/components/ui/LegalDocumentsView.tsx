import React from 'react';
import { ShieldCheck, FileText, Globe, Mail, Calendar, Server } from 'lucide-react';
import { isSafeUrl } from '../../utils/sanitize';

export interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export interface LegalInstanceInfo {
  appName: string;
  logoUrl?: string | null;
  siteUrl?: string | null;
  operatorName: string;
  contactEmail?: string | null;
  jurisdiction?: string;
  minAge: number;
  activeIntegrations: string[];
}

export interface LegalDocumentsPayload {
  version: string;
  effectiveDate: string;
  instance: LegalInstanceInfo;
  terms: LegalDocument;
  privacy: LegalDocument;
}

interface LegalDocumentsViewProps {
  data: LegalDocumentsPayload | null;
  activeTab: 'terms' | 'privacy';
  onTabChange: (tab: 'terms' | 'privacy') => void;
  maxHeight?: string;
}

export const LegalDocumentsView: React.FC<LegalDocumentsViewProps> = ({
  data,
  activeTab,
  onTabChange,
  maxHeight
}) => {
  if (!data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
        Loading instance legal policies...
      </div>
    );
  }

  const doc = activeTab === 'terms' ? data.terms : data.privacy;
  const { instance } = data;
  const safeLogoUrl = instance.logoUrl && isSafeUrl(instance.logoUrl, true, false) ? instance.logoUrl : null;
  const safeSiteUrl = instance.siteUrl && isSafeUrl(instance.siteUrl, false, false) ? instance.siteUrl : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onTabChange('terms')}
          className={activeTab === 'terms' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem', fontSize: '0.9rem' }}
        >
          <FileText size={16} />
          <span>Terms & Conditions</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('privacy')}
          className={activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem', fontSize: '0.9rem' }}
        >
          <ShieldCheck size={16} />
          <span>Privacy Policy</span>
        </button>
      </div>

      {/* Dynamic Instance Summary Banner */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '0.9rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          fontSize: '0.84rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.98rem' }}>
            {safeLogoUrl && (
              <img
                src={safeLogoUrl}
                alt={instance.appName}
                style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'contain' }}
              />
            )}
            <span>{doc.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85, fontSize: '0.78rem' }}>
            <span style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontWeight: 700 }}>
              v{data.version}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} />
              Effective {data.effectiveDate}
            </span>
          </div>
        </div>

        <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.45 }}>{doc.subtitle}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', paddingTop: '0.25rem', opacity: 0.8, fontSize: '0.78rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Server size={13} />
            Operator: <strong>{instance.operatorName}</strong>
          </span>
          {safeSiteUrl && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Globe size={13} />
              Instance: <strong>{safeSiteUrl}</strong>
            </span>
          )}
          {instance.contactEmail && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Mail size={13} />
              Contact: <a href={`mailto:${instance.contactEmail}`} style={{ color: 'var(--accent-color)' }}>{instance.contactEmail}</a>
            </span>
          )}
          <span>Min Age: <strong>{instance.minAge}+</strong></span>
        </div>
      </div>

      {/* Scrollable Sections */}
      <div
        style={{
          maxHeight: maxHeight || 'none',
          overflowY: maxHeight ? 'auto' : 'visible',
          paddingRight: maxHeight ? '0.5rem' : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem'
        }}
      >
        {doc.sections.map((sec, idx) => (
          <section
            key={idx}
            style={{
              background: 'rgba(0,0,0,0.16)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '0.95rem 1.05rem'
            }}
          >
            <h3 style={{ margin: '0 0 0.55rem 0', fontSize: '1.02rem', fontWeight: 700, color: 'var(--accent-color)' }}>
              {sec.heading}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.92 }}>
              {sec.body.map((paragraph, pIdx) => (
                <p key={pIdx} style={{ margin: 0 }}>{paragraph}</p>
              ))}
              {sec.bullets && sec.bullets.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {sec.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

