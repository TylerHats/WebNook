import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordComplexityIndicatorProps {
  password: string;
}

interface PasswordRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export const PasswordComplexityIndicator: React.FC<PasswordComplexityIndicatorProps> = ({ password }) => {
  const [rules, setRules] = useState<PasswordRules>({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false
  });

  useEffect(() => {
    fetch('/api/auth/password-requirements')
      .then(res => res.json())
      .then(data => {
        if (data.requirements) setRules(data.requirements);
      })
      .catch(() => {});
  }, []);

  const checks = [
    {
      id: 'length',
      label: `At least ${rules.minLength} characters long`,
      passed: password.length >= rules.minLength,
      enabled: true
    },
    {
      id: 'uppercase',
      label: 'Contains an uppercase letter (A-Z)',
      passed: /[A-Z]/.test(password),
      enabled: rules.requireUppercase
    },
    {
      id: 'lowercase',
      label: 'Contains a lowercase letter (a-z)',
      passed: /[a-z]/.test(password),
      enabled: rules.requireLowercase
    },
    {
      id: 'number',
      label: 'Contains a number (0-9)',
      passed: /[0-9]/.test(password),
      enabled: rules.requireNumber
    },
    {
      id: 'special',
      label: 'Contains a special character (!@#$%^&*)',
      passed: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      enabled: rules.requireSpecial
    }
  ].filter(c => c.enabled);

  if (!password) return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', margin: '0.5rem 0 1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Password Requirements:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {checks.map(c => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: c.passed ? '#22c55e' : 'rgba(255,255,255,0.5)',
              fontWeight: c.passed ? 600 : 400
            }}
          >
            {c.passed ? <Check size={14} color="#22c55e" /> : <X size={14} color="rgba(255,255,255,0.4)" />}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
