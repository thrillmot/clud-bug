#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { detect, buildDescriptionLine } from '../lib/detect.js';
import { renderFile, pickTemplate } from '../lib/render.js';
import { SkillsClient, rankAndCap, writeSkills, loadBaseline } from '../lib/skills.js';

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

const HELP = `clud-bug — install Claude PR review with project-aware skills

Usage:
  npx clud-bug init [options]

Options:
  --offline       Skip skills.sh; install only the bundled baseline skills.
  --accept-all,-y Accept the recommended skill set without prompting.
  --commit        git add + commit the generated files when done.
  --help,-h       Show this help.
  --version,-v    Show version.
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
  if (cmd !== 'init') {
    process.stderr.write(`Unknown command: ${cmd || '(none)'}\n\n${HELP}`);
    process.exit(2);
  }

  await runInit(args);
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

function rel(from, to) {
  return to.startsWith(from + '/') ? to.slice(from.length + 1) : to;
}
function log(msg) { process.stdout.write(msg + '\n'); }
function warn(msg) { process.stderr.write(`  ! ${msg}\n`); }

main().catch(err => {
  process.stderr.write(`clud-bug: ${err.message}\n`);
  process.exit(1);
});
