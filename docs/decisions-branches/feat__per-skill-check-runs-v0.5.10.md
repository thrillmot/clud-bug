## 2026-05-18 18:17 - Stream BB.3: per-skill check-runs in composite action (v0.5.10)

**Reasoning:** Per the v0.6 plan: each dedicated-mode skill gets its own check-run in the PR check list, gateable in branch protection. The composite action reads .clud-bug.json strictSkills array, parses the Per-skill scan block from the latest review, and emits one check-run per configured skill via Checks API. Opt-in (zero check-runs when strictSkills unset) so no UI clutter for users who do not care.

**Alternatives considered:** Emit check-runs for EVERY loaded skill (rejected): bloats PR check list with 4 baselines + N dedicated checks, even when the user does not gate on most of them. Opt-in via strictSkills keeps the surface clean., Use a separate workflow job per skill (rejected): would require N parallel jobs in template + cross-job comment-aggregation. Composite-action extension is the smaller change for v0.5.10; the v0.6 App will do literal parallel API calls instead.

**Implications:**
- Adds checks: write permission to all 3 templates. No-op when strictSkills is unset. Marker bumps v3 -> v4 so refresh-mode propagates the permission change automatically.
- Composite action remains backward-compatible: @v0.5.8 ref still resolves and behaves identically (strict-mode gate is byte-equivalent). Templates that pin @v0.5.8 keep working; only @v0.5.10 templates get the new check-runs behavior.
- Bash comment parsing relies on the v3+ prompt emitting a stable Per-skill scan block format. v2-marker workflows that pre-date BB.2 will produce comments without that block; the composite emits conclusion=neutral check-runs in that case (loud rather than silently green).

---
