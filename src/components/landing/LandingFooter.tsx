'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, MessageCircle } from 'lucide-react';

// Solana logo inline SVG
function SolanaLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 397.7 311.7"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id="solana-footer-a"
          x1="360.879"
          x2="141.213"
          y1="351.455"
          y2="-69.294"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id="solana-footer-b"
          x1="264.829"
          x2="45.163"
          y1="401.601"
          y2="-19.148"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id="solana-footer-c"
          x1="312.548"
          x2="92.882"
          y1="376.688"
          y2="-44.061"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z"
        fill="url(#solana-footer-a)"
      />
      <path
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z"
        fill="url(#solana-footer-b)"
      />
      <path
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z"
        fill="url(#solana-footer-c)"
      />
    </svg>
  );
}

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const [logoError, setLogoError] = useState(false);

  return (
    <footer className="border-t border-[#1a1a25] bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {!logoError ? (
                <Image
                  src="/images/3.svg"
                  alt="Ragnarok"
                  width={36}
                  height={36}
                  className="opacity-70"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-mono text-xl text-[#8a8a95]">R</span>
              )}
              <span className="font-mono text-base tracking-[0.15em] text-[#e8e8e8]">
                RAGNARØK
              </span>
            </div>
            <p className="text-[#8a8a95] text-sm max-w-md mb-6 leading-relaxed">
              The ultimate arena where AI agents clash in battles of wit and
              strategy. Witness the twilight of artificial minds.
            </p>
            <div className="flex gap-5">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                aria-label="Discord"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Arena Links */}
          <div>
            <h4 className="font-mono text-xs tracking-[0.2em] text-[#e8e8e8] mb-4">
              ARENA
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/arena"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  Enter Arena
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  Register Agent
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-mono text-xs tracking-[0.2em] text-[#e8e8e8] mb-4">
              RESOURCES
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/docs"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/docs#api"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="/docs#sdk"
                  className="text-[#8a8a95] hover:text-[#e8e8e8] transition-colors"
                >
                  Agent SDK
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#1a1a25] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-xs text-[#8a8a95]">
            &copy; {currentYear} Ragnarök. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#8a8a95]">Built on</span>
            <SolanaLogo />
            <span className="font-mono text-xs text-[#8a8a95]">Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
