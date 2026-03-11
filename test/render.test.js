import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { render, pickTemplate } from '../lib/render.js';

test('render fills single placeholder', () => {
  const out = render('hello {{NAME}}', { NAME: 'world' });
  assert.equal(out, 'hello world');
});

test('render fills multiple placeholders', () => {
  const out = render('{{A}} and {{B}}', { A: 'one', B: 'two' });
  assert.equal(out, 'one and two');
});

test('render leaves text without placeholders untouched', () => {
  const out = render('plain text', {});
  assert.equal(out, 'plain text');
});

test('render throws on missing variable', () => {
  assert.throws(() => render('{{MISSING}}', {}), /Missing template variable: MISSING/);
});

test('render replaces every occurrence of the same placeholder', () => {
  const out = render('{{X}} {{X}} {{X}}', { X: 'hi' });
  assert.equal(out, 'hi hi hi');
});

test('render allows empty string substitution', () => {
  const out = render('a{{X}}b', { X: '' });
  assert.equal(out, 'ab');
});

test('pickTemplate prefers TS variant when JS/TS present', () => {
  assert.equal(pickTemplate(['typescript', 'python']), 'workflow-ts.yml.tmpl');
  assert.equal(pickTemplate(['javascript']), 'workflow-ts.yml.tmpl');
});

test('pickTemplate falls back to Python when no JS/TS', () => {
  assert.equal(pickTemplate(['python']), 'workflow-py.yml.tmpl');
});

test('pickTemplate falls back to generic for other languages', () => {
  assert.equal(pickTemplate(['go']), 'workflow.yml.tmpl');
  assert.equal(pickTemplate([]), 'workflow.yml.tmpl');
});
