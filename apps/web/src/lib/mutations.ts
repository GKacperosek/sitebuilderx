import { instantiateSpec } from '@sitebuilder/shared';
import type { NodeSpec, Project, SiteDocument } from '@sitebuilder/shared/types';
import { api } from './api';

export async function createProject(input: { name: string; templateId?: string; document?: SiteDocument; description?: string }): Promise<Project> {
  const { project } = await api<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(input) });
  return project;
}
export async function saveDocument(project: Project, document: SiteDocument): Promise<Project> {
  const { project: updated } = await api<{ project: Project }>(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ document, expectedRevision: project.revision }) });
  return updated;
}
export async function appendSpec(project: Project, spec: NodeSpec): Promise<Project> {
  const document = structuredClone(project.document);
  const id = instantiateSpec(spec, document.nodes);
  document.pages[0].rootIds.push(id);
  return saveDocument(project, document);
}