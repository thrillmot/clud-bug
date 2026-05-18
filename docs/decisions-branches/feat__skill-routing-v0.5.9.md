## 2026-05-18 17:49 - Stream BB.1+BB.2: skill routing via review_mode + per-skill review output (v0.5.9)

**Reasoning:** Locked option-D-unified architecture from the v0.6 plan: skills declare review_mode in frontmatter (shared = bundled, dedicated = focused section). v0.5.9 ships the user-visible behavior via prompt restructuring inside the existing single claude-code-action call - same one-Claude-call cost model. v0.6 App will use same metadata for literal parallel API calls. Single source of truth across both runtimes.

**Alternatives considered:** Implement literal parallel Claude calls in v0.5.9 workflow (matrix-style job per dedicated skill) - rejected: massive workflow-template restructuring for a prompt-level concern. v0.6 App is the right place since it controls API calls directly., Skip review_mode entirely until v0.6 - rejected: the metadata IS the contract. Authors can start declaring review_mode now; runtime semantics arrive in v0.6 transparently. Defers no work, blocks nothing.

**Implications:**
- Bumps template marker v2 -> v3. Existing v2 installs (post-v0.5.8) auto-upgrade via refresh-mode on next clud-bug update. This repo own clud-bug-review.yml is v2 - the post-merge self-update workflow OR a follow-up clud-bug update PR will refresh it to v3 (no self-mod ceremony needed since refresh-mode now handles versioned files).
- The 4 baseline skills in templates/skills/baseline/ now declare review_mode: shared. agent-skills repo already has the 4 dedicated-mode skills (brand-voice-review, api-contract-enforcement, pii-and-compliance, test-discipline) from PR #9. The skill-routing contract is now end-to-end across both repos.

---
