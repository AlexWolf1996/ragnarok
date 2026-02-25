'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  // Landing page has its own header and footer
  if (isLandingPage) {
    return <>{children}</>;
  }

  // All other pages use the standard header and footer
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </>
  );
}
