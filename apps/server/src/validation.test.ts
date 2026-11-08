import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentFromSpecs } from '@sitebuilder/shared';
import { safeUrl, safeStyleValue, parseDocument, parseSpec, passwordSchema, slugSchema, emailSchema, folderSchema, settingsSchema } from './validation';

test('safeUrl allows public web URLs and relative paths', () => {
  assert.equal(safeUrl('https://example.com/a'), true);
  assert.equal(safeUrl('http://example.com'), true);
  assert.equal(safeUrl('/uploads/x.png'), true);
  assert.equal(safeUrl('#section'), true);
  assert.equal(safeUrl('mailto:a@b.com'), true);
  assert.equal(safeUrl(''), true);
});

test('safeUrl blocks script, data, credential and control-character URLs', () => {
  assert.equal(safeUrl('javascript:alert(1)'), false);
  assert.equal(safeUrl('data:text/html,x'), false);
  assert.equal(safeUrl('//evil.com'), false);
  assert.equal(safeUrl('https://user:pass@example.com'), false);
  assert.equal(safeUrl('https://example.com/\n'), false);
  assert.equal(safeUrl('java\tscript:alert(1)'), false);
  assert.equal(safeUrl('data:image/png;base64,AAAA'), false);
  assert.equal(safeUrl('data:image/png;base64,AAAA', true), true);
});

test('safeStyleValue rejects CSS injection vectors', () => {
  assert.equal(safeStyleValue('red'), true);
  assert.equal(safeStyleValue(16), true);
  assert.equal(safeStyleValue('var(--sb-primary)'), true);
  assert.equal(safeStyleValue('url(https://example.com/a.png)'), true);
  assert.equal(safeStyleValue('red; position:fixed'), false);
  assert.equal(safeStyleValue('expression(alert(1))'), false);
  assert.equal(safeStyleValue('url(javascript:alert(1))'), false);
  assert.equal(safeStyleValue('behavior:url(x)'), false);
  assert.equal(safeStyleValue('x}body{color:red'), false);
  assert.equal(safeStyleValue('@import url(x)'), false);
  assert.equal(safeStyleValue(NaN), false);
});

test('passwordSchema enforces length and byte limits', () => {
  assert.equal(passwordSchema.safeParse('short').success, false);
  assert.equal(passwordSchema.safeParse('ValidPass2026!').success, true);
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(passwordSchema.safeParse('ą'.repeat(40)).success, false);
});

test('slugSchema enforces DNS-like labels and reserved words', () => {
  assert.equal(slugSchema.safeParse('my-site').success, true);
  assert.equal(slugSchema.safeParse('ab').success, false);
  assert.equal(slugSchema.safeParse('My Site').success, false);
  assert.equal(slugSchema.safeParse('api').success, false);
  assert.equal(slugSchema.safeParse('-bad').success, false);
});

test('emailSchema normalizes and folderSchema blocks traversal', () => {
  assert.equal(emailSchema.parse('  User@Example.COM '), 'user@example.com');
  assert.equal(folderSchema.safeParse('..').success, false);
  assert.equal(folderSchema.safeParse('My Folder').success, true);
  assert.equal(folderSchema.safeParse('a/b').success, false);
});

test('settingsSchema bounds keys and values', () => {
  assert.equal(settingsSchema.safeParse({ theme: 'dark', editorZoom: 0.8 }).success, true);
  assert.equal(settingsSchema.safeParse(JSON.parse('{"__proto__":"x"}')).success, false);
  assert.equal(settingsSchema.safeParse({ nested: { a: 1 } }).success, false);
});

test('parseDocument accepts a valid document and rejects structural attacks', () => {
  const doc = documentFromSpecs([{ type: 'heading', props: { text: 'Hi', level: 1 } }]);
  assert.ok(parseDocument(doc));
  const orphan = structuredClone(doc);
  orphan.nodes['extra'] = { id: 'extra', type: 'heading', name: 'x', props: {}, styles: {}, responsive: {}, hover: {}, hidden: {}, children: [] };
  assert.throws(() => parseDocument(orphan), /Orphan/);
  const unknown = structuredClone(doc);
  unknown.nodes[unknown.pages[0].rootIds[0]].type = 'script';
  assert.throws(() => parseDocument(unknown), /Unknown element type/);
});

test('parseDocument strips event handlers and unsafe props', () => {
  const doc = documentFromSpecs([{ type: 'heading', props: { text: 'Hi', level: 1, onclick: 'alert(1)' } }]);
  assert.throws(() => parseDocument(doc), /Unsafe property/);
  const xss = documentFromSpecs([{ type: 'link', props: { text: 'x', href: 'javascript:alert(1)' } }]);
  assert.throws(() => parseDocument(xss), /Unsafe URL/);
});

test('parseDocument sanitizes rich text html props', () => {
  const doc = documentFromSpecs([{ type: 'richText', props: { html: '<p>ok</p><script>alert(1)</script>' } }]);
  const parsed = parseDocument(doc);
  const node = parsed.nodes[parsed.pages[0].rootIds[0]];
  assert.ok(!String(node.props.html).includes('<script>'));
  assert.ok(String(node.props.html).includes('<p>ok</p>'));
});

test('parseSpec validates and bounds nesting', () => {
  assert.ok(parseSpec({ type: 'section', children: [{ type: 'heading', props: { text: 'x' } }] }));
  assert.throws(() => parseSpec({ type: 'not-a-real-element' }));
  let deep: any = { type: 'heading', props: { text: 'x' } };
  for (let i = 0; i < 40; i++) deep = { type: 'section', children: [deep] };
  assert.throws(() => parseSpec(deep), /deeply nested/);
});