import { Prisma, type Project } from '@prisma/client';
import { db, json } from '../db';
import { HttpError, token } from '../security';
import type { SiteDocument } from '@sitebuilder/shared';

export function referencedUploads(value: unknown): Set<string> {
  const names = new Set<string>();
  const visit = (v: unknown): void => {
    if (typeof v === 'string') for (const m of v.matchAll(/\/uploads\/([a-zA-Z0-9_.-]+)/g)) names.add(m[1]);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(value); return names;
}
export async function assertOwnedAssets(userId: string, value: unknown) {
  const filenames = [...referencedUploads(value)];
  if (!filenames.length) return;
  const count = await db.mediaAsset.count({ where: { userId, filename: { in: filenames } } });
  if (count !== filenames.length) throw new HttpError(400, 'Document references missing or unowned uploads', 'INVALID_ASSET');
}
export async function ownedProject(userId: string, id: string, trash = false): Promise<Project> {
  const project = await db.project.findFirst({ where: { id, userId, ...(trash ? {} : { deletedAt: null }) } });
  if (!project) throw new HttpError(404, 'Project not found'); return project;
}
export async function lockProject(tx: Prisma.TransactionClient, userId: string, id: string, trash = false) {
  await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE`;
  const project = await tx.project.findFirst({ where: { id, userId, ...(trash ? {} : { deletedAt: null }) } });
  if (!project) throw new HttpError(404, 'Project not found'); return project;
}
export async function pruneVersions(tx: Prisma.TransactionClient, projectId: string) {
  const old = await tx.projectVersion.findMany({ where: { projectId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 30, select: { id: true } });
  if (old.length) await tx.projectVersion.deleteMany({ where: { projectId, id: { in: old.map(v => v.id) } } });
}
export async function versionBeforeChange(tx: Prisma.TransactionClient, p: Project) {
  const latest = await tx.projectVersion.findFirst({ where: { projectId: p.id }, orderBy: { createdAt: 'desc' } });
  if (!latest || Date.now() - latest.createdAt.getTime() >= 10 * 60000) {
    await tx.projectVersion.create({ data: { projectId: p.id, document: json(p.document), revision: p.revision, label: `Autosave · r${p.revision}`, automatic: true } });
    await pruneVersions(tx, p.id);
  }
}
export const projectData = (userId: string, name: string, description: string, document: SiteDocument) => ({ userId, name, description, document: json(document), analyticsSalt: token() });
