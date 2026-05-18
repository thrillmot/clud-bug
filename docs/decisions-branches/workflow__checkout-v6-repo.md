## 2026-05-18 13:12 - Sync repo workflow files with v0.5.6 template change (checkout v6, drop FORCE shim)

**Reasoning:** Bundling 4 workflow file edits in a single PR rather than 4 separate PRs because they all share the same self-mod 401 failure mode and admin-merge ceremony — splitting wouldn't reduce risk, just multiply ceremony.

**Alternatives considered:** Wait for next clud-bug update to auto-sync — rejected, that would mean clud-bug v0.5.6's auto-update workflow opens a PR with the same content + same self-mod failure mode + still needs admin merge. Same ceremony, longer delay., Skip Bash(git show:*) on the repo's clud-bug-review.yml since the bot doesn't currently need it — rejected, keeping the rendered workflow byte-equivalent to the template (post-render placeholder substitution) is the simplest drift-prevention story.

**Implications:**
- After merge: the workflow files are in sync with templates. Next clud-bug update on this repo should produce zero diff for these files.
- clud-bug-review will fail by design on this PR (the bot refusing to review its own workflow edit). Merging requires admin override; documented in README 'When you edit the workflow' section.

---
