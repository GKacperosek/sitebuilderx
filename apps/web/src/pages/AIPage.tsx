import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Copy, FileText, Globe, LayoutTemplate, Palette, Search, Sparkles, Wand2, KeyRound, Check, Loader2 } from 'lucide-react';
import type { NodeSpec, Project, SiteDocument } from '@sitebuilder/shared/types';
import { api, apiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useProjects, useInvalidate } from '../lib/data';
import { appendSpec, createProject, saveDocument } from '../lib/mutations';
import { Badge, Button, EmptyState, ErrorState, Field, Input, PageHeading, Select, Spinner, useToast } from '../components/ui';

type Mode = 'website' | 'section' | 'design' | 'text' | 'seo';
const modes: { id: Mode; icon: typeof Globe; en: string; pl: string; descEn: string; descPl: string }[] = [
  { id: 'website', icon: Globe, en: 'Whole website', pl: 'Cała strona', descEn: 'A complete multi-section site from a single prompt.', descPl: 'Kompletna wielosekcyjna strona z jednego opisu.' },
  { id: 'section', icon: LayoutTemplate, en: 'New section', pl: 'Nowa sekcja', descEn: 'Add a designed section to an existing project.', descPl: 'Dodaj zaprojektowaną sekcję do istniejącego projektu.' },
  { id: 'design', icon: Palette, en: 'Refresh design', pl: 'Odśwież design', descEn: 'Rework colors, typography and mood of a project.', descPl: 'Zmień kolory, typografię i nastrój projektu.' },
  { id: 'text', icon: FileText, en: 'Write copy', pl: 'Napisz tekst', descEn: 'Generate or improve headlines and body copy.', descPl: 'Generuj lub popraw nagłówki i treści.' },
  { id: 'seo', icon: Search, en: 'SEO description', pl: 'Opis SEO', descEn: 'A concise meta description for a page.', descPl: 'Zwięzły meta opis strony.' },
];
const examples: Record<Mode, { en: string; pl: string }[]> = {
  website: [{ en: 'A premium dark landing page for an AI analytics startup, with hero, features, pricing and FAQ.', pl: 'Premium ciemna strona startupu AI analitycznego: hero, funkcje, cennik i FAQ.' }, { en: 'A warm portfolio for a ceramic artist with a gallery, about story and contact form.', pl: 'Ciepłe portfolio artystki ceramiki z galerią, historią i formularzem kontaktowym.' }],
  section: [{ en: 'An elegant pricing section with three plans and a highlighted middle tier.', pl: 'Elegancki cennik z trzema planami i wyróżnionym środkowym.' }, { en: 'A bold testimonials section with large quotes and star ratings.', pl: 'Odważna sekcja opinii z dużymi cytatami i ocenami.' }],
  design: [{ en: 'Make it feel like a high-end fashion editorial: warm neutrals, serif headings.', pl: 'Niech wygląda jak luksusowy magazyn modowy: ciepłe neutralne kolory, szeryfowe nagłówki.' }, { en: 'More energetic: electric violet and cyan accents on deep graphite.', pl: 'Więcej energii: elektryczny fiolet i cyjan na głębokim graficie.' }],
  text: [{ en: 'Write a confident hero headline for a sustainable coffee brand.', pl: 'Napisz pewny nagłówek hero dla marki zrównoważonej kawy.' }, { en: 'Improve this copy to sound clearer and more human.', pl: 'Popraw ten tekst, aby brzmiał jaśniej i bardziej ludzko.' }],
  seo: [{ en: 'Meta description for a boutique architecture studio in Warsaw.', pl: 'Meta opis butikowego studia architektonicznego w Warszawie.' }, { en: 'Meta description for an online plant shop with fast delivery.', pl: 'Meta opis sklepu z roślinami online z szybką dostawą.' }],
};

