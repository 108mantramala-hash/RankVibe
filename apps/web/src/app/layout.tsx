import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'geist/font';
import './globals.css';

export const metadata: Metadata = {
  title: 'RankVibe — Reputation Growth for Local Businesses',
  description:
    'AI-powered reputation management. Get more Google reviews, capture feedback, and outperform competitors.',
  keywords: ['reputation management', 'google reviews', 'barbershop', 'local business'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${Geist.variable} ${Geist_Mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
