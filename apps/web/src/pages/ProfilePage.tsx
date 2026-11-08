import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Calendar, Check, FolderOpen, Globe, Image as ImageIcon, Mail, Save, Settings2, ShieldCheck, UserRound, X } from 'lucide-react';
import type { MediaAsset } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useProjects, formatDate } from '../lib/data';
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeading, Spinner, useToast } from '../components/ui';

export default function ProfilePage() {
  const { user, refresh } = useAuth(); const { t, language, setLanguage } = useI18n(); const { toast } = useToast(); const projects = useProjects();
  const [name, setName] = useState(user?.name || ''); const [avatar, setAvatar] = useState(user?.avatar || ''); const [saving, setSaving] = useState(false); const [picker, setPicker] = useState(false);
  const media = useQuery({ queryKey: ['media', '', ''], queryFn: () => api<{ assets: MediaAsset[] }>('/media'), enabled: picker });
  useEffect(() => { setName(user?.name || ''); setAvatar(user?.avatar || ''); }, [user?.name, user?.avatar]);
  const list = projects.data?.projects || [];
  async function save() { setSaving(true); try { await api('/account', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), avatar: avatar || null }) }); await refresh(); toast(t('Profile updated', 'Profil zaktualizowany'), 'success'); } catch (err) { toast(apiError(err), 'error'); } finally { setSaving(false); } }
  return <>
    <PageHeading eyebrow={t('MY PROFILE', 'MÓJ PROFIL')} title={t('The person behind the pixels.', 'Osoba stojąca za pikselami.')} description={t('Your public identity inside the workspace, account details and a snapshot of what you have built.', 'Twoja tożsamość w przestrzeni roboczej, dane konta i migawka tego, co już stworzyłeś.')} actions={<Link className="button button-secondary button-md" to="/settings"><Settings2 size={16} />{t('Account settings', 'Ustawienia konta')}</Link>} />
    <div className="profile-grid">
      <section className="profile-card profile-main"><div className="profile-avatar-wrap"><div className="profile-avatar">{avatar ? <img src={avatar} alt="" /> : (name || user?.name || 'U').charAt(0).toUpperCase()}</div><button className="icon-button profile-avatar-edit" title={t('Change avatar', 'Zmień avatar')} onClick={() => setPicker(true)}><ImageIcon size={15} /></button></div>
        <div className="profile-identity"><h2>{user?.name}</h2><span><Mail size={14} />{user?.email}</span><Badge tone="purple">ULTRA</Badge></div>
        <div className="form-stack"><Field label={t('Display name', 'Wyświetlana nazwa')}><Input value={name} onChange={e => setName(e.target.value)} maxLength={100} /></Field><Field label={t('Email address', 'Adres e-mail')} hint={t('Contact support to change your sign-in email.', 'Skontaktuj się z pomocą, aby zmienić e-mail logowania.')}><Input value={user?.email || ''} disabled /></Field><Field label={t('Language', 'Język')}><div className="language-options"><button type="button" className={language === 'pl' ? 'active' : ''} onClick={() => setLanguage('pl')}><span>PL</span>Polski{language === 'pl' && <Check size={13} />}</button><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}><span>EN</span>English{language === 'en' && <Check size={13} />}</button></div></Field><Button loading={saving} disabled={!name.trim()} onClick={() => void save()}><Save size={16} />{t('Save profile', 'Zapisz profil')}</Button></div>
      </section>
      <div className="profile-side">
        <section className="profile-card"><div className="settings-card-head"><UserRound size={18} /><h2>{t('Account', 'Konto')}</h2></div><dl className="profile-facts"><div><dt><Calendar size={14} />{t('Member since', 'Członek od')}</dt><dd>{user ? formatDate(user.createdAt, language) : '—'}</dd></div><div><dt><ShieldCheck size={14} />{t('Security', 'Bezpieczeństwo')}</dt><dd><Link to="/settings">{t('Password & sessions', 'Hasło i sesje')}<ArrowUpRight size={12} /></Link></dd></div></dl></section>
        <section className="profile-card"><div className="settings-card-head"><FolderOpen size={18} /><h2>{t('Your work', 'Twoje prace')}</h2></div><div className="profile-stats"><div><strong>{list.length}</strong><span>{t('Projects', 'Projekty')}</span></div><div><strong>{list.filter(p => p.publishedSlug).length}</strong><span>{t('Published', 'Opublikowane')}</span></div><div><strong>{list.reduce((sum, p) => sum + p.document.pages.length, 0)}</strong><span>{t('Pages', 'Podstrony')}</span></div></div><Link className="button button-secondary button-sm" to="/projects">{t('View projects', 'Zobacz projekty')}<ArrowUpRight size={13} /></Link></section>
        <section className="profile-card"><div className="settings-card-head"><Globe size={18} /><h2>{t('Recent activity', 'Ostatnia aktywność')}</h2></div><RecentActivity /></section>
      </div>
    </div>
    <Modal open={picker} onClose={() => setPicker(false)} title={t('Choose an avatar', 'Wybierz avatar')} className="media-preview-modal" footer={<><Button variant="ghost" onClick={() => { setAvatar(''); setPicker(false); }}><X size={15} />{t('Remove avatar', 'Usuń avatar')}</Button><Button onClick={() => setPicker(false)}><Check size={15} />{t('Done', 'Gotowe')}</Button></>}>
      {media.isLoading ? <Spinner /> : media.data?.assets.length ? <div className="avatar-picker">{media.data.assets.map(asset => <button key={asset.id} className={avatar === asset.url ? 'active' : ''} onClick={() => setAvatar(asset.url)}><img src={asset.url} alt={asset.name} /></button>)}</div> : <EmptyState icon={<ImageIcon size={26} />} title={t('No images yet', 'Brak obrazów')} description={t('Upload images in the Media library, then choose one here.', 'Prześlij obrazy w Bibliotece mediów, a potem wybierz jeden tutaj.')} action={<Link className="button button-secondary button-md" to="/media" onClick={() => setPicker(false)}>{t('Open media library', 'Otwórz bibliotekę mediów')}</Link>} />}
    </Modal>
  </>;
}
function RecentActivity() {
  const { t, language } = useI18n(); const query = useQuery({ queryKey: ['activity'], queryFn: () => api<{ activities: { id: string; action: string; detail: string; createdAt: string }[] }>('/activity') });
  if (query.isLoading) return <Spinner />;
  const items = query.data?.activities.slice(0, 4) || [];
  return items.length ? <div className="profile-activity">{items.map(item => <div key={item.id}><span className="tiny-dot" /><div><strong>{item.detail || item.action}</strong><span>{formatDate(item.createdAt, language, true)}</span></div></div>)}</div> : <p className="muted">{t('Your story starts with your first project.', 'Twoja historia zaczyna się od pierwszego projektu.')}</p>;
}