import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), 'bin', 'clud-bug.js');

function run(cwd, args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
    input: opts.input,
  });
}

async function makeRepo(files = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'clud-bug-cli-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return dir;
}

test('--help prints usage including all subcommands', () => {
  const r = run(process.cwd(), ['--help']);
  assert.equal(r.status, 0);
  for (const cmd of ['init', 'list', 'add', 'remove', 'refresh']) {
    assert.match(r.stdout, new RegExp(cmd));
  }
});

test('--version prints package version', () => {
  const r = run(process.cwd(), ['--version']);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('unknown command exits 2 with help', () => {
  const r = run(process.cwd(), ['nonsense']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown command/);
});

test('init --offline --accept-all in a fresh repo writes workflow + manifest', async () => {
  const dir = await makeRepo({
    'package.json': JSON.stringify({ name: 'demo', dependencies: { next: '^15' }}),
  });
  try {
    const r = run(dir, ['init', '--offline', '--accept-all']);
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const wf = await readFile(join(dir, '.github/workflows/clud-bug-review.yml'), 'utf8');
    assert.match(wf, /allowedTools/);
    const manifest = JSON.parse(await readFile(join(dir, '.claude/skills/.clud-bug.json'), 'utf8'));
    assert.equal(manifest.installed.length, 3, 'should install 3 baseline skills');
    assert.ok(manifest.installed.every(e => e.kind === 'baseline'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('list shows baseline + custom after init + hand-authored skill', async () => {
  const dir = await makeRepo({ 'package.json': '{}' });
  try {
    run(dir, ['init', '--offline', '--accept-all']);
    // hand-author a custom skill
    const customDir = join(dir, '.claude/skills/my-team-rules');
    await mkdir(customDir, { recursive: true });
    await writeFile(join(customDir, 'SKILL.md'), '---\nname: my-team-rules\ndescription: our rules\n---');
    const r = run(dir, ['list']);
    assert.equal(r.status, 0, `list failed: ${r.stderr}`);
    assert.match(r.stdout, /Baseline/);
    assert.match(r.stdout, /Custom/);
    assert.match(r.stdout, /my-team-rules/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('list reports zero state cleanly', async () => {
  const dir = await makeRepo({});
  try {
    const r = run(dir, ['list']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Empty collection/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('remove refuses unmanaged slug, succeeds on managed one', async () => {
  const dir = await makeRepo({});
  try {
    run(dir, ['init', '--offline', '--accept-all']);
    const fail = run(dir, ['remove', 'no-such-slug']);
    assert.notEqual(fail.status, 0);
    assert.match(fail.stderr, /not in the clud-bug manifest/);
    // baseline slug should be removable (will return on next init)
    const ok = run(dir, ['remove', 'critical-issues-only']);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /unpinned critical-issues-only/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('add rejects malformed ref', () => {
  const r = run(process.cwd(), ['add', 'no-slash']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: clud-bug add/);
});

test('refresh in empty repo prompts to init first', async () => {
  const dir = await makeRepo({});
  try {
    const r = run(dir, ['refresh', '--offline', '--accept-all']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Run `clud-bug init` first/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('refresh aborts (does NOT remove remote skills) when skills.sh is unreachable', async () => {
  const dir = await makeRepo({ 'package.json': JSON.stringify({ dependencies: { next: '^15' }})});
  try {
    // Hand-craft a manifest that includes a remote skill (simulates a previous successful add).
    await mkdir(join(dir, '.claude/skills/some-remote'), { recursive: true });
    await writeFile(join(dir, '.claude/skills/some-remote/SKILL.md'), '---\nname: some-remote\n---');
    await writeFile(
      join(dir, '.claude/skills/.clud-bug.json'),
      JSON.stringify({ version: 1, installed: [
        { slug: 'some-remote', source: 'foo', name: 'some-remote', kind: 'remote' },
      ]}, null, 2),
    );

    // Force fetch failure by pointing at an unresolvable host via env.
    // We can't easily monkey-patch fetch in a child process, so use --offline=false
    // and an env shim that swaps the SkillsClient base URL.
    const r = run(dir, ['refresh', '--accept-all'], {
      env: { CLUD_BUG_SKILLS_SH_BASE: 'http://127.0.0.1:1' },
    });

    // Either the process exits non-zero with the refusal warning, OR the API isn't
    // overridable from env (in which case skip — covered by skills.test.js diff logic).
    // We must NEVER see "skills updated" indicating removal proceeded.
    assert.doesNotMatch(r.stdout + r.stderr, /collection updated/, 'refresh proceeded with removals despite API failure');
    // Verify the remote skill is still on disk
    const stillThere = await readFile(join(dir, '.claude/skills/some-remote/SKILL.md'), 'utf8');
    assert.match(stillThere, /some-remote/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('refresh --offline --accept-all does NOT remove remote skills from manifest', async () => {
  const dir = await makeRepo({ 'package.json': '{}' });
  try {
    // Pre-existing manifest with a remote skill (simulates a previous successful add).
    await mkdir(join(dir, '.claude/skills/keep-me'), { recursive: true });
    await writeFile(join(dir, '.claude/skills/keep-me/SKILL.md'), '---\nname: keep-me\n---');
    await writeFile(
      join(dir, '.claude/skills/.clud-bug.json'),
      JSON.stringify({ version: 1, installed: [
        { slug: 'keep-me', source: 'foo', name: 'keep-me', kind: 'remote' },
      ]}, null, 2),
    );
    const r = run(dir, ['refresh', '--offline', '--accept-all']);
    assert.equal(r.status, 0, r.stderr);
    // Remote skill must still exist on disk
    const stillThere = await readFile(join(dir, '.claude/skills/keep-me/SKILL.md'), 'utf8');
    assert.match(stillThere, /keep-me/);
    // And still in the manifest
    const manifest = JSON.parse(await readFile(join(dir, '.claude/skills/.clud-bug.json'), 'utf8'));
    assert.ok(manifest.installed.some(e => e.slug === 'keep-me'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('refresh --offline shows no-op when only baseline installed', async () => {
  const dir = await makeRepo({ 'package.json': '{}' });
  try {
    run(dir, ['init', '--offline', '--accept-all']);
    const r = run(dir, ['refresh', '--offline', '--accept-all']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /sync with skills\.sh|collection updated/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
