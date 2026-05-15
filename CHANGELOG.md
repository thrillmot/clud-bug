# Changelog

All notable changes to clud-bug. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.5.3] — 2026-05-15

### Changed
- **No functional changes.** Metadata-only release. The Stream A2 backfill of v0.4.1, v0.5.0, v0.5.1, v0.5.2 via parallel `workflow_dispatch` finished out of order, leaving npm's `latest` dist-tag pinned to v0.5.1 instead of v0.5.2. npm Trusted Publishing currently authenticates `publish` only — `dist-tag` operations need a long-lived token, which we deliberately don't store. Republishing as v0.5.3 lets the standard tag-push → OIDC-publish flow naturally promote the new version to `latest`. The on-disk code is byte-identical to v0.5.2.

## [0.5.2] — 2026-05-15

### Changed
- **Bumped baseline-skills SHA pin to [`a4455977`](https://github.com/thrillmot/agent-skills/commit/a44559770686e6c51d08ba5bb842d78f85876fb2)** so all four baseline skills (`critical-issues-only`, `evidence-based-review`, `respect-existing-conventions`, `clud-bug-collaboration`) now resolve from `thrillmot/agent-skills` instead of silently falling back to bundled copies. Prior pin pointed at a tree where only `skills/logmind/SKILL.md` existed; every install was fallback-only. Fresh installs will now log `baseline kit: 4 specimens (from thrillmot/agent-skills)` instead of `(bundled fallback)`. Bundled copies still ship as the offline fallback.

## [0.5.1] — 2026-05-15

### Added
- **`clud-bug init` now briefs other agents.** A self-contained `<!-- clud-bug-start -->` block (mirroring the well-established logmind pattern) is added to `AGENTS.md` (created if missing — it's the canonical cross-tool home) and idempotently appended to `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.continuerules`, and any `.md` files under `.cursor/rules/` — but only where those files already exist (no proliferating stubs the user didn't ask for). The block documents how to coexist with the bot's review threads, where the skills live, the strict-mode toggle, and the workflow-self-mod gotcha. Re-runs replace the prior block in place; running with a new clud-bug version updates it.
- **New baseline skill `clud-bug-collaboration`.** Higher-fidelity guidance for Claude Code agents working in a clud-bug-installed repo: when to defer to bot thread resolution, how to read the `clud-bug-review` check status, why `claude-code-action` rejects PRs that modify its own workflow, how to disable strict mode safely (read from base ref so a PR can't disable on itself). Ships in the baseline kit alongside the existing three; canonical home will be `thrillmot/agent-skills/skills/clud-bug-collaboration/SKILL.md` on the next agent-skills SHA bump.
- `clud-bug update` also refreshes the AGENTS.md / CLAUDE.md block so the embedded version + strict-mode line stay current after subsequent updates.

## [0.5.0] — 2026-05-15

### Changed
- **Baseline skills now sourced from [thrillmot/agent-skills](https://github.com/thrillmot/agent-skills) at install time, pinned to a specific commit SHA.** `clud-bug init` fetches `https://raw.githubusercontent.com/thrillmot/agent-skills/<SHA>/skills/<name>/SKILL.md` for each baseline (`critical-issues-only`, `evidence-based-review`, `respect-existing-conventions`). The SHA is pinned in `lib/skills.js` (currently `977e439…`) — bumping it requires a clud-bug release, so a compromised commit on agent-skills can't silently land in users' Claude review skills mid-cycle.
- Fetched skills are cached at `~/.cache/clud-bug/skills/` for 24h. Cache keys include the upstream base URL, so switching bases (via `CLUD_BUG_AGENT_SKILLS_BASE` env override) doesn't poison the cache across forks.
- Network failures, 404s, empty bodies, and 5s timeouts fall back to the bundled copy shipped in the npm package — works fully offline.
- Baseline fetches now run in parallel (`Promise.all`), so a fully unreachable upstream caps at one timeout total instead of three (was ~15s, now ~5s).
- Init log shows the source: `baseline kit: 3 specimens (from thrillmot/agent-skills)` vs `(bundled fallback)` vs a mixed-count form.
- Override the upstream URL via `CLUD_BUG_AGENT_SKILLS_BASE` env var (test seam + fork support).

## [0.4.1] — 2026-05-15

### Added
- **`clud-bug edit-workflow` CLI** — packages clud-bug-workflow edits into an isolated PR. `claude-code-action` refuses to run on PRs that modify its own workflow (a security guard); this command keeps the scope clean so non-workflow work isn't blocked alongside it. Refuses to run if the working tree has non-workflow changes.
- **README "When you edit the workflow"** subsection — documents the upstream self-mod guard so the 401 error doesn't surprise users.

## [0.4.0] — 2026-05-15

### Changed (breaking)
- **Strict mode is now the default for new installs.** `clud-bug init` writes `{ "strictMode": true }` to `.claude/skills/.clud-bug.json`. Reviews that flag critical issues fail the workflow check — pair with branch protection's required status checks for a real merge gate. Existing installs are NOT auto-flipped (the field is only set when missing); your prior advisory behavior is preserved unless you add the field. To opt new installs into advisory, set `strictMode: false`.

### Added
- **Bot-authored PRs are now handled gracefully.** PRs from `dependabot[bot]`, `renovate[bot]`, or forks (where GitHub deliberately doesn't pass repository secrets) used to fail loudly red — wrong signal. Now a guard step detects the case, posts a one-line advisory comment ("Clud Bug skipped — bot/fork PR cannot access secrets"), and exits 0. Check stays green; the skip is visible. Owner-authored PRs without the secret still fail loud.
- **Site polish (carries over from the unreleased entry):** alive bug emoji (layered breathe + twitch + scuttle animations), Plate label gloss, thrillmot footer credit.

[0.5.3]: https://github.com/thrillmot/clud-bug/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/thrillmot/clud-bug/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/thrillmot/clud-bug/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/thrillmot/clud-bug/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/thrillmot/clud-bug/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/thrillmot/clud-bug/compare/v0.3.4...v0.4.0

## [0.3.4] — 2026-05-15

### Added
- **Strict mode (opt-in)** — set `strictMode: true` in `.claude/skills/.clud-bug.json` and the workflow check fails when Clud Bug flags any critical issue. Default behavior is unchanged: advisory (green check when the bot ran, regardless of findings). Pair with branch protection's required-status-checks for a real merge gate. Toggleable per-repo without rewriting any workflow.

## [0.3.3] — 2026-05-15

### Fixed
- **No more silently-green checks when `ANTHROPIC_API_KEY` is missing.** All review + audit + baseline workflows now have a guard step that fails the job with an actionable `::error::` message when the secret is empty. Fork PRs (where GitHub deliberately withholds secrets) get a `::warning::` and exit 0 — the documented by-design behavior. Eliminates the footgun where users thought Clud Bug was reviewing when it wasn't even running.

## [0.3.2] — 2026-05-15

### Changed
- **Skill enforcement is now hard, not soft.** Workflow prompt previously said "skills should shape your review — defer to their guidance" (a nudge). Now it says "Skills are not background context — they are review rules with authority. Before flagging any finding, scan loaded skills... your review MUST reference them by name." Reviews are also required to end with a `Skills referenced: [...]` footer. Result: every review now produces an explicit audit trail showing which skills shaped which findings.
- **`clud-bug init` warns when only baseline specimens get pinned.** Flag the case where the install gives users a generic Claude review instead of a project-aware one — points them at `clud-bug add` and custom skills.

## [0.3.1] — 2026-05-15

### Added
- **`clud-bug update` CLI** — re-renders the workflow templates and refreshes the bundled baseline specimens. Custom skills are never touched; remote (skills.sh-installed) skills are left alone unless explicitly refreshed via `clud-bug refresh`.
- **Self-update workflow** — `clud-bug init` now also installs `.github/workflows/clud-bug-self-update.yml`. Cron weekly (Mondays 12:00 UTC). Compares the manifest's `lastUpdateVersion` to npm's `clud-bug@latest`; if newer, runs `update` and opens a PR with the diff.
- **Pin escape hatch** — set `pinVersion` in `.claude/skills/.clud-bug.json` and the self-update workflow exits cleanly without opening PRs.
- **Manifest preserves arbitrary keys** — `lastUpdate`, `lastUpdateVersion`, `pinVersion`, etc. survive read/write cycles.

## [0.3.0] — 2026-05-15

### Added
- **`clud-bug audit` CLI** — walk the whole repo (or a slice) preparing a report stub. Filters: `--since <date>`, `--changed-in 7d|2w|1mo|1y`, `--scope <glob>` (repeatable).
- **Audit workflow** — `clud-bug init` now also installs `.github/workflows/clud-bug-audit.yml`. Manual trigger by default (cron commented). Spawns a Claude run that reads the stub, walks the manifest, appends findings, and opens a PR titled `🐛 Clud Bug audit — YYYY-MM-DD` so the report shows up in your normal PR review surface.
- **OG / Twitter card image at `/opengraph-image`** (and `/twitter-image`). Generated by `next/og` at the edge with the field-guide composition.
- **Favicon + Apple touch icon** via `site/app/icon.tsx` and `site/app/apple-icon.tsx`.
- **Live site data on `cludbug.dev`** — version, weekly downloads, count of PRs Clud Bug has reviewed, and the latest public review headline. Server-rendered with 1h revalidate; degrades gracefully on API failure.

### Fixed
- **Paragraph indent inconsistency on cludbug.dev.** Removed the `text-indent: 1.4em` rule on `.section-prose p + p`.
- **Bug-pin scuttle animation** snap removed by replacing the 45/47%/90% keyframes with a symmetric 35→65% scuttle.

[0.3.4]: https://github.com/thrillmot/clud-bug/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/thrillmot/clud-bug/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/thrillmot/clud-bug/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/thrillmot/clud-bug/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/thrillmot/clud-bug/compare/v0.2.2...v0.3.0

## [0.2.2] — 2026-05-15

### Changed
- **Brand voice extends past the site.** CLI log strings, README intro, and review-prompt tone now consistently inhabit the field-naturalist voice the site already used. The bot is told to address authors conversationally without sacrificing clarity or critical-issues-only discipline.
- **Color palette swap on cludbug.dev.** Replace the crimson accent with leaf-green primary + citrus-orange highlights — taken from the clud-bug emoji's actual colors. Crimson is now reserved for "critical issue" badges only.
- **Node.js 20 deprecation fix.** All workflow templates now bump `actions/checkout@v5` and `actions/setup-node@v5`, and set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` so generated workflows stop emitting deprecation warnings ahead of GitHub's June 2 / Sept 16 cutovers.

## [0.2.1] — 2026-05-15

### Fixed
- Silence `bin[clud-bug] script name was cleaned` publish warning by switching to the shorthand `"bin": "bin/clud-bug.js"` form (preferred when the binary name matches the package name).

## [0.2.0] — 2026-05-15

### Added
- **Public npm release.** `npx clud-bug init` now works from any directory.
- **Skill management commands.** `clud-bug list`, `clud-bug add <source/name>`, `clud-bug remove <slug>`, `clud-bug refresh` — evolve your skill set after `init` without clobbering custom skills.
- **`.claude/skills/.clud-bug.json` manifest.** Tracks provenance so commands can distinguish baseline / skills.sh / custom skills.
- **`CLUD_BUG_SKILLS_SH_BASE` env var.** Test seam for overriding the skills.sh API base URL.
- **1-page site at [cludbug.dev](https://cludbug.dev).** Field-guide aesthetic; install instructions and the differentiating wedge in one place.
- **Parallel baseline review workflow** (`.github/workflows/claude-code-review.yml` in this repo only). Stock `anthropics/claude-code-action` runs alongside clud-bug-review for comparison until clud-bug's track record is established.
- **Auto-resolve prior review threads.** Workflow templates now teach the bot to resolve its own prior inline review threads when re-reviewing a PR, unblocking the conversation-resolution branch protection rule on iterative PRs.

### Fixed
- **`refresh` no longer mass-deletes skills when skills.sh is unreachable.** Previously, a transient API failure or `.catch(() => [])` would surface as an empty recommendation set, and `--accept-all` would silently remove every remote skill in the manifest. Now aborts with exit 1.
- **`refresh --offline` no longer mass-deletes remote skills.** Same root cause as above. In offline mode, removals are explicitly suppressed since the recommendation set isn't authoritative.

## [0.1.0] — 2026-03-11

### Added
- Initial release. `clud-bug init` CLI: detects repo signals, queries skills.sh, installs matching skills, generates a working `.github/workflows/clud-bug-review.yml`.
- Three workflow templates (generic / TS / Python) with the `--allowedTools` whitelist needed for `gh pr comment` to actually post reviews.
- Three baseline skills shipped in the package: `critical-issues-only`, `evidence-based-review`, `respect-existing-conventions`.
- 28 unit tests, repo-level CI (test + actionlint).

[0.2.2]: https://github.com/thrillmot/clud-bug/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/thrillmot/clud-bug/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/thrillmot/clud-bug/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/thrillmot/clud-bug/releases/tag/v0.1.0
