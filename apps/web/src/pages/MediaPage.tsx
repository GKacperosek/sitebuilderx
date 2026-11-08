import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Download, Folder, FolderPlus, Grid2X2, Image as ImageIcon, List, Pencil, Search, Trash2, Upload, X, Plus, HardDrive } from 'lucide-react';
import type { MediaAsset } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatBytes, formatDate, useInvalidate } from '../lib/data';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, PageHeading, Select, Spinner, useToast } from '../components/ui';
import { InsertIntoProjectModal } from '../components/dashboard/InsertIntoProjectModal';

export default function MediaPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const client = useQueryClient(); const invalidate = useInvalidate();
  const [folder, setFolder] = useState(''); const [search, setSearch] = useState(''); const [type, setType] = useState('all'); const [sort, setSort] = useState('recent'); const [view, setView] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false); const [dragOver, setDragOver] = useState(false); const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MediaAsset | null>(null); const [rename, setRename] = useState<MediaAsset | null>(null); const [renameValue, setRenameValue] = useState(''); const [remove, setRemove] = useState<MediaAsset | null>(null);
  const [newFolder, setNewFolder] = useState(false); const [folderName, setFolderName] = useState(''); const [removeFolder, setRemoveFolder] = useState(''); const [insert, setInsert] = useState<MediaAsset | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['media', folder, search], queryFn: () => api<{ assets: MediaAsset[]; folders: string[] }>(`/media?folder=${encodeURIComponent(folder)}&search=${encodeURIComponent(search)}`) });
  const all = useQuery({ queryKey: ['media', '', ''], queryFn: () => api<{ assets: MediaAsset[]; folders: string[] }>('/media') });
  const assets = query.data?.assets || []; const folders = query.data?.folders || all.data?.folders || [];
  const totalBytes = (all.data?.assets || []).reduce((sum, asset) => sum + asset.size, 0);
  const filtered = useMemo(() => assets.filter(asset => type === 'all' || (type === 'svg' ? asset.mimeType === 'image/svg+xml' : asset.mimeType !== 'image/svg+xml')).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.size - a.size : b.createdAt.localeCompare(a.createdAt)), [assets, type, sort]);
  const refresh = () => { void client.invalidateQueries({ queryKey: ['media'] }); invalidate(); };
  async function upload(files: FileList | File[]) {
    const list = Array.from(files); if (!list.length) return; setUploading(true); setError('');
    const data = new FormData(); list.forEach(file => data.append('files', file)); if (folder) data.append('folder', folder);
    try { const result = await api<{ assets: MediaAsset[] }>('/media', { method: 'POST', body: data }); refresh(); toast(t(`${result.assets.length} image(s) uploaded`, `Przesłano ${result.assets.length} obraz(y)`), 'success'); }
    catch (err) { setError(apiError(err)); toast(apiError(err), 'error'); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  }
  async function createFolder() { if (!folderName.trim()) return; setBusy(true); try { await api('/media/folders', { method: 'POST', body: JSON.stringify({ name: folderName.trim() }) }); refresh(); setNewFolder(false); setFolderName(''); toast(t('Folder created', 'Folder utworzony'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function saveRename() { if (!rename || !renameValue.trim()) return; setBusy(true); try { await api(`/media/${rename.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameValue.trim() }) }); refresh(); setRename(null); toast(t('Renamed', 'Zmieniono nazwę'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function move(asset: MediaAsset, target: string) { try { await api(`/media/${asset.id}`, { method: 'PATCH', body: JSON.stringify({ folder: target }) }); refresh(); toast(t('Moved', 'Przeniesiono'), 'success'); } catch (err) { toast(apiError(err), 'error'); } }
  async function deleteAsset() { if (!remove) return; setBusy(true); try { await api(`/media/${remove.id}`, { method: 'DELETE' }); refresh(); setRemove(null); toast(t('Image deleted', 'Obraz usunięty'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function deleteFolder() { setBusy(true); try { await api(`/media/folders/${encodeURIComponent(removeFolder)}`, { method: 'DELETE' }); refresh(); if (folder === removeFolder) setFolder(''); setRemoveFolder(''); toast(t('Folder deleted', 'Folder usunięty'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  const actions = (asset: MediaAsset) => <div className="media-actions">
    <button className="icon-button" title={t('Preview', 'Podgląd')} onClick={() => setPreview(asset)}><ImageIcon size={15} /></button>
    <button className="icon-button" title={t('Rename', 'Zmień nazwę')} onClick={() => { setRename(asset); setRenameValue(asset.name); }}><Pencil size={15} /></button>
    <button className="icon-button" title={t('Insert into project', 'Wstaw do projektu')} onClick={() => setInsert(asset)}><Plus size={15} /></button>
    <a className="icon-button" title={t('Open original', 'Otwórz oryginał')} href={asset.url} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /></a>
    <button className="icon-button danger-text" title={t('Delete', 'Usuń')} onClick={() => setRemove(asset)}><Trash2 size={15} /></button>
  </div>;
  return <>
    <PageHeading eyebrow={t('MEDIA LIBRARY', 'BIBLIOTEKA MEDIÓW')} title={t('Every image, in its place.', 'Każdy obraz na swoim miejscu.')} description={t('Upload, organize and reuse your visuals across every project. SVG, PNG, JPG, WebP and GIF.', 'Przesyłaj, organizuj i używaj swoich grafik w każdym projekcie. SVG, PNG, JPG, WebP i GIF.')} actions={<Button onClick={() => inputRef.current?.click()} loading={uploading}><Upload size={16} />{t('Upload images', 'Prześlij obrazy')}</Button>} />
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple hidden onChange={e => e.target.files && void upload(e.target.files)} />
    <div className="media-layout">
      <aside className="media-folders">
        <div className="media-folders-heading"><span>{t('FOLDERS', 'FOLDERY')}</span><button className="icon-button" title={t('New folder', 'Nowy folder')} onClick={() => setNewFolder(true)}><FolderPlus size={16} /></button></div>
        <button className={`media-folder ${folder === '' ? 'active' : ''}`} onClick={() => setFolder('')}><ImageIcon size={16} />{t('All images', 'Wszystkie obrazy')}<span>{all.data?.assets.length ?? '—'}</span></button>
        {folders.map(name => <div key={name} className={`media-folder-row ${folder === name ? 'active' : ''}`}><button className="media-folder" onClick={() => setFolder(name)}><Folder size={16} />{name}</button><button className="icon-button" title={t('Delete folder', 'Usuń folder')} onClick={() => setRemoveFolder(name)}><X size={13} /></button></div>)}
        <div className="media-storage"><div><HardDrive size={15} /><span>{t('Storage', 'Przestrzeń')}</span></div><div className="storage-bar"><i style={{ width: `${Math.min(100, totalBytes / (1024 * 1024 * 1024) * 100)}%` }} /></div><span>{formatBytes(totalBytes)} / 1 GB</span></div>
      </aside>
      <section className="media-main">
        <div className={`media-dropzone ${dragOver ? 'drag-over' : ''}`} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); void upload(e.dataTransfer.files); }}>
          <div className="list-toolbar">
            <div className="search-input"><Search size={16} /><Input aria-label={t('Search media', 'Szukaj mediów')} placeholder={t('Search images…', 'Szukaj obrazów…')} value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="toolbar-controls">
              <Select aria-label={t('Filter type', 'Filtr typu')} value={type} onChange={e => setType(e.target.value)}><option value="all">{t('All types', 'Wszystkie typy')}</option><option value="raster">{t('Photos', 'Zdjęcia')}</option><option value="svg">SVG</option></Select>
              <Select aria-label={t('Sort', 'Sortowanie')} value={sort} onChange={e => setSort(e.target.value)}><option value="recent">{t('Newest', 'Najnowsze')}</option><option value="name">{t('Name A–Z', 'Nazwa A–Z')}</option><option value="size">{t('Largest', 'Największe')}</option></Select>
              <div className="view-toggle"><button className={view === 'grid' ? 'active' : ''} aria-label={t('Grid view', 'Widok siatki')} onClick={() => setView('grid')}><Grid2X2 size={16} /></button><button className={view === 'list' ? 'active' : ''} aria-label={t('List view', 'Widok listy')} onClick={() => setView('list')}><List size={16} /></button></div>
            </div>
          </div>
          {error && <div className="inline-error" role="alert">{error}</div>}
          {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={apiError(query.error)} retry={() => void query.refetch()} /> : filtered.length ? (view === 'grid' ? <div className="media-grid">{filtered.map(asset => <article className="media-card" key={asset.id}>
            <button className="media-thumb" onClick={() => setPreview(asset)}><img src={asset.url} alt={asset.name} loading="lazy" />{asset.mimeType === 'image/svg+xml' && <Badge tone="purple">SVG</Badge>}</button>
            <div className="media-card-body"><strong title={asset.name}>{asset.name}</strong><span>{formatBytes(asset.size)} · {formatDate(asset.createdAt, language)}</span>{actions(asset)}</div>
          </article>)}</div> : <div className="media-list">{filtered.map(asset => <div className="media-row" key={asset.id}><img src={asset.url} alt="" loading="lazy" /><div className="media-row-info"><strong>{asset.name}</strong><span>{asset.folder || t('No folder', 'Bez folderu')} · {formatBytes(asset.size)} · {formatDate(asset.createdAt, language)}</span></div><Select aria-label={t('Move to folder', 'Przenieś do folderu')} value={asset.folder} onChange={e => void move(asset, e.target.value)}><option value="">{t('No folder', 'Bez folderu')}</option>{folders.map(name => <option key={name}>{name}</option>)}</Select>{actions(asset)}</div>)}</div>) : <EmptyState icon={<Upload size={28} />} title={search || folder ? t('No images here yet', 'Brak obrazów w tym miejscu') : t('Your visual library starts here', 'Twoja biblioteka wizualna zaczyna się tutaj')} description={t('Drag files onto this area or use the upload button. Images stay private to your account until published.', 'Przeciągnij pliki tutaj lub użyj przycisku przesyłania. Obrazy pozostają prywatne aż do publikacji.')} action={<Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload size={15} />{t('Choose files', 'Wybierz pliki')}</Button>} />}
          <div className="drop-hint"><Upload size={14} />{t('Drop images anywhere in this area to upload', 'Upuść obrazy w tym obszarze, aby je przesłać')}</div>
        </div>
      </section>
    </div>
    <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || ''} className="media-preview-modal" footer={<><span className="muted">{preview && `${formatBytes(preview.size)} · ${preview.mimeType}`}</span><Button onClick={() => { setInsert(preview); setPreview(null); }}><Plus size={15} />{t('Insert into project', 'Wstaw do projektu')}</Button></>}>{preview && <img className="media-preview-image" src={preview.url} alt={preview.name} />}</Modal>
    <Modal open={!!rename} onClose={() => !busy && setRename(null)} title={t('Rename image', 'Zmień nazwę obrazu')}><form className="form-stack" onSubmit={e => { e.preventDefault(); void saveRename(); }}><Field label={t('Name', 'Nazwa')}><Input required value={renameValue} onChange={e => setRenameValue(e.target.value)} maxLength={120} autoFocus /></Field><div className="form-actions"><Button variant="ghost" onClick={() => setRename(null)}>{t('Cancel', 'Anuluj')}</Button><Button type="submit" loading={busy}>{t('Save', 'Zapisz')}</Button></div></form></Modal>
    <Modal open={newFolder} onClose={() => !busy && setNewFolder(false)} title={t('New folder', 'Nowy folder')}><form className="form-stack" onSubmit={e => { e.preventDefault(); void createFolder(); }}><Field label={t('Folder name', 'Nazwa folderu')}><Input required value={folderName} onChange={e => setFolderName(e.target.value)} maxLength={100} placeholder={t('e.g. Brand assets', 'np. Materiały marki')} autoFocus /></Field><div className="form-actions"><Button variant="ghost" onClick={() => setNewFolder(false)}>{t('Cancel', 'Anuluj')}</Button><Button type="submit" loading={busy} disabled={!folderName.trim()}><FolderPlus size={15} />{t('Create', 'Utwórz')}</Button></div></form></Modal>
    <Modal open={!!remove} onClose={() => !busy && setRemove(null)} title={t('Delete image?', 'Usunąć obraz?')} footer={<><Button variant="ghost" onClick={() => setRemove(null)} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void deleteAsset()}><Trash2 size={15} />{t('Delete', 'Usuń')}</Button></>}><p className="muted">{t('Images used by a project, version, publication or avatar cannot be deleted until those references are removed.', 'Obrazy używane przez projekt, wersję, publikację lub avatar nie mogą zostać usunięte, dopóki istnieją te odwołania.')}</p></Modal>
    <Modal open={!!removeFolder} onClose={() => !busy && setRemoveFolder('')} title={t('Delete folder?', 'Usunąć folder?')} footer={<><Button variant="ghost" onClick={() => setRemoveFolder('')} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void deleteFolder()}><Trash2 size={15} />{t('Delete', 'Usuń')}</Button></>}><p className="muted">{t('Only empty folders can be deleted. Move or delete its images first.', 'Można usunąć tylko puste foldery. Najpierw przenieś lub usuń obrazy.')}</p></Modal>
    <InsertIntoProjectModal open={!!insert} spec={insert ? { type: 'image', name: insert.name, props: { src: insert.url, alt: insert.name }, styles: { width: '100%', borderRadius: '16px' } } : null} name={insert?.name || ''} onClose={() => setInsert(null)} />
  </>;
}