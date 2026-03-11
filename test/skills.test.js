import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SkillsClient, rankAndCap, writeSkills, loadBaseline, _internal } from '../lib/skills.js';

function mockFetch(routes) {
  return async (url) => {
    const path = url.replace(_internal.API_BASE, '');
    if (!(path in routes)) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    const body = routes[path];
    return { ok: true, status: 200, json: async () => body };
  };
}

test('SkillsClient.search returns normalized results from { skills: [...] } shape', async () => {
  const client = new SkillsClient({
    fetch: mockFetch({
      '/skills/search?q=nextjs%20react': {
        skills: [
          { source: 'foo/bar', name: 'next-best-practices', description: 'd1', installs: 50 },
          { source: 'baz/qux', name: 'react-hooks', description: 'd2', installs: 10 },
        ],
      },
    }),
  });
  const out = await client.search(['nextjs', 'react']);
  assert.equal(out.length, 2);
  assert.equal(out[0].source, 'foo/bar');
});

test('SkillsClient.search returns normalized results from bare array shape', async () => {
  const client = new SkillsClient({
    fetch: mockFetch({
      '/skills/search?q=python': [
        { source: 's/n', name: 'fastapi-patterns', summary: 'sum', installCount: 7 },
      ],
    }),
  });
  const out = await client.search(['python']);
  assert.equal(out[0].description, 'sum');
  assert.equal(out[0].installs, 7);
});

test('SkillsClient.search short-circuits on empty terms', async () => {
  const client = new SkillsClient({ fetch: () => { throw new Error('should not fetch'); } });
  const out = await client.search([]);
  assert.deepEqual(out, []);
});

test('SkillsClient.getContent prefers content, falls back to body, then files[0].content', async () => {
  const c1 = new SkillsClient({ fetch: mockFetch({ '/skills/a/b': { content: 'C' } }) });
  assert.equal(await c1.getContent('a', 'b'), 'C');
  const c2 = new SkillsClient({ fetch: mockFetch({ '/skills/a/b': { body: 'B' } }) });
  assert.equal(await c2.getContent('a', 'b'), 'B');
  const c3 = new SkillsClient({ fetch: mockFetch({ '/skills/a/b': { files: [{ content: 'F' }] } }) });
  assert.equal(await c3.getContent('a', 'b'), 'F');
});

test('SkillsClient.getContent throws if no content field present', async () => {
  const client = new SkillsClient({ fetch: mockFetch({ '/skills/a/b': { other: 'x' } }) });
  await assert.rejects(client.getContent('a', 'b'), /no content field/);
});

test('SkillsClient.json throws on non-2xx', async () => {
  const client = new SkillsClient({ fetch: mockFetch({}) });
  await assert.rejects(client.search(['x']), /404/);
});

test('rankAndCap places baseline first, dedupes, caps at limit', () => {
  const baseline = [
    { source: 'clud-bug-baseline', name: 'critical-issues-only', kind: 'baseline' },
  ];
  const curated = [
    { source: 'anthropic/skills', name: 'security-review', installs: 1000 },
  ];
  const searched = [
    { source: 'foo/bar', name: 'nextjs', installs: 500 },
    { source: 'foo/bar', name: 'nextjs', installs: 500 },
    { source: 'baz/qux', name: 'react', installs: 100 },
  ];
  const out = rankAndCap(curated, searched, baseline, 3);
  assert.equal(out.length, 3);
  assert.equal(out[0].name, 'critical-issues-only');
  assert.equal(out[1].name, 'security-review');
  assert.equal(out[2].name, 'nextjs');
});

test('writeSkills creates SKILL.md per skill in nested directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-skills-'));
  try {
    const client = new SkillsClient({
      fetch: mockFetch({ '/skills/foo/bar': { content: 'remote skill body' } }),
    });
    const skills = [
      { source: 'foo', name: 'bar', kind: 'remote' },
      { source: 'clud-bug-baseline', name: 'local-skill', kind: 'baseline', content: 'local body' },
    ];
    const written = await writeSkills(dir, skills, client);
    assert.equal(written.length, 2);
    assert.equal(await readFile(join(dir, 'bar', 'SKILL.md'), 'utf8'), 'remote skill body');
    assert.equal(await readFile(join(dir, 'local-skill', 'SKILL.md'), 'utf8'), 'local body');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline reads .md files from a directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'a.md'), 'A');
    await writeFile(join(dir, 'b.md'), 'B');
    await writeFile(join(dir, 'ignore.txt'), 'no');
    const out = await loadBaseline(dir);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map(s => s.name).sort(), ['a', 'b']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline returns empty if directory missing', async () => {
  const out = await loadBaseline('/tmp/clud-bug-does-not-exist-' + Date.now());
  assert.deepEqual(out, []);
});

test('sanitizeSlug normalizes names safely', () => {
  assert.equal(_internal.sanitizeSlug('Foo Bar!'), 'foo-bar');
  assert.equal(_internal.sanitizeSlug('--Already-OK--'), 'already-ok');
});
