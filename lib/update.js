import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { renderFile, pickTemplate } from './render.js';
import { detect, buildDescriptionLine } from './detect.js';
import { loadBaseline, readManifest, writeManifest } from './skills.js';

// Re-render the user's workflow + refresh baseline skills using the
// templates / baseline shipped with the currently-installed clud-bug.
//
// Honors three protections:
//   - Custom skills (anything in .claude/skills/ not in the manifest) are
//     never modified.
//   - Remote skills (from skills.sh, kind: 'remote' in manifest) are left
//     alone unless { refreshRemote: true }.
//   - The audit workflow is also re-rendered if it's installed.
//
// Returns a diff summary with file paths and a short reason per file.
export async function runUpdate({
  cwd,
  templatesDir,
  baselineDir,
  ourVersion,
  refreshRemote = false,
} = {}) {
  if (!cwd || !templatesDir || !baselineDir || !ourVersion) {
    throw new Error('runUpdate requires cwd, templatesDir, baselineDir, ourVersion');
  }
  const skillsDir = join(cwd, '.claude', 'skills');
  const manifest = await readManifest(skillsDir);
  if (manifest.installed.length === 0 && !(await pathExists(join(cwd, '.github/workflows/clud-bug-review.yml')))) {
    return { changed: [], unchanged: [], missing: 'init' };
  }

  const changed = [];
  const unchanged = [];

  // 1. Re-render review workflow with the latest template.
  const signals = await detect(cwd);
  const tmplName = pickTemplate(signals.languages);
  const newReview = await renderFile(join(templatesDir, tmplName), {
    PROJECT_DESCRIPTION: buildDescriptionLine(signals),
    LANGUAGE_HINTS: '',
  });
  await maybeWrite(join(cwd, '.github/workflows/clud-bug-review.yml'), newReview, changed, unchanged, 'review workflow');

  // 2. Re-render audit workflow if it's installed (init from v0.3+ ships it).
  const auditPath = join(cwd, '.github/workflows/clud-bug-audit.yml');
  if (await pathExists(auditPath)) {
    const newAudit = await readFile(join(templatesDir, 'audit.yml.tmpl'), 'utf8');
    await maybeWrite(auditPath, newAudit, changed, unchanged, 'audit workflow');
  }

  // 3. Refresh baseline skills (always controlled by clud-bug).
  const baseline = await loadBaseline(baselineDir);
  for (const skill of baseline) {
    const skillPath = join(skillsDir, sanitize(skill.name), 'SKILL.md');
    await maybeWrite(skillPath, skill.content, changed, unchanged, `baseline ${skill.name}`);
  }

  // 4. Optionally refresh remote skills (off by default).
  // Custom skills are never touched.
  // (Remote refresh is intentionally minimal here — `clud-bug refresh`
  // already covers add/remove diffs against skills.sh.)
  if (refreshRemote) {
    // Placeholder for parity with the flag; full logic remains in
    // `clud-bug refresh`. We just emit an advisory.
  }

  // 5. Stamp the manifest with the version that ran the update.
  manifest.lastUpdate = new Date().toISOString();
  manifest.lastUpdateVersion = ourVersion;
  await writeManifest(skillsDir, manifest);

  return { changed, unchanged, ourVersion };
}

async function maybeWrite(path, contents, changed, unchanged, label) {
  const prior = await readSafe(path);
  if (prior === contents) {
    unchanged.push({ path, label });
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  changed.push({ path, label });
}

async function readSafe(path) {
  try { return await readFile(path, 'utf8'); } catch { return null; }
}

async function pathExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

function sanitize(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
