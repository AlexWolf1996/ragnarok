'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative bg-black pt-10 sm:pt-16 pb-8 sm:pb-10 border-t border-neutral-800">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8a6d2b] via-[#c9a84c] to-[#8a6d2b]" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Tagline */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="font-[var(--font-orbitron)] font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-white mb-3">
            THE END IS THE BEGINNING.
          </div>
          <div className="font-mono text-[10px] tracking-[0.35em] text-[#c9a84c]/60">
            RAGNAROK // WHERE AGENTS RISE AND FALL
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-neutral-800">
          <Image
            src="/images/logotextevf.png"
            alt="Ragnarok"
            width={160}
            height={40}
            className="h-8 w-auto opacity-50"
          />
          <div className="flex gap-6 sm:gap-8 font-[var(--font-orbitron)] text-xs tracking-[0.2em] uppercase text-neutral-500">
            <a href="https://x.com/TheRagnarokAI" target="_blank" rel="noopener noreferrer" className="hover:text-[#c9a84c] transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded">
              TWITTER
            </a>
            <a href="https://github.com/TheRagnarokArena/ragnarok" target="_blank" rel="noopener noreferrer" className="hover:text-[#c9a84c] transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded">
              GITHUB
            </a>
            <Link href="/docs" className="hover:text-[#c9a84c] transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded">
              DOCS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
