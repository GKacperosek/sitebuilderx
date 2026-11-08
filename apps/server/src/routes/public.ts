import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db, activity, json } from '../db';
import { HttpError } from '../security';
import { deviceFromUA, publicOriginAllowed, publishedBySlug, visitorHash } from '../services/public';

export const publicRoutes = Router();
const formLimit = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many submissions', code: 'RATE_LIMITED' } });
const analyticsLimit = rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many events', code: 'RATE_LIMITED' } });
const dataSchema = z.record(z.string().min(1).max(100).refine(key => !['__proto__', 'prototype', 'constructor'].includes(key) && !/^on[a-z]/i.test(key)), z.string().max(10000)).refine(value => Object.keys(value).length <= 40, 'Too many fields');

publicRoutes.post('/forms/:slug', formLimit, async (req, res) => {
  const project = await publishedBySlug(String(req.params.slug));
  if (!project) throw new HttpError(404, 'Published website not found');
  if (!publicOriginAllowed(req, project)) throw new HttpError(403, 'Untrusted form origin', 'CSRF_REJECTED');
  const body = z.object({ formName: z.string().trim().min(1).max(120), pageSlug: z.string().max(100).default(''), pageId: z.string().max(100).optional(), data: dataSchema }).strict().parse(req.body);
  if (await db.submission.count({ where: { projectId: project.id } }) >= 10000) throw new HttpError(422, 'Submission inbox is full');
  await db.submission.create({ data: { projectId: project.id, pageSlug: body.pageSlug, formName: body.formName, data: json(body.data) } });
  await activity(project.userId, 'form.submitted', body.formName, project.id);
  res.status(201).json({ success: true });
});
publicRoutes.post('/analytics/:slug', analyticsLimit, async (req, res) => {
  const project = await publishedBySlug(String(req.params.slug));
  if (!project) throw new HttpError(404, 'Published website not found');
  if (!publicOriginAllowed(req, project)) throw new HttpError(403, 'Untrusted analytics origin', 'CSRF_REJECTED');
  const body = z.object({ pageSlug: z.string().max(100).default(''), path: z.string().max(500).default('/'), referrer: z.string().max(2000).default('') }).strict().parse(req.body);
  const date = new Date().toISOString().slice(0, 10);
  await db.pageView.create({ data: { projectId: project.id, path: body.path.slice(0, 500), visitorHash: visitorHash(project, req, date), device: deviceFromUA(req), date } });
  res.status(204).end();
});