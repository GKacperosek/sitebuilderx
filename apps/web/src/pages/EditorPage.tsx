import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Cloud, CloudOff, Copy, Download, Eye, Globe, History, Laptop, Loader2, Monitor, PanelLeft, PanelRight, Plus, Redo2, Save, Smartphone, Tablet, Undo2, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { DEVICE_WIDTHS, renderPageHTML } from '@sitebuilder/shared';
import type { Device, Project, ProjectVersion } from '@sitebuilder/shared/types';
import { api, apiError, ApiError, downloadProject } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { formatDate, useInvalidate } from '../lib/data';
import { saveDocument } from '../lib/mutations';
import { Badge, Button, ErrorState, Input, Modal, Spinner, useToast } from '../components/ui';
import { PublishModal } from '../components/dashboard/ProjectCard';
import { useEditor } from '../editor/store';
import LeftPanel from '../editor/LeftPanel';
import Canvas from '../editor/Canvas';
import PropertiesPanel from '../editor/PropertiesPanel';

const deviceIcons: Record<Device, typeof Monitor> = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };
export default function EditorPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const { user } = useAuth(); const { t, language } = useI18n(); const { toast } = useToast(); const invalidate = useInvalidate(); const client = useQueryClient();
  const s = useEditor();
  const query = useQuery({ queryKey: ['project', id], queryFn: () => api<{ project: Project }>(`/projects/${id}`), enabled: !!id, retry: false });
  const loaded = useRef(''); const savingRef = useRef(false);
  const [name, setName] = useState(''); const [publish, setPublish] = useState<Project | null>(null); const [versionsOpen, setVersionsOpen] = useState(false); const [conflict, setConflict] = useState(false);
  const [showLeft, setShowLeft] = useState(true); const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    if (query.data && loaded.current !== id) {
      loaded.current = id; const project = query.data.project; s.load(project); setName(project.name); setConflict(false);
      const prefs = user?.settings || {};
      if (['desktop', 'laptop', 'tablet', 'mobile'].includes(String(prefs.editorDevice))) s.setDevice(prefs.editorDevice as Device);
      if (Number(prefs.editorZoom) >= 0.25 && Number(prefs.editorZoom) <= 1.5) s.setZoom(Number(prefs.editorZoom));
    }
  }, [query.data, id]);

  async function saveNow() {
    const st = useEditor.getState(); if (!st.project || !st.document || !st.dirty || savingRef.current) return;
    savingRef.current = true; st.saving(); const changeId = st.changeId;
    try { const updated = await saveDocument(st.project, st.document); useEditor.getState().saved(updated, changeId); invalidate(); }
    catch (err) { if (err instanceof ApiError && err.code === 'REVISION_CONFLICT') { setConflict(true); useEditor.getState().failed(t('This project was changed in another session.', 'Ten projekt został zmieniony w innej sesji.')); } else useEditor.getState().failed(apiError(err)); }
    finally { savingRef.current = false; }
  }
  useEffect(() => {
    if (!s.dirty || conflict || user?.settings?.editorAutosave === false) return;
    const timer = setTimeout(() => void saveNow(), 1200); return () => clearTimeout(timer);
  }, [s.changeId, s.dirty, conflict]);
  useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (useEditor.getState().dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement; const editable = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable; const mod = e.metaKey || e.ctrlKey; const st = useEditor.getState();
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void saveNow(); return; }
      if (editable) return;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); st.redo(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); st.duplicate(); }
      else if (mod && e.key.toLowerCase() === 'c') { st.copy(); }
      else if (mod && e.key.toLowerCase() === 'v') { st.paste(); }
      else if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); e.shiftKey ? st.ungroup() : st.group(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (st.selected.length) { e.preventDefault(); st.remove(); } }
      else if (e.key === 'Escape') { if (st.preview) st.setPreview(false); else st.select(null); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function renameProject() {
    const trimmed = name.trim(); const st = useEditor.getState(); if (!st.project || !trimmed || trimmed === st.project.name) { setName(st.project?.name || ''); return; }
    try { const { project } = await api<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name: trimmed }) }); useEditor.setState(state => ({ project: state.project ? { ...state.project, name: project.name, revision: project.revision } : null })); invalidate(); }
    catch (err) { toast(apiError(err), 'error'); setName(st.project.name); }
  }
  async function openPublish() { await saveNow(); const st = useEditor.getState(); if (st.saveState === 'error' && !conflict) { toast(st.saveError, 'error'); return; } if (st.project) setPublish(st.project); }
  async function openVersions() { await saveNow(); setVersionsOpen(true); }
  async function exportZip() { const st = useEditor.getState(); if (!st.project) return; try { await saveNow(); await downloadProject(st.project.id, st.project.name); toast(t('Export ready', 'Eksport gotowy'), 'success'); } catch (err) { toast(apiError(err), 'error'); } }
  async function reloadServer() { const data = await query.refetch(); if (data.data) { s.load(data.data.project); setName(data.data.project.name); setConflict(false); toast(t('Loaded the latest server version', 'Wczytano najnowszą wersję z serwera'), 'success'); } }
  async function saveAsCopy() {
    const st = useEditor.getState(); if (!st.project || !st.document) return;
    try { const { project: copy } = await api<{ project: Project }>(`/projects/${st.project.id}/duplicate`, { method: 'POST' }); const updated = await saveDocument(copy, st.document); invalidate(); toast(t('Saved as a new project', 'Zapisano jako nowy projekt'), 'success'); navigate(`/editor/${updated.id}`); }
    catch (err) { toast(apiError(err), 'error'); }
  }

  if (query.isLoading) return <div className="boot-screen"><Spinner label={t('Opening editor…', 'Otwieranie edytora…')} /></div>;
  if (query.error || !s.document || !s.project) return <div className="boot-screen"><ErrorState message={query.error ? apiError(query.error) : t('Project not found', 'Nie znaleziono projektu')} retry={() => void query.refetch()} /><Link className="button button-secondary button-md" to="/projects"><ArrowLeft size={15} />{t('Back to projects', 'Wróć do projektów')}</Link></div>;

  const devices: Device[] = ['desktop', 'laptop', 'tablet', 'mobile'];
  const DeviceSwitcher = ({ className = '' }: { className?: string }) => <div className={`ep-devices ${className}`}>{devices.map(device => { const Icon = deviceIcons[device]; return <button key={device} className={s.device === device ? 'active' : ''} title={`${device} · ${DEVICE_WIDTHS[device]}px`} aria-label={device} onClick={() => s.setDevice(device)}><Icon size={16} /></button>; })}</div>;
  const saveIcon = s.saveState === 'saving' ? <Loader2 size={14} className="spin" /> : s.saveState === 'error' ? <CloudOff size={14} /> : s.dirty ? <Cloud size={14} /> : <Check size={14} />;
  const saveLabel = s.saveState === 'saving' ? t('Saving…', 'Zapisywanie…') : s.saveState === 'error' ? t('Save failed', 'Błąd zapisu') : s.dirty ? t('Unsaved changes', 'Niezapisane zmiany') : t('All changes saved', 'Wszystko zapisane');

  return <div className="editor-shell">
    <header className="editor-toolbar">
      <div className="ep-toolbar-left">
        <Link to="/projects" className="icon-button" title={t('Back to projects', 'Wróć do projektów')}><ArrowLeft size={18} /></Link>
        <input className="ep-project-name" value={name} onChange={e => setName(e.target.value)} onBlur={() => void renameProject()} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label={t('Project name', 'Nazwa projektu')} maxLength={100} />
        <span className={`ep-save-state ${s.saveState}`} title={s.saveError || saveLabel}>{saveIcon}<span>{saveLabel}</span></span>
      </div>
      <div className="ep-toolbar-center"><DeviceSwitcher /><div className="ep-zoom"><button className="icon-button" aria-label={t('Zoom out', 'Pomniejsz')} onClick={() => s.setZoom(s.zoom - 0.1)}>−</button><select value={Math.round(s.zoom * 100)} onChange={e => s.setZoom(Number(e.target.value) / 100)} aria-label={t('Zoom', 'Powiększenie')}>{[25, 50, 65, 75, 90, 100, 125, 150].map(value => <option key={value} value={value}>{value}%</option>)}</select><button className="icon-button" aria-label={t('Zoom in', 'Powiększ')} onClick={() => s.setZoom(s.zoom + 0.1)}>+</button></div></div>
      <div className="ep-toolbar-right">
        <div className="ep-history-buttons"><button className="icon-button" title={t('Undo (Ctrl+Z)', 'Cofnij (Ctrl+Z)')} disabled={!s.history.length} onClick={s.undo}><Undo2 size={17} /></button><button className="icon-button" title={t('Redo (Ctrl+Shift+Z)', 'Ponów (Ctrl+Shift+Z)')} disabled={!s.future.length} onClick={s.redo}><Redo2 size={17} /></button></div>
        <button className="icon-button ep-panel-toggle" title={t('Toggle library', 'Pokaż/ukryj bibliotekę')} onClick={() => setShowLeft(!showLeft)}><PanelLeft size={17} /></button>
        <button className="icon-button ep-panel-toggle" title={t('Toggle inspector', 'Pokaż/ukryj inspektor')} onClick={() => setShowRight(!showRight)}><PanelRight size={17} /></button>
        <Button variant="ghost" size="sm" onClick={() => void saveNow()} disabled={!s.dirty || s.saveState === 'saving'}><Save size={15} /><span className="ep-hide-small">{t('Save', 'Zapisz')}</span></Button>
        <Button variant="ghost" size="sm" onClick={() => void openVersions()}><History size={15} /><span className="ep-hide-small">{t('Versions', 'Wersje')}</span></Button>
        <Button variant="ghost" size="sm" onClick={() => void exportZip()}><Download size={15} /><span className="ep-hide-small">{t('Export', 'Eksport')}</span></Button>
        <Button variant="secondary" size="sm" onClick={() => s.setPreview(true)}><Eye size={15} /><span className="ep-hide-small">{t('Preview', 'Podgląd')}</span></Button>
        <Button size="sm" onClick={() => void openPublish()}><Globe size={15} />{t('Publish', 'Opublikuj')}</Button>
      </div>
    </header>
    {conflict && <div className="ep-conflict" role="alert"><AlertTriangle size={17} /><span>{t('This project changed in another session. Your local edits are safe — choose how to continue.', 'Projekt zmienił się w innej sesji. Twoje lokalne zmiany są bezpieczne — wybierz, jak kontynuować.')}</span><Button size="sm" variant="secondary" onClick={() => void reloadServer()}><RotateCcw size={14} />{t('Load server version', 'Wczytaj wersję z serwera')}</Button><Button size="sm" onClick={() => void saveAsCopy()}><Copy size={14} />{t('Save as new project', 'Zapisz jako nowy projekt')}</Button></div>}
    {s.saveState === 'error' && !conflict && <div className="ep-save-error" role="alert"><CloudOff size={15} /><span>{s.saveError}</span><Button size="sm" variant="secondary" onClick={() => void saveNow()}>{t('Retry', 'Ponów')}</Button></div>}
    <div className="editor-body">
      {showLeft && <><LeftPanel /></>}
      <Canvas />
      {showRight && <PropertiesPanel />}
    </div>
    {s.preview && <div className="ep-preview-overlay"><div className="ep-preview-bar"><Badge tone="purple"><Eye size={12} />{t('Preview', 'Podgląd')} · {s.document.pages.find(p => p.id === s.pageId)?.name}</Badge><DeviceSwitcher /><Button variant="secondary" size="sm" onClick={() => s.setPreview(false)}><X size={15} />{t('Close preview', 'Zamknij podgląd')}</Button></div><div className="ep-preview-stage"><iframe title={t('Website preview', 'Podgląd strony')} className="ep-preview-frame" style={{ width: DEVICE_WIDTHS[s.device], maxWidth: '100%' }} srcDoc={renderPageHTML(s.document, s.pageId, { siteName: s.project.name })} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" /></div></div>}
    <PublishModal project={publish} onClose={() => { setPublish(null); void client.invalidateQueries({ queryKey: ['project', id] }); }} />
    <VersionsModal open={versionsOpen} onClose={() => setVersionsOpen(false)} projectId={id} onRestored={project => { s.load(project); setName(project.name); setVersionsOpen(false); invalidate(); }} />
  </div>;
}

