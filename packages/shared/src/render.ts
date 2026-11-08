import type { SiteDocument, SiteNode, VNode } from './types';
import { getElementDefinition } from './elements';
import { assetURL, escapeHTML, safeJSON, safeToken, safeURL, sanitizeRichText } from './safety';
import { buildCSS } from './styles';
import { SITE_RUNTIME } from './runtime';

export interface RenderOptions { assetBase?: string; formEndpoint?: string; analyticsEndpoint?: string; siteName?: string; includeRuntime?: boolean; exportMode?: boolean }
const slot = (): { slot: true } => ({ slot: true });
const text = (tag: string, value: unknown, attrs?: VNode['attrs']): VNode => ({ tag, text: String(value ?? ''), attrs });
const element = (tag: string, children: VNode['children'] = [], attrs?: VNode['attrs']): VNode => ({ tag, children, attrs });
const arr = (value: unknown): any[] => Array.isArray(value) ? value.slice(0, 200) : [];
const number = (value: unknown, fallback: number, min = 0, max = 1000000): number => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
function money(value: unknown, currency: unknown, language = 'en'): string {
  const code = /^[A-Z]{3}$/.test(String(currency)) ? String(currency) : 'USD';
  try { return new Intl.NumberFormat(language, { style: 'currency', currency: code }).format(number(value, 0)); } catch { return `${code} ${number(value, 0).toFixed(2)}`; }
}
function anchor(label: unknown, href: unknown, attrs: VNode['attrs'] = {}): VNode { return text('a', label, { href: safeURL(href, '#'), ...attrs }); }
function field(name: string, label: string, kind = 'text', required = true, id = name): VNode {
  return element('label', [text('span', label), { tag: 'input', attrs: { id, name, type: kind, required, autocomplete: kind === 'email' ? 'email' : 'off' } }], { class: 'sb-field' });
}
const paths: Record<string, string> = {
  sparkles: 'M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z',
  check: 'M5 12l4 4L19 6', arrow: 'M4 12h16M13 5l7 7-7 7', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  bolt: 'M13 2L3 14h8l-1 8L21 10h-8z', shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z',
  globe: 'M3 12h18M12 3c-6 6-6 12 0 18M12 3c6 6 6 12 0 18M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  code: 'M8 5l-7 7 7 7M16 5l7 7-7 7M14 3l-4 18', orbit: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M2 8c4-6 20 2 20 8S6 14 2 8',
};

