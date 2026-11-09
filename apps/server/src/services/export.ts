import archiver from 'archiver';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import type { Response } from 'express';
import type { Project } from '@prisma/client';
import { SITE_RUNTIME, renderPageHTML, safeURL } from '@sitebuilder/shared';
import { parseDocument } from '../validation';
import { db } from '../db';
import { HttpError } from '../security';
import { assertOwnedAssets, referencedUploads } from './projects';
import type { SiteDocument } from '@sitebuilder/shared';

const imageExtensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 20);

function publicAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0) || ip === '255.255.255.255');
  }
  if (version === 6) {
    const value = ip.toLowerCase();
    if (value.startsWith('::ffff:')) return publicAddress(value.slice(7));
    return !(value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('ff') || value.startsWith('2001:db8'));
  }
  return false;
}

async function download(url: string, kind: 'image' | 'font' | 'css', redirects = 0): Promise<{ buffer: Buffer; type: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443') || redirects > 3) throw new Error('Unsupported remote asset URL');
  const addresses = net.isIP(parsed.hostname) ? [{ address: parsed.hostname, family: net.isIP(parsed.hostname) }] : await lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Remote asset address is not public');
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, port: 443, servername: parsed.hostname, headers: { 'user-agent': kind === 'css' ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' : 'SitebuilderXExport/1.0', accept: kind === 'css' ? 'text/css' : kind === 'font' ? 'font/woff2,font/*,*/*' : 'image/*,*/*' }, lookup: (_hostname, options, callback) => { if ((options as any)?.all) callback(null, [{ address: address.address, family: address.family }]); else callback(null, address.address, address.family); } }, response => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) { response.resume(); download(new URL(response.headers.location, url).href, kind, redirects + 1).then(resolve, reject); return; }
      if (status !== 200) { response.resume(); reject(new Error(`Remote asset returned ${status}`)); return; }
      const type = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) { request.destroy(new Error('Remote asset exceeds 8 MB')); return; } chunks.push(chunk); });
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), type }));
      response.on('error', reject);
    });
    request.setTimeout(12000, () => request.destroy(new Error('Remote asset timeout')));
    request.on('error', reject);
  });
}

