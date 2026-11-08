import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Globe, Link2, Plus, RefreshCw, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import type { Domain } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useProjects, useInvalidate, formatDate } from '../lib/data';
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, PageHeading, Select, Spinner, useToast } from '../components/ui';

type DomainRow = Domain & { projectName: string; publishedSlug: string | null };
export default function DomainsPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const client = useQueryClient(); const invalidate = useInvalidate();
  const domains = useQuery({ queryKey: ['domains'], queryFn: () => api<{ domains: DomainRow[] }>('/domains') });
  const projects = useProjects();
  const [add, setAdd] = useState(false); const [hostname, setHostname] = useState(''); const [projectId, setProjectId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [remove, setRemove] = useState<DomainRow | null>(null); const [copied, setCopied] = useState('');
  const list = domains.data?.domains || []; const projectList = projects.data?.projects || [];
  const refresh = () => { void client.invalidateQueries({ queryKey: ['domains'] }); invalidate(); };
  async function create() { setBusy(true); setError(''); try { await api('/domains', { method: 'POST', body: JSON.stringify({ hostname: hostname.trim(), projectId }) }); refresh(); setAdd(false); setHostname(''); setProjectId(''); toast(t('Domain added. Verify the TXT record to activate it.', 'Domena dodana. Zweryfikuj rekord TXT, aby ją aktywować.'), 'success'); } catch (err) { setError(apiError(err)); } finally { setBusy(false); } }
  async function verify(domain: DomainRow) { setBusy(true); try { await api(`/domains/${domain.id}/verify`, { method: 'POST' }); refresh(); toast(t('Domain verified', 'Domena zweryfikowana'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function doRemove() { if (!remove) return; setBusy(true); try { await api(`/domains/${remove.id}`, { method: 'DELETE' }); refresh(); setRemove(null); toast(t('Domain removed', 'Domena usunięta'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); } }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(''), 1600); } catch { toast(t('Copy failed', 'Kopiowanie nieudane'), 'error'); } }
  const host = window.location.hostname;
  return <>
    <PageHeading eyebrow={t('CUSTOM DOMAINS', 'WŁASNE DOMENY')} title={t('Your name, your address.', 'Twoja nazwa, Twój adres.')} description={t('Connect a domain you own to a published website. Ownership is verified with a DNS TXT record.', 'Podłącz własną domenę do opublikowanej strony. Własność jest weryfikowana rekordem DNS TXT.')} actions={<Button onClick={() => setAdd(true)}><Plus size={16} />{t('Connect domain', 'Podłącz domenę')}</Button>} />
    <div className="callout domain-guide"><ShieldCheck size={24} /><div><strong>{t('How verification works', 'Jak działa weryfikacja')}</strong><ol><li>{t('Add the TXT record below at your DNS provider.', 'Dodaj poniższy rekord TXT u swojego dostawcy DNS.')}</li><li>{t(`Point your domain to this server (A record to ${host}, or CNAME to your deployment host).`, `Skieruj domenę na ten serwer (rekord A na ${host} lub CNAME na host wdrożenia).`)}</li><li>{t('Press Verify. DNS changes can take up to 48 hours to propagate.', 'Naciśnij Weryfikuj. Zmiany DNS mogą propagować się do 48 godzin.')}</li></ol></div></div>
    {domains.isLoading ? <Spinner /> : domains.error ? <ErrorState message={apiError(domains.error)} retry={() => void domains.refetch()} /> : list.length ? <div className="domains-list">{list.map(domain => <article className="domain-card" key={domain.id}>
      <div className="domain-head"><span className="domain-icon"><Globe size={20} /></span><div><h3>{domain.hostname}</h3><span>{domain.projectName}{domain.publishedSlug ? ` · /sites/${domain.publishedSlug}/` : ` · ${t('not published', 'nieopublikowana')}`}</span></div><Badge tone={domain.verified ? 'green' : 'amber'}>{domain.verified ? <><CheckCircle2 size={12} />{t('Verified', 'Zweryfikowana')}</> : <><AlertTriangle size={12} />{t('Pending', 'Oczekuje')}</>}</Badge></div>
      {!domain.verified && <div className="domain-txt"><div><span>{t('TXT record', 'Rekord TXT')} · {domain.hostname}</span><code>{domain.token}</code></div><button className="icon-button" title={t('Copy TXT value', 'Kopiuj wartość TXT')} onClick={() => void copy(domain.token)}>{copied === domain.token ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button></div>}
      <div className="domain-foot"><span>{t('Added', 'Dodano')} {formatDate(domain.createdAt, language)}</span><div className="domain-actions">{!domain.verified && <Button size="sm" variant="secondary" loading={busy} onClick={() => void verify(domain)}><RefreshCw size={14} />{t('Verify', 'Weryfikuj')}</Button>}{domain.verified && domain.publishedSlug && <a className="button button-secondary button-sm" href={`http://${domain.hostname}/`} target="_blank" rel="noreferrer"><Link2 size={14} />{t('Open', 'Otwórz')}</a>}<button className="icon-button danger-text" title={t('Remove domain', 'Usuń domenę')} onClick={() => setRemove(domain)}><Trash2 size={16} /></button></div></div>
    </article>)}</div> : <EmptyState icon={<Link2 size={28} />} title={t('No domains connected', 'Brak podłączonych domen')} description={t('Publish a website first, then connect a domain you own.', 'Najpierw opublikuj stronę, a potem podłącz własną domenę.')} action={<Button variant="secondary" onClick={() => setAdd(true)}><Plus size={15} />{t('Connect your first domain', 'Podłącz pierwszą domenę')}</Button>} />}
    <Modal open={add} onClose={() => !busy && setAdd(false)} title={t('Connect a domain', 'Podłącz domenę')}><form className="form-stack" onSubmit={e => { e.preventDefault(); void create(); }}>
      <Field label={t('Domain name', 'Nazwa domeny')} hint={t('A public hostname you control, e.g. studio.example.com', 'Publiczna nazwa hosta, którą kontrolujesz, np. studio.example.com')}><Input required value={hostname} onChange={e => setHostname(e.target.value)} placeholder="studio.example.com" autoFocus /></Field>
      <Field label={t('Website', 'Strona')}><Select required value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">{t('Select a project…', 'Wybierz projekt…')}</option>{projectList.map(project => <option key={project.id} value={project.id}>{project.name}{project.publishedSlug ? '' : ` (${t('draft', 'szkic')})`}</option>)}</Select></Field>
      {!projectList.length && <p className="muted">{t('Create and publish a project first.', 'Najpierw utwórz i opublikuj projekt.')}</p>}
      {error && <div className="inline-error" role="alert">{error}</div>}
      <div className="form-actions"><Button variant="ghost" onClick={() => setAdd(false)}>{t('Cancel', 'Anuluj')}</Button><Button type="submit" loading={busy} disabled={!hostname.trim() || !projectId}><Plus size={15} />{t('Add domain', 'Dodaj domenę')}</Button></div>
    </form></Modal>
    <Modal open={!!remove} onClose={() => !busy && setRemove(null)} title={t('Remove domain?', 'Usunąć domenę?')} footer={<><Button variant="ghost" onClick={() => setRemove(null)} disabled={busy}>{t('Cancel', 'Anuluj')}</Button><Button variant="danger" loading={busy} onClick={() => void doRemove()}><Trash2 size={15} />{t('Remove', 'Usuń')}</Button></>}><p className="muted">{t('The domain will no longer serve your website. You can reconnect it later.', 'Domena przestanie serwować Twoją stronę. Możesz podłączyć ją ponownie później.')}</p></Modal>
  </>;
}