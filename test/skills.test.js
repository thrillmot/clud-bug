import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  SkillsClient, rankAndCap, writeSkills, loadBaseline,
  readManifest, writeManifest, mergeManifest,
  removeSkill, listInstalled, diffManifest,
  _internal,
} from '../lib/skills.js';

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

// Tests pass cacheDir: null + a stub fetch so they don't touch the user's
// real cache dir or hit the live agent-skills repo.
const offlineOpts = { cacheDir: null, fetch: async () => { throw new Error('test: no network'); } };

test('loadBaseline reads .md files from a directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'a.md'), 'A');
    await writeFile(join(dir, 'b.md'), 'B');
    await writeFile(join(dir, 'ignore.txt'), 'no');
    const out = await loadBaseline(dir, offlineOpts);
    assert.equal(out.length, 2);
    assert.deepEqual(out.map(s => s.name).sort(), ['a', 'b']);
    // Stub fetch threw → all should report _source: 'bundled'
    assert.ok(out.every((s) => s._source === 'bundled'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline returns empty if directory missing', async () => {
  const out = await loadBaseline('/tmp/clud-bug-does-not-exist-' + Date.now(), offlineOpts);
  assert.deepEqual(out, []);
});

test('loadBaseline: prefers remote (agent-skills) when fetch succeeds', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-fetch-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'critical-issues-only.md'), 'BUNDLED CONTENT');

    let fetchedUrl;
    const fetch = async (url) => {
      fetchedUrl = url;
      return { ok: true, status: 200, text: async () => 'REMOTE CONTENT' };
    };
    const out = await loadBaseline(dir, { cacheDir: null, fetch });
    assert.equal(out.length, 1);
    assert.equal(out[0].content, 'REMOTE CONTENT');
    assert.equal(out[0]._source, 'agent-skills');
    // Pinned to a SHA, not main — re-couples trust to clud-bug releases.
    assert.match(fetchedUrl, /thrillmot\/agent-skills\/[0-9a-f]{40}\/skills\/critical-issues-only\/SKILL\.md/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline: falls back to bundled on 404', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-404-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'x.md'), 'BUNDLED FALLBACK');
    const fetch = async () => ({ ok: false, status: 404, text: async () => '' });
    const out = await loadBaseline(dir, { cacheDir: null, fetch });
    assert.equal(out[0].content, 'BUNDLED FALLBACK');
    assert.equal(out[0]._source, 'bundled');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline: falls back to bundled on network error', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-neterr-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'y.md'), 'BUNDLED ON ERROR');
    const fetch = async () => { throw new Error('ENOTFOUND'); };
    const out = await loadBaseline(dir, { cacheDir: null, fetch });
    assert.equal(out[0].content, 'BUNDLED ON ERROR');
    assert.equal(out[0]._source, 'bundled');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline: falls back to bundled on empty remote body', async () => {
  // A 200 with empty body shouldn't be treated as a valid skill.
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-empty-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'z.md'), 'BUNDLED ON EMPTY');
    const fetch = async () => ({ ok: true, status: 200, text: async () => '' });
    const out = await loadBaseline(dir, { cacheDir: null, fetch });
    assert.equal(out[0].content, 'BUNDLED ON EMPTY');
    assert.equal(out[0]._source, 'bundled');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadBaseline: cache key differs by upstream base — switching bases re-fetches', async () => {
  // If the cache key ignored the base URL, a user who set
  // CLUD_BUG_AGENT_SKILLS_BASE to a fork and then unset it would silently
  // get the fork's content from cache. Cache keys must include the base.
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-base-'));
  const cache = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-base-cache-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'shared-name.md'), 'BUNDLED');
    let calls = 0;
    const fetch = async (url) => {
      calls++;
      return { ok: true, status: 200, text: async () => `REMOTE-FROM-${url}` };
    };
    const originalBase = process.env.CLUD_BUG_AGENT_SKILLS_BASE;
    try {
      process.env.CLUD_BUG_AGENT_SKILLS_BASE = 'https://fork-a.example/skills';
      // Force re-import to pick up the env-driven AGENT_SKILLS_BASE.
      // (Tests use fresh import via dynamic specifier with cache-buster.)
      const modA = await import('../lib/skills.js?base-a');
      await modA.loadBaseline(dir, { cacheDir: cache, fetch });
      assert.equal(calls, 1, 'first base: 1 fetch');

      process.env.CLUD_BUG_AGENT_SKILLS_BASE = 'https://fork-b.example/skills';
      const modB = await import('../lib/skills.js?base-b');
      await modB.loadBaseline(dir, { cacheDir: cache, fetch });
      assert.equal(calls, 2, 'second base: cache key differs, must re-fetch');
    } finally {
      if (originalBase === undefined) delete process.env.CLUD_BUG_AGENT_SKILLS_BASE;
      else process.env.CLUD_BUG_AGENT_SKILLS_BASE = originalBase;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(cache, { recursive: true, force: true });
  }
});

