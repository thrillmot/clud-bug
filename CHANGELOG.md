# Changelog

All notable changes to clud-bug. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/spec/v2.0.0.html).

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
