## 2026-05-18 15:33 - Stream Y: extract strict-mode gate into a composite GitHub Action (v0.5.8)

**Reasoning:** The ~24-line strict-mode shell block lived in all 3 workflow templates and would also need to live in the upcoming v0.6 GitHub App runtime. Pulling it into .github/actions/strict-mode-gate/action.yml means one place to edit; templates reference @v0.5.8. Bumps template marker v1 -> v2 so v0.5.7-installed users pick it up via refresh-mode automatically. Adds a bot-login input so the same composite serves both the current Claude Code Review App (claude[bot]) and the upcoming clud-bug GitHub App (clud-bug[bot]).

**Alternatives considered:** Keep the gate inline in templates (rejected): drift risk grows with every template improvement, and the upcoming App runtime would re-implement the same block in a different language., JS action instead of composite (rejected): every input is already a shell string or gh-api call; no Node deps, no compilation, no separate release pipeline. Composite ships in the same repo + tag as the templates, so the contract is atomic with template changes.

**Implications:**
- Templates pin to @v0.5.8 - this tag must exist on main before any clud-bug init using these templates can work. Order is: merge PR, tag v0.5.8, then composite action becomes resolvable.
- Existing v0.5.7 installs upgrade automatically via refresh-mode (v1 marker stale -> v2 refresh). No self-mod ceremony needed for them; their own clud-bug update reads the new template.
- This PR does NOT update this repo own clud-bug-review.yml (it markerless from v0.5.6 era so refresh-mode would skip it). Separate self-mod-ceremony PR needed to render the v2 template here so this repo own review uses the composite action.

---
