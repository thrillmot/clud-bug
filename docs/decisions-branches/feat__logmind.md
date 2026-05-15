## 2026-05-15 09:45 - Initialize logmind decision tracking

**Reasoning:** Starting structured decision logging for this project to maintain clear documentation of architectural choices and provide context for AI agents.

**Alternatives considered:** Manual decision documentation, ADR (Architecture Decision Records)

**Implications:**
- All significant decisions should now be logged using `logmind.log()`
- AI agents will have access to decision history via docs/decisions.md
- Git history will serve as an audit trail for all decisions

---
## 2026-05-15 09:46 - Strict mode default for new installs (v0.4.0); existing v0.3.x advisory installs preserved via lastUpdate-fresh-install gate

**Reasoning:** User thesis: clud-bug should typically be required to pass, designed so AI agents cannot merge through it. Strict-as-default elevates the check from suggestion to gate. Preserving existing installs avoids surprise breakage on upgrade.

**Alternatives considered:** Always advisory (v0.3 status quo); always strict including auto-flip on upgrade; per-PR opt-in via comment

**Implications:**
- init writes strictMode: true on first install only. Self-update PRs include callout for opt-in. Branch protection required-checks now genuinely block merges. Bot/fork PRs need graceful-degradation guard.

---
