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
## 2026-05-15 09:47 - Skill enforcement is hard, not soft (v0.3.2): prompts MUST cite skills by name + reviews end with 'Skills referenced:' footer

**Reasoning:** User probed gap: skills loaded into context but reviews didn't show their influence. Soft 'should defer' nudge wasn't enough leverage. Required citation + footer makes the skill→finding link auditable and forces the bot to actively scan skills before flagging.

**Alternatives considered:** Keep soft nudge; require Skill tool invocation before each review; build a separate skill-attribution UI

**Implications:**
- Reviews in this repo since v0.3.2 end with 'Skills referenced: [...]'. Empty-skills warning in init steers users toward project-specific skills (the actual wedge over stock Claude review).

---
## 2026-05-15 09:47 - Strict-mode gate: deterministic comment-grep, not bot-side marker file (v0.3.4 round 2)

**Reasoning:** First implementation had bot write .clud-bug-strict-fail when critical issues found. Reviewer caught: LLM-trust-based, fragile if model forgets/errors. Second implementation greps the actual posted comment for sentinel header — gate is deterministic on the comment content, regardless of bot's flow.

**Alternatives considered:** Marker file (rejected: relies on bot memory); structured JSON output (rejected: requires changing the action)

**Implications:**
- Bot's review header signals findings: '## 🐛 Clud Bug review — critical findings' triggers the gate. Post-step uses jq with startswith() against latest claude[bot] comment. Manifest read from BASE ref (origin/<base_ref>), not PR head — PRs cannot disable their own gate.

---
