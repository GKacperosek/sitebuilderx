import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Project, Domain } from '@prisma/client';
import { escapeHTML, renderPageHTML } from '@sitebuilder/shared';
import { db } from '../db';
import { config } from '../config';
import { HttpError } from '../security';
import { parseDocument } from '../validation';

export type PublishedProject = Project & { domains: Domain[] };
export async function publishedBySlug(slug: string): Promise<PublishedProject | null> {
  const project = await db.project.findUnique({ where: { publishedSlug: slug }, include: { domains: true } });
  return project && !project.deletedAt && project.publishedDocument ? project : null;
}
export async function publishedByHost(hostname: string): Promise<PublishedProject | null> {
  const domain = await db.domain.findUnique({ where: { hostname: hostname.toLowerCase() }, include: { project: { include: { domains: true } } } });
  const project = domain?.project;
  return domain?.verified && project && !project.deletedAt && project.publishedDocument ? project : null;
}
export function publicOriginAllowed(req: Request, project: PublishedProject): boolean {
  const origin = req.get('origin');
  if (!origin) return false;
  const allowed = [config.publicUrl, config.appUrl, ...project.domains.filter(domain => domain.verified).flatMap(domain => [`https://${domain.hostname}`, ...(config.production ? [] : [`http://${domain.hostname}`])])];
  return allowed.includes(origin);
}
export function siteCSP(res: Response) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data:; media-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
export function serveSite(project: PublishedProject, subpath: string, res: Response, baseUrl: string) {
  const doc = parseDocument(project.publishedDocument);
  const slug = subpath.replace(/^\/+|\/+$/g, '');
  const page = doc.pages.find(item => item.slug === slug) || (slug === '' ? doc.pages.find(item => !item.slug) : undefined);
  if (!page) throw new HttpError(404, 'Page not found');
  let html = renderPageHTML(doc, page.id, { assetBase: config.publicUrl, formEndpoint: `/api/public/forms/${project.publishedSlug}`, analyticsEndpoint: `/api/public/analytics/${project.publishedSlug}`, siteName: project.name });
  html = html.replace('<head>', `<head><base href="${escapeHTML(baseUrl)}">`);
  siteCSP(res);
  res.type('html').set('Cache-Control', 'public, max-age=60').send(html);
}
export function visitorHash(project: Project, req: Request, date: string) {
  return createHash('sha256').update(`${project.analyticsSalt}|${req.ip}|${req.get('user-agent') || ''}|${date}`).digest('hex');
}
export function deviceFromUA(req: Request) {
  const ua = req.get('user-agent') || '';
  return /iPad|Tablet|PlayBook|Silk/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android.*Mobile/i.test(ua) ? 'mobile' : 'desktop';
}