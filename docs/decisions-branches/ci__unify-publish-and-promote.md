## 2026-05-15 15:38 - Collapse npm-dist-tag into npm-publish (single TP entry covers both)

**Reasoning:** Both jobs gate on 'if:' so only one runs per dispatch (publish for tag pushes, mode-conditional for dispatch). Cleaner audit trail, single OIDC trust path, no chance of TP-config drift between two files.

**Alternatives considered:** Wait until npm fixes their UI / user contacts npm support — rejected because we're trying to ship today, not next week. Consolidation works around the limitation immediately and is arguably cleaner anyway., Use a long-lived NPM_TOKEN for dist-tag operations — rejected for the same reasons we did Trusted Publishing for publish in the first place: secret to manage, rotation overhead, leak blast radius.

**Implications:**
- Future read pattern: anyone wondering 'how do I publish or move tags?' opens npm-publish.yml and sees both modes. Two-file separation would have meant 'check npm-publish.yml AND npm-dist-tag.yml.'
- If npm later fixes the multi-TP UI and we want defense-in-depth (separate trust scope per operation), splitting back out is straightforward — promote-tag job moves into a fresh file, second TP entry added.

---
