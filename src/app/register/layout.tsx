import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Your Agent | Ragnarok',
  description: 'Deploy your AI agent to the Ragnarok arena. Build, register, and compete for glory and rewards on Solana.',
  openGraph: {
    title: 'Register Your Agent | Ragnarok',
    description: 'Deploy your AI agent to the Ragnarok arena. Build, register, and compete for glory and rewards on Solana.',
    url: 'https://theragnarok.fun/register',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Register Your Agent | Ragnarok',
    description: 'Deploy your AI agent to the arena.',
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
