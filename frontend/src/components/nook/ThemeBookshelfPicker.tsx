import React, { useState, useEffect } from 'react';
import { THEME_CATEGORIES, ALL_THEMES, getThemesByCategory, getCategoryForTheme, getThemeById } from '../../themes/registry';
import { ThemeDefinition, ThemePalette, ThemeCategory } from '../../themes/types';
import { ChevronDown, ChevronRight, Check, Sparkles, Save, Info, Bookmark } from 'lucide-react';

interface ThemeBookshelfPickerProps {
  currentSavedThemeId: string;
  stagedThemeId: string;
  hasUnsavedColors?: boolean;
  onStageTheme: (theme: ThemeDefinition) => void;
  onCommitTheme: (themeId: string, palette: ThemePalette) => void;
  isSaving?: boolean;
}

export const ThemeBookshelfPicker: React.FC<ThemeBookshelfPickerProps> = ({
  currentSavedThemeId,
  stagedThemeId,
  hasUnsavedColors = false,
  onStageTheme,
  onCommitTheme,
  isSaving = false
}) => {
  // Determine initial category shelf to expand based on currently saved theme
  const initialCategory = getCategoryForTheme(currentSavedThemeId);
  const [expandedCategory, setExpandedCategory] = useState<ThemeCategory>(initialCategory);

  useEffect(() => {
    const cat = getCategoryForTheme(currentSavedThemeId);
    setExpandedCategory(cat);
  }, [currentSavedThemeId]);

  const hasUnsavedThemeChange = stagedThemeId !== currentSavedThemeId || hasUnsavedColors;
  const stagedThemeObj = getThemeById(stagedThemeId);

  const toggleCategory = (catId: ThemeCategory) => {
    setExpandedCategory(prev => (prev === catId ? catId : catId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Header & Dedicated Theme Save Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '0.85rem 1.1rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
            <Bookmark size={18} style={{ color: 'var(--accent-color)' }} />
            <span>Theme Engine Bookshelf</span>
          </div>
          <p style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '0.2rem', margin: 0 }}>
            Browse categorized theme sets. Expand a shelf to view live micro-card previews.
          </p>
        </div>

        {/* Dedicated "Apply & Save Theme" Action Button & Tooltip Container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => {
                if (hasUnsavedThemeChange && stagedThemeObj) {
                  onCommitTheme(stagedThemeObj.id, stagedThemeObj.palette);
                }
              }}
              disabled={!hasUnsavedThemeChange || isSaving}
              className={hasUnsavedThemeChange ? 'btn-primary' : 'btn-secondary'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                opacity: hasUnsavedThemeChange ? 1 : 0.45,
                cursor: hasUnsavedThemeChange ? 'pointer' : 'not-allowed',
                boxShadow: hasUnsavedThemeChange ? '0 0 16px rgba(99, 102, 241, 0.5)' : 'none',
                filter: hasUnsavedThemeChange ? 'brightness(1.1)' : 'grayscale(60%)',
                transition: 'all 0.25s ease'
              }}
              title='Theme swaps do not auto-save, click "Apply & Save Theme" to keep the change.'
            >
              <Save size={16} />
              <span>{isSaving ? 'Applying Theme...' : hasUnsavedThemeChange ? 'Apply & Save Theme' : 'Theme Saved'}</span>
            </button>
          </div>

          {/* Simple Tooltip / Notice helper text */}
          <div style={{
            fontSize: '0.74rem',
            color: hasUnsavedThemeChange ? 'var(--accent-color)' : 'var(--text-muted)',
            fontWeight: hasUnsavedThemeChange ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Info size={12} />
            <span>
              {hasUnsavedThemeChange
                ? `Staged change to "${stagedThemeObj.name}". Theme swaps do not auto-save, click "Apply & Save Theme" to keep the change.`
                : 'Theme swaps do not auto-save, click "Apply & Save Theme" to keep the change.'}
            </span>
          </div>
        </div>
      </div>

      {/* Bookshelf Categories Accordion Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {THEME_CATEGORIES.map(cat => {
          const isExpanded = expandedCategory === cat.id;
          const categoryThemes = getThemesByCategory(cat.id);
          const containsSavedTheme = categoryThemes.some(t => t.id === currentSavedThemeId);
          const containsStagedTheme = categoryThemes.some(t => t.id === stagedThemeId);

          return (
            <div
              key={cat.id}
              style={{
                borderRadius: '12px',
                border: containsStagedTheme
                  ? '2px solid var(--accent-color)'
                  : isExpanded
                  ? '1px solid rgba(255,255,255,0.2)'
                  : '1px solid var(--border-color)',
                background: isExpanded ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Category Accordion Header */}
              <div
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{cat.label} Shelf</span>
                      {containsSavedTheme && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '10px', background: '#22c55e', color: '#ffffff', fontWeight: 700 }}>
                          Active Theme Included
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '0.1rem' }}>{cat.description}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                    {categoryThemes.length} {categoryThemes.length === 1 ? 'Theme' : 'Themes'}
                  </span>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {/* Category Expanded Content: Grid of Live Micro-Card Theme Items */}
              {isExpanded && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {categoryThemes.map(t => {
                      const isSaved = currentSavedThemeId === t.id;
                      const isStaged = stagedThemeId === t.id;
                      const prev = t.previewStyle;

                      return (
                        <div
                          key={t.id}
                          onClick={() => onStageTheme(t)}
                          style={{
                            padding: '0.9rem',
                            borderRadius: '14px',
                            background: isStaged ? 'rgba(99, 102, 241, 0.18)' : 'rgba(0, 0, 0, 0.25)',
                            border: isStaged
                              ? '2px solid var(--accent-color)'
                              : isSaved
                              ? '2px solid #22c55e'
                              : '1px solid var(--border-color)',
                            boxShadow: isStaged ? '0 0 16px rgba(99, 102, 241, 0.3)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            position: 'relative'
                          }}
                        >
                          {/* Theme Header & Title */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem', gap: '0.5rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {t.badge && <span>{t.badge}</span>}
                                <span>{t.name}</span>
                              </div>

                              {isSaved ? (
                                <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Check size={10} /> Active
                                </span>
                              ) : isStaged ? (
                                <span style={{ fontSize: '0.68rem', background: 'var(--accent-color)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Sparkles size={10} /> Staged
                                </span>
                              ) : null}
                            </div>
                            <p style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.35, margin: 0 }}>{t.description}</p>
                          </div>

                          {/* Live Micro-Card Component Preview */}
                          <div style={{
                            background: t.palette.bg,
                            borderRadius: '10px',
                            padding: '0.6rem',
                            border: `1px solid ${t.palette.border}`,
                            color: t.palette.text,
                            fontFamily: prev.fontFamily || 'inherit',
                            fontSize: '0.72rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}>
                            {/* Micro Card Mock Header */}
                            <div style={{
                              background: prev.headerBg || t.palette.accent,
                              color: '#ffffff',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{t.badge || '✨'} Sample Card</span>
                              <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>Preview</span>
                            </div>

                            {/* Micro Card Content Body */}
                            <div style={{
                              background: t.palette.cardBg,
                              borderRadius: prev.borderRadius || '6px',
                              border: `${prev.borderWidth || '1px'} ${prev.borderStyle || 'solid'} ${prev.borderColor || t.palette.border}`,
                              padding: '0.45rem',
                              color: t.palette.text
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Nook Theme Cue</div>
                              <div style={{ fontSize: '0.65rem', opacity: 0.8, lineHeight: 1.25 }}>
                                Live micro styling demo.
                              </div>
                            </div>
                          </div>

                          {/* Palette Color Swatches & Specs */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                              {[
                                { color: t.palette.bg, label: 'Background' },
                                { color: t.palette.cardBg, label: 'Card' },
                                { color: t.palette.accent, label: 'Accent' },
                                { color: t.palette.text, label: 'Text' },
                                { color: t.palette.border, label: 'Border' }
                              ].map((c, i) => (
                                <div
                                  key={i}
                                  title={`${c.label}: ${c.color}`}
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: c.color,
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                  }}
                                />
                              ))}
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.7rem', opacity: 0.6 }}>
                              {t.supportsSounds && <span title="Supports sound effects">🔊</span>}
                              {t.supportsAnimations && <span title="Supports micro animations">✨</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
