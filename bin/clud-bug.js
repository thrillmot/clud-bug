#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { detect, buildDescriptionLine } from '../lib/detect.js';
import { renderFile, pickTemplate } from '../lib/render.js';
import {
  SkillsClient, rankAndCap, writeSkills, writeSkill, loadBaseline,
  readManifest, writeManifest, removeSkill, listInstalled, diffManifest,
} from '../lib/skills.js';

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATES = join(PKG_ROOT, 'templates');
const BASELINE_DIR = join(TEMPLATES, 'skills', 'baseline');

function parseArgs(argv) {
  const args = { _: [], offline: false, acceptAll: false, commit: false, help: false, version: false };
  for (const a of argv) {
    if (a === '--offline') args.offline = true;
    else if (a === '--accept-all' || a === '-y') args.acceptAll = true;
    else if (a === '--commit') args.commit = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--version' || a === '-v') args.version = true;
    else args._.push(a);
  }
  return args;
}

const HELP = `clud-bug — Claude PR review with project-aware skills

Usage:
  npx clud-bug <command> [options]

Commands:
  init                  First-time setup: detect repo, install skills, write workflow.
  list                  Show currently installed skills (baseline / remote / custom).
  add <source/name>     Install one skill from skills.sh (e.g. vercel-labs/skills/next-best-practices).
  remove <slug>         Remove an installed skill (refuses if it's a custom skill).
  refresh               Re-query skills.sh and diff against installed; prompt to update.

Options:
  --offline             Skip skills.sh; only use bundled baseline skills (init/refresh).
  --accept-all,-y       Accept recommendations without prompting.
  --commit              git add + commit the generated files when done (init only).
  --help,-h             Show this help.
  --version,-v          Show version.
`;

