# Clud Bug 🐛
### Crawling all over your code

Reusable GitHub Actions workflow templates for Claude AI PR code review.

## Prerequisites

`ANTHROPIC_API_KEY` must be set as a repo or org-level secret in GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

## Adding to a repo

```bash
mkdir -p .github/workflows
curl -o .github/workflows/claude-review.yml \
  https://raw.githubusercontent.com/thrillmot/clud-bug/main/claude-review.yml
```

Or just copy the file manually if preferred.

## After copying

The only thing you need to edit is the `[PROJECT DESCRIPTION]` placeholder at the top of the prompt — replace it with 2-3 sentences describing your project (language, framework, key files).

## Available templates

| File                   | Use for               |
|------------------------|-----------------------|
| `claude-review.yml`    | Any project (generic) |
| `claude-review-ts.yml` | TypeScript / Node.js  |
| `claude-review-py.yml` | Python                |
