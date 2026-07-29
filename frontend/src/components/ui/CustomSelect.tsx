import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, User } from 'lucide-react';

export interface CustomSelectOption {
  value: string | number;
  label: string;
  avatar_url?: string;
  username?: string;
  subtitle?: string;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string | number;
  onChange: (val: string | number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Select Option --',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOpt = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
      >
        {selectedOpt ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
            {selectedOpt.avatar_url ? (
              <img
                src={selectedOpt.avatar_url}
                alt=""
                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : selectedOpt.username ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={12} />
              </div>
            ) : null}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              {selectedOpt.label}
            </span>
          </div>
        ) : (
          <span style={{ opacity: 0.6 }}>{placeholder}</span>
        )}
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }} />
      </button>

      {/* Expandable Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.35rem)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--panel-bg, #1e1e2e)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.35rem'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '0.65rem', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-main)',
                    fontSize: '0.83rem',
                    transition: 'background 0.15s ease',
                    marginBottom: '0.15rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                    {opt.avatar_url ? (
                      <img
                        src={opt.avatar_url}
                        alt=""
                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : opt.username ? (
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} />
                      </div>
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 600 }}>{opt.label}</div>
                      {opt.subtitle && <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{opt.subtitle}</div>}
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="var(--accent-color)" style={{ flexShrink: 0 }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