function VersionsModal({ open, onClose, projectId, onRestored }: { open: boolean; onClose: () => void; projectId: string; onRestored: (project: Project) => void }) {
  const { t, language } = useI18n(); const { toast } = useToast();
  const query = useQuery({ queryKey: ['versions', projectId], queryFn: () => api<{ versions: ProjectVersion[] }>(`/projects/${projectId}/versions`), enabled: open });
  const [label, setLabel] = useState(''); const [busy, setBusy] = useState(''); const [restore, setRestore] = useState<ProjectVersion | null>(null);
  async function create() { setBusy('create'); try { await api(`/projects/${projectId}/versions`, { method: 'POST', body: JSON.stringify({ label: label.trim() || undefined }) }); setLabel(''); await query.refetch(); toast(t('Snapshot created', 'Migawka utworzona'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(''); } }
  async function doRestore() { if (!restore) return; setBusy(restore.id); try { const { project } = await api<{ project: Project }>(`/projects/${projectId}/versions/${restore.id}/restore`, { method: 'POST' }); toast(t('Version restored', 'Wersja przywrócona'), 'success'); setRestore(null); onRestored(project); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(''); } }
  return <>
    <Modal open={open} onClose={onClose} title={t('Version history', 'Historia wersji')} className="versions-modal">
      <div className="form-stack"><p className="muted">{t('Automatic snapshots are kept before changes, and the latest 30 versions are stored. Create a named snapshot anytime.', 'Automatyczne migawki powstają przed zmianami; przechowywanych jest 30 ostatnich wersji. W każdej chwili możesz utworzyć nazwaną migawkę.')}</p>
        <div className="version-create"><Input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('Snapshot label (optional)', 'Nazwa migawki (opcjonalnie)')} maxLength={120} /><Button loading={busy === 'create'} onClick={() => void create()}><Plus size={15} />{t('Create snapshot', 'Utwórz migawkę')}</Button></div>
        {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={apiError(query.error)} retry={() => void query.refetch()} /> : query.data?.versions.length ? <div className="versions-list">{query.data.versions.map(version => <div className="version-row" key={version.id}><History size={16} /><div><strong>{version.label}</strong><span>{t('Revision', 'Rewizja')} {version.revision} · {formatDate(version.createdAt, language, true)}</span></div><Button size="sm" variant="secondary" loading={busy === version.id} onClick={() => setRestore(version)}><RotateCcw size={13} />{t('Restore', 'Przywróć')}</Button></div>)}</div> : <p className="muted">{t('No versions yet. They appear as you edit and save.', 'Brak wersji. Pojawią się podczas edycji i zapisu.')}</p>}
      </div>
    </Modal>
    <Modal open={!!restore} onClose={() => !busy && setRestore(null)} title={t('Restore this version?', 'Przywrócić tę wersję?')} footer={<><Button variant="ghost" onClick={() => setRestore(null)} disabled={!!busy}>{t('Cancel', 'Anuluj')}</Button><Button loading={!!busy} onClick={() => void doRestore()}><RotateCcw size={15} />{t('Restore', 'Przywróć')}</Button></>}><p className="muted">{t('Your current state is saved as a snapshot first, so you can always go back.', 'Obecny stan zostanie najpierw zapisany jako migawka, więc zawsze możesz wrócić.')}</p></Modal>
  </>;
}