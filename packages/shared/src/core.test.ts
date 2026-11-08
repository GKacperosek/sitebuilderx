import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME, LIBRARY, TEMPLATES, TEMPLATE_CATEGORIES, SECTION_ITEMS, ELEMENTS,
  documentFromSpecs, emptyDocument, emptyPage, instantiateSpec, findParent, descendants,
  removeNode, moveNode, nodeToSpec, effectiveStyles, topLevelSelection, validateDocumentStructure,
  escapeHTML, safeURL, safeToken, safeJSON, sanitizeRichText, cssValue, cssProperty, styleDeclarations, assetURL,
  generateCSS, buildCSS, renderPageHTML, renderNodeHTML, renderElement, getElementDefinition,
} from './index';
import type { NodeSpec, SiteDocument } from './types';

const heading = (text: string, level = 2): NodeSpec => ({ type: 'heading', props: { text, level } });
const section = (children: NodeSpec[]): NodeSpec => ({ type: 'section', children });

test('instantiateSpec builds a reachable tree with unique ids', () => {
  const doc = documentFromSpecs([section([heading('Title'), { type: 'paragraph', props: { text: 'Body' } }])]);
  assert.equal(validateDocumentStructure(doc), null);
  const rootId = doc.pages[0].rootIds[0];
  assert.equal(doc.nodes[rootId].type, 'section');
  assert.equal(doc.nodes[rootId].children.length, 2);
  assert.equal(new Set(Object.keys(doc.nodes)).size, 3);
});

test('findParent resolves page roots and nested children', () => {
  const doc = documentFromSpecs([section([heading('A')]), heading('B')]);
  const [rootId, topId] = doc.pages[0].rootIds;
  const childId = doc.nodes[rootId].children[0];
  assert.deepEqual(findParent(doc, rootId), { parentId: null, pageId: doc.pages[0].id, index: 0 });
  assert.equal(findParent(doc, childId)?.parentId, rootId);
  assert.equal(findParent(doc, topId)?.index, 1);
  assert.equal(findParent(doc, 'missing'), null);
});

test('removeNode deletes the whole subtree', () => {
  const doc = documentFromSpecs([section([heading('A'), heading('B')]), heading('C')]);
  const rootId = doc.pages[0].rootIds[0];
  removeNode(doc, rootId);
  assert.equal(doc.pages[0].rootIds.length, 1);
  assert.equal(Object.keys(doc.nodes).length, 1);
  assert.equal(validateDocumentStructure(doc), null);
});

test('moveNode reorders, reparents and rejects cycles', () => {
  const doc = documentFromSpecs([section([heading('A')]), heading('B'), heading('C')]);
  const [sectionId, bId, cId] = doc.pages[0].rootIds;
  assert.equal(moveNode(doc, cId, null, doc.pages[0].id, 0), true);
  assert.deepEqual(doc.pages[0].rootIds, [cId, sectionId, bId]);
  assert.equal(moveNode(doc, bId, sectionId, doc.pages[0].id, 0), true);
  assert.ok(doc.nodes[sectionId].children.includes(bId));
  assert.equal(moveNode(doc, sectionId, doc.nodes[sectionId].children[0], doc.pages[0].id, 0), false);
  assert.equal(validateDocumentStructure(doc), null);
});

test('nodeToSpec round-trips through instantiateSpec', () => {
  const doc = documentFromSpecs([section([heading('Hello', 1)])]);
  const spec = nodeToSpec(doc, doc.pages[0].rootIds[0]);
  const copy = documentFromSpecs([spec]);
  assert.equal(validateDocumentStructure(copy), null);
  assert.equal(Object.keys(copy.nodes).length, 2);
});

test('effectiveStyles cascades breakpoints in order', () => {
  const doc = documentFromSpecs([{ type: 'heading', props: { text: 'X' }, styles: { fontSize: 40 }, responsive: { tablet: { fontSize: 28 }, mobile: { fontSize: 22 } } }]);
  const node = doc.nodes[doc.pages[0].rootIds[0]];
  assert.equal(effectiveStyles(node, 'desktop').fontSize, 40);
  assert.equal(effectiveStyles(node, 'tablet').fontSize, 28);
  assert.equal(effectiveStyles(node, 'mobile').fontSize, 22);
});

