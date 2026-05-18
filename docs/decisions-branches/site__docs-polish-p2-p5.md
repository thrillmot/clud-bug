## 2026-05-18 12:56 - Docs polish per audit P2 + P5: 401 framing, fork-PR YAML, custom-skill example

**Reasoning:** Three concrete improvements caught in the audit prompt that close real understandability gaps: (1) the 401 self-mod-protection error is reframed from 'workflow validation failed' generic-doom to a TL;DR 'expected and protective' explanation that names the exact email subject users will see, so they don't panic when the workflow-failure email lands. (2) The fork-PR pull_request_target workaround was previously named in 1 line — now has the concrete YAML shape with the load-bearing invariant called out (base ref at root, PR head only in subdir). (3) The clud-bug-collaboration skill's 'write evidence-anchored guidance' instruction was abstract — now ships with a concrete db-query-review example showing the bad/good code pair format.

**Alternatives considered:** Verbose section-rewrites rather than scoped edits — rejected, the existing sections are mostly fine; only the framing and one missing example were the actual gaps. Targeted edits leave the existing scannable structure intact.

**Implications:**
- Custom-skill example will likely become the canonical 'how to write a custom skill' reference. If we add more guidance later it should mirror the same evidence-anchored shape (specific paths, bad/good code pairs, instructions on what to quote).
- Fork-PR YAML example uses actions/checkout@v6 (Stream S α.1 is bumping to v6 in the next PR). README will be consistent with templates after both PRs merge.

---
