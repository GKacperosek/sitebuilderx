import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity as ActivityIcon, ArrowUpRight, Blocks, Download, Globe, Image, KeyRound, Link2, LogIn, Pencil, Plus, Search, Settings2, Trash2, UserRound, Inbox, RefreshCw } from 'lucide-react';
import type { Activity } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate } from '../lib/data';
import { Badge, EmptyState, ErrorState, Input, PageHeading, Spinner } from '../components/ui';

const icons: Record<string, typeof ActivityIcon> = { 'project.created': Plus, 'project.updated': Pencil, 'project.published': Globe, 'project.unpublished': Globe, 'project.duplicated': Blocks, 'project.trashed': Trash2, 'project.restored': RefreshCw, 'project.deleted': Trash2, 'project.version-restored': RefreshCw, 'media.uploaded': Image, 'media.deleted': Trash2, 'domain.added': Link2, 'domain.verified': Link2, 'domain.removed': Link2, 'component.saved': Blocks, 'account.registered': UserRound, 'account.login': LogIn, 'account.updated': Settings2, 'account.password-changed': KeyRound, 'account.password-reset': KeyRound, 'form.submitted': Inbox };
export default function ActivityPage() {
  const { t, language } = useI18n(); const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['activity', search], queryFn: () => api<{ activities: Activity[] }>(`/activity?limit=200&search=${encodeURIComponent(search)}`) });
  const items = query.data?.activities || [];
  const groups = items.reduce<Record<string, Activity[]>>((acc, item) => { const key = new Date(item.createdAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); (acc[key] ||= []).push(item); return acc; }, {});
  return <>
    <PageHeading eyebrow={t('ACTIVITY HISTORY', 'HISTORIA AKTYWNOŚCI')} title={t('The story of your workspace.', 'Historia Twojej przestrzeni.')} description={t('A private, chronological record of everything that happens in your account — projects, publications, media and security.', 'Prywatny, chronologiczny zapis wszystkiego, co dzieje się na Twoim koncie — projekty, publikacje, media i bezpieczeństwo.')} actions={<Badge tone="purple">{items.length} {t('events', 'zdarzeń')}</Badge>} />
    <div className="list-toolbar"><div className="search-input"><Search size={16} /><Input aria-label={t('Search activity', 'Szukaj aktywności')} placeholder={t('Search events…', 'Szukaj zdarzeń…')} value={search} onChange={e => setSearch(e.target.value)} /></div></div>
    {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={apiError(query.error)} retry={() => void query.refetch()} /> : items.length ? <div className="activity-timeline">{Object.entries(groups).map(([date, events]) => <section key={date}><div className="activity-date"><span />{date}</div>{events.map(item => { const Icon = icons[item.action] || ActivityIcon; return <div className="activity-row" key={item.id}><span className="activity-icon"><Icon size={16} /></span><div className="activity-body"><strong>{item.detail || item.action.replace(/\./g, ' · ')}</strong><span>{item.action} · {formatDate(item.createdAt, language, true)}</span></div>{item.projectId && <Link className="icon-button" to={`/editor/${item.projectId}`} title={t('Open project', 'Otwórz projekt')}><ArrowUpRight size={16} /></Link>}</div>; })}</section>)}</div> : <EmptyState icon={<ActivityIcon size={28} />} title={search ? t('No matching events', 'Brak pasujących zdarzeń') : t('A fresh start', 'Świeży start')} description={t('Create a project, upload an image or publish a website — your history builds itself.', 'Utwórz projekt, prześlij obraz lub opublikuj stronę — historia zapisuje się sama.')} />}
  </>;
}