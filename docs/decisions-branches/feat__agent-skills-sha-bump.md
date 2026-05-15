## 2026-05-15 13:09 - Bump BASELINE_SKILLS_REF to a4455977 — agent-skills now hosts all four baselines

**Reasoning:** Verified locally: CLUD_BUG_AGENT_SKILLS_BASE override pointing at the new SHA produces _source: 'agent-skills' for all four entries on loadBaseline().

**Alternatives considered:** Roll baselines into agent-skills' main without bumping clud-bug's SHA — rejected because the explicit SHA pin is the trust boundary; until clud-bug ships a release that names the new SHA, no install picks it up., Drop the bundled fallback now that the remote is real — rejected because the offline use case (CI without network, fork installs from cache) is still legitimate. Bundled stays as the fallback.

**Implications:**
- Future skill edits happen in agent-skills first, then a clud-bug release bumps the SHA pin. CHANGELOG entry records the SHA so users can audit what version of each skill they got.
- Cache key includes AGENT_SKILLS_BASE so this SHA bump cleanly invalidates cached entries — users running clud-bug locally will re-fetch on next call.

---