async function readPkgVersion() {
  const pkg = JSON.parse(await readFile(join(PKG_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }
  if (args.version) { process.stdout.write((await readPkgVersion()) + '\n'); return; }

  const cmd = args._[0];
  switch (cmd) {
    case 'init':    return runInit(args);
    case 'list':    return runList(args);
    case 'add':     return runAdd(args);
    case 'remove':  return runRemove(args);
    case 'refresh': return runRefresh(args);
    default:
      process.stderr.write(`Unknown command: ${cmd || '(none)'}\n\n${HELP}`);
      process.exit(2);
  }
}

async function runInit(args) {
  const cwd = process.cwd();
  log(`🐛 clud-bug init in ${cwd}`);

  log('  detecting repo signals...');
  const signals = await detect(cwd);
  log(`    primary language: ${signals.primaryLanguage || '(unknown)'}`);
  log(`    search terms:     ${signals.searchTerms.join(', ') || '(none)'}`);

  const baseline = await loadBaseline(BASELINE_DIR);
  log(`    baseline skills:  ${baseline.length}`);

  let curated = [];
  let searched = [];
  if (args.offline) {
    log('  --offline: skipping skills.sh');
  } else {
    const client = new SkillsClient();
    try {
      log('  querying skills.sh...');
      [curated, searched] = await Promise.all([
        client.curated().catch(err => { warn(`curated query failed: ${err.message}`); return []; }),
        client.search(signals.searchTerms).catch(err => { warn(`search failed: ${err.message}`); return []; }),
      ]);
      log(`    curated: ${curated.length}, search hits: ${searched.length}`);
    } catch (err) {
      warn(`skills.sh unreachable (${err.message}); continuing with baseline only`);
    }
  }

  const recommended = rankAndCap(curated, searched, baseline);
  log('');
  log('Recommended skills:');
  for (const s of recommended) {
    const tag = s.kind === 'baseline' ? '[baseline]' : `[${s.source}]`;
    log(`  • ${s.name} ${tag}`);
    if (s.description && s.kind !== 'baseline') log(`      ${s.description}`);
  }
  log('');

  let chosen = recommended;
  if (!args.acceptAll && recommended.some(s => s.kind !== 'baseline')) {
    chosen = await promptForSkills(recommended);
  }

  log('  installing skills into .claude/skills/...');
  const client = new SkillsClient();
  const written = await writeSkills(join(cwd, '.claude', 'skills'), chosen, client);
  log(`    wrote ${written.length} skills`);

  log('  rendering workflow...');
  const tmplName = pickTemplate(signals.languages);
  const tmplPath = join(TEMPLATES, tmplName);
  const workflow = await renderFile(tmplPath, {
    PROJECT_DESCRIPTION: buildDescriptionLine(signals),
    LANGUAGE_HINTS: '',
  });
  const workflowPath = join(cwd, '.github', 'workflows', 'clud-bug-review.yml');
  await mkdir(dirname(workflowPath), { recursive: true });
  await writeFile(workflowPath, workflow);
  log(`    wrote ${rel(cwd, workflowPath)}`);

  if (args.commit) {
    log('  committing...');
    spawnSync('git', ['add', '.claude', '.github/workflows/clud-bug-review.yml'], { cwd, stdio: 'inherit' });
    spawnSync('git', ['commit', '-m', 'Add clud-bug Claude PR review'], { cwd, stdio: 'inherit' });
  }

  log('');
  log('Done. Next steps:');
  log('  1. Set ANTHROPIC_API_KEY in your repo secrets:');
  log('     Settings → Secrets and variables → Actions → New repository secret');
  if (!args.commit) {
    log('  2. git add .claude .github/workflows/clud-bug-review.yml && git commit && git push');
    log('  3. Open a PR — Clud Bug should comment within ~2 min.');
  } else {
    log('  2. git push, then open a PR — Clud Bug should comment within ~2 min.');
  }
  log('');
  log('Drop your own .claude/skills/<name>/SKILL.md files anytime — they\'re auto-loaded.');
}

async function promptForSkills(recommended) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question('Install all of the above? [Y/n/select] ');
    const a = answer.trim().toLowerCase();
    if (a === '' || a === 'y' || a === 'yes') return recommended;
    if (a === 'n' || a === 'no') return recommended.filter(s => s.kind === 'baseline');
    if (a === 's' || a === 'select') {
      const chosen = [];
      for (const skill of recommended) {
        if (skill.kind === 'baseline') { chosen.push(skill); continue; }
        const ans = await rl.question(`  install ${skill.name}? [Y/n] `);
        if (ans.trim().toLowerCase() !== 'n') chosen.push(skill);
      }
      return chosen;
    }
    return recommended;
  } finally {
    rl.close();
  }
}

async function runList(_args) {
  const skillsDir = join(process.cwd(), '.claude', 'skills');
  const groups = await listInstalled(skillsDir);
  const total = groups.baseline.length + groups.remote.length + groups.custom.length;
  if (total === 0) {
    log('No skills installed yet. Run `clud-bug init` to get started.');
    return;
  }
  log(`🐛 ${total} skill${total === 1 ? '' : 's'} in .claude/skills/`);
  if (groups.baseline.length) {
    log('');
    log('Baseline (always installed):');
    for (const s of groups.baseline) log(`  • ${s.slug}`);
  }
  if (groups.remote.length) {
    log('');
    log('From skills.sh:');
    for (const s of groups.remote) log(`  • ${s.slug}  ${s.source ? `[${s.source}]` : ''}`);
  }
  if (groups.custom.length) {
    log('');
    log('Custom (yours, never auto-modified):');
    for (const s of groups.custom) {
      log(`  • ${s.slug}${s.description ? `  — ${s.description}` : ''}`);
    }
  }
}

async function runAdd(args) {
  const ref = args._[1];
  if (!ref || !ref.includes('/')) {
    process.stderr.write('Usage: clud-bug add <source/name>  (e.g. vercel-labs/skills/next-best-practices)\n');
    process.exit(2);
  }
  // Last segment is the skill name; everything before is the source repo path.
  const lastSlash = ref.lastIndexOf('/');
  const source = ref.slice(0, lastSlash);
  const name = ref.slice(lastSlash + 1);
  const skillsDir = join(process.cwd(), '.claude', 'skills');
  log(`  fetching ${source}/${name} from skills.sh...`);
  const client = new SkillsClient();
  const entry = await writeSkill(skillsDir, { source, name, kind: 'remote' }, client);
  const manifest = await readManifest(skillsDir);
  const merged = { version: 1, installed: [...manifest.installed.filter(e => e.slug !== entry.slug), entry] };
  await writeManifest(skillsDir, merged);
  log(`  ✓ installed ${entry.slug} → .claude/skills/${entry.slug}/SKILL.md`);
  log('  Commit + push to apply on the next PR.');
}

