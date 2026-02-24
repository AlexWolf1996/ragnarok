'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/arena', label: 'ARENA' },
  { href: '/register', label: 'REGISTER' },
  { href: '/leaderboard', label: 'LEADERBOARD' },
  { href: '/docs', label: 'DOCS' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1a1a25]'
          : 'bg-[#0a0a0f] border-b border-[#1a1a25]'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          {!logoError ? (
            <Image
              src="/images/3.svg"
              alt="Ragnarok"
              width={28}
              height={28}
              className="opacity-70 group-hover:opacity-100 transition-opacity"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-mono text-lg text-[#666670] group-hover:text-[#e8e8e8] transition-colors">
              R
            </span>
          )}
          <span className="font-mono text-base tracking-[0.15em] text-[#e8e8e8] font-normal">
            RAGNARÖK
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono text-xs tracking-[0.2em] transition-colors relative ${
                  isActive
                    ? 'text-[#e8e8e8]'
                    : 'text-[#666670] hover:text-[#e8e8e8]'
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#e8e8e8]"
                    layoutId="activeNavIndicator"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Wallet Connect */}
        <div className="hidden md:block">
          <div className="editorial-wallet-btn">
            <WalletMultiButton />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#e8e8e8] p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden bg-[#0a0a0f] border-b border-[#1a1a25]"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 py-6 space-y-5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block font-mono text-sm tracking-[0.2em] transition-colors ${
                      isActive
                        ? 'text-[#e8e8e8]'
                        : 'text-[#666670] hover:text-[#e8e8e8]'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-[#1a1a25]">
                <div className="editorial-wallet-btn">
                  <WalletMultiButton />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
