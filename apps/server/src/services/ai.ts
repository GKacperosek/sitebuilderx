import { z } from 'zod';
import { DEFAULT_THEME, ELEMENTS, PHOTO, emptyDocument, emptyPage, instantiateSpec } from '@sitebuilder/shared';
import type { NodeSpec, SiteDocument, SiteTheme } from '@sitebuilder/shared';
import { config } from '../config';
import { HttpError } from '../security';
import { parseDocument, parseSpec } from '../validation';

const catalog = ELEMENTS.map(def => `${def.type}${def.allowsChildren ? '+' : ''}:{${Object.keys(def.defaultProps).slice(0, 12).join(',')}}`).join(' ');
const images = Object.values(PHOTO).slice(0, 8).join(' ');
const baseSystem = `You are the layout engine inside SITEBUILDER X ULTRA. Return only valid JSON, no markdown. Build premium, content-rich, responsive websites using this exact element catalog (type+ means it accepts children): ${catalog}. Rules: every node is {type,name?,props?,styles?,responsive?,hover?,animation?,children?}; styles use camelCase CSS properties and string/number values; use var(--sb-bg), var(--sb-surface), var(--sb-text), var(--sb-muted), var(--sb-primary), var(--sb-secondary), var(--sb-border), var(--sb-radius); responsive has laptop/tablet/mobile style overrides; never invent element types, scripts, event handlers, iframes or raw SVG markup; only leaf elements may omit children; write real persuasive copy in the requested language; use these known-good image URLs when images are needed: ${images}. Prefer section > container > stack/grid/row > card structures, generous spacing, strong typographic hierarchy and distinctive color.`;

function assertConfigured() {
  if (!config.geminiKey) throw new HttpError(503, 'Gemini is not configured. Set GEMINI_API_KEY on the server.', 'AI_UNAVAILABLE');
  if (!/^[a-zA-Z0-9._-]+$/.test(config.geminiModel)) throw new HttpError(503, 'Invalid GEMINI_MODEL configuration', 'AI_UNAVAILABLE');
}

async function gemini(system: string, prompt: string, temperature = 0.8, maxOutputTokens = 16384): Promise<string> {
  assertConfigured();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
  const base = { temperature, maxOutputTokens, responseMimeType: 'application/json' };
  const send = (generationConfig: object) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey }, signal: AbortSignal.timeout(240000),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
  });
  const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2 && !response; attempt++) {
    try {
      let result = await send({ ...base, thinkingConfig: { thinkingBudget: 0 } });
      if (result.status === 400) result = await send(base);
      if (result.status === 503 && attempt === 0) { await pause(1500); continue; }
      response = result;
    } catch {
      if (attempt === 0) { await pause(800); continue; }
      throw new HttpError(502, 'Could not reach the Gemini API', 'AI_UPSTREAM');
    }
  }
  if (!response!.ok) {
    if (response!.status === 429) throw new HttpError(429, 'Gemini rate limit reached. Try again shortly.', 'AI_RATE_LIMITED');
    if (response!.status === 401 || response!.status === 403) throw new HttpError(503, 'Gemini rejected the server API key', 'AI_UNAVAILABLE');
    throw new HttpError(502, `Gemini request failed (${response!.status})`, 'AI_UPSTREAM');
  }
  const data = await response!.json() as any;
  if (data.promptFeedback?.blockReason) throw new HttpError(422, 'Gemini blocked this prompt', 'AI_BLOCKED');
  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new HttpError(502, 'Gemini response was truncated. Try a simpler request.', 'AI_TRUNCATED');
  const text = (data.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('').trim();
  if (!text) throw new HttpError(502, 'Gemini returned an empty response', 'AI_UPSTREAM');
  return text;
}

function jsonFrom(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{');
    if (start > 0) { try { return JSON.parse(cleaned.slice(start)); } catch { /* fall through */ } }
    throw new HttpError(502, 'Gemini returned invalid JSON', 'AI_INVALID_OUTPUT');
  }
}
const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'page';
const themeSchema = z.object({ name: z.string().max(120).optional(), colors: z.object({ background: z.string(), surface: z.string(), text: z.string(), muted: z.string(), primary: z.string(), secondary: z.string(), border: z.string() }).partial().optional(), fontFamily: z.string().max(120).optional(), headingFont: z.string().max(120).optional(), radius: z.number().min(0).max(100).optional() });
function mergeTheme(base: SiteTheme, value: unknown): SiteTheme {
  const patch = themeSchema.parse(value ?? {});
  return { ...base, ...patch, colors: { ...base.colors, ...patch.colors } };
}
async function corrected(system: string, prompt: string, build: (data: any) => any, temperature = 0.8, maxOutputTokens = 16384) {
  let first: any;
  try { first = jsonFrom(await gemini(system, prompt, temperature, maxOutputTokens)); } catch (error) {
    if (error instanceof HttpError && error.code === 'AI_INVALID_OUTPUT') {
      first = jsonFrom(await gemini(system, `${prompt}\n\nReturn only one valid JSON object, no markdown, no commentary.`, Math.min(temperature, 0.4), maxOutputTokens));
    } else throw error;
  }
  try { return build(first); } catch (error) {
    const second = jsonFrom(await gemini(system, `${prompt}\n\nYour previous JSON was invalid: ${(error as Error).message.slice(0, 400)}. Return corrected JSON only.`, Math.min(temperature, 0.4), maxOutputTokens));
    return build(second);
  }
}

