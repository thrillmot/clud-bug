import type { Metadata } from 'next';
import { Fraunces, EB_Garamond, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cludbug.dev'),
  title: 'Clud Bug — Claude PR review with project-aware skills',
  description:
    'Clud Bug pins skills auto-curated from skills.sh and ships a Claude PR-review workflow that actually posts comments. A field naturalist for your codebase. Open source.',
  openGraph: {
    title: 'Clud Bug — a field guide to specimens crawling your code',
    description:
      'Claude PR review tuned to your stack, with skills auto-curated from skills.sh and a baseline kit of review discipline. Reviews land within two minutes.',
    url: 'https://cludbug.dev',
    siteName: 'Clud Bug',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clud Bug — a field guide to specimens crawling your code',
    description:
      'Claude PR review tuned to your stack, with skills auto-curated from skills.sh and a baseline kit of review discipline. Reviews land within two minutes.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ebGaramond.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
