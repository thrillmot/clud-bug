import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Clud Bug — a field guide to specimens crawling your code';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPER = '#f3ecda';
const PAPER_WARM = '#ebe2cc';
const PAPER_SHADOW = '#d8cdb0';
const INK = '#2b2418';
const INK_SOFT = '#6b5a40';
const INK_FAINT = '#7e6840';
const LEAF = '#5a8a2e';
const CITRUS = '#d97a2e';

async function loadFraunces() {
  // Google Fonts CSS2 emits one @font-face block per (style × unicode-range subset),
  // so for an italic+normal request we typically get 4 blocks: italic-latin,
  // italic-latin-ext, normal-latin, normal-latin-ext. We need to parse each
  // block's font-style to know which woff2 belongs to which variant — taking the
  // first two woff2 URLs is wrong, as both could be e.g. normal-latin-ext +
  // italic-latin-ext, missing one variant entirely.
  const url = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap';
  const css = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();

  // Match each @font-face { ... } block separately, then pick a representative
  // woff2 (the latin subset, which is the smallest unicode-range and covers
  // English) for each style.
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map((m) => m[1]);

  function pickFor(style: 'normal' | 'italic'): string | null {
    const candidates = blocks.filter((b) => {
      const styleMatch = b.match(/font-style:\s*([a-z]+)/);
      return styleMatch && styleMatch[1] === style;
    });
    if (candidates.length === 0) return null;
    // Prefer the basic latin subset (its unicode-range starts with U+0000 / U+0020).
    // Fall back to the first candidate if no clear winner.
    const latin = candidates.find((b) => /unicode-range:\s*U\+(?:0000|0020|0001)/i.test(b));
    const chosen = latin || candidates[0];
    const url = chosen.match(/url\((https:[^)]+\.woff2)\)\s+format\('woff2'\)/);
    return url ? url[1] : null;
  }

  const normalUrl = pickFor('normal');
  const italicUrl = pickFor('italic');
  if (!normalUrl || !italicUrl) {
    throw new Error(`Failed to extract Fraunces font URLs (normal=${!!normalUrl}, italic=${!!italicUrl})`);
  }

  const [normalBuf, italicBuf] = await Promise.all([
    fetch(normalUrl).then((r) => r.arrayBuffer()),
    fetch(italicUrl).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: 'Fraunces', data: normalBuf, weight: 300 as 300, style: 'normal' as 'normal' },
    { name: 'Fraunces', data: italicBuf, weight: 300 as 300, style: 'italic' as 'italic' },
  ];
}

export default async function OG() {
  const fonts = await loadFraunces();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: PAPER,
          color: INK,
          fontFamily: 'Fraunces, serif',
          display: 'flex',
          padding: '72px 80px',
          position: 'relative',
        }}
      >
        {/* Top folio rule */}
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 18,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: INK_FAINT,
          }}
        >
          <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: '0.05em' }}>
            A Field Guide to Code Specimens
          </span>
          <span>Vol. 0 · cludbug.dev</span>
        </div>

        {/* Bottom folio rule */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: `1px solid ${INK_FAINT}`,
            paddingTop: 18,
            fontSize: 18,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK_FAINT,
          }}
        >
          <span>npx clud-bug init</span>
          <span>github.com/thrillmot/clud-bug</span>
        </div>

        {/* Left margin: plate number + bug */}
        <div
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 40,
            borderRight: `1px solid ${INK_FAINT}`,
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_SOFT }}>
            Plate
          </div>
          <div
            style={{
              fontSize: 96,
              fontStyle: 'italic',
              fontWeight: 300,
              color: INK,
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            № I
          </div>
          <div
            style={{
              fontSize: 220,
              marginTop: 36,
              transform: 'rotate(-12deg)',
              transformOrigin: 'center',
            }}
          >
            🐛
          </div>
        </div>

        {/* Right column: title block */}
        <div
          style={{
            flex: 1,
            paddingLeft: 56,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 168,
              lineHeight: 0.88,
              fontWeight: 300,
              letterSpacing: '-0.035em',
              color: INK,
            }}
          >
            Clud <span style={{ fontStyle: 'italic', color: LEAF }}>Bug</span>.
          </div>
          <div
            style={{
              fontSize: 38,
              fontStyle: 'italic',
              fontWeight: 300,
              color: INK_SOFT,
              marginTop: 28,
              maxWidth: 640,
              lineHeight: 1.2,
            }}
          >
            A field naturalist for your codebase.
          </div>
          <div
            style={{
              fontSize: 22,
              fontStyle: 'italic',
              color: INK_FAINT,
              marginTop: 12,
              letterSpacing: '0.04em',
            }}
          >
            — Cluddus bugfindii, observed crawling on every PR.
          </div>

          {/* Install pill */}
          <div
            style={{
              marginTop: 44,
              padding: '18px 28px',
              background: PAPER_WARM,
              border: `1px solid ${INK}`,
              boxShadow: `8px 8px 0 ${PAPER_SHADOW}`,
              fontFamily: 'monospace',
              fontSize: 32,
              color: INK,
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: CITRUS, marginRight: 14, fontWeight: 700 }}>$</span>
            npx clud-bug init
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
