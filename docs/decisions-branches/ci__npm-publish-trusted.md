## 2026-05-15 14:38 - Adopt OIDC Trusted Publishing for npm releases

**Reasoning:** Each published version carries a cryptographic provenance attestation (the 'Published from GitHub Actions' badge on npm), letting consumers verify the tarball matches a specific repo commit.

**Alternatives considered:** Long-lived granular NPM_TOKEN with bypass-2FA stored as a repo secret — rejected because it's a secret to manage (rotation, leak risk) and ships no provenance. npm's own warning steers users away from this for CI/CD., Manual npm publish on each release (status quo) — rejected because thrillmot's account uses a passkey (no 6-digit OTP path), and we want releases triggered by tag push without human intervention.

**Implications:**
- Future releases workflow is: bump package.json, merge release PR, then . Workflow auto-publishes within ~30s.
- For backfilling existing tags (v0.4.1, v0.5.0, v0.5.1, v0.5.2), workflow_dispatch with the tag name as input covers it without re-pushing tags.
- Trusted publisher must be configured at npmjs.com/package/clud-bug → Settings → Publishing access (one-time GUI step, completed by @thrillmot). Owner: thrillmot, Repo: clud-bug, Workflow: npm-publish.yml, Environment: blank.

---
