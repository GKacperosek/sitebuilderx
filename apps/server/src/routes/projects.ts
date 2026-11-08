import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { emptyDocument, getTemplate } from '@sitebuilder/shared';
import { db, json, activity } from '../db';
import { auth, HttpError } from '../security';
import { nameSchema, parseDocument, slugSchema } from '../validation';
import { projectJSON, versionJSON } from '../serializers';
import { config } from '../config';
import { assertOwnedAssets, lockProject, ownedProject, projectData, pruneVersions, versionBeforeChange } from '../services/projects';
import { exportProject } from '../services/export';

export const projectRoutes = Router();
projectRoutes.use(auth);
projectRoutes.get('/', async (req, res) => {
  const trash = req.query.trash === '1';
  const projects = await db.project.findMany({ where: { userId: req.user!.id, deletedAt: trash ? { not: null } : null }, orderBy: { updatedAt: 'desc' } });
  res.json({ projects: projects.map(projectJSON) });
});
projectRoutes.post('/', async (req, res) => {
  const body = z.object({ name: nameSchema, description: z.string().max(2000).optional(), templateId: z.string().max(100).optional(), document: z.unknown().optional() }).strict().parse(req.body);
  if (body.document && body.templateId) throw new HttpError(400, 'Choose a template or a document, not both');
  let document = emptyDocument(req.user!.language === 'en' ? 'en' : 'pl');
  if (body.templateId) { const template = getTemplate(body.templateId); if (!template || template.id !== body.templateId) throw new HttpError(400, 'Template not found'); document = template.create(document.language); }
  document = parseDocument(body.document ?? document);
  await assertOwnedAssets(req.user!.id, document);
  if (await db.project.count({ where: { userId: req.user!.id } }) >= 200) throw new HttpError(422, 'Maximum 200 projects per account');
  const project = await db.project.create({ data: projectData(req.user!.id, body.name, body.description || '', document) });
  await activity(req.user!.id, 'project.created', project.name, project.id);
  res.status(201).json({ project: projectJSON(project) });
});
projectRoutes.get('/:id', async (req, res) => res.json({ project: projectJSON(await ownedProject(req.user!.id, String(req.params.id), true)) }));
projectRoutes.patch('/:id', async (req, res) => {
  const body = z.object({ name: nameSchema.optional(), description: z.string().max(2000).optional(), document: z.unknown().optional(), expectedRevision: z.number().int().positive().optional() }).strict().parse(req.body);
  const document = body.document !== undefined ? parseDocument(body.document) : undefined;
  if (document) await assertOwnedAssets(req.user!.id, document);
  const project = await db.$transaction(async tx => {
    const p = await lockProject(tx, req.user!.id, String(req.params.id));
    if (body.expectedRevision !== undefined && body.expectedRevision !== p.revision) throw new HttpError(409, 'Project changed since it was loaded', 'REVISION_CONFLICT');
    if (document) await versionBeforeChange(tx, p);
    return tx.project.update({ where: { id: p.id }, data: { name: body.name, description: body.description, document: document ? json(document) : undefined, revision: { increment: 1 } } });
  });
  res.json({ project: projectJSON(project) });
});
projectRoutes.delete('/:id', async (req, res) => {
  const p = await db.$transaction(async tx => { const p = await lockProject(tx, req.user!.id, String(req.params.id)); return tx.project.update({ where: { id: p.id }, data: { deletedAt: new Date(), publishedSlug: null, publishedDocument: Prisma.DbNull, publishedAt: null } }); });
  await activity(req.user!.id, 'project.trashed', p.name, p.id); res.json({ success: true });
});
projectRoutes.post('/:id/duplicate', async (req, res) => {
  const original = await ownedProject(req.user!.id, String(req.params.id));
  if (await db.project.count({ where: { userId: req.user!.id } }) >= 200) throw new HttpError(422, 'Maximum 200 projects per account');
  const doc = parseDocument(original.document); await assertOwnedAssets(req.user!.id, doc);
  const project = await db.project.create({ data: projectData(req.user!.id, `${original.name.slice(0, 108)} (copy)`, original.description, doc) });
  await activity(req.user!.id, 'project.duplicated', project.name, project.id); res.status(201).json({ project: projectJSON(project) });
});
projectRoutes.post('/:id/restore', async (req, res) => {
  const project = await db.$transaction(async tx => { const p = await lockProject(tx, req.user!.id, String(req.params.id), true); if (!p.deletedAt) throw new HttpError(400, 'Project is not in trash'); return tx.project.update({ where: { id: p.id }, data: { deletedAt: null } }); });
  await activity(req.user!.id, 'project.restored', project.name, project.id); res.json({ project: projectJSON(project) });
});
projectRoutes.delete('/:id/permanent', async (req, res) => {
  const p = await db.$transaction(async tx => { const p = await lockProject(tx, req.user!.id, String(req.params.id), true); if (!p.deletedAt) throw new HttpError(400, 'Move the project to trash first'); await tx.project.delete({ where: { id: p.id } }); return p; });
  await activity(req.user!.id, 'project.deleted', p.name); res.json({ success: true });
});
projectRoutes.get('/:id/versions', async (req, res) => {
  const p = await ownedProject(req.user!.id, String(req.params.id), true);
  const versions = await db.projectVersion.findMany({ where: { projectId: p.id }, orderBy: { createdAt: 'desc' } });
  res.json({ versions: versions.map(versionJSON) });
});
projectRoutes.post('/:id/versions', async (req, res) => {
  const body = z.object({ label: z.string().trim().min(1).max(120).optional() }).strict().parse(req.body ?? {});
  const version = await db.$transaction(async tx => {
    const p = await lockProject(tx, req.user!.id, String(req.params.id));
    const v = await tx.projectVersion.create({ data: { projectId: p.id, label: body.label || `Version ${p.revision}`, revision: p.revision, document: json(p.document) } });
    await pruneVersions(tx, p.id); return v;
  });
  res.status(201).json({ version: versionJSON(version) });
});
projectRoutes.post('/:id/versions/:versionId/restore', async (req, res) => {
  const p = await ownedProject(req.user!.id, String(req.params.id));
  const v = await db.projectVersion.findFirst({ where: { id: String(req.params.versionId), projectId: p.id } });
  if (!v) throw new HttpError(404, 'Version not found');
  const document = parseDocument(v.document); await assertOwnedAssets(req.user!.id, document);
  const project = await db.$transaction(async tx => {
    const current = await lockProject(tx, req.user!.id, p.id);
    await tx.projectVersion.create({ data: { projectId: p.id, label: `Before restore · r${current.revision}`, revision: current.revision, document: json(current.document), automatic: true } });
    await pruneVersions(tx, p.id);
    return tx.project.update({ where: { id: p.id }, data: { document: json(document), revision: { increment: 1 } } });
  });
  await activity(req.user!.id, 'project.version-restored', v.label, p.id); res.json({ project: projectJSON(project) });
});
projectRoutes.post('/:id/publish', async (req, res) => {
  const { slug } = z.object({ slug: slugSchema }).strict().parse(req.body);
  const p = await ownedProject(req.user!.id, String(req.params.id));
  const document = parseDocument(p.document); await assertOwnedAssets(req.user!.id, document);
  const project = await db.$transaction(async tx => {
    const current = await lockProject(tx, req.user!.id, p.id);
    if (current.revision !== p.revision) throw new HttpError(409, 'Project changed; publish again', 'REVISION_CONFLICT');
    return tx.project.update({ where: { id: p.id }, data: { publishedSlug: slug, publishedDocument: json(document), publishedAt: new Date() } });
  });
  await activity(req.user!.id, 'project.published', slug, p.id); res.json({ project: projectJSON(project), url: `${config.publicUrl}/sites/${slug}/` });
});
projectRoutes.delete('/:id/publish', async (req, res) => {
  const project = await db.$transaction(async tx => { const p = await lockProject(tx, req.user!.id, String(req.params.id)); return tx.project.update({ where: { id: p.id }, data: { publishedSlug: null, publishedDocument: Prisma.DbNull, publishedAt: null } }); });
  await activity(req.user!.id, 'project.unpublished', project.name, project.id); res.json({ project: projectJSON(project) });
});
projectRoutes.get('/:id/export', async (req, res) => { const p = await ownedProject(req.user!.id, String(req.params.id)); await exportProject(p, res); });

export const publicationRoutes = Router();
publicationRoutes.use(auth);
publicationRoutes.get('/', async (req, res) => {
  const projects = await db.project.findMany({ where: { userId: req.user!.id, deletedAt: null, publishedSlug: { not: null } }, orderBy: { publishedAt: 'desc' } });
  res.json({ publications: projects.map(p => ({ ...projectJSON(p), url: `${config.publicUrl}/sites/${p.publishedSlug}/` })) });
});
