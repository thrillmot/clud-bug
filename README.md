# Clud Bug 🐛
### A field guide to specimens crawling your code

> **[cludbug.dev](https://cludbug.dev)** · live field journal.

Clud Bug is a Claude PR-review naturalist for your GitHub repo. It pins **project-aware skills** auto-discovered from [skills.sh](https://skills.sh) and ships a baseline kit of review discipline so reviews stay focused on what matters: bugs, security, performance, and missing tests.

One command to install. The first PR you open afterwards gets a real review comment back — typically within two minutes.

## Quickstart

```bash
cd your-repo
npx clud-bug init
git add .claude .github/workflows/clud-bug-review.yml
git commit -m "Add clud-bug PR review"
git push
```

Then in your repo on GitHub:
**Settings → Secrets and variables → Actions → New repository secret** → set `ANTHROPIC_API_KEY`.

Open a PR. A review comment should appear within ~2 minutes.

## What `clud-bug init` does

The naturalist arrives at your repo, surveys the habitat, and assembles a field kit:

1. **Surveys habitat.** Reads `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc., to learn what your stack is.
2. **Consults [skills.sh](https://skills.sh).** Pulls review skills relevant to your dependencies (e.g. a Next.js project gets Next.js review specimens).
3. **Pins three baseline specimens** that enforce review discipline regardless of stack:
   - `critical-issues-only` — flag bugs, security, perf only. Skip nits.
   - `evidence-based-review` — every claim must quote the line being criticized.
   - `respect-existing-conventions` — don't suggest fights with the codebase's patterns.
4. **Writes** the chosen specimens to `.claude/skills/<name>/SKILL.md` (Claude Code auto-loads them in the GitHub Action).
5. **Drafts the field kit** at `.github/workflows/clud-bug-review.yml` with your project description filled in and the right permissions/tool allowlist for `gh pr comment` to actually post.

## CLI options

```
npx clud-bug init [options]

  --offline       Skip skills.sh; install only the bundled baseline skills.
  --accept-all,-y Accept the recommended skill set without prompting.
  --commit        git add + commit the generated files when done.
  --help,-h       Show help.
```

## Auditing the whole repo

PR reviews catch issues entering. Audits catch issues that already crossed the line.

```bash
clud-bug audit                      # walk every tracked file
clud-bug audit --changed-in 7d      # only files touched in the last 7 days
clud-bug audit --since 2026-01-01   # only files touched since a date
clud-bug audit --scope 'src/**/*.ts'  # narrow by glob (repeatable)
```

The CLI prepares an `audits/YYYY-MM-DD.md` stub. For findings, `clud-bug init` also installed `.github/workflows/clud-bug-audit.yml` — go to **Actions → Clud Bug 🐛 Audit → Run workflow**. Clud Bug walks the manifest, appends findings to the same file, opens a PR you can read, act on, then merge or close.

The workflow ships with `workflow_dispatch` only (manual). The cron is in the file, commented — uncomment for weekly audits.

## Managing skills

After `init`, four commands let you evolve the skill set without re-running the whole setup:

```bash
clud-bug list                                       # show what's installed
clud-bug add vercel-labs/skills/next-best-practices # install one from skills.sh
clud-bug remove next-best-practices                 # uninstall (refuses custom skills)
clud-bug refresh                                    # re-query skills.sh, diff vs installed
```

Skills are tracked in `.claude/skills/.clud-bug.json` (a small manifest). Anything in `.claude/skills/` that *isn't* in the manifest is treated as your custom work and never modified by `clud-bug` commands.

## Adding your own skills

Drop any `.md` file into `.claude/skills/<your-skill>/SKILL.md` — Claude Code auto-discovers it on the next PR. Same format as skills from skills.sh:

```markdown
---
name: my-team-rules
description: One-line description of what this skill teaches the reviewer.
---

# My team rules

Rules go here. Be specific, cite examples, explain the why.
```

This is how you encode your team's PR-review discipline (e.g. "always check for SQL injection in `db/queries/`", "API responses must include error codes from `lib/errors.ts`").

## Why this works (and why the original `claude-code-action` install often doesn't)

`anthropics/claude-code-action@v1` is the underlying engine — clud-bug just configures it correctly. Two things people commonly miss when wiring it themselves:

- **`gh pr comment` is disabled by default.** Without `--allowedTools` whitelisting it, Claude runs, thinks, and exits silently. clud-bug's generated workflow includes the right allowlist.
- **Skills are not auto-loaded from anywhere.** If you don't ship `.claude/skills/*` in your repo, Claude reviews with zero project context. clud-bug installs a curated set so the review is actually project-aware.

## Fork PR caveat ⚠️

GitHub does **not** pass repo secrets (including `ANTHROPIC_API_KEY`) to workflows triggered by PRs from forks. By default, `pull_request` workflows on fork PRs will run with no API key and produce no comment.

If you want clud-bug to review fork PRs too, you have two options:

1. **Maintainer re-pushes the branch** to your repo as a non-fork branch, and the review runs.
2. **Switch the trigger to `pull_request_target`** (advanced) — this gives the workflow access to secrets but runs against the *base* ref, not the PR's code. To safely review the PR's actual code, follow [`anthropics/claude-code-action` security.md](https://github.com/anthropics/claude-code-action/blob/main/docs/security.md): check out the PR head into a **subdirectory** (not the workspace root) and pass it via `--add-dir`. Skipping this is a code-execution risk.

clud-bug's generated workflow uses `pull_request` by default. If you understand the trade-offs, edit the trigger yourself.

## Verifying it works

After install:

1. Confirm `ANTHROPIC_API_KEY` secret is set on the repo.
2. Open a throwaway PR with an obvious bug (e.g. `const x = null; x.foo()`).
3. Within ~2 min, Clud Bug should post a comment flagging it.
4. If no comment: check the **Actions** tab logs. Look for `gh pr comment` invocations and any "Resource not accessible by integration" errors (usually a permissions issue or a fork PR).

## Manual install (advanced)

If you don't want to use the CLI, you can install a generic workflow by hand:

```bash
mkdir -p .github/workflows
curl -o .github/workflows/clud-bug-review.yml \
  https://raw.githubusercontent.com/thrillmot/clud-bug/main/templates/workflow.yml.tmpl
# Edit {{PROJECT_DESCRIPTION}} and {{LANGUAGE_HINTS}} placeholders by hand.
```

The CLI does this for you, plus skill curation.

## Contributing

Pull requests welcome. If you're adding a new detector for a language ecosystem, put it in `lib/detect.js` and add a fixture-based test in `test/detect.test.js`.

```bash
npm test          # node:test, no runtime deps
```

## License

MIT.
