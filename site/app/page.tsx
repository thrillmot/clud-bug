import { getNpmStats, getRepoStats, getLatestPublicReview, formatCount } from '../lib/data';

export default async function Home() {
  // Public-only sources, server-fetched and cached for 1h. Failures degrade
  // gracefully — sections hide rather than break the page.
  const [npm, repo, latest] = await Promise.all([
    getNpmStats(),
    getRepoStats(),
    getLatestPublicReview(),
  ]);

  return (
    <main className="page">
      <header className="folio">
        <span>A Field Guide to Code Specimens</span>
        <span>Vol. 0 · {npm ? `v${npm.version}` : 'No. 2'} · MMXXVI</span>
      </header>

      {/* ─────────── FRONTISPIECE ─────────── */}
      <section className="hero">
        <aside className="plate appear">
          <span className="plate-number">№ I</span>
          <span className="plate-label">Plate I — Frontispiece</span>
          <span className="bug-pin" aria-hidden>🐛</span>
        </aside>
        <div>
          <h1 className="title appear-1">
            Clud <em>Bug</em>.
          </h1>
          <p className="subtitle appear-2">
            A field naturalist for your codebase.
            <em className="binomial">— Cluddus bugfindii, observed crawling on every PR.</em>
          </p>
          <pre className="install-box appear-3">npx clud-bug init</pre>
          <div className="actions appear-4">
            <a href="https://github.com/thrillmot/clud-bug">View on GitHub</a>
            <span className="sep">·</span>
            <a href="#observations">Observations</a>
            <span className="sep">·</span>
            <a href="#how-to-collect">How to collect</a>
          </div>
          {(npm || repo) && (
            <dl className="ledger appear-4" aria-label="Live field tally">
              {npm && (
                <>
                  <div><dt>Edition</dt><dd>v{npm.version}</dd></div>
                  <div><dt>Downloads / wk</dt><dd>{formatCount(npm.weeklyDownloads)}</dd></div>
                </>
              )}
              {repo && (
                <div><dt>PRs reviewed</dt><dd>{formatCount(repo.recentMergedCount + repo.openPRs)}</dd></div>
              )}
            </dl>
          )}
        </div>
      </section>

      {/* ─────────── §I — WHY THIS EXISTS ─────────── */}
      <section className="section" id="observations">
        <header className="section-head">
          <span className="section-num">§ I — Habitat & Habit</span>
          <h2 className="section-title">Why a field guide.</h2>
        </header>
        <div className="section-body">
          <aside className="marginalia">
            Stock Claude PR review installs leave Claude unable to post comments. The
            bot thinks, then exits in silence. Specimens go uncatalogued.
          </aside>
          <div className="section-prose">
            <p>
              The official <code>anthropics/claude-code-action</code> ships with{' '}
              <code>gh pr comment</code> disabled by default. Without an explicit{' '}
              <code>--allowedTools</code> whitelist, Claude runs through your diff,
              composes a thorough review, and exits without ever posting a word.
            </p>
            <p>
              <strong>Clud Bug</strong> ships the correct workflow configuration <em>and</em>{' '}
              auto-curates skills from your repository — Next.js review patterns for a
              Next.js repo, FastAPI patterns for a FastAPI repo, your team&rsquo;s own rules
              for your team&rsquo;s own repo. Every PR gets a comment within ~2 minutes,
              shaped by skills relevant to what you actually wrote.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── §II — SPECIMENS ─────────── */}
      <section className="section">
        <header className="section-head">
          <span className="section-num">§ II — Type Specimens</span>
          <h2 className="section-title">Three skills, always pinned.</h2>
        </header>
        <div className="section-body">
          <aside className="marginalia">
            Bundled with every install. Combine with skills curated from{' '}
            <a href="https://skills.sh" style={{ color: 'inherit' }}>skills.sh</a>{' '}
            and your own <code>.claude/skills/</code>.
          </aside>
          <div className="specimens">
            <article className="specimen">
              <span className="specimen-tag">Specimen 01</span>
              <h3 className="specimen-name">Critical issues only</h3>
              <p className="specimen-desc">
                Flags only correctness, security, and performance defects. Suppresses
                style nits and naming preferences that don&rsquo;t change behavior.
              </p>
              <span className="specimen-pin">cat. № CB-001</span>
            </article>
            <article className="specimen">
              <span className="specimen-tag">Specimen 02</span>
              <h3 className="specimen-name">Evidence-based review</h3>
              <p className="specimen-desc">
                Every claim must quote the line under criticism. No hand-waving, no
                vague &ldquo;might cause issues.&rdquo; Cite or delete.
              </p>
              <span className="specimen-pin">cat. № CB-002</span>
            </article>
            <article className="specimen">
              <span className="specimen-tag">Specimen 03</span>
              <h3 className="specimen-name">Respect existing conventions</h3>
              <p className="specimen-desc">
                A code review is not a redesign. Don&rsquo;t suggest patterns that fight
                the surrounding codebase&rsquo;s established style.
              </p>
              <span className="specimen-pin">cat. № CB-003</span>
            </article>
          </div>
        </div>
      </section>

      {/* ─────────── §III — FIELD OBSERVATION ─────────── */}
      <section className="section">
        <header className="section-head">
          <span className="section-num">§ III — Recorded Observation</span>
          <h2 className="section-title">From Clud Bug&rsquo;s notebook.</h2>
        </header>
        <div className="section-body">
          <aside className="marginalia">
            A single PR review on a fixture file with four planted defects. The naturalist
            also flagged a fifth issue the author had not intended.
          </aside>
          {latest ? (
            <blockquote className="observation">
              {latest.headline}
              <footer>
                Latest field note ·{' '}
                <a href={latest.prUrl} style={{ color: 'inherit' }}>
                  PR #{latest.prNumber}: {latest.prTitle}
                </a>
              </footer>
            </blockquote>
          ) : (
            <blockquote className="observation">
              Found all four planted bugs plus a fifth bonus problem (command injection via
              <code style={{ background: 'transparent', border: 0, padding: 0, fontStyle: 'normal' }}> sh -c + rm -rf</code>{' '}
              — worse than the SQL injection — RCE). Inline comments posted at each site.
              <footer>Specimen review · 53 seconds · PR #2</footer>
            </blockquote>
          )}
        </div>
      </section>

      {/* ─────────── §IV — INSTALL ─────────── */}
      <section className="section" id="how-to-collect">
        <header className="section-head">
          <span className="section-num">§ IV — Field Procedure</span>
          <h2 className="section-title">How to begin collecting.</h2>
        </header>
        <div className="section-body">
          <aside className="marginalia">
            Set <code>ANTHROPIC_API_KEY</code> in your repository&rsquo;s Actions secrets
            (<em>Settings → Secrets and variables → Actions</em>). Open a PR. The
            naturalist arrives within two minutes.
          </aside>
          <div>
            <pre className="terminal">
              <span className="comment"># 1. Survey the habitat, pin specimens, draft the field kit.</span>{'\n'}
              <span className="cmd">npx clud-bug init</span>{'\n'}
              <span className="out">  🐛 Field season opens in <span className="path">~/your-repo</span>.</span>{'\n'}
              <span className="out">    baseline kit:     <span className="num">3</span> specimens</span>{'\n'}
              <span className="out">  pinning specimens to <span className="path">.claude/skills/</span>...</span>{'\n'}
              <span className="out">    pinned <span className="num">3</span> specimens</span>{'\n'}
              <span className="out">  wrote <span className="path">.github/workflows/clud-bug-review.yml</span></span>{'\n\n'}
              <span className="comment"># 2. Commit the field kit and push.</span>{'\n'}
              <span className="cmd">git add <span className="path">.claude .github/workflows/clud-bug-review.yml</span></span>{'\n'}
              <span className="cmd">git commit -m &quot;Add clud-bug&quot; && git push</span>{'\n'}
            </pre>
          </div>
        </div>
      </section>

      <footer className="colophon">
        <span>
          Open source. <a href="https://github.com/thrillmot/clud-bug/blob/main/LICENSE">MIT</a>.
        </span>
        <span>
          <a href="https://github.com/thrillmot/clud-bug">github.com/thrillmot/clud-bug</a>
        </span>
      </footer>
    </main>
  );
}