test('topLevelSelection drops nested descendants', () => {
  const doc = documentFromSpecs([section([heading('A')])]);
  const rootId = doc.pages[0].rootIds[0];
  const childId = doc.nodes[rootId].children[0];
  assert.deepEqual(topLevelSelection(doc, [rootId, childId]), [rootId]);
});

test('validateDocumentStructure detects orphans, cycles and missing nodes', () => {
  const doc = documentFromSpecs([heading('A')]);
  const orphan = instantiateSpec(heading('Orphan'), doc.nodes);
  assert.equal(validateDocumentStructure(doc), 'Orphan nodes');
  delete doc.nodes[orphan];
  assert.equal(validateDocumentStructure(doc), null);
  const id = doc.pages[0].rootIds[0];
  doc.nodes[id].children = [id];
  assert.match(validateDocumentStructure(doc)!, /cyclic/);
});

test('safeURL blocks javascript, data and protocol-relative URLs', () => {
  assert.equal(safeURL('javascript:alert(1)'), '');
  assert.equal(safeURL('JaVaScRiPt:alert(1)'), '');
  assert.equal(safeURL('data:text/html,<script>'), '');
  assert.equal(safeURL('//evil.com'), '');
  assert.equal(safeURL('https://example.com/page'), 'https://example.com/page');
  assert.equal(safeURL('/relative/path'), '/relative/path');
  assert.equal(safeURL('#anchor'), '#anchor');
  assert.equal(safeURL('mailto:a@b.com'), 'mailto:a@b.com');
  assert.equal(safeURL('https://example.com', '#'), 'https://example.com');
});

