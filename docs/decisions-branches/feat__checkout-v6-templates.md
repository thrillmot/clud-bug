## 2026-05-18 12:59 - Bump actions/checkout v5 to v6, drop FORCE_JAVASCRIPT shim, defensive git show in allowlist

**Reasoning:** Bash(git show:*) added defensively. The bot doesn't currently need it — the strict-mode gate runs git show from a separate shell step at workflow level (where shell access is unrestricted), not from inside claude-code-action. Audit P1 noted this as 'future-proofing only.' Cheap to bundle since we're already editing the allowlist.

**Alternatives considered:** Keep v5 + the env shim — rejected because v6 has been GA for weeks, the shim was always a transitional measure, and shipping templates with dead workarounds confuses future maintainers., Drop git show entirely from the audit since the bot doesn't need it today — rejected because it's a single tiny addition that's defensive against a plausible future need. Asymmetric: cheap now, expensive to debug 'why does the bot fail silently when I add git show to the prompt?' later.

**Implications:**
- This repo's own workflow files (clud-bug-review.yml, claude-code-review.yml, npm-publish.yml) still pin v5 + FORCE shim. They get the same treatment in a separate isolated PR (Stream S α.2) using clud-bug edit-workflow to dodge the self-mod gate.
- Existing user repos pick up the template change on their next clud-bug update run (or when self-update workflow opens an automated PR).

---
