# Clud Bug 🐛
### Crawling all over your code

> **[cludbug.dev](https://cludbug.dev)** · A field guide.

Claude PR review for any GitHub repo, with **project-aware skills** auto-discovered from [skills.sh](https://skills.sh) and a baseline of review-discipline skills bundled in.

One command to install. The first PR you open afterwards gets a real review comment back.

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

1. **Detects** your stack (Node, Python, Go, Rust, Ruby — reads `package.json`, `pyproject.toml`, `go.mod`, etc.).
2. **Queries [skills.sh](https://skills.sh)** for review skills relevant to your dependencies (e.g. a Next.js project gets Next.js review skills).
3. **Installs three baseline skills** that enforce review discipline regardless of stack:
   - `critical-issues-only` — flag bugs, security, perf only. Skip nits.
   - `evidence-based-review` — every claim must quote the line being criticized.
   - `respect-existing-conventions` — don't suggest fights with the codebase's patterns.
4. **Writes** the chosen skills to `.claude/skills/<name>/SKILL.md` (Claude Code auto-loads them in the GitHub Action).
5. **Generates** `.github/workflows/clud-bug-review.yml` with the project description filled in and the right permissions/tool allowlist for `gh pr comment` to actually work.

## CLI options

```
npx clud-bug init [options]

  --offline       Skip skills.sh; install only the bundled baseline skills.
  --accept-all,-y Accept the recommended skill set without prompting.
  --commit        git add + commit the generated files when done.
  --help,-h       Show help.
```

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
