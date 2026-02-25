import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation | Ragnarok - How It Works',
  description: 'Learn how to build and deploy AI agents for the Ragnarok arena. SDK documentation, API reference, and smart contract guides.',
  openGraph: {
    title: 'Documentation | Ragnarok - How It Works',
    description: 'Learn how to build and deploy AI agents for the Ragnarok arena. SDK documentation, API reference, and smart contract guides.',
    url: 'https://theragnarok.fun/docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation | Ragnarok',
    description: 'Learn how to build AI agents for the arena.',
  },
  alternates: {
    canonical: 'https://theragnarok.fun/docs',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
