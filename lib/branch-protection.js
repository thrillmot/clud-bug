// Helpers for managing `required_conversation_resolution` on the default
// branch via the `gh` CLI. Factored out so `runInit` can call this without
// embedding `spawnSync` boilerplate, and so tests can swap a mock for the
// real `gh` invocation.
//
// Why `gh` rather than direct fetch(): clud-bug already depends on `gh`
// being installed and authenticated (workflows use `gh pr comment`, edit
// workflows use `gh pr create`). Reusing it inherits the user's auth
// instead of asking them to set up another token.
//
// API endpoints used:
//   GET /repos/{owner}/{repo}
//     → .default_branch
//   GET /repos/{owner}/{repo}/branches/{branch}/protection
//     → .required_conversation_resolution.enabled (true/false), OR 404 if
//       the branch has no protection rule at all.
//   POST /repos/{owner}/{repo}/branches/{branch}/protection/required_conversation_resolution
//     → enables the single flag without touching other settings. This is
//       a real single-flag endpoint; we don't have to GET-merge-PUT the
//       full protection JSON.

import { spawn } from 'node:child_process';

// Default `gh` invoker: spawns `gh <args>` and resolves with
// { code, stdout, stderr }. Tests pass a function with the same shape.
function defaultGh(args, { stdin } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (stdin) child.stdin.end(stdin);
    else child.stdin.end();
  });
}

// Returns { owner, repo } from the local git remote. Uses
// `gh repo view --json owner,name` so it doesn't depend on parsing URLs.
export async function detectRepo({ gh = defaultGh } = {}) {
  const { code, stdout, stderr } = await gh(['repo', 'view', '--json', 'owner,name']);
  if (code !== 0) {
    throw new Error(`gh repo view failed (${code}): ${stderr.trim() || '(no stderr)'}`);
  }
  const parsed = JSON.parse(stdout);
  return { owner: parsed.owner.login, repo: parsed.name };
}

// Returns the default branch name (e.g. "main", "master", "trunk").
export async function detectDefaultBranch({ owner, repo, gh = defaultGh } = {}) {
  const { code, stdout, stderr } = await gh(['api', `repos/${owner}/${repo}`, '--jq', '.default_branch']);
  if (code !== 0) {
    throw new Error(`Could not read default_branch for ${owner}/${repo}: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout.trim();
}

// Inspects the current required_conversation_resolution state. Returns
// one of:
//   { state: 'enabled' }
//   { state: 'disabled' }
//   { state: 'no-protection' }   // branch has no protection rule at all
//   { state: 'forbidden' }       // user lacks admin perms
//   { state: 'unknown', reason }  // any other failure mode
//
// The reason this returns a discriminated union rather than throwing is
// that runInit decides what to do based on the state: each value above
// has a different user-facing message and follow-up action.
export async function getProtectionState({ owner, repo, branch, gh = defaultGh } = {}) {
  const { code, stdout, stderr } = await gh([
    'api',
    `repos/${owner}/${repo}/branches/${branch}/protection`,
    '--jq', '.required_conversation_resolution.enabled // false',
  ]);
  if (code === 0) {
    return { state: stdout.trim() === 'true' ? 'enabled' : 'disabled' };
  }
  // gh prints HTTP details to stderr. Look for the markers we recognize.
  const blob = `${stdout}\n${stderr}`;
  if (/404|Branch not protected|Not Found/i.test(blob)) return { state: 'no-protection' };
  if (/403|Forbidden|Resource not accessible|admin/i.test(blob)) return { state: 'forbidden' };
  return { state: 'unknown', reason: stderr.trim() || stdout.trim() || `gh exited ${code}` };
}

// Enables the single flag via the dedicated endpoint. Doesn't touch any
// other protection settings. Returns { ok: true } on success or
// { ok: false, state, reason } using the same state taxonomy as
// getProtectionState() so callers can produce a consistent message.
export async function enableConversationResolution({ owner, repo, branch, gh = defaultGh } = {}) {
  const { code, stdout, stderr } = await gh([
    'api', '-X', 'POST',
    `repos/${owner}/${repo}/branches/${branch}/protection/required_conversation_resolution`,
  ]);
  if (code === 0) return { ok: true };
  const blob = `${stdout}\n${stderr}`;
  if (/404|Branch not protected|Not Found/i.test(blob)) {
    return { ok: false, state: 'no-protection', reason: 'Branch has no base protection rule; enable basic branch protection first.' };
  }
  if (/403|Forbidden|Resource not accessible|admin/i.test(blob)) {
    return { ok: false, state: 'forbidden', reason: 'You do not have admin permissions on this repository.' };
  }
  return { ok: false, state: 'unknown', reason: stderr.trim() || stdout.trim() || `gh exited ${code}` };
}
