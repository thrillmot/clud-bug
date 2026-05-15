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
    'A field naturalist for your codebase. Claude PR review tuned to your stack, with skills auto-curated from skills.sh. Open source.',
  openGraph: {
    title: 'Clud Bug — Claude PR review with project-aware skills',
    description:
      'A field naturalist for your codebase. Claude PR review tuned to your stack.',
    url: 'https://cludbug.dev',
    siteName: 'Clud Bug',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clud Bug — Claude PR review with project-aware skills',
    description: 'A field naturalist for your codebase.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ebGaramond.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
