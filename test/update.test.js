import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runUpdate } from '../lib/update.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATES = join(REPO_ROOT, 'templates');
const BASELINE = join(TEMPLATES, 'skills', 'baseline');

// Forced through to loadBaseline so tests don't hit the live agent-skills
// repo or write to the user's real ~/.cache/clud-bug/skills/ dir.
const offlineLoadBaseline = { cacheDir: null, fetch: async () => { throw new Error('test: no network'); } };

async function makeRepo(files = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-update-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return dir;
}

test('runUpdate: short-circuits when no manifest and no workflow exist', async () => {
  const dir = await makeRepo({});
  try {
    const r = await runUpdate({
      cwd: dir, templatesDir: TEMPLATES, baselineDir: BASELINE, ourVersion: '0.3.0',
      loadBaselineOpts: offlineLoadBaseline,
    });
    assert.equal(r.missing, 'init');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runUpdate: rewrites stale workflow + baseline; leaves custom skills alone', async () => {
  const dir = await makeRepo({
    'package.json': JSON.stringify({ name: 'demo' }),
    '.github/workflows/clud-bug-review.yml': '# stale\n',
    '.claude/skills/.clud-bug.json': JSON.stringify({
      version: 1,
      installed: [
        { slug: 'critical-issues-only', kind: 'baseline' },
        { slug: 'evidence-based-review', kind: 'baseline' },
        { slug: 'respect-existing-conventions', kind: 'baseline' },
      ],
    }),
    '.claude/skills/critical-issues-only/SKILL.md': '# stale baseline content\n',
    '.claude/skills/my-team-rules/SKILL.md': '---\nname: my-team-rules\ndescription: ours\n---\n# Hands off\n',
  });
  try {
    const r = await runUpdate({
      cwd: dir, templatesDir: TEMPLATES, baselineDir: BASELINE, ourVersion: '0.3.0',
      loadBaselineOpts: offlineLoadBaseline,
    });
    // Workflow refreshed
    const wf = await readFile(join(dir, '.github/workflows/clud-bug-review.yml'), 'utf8');
    assert.match(wf, /allowedTools/);
    // Baseline rewritten with current shipped content
    const baseline = await readFile(join(dir, '.claude/skills/critical-issues-only/SKILL.md'), 'utf8');
    assert.match(baseline, /critical-issues-only/);
    assert.doesNotMatch(baseline, /stale baseline content/);
    // Custom skill untouched
    const custom = await readFile(join(dir, '.claude/skills/my-team-rules/SKILL.md'), 'utf8');
    assert.match(custom, /Hands off/);
    // Manifest stamped
    const manifest = JSON.parse(await readFile(join(dir, '.claude/skills/.clud-bug.json'), 'utf8'));
    assert.equal(manifest.lastUpdateVersion, '0.3.0');
    assert.ok(manifest.lastUpdate);
    // Counts
    assert.ok(r.changed.length >= 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runUpdate: no-ops when files already match latest', async () => {
  const dir = await makeRepo({
    'package.json': JSON.stringify({ name: 'demo' }),
    '.claude/skills/.clud-bug.json': JSON.stringify({ version: 1, installed: [] }),
    '.github/workflows/clud-bug-review.yml': '# placeholder',
  });
  try {
    // First run — writes everything.
    await runUpdate({ cwd: dir, templatesDir: TEMPLATES, baselineDir: BASELINE, ourVersion: '0.3.0', loadBaselineOpts: offlineLoadBaseline });
    // Second run — should detect everything is current.
    const r = await runUpdate({ cwd: dir, templatesDir: TEMPLATES, baselineDir: BASELINE, ourVersion: '0.3.0', loadBaselineOpts: offlineLoadBaseline });
    assert.equal(r.changed.length, 0, 'second run should be a no-op');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runUpdate: re-renders audit workflow when installed', async () => {
  const dir = await makeRepo({
    'package.json': JSON.stringify({ name: 'demo' }),
    '.github/workflows/clud-bug-review.yml': '# stale review\n',
    '.github/workflows/clud-bug-audit.yml': '# stale audit\n',
    '.claude/skills/.clud-bug.json': JSON.stringify({ version: 1, installed: [] }),
  });
  try {
    const r = await runUpdate({ cwd: dir, templatesDir: TEMPLATES, baselineDir: BASELINE, ourVersion: '0.3.0', loadBaselineOpts: offlineLoadBaseline });
    const audit = await readFile(join(dir, '.github/workflows/clud-bug-audit.yml'), 'utf8');
    assert.match(audit, /Clud Bug 🐛 Audit/);
    assert.ok(r.changed.some((c) => c.label === 'audit workflow'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
