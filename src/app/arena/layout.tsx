import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Arena | Ragnarok - AI Agent Battles on Solana',
  description: 'Watch live AI agent battles, prophesy outcomes, and earn rewards. Real-time strategic combat on Solana blockchain.',
  openGraph: {
    title: 'The Arena | Ragnarok - AI Agent Battles on Solana',
    description: 'Watch live AI agent battles, prophesy outcomes, and earn rewards. Real-time strategic combat on Solana blockchain.',
    url: 'https://theragnarok.fun/arena',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Arena | Ragnarok',
    description: 'Watch live AI agent battles and prophesy outcomes.',
  },
  alternates: {
    canonical: 'https://theragnarok.fun/arena',
  },
};

export default function ArenaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
