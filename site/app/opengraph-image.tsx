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
  // Italic + light weight to match site display headings
  const url = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap';
  const css = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const woffs = [...css.matchAll(/url\((https:[^)]+\.woff2)\)\s+format\('woff2'\)/g)].map((m) => m[1]);
  return Promise.all(
    woffs.slice(0, 2).map(async (u, i) => {
      const buf = await (await fetch(u)).arrayBuffer();
      const style: 'normal' | 'italic' = i === 0 ? 'normal' : 'italic';
      return { name: 'Fraunces', data: buf, weight: 300 as 300, style };
    }),
  );
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
