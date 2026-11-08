import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { getElementDefinition, validateDocumentStructure, emptyDocument, instantiateSpec } from '@sitebuilder/shared';
import type { SiteDocument, NodeSpec } from '@sitebuilder/shared';
import { HttpError } from './security';

export const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const nameSchema = z.string().trim().min(1).max(120);
export const passwordSchema = z.string().min(10, 'Password must have at least 10 characters').max(72, 'Password must not exceed 72 characters').refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Password must not exceed 72 bytes');
export const emailSchema = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const folderSchema = z.string().trim().max(100).regex(/^[\p{L}\p{N} _.-]*$/u).refine(v => v !== '.' && v !== '..', 'Invalid folder name');
export const slugSchema = z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(v => !['api', 'uploads', 'sites', 'admin', 'assets', 'www'].includes(v), 'Reserved slug');
const pageSlug = z.string().max(100).regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor', 'srcdoc', 'dangerouslySetInnerHTML']);
export function safeUrl(value: string, allowData = false): boolean {
  if (!value) return true;
  if (/[\u0000-\u0020\u007f\\<>"`]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value)) return false;
  if (value.startsWith('//')) return false;
  if (allowData && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value.length < 200000;
  if (value.startsWith('#')) return true;
  if (/^(?:mailto:|tel:)/i.test(value)) return !/[<>]/.test(value);
  try { const u = new URL(value, 'https://relative.invalid'); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function safeStyleValue(value: string | number): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= 100000;
  if (value.length > 1000 || /[\\;{}<>@\u0000-\u001f]|expression\s*\(|(?:java|vb)script:|behavior\s*:|-moz-binding/i.test(value)) return false;
  if (/url\s*\(/i.test(value)) {
    const matches = [...value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)];
    if (!matches.length || matches.some(m => !safeUrl(m[1], false) || /^(?:mailto:|tel:)/i.test(m[1]))) return false;
    if (/url\s*\(/i.test(value.replace(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi, ''))) return false;
  }
  return true;
}
const styles = z.record(z.string().min(1).max(80).regex(/^(?:--[a-zA-Z][a-zA-Z0-9-]*|[a-zA-Z][a-zA-Z0-9-]*)$/).refine(k => !forbiddenKeys.has(k) && !/^(?:behavior|mozBinding)$/i.test(k)), z.union([z.string(), z.number()]).refine(safeStyleValue, 'Unsafe CSS')).refine(v => Object.keys(v).length <= 100, 'Too many styles');
const responsive = z.object({ laptop: styles.optional(), tablet: styles.optional(), mobile: styles.optional() }).strict();
const animation = z.enum(['none', 'fade', 'slide', 'zoom', 'float']);
const propsSchema = z.record(z.string(), z.unknown()).transform((v, ctx) => {
  let count = 0;
  function clean(value: unknown, key = '', depth = 0): unknown {
    if (++count > 2000 || depth > 10) throw new Error('Props exceed limits');
    if (forbiddenKeys.has(key) || /^on[a-z]/i.test(key) || /^(?:script|code|javascript)$/i.test(key)) throw new Error('Unsafe property');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Invalid number'); return value; }
    if (typeof value === 'string') {
      if (value.length > 20000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Invalid property text');
      if (/(?:src|href|url|image|poster|avatar|action)$/i.test(key) && !safeUrl(value, true)) throw new Error('Unsafe URL');
      if (/^(?:html|contentHtml|richText)$/i.test(key)) return sanitizeHtml(value, { allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'span', 'h1', 'h2', 'h3', 'blockquote'], allowedAttributes: { a: ['href', 'title', 'target', 'rel'] }, allowedSchemes: ['http', 'https', 'mailto', 'tel'], allowProtocolRelative: false, transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) } });
      if (/^(?:svg|embed|iframe)$/i.test(key)) throw new Error('Raw markup is not allowed');
      return value;
    }
    if (Array.isArray(value)) { if (value.length > 200) throw new Error('Array too large'); return value.map(x => clean(x, key, depth + 1)); }
    if (value && typeof value === 'object') {
      if (Object.keys(value).length > 100) throw new Error('Too many properties');
      const result: Record<string, unknown> = {};
      for (const [k, item] of Object.entries(value)) { if (k.length > 100) throw new Error('Invalid property name'); result[k] = clean(item, k, depth + 1); }
      return result;
    }
    throw new Error('Invalid property');
  }
  try { return clean(v) as Record<string, any>; } catch (e) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: (e as Error).message }); return z.NEVER; }
});
const nodeSchema = z.object({ id: idSchema, type: z.string().max(80), name: z.string().max(120), props: propsSchema, children: z.array(idSchema).max(500), styles, responsive, hover: styles, hidden: z.object({ desktop: z.boolean().optional(), laptop: z.boolean().optional(), tablet: z.boolean().optional(), mobile: z.boolean().optional() }).strict(), animation: animation.optional(), locked: z.boolean().optional() }).strict();
export const documentSchema = z.object({ version: z.literal(1), language: z.enum(['pl', 'en']), pages: z.array(z.object({ id: idSchema, name: nameSchema, slug: pageSlug, rootIds: z.array(idSchema).max(500), seo: z.object({ title: z.string().max(200), description: z.string().max(1000), keywords: z.string().max(1000), ogImage: z.string().max(2000).refine(v => safeUrl(v), 'Unsafe image URL'), noindex: z.boolean() }).strict() }).strict()).min(1).max(50), nodes: z.record(idSchema, nodeSchema), theme: z.object({ name: nameSchema, colors: z.object({ background: z.string(), surface: z.string(), text: z.string(), muted: z.string(), primary: z.string(), secondary: z.string(), border: z.string() }).strict().refine(colors => Object.values(colors).every(c => c.length < 100 && safeStyleValue(c) && !/url\s*\(/i.test(c)), 'Unsafe theme colors'), fontFamily: z.string().max(120).regex(/^[a-zA-Z0-9 ,'-]+$/), headingFont: z.string().max(120).regex(/^[a-zA-Z0-9 ,'-]+$/), radius: z.number().min(0).max(200) }).strict() }).strict().superRefine((doc, ctx) => {
  if (Buffer.byteLength(JSON.stringify(doc)) > 4 * 1024 * 1024) ctx.addIssue({ code: 'custom', message: 'Document too large' });
  const structural = validateDocumentStructure(doc as SiteDocument);
  if (structural) ctx.addIssue({ code: 'custom', message: structural });
  if (new Set(doc.pages.map(p => p.slug)).size !== doc.pages.length || new Set(doc.pages.map(p => p.id)).size !== doc.pages.length) ctx.addIssue({ code: 'custom', message: 'Page slugs and ids must be unique' });
  for (const n of Object.values(doc.nodes)) {
    const def = getElementDefinition(n.type);
    if (!def || def.type !== n.type) ctx.addIssue({ code: 'custom', message: `Unknown element type: ${n.type}` });
    else if (!def.allowsChildren && n.children.length) ctx.addIssue({ code: 'custom', message: `${n.type} cannot contain children` });
  }
});
export function parseDocument(value: unknown): SiteDocument { return documentSchema.parse(value) as SiteDocument; }
export const specSchema: z.ZodType<NodeSpec> = z.lazy(() => z.object({ type: z.string().max(80), name: z.string().max(120).optional(), props: propsSchema.optional(), styles: styles.optional(), responsive: responsive.optional(), hover: styles.optional(), animation: animation.optional(), children: z.array(specSchema).max(200).optional() }).strict());
export function parseSpec(value: unknown): NodeSpec {
  if (Buffer.byteLength(JSON.stringify(value)) > 1000000) throw new HttpError(400, 'Component too large');
  // Bound nesting before recursive Zod parsing to prevent stack exhaustion.
  const check = (v: any, depth: number): void => { if (depth > 35) throw new HttpError(400, 'Component too deeply nested'); if (Array.isArray(v?.children)) v.children.forEach((c: unknown) => check(c, depth + 1)); };
  check(value, 0);
  const spec = specSchema.parse(value); const doc = emptyDocument(); doc.pages[0].rootIds = [instantiateSpec(spec, doc.nodes)]; parseDocument(doc); return spec;
}
const settingsValue = z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]);
const settingsInput = z.custom<Record<string, unknown>>(v => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length <= 50 && !Object.keys(v).some(k => forbiddenKeys.has(k)), 'Invalid settings');
export const settingsSchema = settingsInput.pipe(z.record(z.string().min(1).max(100), settingsValue));
