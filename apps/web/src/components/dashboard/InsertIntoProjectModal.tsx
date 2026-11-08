import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, FolderOpen, Plus } from 'lucide-react';
import { documentFromSpecs } from '@sitebuilder/shared';
import type { NodeSpec, Project } from '@sitebuilder/shared/types';
import { api, apiError } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useProjects, useInvalidate } from '../../lib/data';
import { appendSpec, createProject } from '../../lib/mutations';
import { Button, EmptyState, ErrorState, Modal, Select, Spinner, useToast } from '../ui';

export function InsertIntoProjectModal({ spec, name, open, onClose }: { spec: NodeSpec | null; name: string; open: boolean; onClose: () => void }) {
  const { t, language } = useI18n(); const { toast } = useToast(); const navigate = useNavigate(); const invalidate = useInvalidate();
  const projects = useProjects(); const [projectId, setProjectId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const list = projects.data?.projects || [];
  async function insert(existing: boolean) {
    if (!spec) return; setBusy(true); setError('');
    try {
      let project: Project;
      if (existing) {
        const target = list.find(item => item.id === projectId); if (!target) throw new Error(t('Choose a project first.', 'Najpierw wybierz projekt.'));
        project = await appendSpec(target, spec);
      } else project = await createProject({ name: name.slice(0, 100) || t('New website', 'Nowa strona'), document: documentFromSpecs([spec], undefined, language) });
      invalidate(); toast(t('Added to your project', 'Dodano do projektu'), 'success'); onClose(); navigate(`/editor/${project.id}`);
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }
  return <Modal open={open} onClose={() => !busy && onClose()} title={t('Add to a project', 'Dodaj do projektu')}>
    <div className="form-stack">
      <p className="muted">{t('Drop this component into an existing website, or start a fresh project around it.', 'Umieść ten komponent na istniejącej stronie lub zacznij wokół niego nowy projekt.')}</p>
      {projects.isLoading ? <Spinner /> : projects.error ? <ErrorState message={apiError(projects.error)} retry={() => void projects.refetch()} /> : list.length ? <>
        <Select aria-label={t('Choose project', 'Wybierz projekt')} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">{t('Select a project…', 'Wybierz projekt…')}</option>
          {list.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </Select>
        <Button disabled={!projectId} loading={busy} onClick={() => void insert(true)}><FolderOpen size={16} />{t('Add to project', 'Dodaj do projektu')}</Button>
        <div className="insert-divider"><span>{t('or', 'lub')}</span></div>
      </> : <EmptyState icon={<FolderOpen size={24} />} title={t('No projects yet', 'Brak projektów')} description={t('Start a new project with this component as its first section.', 'Rozpocznij nowy projekt z tym komponentem jako pierwszą sekcją.')} />}
      <Button variant="secondary" loading={busy} onClick={() => void insert(false)}><Plus size={16} />{t('Create new project', 'Utwórz nowy projekt')}<ArrowUpRight size={15} /></Button>
      {error && <div className="inline-error" role="alert">{error}</div>}
    </div>
  </Modal>;
}