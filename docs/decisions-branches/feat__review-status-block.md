## 2026-05-18 11:18 - Status block at the top of every clud-bug review (issue #43 item 1)

**Reasoning:** Fixed format with all four counters always present (including zeros) is grep-able and machine-parseable. Other agents reading the comment can extract 'resolved from prior' programmatically without parsing free-form prose.

**Alternatives considered:** Markdown table — rejected as visually heavy for a one-line summary. The single-line ' · ' separator is dense but scannable., Only show non-zero counters — rejected because consumers (other agents) parse this; omitted fields would force them to handle a variable-shape format. Fixed shape is the boring-but-correct call.

**Implications:**
- Edit applied across the 3 prompt templates (workflow.yml.tmpl, -ts, -py) with identical status-block instructions across all three to avoid drift between languages. The repo's own rendered workflow file (.github/workflows/clud-bug-review.yml) was originally in scope but dropped from this PR after commit a7f6816 — claude-code-action refuses to run on PRs that modify its own workflow file ('Workflow validation failed' 401), and bundling the workflow edit broke the clud-bug-review check. The repo's workflow gets the same prompt edit in a follow-up isolated PR (the `clud-bug edit-workflow` pattern), or naturally via the next `clud-bug update` run that re-renders from templates.
- Strict-mode header interaction clarified in the prompt — the status block follows whichever H2 variant is in use ("— critical findings" / "— clean" / bare). Without this, an LLM following the new instruction literally in a strict-mode repo could drop the status block or revert to the bare header and break the strict-mode gate.
- New installs get the status block via clud-bug init writing the templated workflow.
- If future review variants need additional counters, extend the line with new ' · key: N' fields — existing parsers that only care about the original four still work.

---