function remoteCandidates(doc: SiteDocument): Set<string> {
  const urls = new Set<string>();
  const add = (value: string) => { const url = safeURL(value); if (/^https:\/\//i.test(url)) urls.add(url); };
  const visit = (value: unknown, key = ''): void => {
    if (typeof value === 'string') {
      if (/^(src|poster|avatar|ogImage|image|images|backgroundImage)$/i.test(key)) add(value);
      for (const match of value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) add(match[1]);
    } else if (Array.isArray(value)) value.forEach(item => visit(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, item]) => visit(item, k));
  };
  visit(doc.pages.map(page => page.seo)); visit(doc.nodes); visit(doc.theme);
  return urls;
}

export async function exportProject(project: Project, res: Response) {
  const doc = parseDocument(project.document);
  await assertOwnedAssets(project.userId, doc);
  const files = new Map<string, Buffer | string>();
  const uploads = [...referencedUploads(doc)];
  for (const filename of uploads) {
    if (!/^[a-f0-9-]{36}\.(png|jpg|gif|webp|svg)$/.test(filename)) throw new HttpError(400, 'Invalid uploaded asset reference');
    const asset = await db.mediaAsset.findUnique({ where: { filename }, select: { data: true } });
    if (!asset?.data) throw new HttpError(404, `Uploaded asset is missing: ${filename}`);
    files.set(`assets/${filename}`, Buffer.from(asset.data));
  }

  const remote = new Map<string, string>();
  const candidates = [...remoteCandidates(doc)].slice(0, 80);
  for (let index = 0; index < candidates.length; index += 4) {
    await Promise.all(candidates.slice(index, index + 4).map(async url => {
      try { const result = await download(url, 'image'); const ext = imageExtensions[result.type]; if (!ext) return; const local = `assets/remote/${hash(url)}.${ext}`; remote.set(url, local); files.set(local, result.buffer); } catch { /* Keep the original public URL when an optional remote image cannot be bundled. */ }
    }));
  }

  let fontTemplate = '';
  const families = [...new Set([doc.theme.fontFamily, doc.theme.headingFont].map(font => font.split(',')[0].trim()).filter(font => font && !/^(arial|georgia|system-ui|monospace|sans-serif|serif)$/i.test(font)))];
  for (const family of families.slice(0, 2)) {
    try {
      const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
      const css = (await download(cssUrl, 'css')).buffer.toString('utf8');
      let localCss = css;
      for (const match of [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)]) {
        try { const font = await download(match[1], 'font'); const local = `assets/fonts/${hash(match[1])}.woff2`; files.set(local, font.buffer); localCss = localCss.split(match[1]).join(`__SB_PREFIX__${local}`); } catch { /* Font falls back to the declared system stack. */ }
      }
      fontTemplate += localCss + '\n';
    } catch { /* Export remains usable with fallback fonts when Google Fonts is unreachable. */ }
  }

  const pageFile = (slug: string) => slug ? `${slug}.html` : 'index.html';
  const aliases = new Map<string, string>();
  for (const page of doc.pages) { const target = pageFile(page.slug); aliases.set(page.slug ? `/${page.slug}` : '/', target); aliases.set('./', 'index.html'); if (page.slug) { aliases.set(page.slug, target); aliases.set(`/${page.slug}/`, target); } }
  const rewrite = (value: string, currentFile: string): string => {
    const depth = currentFile.split('/').length - 1; const prefix = '../'.repeat(depth);
    let result = value.replace(/\/uploads\/([a-zA-Z0-9_.-]+)/g, (_match, filename) => `${prefix}assets/${filename}`);
    for (const [url, local] of remote) result = result.split(url).join(prefix + local);
    const link = aliases.get(result);
    if (link) { const relative = path.posix.relative(path.posix.dirname(currentFile), link) || 'index.html'; result = relative.startsWith('.') ? relative : `./${relative}`; }
    return result;
  };
  const rewriteTree = (value: unknown, currentFile: string): unknown => {
    if (typeof value === 'string') return rewrite(value, currentFile);
    if (Array.isArray(value)) return value.map(item => rewriteTree(item, currentFile));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteTree(item, currentFile)]));
    return value;
  };

  const archive = archiver('zip', { zlib: { level: 9 } });
  const filename = `${(project.publishedSlug || project.name).replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || 'website'}.zip`;
  res.status(200).set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  archive.on('error', error => { if (!res.headersSent) res.status(500); res.destroy(error); });
  archive.pipe(res);
  res.on('close', () => { if (!res.writableEnded) archive.destroy(); });

  for (const page of doc.pages) {
    const currentFile = pageFile(page.slug);
    const pageDoc = rewriteTree(doc, currentFile) as SiteDocument;
    let html = renderPageHTML(pageDoc, page.id, { siteName: project.name, exportMode: true });
    if (fontTemplate) html = html.replace('</head>', `<style>${fontTemplate.split('__SB_PREFIX__').join(currentFile.split('/').length > 1 ? '../'.repeat(currentFile.split('/').length - 1) : '')}</style></head>`);
    files.set(currentFile, html);
  }
  files.set('assets/site-runtime.js', SITE_RUNTIME);
  files.set('README.md', `# ${project.name}\n\nExported from SITEBUILDER X ULTRA.\n\n## Run / Uruchomienie\n\nOpen index.html in a browser, or serve this folder with any static file server:\n\n    npx serve .\n\nOtwórz index.html w przeglądarce lub udostępnij folder dowolnym serwerem statycznym.\n\n## Contents / Zawartość\n\n- HTML pages / Podstrony HTML: ${doc.pages.map(page => pageFile(page.slug)).join(', ')}\n- assets/site-runtime.js: interactive widgets / interaktywne komponenty\n- assets/: bundled uploads, remote images and fonts / obrazy i czcionki\n\nForms are standalone in this export: they validate input but do not send data unless you connect your own form endpoint. Cart checkout records an order request only; no payment is processed.\nFormularze w eksporcie działają lokalnie: walidują dane, ale nie wysyłają ich bez podłączenia własnego endpointu. Koszyk zapisuje wyłącznie prośbę o zamówienie, bez płatności.\n`);
  for (const [name, content] of files) archive.append(content, { name });
  await archive.finalize();
}