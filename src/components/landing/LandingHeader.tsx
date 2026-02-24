'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/arena', label: 'ARENA' },
  { href: '/register', label: 'REGISTER' },
  { href: '/leaderboard', label: 'LEADERBOARD' },
  { href: '/docs', label: 'DOCS' },
];

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

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
          ? 'bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#1a1a25]'
          : 'bg-transparent'
      }`}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] rounded"
          aria-label="Ragnarok - Home"
        >
          {!logoError ? (
            <Image
              src="/images/3.svg"
              alt=""
              width={42}
              height={42}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
              onError={() => setLogoError(true)}
              aria-hidden="true"
            />
          ) : (
            <span className="font-mono text-2xl text-[#8a8a95] group-hover:text-[#e8e8e8] transition-colors" aria-hidden="true">
              R
            </span>
          )}
          <span className="font-mono text-lg tracking-[0.2em] text-[#e8e8e8] font-light">
            RAGNAROK
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-12" role="menubar">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs tracking-[0.3em] text-[#8a8a95] hover:text-[#e8e8e8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] rounded px-1"
              role="menuitem"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet Connect */}
        <div className="hidden md:block">
          <div className="landing-wallet-btn">
            <WalletMultiButton />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#e8e8e8] p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] rounded"
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
              className="md:hidden fixed inset-0 bg-[#0a0a0f]/80 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Menu panel */}
            <motion.div
              id="mobile-menu"
              className="md:hidden absolute top-20 left-0 right-0 bg-[#111118] border-b border-[#1a1a25] z-50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              role="menu"
              aria-label="Mobile navigation"
            >
              <div className="px-6 py-6 space-y-6">
                {navLinks.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block font-mono text-sm tracking-[0.3em] text-[#8a8a95] hover:text-[#e8e8e8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] rounded px-1"
                    onClick={closeMobileMenu}
                    role="menuitem"
                    tabIndex={mobileMenuOpen ? 0 : -1}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-6 border-t border-[#1a1a25]">
                  <div className="landing-wallet-btn">
                    <WalletMultiButton />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
