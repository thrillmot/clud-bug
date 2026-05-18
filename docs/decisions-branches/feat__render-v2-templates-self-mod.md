## 2026-05-18 15:47 - Self-mod ceremony: render v2 templates into this repo own clud-bug-review.yml

**Reasoning:** PR #54 shipped the composite strict-mode-gate action but did not update this repo own .github/workflows/clud-bug-review.yml (markerless from v0.5.6 era so refresh-mode skipped it). This PR renders the v2 template here so this repo own review actually uses the composite action. First end-to-end exercise of the gate composite on real PRs.

**Alternatives considered:** Let clud-bug update auto-refresh this file via cron (rejected): refresh-mode protects markerless files. Manual render is the documented recovery path., Bundle with the v0.5.8 release PR (rejected): claude-code-action 401-protects PRs that edit clud-bug-review.yml, so bundling would have blocked PR #54. Separate self-mod PR keeps the bot ecosystem coherent.

**Implications:**
- This PR triggers claude-code-action self-mod 401 on the clud-bug-review check (the workflow refuses to review a PR that edits its own file). claude-review (separate workflow file) still runs. Admin-bypass required to merge per the v0.5.6-era pattern.
- After merge, future clud-bug update runs against this repo will hit the current-marker noop path (no skipping). The repo is now self-bootstrapping from refresh-mode.

---
