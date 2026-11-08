import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Blocks, Boxes, Eye, Image, LayoutGrid, MousePointer2, Plus, Search, ShoppingBag, Trash2, Type, Sparkles, ArrowUpRight } from 'lucide-react';
import { LIBRARY, documentFromSpecs } from '@sitebuilder/shared';
import type { LibraryItem, NodeSpec } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useInvalidate } from '../lib/data';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, PageHeading, Spinner, Tabs, useToast } from '../components/ui';
import { WebsitePreview } from '../components/ProjectThumbnail';
import { InsertIntoProjectModal } from '../components/dashboard/InsertIntoProjectModal';

type SavedComponent = { id: string; name: string; spec: NodeSpec; createdAt: string };
const categoryMeta = {
  text: { icon: Type, en: 'Text', pl: 'Tekst' }, media: { icon: Image, en: 'Media', pl: 'Media' },
  layout: { icon: LayoutGrid, en: 'Layout', pl: 'Układ' }, interactive: { icon: MousePointer2, en: 'Interactive', pl: 'Interakcje' },
  commerce: { icon: ShoppingBag, en: 'E-commerce', pl: 'E-commerce' }, sections: { icon: Boxes, en: 'Sections', pl: 'Sekcje' },
} as const;

export default function ComponentsPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const invalidate = useInvalidate(); const client = useQueryClient();
  const [tab, setTab] = useState('all'); const [category, setCategory] = useState('all'); const [search, setSearch] = useState(''); const [visible, setVisible] = useState(24);
  const [preview, setPreview] = useState<{ name: string; spec: NodeSpec; description?: string } | null>(null);
  const [insert, setInsert] = useState<{ name: string; spec: NodeSpec } | null>(null);
  const [remove, setRemove] = useState<SavedComponent | null>(null); const [busy, setBusy] = useState(false);
  const saved = useQuery({ queryKey: ['components'], queryFn: () => api<{ components: SavedComponent[] }>('/components') });
  const savedList = saved.data?.components || [];
  const filtered = useMemo(() => LIBRARY.filter(item => (category === 'all' || item.category === category) && `${item.name} ${item.namePl} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [category, search]);
  const filteredSaved = useMemo(() => savedList.filter(item => item.name.toLowerCase().includes(search.toLowerCase())), [savedList, search]);
  const showLibrary = tab === 'all' || tab === 'elements' || tab === 'sections';
  const libraryItems = tab === 'sections' ? filtered.filter(item => item.category === 'sections') : tab === 'elements' ? filtered.filter(item => item.category !== 'sections') : filtered;
  const shown = libraryItems.slice(0, visible);
  const previewDoc = useMemo(() => preview ? documentFromSpecs([preview.spec], undefined, language) : null, [preview, language]);
  async function deleteSaved() { if (!remove) return; setBusy(true); try { await api(`/components/${remove.id}`, { method: 'DELETE' }); await client.invalidateQueries({ queryKey: ['components'] }); invalidate(); toast(t('Component removed', 'Komponent usunięty'), 'success'); setRemove(null); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  return <>
    <PageHeading eyebrow={t('COMPONENT LIBRARY', 'BIBLIOTEKA KOMPONENTÓW')} title={t('Building blocks, beautifully made.', 'Klocki, które tworzą całość.')} description={t(`${LIBRARY.length} ready-made elements and sections, plus your own saved components. Drag, drop, and make them yours.`, `${LIBRARY.length} gotowych elementów i sekcji oraz Twoje zapisane komponenty. Przeciągnij, upuść i nadaj im swój styl.`)} actions={<Badge tone="purple"><Sparkles size={12} />{LIBRARY.length}+ {t('variants', 'wariantów')}</Badge>} />
    <div className="filter-bar">
      <Tabs value={tab} onChange={value => { setTab(value); setVisible(24); }} tabs={[{ value: 'all', label: t('All', 'Wszystkie'), count: LIBRARY.length + savedList.length }, { value: 'sections', label: t('Sections', 'Sekcje'), count: LIBRARY.filter(i => i.category === 'sections').length }, { value: 'elements', label: t('Elements', 'Elementy'), count: LIBRARY.filter(i => i.category !== 'sections').length }, { value: 'saved', label: t('My components', 'Moje komponenty'), count: savedList.length }]} />
      <div className="search-input"><Search size={16} /><Input aria-label={t('Search components', 'Szukaj komponentów')} placeholder={t('Search components…', 'Szukaj komponentów…')} value={search} onChange={e => { setSearch(e.target.value); setVisible(24); }} /></div>
    </div>
    {showLibrary && tab !== 'sections' && tab !== 'elements' && <div className="filter-chips component-categories">{[{ id: 'all', en: 'All categories', pl: 'Wszystkie kategorie' }, ...Object.entries(categoryMeta).map(([id, meta]) => ({ id, en: meta.en, pl: meta.pl }))].map(item => <button key={item.id} className={`chip ${category === item.id ? 'active' : ''}`} onClick={() => { setCategory(item.id); setVisible(24); }}>{t(item.en, item.pl)}<span>{item.id === 'all' ? LIBRARY.length : LIBRARY.filter(i => i.category === item.id).length}</span></button>)}</div>}
    {tab === 'saved' ? (saved.isLoading ? <Spinner /> : saved.error ? <ErrorState message={apiError(saved.error)} retry={() => void saved.refetch()} /> : filteredSaved.length ? <div className="components-grid">{filteredSaved.map(component => <article className="component-card" key={component.id}>
      <div className="component-visual variant-saved"><Blocks size={30} /><span className="component-type">{t('Saved', 'Zapisany')}</span></div>
      <div className="component-body"><h3>{component.name}</h3><p>{t('Your reusable component, ready for any project.', 'Twój komponent wielokrotnego użytku, gotowy do każdego projektu.')}</p><div className="component-actions"><Button size="sm" variant="secondary" onClick={() => setPreview({ name: component.name, spec: component.spec })}><Eye size={14} />{t('Preview', 'Podgląd')}</Button><Button size="sm" onClick={() => setInsert({ name: component.name, spec: component.spec })}><Plus size={14} />{t('Use', 'Użyj')}</Button><button className="icon-button danger-text" aria-label={t('Delete component', 'Usuń komponent')} onClick={() => setRemove(component)}><Trash2 size={15} /></button></div></div>
    </article>)}</div> : <EmptyState icon={<Blocks size={28} />} title={t('No saved components yet', 'Brak zapisanych komponentów')} description={t('Select any element in the editor and choose “Save to library” to reuse it here.', 'Zaznacz element w edytorze i wybierz „Zapisz w bibliotece”, aby używać go ponownie.')} />) : <>
      {shown.length ? <div className="components-grid">{shown.map((item: LibraryItem) => { const meta = categoryMeta[item.category]; const Icon = meta.icon; return <article className="component-card" key={item.id}>
        <button className={`component-visual variant-${item.category}`} onClick={() => setPreview({ name: language === 'pl' ? item.namePl : item.name, spec: item.spec, description: item.description })} aria-label={`${t('Preview', 'Podgląd')} ${item.name}`}>
          <Icon size={30} />{item.category === 'sections' && <span className="component-lines"><i /><i /><i /></span>}<span className="component-hover"><Eye size={16} />{t('Preview', 'Podgląd')}</span><span className="component-type">{t(meta.en, meta.pl)}</span>
        </button>
        <div className="component-body"><h3>{language === 'pl' ? item.namePl : item.name}</h3><p>{item.description}</p><div className="component-actions"><Button size="sm" variant="secondary" onClick={() => setPreview({ name: language === 'pl' ? item.namePl : item.name, spec: item.spec, description: item.description })}><Eye size={14} />{t('Preview', 'Podgląd')}</Button><Button size="sm" onClick={() => setInsert({ name: language === 'pl' ? item.namePl : item.name, spec: item.spec })}>{t('Use', 'Użyj')}<ArrowUpRight size={13} /></Button></div></div>
      </article>; })}</div> : <EmptyState icon={<Search size={26} />} title={t('No components match', 'Brak pasujących komponentów')} description={t('Try a different search or category.', 'Spróbuj innej frazy lub kategorii.')} action={<Button variant="secondary" onClick={() => { setSearch(''); setCategory('all'); }}>{t('Clear filters', 'Wyczyść filtry')}</Button>} />}
      {visible < libraryItems.length && <div className="load-more"><Button variant="secondary" onClick={() => setVisible(value => value + 24)}>{t('Load more', 'Załaduj więcej')} ({libraryItems.length - visible})</Button></div>}
    </>}
    <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || ''} className="template-preview-modal" footer={<><span className="muted">{t('Fully editable after insertion', 'W pełni edytowalny po dodaniu')}</span><Button onClick={() => { if (preview) { setInsert({ name: preview.name, spec: preview.spec }); setPreview(null); } }}><Plus size={15} />{t('Add to project', 'Dodaj do projektu')}</Button></>}>
      {preview?.description && <p className="muted">{preview.description}</p>}{previewDoc && <WebsitePreview document={previewDoc} title={preview?.name || 'Component'} />}
    </Modal>
    <InsertIntoProjectModal open={!!insert} spec={insert?.spec || null} name={insert?.name || ''} onClose={() => setInsert(null)} />
    <Modal open={!!remove} onClose={() => !busy && setRemove(null)} title={t('Delete saved component?', 'Usunąć zapisany komponent?')} footer={<><Button variant="ghost" onClick={() => setRemove(null)} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void deleteSaved()}><Trash2 size={15} />{t('Delete', 'Usuń')}</Button></>}><p className="muted">{t('This only removes it from your library. Projects already using it are not affected.', 'To usunie go tylko z biblioteki. Projekty, które już go używają, pozostaną bez zmian.')}</p></Modal>
  </>;
}