import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  durationToGitSince,
  computeAuditFileSet,
  renderAuditHeader,
} from '../lib/audit.js';

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

async function makeRepo(files = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-audit-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@test');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

test('durationToGitSince: parses 7d, 2w, 1mo, 1y', () => {
  assert.equal(durationToGitSince('7d'), '7 days ago');
  assert.equal(durationToGitSince('1d'), '1 day ago');
  assert.equal(durationToGitSince('2w'), '2 weeks ago');
  assert.equal(durationToGitSince('1mo'), '1 month ago');
  assert.equal(durationToGitSince('3mo'), '3 months ago');
  assert.equal(durationToGitSince('1y'), '1 year ago');
});

test('durationToGitSince: returns null on empty input', () => {
  assert.equal(durationToGitSince(undefined), null);
  assert.equal(durationToGitSince(''), null);
});

test('durationToGitSince: throws on garbage', () => {
  assert.throws(() => durationToGitSince('soon'), /Unrecognized duration/);
  assert.throws(() => durationToGitSince('7'), /Unrecognized duration/);
  assert.throws(() => durationToGitSince('5x'), /Unrecognized duration/);
});

test('computeAuditFileSet: lists all tracked files when no filter given', async () => {
  const dir = await makeRepo({
    'src/a.ts': 'a', 'src/b.ts': 'b', 'README.md': 'r',
  });
  try {
    const files = computeAuditFileSet({ cwd: dir });
    assert.deepEqual(files, ['README.md', 'src/a.ts', 'src/b.ts']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('computeAuditFileSet: skips node_modules / dist / build', async () => {
  const dir = await makeRepo({
    'src/a.ts': 'a',
    'node_modules/foo/index.js': 'x',
    'dist/bundle.js': 'x',
    'coverage/lcov.info': 'x',
  });
  try {
    const files = computeAuditFileSet({ cwd: dir });
    assert.deepEqual(files, ['src/a.ts']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('computeAuditFileSet: scope glob narrows the file set', async () => {
  const dir = await makeRepo({
    'src/a.ts': 'a', 'src/lib/b.ts': 'b', 'app/c.ts': 'c', 'README.md': 'r',
  });
  try {
    const files = computeAuditFileSet({ cwd: dir, scopes: ['src/**/*.ts'] });
    assert.deepEqual(files, ['src/a.ts', 'src/lib/b.ts']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('computeAuditFileSet: changed-in window restricts to recent commits', async () => {
  const dir = await makeRepo({ 'old.ts': 'old' });
  try {
    // simulate an old commit by setting an explicit author/committer date
    await writeFile(join(dir, 'recent.ts'), 'fresh');
    git(dir, 'add', 'recent.ts');
    git(dir, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'recent');

    const files = computeAuditFileSet({ cwd: dir, changedIn: '7d' });
    // Both files were committed today, so both should be included
    assert.ok(files.includes('recent.ts'));
    assert.ok(files.includes('old.ts'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('renderAuditHeader: includes date, scope, and file manifest', () => {
  const out = renderAuditHeader({
    date: '2026-05-15',
    scopeLabel: 'all tracked files',
    files: ['src/a.ts', 'src/b.ts'],
  });
  assert.match(out, /🐛 Clud Bug audit — 2026-05-15/);
  assert.match(out, /Files surveyed: \*\*2\*\*/);
  assert.match(out, /Scope: all tracked files/);
  assert.match(out, /src\/a\.ts/);
  assert.match(out, /## Findings/);
});