export async function generateSite(prompt: string, language: 'pl' | 'en'): Promise<{ document: SiteDocument }> {
  const system = `${baseSystem} For a whole website return {"theme":{name,colors:{background,surface,text,muted,primary,secondary,border},fontFamily,headingFont,radius},"pages":[{name,slug,seo:{title,description,keywords},sections:[NodeSpec]}]}. The first page slug must be "". Create 1-3 pages, each with 4-6 substantial sections (navbar, hero, content sections, footer). Keep copy concise but real. All copy in ${language === 'pl' ? 'Polish' : 'English'}.`;
  return corrected(system, prompt, data => {
    const parsed = z.object({ theme: z.unknown().optional(), pages: z.array(z.object({ name: z.string().min(1).max(120), slug: z.string().max(100).optional(), seo: z.object({ title: z.string().max(200).optional(), description: z.string().max(1000).optional(), keywords: z.string().max(1000).optional() }).partial().optional(), sections: z.array(z.unknown()).min(1).max(12) }).strict()).min(1).max(4) }).parse(data);
    const doc = emptyDocument(language); doc.theme = mergeTheme(DEFAULT_THEME, parsed.theme);
    const used = new Set<string>();
    parsed.pages.forEach((page, index) => {
      const slug = index === 0 ? '' : slugify(page.slug || page.name);
      const unique = used.has(slug) ? `${slug}-${index + 1}` : slug; used.add(unique);
      const target = index === 0 ? doc.pages[0] : emptyPage(page.name, unique);
      if (index === 0) { target.name = page.name; target.slug = ''; } else doc.pages.push(target);
      target.seo = { title: page.seo?.title || page.name, description: page.seo?.description || '', keywords: page.seo?.keywords || '', ogImage: '', noindex: false };
      for (const section of page.sections) target.rootIds.push(instantiateSpec(parseSpec(section), doc.nodes));
    });
    return { document: parseDocument(doc) };
  }, 0.8, 24576);
}
export async function generateSection(prompt: string, language: 'pl' | 'en'): Promise<{ spec: NodeSpec }> {
  const system = `${baseSystem} Return {"spec":NodeSpec} containing one complete, production-quality section. All copy in ${language === 'pl' ? 'Polish' : 'English'}.`;
  return corrected(system, prompt, data => ({ spec: parseSpec(data.spec ?? data) }));
}
export async function improveDesign(prompt: string, document: SiteDocument): Promise<{ document: SiteDocument }> {
  const system = `${baseSystem} Improve the visual design of the supplied website. Return {"theme":{name,colors:{background,surface,text,muted,primary,secondary,border},fontFamily,headingFont,radius}} only. Keep text readable (WCAG AA), keep the site's subject, and make the palette distinctive.`;
  const context = JSON.stringify({ language: document.language, theme: document.theme, pages: document.pages.map(page => ({ name: page.name, sections: page.rootIds.map(id => document.nodes[id]?.type) })) });
  return corrected(system, `Request: ${prompt}\nCurrent site: ${context}`, data => {
    const next = structuredClone(document); next.theme = mergeTheme(document.theme, data.theme ?? data); return { document: parseDocument(next) };
  }, 0.7);
}
export async function generateText(prompt: string, text: string, action: 'generate' | 'improve' | 'seo', language: 'pl' | 'en'): Promise<{ text: string }> {
  const system = action === 'seo'
    ? `You are an SEO copywriter. Return {"text":string} containing one compelling meta description (140-160 characters) in ${language === 'pl' ? 'Polish' : 'English'}. No markdown.`
    : `You are a website copywriter. Return {"text":string} in ${language === 'pl' ? 'Polish' : 'English'}. ${action === 'improve' ? 'Improve the supplied copy while preserving its meaning and length.' : 'Write fresh, specific, persuasive copy for the request.'} No markdown, no explanations.`;
  const data = jsonFrom(await gemini(system, `Request: ${prompt}\nExisting copy: ${text.slice(0, 8000)}`, 0.75));
  const parsed = z.object({ text: z.string().min(1).max(5000) }).parse(data);
  return { text: parsed.text };
}
export const aiStatus = () => ({ configured: !!config.geminiKey, model: config.geminiKey ? config.geminiModel : null });