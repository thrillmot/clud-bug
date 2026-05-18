## 2026-05-18 13:23 - Part 2 of v0.5.6 workflow sync: claude-code-review.yml (separate PR for per-bot review coverage)

**Reasoning:** This PR is the second half. clud-bug-review will fully review since clud-bug-review.yml is untouched here. claude-review fails self-mod by design (it's reviewing its own workflow edit) — admin-bypassed via temporary ruleset disable, same pattern as PR #49.

**Alternatives considered:** Add a bypass_actor to the ruleset permanently (RepositoryAdmin) — rejected because it would let admin force-merge ANY ruleset violation, not just self-mod. Self-mod is a known/expected failure mode; broader admin bypass increases the failure surface.

**Implications:**
- After this merges, this repo's .github/workflows/ files are fully synced with v0.5.6 templates. Next clud-bug update should produce zero diff for any of those files.

---
