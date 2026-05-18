## 2026-05-18 11:18 - Status block at the top of every clud-bug review (issue #43 item 1)

**Reasoning:** Fixed format with all four counters always present (including zeros) is grep-able and machine-parseable. Other agents reading the comment can extract 'resolved from prior' programmatically without parsing free-form prose.

**Alternatives considered:** Markdown table — rejected as visually heavy for a one-line summary. The single-line ' · ' separator is dense but scannable., Only show non-zero counters — rejected because consumers (other agents) parse this; omitted fields would force them to handle a variable-shape format. Fixed shape is the boring-but-correct call.

**Implications:**
- Edit applied across all four prompt sites (3 templates + this repo's clud-bug-review.yml). New installs get it via clud-bug init; existing repos pick it up on clud-bug update (which re-renders from templates).
- If future review variants need additional counters, extend the line with new ' · key: N' fields — existing parsers that only care about the original four still work.

---
