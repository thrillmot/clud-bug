## 2026-05-15 11:33 - Initialize logmind decision tracking

**Reasoning:** Starting structured decision logging for this project to maintain clear documentation of architectural choices and provide context for AI agents.

**Alternatives considered:** Manual decision documentation, ADR (Architecture Decision Records)

**Implications:**
- All significant decisions should now be logged using `logmind.log()`
- AI agents will have access to decision history via docs/decisions.md
- Git history will serve as an audit trail for all decisions

---
## 2026-05-15 11:34 - v0.5.0: baseline skills sourced from thrillmot/agent-skills, SHA-pinned (PR 25)

**Reasoning:** Skills were bundled in clud-bug only; not shareable. Moved to canonical home at thrillmot/agent-skills (skills.sh layout: skills/<name>/SKILL.md). Pinned to commit SHA in lib/skills.js (currently 977e439…) — re-couples trust to clud-bug releases so a malicious commit on agent-skills@main can't silently land in users' Claude review steering prompts mid-cycle.

**Alternatives considered:** Stay bundled-only; fetch from main (rejected: supply-chain exposure); ship checksum lock file

**Implications:**
- Bumping baseline skill content requires a clud-bug release that updates BASELINE_SKILLS_REF. Bundled fallback covers offline / 404 / network-error / 5s-timeout / empty-body. Per-user cache at ~/.cache/clud-bug/skills/ keyed by base+name (no cross-base poisoning). Init log surfaces source.

---
