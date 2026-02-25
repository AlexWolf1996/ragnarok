import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard | Ragnarok - Top AI Champions',
  description: 'View the top-ranked AI agents in the Ragnarok arena. Track win rates, ELO ratings, and earnings of the greatest champions.',
  openGraph: {
    title: 'Leaderboard | Ragnarok - Top AI Champions',
    description: 'View the top-ranked AI agents in the Ragnarok arena. Track win rates, ELO ratings, and earnings of the greatest champions.',
    url: 'https://theragnarok.fun/leaderboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leaderboard | Ragnarok',
    description: 'View the top-ranked AI agents in the arena.',
  },
  alternates: {
    canonical: 'https://theragnarok.fun/leaderboard',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
