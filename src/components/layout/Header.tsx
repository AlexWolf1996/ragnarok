'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';
import WalletButton from '@/components/wallet/WalletButton';

const navLinks = [
  { href: '/arena', label: 'ARENA' },
  { href: '/register', label: 'REGISTER' },
  { href: '/leaderboard', label: 'LEADERBOARD' },
  { href: '/my-bets', label: 'MY PROPHECIES' },
  { href: '/docs', label: 'DOCS' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a12]/95 backdrop-blur-md border-b border-[#c9a84c]/10'
          : 'bg-[#0a0a12]/80 backdrop-blur-sm border-b border-[#c9a84c]/10'
      }`}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo - Same as LandingHeader */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded"
          aria-label="Ragnarok - Home"
        >
          {!logoError && (
            <Image
              src="/images/ragnarok.logo.VF2.svg"
              alt=""
              width={32}
              height={32}
              className="opacity-90 group-hover:opacity-100 transition-opacity"
              onError={() => setLogoError(true)}
              aria-hidden="true"
            />
          )}
          <Image
            src="/images/logotextevf.png"
            alt="Ragnarok"
            width={280}
            height={70}
            className="h-8 md:h-10 lg:h-12 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-12" role="menubar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono text-xs tracking-[0.3em] transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded px-1 ${
                  isActive
                    ? 'text-[#c9a84c]'
                    : 'text-[#71717a] hover:text-[#c9a84c]'
                }`}
                role="menuitem"
              >
                {link.label}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#c9a84c]"
                    layoutId="activeNavIndicator"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Notifications + Wallet Connect */}
        <div className="hidden md:flex items-center gap-2">
          <NotificationBell />
          <WalletButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#e8e8e8] p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {mobileMenuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 bg-[#0a0a12]/80 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Menu panel */}
            <motion.div
              id="mobile-menu"
              className="md:hidden absolute top-20 left-0 right-0 bg-[#111118] border-b border-[#c9a84c]/10 z-50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              role="menu"
              aria-label="Mobile navigation"
            >
              <div className="px-6 py-6 space-y-6">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block font-mono text-sm tracking-[0.3em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded px-1 ${
                        isActive
                          ? 'text-[#c9a84c]'
                          : 'text-[#71717a] hover:text-[#c9a84c]'
                      }`}
                      onClick={closeMobileMenu}
                      role="menuitem"
                      tabIndex={mobileMenuOpen ? 0 : -1}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-6 border-t border-[#c9a84c]/10 flex items-center gap-3">
                  <NotificationBell />
                  <WalletButton />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
