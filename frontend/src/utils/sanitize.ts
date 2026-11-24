const ALLOWED_HTML_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'center', 'code', 'dd', 'del', 'details',
  'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'ins', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span',
  'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'u', 'ul'
]);

const STRIP_COMPLETELY_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'link', 'meta',
  'base', 'form', 'input', 'button', 'textarea', 'select', 'option', 'template',
  'noscript', 'applet', 'frame', 'frameset'
]);

const ALLOWED_ATTRS = new Set([
  'align', 'alt', 'class', 'colspan', 'height', 'href', 'open', 'rel',
  'rowspan', 'src', 'start', 'style', 'target', 'title', 'width'
]);

/**
 * Validates that a URL uses an allowed safe scheme (http, https, optional mailto, or safe relative path).
 * Strips ASCII whitespace and control characters before checking protocol schemes to defeat obfuscation.
 */
export function isSafeUrl(url: string | undefined | null, allowRelative = true, allowMailto = true): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject control chars or whitespace inside protocol checks
  const normalized = trimmed.replace(/[\u0000-\u0020]+/g, '');
  if (!normalized) return false;

  if (allowRelative) {
    if (
      normalized.startsWith('#') ||
      normalized.startsWith('?') ||
      normalized.startsWith('./') ||
      normalized.startsWith('../') ||
      (normalized.startsWith('/') && !normalized.startsWith('//'))
    ) {
      return true;
    }
  }

  const schemeMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    // No explicit scheme: only safe if relative URLs are permitted and it does not start with //
    return allowRelative && !normalized.startsWith('//');
  }

  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https') return true;
  if (allowMailto && scheme === 'mailto') return true;
  return false;
}

/**
 * Removes dangerous tokens from inline style attribute values.
 */
function sanitizeInlineStyle(styleValue: string): string {
  const cleaned = styleValue
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\s*\([^)]*\)/gi, '')
    .replace(/@import/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .trim();
  return cleaned;
}

/**
 * Sanitizes custom user CSS by stripping script injection vectors, external imports,
 * legacy script expressions, and unsafe url() targets while keeping relative /uploads/ or http(s) URLs.
 */
export function sanitizeCss(css: string | undefined | null): string {
  if (!css || typeof css !== 'string') return '';
  let out = css
    .replace(/<\/?\s*style[^>]*>/gi, '')
    .replace(/<\/?\s*script[^>]*>/gi, '')
    .replace(/@import\b[^;]*(;|$)/gi, '')
    .replace(/@charset\b[^;]*(;|$)/gi, '')
    .replace(/expression\s*\(/gi, '/* blocked */(')
    .replace(/-moz-binding\s*:/gi, '/* blocked */:')
    .replace(/behavior\s*:/gi, '/* blocked */:')
    .replace(/javascript\s*:/gi, '/* blocked */:')
    .replace(/vbscript\s*:/gi, '/* blocked */:');

  out = out.replace(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi, (_match, _quote, rawTarget: string) => {
    const target = rawTarget.trim();
    if (isSafeUrl(target, true, false)) {
      return `url("${target.replace(/"/g, '%22')}")`;
    }
    return 'none';
  });

  return out;
}

/**
 * Strictly sanitizes custom HTML card content using the browser DOMParser.
 * Strips scripts, iframes, SVGs, event handlers, and unsafe href/src URLs.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const cleanNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (STRIP_COMPLETELY_TAGS.has(tag)) {
        node.removeChild(el);
        continue;
      }

      // Recurse first so children are sanitized even if this node gets unwrapped
      cleanNode(el);

      if (!ALLOWED_HTML_TAGS.has(tag)) {
        const frag = doc.createDocumentFragment();
        while (el.firstChild) {
          frag.appendChild(el.firstChild);
        }
        node.replaceChild(frag, el);
        continue;
      }

      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (name === 'href') {
          if (!isSafeUrl(attr.value, true, true)) {
            el.removeAttribute('href');
          }
        } else if (name === 'src') {
          if (!isSafeUrl(attr.value, true, false)) {
            el.removeAttribute('src');
          }
        } else if (name === 'target') {
          const val = attr.value.trim().toLowerCase();
          if (val !== '_blank' && val !== '_self') {
            el.setAttribute('target', '_blank');
          }
        } else if (name === 'style') {
          const safeStyle = sanitizeInlineStyle(attr.value);
          if (safeStyle) {
            el.setAttribute('style', safeStyle);
          } else {
            el.removeAttribute('style');
          }
        }
      }

      if (tag === 'a') {
        el.setAttribute('rel', 'noopener noreferrer');
        if (!el.getAttribute('target')) {
          el.setAttribute('target', '_blank');
        }
      }
      if (tag === 'img' && !el.getAttribute('src')) {
        node.removeChild(el);
      }
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

