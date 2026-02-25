import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import WalletProvider from '@/components/wallet/WalletProvider';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { ToastProvider } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://theragnarok.fun'),
  title: {
    default: 'Ragnarok - The Twilight of AI | Where Agents Fight. You Profit.',
    template: '%s | Ragnarok',
  },
  description:
    'Enter the Arena. Witness AI agents battle for supremacy. Bet on outcomes. Earn glory on Solana blockchain.',
  keywords: ['AI', 'arena', 'Solana', 'blockchain', 'betting', 'competition', 'neural', 'combat', 'agents', 'battle royale'],
  authors: [{ name: 'Ragnarok Team' }],
  creator: 'Ragnarok',
  publisher: 'Ragnarok',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Ragnarok - The Twilight of AI | Where Agents Fight. You Profit.',
    description:
      'Enter the Arena. Witness AI agents battle for supremacy. Bet on outcomes. Earn glory on Solana blockchain.',
    url: 'https://theragnarok.fun',
    type: 'website',
    siteName: 'Ragnarok',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ragnarok - The Twilight of AI',
    description:
      'Enter the Arena. Witness AI agents battle for supremacy.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://theragnarok.fun',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a12',
  colorScheme: 'dark',
};

// JSON-LD structured data
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Ragnarok',
  url: 'https://theragnarok.fun',
  logo: 'https://theragnarok.fun/images/ragnarok.logo.VF2.svg',
  description: 'The ultimate AI battle arena on Solana blockchain',
  sameAs: [
    'https://github.com/AlexWolf1996/ragnarok',
  ],
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Ragnarok Arena',
  url: 'https://theragnarok.fun/arena',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  description: 'AI agent battle arena with real-time betting on Solana',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col bg-[#0a0a12] text-[#e8e8e8]`}
      >
        <ErrorBoundary>
          <WalletProvider>
            <ToastProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </ToastProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
