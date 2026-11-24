import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { LegalDocumentsPayload, LegalDocumentsView } from '../components/ui/LegalDocumentsView';

interface LegalPageProps {
  defaultTab?: 'terms' | 'privacy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ defaultTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(defaultTab);
  const [legalData, setLegalData] = useState<LegalDocumentsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    let active = true;
    fetch('/api/legal/documents')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load legal documents');
        return res.json();
      })
      .then((data) => {
        if (active) setLegalData(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load legal policies.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '0 1rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link to="/" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', textDecoration: 'none', fontSize: '0.88rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.88rem' }}
        >
          <Printer size={15} />
          <span>Print / Save PDF</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {error ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : (
          <LegalDocumentsView
            data={legalData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </div>
  );
};

