## 2026-05-18 13:41 - Upgrade to logmind v0.2.1 (workflow version pinning)

**Reasoning:** Also adds # logmind-template-version: v1 marker that drives v0.2.1's refresh-mode upgrade logic. Pre-existing markerless workflows (like this repo had pre-upgrade) are treated as user-customized — the recommended path is delete + re-init, which is what this PR does.

**Alternatives considered:** Manually add the marker + edit the pip install line to preserve the existing files — rejected because delete-and-reinit is the documented v0.2.1 path, and the existing workflows were as-installed (no customizations to preserve). Manual surgery would also miss any other v0.2.1 template improvements., Wait for the next clud-bug self-update cycle to pick this up — rejected, clud-bug doesn't manage logmind workflows. They're logmind-owned; logmind init is the canonical update mechanism.

**Implications:**
- Future logmind releases (0.2.2+, 0.3, etc.) need an explicit Initializing logmind...

logmind is already initialized — running in refresh mode.

  All workflow templates already current.

Done. docs/ and .logmind/ left untouched. re-run + commit in this repo to pick up. No autoupdate. This is a deliberate logmind v0.2.1 design choice — silent CI version drift caused real breakage at v0.1→v0.2.
- This PR does NOT trigger claude-code-action self-mod protection — clud-bug-review.yml is not in the diff. Normal merge ceremony applies; no admin bypass needed (unlike PR #49/#50 which edited the bot's own workflow files).

---
