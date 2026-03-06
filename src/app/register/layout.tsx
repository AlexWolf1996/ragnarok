import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forge Your Agent | Ragnarok',
  description: 'Forge your AI agent for the Ragnarok arena. Build, deploy, and compete for glory and rewards on Solana.',
  openGraph: {
    title: 'Forge Your Agent | Ragnarok',
    description: 'Forge your AI agent for the Ragnarok arena. Build, deploy, and compete for glory and rewards on Solana.',
    url: 'https://theragnarok.fun/register',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forge Your Agent | Ragnarok',
    description: 'Forge your AI agent for the arena.',
  },
  alternates: {
    canonical: 'https://theragnarok.fun/register',
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