test('loadBaseline: cache hit avoids network on second call', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-cache-src-'));
  const cache = await mkdtemp(join(tmpdir(), 'clud-bug-baseline-cache-dst-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'cached.md'), 'BUNDLED');
    let fetchCount = 0;
    const fetch = async () => {
      fetchCount++;
      return { ok: true, status: 200, text: async () => 'REMOTE-VIA-CACHE' };
    };
    // First call: warms the cache.
    await loadBaseline(dir, { cacheDir: cache, fetch });
    assert.equal(fetchCount, 1);
    // Second call: should hit the cache, not the network.
    const out = await loadBaseline(dir, { cacheDir: cache, fetch });
    assert.equal(fetchCount, 1, 'second call must not fetch');
    assert.equal(out[0].content, 'REMOTE-VIA-CACHE');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(cache, { recursive: true, force: true });
  }
});

test('sanitizeSlug normalizes names safely', () => {
  assert.equal(_internal.sanitizeSlug('Foo Bar!'), 'foo-bar');
  assert.equal(_internal.sanitizeSlug('--Already-OK--'), 'already-ok');
});

test('writeSkills creates a manifest tracking what it installed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-manifest-'));
  try {
    const client = new SkillsClient({
      fetch: mockFetch({ '/skills/foo/bar': { content: 'remote body' } }),
    });
    await writeSkills(dir, [
      { source: 'foo', name: 'bar', kind: 'remote' },
      { source: 'clud-bug-baseline', name: 'baseline-skill', kind: 'baseline', content: 'b' },
    ], client);
    const manifest = await readManifest(dir);
    assert.equal(manifest.installed.length, 2);
    const baseline = manifest.installed.find(e => e.kind === 'baseline');
    const remote = manifest.installed.find(e => e.kind === 'remote');
    assert.equal(baseline.slug, 'baseline-skill');
    assert.equal(remote.slug, 'bar');
    assert.equal(remote.source, 'foo');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('readManifest returns empty when file missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-empty-'));
  try {
    const m = await readManifest(dir);
    assert.equal(m.installed.length, 0);
    assert.equal(m.version, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('mergeManifest replaces by key, never duplicates', () => {
  const existing = { installed: [
    { slug: 'a', source: 'x', name: 'a', kind: 'remote' },
    { slug: 'baseline-thing', kind: 'baseline' },
  ]};
  const merged = mergeManifest(existing, [
    { slug: 'a', source: 'x', name: 'a', kind: 'remote', description: 'updated' },
    { slug: 'b', source: 'y', name: 'b', kind: 'remote' },
  ]);
  assert.equal(merged.installed.length, 3);
  assert.equal(merged.installed.find(e => e.slug === 'a').description, 'updated');
});

test('writeSkills called twice merges manifests instead of overwriting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-merge-'));
  try {
    const client = new SkillsClient({ fetch: mockFetch({
      '/skills/a/x': { content: 'A' },
      '/skills/b/y': { content: 'B' },
    })});
    await writeSkills(dir, [{ source: 'a', name: 'x', kind: 'remote' }], client);
    await writeSkills(dir, [{ source: 'b', name: 'y', kind: 'remote' }], client);
    const m = await readManifest(dir);
    const slugs = m.installed.map(e => e.slug).sort();
    assert.deepEqual(slugs, ['x', 'y']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('removeSkill deletes dir and manifest entry; refuses non-managed slug', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-remove-'));
  try {
    const client = new SkillsClient({ fetch: mockFetch({ '/skills/x/y': { content: 'C' } })});
    await writeSkills(dir, [{ source: 'x', name: 'y', kind: 'remote' }], client);
    await removeSkill(dir, 'y');
    const m = await readManifest(dir);
    assert.equal(m.installed.length, 0);
    await assert.rejects(removeSkill(dir, 'never-installed'), /not in the clud-bug manifest/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('listInstalled groups baseline / remote / custom correctly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-list-'));
  try {
    const client = new SkillsClient({ fetch: mockFetch({ '/skills/foo/bar': { content: 'r' } })});
    await writeSkills(dir, [
      { source: 'foo', name: 'bar', kind: 'remote', description: 'remote desc' },
      { source: 'clud-bug-baseline', name: 'discipline', kind: 'baseline', content: '---\nname: discipline\ndescription: rules\n---', description: '(bundled baseline)' },
    ], client);
    // hand-author a custom skill
    const customDir = join(dir, 'my-custom');
    await mkdir(customDir, { recursive: true });
    await writeFile(join(customDir, 'SKILL.md'), '---\nname: my-custom\ndescription: my team rules\n---\n# rules');

    const groups = await listInstalled(dir);
    assert.equal(groups.baseline.length, 1);
    assert.equal(groups.remote.length, 1);
    assert.equal(groups.custom.length, 1);
    assert.equal(groups.custom[0].slug, 'my-custom');
    assert.equal(groups.custom[0].description, 'my team rules');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('diffManifest produces add/remove/unchanged buckets and ignores baseline removal', () => {
  const manifest = { installed: [
    { slug: 'a', source: 'x', name: 'a', kind: 'remote' },
    { slug: 'b', source: 'y', name: 'b', kind: 'remote' },
    { slug: 'baseline-1', kind: 'baseline' },
  ]};
  const recommended = [
    { source: 'x', name: 'a', kind: 'remote' },     // unchanged
    { source: 'z', name: 'c', kind: 'remote' },     // new add
  ];
  const diff = diffManifest(manifest, recommended);
  assert.equal(diff.unchanged.length, 1);
  assert.equal(diff.add.length, 1);
  assert.equal(diff.add[0].name, 'c');
  assert.equal(diff.remove.length, 1);
  assert.equal(diff.remove[0].slug, 'b');  // baseline-1 not removed
});

test('writeSkill (single) writes one SKILL.md without touching manifest', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-single-'));
  try {
    const client = new SkillsClient({ fetch: mockFetch({ '/skills/p/q': { content: 'single' } })});
    const { writeSkill } = await import('../lib/skills.js');
    const entry = await writeSkill(dir, { source: 'p', name: 'q', kind: 'remote' }, client);
    assert.equal(entry.slug, 'q');
    assert.equal(await readFile(join(dir, 'q', 'SKILL.md'), 'utf8'), 'single');
    // No manifest written by writeSkill alone
    const m = await readManifest(dir);
    assert.equal(m.installed.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('manifest extra fields (pinVersion, lastUpdate*) survive writeSkills + mergeManifest', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-pin-survive-'));
  try {
    // Pre-seed manifest with extension fields a user might have set.
    await writeManifest(dir, {
      version: 1,
      installed: [{ slug: 'a', source: 'x', name: 'a', kind: 'remote' }],
      pinVersion: '0.3.0',
      lastUpdate: '2026-05-01T00:00:00Z',
      lastUpdateVersion: '0.3.0',
    });

    // writeSkills (which goes through mergeManifest) must not strip extras.
    const client = new SkillsClient({
      fetch: mockFetch({ '/skills/y/z': { content: 'new' } }),
    });
    await writeSkills(dir, [{ source: 'y', name: 'z', kind: 'remote' }], client);

    const after = await readManifest(dir);
    assert.equal(after.pinVersion, '0.3.0', 'pinVersion must survive writeSkills');
    assert.equal(after.lastUpdate, '2026-05-01T00:00:00Z');
    assert.equal(after.lastUpdateVersion, '0.3.0');
    assert.ok(after.installed.find((e) => e.slug === 'z'));
    assert.ok(after.installed.find((e) => e.slug === 'a'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
