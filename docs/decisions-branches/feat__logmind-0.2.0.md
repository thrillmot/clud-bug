## 2026-05-15 16:11 - Adopt logmind v0.2 derived-file architecture (drop aggregator workflow)

**Reasoning:** On this repo specifically, the v0.1.x aggregator was opening PRs that needed manual nudging or LOGMIND_BOT_PAT to be mergeable. Neither was set. v0.2 makes the question moot — there's no aggregator PR to nudge.

**Alternatives considered:** Stay on v0.1.4 + configure LOGMIND_BOT_PAT — rejected because LOGMIND_BOT_PAT is just a workaround for the underlying anti-recursion issue. v0.2 fixes the cause., Auto-commit docs/timeline.md from CI instead of fail-fast — rejected because GITHUB_TOKEN-pushed commits don't re-fire required status checks; PR would sit stuck. v0.2 chose fail-fast for exactly this reason.

**Implications:**
- PRs from now on must include a regenerated docs/timeline.md if any decision log changes. CI message tells contributors how to fix locally.
- Flipped Settings → Actions → Workflow permissions from read to write (required for v0.2 workflows). One-time API change, persisted on the repo settings.
- logmind 0.1.4 → 0.2.0 installed via pip --user (homebrew tap formula not yet bumped to 0.2). Future contributors will pick up 0.2 via brew when the tap updates, or via pip install logmind==0.2.0 in the meantime.

---
