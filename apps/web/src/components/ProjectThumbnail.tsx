import { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeSpec, SiteDocument, SiteTheme } from '@sitebuilder/shared/types';
import { documentFromSpecs, renderPageHTML } from '@sitebuilder/shared';
import { Layers } from 'lucide-react';
export function ProjectThumbnail({ document: doc, title = 'Website preview', className = '' }: { document: SiteDocument; title?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(320);
  useEffect(() => { const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); if (ref.current) observer.observe(ref.current); return () => observer.disconnect(); }, []);
  const html = useMemo(() => { try { return doc.pages[0] ? renderPageHTML(doc, doc.pages[0].id) : ''; } catch { return ''; } }, [doc]);
  const empty = !doc.pages[0]?.rootIds.length;
  return <div className={`project-thumbnail ${className}`} ref={ref}>{empty ? <div className="blank-preview"><Layers size={30} /><span>{doc.language === 'pl' ? 'Czysta karta. Wielkie możliwości.' : 'A blank canvas. Endless possibilities.'}</span></div> : <iframe loading="lazy" title={title} srcDoc={html} sandbox="" tabIndex={-1} aria-hidden="true" style={{ width: 1440, height: 960, transform: `scale(${width / 1440})` }} />}<div className="thumbnail-shield" /></div>;
}
export default ProjectThumbnail;
export function WebsitePreview({ document: doc, title }: { document: SiteDocument; title: string }) { const html = useMemo(() => renderPageHTML(doc, doc.pages[0].id), [doc]); return <iframe className="website-preview" title={title} srcDoc={html} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" />; }
export function SpecThumbnail({ spec, theme, language = 'pl', title = 'Component preview', center = false, className = '' }: { spec: NodeSpec; theme?: SiteTheme; language?: 'pl' | 'en'; title?: string; center?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(0); const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const resize = new ResizeObserver(entries => setWidth(entries[0].contentRect.width)); resize.observe(el);
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setActive(true); observer.disconnect(); } }, { rootMargin: '240px' }); observer.observe(el);
    return () => { resize.disconnect(); observer.disconnect(); };
  }, []);
  const designWidth = center ? 900 : 1440;
  const html = useMemo(() => {
    if (!active) return '';
    try {
      const root: NodeSpec = center ? { type: 'flex', styles: { minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', padding: 40 }, children: [spec] } : spec;
      const doc = documentFromSpecs([root], theme, language);
      return renderPageHTML(doc, doc.pages[0].id, { includeRuntime: false });
    } catch { return ''; }
  }, [active, spec, theme, language, center]);
  return <div className={`spec-thumbnail ${className}`} ref={ref}>{html && width > 0 ? <iframe loading="lazy" title={title} srcDoc={html} sandbox="" tabIndex={-1} aria-hidden="true" style={{ width: designWidth, height: designWidth / 1.5, transform: `scale(${width / designWidth})` }} /> : <div className="spec-thumbnail-loading" />}<div className="thumbnail-shield" /></div>;
}