test('escapeHTML and safeJSON neutralize markup', () => {
  assert.equal(escapeHTML('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.ok(!safeJSON({ x: '</script><script>alert(1)</script>' }).includes('</script>'));
});

test('sanitizeRichText strips active content and keeps safe markup', () => {
  const out = sanitizeRichText('<p>Hello <strong>world</strong></p><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">link</a><iframe src="x"></iframe>');
  assert.ok(out.includes('<strong>world</strong>'));
  assert.ok(!out.includes('script') && !out.includes('iframe') && !out.includes('onclick'));
  assert.ok(!out.includes('javascript:'));
});

test('cssValue rejects declaration escapes and dangerous functions', () => {
  assert.equal(cssValue('color', 'red; position:fixed'), '');
  assert.equal(cssValue('background', 'url(javascript:alert(1))'), '');
  assert.equal(cssValue('width', 'expression(alert(1))'), '');
  assert.equal(cssValue('color', 'red !important'), '');
  assert.equal(cssValue('fontSize', 16), '16px');
  assert.equal(cssValue('opacity', 0.5), '0.5');
  assert.equal(cssValue('zIndex', 10), '10');
  assert.equal(cssValue('color', '#a78bfa'), '#a78bfa');
  assert.equal(cssProperty('fontSize'), 'font-size');
  assert.equal(cssProperty('--sb-primary'), '--sb-primary');
});

test('styleDeclarations and assetURL rewrite uploads safely', () => {
  assert.equal(styleDeclarations({ fontSize: 18, color: 'red' }), 'font-size:18px;color:red');
  assert.equal(assetURL('/uploads/abc.png', 'https://cdn.example.com'), 'https://cdn.example.com/uploads/abc.png');
  assert.equal(safeToken('a b/c'), 'a_b_c');
});

test('generateCSS emits theme variables and breakpoint modes', () => {
  const doc = documentFromSpecs([{ type: 'heading', props: { text: 'X' }, styles: { color: 'var(--sb-primary)' }, responsive: { mobile: { fontSize: 20 } } }]);
  const media = generateCSS(doc, 'media');
  const container = generateCSS(doc, 'container');
  assert.ok(media.includes('--sb-primary'));
  assert.ok(media.includes('@media (max-width'));
  assert.ok(container.includes('@container sb-canvas'));
  assert.ok(!container.includes('@media (max-width'));
  assert.ok(buildCSS(doc, 'media').length > 100);
});

test('renderPageHTML produces a standalone document with runtime and escaped content', () => {
  const doc = documentFromSpecs([heading('<script>alert(1)</script>', 1)]);
  const html = renderPageHTML(doc, doc.pages[0].id, { siteName: 'Test' });
  assert.match(html, /<!DOCTYPE html/i);
  assert.ok(html.includes('sb-runtime-config'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  const noRuntime = renderPageHTML(doc, doc.pages[0].id, { includeRuntime: false });
  assert.ok(!noRuntime.includes('sb-runtime-config'));
});

test('renderElement covers interactive and commerce types without active markup', () => {
  for (const type of ['button', 'navbar', 'accordion', 'tabs', 'contactForm', 'productCard', 'checkout', 'modal', 'video', 'icon']) {
    const def = getElementDefinition(type);
    assert.ok(def, `definition for ${type}`);
    const node = { id: 'n1', type, name: type, props: { ...def!.defaultProps }, styles: {}, responsive: {}, hover: {}, hidden: {}, children: [] };
    const vnode = renderElement(node as any);
    assert.ok(vnode.tag);
    assert.ok(!/^on/i.test(Object.keys(vnode.attrs || {}).join(' ')));
  }
});

test('renderNodeHTML serializes a subtree', () => {
  const doc = documentFromSpecs([section([heading('Nested', 3)])]);
  const html = renderNodeHTML(doc, doc.pages[0].rootIds[0]);
  assert.ok(html.includes('Nested'));
  assert.ok(html.includes('sb-section'));
});

test('library ships at least 100 variants and all instantiate cleanly', () => {
  assert.ok(LIBRARY.length >= 100, `only ${LIBRARY.length} library items`);
  assert.ok(SECTION_ITEMS.length >= 40);
  for (const item of LIBRARY) {
    const doc = documentFromSpecs([item.spec]);
    assert.equal(validateDocumentStructure(doc), null, `library ${item.id}`);
    assert.ok(renderPageHTML(doc, doc.pages[0].id).length > 200, `render ${item.id}`);
  }
});

test('templates ship at least 50 across all 15 categories, valid in PL and EN', () => {
  assert.ok(TEMPLATES.length >= 50, `only ${TEMPLATES.length} templates`);
  assert.equal(TEMPLATE_CATEGORIES.length, 15);
  for (const category of TEMPLATE_CATEGORIES) assert.ok(TEMPLATES.some(t => t.category === category), `missing category ${category}`);
  for (const template of TEMPLATES) {
    for (const language of ['pl', 'en'] as const) {
      const doc = template.create(language);
      assert.equal(validateDocumentStructure(doc), null, `${template.id}/${language}`);
      assert.ok(doc.pages.length >= 3, `${template.id} subpages`);
      for (const page of doc.pages) assert.match(renderPageHTML(doc, page.id), /<!DOCTYPE html/i, `${template.id}/${page.slug}`);
    }
  }
});

test('every template navbar links to real subpages', () => {
  for (const template of TEMPLATES) {
    const doc = template.create('en');
    const slugs = new Set(doc.pages.map(p => p.slug));
    for (const node of Object.values(doc.nodes)) {
      if (node.type !== 'navbar') continue;
      for (const link of node.props.links as { href: string }[]) {
        const target = link.href.replace(/^\.\//, '').replace(/\/$/, '');
        assert.ok(target === '' || slugs.has(target), `${template.id} navbar href ${link.href}`);
      }
    }
  }
});

test('element registry definitions are consistent', () => {
  assert.ok(ELEMENTS.length >= 60);
  for (const def of ELEMENTS) {
    assert.equal(def.type, def.type.trim());
    assert.ok(def.category);
    assert.ok(def.defaultProps && typeof def.defaultProps === 'object');
  }
});