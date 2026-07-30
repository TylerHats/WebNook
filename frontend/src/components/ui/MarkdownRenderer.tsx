import React from 'react';

interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, style, className }) => {
  if (!content) return null;

  // Split lines while preserving block structures
  const rawLines = content.split('\n');

  // Process inline elements like **bold**, *italic*, `code`, ![alt](url), [text](url)
  const renderInline = (text: string) => {
    // Regex matching inline formatting tokens
    // Order: Images, Links, Bold, Italic, Code
    const parts = text.split(/(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)\s*|\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Image: ![alt](url)
      const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return (
          <img
            key={idx}
            src={imgMatch[2]}
            alt={imgMatch[1] || 'Markdown Image'}
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              margin: '0.6rem 0',
              display: 'block',
              objectFit: 'contain',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onError={(e) => {
              // Graceful fallback for broken image links
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        );
      }

      // Link: [text](url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-color, #38bdf8)', textDecoration: 'underline', fontWeight: 600 }}
          >
            {linkMatch[1]}
          </a>
        );
      }

      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }

      // Italic: *text*
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }

      // Inline Code: `text`
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace',
              color: 'var(--accent-color, #38bdf8)'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  return (
    <div
      className={className}
      style={{
        lineHeight: 1.6,
        fontSize: '0.92rem',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        ...style
      }}
    >
      {rawLines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line spacer
        if (!trimmed) {
          return <div key={lineIdx} style={{ height: '0.4rem' }} />;
        }

        // Headings (# H1, ## H2, ### H3, #### H4)
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={lineIdx} style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.75rem 0 0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>
              {renderInline(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={lineIdx} style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.65rem 0 0.35rem' }}>
              {renderInline(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={lineIdx} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.55rem 0 0.3rem', color: 'var(--accent-color, inherit)' }}>
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={lineIdx} style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0.45rem 0 0.25rem' }}>
              {renderInline(trimmed.replace(/^####\s+/, ''))}
            </h4>
          );
        }

        // Horizontal Rule (--- or ***)
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={lineIdx} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '0.75rem 0' }} />;
        }

        // Blockquotes (> quote text)
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={lineIdx}
              style={{
                margin: '0.4rem 0',
                paddingLeft: '0.75rem',
                borderLeft: '3px solid var(--accent-color, #6366f1)',
                opacity: 0.9,
                fontStyle: 'italic',
                background: 'rgba(0,0,0,0.15)',
                paddingTop: '0.3rem',
                paddingBottom: '0.3rem',
                borderRadius: '0 6px 6px 0'
              }}
            >
              {renderInline(trimmed.replace(/^>\s*/, ''))}
            </blockquote>
          );
        }

        // Bulleted lists (- item, * item, + item)
        const isBullet = /^[*\-+]\s+/.test(trimmed);
        if (isBullet) {
          const itemText = trimmed.replace(/^[*\-+]\s+/, '');
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', paddingLeft: '0.5rem' }}>
              <span style={{ color: 'var(--accent-color, inherit)', fontWeight: 700 }}>•</span>
              <div style={{ flex: 1 }}>{renderInline(itemText)}</div>
            </div>
          );
        }

        // Numbered lists (1. item, 2. item)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', paddingLeft: '0.5rem' }}>
              <span style={{ color: 'var(--accent-color, inherit)', fontWeight: 700, fontSize: '0.85em' }}>{numMatch[1]}.</span>
              <div style={{ flex: 1 }}>{renderInline(numMatch[2])}</div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={lineIdx} style={{ margin: '0 0 0.35rem' }}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};
