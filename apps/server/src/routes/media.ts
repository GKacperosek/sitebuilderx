import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { db, activity } from '../db';
import { auth, HttpError } from '../security';
import { config } from '../config';
import { folderSchema, nameSchema } from '../validation';
import { assetJSON } from '../serializers';
import { validateImage } from '../services/images';
import { referencedUploads } from '../services/projects';

export const mediaRoutes = Router();
mediaRoutes.use(auth);
const uploadLimit = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many uploads' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10, fields: 1, fieldSize: 200, parts: 11 } });
mediaRoutes.get('/', async (req, res) => {
  const query = z.object({ folder: folderSchema.optional(), search: z.string().max(200).optional() }).parse(req.query);
  const assets = await db.mediaAsset.findMany({ where: { userId: req.user!.id, folder: query.folder, ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}) }, orderBy: { createdAt: 'desc' } });
  const folders = await db.mediaFolder.findMany({ where: { userId: req.user!.id }, orderBy: { name: 'asc' } });
  res.json({ assets: assets.map(assetJSON), folders: folders.map(f => f.name) });
});
mediaRoutes.post('/', uploadLimit, upload.array('files', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  const { folder = '' } = z.object({ folder: folderSchema.optional() }).strict().parse(req.body);
  if (!files?.length) throw new HttpError(400, 'Select at least one image');
  if (files.reduce((sum, f) => sum + f.size, 0) > 50 * 1024 * 1024) throw new HttpError(413, 'Total upload must be at most 50 MB');
  const total = await db.mediaAsset.aggregate({ where: { userId: req.user!.id }, _sum: { size: true } });
  if ((total._sum.size || 0) + files.reduce((sum, f) => sum + f.size, 0) > 1024 * 1024 * 1024) throw new HttpError(422, 'Account media limit is 1 GB');
  const images = files.map(file => ({ ...validateImage(file.buffer), name: file.originalname.replace(/[\u0000-\u001f/\\]/g, '').slice(0, 120) || 'Image', filename: '' }));
  images.forEach(img => { img.filename = `${randomUUID()}.${img.ext}`; });
  const written: string[] = [];
  try {
    for (const image of images) { await writeFile(path.join(config.uploads, image.filename), image.buffer, { flag: 'wx' }); written.push(image.filename); }
    const assets = await db.$transaction(async tx => {
      if (folder) await tx.mediaFolder.upsert({ where: { userId_name: { userId: req.user!.id, name: folder } }, create: { userId: req.user!.id, name: folder }, update: {} });
      return Promise.all(images.map(image => tx.mediaAsset.create({ data: { userId: req.user!.id, name: image.name, filename: image.filename, mimeType: image.mime, size: image.buffer.length, folder } })));
    });
    await activity(req.user!.id, 'media.uploaded', `${assets.length} image(s)`); res.status(201).json({ assets: assets.map(assetJSON) });
  } catch (error) { await Promise.all(written.map(f => unlink(path.join(config.uploads, f)).catch(() => undefined))); throw error; }
});
mediaRoutes.post('/folders', async (req, res) => {
  const { name } = z.object({ name: folderSchema.refine(v => !!v, 'Folder name required') }).strict().parse(req.body);
  if (await db.mediaFolder.count({ where: { userId: req.user!.id } }) >= 100) throw new HttpError(422, 'Maximum 100 folders');
  await db.mediaFolder.create({ data: { userId: req.user!.id, name } }); res.status(201).json({ success: true });
});
mediaRoutes.delete('/folders/:name', async (req, res) => {
  const name = folderSchema.parse(req.params.name);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${req.user!.id} FOR UPDATE`;
    if (await tx.mediaAsset.count({ where: { userId: req.user!.id, folder: name } })) throw new HttpError(409, 'Folder is not empty', 'FOLDER_NOT_EMPTY');
    const deleted = await tx.mediaFolder.deleteMany({ where: { userId: req.user!.id, name } });
    if (!deleted.count) throw new HttpError(404, 'Folder not found');
  });
  res.json({ success: true });
});
mediaRoutes.patch('/:id', async (req, res) => {
  const body = z.object({ name: nameSchema.optional(), folder: folderSchema.optional() }).strict().parse(req.body);
  const asset = await db.$transaction(async tx => {
    const a = await tx.mediaAsset.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } }); if (!a) throw new HttpError(404, 'Image not found');
    if (body.folder) await tx.mediaFolder.upsert({ where: { userId_name: { userId: req.user!.id, name: body.folder } }, create: { userId: req.user!.id, name: body.folder }, update: {} });
    return tx.mediaAsset.update({ where: { id: a.id }, data: body });
  });
  res.json({ asset: assetJSON(asset) });
});
mediaRoutes.delete('/:id', async (req, res) => {
  const a = await db.mediaAsset.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } }); if (!a) throw new HttpError(404, 'Image not found');
  const projects = await db.project.findMany({ where: { userId: req.user!.id }, select: { document: true, publishedDocument: true, versions: { select: { document: true } } } });
  if (referencedUploads([req.user!.avatar, ...projects]).has(a.filename)) throw new HttpError(409, 'Image is referenced by a project, version, publication or avatar', 'ASSET_IN_USE');
  await db.mediaAsset.deleteMany({ where: { id: a.id, userId: req.user!.id } }); await unlink(path.join(config.uploads, a.filename)).catch(() => undefined);
  await activity(req.user!.id, 'media.deleted', a.name); res.json({ success: true });
});
export async function serveUpload(req: Request, res: Response) {
  const filename = String(req.params.filename);
  if (!/^[a-f0-9-]{36}\.(?:png|jpg|gif|webp|svg)$/.test(filename)) throw new HttpError(404, 'Image not found');
  const asset = await db.mediaAsset.findUnique({ where: { filename } });
  if (!asset) throw new HttpError(404, 'Image not found');
  let publicAsset = false;
  if (req.user?.id !== asset.userId) {
    const publications = await db.project.findMany({ where: { userId: asset.userId, deletedAt: null, publishedSlug: { not: null } }, select: { publishedDocument: true } });
    publicAsset = publications.some(p => referencedUploads(p.publishedDocument).has(filename));
    if (!publicAsset) throw new HttpError(404, 'Image not found');
  }
  res.setHeader('Content-Type', asset.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Cross-Origin-Resource-Policy', publicAsset ? 'cross-origin' : 'same-site');
  if (asset.mimeType === 'image/svg+xml') res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.sendFile(path.join(config.uploads, filename), err => { if (err && !res.headersSent) res.status(404).json({ error: 'Image file not found' }); });
}
