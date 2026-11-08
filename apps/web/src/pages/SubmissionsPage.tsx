import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, Inbox, Search, Trash2, Check } from 'lucide-react';
import type { Submission } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate, useInvalidate } from '../lib/data';
import { Badge, Button, EmptyState, ErrorState, Input, Modal, PageHeading, Spinner, useToast } from '../components/ui';

type Row = Submission & { projectName: string };
export default function SubmissionsPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const client = useQueryClient(); const invalidate = useInvalidate();
  const [search, setSearch] = useState(''); const [detail, setDetail] = useState<Row | null>(null); const [remove, setRemove] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  const query = useQuery({ queryKey: ['submissions', search], queryFn: () => api<{ submissions: Row[] }>(`/submissions?search=${encodeURIComponent(search)}`) });
  const rows = query.data?.submissions || [];
  async function doDelete() { if (!remove) return; setBusy(true); try { await api(`/submissions/${remove.id}`, { method: 'DELETE' }); void client.invalidateQueries({ queryKey: ['submissions'] }); invalidate(); setRemove(null); toast(t('Submission deleted', 'Zgłoszenie usunięte'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  function exportCSV() {
    const keys = [...new Set(rows.flatMap(row => Object.keys(row.data)))];
    const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [['project', 'form', 'page', 'date', ...keys].map(escape).join(','), ...rows.map(row => [row.projectName, row.formName, row.pageSlug, row.createdAt, ...keys.map(key => row.data[key] || '')].map(escape).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'submissions.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyJSON() { if (!detail) return; try { await navigator.clipboard.writeText(JSON.stringify(detail.data, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { toast(t('Copy failed', 'Kopiowanie nieudane'), 'error'); } }
  return <>
    <PageHeading eyebrow={t('FORM SUBMISSIONS', 'ZGŁOSZENIA FORMULARZY')} title={t('Conversations, started.', 'Rozpoczęte rozmowy.')} description={t('Every message sent through your published contact, newsletter and order forms, stored privately in your account.', 'Każda wiadomość z opublikowanych formularzy kontaktowych, newsletterów i zamówień, przechowywana prywatnie na Twoim koncie.')} actions={<Button variant="secondary" disabled={!rows.length} onClick={exportCSV}><Download size={16} />{t('Export CSV', 'Eksport CSV')}</Button>} />
    <div className="list-toolbar"><div className="search-input"><Search size={16} /><Input aria-label={t('Search submissions', 'Szukaj zgłoszeń')} placeholder={t('Search messages, emails, projects…', 'Szukaj wiadomości, e-maili, projektów…')} value={search} onChange={e => setSearch(e.target.value)} /></div><Badge tone="purple">{rows.length} {t('records', 'rekordów')}</Badge></div>
    {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={apiError(query.error)} retry={() => void query.refetch()} /> : rows.length ? <div className="submissions-list">{rows.map(row => { const preview = Object.entries(row.data).filter(([key]) => key !== 'email').map(([, value]) => value).join(' · ').slice(0, 140); return <button className="submission-row" key={row.id} onClick={() => setDetail(row)}>
      <span className="submission-icon"><Inbox size={18} /></span>
      <div className="submission-main"><div><strong>{row.data.name || row.data.email || row.formName}</strong><Badge>{row.formName}</Badge></div><p>{preview || t('No preview available', 'Brak podglądu')}</p><span>{row.projectName} · /{row.pageSlug || 'home'} · {formatDate(row.createdAt, language, true)}</span></div>
      <span className="submission-email">{row.data.email || ''}</span>
    </button>; })}</div> : <EmptyState icon={<Inbox size={28} />} title={search ? t('No matching submissions', 'Brak pasujących zgłoszeń') : t('Your inbox is quiet', 'Twoja skrzynka jest cicha')} description={t('Add a contact or newsletter form to a published website. Messages will arrive here.', 'Dodaj formularz kontaktowy lub newsletter do opublikowanej strony. Wiadomości trafią tutaj.')} />}
    <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.formName} · ${detail.projectName}` : ''} footer={<><Button variant="ghost" onClick={() => void copyJSON()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t('Copied', 'Skopiowano') : t('Copy JSON', 'Kopiuj JSON')}</Button><Button variant="danger" onClick={() => { setRemove(detail); setDetail(null); }}><Trash2 size={15} />{t('Delete', 'Usuń')}</Button></>}>
      {detail && <div className="submission-detail"><div className="submission-detail-meta"><span>{formatDate(detail.createdAt, language, true)}</span><span>/{detail.pageSlug || 'home'}</span></div><dl>{Object.entries(detail.data).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></div>}
    </Modal>
    <Modal open={!!remove} onClose={() => !busy && setRemove(null)} title={t('Delete submission?', 'Usunąć zgłoszenie?')} footer={<><Button variant="ghost" onClick={() => setRemove(null)} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void doDelete()}><Trash2 size={15} />{t('Delete', 'Usuń')}</Button></>}><p className="muted">{t('This permanently removes the message from your account.', 'To trwale usunie wiadomość z Twojego konta.')}</p></Modal>
  </>;
}