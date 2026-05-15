## 2026-05-15 13:05 - Adopt LOGMIND_BOT_PAT in logmind-aggregate workflow (v0.1.4 template)

**Reasoning:** On this repo, main is not yet protected with required status checks, so the warning will fire harmlessly. Adopting now means we're ready when we do enable required checks.

**Alternatives considered:** Skip the upgrade — rejected because the aggregator becomes load-bearing as soon as we enable branch protection on main, which is on the v0.6 horizon., Mint and configure LOGMIND_BOT_PAT now — deferred because it requires a fine-grained PAT (browser flow) and would be wasted setup until branch protection actually requires it.

**Implications:**
- When/if main gets required status checks (clud-bug-review, etc.), the aggregator PR will start emitting a ::warning:: until LOGMIND_BOT_PAT is set: gh secret set LOGMIND_BOT_PAT --body '<pat-with-Contents-write-and-Pull-requests-write>'.
- check-decisions.yml and check-doc-links.yml templates were verified byte-identical to v0.1.4 — no churn, restored from .bak.

---
