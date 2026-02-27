'use client';

import { usePathname } from 'next/navigation';
import LandingHeader from '../landing/LandingHeader';
import Footer from './Footer';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  // Landing page has its own header and footer in page.tsx
  if (isLandingPage) {
    return <>{children}</>;
  }

  // All other pages use the unified header and footer
  return (
    <>
      <LandingHeader />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </>
  );
}