export function renderElement(node: SiteNode, context: { editing?: boolean; language?: string } = {}): VNode {
  const p = { ...getElementDefinition(node.type)?.defaultProps, ...node.props };
  const editing = !!context.editing;
  const language = context.language || 'en';
  const hasChildren = node.children.length > 0;
  const base: NonNullable<VNode['attrs']> = { class: `sb-node sb-${safeToken(node.type)}`, id: `node-${node.id}`, 'data-node-id': node.id };
  if (editing) base['data-sb-editing'] = 'true';
  if (!editing && node.animation && node.animation !== 'none') base['data-sb-animation'] = node.animation;
  if (p.anchor && /^[a-zA-Z][\w-]*$/.test(p.anchor)) base['data-sb-anchor'] = p.anchor;
  const root = (tag: string, children: VNode['children'] = [slot()], attrs: VNode['attrs'] = {}, value?: unknown): VNode => ({ tag, attrs: { ...attrs, ...base }, ...(value !== undefined ? { text: String(value) } : {}), children });
  const image = (src: unknown, alt: unknown = '', attrs: VNode['attrs'] = {}): VNode => ({ tag: 'img', attrs: { src: safeURL(src), alt: String(alt ?? ''), loading: 'lazy', ...attrs } });
  const links = (items: unknown): VNode[] => arr(items).map(item => anchor(typeof item === 'string' ? item : item.label ?? item.text, typeof item === 'string' ? '#' : item.href));
  switch (node.type) {
    case 'heading': return root(`h${number(p.level, 2, 1, 6) | 0}`, [slot()], {}, p.text);
    case 'paragraph': return root('p', [slot()], {}, p.text);
    case 'text': case 'caption': return root('span', [slot()], {}, p.text);
    case 'label': return root('label', [slot()], { for: p.for ? String(p.for) : undefined }, p.text);
    case 'badge': return root('span', [slot()], {}, p.text);
    case 'richText': return { ...root('div'), html: sanitizeRichText(p.html ?? p.text) };
    case 'quote': return root('blockquote', [text('p', p.text), ...(p.author ? [text('cite', p.author)] : []), slot()]);
    case 'link': return root('a', [slot()], { href: safeURL(p.href, '#'), target: p.target === '_blank' ? '_blank' : '_self', rel: 'noopener noreferrer' }, hasChildren ? undefined : p.text);
    case 'list': case 'numberedList': return root(node.type === 'list' ? 'ul' : 'ol', hasChildren ? [slot()] : [...arr(p.items).map(item => text('li', typeof item === 'string' ? item : item.text)), slot()]);
    case 'listItem': return root('li', [slot()], {}, p.text);
    case 'image': case 'avatar': return root('figure', [image(p.src, p.alt, { loading: p.loading === 'eager' ? 'eager' : 'lazy', width: p.width ? number(p.width, 800) : undefined, height: p.height ? number(p.height, 600) : undefined }), slot()]);
    case 'logo': return root('a', [...(p.src ? [image(p.src, p.alt || p.text)] : [text('span', p.text)]), slot()], { href: safeURL(p.href, '#') });
    case 'icon': case 'svg': {
      // User-supplied SVG/XML is never inserted. Only bundled paths are rendered.
      const path = paths[p.icon] || paths.sparkles;
      return root('span', [element('svg', [{ tag: 'path', attrs: { d: path } }], { xmlns: 'http://www.w3.org/2000/svg', width: number(p.size, 28, 8, 512), height: number(p.size, 28, 8, 512), viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }), slot()], { role: p.label ? 'img' : undefined, 'aria-label': p.label ? String(p.label) : undefined });
    }
    case 'gallery': case 'productGallery': return root('div', hasChildren ? [slot()] : [...arr(p.images).map((item, index) => element('a', [image(typeof item === 'string' ? item : item.src, typeof item === 'string' ? `Gallery image ${index + 1}` : item.alt)], { href: safeURL(typeof item === 'string' ? item : item.src), 'data-sb-lightbox': 'true' })), slot()], { 'data-sb-gallery': 'true' });
    case 'video': return root('div', [{ tag: 'video', attrs: { src: safeURL(p.src), poster: safeURL(p.poster), controls: p.controls !== false, muted: p.muted !== false, autoplay: !!p.autoplay && p.muted !== false, loop: !!p.loop, playsinline: true, preload: 'metadata' } }, slot()]);
    case 'backgroundImage': return root('section');
    case 'section': return root('section', [slot()], { 'aria-label': p.label ? String(p.label) : undefined });
    case 'container': case 'grid': case 'flex': case 'columns': case 'row': case 'card': case 'stack': case 'wrapper': case 'sticky': case 'productGrid': return root('div');
    case 'spacer': case 'divider': return root('div', [slot()], { 'aria-hidden': 'true', role: node.type === 'divider' ? 'separator' : undefined });
    case 'button': {
      const action = p.action || 'link';
      const attrs: VNode['attrs'] = action === 'link' ? { href: safeURL(p.href, '#'), target: p.target === '_blank' ? '_blank' : undefined, rel: p.target === '_blank' ? 'noopener noreferrer' : undefined } : { type: action === 'submit' ? 'submit' : 'button', 'data-sb-open-modal': action === 'modal' ? String(p.modalId || p.targetId || '') : undefined, 'data-sb-open-cart': action === 'cart' ? 'true' : undefined };
      return root(action === 'link' ? 'a' : 'button', [slot()], attrs, hasChildren ? undefined : p.text);
    }
    case 'navbar': return root('nav', [text('button', language === 'pl' ? 'Menu' : 'Menu', { type: 'button', class: 'sb-menu-toggle', 'aria-label': 'Toggle navigation', 'aria-expanded': 'false', 'aria-controls': `nav-${node.id}`, 'data-sb-menu': 'true' }), element('div', hasChildren ? [slot()] : [anchor(p.brand, '#', { class: 'sb-logo' }), ...links(p.links), slot()], { class: 'sb-nav-links', id: `nav-${node.id}` })], { 'aria-label': language === 'pl' ? 'Nawigacja główna' : 'Main navigation', 'data-sb-navbar': 'true' });
    case 'dropdown': return root('details', [text('summary', p.text), element('div', hasChildren ? [slot()] : [...links(p.items), slot()], { class: 'sb-dropdown-menu' })]);
    case 'accordion': return root('details', [text('summary', p.title), element('div', hasChildren ? [slot()] : [text('p', p.text), slot()], { class: 'sb-accordion-body' })], { open: editing || !!p.open });
    case 'tabs': return root('div', [element('div', hasChildren ? [] : arr(p.tabs).map((tab, index) => text('button', tab.label, { type: 'button', role: 'tab', class: 'sb-tab-button', 'aria-selected': index === 0 ? 'true' : 'false', 'data-sb-tab-index': index })), { role: 'tablist', class: 'sb-tab-list' }), element('div', hasChildren ? [slot()] : [...arr(p.tabs).map((tab, index) => text('div', tab.content, { role: 'tabpanel', class: `sb-tabPanel${index === 0 ? ' sb-tab-active' : ''}`, 'data-sb-tab-label': tab.label })), slot()], { class: 'sb-tab-panels' })], { 'data-sb-tabs': 'true' });
    case 'tabPanel': return root('div', [slot()], { role: 'tabpanel', 'data-sb-tab-label': String(p.label || 'Tab') });
    case 'slider': case 'carousel': return root('div', [element('div', [slot()], { class: 'sb-slide-track', 'aria-live': 'polite' }), element('div', [text('button', '←', { type: 'button', class: 'sb-slide-control', 'data-sb-slide': '-1', 'aria-label': 'Previous slide' }), text('button', '→', { type: 'button', class: 'sb-slide-control', 'data-sb-slide': '1', 'aria-label': 'Next slide' })], { class: 'sb-slide-controls' })], { 'data-sb-slider': 'true', 'data-sb-autoplay': p.autoplay ? 'true' : 'false', 'data-sb-interval': number(p.interval, 5000, 2000, 60000), 'aria-roledescription': 'carousel' });
    case 'modal': return root(editing ? 'div' : 'dialog', [text('button', '×', { type: 'button', class: 'sb-dialog-close', 'data-sb-close-modal': 'true', 'aria-label': 'Close dialog' }), ...(hasChildren ? [] : [text('h2', p.title)]), slot()], { 'data-sb-modal': 'true', 'aria-label': String(p.title || 'Dialog') });
    case 'popup': return root('aside', [text('button', '×', { type: 'button', class: 'sb-dialog-close', 'data-sb-close-popup': 'true', 'aria-label': 'Close popup' }), ...(hasChildren ? [] : [text('h2', p.title)]), slot()], { hidden: !editing, 'data-sb-popup': 'true', 'data-sb-delay': number(p.delay, 10000, 500, 300000), 'data-sb-once': p.once ? 'true' : 'false', 'aria-label': String(p.title || 'Announcement') });
    case 'tooltip': return root('span', [text('span', p.text, { tabindex: 0, 'aria-describedby': `tip-${node.id}` }), text('span', p.tip, { role: 'tooltip', id: `tip-${node.id}`, class: 'sb-tooltip-content' }), slot()]);
    case 'search': return root('form', [{ tag: 'input', attrs: { type: 'search', name: 'q', placeholder: String(p.placeholder), 'aria-label': String(p.placeholder), required: true } }, text('button', p.buttonText, { type: 'submit' }), element('div', [], { class: 'sb-search-results', 'aria-live': 'polite' }), slot()], { role: 'search', 'data-sb-search': 'true' });
    case 'contactForm': case 'newsletterForm': case 'loginForm': {
      const login = node.type === 'loginForm';
      const defaults: VNode[] = node.type === 'contactForm' ? [field('name', language === 'pl' ? 'Imię' : 'Your name', 'text', true, `${node.id}-name`)] : [];
      defaults.push(field('email', language === 'pl' ? 'Adres e-mail' : 'Email address', 'email', true, `${node.id}-email`));
      if (node.type === 'contactForm') defaults.push(element('label', [text('span', language === 'pl' ? 'Wiadomość' : 'Message'), { tag: 'textarea', attrs: { name: 'message', rows: 5, required: true } }], { class: 'sb-field' }));
      if (login) defaults.push(field('password', 'Demo password (do not use a real password)', 'password', false, `${node.id}-password`));
      defaults.push(text('button', p.buttonText, { type: 'submit', class: 'sb-form-submit' }));
      return root('form', [...(hasChildren ? [] : defaults), slot(), ...(login ? [text('p', p.notice, { class: 'sb-form-notice' })] : []), text('output', '', { class: 'sb-form-status', 'aria-live': 'polite' })], { method: 'post', 'data-sb-form': String(p.formName || node.type), 'data-sb-form-kind': login ? 'login' : 'submission' });
    }
    case 'input': return root('div', [element('label', [text('span', p.label), { tag: 'input', attrs: { id: `field-${node.id}`, name: safeToken(p.name || 'field'), type: ['text', 'email', 'tel', 'url', 'number', 'date', 'password'].includes(p.inputType) ? p.inputType : 'text', placeholder: String(p.placeholder || ''), required: !!p.required, autocomplete: p.inputType === 'email' ? 'email' : p.inputType === 'password' ? 'off' : undefined, min: p.min !== undefined ? number(p.min, 0) : undefined, max: p.max !== undefined ? number(p.max, 1000000) : undefined } }], { class: 'sb-field' }), slot()]);
    case 'textarea': return root('div', [element('label', [text('span', p.label), { tag: 'textarea', attrs: { name: safeToken(p.name || 'message'), rows: number(p.rows, 5, 2, 30), placeholder: String(p.placeholder || ''), required: !!p.required } }], { class: 'sb-field' }), slot()]);
    case 'select': return root('div', [element('label', [text('span', p.label), element('select', arr(p.options).map(option => text('option', typeof option === 'string' ? option : option.label, { value: String(typeof option === 'string' ? option : option.value) })), { name: safeToken(p.name || 'option'), required: !!p.required })], { class: 'sb-field' }), slot()]);
    case 'checkbox': return root('div', [element('label', [{ tag: 'input', attrs: { type: 'checkbox', name: safeToken(p.name || 'consent'), required: !!p.required, value: 'yes' } }, text('span', p.label)]), slot()]);
    case 'productCard': return root('article', hasChildren ? [slot()] : [image(p.src, p.name), text('h3', p.name, { class: 'sb-product-name' }), text('p', money(p.price, p.currency, language), { class: 'sb-product-price' }), text('button', language === 'pl' ? 'Dodaj do koszyka' : 'Add to bag', cartAttrs(p)), slot()], { 'data-sb-product': String(p.productId || node.id) });
    case 'price': return root('div', [text('span', money(p.amount, p.currency, language)), ...(p.suffix ? [text('small', p.suffix)] : []), slot()]);
    case 'cartButton': return root('button', [slot()], cartAttrs(p), p.text);
    case 'categoryList': case 'socialLinks': return root('nav', hasChildren ? [slot()] : [...links(p.items ?? p.links), slot()], { 'aria-label': node.type === 'socialLinks' ? 'Social links' : 'Product categories' });
    case 'productDetails': return root('article', hasChildren ? [slot()] : [text('h2', p.title), text('p', p.description), slot()]);
    case 'checkout': return root('section', [text('h2', p.title), element('div', [], { class: 'sb-cart-items', 'aria-live': 'polite' }), text('div', '', { class: 'sb-cart-total' }), text('p', p.notice, { class: 'sb-form-notice' }), element('form', [field('name', 'Name'), field('email', 'Email address', 'email'), text('button', p.buttonText, { type: 'submit', class: 'sb-form-submit' }), text('output', '', { class: 'sb-form-status', 'aria-live': 'polite' })], { class: 'sb-checkout-form', 'data-sb-form': 'Order request', 'data-sb-form-kind': 'order', method: 'post' }), slot()], { 'data-sb-checkout': 'true' });
    case 'stat': return root('div', [text('span', p.value, { class: 'sb-stat-value' }), text('span', p.label, { class: 'sb-stat-label' }), slot()]);
    case 'rating': return root('span', [slot()], { role: 'img', 'aria-label': String(p.label || `${p.value} out of ${p.max}`) }, '★'.repeat(number(p.value, 5, 0, 10) | 0) + '☆'.repeat(Math.max(0, (number(p.max, 5, 0, 10) | 0) - (number(p.value, 5, 0, 10) | 0))));
    case 'map': return root('address', [text('p', p.address), anchor(p.text, p.href, { target: '_blank', rel: 'noopener noreferrer' }), slot()]);
    case 'progress': return root('div', [text('label', p.label, { for: `progress-${node.id}` }), { tag: 'progress', attrs: { id: `progress-${node.id}`, value: number(p.value, 75), max: number(p.max, 100, 1) } }, slot()]);
    case 'countdown': return root('div', [text('span', p.label), text('span', p.date, { class: 'sb-countdown-value', 'aria-live': 'off' }), slot()], { 'data-sb-countdown': String(p.date || '') });
    default: return root('div', [slot()], {}, !hasChildren && p.text ? p.text : undefined);
  }
}
function cartAttrs(p: Record<string, any>): VNode['attrs'] {
  return { type: 'button', 'data-sb-cart-add': String(p.productId || 'product'), 'data-sb-product-name': String(p.productName || p.name || 'Product'), 'data-sb-price': number(p.price, 0), 'data-sb-currency': /^[A-Z]{3}$/.test(p.currency) ? p.currency : 'USD', class: 'sb-cartButton' };
}

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
function serialize(vnode: VNode, childHTML: string, options: RenderOptions): string {
  const tag = /^[a-z][a-z0-9-]*$/.test(vnode.tag) && !['script', 'style', 'iframe', 'object', 'embed'].includes(vnode.tag) ? vnode.tag : 'div';
  const attrs = Object.entries(vnode.attrs || {}).flatMap(([key, value]) => {
    if (value === undefined || value === false || !/^[a-zA-Z][\w:-]*$/.test(key) || /^on/i.test(key) || key === 'style' || key === 'srcdoc') return [];
    if (['href', 'src', 'poster', 'action'].includes(key)) value = ['src', 'poster', 'href'].includes(key) ? assetURL(value, options.assetBase) : safeURL(value);
    if (value === true) return [key];
    return [`${key}="${escapeHTML(value)}"`];
  }).join(' ');
  const opening = `<${tag}${attrs ? ' ' + attrs : ''}>`;
  if (voidTags.has(tag)) return opening;
  return opening + (vnode.text !== undefined ? escapeHTML(vnode.text) : '') + (vnode.html || '') + (vnode.children || []).map(child => 'slot' in child ? childHTML : serialize(child, childHTML, options)).join('') + `</${tag}>`;
}
export function renderNodeHTML(doc: SiteDocument, id: string, options: RenderOptions = {}): string {
  const active = new Set<string>();
  const visit = (key: string, depth: number): string => {
    const node = doc.nodes[key]; if (!node || active.has(key) || depth > 40) return '';
    active.add(key);
    const children = node.children.map(child => visit(child, depth + 1)).join('');
    const vnode = renderElement(node, { language: doc.language });
    const html = serialize(vnode, children, options); active.delete(key); return html;
  };
  return visit(id, 0);
}
export function renderPageHTML(doc: SiteDocument, pageId: string, options: RenderOptions = {}): string {
  const page = doc.pages.find(item => item.id === pageId);
  if (!page) throw new Error(`Page not found: ${pageId}`);
  const title = page.seo.title || page.name || options.siteName || 'Website';
  const config = { formEndpoint: safeURL(options.formEndpoint), analyticsEndpoint: safeURL(options.analyticsEndpoint), siteName: options.siteName || title, pageId: page.id, pageSlug: page.slug, language: doc.language, exportMode: !!options.exportMode };
  const image = assetURL(page.seo.ogImage, options.assetBase);
  const families = [...new Set([doc.theme.fontFamily, doc.theme.headingFont].map(font => font.split(',')[0].trim()).filter(font => font && !/^(arial|georgia|system-ui|monospace|sans-serif|serif)$/i.test(font)))];
  const fonts = options.exportMode || !families.length ? '' : `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families.map(font => `family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap">`;
  const runtime = options.includeRuntime === false ? '' : `<script id="sb-runtime-config" type="application/json">${safeJSON(config)}</script><script>${SITE_RUNTIME}</script>`;
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title><meta name="description" content="${escapeHTML(page.seo.description)}"><meta name="keywords" content="${escapeHTML(page.seo.keywords)}"><meta name="robots" content="${page.seo.noindex ? 'noindex,nofollow' : 'index,follow'}"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(page.seo.description)}"><meta property="og:type" content="website">${image ? `<meta property="og:image" content="${escapeHTML(image)}">` : ''}${fonts}<style>${buildCSS(doc, 'media', options.assetBase)}</style>`;
  const nodes = page.rootIds.map(id => renderNodeHTML(doc, id, options)).join('');
  return `<!doctype html><html lang="${doc.language === 'pl' ? 'pl' : 'en'}"><head>${head}</head><body><main class="sb-page" id="sb-page">${nodes}</main>${runtime}</body></html>`;
}
