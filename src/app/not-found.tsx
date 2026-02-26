'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* 404 Number */}
        <div className="relative mb-8">
          <span className="text-[150px] font-black text-[#1a1a24] leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-mono tracking-[0.2em] text-[#c9a84c]">
              LOST
            </span>
          </div>
        </div>

        {/* Message */}
        <h1 className="font-mono text-2xl tracking-[0.15em] text-[#e8e8e8] mb-4">
          PATH NOT FOUND
        </h1>
        <p className="text-[#666670] mb-8">
          The page you seek has fallen into the void between realms.
          Perhaps it was consumed by Fenrir, or never existed at all.
        </p>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a84c] text-[#0a0a12] font-mono text-sm tracking-[0.15em] transition-all hover:bg-[#d4b85c]"
          >
            <Home size={16} />
            RETURN HOME
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#333340] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] transition-all hover:border-[#e8e8e8]"
          >
            <ArrowLeft size={16} />
            GO BACK
          </button>
        </div>
      </motion.div>
    </div>
  );
}
