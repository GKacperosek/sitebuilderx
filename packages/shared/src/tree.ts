import type { Device, NodeSpec, SiteDocument, SiteNode, SitePage, SiteTheme, StyleMap } from './types';
export const uid = () => crypto.randomUUID();
export const DEFAULT_THEME: SiteTheme = { name: 'Midnight', colors: { background: '#0b0b13', surface: '#141421', text: '#f4f4fa', muted: '#9898ad', primary: '#a78bfa', secondary: '#38bdf8', border: '#2c2c40' }, fontFamily: 'DM Sans', headingFont: 'Space Grotesk', radius: 16 };
export const emptyPage = (name = 'Home', slug = ''): SitePage => ({ id: uid(), name, slug, rootIds: [], seo: { title: name, description: '', keywords: '', ogImage: '', noindex: false } });
export function emptyDocument(language: 'pl' | 'en' = 'pl'): SiteDocument { return { version: 1, pages: [emptyPage(language === 'pl' ? 'Strona główna' : 'Home')], nodes: {}, theme: structuredClone(DEFAULT_THEME), language }; }
export function instantiateSpec(spec: NodeSpec, nodes: Record<string, SiteNode>): string {
  const id = uid();
  nodes[id] = { id, type: spec.type, name: spec.name || spec.type, props: structuredClone(spec.props || {}), styles: structuredClone(spec.styles || {}), responsive: structuredClone(spec.responsive || {}), hover: structuredClone(spec.hover || {}), hidden: {}, animation: spec.animation, children: [] };
  nodes[id].children = (spec.children || []).map(child => instantiateSpec(child, nodes));
  return id;
}
export function documentFromSpecs(specs: NodeSpec[], theme: SiteTheme = DEFAULT_THEME, language: 'pl' | 'en' = 'pl'): SiteDocument {
  const doc = emptyDocument(language); doc.theme = structuredClone(theme); doc.pages[0].rootIds = specs.map(s => instantiateSpec(s, doc.nodes)); return doc;
}
export function findParent(doc: SiteDocument, id: string): { parentId: string | null; pageId: string; index: number } | null {
  for (const page of doc.pages) { const i = page.rootIds.indexOf(id); if (i >= 0) return { parentId: null, pageId: page.id, index: i }; }
  for (const node of Object.values(doc.nodes)) { const i = node.children.indexOf(id); if (i >= 0) { const root = findParent(doc, node.id); if (root) return { parentId: node.id, pageId: root.pageId, index: i }; } }
  return null;
}
export function descendants(doc: SiteDocument, id: string): string[] { const out: string[] = []; const visit = (key: string) => { if (!doc.nodes[key] || out.includes(key)) return; out.push(key); doc.nodes[key].children.forEach(visit); }; visit(id); return out; }
export function removeNode(doc: SiteDocument, id: string) {
  const parent = findParent(doc, id); if (!parent) return;
  const siblings = parent.parentId ? doc.nodes[parent.parentId].children : doc.pages.find(p => p.id === parent.pageId)!.rootIds;
  siblings.splice(parent.index, 1); descendants(doc, id).forEach(key => delete doc.nodes[key]);
}
export function nodeToSpec(doc: SiteDocument, id: string): NodeSpec { const n = doc.nodes[id]; return { type: n.type, name: n.name, props: structuredClone(n.props), styles: structuredClone(n.styles), responsive: structuredClone(n.responsive), hover: structuredClone(n.hover), animation: n.animation, children: n.children.map(c => nodeToSpec(doc, c)) }; }
export function moveNode(doc: SiteDocument, id: string, parentId: string | null, pageId: string, index: number): boolean {
  if (parentId && descendants(doc, id).includes(parentId)) return false;
  const from = findParent(doc, id); if (!from) return false;
  const old = from.parentId ? doc.nodes[from.parentId].children : doc.pages.find(p => p.id === from.pageId)!.rootIds;
  const target = parentId ? doc.nodes[parentId]?.children : doc.pages.find(p => p.id === pageId)?.rootIds;
  if (!target) return false;
  old.splice(from.index, 1); if (old === target && from.index < index) index--;
  target.splice(Math.max(0, Math.min(index, target.length)), 0, id); return true;
}
export function effectiveStyles(node: SiteNode, device: Device): StyleMap {
  const out = { ...node.styles }; const order: Device[] = ['desktop', 'laptop', 'tablet', 'mobile'];
  for (const breakpoint of order.slice(1, order.indexOf(device) + 1)) Object.assign(out, node.responsive[breakpoint as Exclude<Device, 'desktop'>]);
  return out;
}
export function topLevelSelection(doc: SiteDocument, ids: string[]): string[] { return ids.filter(id => !ids.some(other => other !== id && descendants(doc, other).includes(id))); }
export function validateDocumentStructure(doc: SiteDocument): string | null {
  if (!doc || doc.version !== 1 || !Array.isArray(doc.pages) || !doc.nodes || !doc.theme) return 'Invalid document';
  if (!doc.pages.length || doc.pages.length > 50 || Object.keys(doc.nodes).length > 5000) return 'Document limits exceeded';
  const used = new Set<string>();
  const visit = (id: string, depth: number): boolean => { const n = doc.nodes[id]; if (!n || used.has(id) || depth > 40 || n.id !== id || !Array.isArray(n.children)) return false; used.add(id); return n.children.every(c => visit(c, depth + 1)); };
  if (doc.pages.some(p => !Array.isArray(p.rootIds) || !p.rootIds.every(id => visit(id, 0)))) return 'Invalid tree or cyclic references';
  if (used.size !== Object.keys(doc.nodes).length) return 'Orphan nodes';
  return null;
}