export default function AIPage() {
  const { t, language } = useI18n(); const { toast } = useToast(); const navigate = useNavigate(); const invalidate = useInvalidate();
  const projects = useProjects();
  const status = useQuery({ queryKey: ['ai-status'], queryFn: () => api<{ configured: boolean; model: string }>('/ai/status'), retry: false });
  const [mode, setMode] = useState<Mode>('website'); const [prompt, setPrompt] = useState(''); const [name, setName] = useState(''); const [projectId, setProjectId] = useState(''); const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [result, setResult] = useState(''); const [copied, setCopied] = useState(false);
  const configured = status.data?.configured; const needsProject = mode === 'section' || mode === 'design'; const list = projects.data?.projects || [];
  async function generate() {
    if (!prompt.trim()) return; setBusy(true); setError(''); setResult('');
    try {
      if (mode === 'website') {
        const data = await api<{ document: SiteDocument }>('/ai/generate', { method: 'POST', body: JSON.stringify({ prompt, language, mode: 'website' }) });
        const project = await createProject({ name: name.trim() || t('AI website', 'Strona AI'), document: data.document });
        invalidate(); toast(t('Website generated. Every element is editable.', 'Strona wygenerowana. Każdy element jest edytowalny.'), 'success'); navigate(`/editor/${project.id}`);
      } else if (mode === 'section' || mode === 'design') {
        const project = list.find(item => item.id === projectId); if (!project) throw new Error(t('Choose a project first.', 'Najpierw wybierz projekt.'));
        if (mode === 'section') {
          const data = await api<{ spec: NodeSpec }>('/ai/generate', { method: 'POST', body: JSON.stringify({ prompt, language, mode: 'section', document: project.document }) });
          const updated = await appendSpec(project, data.spec); invalidate(); toast(t('Section added', 'Sekcja dodana'), 'success'); navigate(`/editor/${updated.id}`);
        } else {
          const data = await api<{ document: SiteDocument }>('/ai/design', { method: 'POST', body: JSON.stringify({ prompt, document: project.document }) });
          const updated = await saveDocument(project, data.document); invalidate(); toast(t('Design refreshed', 'Design odświeżony'), 'success'); navigate(`/editor/${updated.id}`);
        }
      } else {
        const data = await api<{ text: string }>('/ai/text', { method: 'POST', body: JSON.stringify({ prompt, text: source, action: mode === 'seo' ? 'seo' : source.trim() ? 'improve' : 'generate', language }) });
        setResult(data.text); toast(t('Copy ready', 'Tekst gotowy'), 'success');
      }
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }
  async function copyResult() { try { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { toast(t('Copy failed — select the text manually.', 'Kopiowanie nieudane — zaznacz tekst ręcznie.'), 'error'); } }
  async function insertResult() {
    const project = list.find(item => item.id === projectId) || list[0];
    if (!project) { toast(t('Create a project first.', 'Najpierw utwórz projekt.'), 'error'); return; }
    setBusy(true); try { const updated = await appendSpec(project, { type: 'paragraph', props: { text: result }, styles: { fontSize: '18px', maxWidth: '720px' } }); invalidate(); navigate(`/editor/${updated.id}`); } catch (err) { toast(apiError(err), 'error'); } finally { setBusy(false); }
  }
  return <>
    <PageHeading eyebrow={t('AI STUDIO', 'STUDIO AI')} title={t('From a spark to a website.', 'Od iskry do strony.')} description={t('Describe what you imagine. Gemini builds a real, fully editable structure — not a picture of one.', 'Opisz, co sobie wyobrażasz. Gemini zbuduje prawdziwą, w pełni edytowalną strukturę — nie jej obrazek.')} actions={<Badge tone={configured ? 'green' : 'amber'}>{configured ? <><Check size={12} />{t('Gemini connected', 'Gemini połączony')}</> : <><KeyRound size={12} />{t('Setup required', 'Wymagana konfiguracja')}</>}</Badge>} />
    {status.isLoading ? <Spinner /> : status.error ? <ErrorState message={apiError(status.error)} retry={() => void status.refetch()} /> : !configured && <div className="callout ai-setup"><KeyRound size={24} /><div><strong>{t('Connect Google Gemini to enable generation', 'Połącz Google Gemini, aby włączyć generowanie')}</strong><p>{t('Add GEMINI_API_KEY to the server .env file and restart the API. The key stays on the backend and is never exposed to the browser.', 'Dodaj GEMINI_API_KEY do pliku .env serwera i uruchom ponownie API. Klucz pozostaje na backendzie i nigdy nie trafia do przeglądarki.')}</p><code>GEMINI_API_KEY=your-key-here</code></div></div>}
    <div className="ai-mode-grid">{modes.map(item => <button key={item.id} className={`ai-mode-card ${mode === item.id ? 'active' : ''}`} onClick={() => { setMode(item.id); setError(''); setResult(''); }}><span className="ai-mode-icon"><item.icon size={21} /></span><strong>{t(item.en, item.pl)}</strong><span>{t(item.descEn, item.descPl)}</span>{mode === item.id && <i className="ai-mode-check"><Check size={12} /></i>}</button>)}</div>
    <div className="ai-workspace">
      <section className="ai-prompt-panel">
        <div className="ai-panel-heading"><Sparkles size={17} /><h2>{t('Describe your idea', 'Opisz swój pomysł')}</h2></div>
        {mode === 'website' && <Field label={t('Project name', 'Nazwa projektu')}><Input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder={t('e.g. Aurora Studio', 'np. Studio Aurora')} /></Field>}
        {needsProject && (projects.isLoading ? <Spinner /> : list.length ? <Field label={t('Target project', 'Projekt docelowy')}><Select value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">{t('Select a project…', 'Wybierz projekt…')}</option>{list.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></Field> : <EmptyState title={t('No projects yet', 'Brak projektów')} description={t('Create a project first, then come back to add sections or refresh its design.', 'Najpierw utwórz projekt, potem wróć, aby dodać sekcje lub odświeżyć design.')} action={<Button variant="secondary" onClick={() => navigate('/projects')}>{t('Go to projects', 'Przejdź do projektów')}</Button>} />)}
        {(mode === 'text' || mode === 'seo') && <Field label={t('Existing text (optional)', 'Istniejący tekst (opcjonalnie)')} hint={t('Leave empty to generate from scratch, or paste copy to improve.', 'Zostaw puste, aby wygenerować od zera, lub wklej tekst do poprawy.')}><textarea className="text-area" rows={4} value={source} onChange={e => setSource(e.target.value)} placeholder={t('Paste your current copy…', 'Wklej obecną treść…')} /></Field>}
        <Field label={t('Prompt', 'Polecenie')}><textarea className="text-area ai-prompt-input" rows={6} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('Be specific about mood, audience, sections and colors…', 'Opisz nastrój, odbiorców, sekcje i kolory…')} /></Field>
        <div className="ai-examples">{examples[mode].map(example => <button key={example.en} onClick={() => setPrompt(t(example.en, example.pl))}><Wand2 size={12} />{t(example.en, example.pl)}</button>)}</div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <Button size="lg" className="ai-generate" disabled={!configured || !prompt.trim() || (needsProject && !projectId)} loading={busy} onClick={() => void generate()}>{busy ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}{busy ? t('Gemini is creating…', 'Gemini tworzy…') : t('Generate', 'Generuj')}<ArrowUpRight size={16} /></Button>
        <p className="ai-footnote">{t('Output is validated and converted into editable elements. Generation may take up to a minute.', 'Wynik jest walidowany i zamieniany na edytowalne elementy. Generowanie może potrwać do minuty.')}</p>
      </section>
      <aside className="ai-result-panel">
        <div className="ai-panel-heading"><FileText size={17} /><h2>{t('Result', 'Wynik')}</h2></div>
        {busy ? <div className="ai-thinking"><div className="ai-orb"><Sparkles size={26} /></div><strong>{t('Composing your design', 'Komponowanie projektu')}</strong><p>{t('Gemini is writing structure, content and styles. This stays in your workspace when it is done.', 'Gemini pisze strukturę, treść i style. Po zakończeniu trafią do Twojej przestrzeni.')}</p><div className="ai-thinking-bars"><i /><i /><i /></div></div> : result ? <div className="form-stack"><textarea className="text-area ai-result-text" rows={10} value={result} onChange={e => setResult(e.target.value)} /><div className="ai-result-actions"><Button variant="secondary" onClick={() => void copyResult()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t('Copied', 'Skopiowano') : t('Copy', 'Kopiuj')}</Button>{mode === 'text' && list.length > 0 && <Button onClick={() => void insertResult()} loading={busy}>{t('Add to project', 'Dodaj do projektu')}<ArrowUpRight size={14} /></Button>}</div></div> : <div className="ai-result-empty"><div className="ai-result-icon"><Sparkles size={28} /></div><h3>{t('Your creation appears here', 'Twój projekt pojawi się tutaj')}</h3><p>{mode === 'website' ? t('Whole websites open directly in the editor, ready to refine.', 'Całe strony otwierają się od razu w edytorze, gotowe do dopracowania.') : mode === 'section' || mode === 'design' ? t('Sections and design updates are applied to the project you choose.', 'Sekcje i zmiany designu są stosowane do wybranego projektu.') : t('Generated copy appears here, ready to copy or insert.', 'Wygenerowany tekst pojawi się tutaj, gotowy do skopiowania lub wstawienia.')}</p></div>}
      </aside>
    </div>
  </>;
}