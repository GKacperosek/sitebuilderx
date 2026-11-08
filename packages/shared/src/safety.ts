import type { StyleMap } from './types';

export function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function safeURL(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f<>"'`\\]/.test(url) || url.startsWith('//')) return fallback;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    try { const parsed = new URL(url); return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? url : fallback; } catch { return fallback; }
  }
  if (/^[^/?#]*:/.test(url) || /%0[ad]/i.test(url)) return fallback;
  return url;
}
export function assetURL(value: unknown, assetBase?: string): string {
  const url = safeURL(value);
  if (!url.startsWith('/uploads/') || !assetBase) return url;
  const base = safeURL(assetBase).replace(/\/$/, '');
  return base ? safeURL(base + url) : url;
}
export function safeToken(value: unknown): string { return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '_'); }
export function safeJSON(value: unknown): string { return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')); }

// Deliberately narrow, deterministic, DOM-independent rich-text subset. Attributes
// other than checked anchor href/title are discarded; active content is removed.
export function sanitizeRichText(value: unknown): string {
  let source = String(value ?? '').slice(0, 100000);
  source = source.replace(/<(script|style|iframe|object|embed|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const allowed = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'h2', 'h3', 'h4', 'span']);
  const stack: string[] = [];
  const result = source.split(/(<[^>]*>)/g).map(part => {
    if (!part.startsWith('<')) return escapeHTML(part.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity]!));
    const match = /^<(\/?)\s*([a-z0-9]+)\b[^>]*>$/i.exec(part);
    if (!match || !allowed.has(match[2].toLowerCase())) return '';
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.lastIndexOf(tag); if (index < 0) return '';
      return stack.splice(index).reverse().map(t => `</${t}>`).join('');
    }
    if (tag === 'br') return '<br>';
    stack.push(tag);
    if (tag !== 'a') return `<${tag}>`;
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(part);
    const decoded = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_, hex, dec) => String.fromCodePoint(Math.min(0x10ffff, parseInt(hex || dec, hex ? 16 : 10)))).replace(/&colon;/gi, ':').replace(/&tab;|&newline;/gi, '\n').replace(/&amp;/gi, '&');
    return `<a href="${escapeHTML(safeURL(decoded, '#'))}" rel="noopener noreferrer">`;
  }).join('');
  return result + stack.reverse().map(tag => `</${tag}>`).join('');
}

const unitless = new Set(['opacity', 'z-index', 'font-weight', 'line-height', 'flex', 'flex-grow', 'flex-shrink', 'order', 'grid-column', 'grid-row', 'aspect-ratio', 'scale', 'animation-iteration-count']);
export function cssProperty(key: string): string {
  if (/^--[a-zA-Z0-9_-]+$/.test(key)) return key;
  return key.replace(/[A-Z]/g, match => '-' + match.toLowerCase());
}
export function cssValue(key: string, value: unknown, assetBase?: string): string {
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}${value === 0 || unitless.has(cssProperty(key)) || key.startsWith('--') ? '' : 'px'}` : '';
  if (typeof value !== 'string' || value.length > 2000) return '';
  let text = value.trim();
  if (!text || /[;{}<>\\\u0000-\u001f]|\/\*|\*\/|@|expression\s*\(|(?:javascript|vbscript|data)\s*:|!\s*important|(?:image-set|attr)\s*\(/i.test(text)) return '';
  let valid = true;
  text = text.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, quoted, single, bare) => {
    const url = assetURL((quoted ?? single ?? bare ?? '').trim(), assetBase);
    if (!url || !/^(https?:\/\/|\/|\.\/|\.\.\/|[a-zA-Z0-9_-])/i.test(url)) { valid = false; return ''; }
    return `url("${url}")`;
  });
  if (!valid || /url\s*\(/i.test(text.replace(/url\("[^"]*"\)/gi, ''))) return '';
  // Prevent malformed strings and parentheses from escaping a declaration.
  const stripped = text.replace(/"[^"\n]*"|'[^'\n]*'/g, '');
  if (/["']/.test(stripped)) return '';
  let depth = 0;
  for (const char of stripped) { if (char === '(') depth++; if (char === ')' && --depth < 0) return ''; }
  return depth === 0 ? text : '';
}
export function styleDeclarations(styles: StyleMap | undefined, assetBase?: string): string {
  return Object.entries(styles || {}).flatMap(([key, value]) => {
    const property = cssProperty(key);
    if (!/^(?:--)?[a-z][a-z0-9-]*$/.test(property) || /^(?:behavior|-moz-binding|content)$/.test(property)) return [];
    const safe = cssValue(key, value, assetBase);
    return safe ? [`${property}:${safe}`] : [];
  }).join(';');
}
