import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Eye, Layers, Plus, Search, Sparkles } from 'lucide-react';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@sitebuilder/shared';
import type { SiteTemplate } from '@sitebuilder/shared/types';
import { useI18n } from '../lib/i18n';
import { Badge, Button, EmptyState, Input, Modal, PageHeading } from '../components/ui';
import { ProjectThumbnail, WebsitePreview } from '../components/ProjectThumbnail';
import { NewProjectModal } from '../components/dashboard/NewProjectModal';

export default function TemplatesPage() {
  const { t, language } = useI18n(); const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState('All'); const [search, setSearch] = useState(''); const [visible, setVisible] = useState(12); const [create, setCreate] = useState<string | null>(null);
  const preview = TEMPLATES.find(item => item.id === params.get('preview')) || null;
  const filtered = useMemo(() => TEMPLATES.filter(item => (category === 'All' || item.category === category) && `${item.name} ${item.description} ${item.descriptionPl || ''} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name)), [category, search]);
  const shown = filtered.slice(0, visible);
  const previews = useMemo(() => new Map(shown.map(item => [item.id, item.create(language)])), [shown, language]);
  const previewDoc = useMemo(() => preview?.create(language), [preview, language]);
  const use = (item: SiteTemplate) => { setParams({}); setCreate(item.id); };
  return <>
    <PageHeading eyebrow={t('TEMPLATE LIBRARY', 'BIBLIOTEKA SZABLONÓW')} title={t('A beautiful head start.', 'Piękny punkt wyjścia.')} description={t(`${TEMPLATES.length} fully editable, multi-page templates across ${TEMPLATE_CATEGORIES.length} categories. Every element is yours to change.`, `${TEMPLATES.length} w pełni edytowalnych, wielostronicowych szablonów w ${TEMPLATE_CATEGORIES.length} kategoriach. Każdy element możesz zmienić.`)} actions={<Button variant="secondary" onClick={() => setCreate('')}><Plus size={16} />{t('Blank canvas', 'Czysta karta')}</Button>} />
    <div className="filter-bar"><div className="filter-chips" role="tablist">{['All', ...TEMPLATE_CATEGORIES].map(item => <button key={item} role="tab" aria-selected={category === item} className={`chip ${category === item ? 'active' : ''}`} onClick={() => { setCategory(item); setVisible(12); }}>{item === 'All' ? t('All', 'Wszystkie') : item}<span>{item === 'All' ? TEMPLATES.length : TEMPLATES.filter(template => template.category === item).length}</span></button>)}</div><div className="search-input"><Search size={16} /><Input aria-label={t('Search templates', 'Szukaj szablonów')} placeholder={t('Search templates…', 'Szukaj szablonów…')} value={search} onChange={e => { setSearch(e.target.value); setVisible(12); }} /></div></div>
    {shown.length ? <div className="templates-grid">{shown.map(item => <article className="template-card" key={item.id}>
      <button className="template-card-thumb" onClick={() => setParams({ preview: item.id })} aria-label={`${t('Preview', 'Podgląd')} ${item.name}`}><ProjectThumbnail document={previews.get(item.id)!} title={item.name} /><span className="template-card-overlay"><Eye size={18} />{t('Live preview', 'Podgląd na żywo')}</span>{item.featured && <span className="template-featured"><Sparkles size={11} />{t('Featured', 'Wyróżniony')}</span>}</button>
      <div className="template-card-body"><div className="template-card-title"><h3>{item.name}</h3><Badge tone="purple">{item.category}</Badge></div><p>{language === 'pl' ? item.descriptionPl || item.description : item.description}</p><div className="template-card-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</div><div className="template-card-actions"><Button variant="secondary" size="sm" onClick={() => setParams({ preview: item.id })}><Eye size={14} />{t('Preview', 'Podgląd')}</Button><Button size="sm" onClick={() => use(item)}>{t('Use template', 'Użyj szablonu')}<ArrowUpRight size={14} /></Button></div></div>
    </article>)}</div> : <EmptyState icon={<Layers size={28} />} title={t('No templates match', 'Brak pasujących szablonów')} description={t('Try another category or search term.', 'Wypróbuj inną kategorię lub frazę.')} action={<Button variant="secondary" onClick={() => { setSearch(''); setCategory('All'); }}>{t('Clear filters', 'Wyczyść filtry')}</Button>} />}
    {visible < filtered.length && <div className="load-more"><Button variant="secondary" onClick={() => setVisible(value => value + 12)}>{t('Load more templates', 'Załaduj więcej szablonów')} ({filtered.length - visible})</Button></div>}
    <Modal open={!!preview} onClose={() => setParams({})} title={preview?.name || ''} className="template-preview-modal" footer={<><span className="muted">{previewDoc?.pages.length} {t('pages', 'podstrony')} · {Object.keys(previewDoc?.nodes || {}).length} {t('editable elements', 'edytowalnych elementów')}</span><Button onClick={() => preview && use(preview)}>{t('Use this template', 'Użyj tego szablonu')}<ArrowUpRight size={15} /></Button></>}>
      {preview && previewDoc && <><p className="muted">{language === 'pl' ? preview.descriptionPl || preview.description : preview.description}</p><WebsitePreview document={previewDoc} title={preview.name} /></>}
    </Modal>
    <NewProjectModal open={create !== null} onClose={() => setCreate(null)} templateId={create || undefined} />
  </>;
}