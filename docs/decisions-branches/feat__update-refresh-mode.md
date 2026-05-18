## 2026-05-18 15:20 - Implement clud-bug update refresh-mode using template-version markers (v0.5.7)

**Reasoning:** PR #52 added # clud-bug-template-version: v1 markers to all 5 workflow templates but left the update logic unchanged. This PR wires update.js to USE the markers: refresh stale-marker files (vN -> v1, logged with from/to), preserve markerless files (warn + skip with delete+reinit recovery path), and noop on current. Mirrors logmind v0.2.1 contract.

**Alternatives considered:** Refresh markerless files unconditionally (existing behavior) -- rejected: clobbers user customizations, which is exactly what the marker pattern exists to prevent., Require explicit --refresh-all flag to opt into marker-driven mode -- rejected: marker mode IS the safer behavior; gating it behind a flag means users have to know to ask for safety.

**Implications:**
- Existing v0.5.6 installs upgrading to v0.5.7 will see their workflows reported as markerless on the first clud-bug update run. The recovery path is documented inline in the CLI output (rm + clud-bug init).
- self-update.yml is now also refreshed by clud-bug update (previously only review + audit). Existing installs that hand-edited self-update.yml are protected by the markerless skip path.

---
