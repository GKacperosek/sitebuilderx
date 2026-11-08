import { Router } from 'express';
import { z } from 'zod';
import { resolveTxt } from 'node:dns/promises';
import { db, activity } from '../db';
import { auth, HttpError, token } from '../security';
import { domainJSON } from '../serializers';
import { ownedProject } from '../services/projects';

export const domainRoutes = Router();
domainRoutes.use(auth);
const hostnameSchema = z.string().trim().toLowerCase().max(253).regex(/^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/, 'Enter a valid public hostname').refine(value => !value.endsWith('.local') && !value.endsWith('.localhost') && value !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(value), 'Use a public domain name');
domainRoutes.get('/', async (req, res) => {
  const domains = await db.domain.findMany({ where: { userId: req.user!.id }, include: { project: { select: { name: true, publishedSlug: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ domains: domains.map(domain => ({ ...domainJSON(domain), projectName: domain.project.name, publishedSlug: domain.project.publishedSlug })) });
});
domainRoutes.post('/', async (req, res) => {
  const body = z.object({ hostname: hostnameSchema, projectId: z.string().min(1).max(100) }).strict().parse(req.body);
  await ownedProject(req.user!.id, body.projectId);
  if (await db.domain.count({ where: { userId: req.user!.id } }) >= 20) throw new HttpError(422, 'Maximum 20 domains per account');
  const domain = await db.domain.create({ data: { userId: req.user!.id, projectId: body.projectId, hostname: body.hostname, token: `sitebuilder-verify=${token()}` } });
  await activity(req.user!.id, 'domain.added', body.hostname, body.projectId);
  res.status(201).json({ domain: domainJSON(domain) });
});
domainRoutes.post('/:id/verify', async (req, res) => {
  const domain = await db.domain.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!domain) throw new HttpError(404, 'Domain not found');
  let records: string[] = [];
  try { records = (await resolveTxt(domain.hostname)).map(chunks => chunks.join('')); } catch { throw new HttpError(422, 'No TXT record found yet. DNS changes can take up to 48 hours.', 'DNS_NOT_FOUND'); }
  if (!records.includes(domain.token)) throw new HttpError(422, 'TXT verification value does not match', 'DNS_MISMATCH');
  const verified = await db.domain.update({ where: { id: domain.id }, data: { verified: true } });
  await activity(req.user!.id, 'domain.verified', domain.hostname, domain.projectId);
  res.json({ domain: domainJSON(verified) });
});
domainRoutes.delete('/:id', async (req, res) => {
  const domain = await db.domain.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!domain) throw new HttpError(404, 'Domain not found');
  await db.domain.deleteMany({ where: { id: domain.id, userId: req.user!.id } });
  await activity(req.user!.id, 'domain.removed', domain.hostname, domain.projectId);
  res.json({ success: true });
});