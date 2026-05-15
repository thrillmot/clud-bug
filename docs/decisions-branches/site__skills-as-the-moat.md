## 2026-05-15 14:46 - Lead site §II with skills-as-the-moat instead of baseline cards

**Reasoning:** Each custom-skill card shows a quoted rule the team would write — concrete enough that a reader can imagine writing similar for their own codebase. Baselines move to a small italic footer ('always pinned floor') so they don't compete with the above-the-fold story.

**Alternatives considered:** Show real team logos / case studies — rejected because we don't have any yet, and fake badges read as marketing-trick. Concrete example rules have higher trust., Add a 'configure your skill' interactive walkthrough — rejected as scope creep. Static examples + the existing install terminal cover the discoverability.

**Implications:**
- If we add more skill examples later (compliance for HIPAA, accessibility for WCAG, etc.), they slot into the same .specimens grid — keep the 2x2 visual cap, paginate or scroll if more added.
- Install terminal also tightened (3-line first paragraph fits 375px without scroll) + new .terminal::after fade gradient signals horizontal scrollability without adding visible scrollbars.
- Future skill names should follow the YOU-XXX cataloging hint that frames them as 'your team writes these' rather than 'we ship these'.

---
