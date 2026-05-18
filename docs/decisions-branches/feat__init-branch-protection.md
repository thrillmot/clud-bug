## 2026-05-18 11:40 - clud-bug init offers required_conversation_resolution setup (issue #43 item 2)

**Reasoning:** lib/branch-protection.js uses a discriminated-union return shape ({ state: 'enabled' | 'disabled' | 'no-protection' | 'forbidden' | 'unknown' }) instead of throwing on failure. Each state has a different user-facing message and follow-up action (e.g. 'no-protection' tells the user to set up base protection first; 'forbidden' tells them to ask the repo owner). Callers pattern-match on state and produce specific guidance.

**Alternatives considered:** PUT /protection with the full merged JSON — rejected because it would clobber unrelated settings (status checks, force-push restrictions, signed-commits). The single-flag POST is the standard recommended path., Default-on without a prompt — rejected because some repos use reporulez or org-level rulesets and don't want clud-bug editing protection from underneath them. Prompt + --no-set-protection opt-out preserves agency., Hard-fail on any error — rejected because clud-bug init must work in repos without gh installed / non-GitHub repos / no-admin-perms scenarios. Every failure mode degrades to an advisory log line.

**Implications:**
- Injectable gh in lib/branch-protection.js makes the helper unit-testable — 12 tests in test/branch-protection.test.js cover all five state branches for both read and enable paths, no real network or shell-out.
- Existing cli.test.js init tests pass --no-set-protection to stay hermetic. CI without a real gh install no longer trips the new step.
- v0.5.5 — npm publish auto-triggers on tag push via the OIDC workflow that landed in v0.5.4-era infra.

---
