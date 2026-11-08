import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Download, Globe, Pencil, RefreshCw, Search, Unlink, ExternalLink } from 'lucide-react';
import type { Project } from '@sitebuilder/shared/types';
import { api, apiError, downloadProject } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate, useInvalidate } from '../lib/data';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, PageHeading, Spinner, useToast } from '../components/ui';
import { ProjectThumbnail } from '../components/ProjectThumbnail';
import { PublishModal } from '../components/dashboard/ProjectCard';

type Publication = Project & { url: string };
export default function PublicationsPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const invalidate = useInvalidate();
  const query = useQuery({ queryKey: ['publications'], queryFn: () => api<{ publications: Publication[] }>('/publications') });
  const [search, setSearch] = useState(''); const [publish, setPublish] = useState<Publication | null>(null); const [unpublish, setUnpublish] = useState<Publication | null>(null); const [busy, setBusy] = useState(false);
  const items = (query.data?.publications || []).filter(item => `${item.name} ${item.publishedSlug}`.toLowerCase().includes(search.toLowerCase()));
  async function doUnpublish() { if (!unpublish) return; setBusy(true); try { await api(`/projects/${unpublish.id}/publish`, { method: 'DELETE' }); invalidate(); toast(t('Website unpublished', 'Strona wycofana z publikacji'), 'success'); setUnpublish(null); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function exportZip(item: Publication) { try { await downloadProject(item.id, item.name); toast(t('Export started', 'Eksport rozpoczęty'), 'success'); } catch (err) { toast(apiError(err), 'error'); } }
  return <>
    <PageHeading eyebrow={t('PUBLICATIONS', 'PUBLIKACJE')} title={t('Out in the world.', 'Dostępne dla świata.')} description={t('Every website you have published, with its live address and controls. Local addresses work on this server; public reach requires a public deployment.', 'Każda opublikowana strona z adresem na żywo i kontrolą. Lokalne adresy działają na tym serwerze; zasięg publiczny wymaga publicznego wdrożenia.')} actions={<Badge tone="green"><Globe size={12} />{query.data?.publications.length ?? 0} {t('live', 'online')}</Badge>} />
    <div className="list-toolbar"><div className="search-input"><Search size={16} /><Input aria-label={t('Search publications', 'Szukaj publikacji')} placeholder={t('Search by name or address…', 'Szukaj po nazwie lub adresie…')} value={search} onChange={e => setSearch(e.target.value)} /></div></div>
    {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={apiError(query.error)} retry={() => void query.refetch()} /> : items.length ? <div className="publications-grid">{items.map(item => <article className="publication-card" key={item.id}>
      <Link to={`/editor/${item.id}`} className="publication-thumb"><ProjectThumbnail document={item.document} title={item.name} /><span className="preview-status"><span />{t('Live', 'Online')}</span></Link>
      <div className="publication-body">
        <div className="publication-title"><h3>{item.name}</h3><Badge tone="green">{t('Published', 'Opublikowana')}</Badge></div>
        <a className="publication-url" href={item.url} target="_blank" rel="noreferrer">{item.url}<ExternalLink size={13} /></a>
        <div className="publication-meta"><span>{t('Published', 'Opublikowano')} {item.publishedAt ? formatDate(item.publishedAt, language, true) : '—'}</span><span>{item.document.pages.length} {t('pages', 'podstrony')}</span></div>
        <div className="publication-actions">
          <Button size="sm" variant="secondary" onClick={() => window.open(item.url, '_blank', 'noopener')}><ArrowUpRight size={14} />{t('Visit', 'Odwiedź')}</Button>
          <Button size="sm" variant="secondary" onClick={() => setPublish(item)}><RefreshCw size={14} />{t('Update', 'Aktualizuj')}</Button>
          <Link className="button button-secondary button-sm" to={`/editor/${item.id}`}><Pencil size={14} />{t('Edit', 'Edytuj')}</Link>
          <button className="icon-button" title={t('Export ZIP', 'Eksportuj ZIP')} onClick={() => void exportZip(item)}><Download size={16} /></button>
          <button className="icon-button danger-text" title={t('Unpublish', 'Wycofaj publikację')} onClick={() => setUnpublish(item)}><Unlink size={16} /></button>
        </div>
      </div>
    </article>)}</div> : <EmptyState icon={<Globe size={28} />} title={search ? t('No matching publications', 'Brak pasujących publikacji') : t('Nothing published yet', 'Brak opublikowanych stron')} description={t('Open a project and choose Publish to give it a live address.', 'Otwórz projekt i wybierz Opublikuj, aby nadać mu adres na żywo.')} action={<Link className="button button-primary button-md" to="/projects">{t('Go to projects', 'Przejdź do projektów')}<ArrowUpRight size={15} /></Link>} />}
    <PublishModal project={publish} onClose={() => setPublish(null)} />
    <Modal open={!!unpublish} onClose={() => !busy && setUnpublish(null)} title={t('Unpublish website?', 'Wycofać stronę z publikacji?')} footer={<><Button variant="ghost" onClick={() => setUnpublish(null)} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void doUnpublish()}><Unlink size={15} />{t('Unpublish', 'Wycofaj')}</Button></>}><p className="muted">{t('The live address will stop working. Your project and its content stay safe, and you can publish again anytime.', 'Adres na żywo przestanie działać. Projekt i jego treść pozostaną bezpieczne; możesz opublikować ponownie w dowolnej chwili.')}</p></Modal>
  </>;
}