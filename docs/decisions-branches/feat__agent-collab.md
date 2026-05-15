## 2026-05-15 11:59 - Brief other agents in AGENTS.md/CLAUDE.md via a clud-bug block, mirror logmind's pattern

**Reasoning:** Idempotent re-write on init/update so the embedded version + strict-mode line stay current as the repo's clud-bug install ages. Block content lives in lib/agents-md.js bundled with the CLI rather than a template file because it embeds dynamic state.

**Alternatives considered:** Document only in README — rejected because users don't read READMEs of dependencies; the brief needs to live where agents look (AGENTS.md)., Append-only, no marker block — rejected because re-runs would stack duplicates, and version/strict-mode line would go stale., Create CLAUDE.md/GEMINI.md/.cursorrules unconditionally — rejected because we'd proliferate stubs the user didn't ask for; logmind already creates the canonical set when present, we just append where they exist.

**Implications:**
- Block embeds the version + strict-mode state, so clud-bug update rewrites it; tested for idempotency in test/agents-md.test.js.
- AGENTS.md is the only file we'll create-if-missing (canonical cross-tool home). Tool-specific files (CLAUDE.md, GEMINI.md, .cursorrules, .windsurfrules, .clinerules, .continuerules, .cursor/rules/*.md) we only touch when present.
- New baseline skill clud-bug-collaboration ships in templates/skills/baseline/ for now; canonical home moves to thrillmot/agent-skills/skills/clud-bug-collaboration/SKILL.md once user uploads it and we bump the SHA pin.

---
