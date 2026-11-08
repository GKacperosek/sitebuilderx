import { create } from 'zustand';
import { produce } from 'immer';
import { uid, instantiateSpec, nodeToSpec, removeNode, moveNode, findParent, topLevelSelection, emptyPage, descendants } from '@sitebuilder/shared';
import type { Device, NodeSpec, Project, SiteDocument, SiteNode, StyleMap } from '@sitebuilder/shared';
type Snapshot = { document: SiteDocument; selected: string[]; pageId: string };
type LeftTab = 'elements' | 'layers' | 'pages' | 'media' | 'ai' | 'theme';
interface EditorState {
  project: Project | null; document: SiteDocument | null; pageId: string; selected: string[]; device: Device; zoom: number;
  leftTab: LeftTab; history: Snapshot[]; future: Snapshot[]; clipboard: NodeSpec[]; dirty: boolean; changeId: number;
  saveState: 'saved' | 'saving' | 'error'; saveError: string; preview: boolean;
  load: (project: Project) => void; commit: (recipe: (document: SiteDocument) => void, selected?: string[]) => void;
  select: (id: string | null, multi?: boolean) => void; setDevice: (device: Device) => void; setZoom: (zoom: number) => void;
  setPage: (id: string) => void; setLeftTab: (tab: LeftTab) => void; setPreview: (value: boolean) => void;
  updateNode: (id: string, patch: Partial<SiteNode>) => void; updateProps: (id: string, patch: Record<string, any>) => void;
  style: (patch: StyleMap, hover?: boolean) => void; clearStyle: (key: string, hover?: boolean) => void;
  insert: (spec: NodeSpec, parentId?: string | null, index?: number) => void;
  move: (id: string, parentId: string | null, index: number) => void;
  remove: () => void; duplicate: () => void; copy: () => void; paste: () => void; group: () => void; ungroup: () => void;
  undo: () => void; redo: () => void; addPage: (name: string, slug: string) => void; deletePage: (id: string) => void;
  saving: () => void; saved: (project: Project, changeId: number) => void; failed: (message: string) => void;
}
const snapshot = (s: EditorState): Snapshot => ({ document: s.document!, selected: s.selected, pageId: s.pageId });
export const useEditor = create<EditorState>((set, get) => ({
  project: null, document: null, pageId: '', selected: [], device: 'desktop', zoom: .65, leftTab: 'elements', history: [], future: [], clipboard: [], dirty: false, changeId: 0, saveState: 'saved', saveError: '', preview: false,
  load: project => set({ project, document: structuredClone(project.document), pageId: project.document.pages[0].id, selected: [], history: [], future: [], dirty: false, saveState: 'saved', saveError: '', changeId: 0 }),
  commit: (recipe, selected) => { const s = get(); if (!s.document) return; const document = produce(s.document, recipe); if (document === s.document) return; set({ document, selected: selected || s.selected.filter(id => !!document.nodes[id]), history: [...s.history.slice(-79), snapshot(s)], future: [], dirty: true, changeId: s.changeId + 1, saveError: '' }); },
  select: (id, multi = false) => set(s => ({ selected: id ? multi ? s.selected.includes(id) ? s.selected.filter(x => x !== id) : [...s.selected, id] : [id] : [] })),
  setDevice: device => set({ device }), setZoom: zoom => set({ zoom: Math.min(1.5, Math.max(.25, zoom)) }), setPage: pageId => set({ pageId, selected: [] }), setLeftTab: leftTab => set({ leftTab }), setPreview: preview => set({ preview }),
  updateNode: (id, patch) => get().commit(doc => { if (!doc.nodes[id]?.locked || Object.keys(patch).every(k => ['locked', 'name'].includes(k))) Object.assign(doc.nodes[id], patch); }),
  updateProps: (id, patch) => get().commit(doc => { if (doc.nodes[id] && !doc.nodes[id].locked) Object.assign(doc.nodes[id].props, patch); }),
  style: (patch, hover = false) => { const s = get(); s.commit(doc => { for (const id of s.selected) { const n = doc.nodes[id]; if (!n || n.locked) continue; const target = hover ? n.hover : s.device === 'desktop' ? n.styles : (n.responsive[s.device] ||= {}); Object.assign(target, patch); } }); },
  clearStyle: (key, hover = false) => { const s = get(); s.commit(doc => { for (const id of s.selected) { const n = doc.nodes[id]; if (!n || n.locked) continue; const target = hover ? n.hover : s.device === 'desktop' ? n.styles : n.responsive[s.device]; if (target) delete target[key]; } }); },
  insert: (spec, parentId = null, index) => { const s = get(); if (!s.document) return; let id = ''; s.commit(doc => { const children = parentId ? doc.nodes[parentId]?.children : doc.pages.find(p => p.id === s.pageId)?.rootIds; if (!children || (parentId && doc.nodes[parentId].locked)) return; id = instantiateSpec(spec, doc.nodes); children.splice(index ?? children.length, 0, id); }); if (id) set({ selected: [id] }); },
  move: (id, parentId, index) => { const s = get(); s.commit(doc => { if (doc.nodes[id]?.locked || (parentId && doc.nodes[parentId]?.locked)) return; moveNode(doc, id, parentId, s.pageId, index); }); },
  remove: () => { const s = get(); s.commit(doc => { topLevelSelection(doc, s.selected).filter(id => !doc.nodes[id]?.locked).forEach(id => removeNode(doc, id)); }, []); },
  duplicate: () => { const s = get(); const ids: string[] = []; s.commit(doc => { for (const id of topLevelSelection(doc, s.selected)) { const p = findParent(doc, id); if (!p) continue; const copy = instantiateSpec(nodeToSpec(doc, id), doc.nodes); doc.nodes[copy].name += ' copy'; const siblings = p.parentId ? doc.nodes[p.parentId].children : doc.pages.find(page => page.id === p.pageId)!.rootIds; siblings.splice(p.index + 1, 0, copy); ids.push(copy); } }, ids); },
  copy: () => { const s = get(); if (s.document) set({ clipboard: topLevelSelection(s.document, s.selected).map(id => nodeToSpec(s.document!, id)) }); },
  paste: () => { const s = get(); if (!s.clipboard.length) return; const ids: string[] = []; s.commit(doc => { const page = doc.pages.find(p => p.id === s.pageId)!; for (const spec of s.clipboard) { const id = instantiateSpec(spec, doc.nodes); page.rootIds.push(id); ids.push(id); } }, ids); },
  group: () => { const s = get(); if (!s.document) return; const selected = topLevelSelection(s.document, s.selected); if (selected.length < 2) return; const parents = selected.map(id => findParent(s.document!, id)); if (!parents.every(p => p && p.parentId === parents[0]?.parentId && p.pageId === parents[0]?.pageId)) return; let groupId = ''; s.commit(doc => { const p = parents[0]!; const siblings = p.parentId ? doc.nodes[p.parentId].children : doc.pages.find(page => page.id === p.pageId)!.rootIds; const ordered = siblings.filter(id => selected.includes(id)); const index = Math.min(...parents.map(p => p!.index)); siblings.splice(0, siblings.length, ...siblings.filter(id => !selected.includes(id))); groupId = instantiateSpec({ type: 'wrapper', name: 'Group', styles: { display: 'flex', flexDirection: 'column', gap: '16px' } }, doc.nodes); doc.nodes[groupId].children = ordered; siblings.splice(index, 0, groupId); }); if (groupId) set({ selected: [groupId] }); },
  ungroup: () => { const s = get(); const selected: string[] = []; s.commit(doc => { for (const id of topLevelSelection(doc, s.selected)) { const node = doc.nodes[id]; const p = findParent(doc, id); if (!node || !p || !node.children.length || node.locked) continue; const siblings = p.parentId ? doc.nodes[p.parentId].children : doc.pages.find(page => page.id === p.pageId)!.rootIds; siblings.splice(p.index, 1, ...node.children); selected.push(...node.children); delete doc.nodes[id]; } }, selected); },
  undo: () => { const s = get(); const prev = s.history.at(-1); if (!prev) return; set({ ...prev, history: s.history.slice(0, -1), future: [...s.future, snapshot(s)], dirty: true, changeId: s.changeId + 1 }); },
  redo: () => { const s = get(); const next = s.future.at(-1); if (!next) return; set({ ...next, future: s.future.slice(0, -1), history: [...s.history, snapshot(s)], dirty: true, changeId: s.changeId + 1 }); },
  addPage: (name, slug) => { let id = ''; get().commit(doc => { const page = emptyPage(name, slug); id = page.id; doc.pages.push(page); }); set({ pageId: id, selected: [] }); },
  deletePage: id => { const s = get(); if (!s.document || s.document.pages.length < 2) return; s.commit(doc => { const page = doc.pages.find(p => p.id === id); page?.rootIds.forEach(root => descendants(doc, root).forEach(key => delete doc.nodes[key])); doc.pages = doc.pages.filter(p => p.id !== id); }); if (s.pageId === id) set({ pageId: get().document!.pages[0].id, selected: [] }); },
  saving: () => set({ saveState: 'saving' }), saved: (project, changeId) => set(s => ({ project: { ...project, document: s.document! }, dirty: s.changeId !== changeId, saveState: 'saved', saveError: '' })), failed: message => set({ saveState: 'error', saveError: message }),
}));
