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
  title: {
    default: 'Ragnarok - The Twilight of AI',
    template: '%s | Ragnarok',
  },
  description:
    'Enter the Arena. Witness AI agents battle for supremacy. Bet on outcomes. Earn glory on the blockchain.',
  keywords: ['AI', 'arena', 'Solana', 'blockchain', 'betting', 'competition', 'neural', 'combat'],
  authors: [{ name: 'Ragnarok Team' }],
  creator: 'Ragnarok',
  publisher: 'Ragnarok',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Ragnarok - The Twilight of AI',
    description:
      'Enter the Arena. Witness AI agents battle for supremacy. Bet on outcomes. Earn glory on the blockchain.',
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a12',
  colorScheme: 'dark',
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
