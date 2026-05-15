import { spawnSync } from 'node:child_process';

// Convert a duration like "7d", "2w", "1mo", "3mo", "1y" to a git --since arg.
// Returns null if the input is empty/undefined; throws on malformed input.
export function durationToGitSince(input) {
  if (!input) return null;
  const m = String(input).trim().match(/^(\d+)\s*(d|w|mo|m|y)$/i);
  if (!m) {
    throw new Error(`Unrecognized duration "${input}". Examples: 7d, 2w, 1mo, 1y.`);
  }
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const map = { d: 'day', w: 'week', mo: 'month', m: 'month', y: 'year' };
  return `${n} ${map[unit]}${n === 1 ? '' : 's'} ago`;
}

// Run a git command, return stdout lines split by \n. Throws on non-zero exit
// unless { allowFail: true }, in which case returns [].
export function gitLines(args, opts = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd: opts.cwd || process.cwd() });
  if (r.status !== 0) {
    if (opts.allowFail) return [];
    throw new Error(`git ${args.join(' ')} failed (${r.status}): ${r.stderr.trim()}`);
  }
  return r.stdout.split('\n').filter(Boolean);
}

// Returns the file set the audit should consider, in repo-relative paths.
// Filters: optional --since (git date), optional --changed-in (duration string),
// optional --scope globs (one or more, repeatable).
export function computeAuditFileSet({ since, changedIn, scopes = [], cwd } = {}) {
  const sinceArg = since || (changedIn ? durationToGitSince(changedIn) : null);

  let files;
  if (sinceArg) {
    // Files touched in commits within the window. --diff-filter excludes
    // deleted files (we can't audit something that no longer exists).
    files = gitLines(['log', `--since=${sinceArg}`, '--name-only', '--pretty=format:', '--diff-filter=d'], { cwd });
    files = [...new Set(files)];
  } else {
    files = gitLines(['ls-files'], { cwd });
  }

  if (scopes.length) {
    const matchers = scopes.map(globToRegex);
    files = files.filter((f) => matchers.some((rx) => rx.test(f)));
  }

  // Skip vendor / build artifacts that bloat audits without adding signal.
  const skip = /(^|\/)(node_modules|dist|build|out|\.next|\.vercel|coverage|target|__pycache__)\//;
  return files.filter((f) => !skip.test(f)).sort();
}

// Minimal glob → RegExp. Supports **, *, ?. Anchors at both ends so that
// 'src/**/*.ts' matches 'src/lib/foo.ts' but not 'app/src/lib/foo.ts'.
function globToRegex(glob) {
  let rx = '';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      // ** = any depth (including zero) of path segments
      rx += '.*';
      i += 2;
      // consume an optional trailing slash so 'src/**/*.ts' works cleanly
      if (glob[i] === '/') i++;
    } else if (ch === '*') {
      rx += '[^/]*';
      i++;
    } else if (ch === '?') {
      rx += '[^/]';
      i++;
    } else if (/[.+^$|()\[\]{}\\]/.test(ch)) {
      rx += '\\' + ch;
      i++;
    } else {
      rx += ch;
      i++;
    }
  }
  return new RegExp(`^${rx}$`);
}

// Render the audit report's initial markdown body. The Action's Claude run
// will append findings under a "## Findings" section after this header.
export function renderAuditHeader({ date, scopeLabel, files }) {
  const head = `# 🐛 Clud Bug audit — ${date}

A scheduled walk through the habitat. Scope: ${scopeLabel}.
Files surveyed: **${files.length}**.

<details>
<summary>File manifest (${files.length})</summary>

\`\`\`
${files.join('\n')}
\`\`\`

</details>

---

## Findings

`;
  return head;
}
