import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml} from '../src/scripts/htmlUtils.mjs';

test('escapeHtml escapes markup so it renders as text', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml(`a & b 'c'`), 'a &amp; b &#39;c&#39;');
});

test('escapeHtml leaves plain values unchanged and stringifies non-strings', () => {
  assert.equal(escapeHtml('3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c'), '3f2b8c1e-9a4d-4e7f-b2c1-0d5e6f7a8b9c');
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
});
