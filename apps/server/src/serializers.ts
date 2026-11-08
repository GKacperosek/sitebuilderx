import type { User, Project, MediaAsset, Domain, ProjectVersion, Activity, Submission, SavedComponent } from '@prisma/client';
export const userJSON = (u: User) => ({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, language: u.language, settings: u.settings, createdAt: u.createdAt.toISOString() });
export const projectJSON = (p: Project) => ({ id: p.id, name: p.name, description: p.description, document: p.document, revision: p.revision, publishedSlug: p.publishedSlug, publishedAt: p.publishedAt?.toISOString() ?? null, deletedAt: p.deletedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), thumbnail: p.thumbnail });
export const assetJSON = (a: MediaAsset) => ({ id: a.id, name: a.name, url: `/uploads/${a.filename}`, mimeType: a.mimeType, size: a.size, folder: a.folder, createdAt: a.createdAt.toISOString() });
export const domainJSON = (d: Domain) => ({ id: d.id, hostname: d.hostname, projectId: d.projectId, verified: d.verified, token: d.token, createdAt: d.createdAt.toISOString() });
export const versionJSON = (v: ProjectVersion) => ({ id: v.id, label: v.label, revision: v.revision, createdAt: v.createdAt.toISOString() });
export const activityJSON = (a: Activity) => ({ id: a.id, action: a.action, detail: a.detail, projectId: a.projectId, createdAt: a.createdAt.toISOString() });
export const submissionJSON = (s: Submission) => ({ id: s.id, projectId: s.projectId, pageSlug: s.pageSlug, formName: s.formName, data: s.data, createdAt: s.createdAt.toISOString() });
export const componentJSON = (s: SavedComponent) => ({ id: s.id, name: s.name, spec: s.spec, createdAt: s.createdAt.toISOString() });
