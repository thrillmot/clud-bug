## 2026-05-15 13:26 - Site polish round 2: drop stats, fix horizontal scroll root cause

**Reasoning:** Inline code rule uses :where(...) so specificity stays at 0,1,0 — composes cleanly with future overrides. white-space: nowrap on inline code prevents tokens like ANTHROPIC_API_KEY from breaking mid-word.

**Alternatives considered:** Bake min-width: 0 into a global * { min-width: 0 } reset — rejected because it has surprising effects on legacy flex/grid containers elsewhere; targeted to .section-body where the overflow actually came from., Hide stats strip behind a feature flag — rejected as overkill; user explicitly asked to drop it. Removing the fetchers (getNpmStats, getRepoStats) cuts unnecessary network calls + GitHub API quota.

**Implications:**
- Verified at 375x667 with Playwright: has_horizontal_scroll false; .terminal scrolls internally (rect_w 337 vs scroll_w 629); inline code 16.34px (was 19px). Build clean.
- Future inline-code styling should land in the :where() rule rather than re-overriding per-component.

---