async function runRemove(args) {
  const slug = args._[1];
  if (!slug) {
    process.stderr.write('Usage: clud-bug remove <slug>  (run `clud-bug list` to see installed slugs)\n');
    process.exit(2);
  }
  const skillsDir = join(process.cwd(), '.claude', 'skills');
  const entry = await removeSkill(skillsDir, slug);
  log(`  ✓ removed ${entry.slug}${entry.kind === 'baseline' ? ' (baseline — will return on next init)' : ''}`);
}

async function runRefresh(args) {
  const cwd = process.cwd();
  const skillsDir = join(cwd, '.claude', 'skills');
  const manifest = await readManifest(skillsDir);
  if (manifest.installed.length === 0) {
    log('No clud-bug-managed skills found. Run `clud-bug init` first.');
    return;
  }

  log('  detecting repo signals...');
  const signals = await detect(cwd);
  log(`    primary language: ${signals.primaryLanguage || '(unknown)'}`);
  log(`    search terms:     ${signals.searchTerms.join(', ') || '(none)'}`);

  const baseline = await loadBaseline(BASELINE_DIR);
  let curated = [];
  let searched = [];
  if (args.offline) {
    log('  --offline: skipping skills.sh — only baseline additions will be diffed; existing remote skills are preserved');
  } else {
    const client = new SkillsClient();
    let curatedErr, searchedErr;
    [curated, searched] = await Promise.all([
      client.curated().catch(err => { curatedErr = err; return []; }),
      client.search(signals.searchTerms).catch(err => { searchedErr = err; return []; }),
    ]);
    if (curatedErr || searchedErr) {
      const err = curatedErr || searchedErr;
      warn(`skills.sh unreachable (${err.message})`);
      warn('refusing to compute removals — an empty API response would look like "delete everything from skills.sh".');
      warn('Try again later, or run with --offline to install only baseline updates.');
      process.exit(1);
    }
  }
  const recommended = rankAndCap(curated, searched, baseline);
  const diff = diffManifest(manifest, recommended);

  // In --offline mode the recommendation set isn't authoritative (we only have
  // baseline locally), so any "missing from recommendations" entry is a false
  // positive. Suppress removals to avoid mass-deleting the user's remote skills.
  if (args.offline) diff.remove = [];

  log('');
  log(`  add:       ${diff.add.length}`);
  log(`  remove:    ${diff.remove.length} (custom skills untouched)`);
  log(`  unchanged: ${diff.unchanged.length}`);

  if (diff.add.length === 0 && diff.remove.length === 0) {
    log('');
    log('Nothing to update. Skills are in sync with skills.sh recommendations.');
    return;
  }

  log('');
  for (const s of diff.add)    log(`  + ${s.name} [${s.source || s.kind}]`);
  for (const s of diff.remove) log(`  - ${s.slug} [${s.source || s.kind}]`);

  if (!args.acceptAll) {
    const rl = createInterface({ input, output });
    const answer = await rl.question('\nApply these changes? [y/N] ');
    rl.close();
    if (answer.trim().toLowerCase() !== 'y') {
      log('Aborted. No files changed.');
      return;
    }
  }

  const client = new SkillsClient();
  if (diff.add.length) await writeSkills(skillsDir, diff.add, client);
  for (const entry of diff.remove) await removeSkill(skillsDir, entry.slug);
  log('  ✓ skills updated. Commit + push to apply on the next PR.');
}

function rel(from, to) {
  return to.startsWith(from + '/') ? to.slice(from.length + 1) : to;
}
function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write(`  ! ${msg}\n`); }

main().catch(err => {
  process.stderr.write(`clud-bug: ${err.message}\n`);
  process.exit(1);
});
