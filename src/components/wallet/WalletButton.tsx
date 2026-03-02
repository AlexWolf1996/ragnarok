'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Copy, LogOut, ChevronDown } from 'lucide-react';

export default function WalletButton() {
  const { connected, publicKey, disconnect, select, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const address = publicKey?.toBase58() ?? '';
  const truncated = address ? `${address.slice(0, 4)}..${address.slice(-4)}` : '';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen]);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-HTTPS or permission-denied contexts
    }
  }, [address]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    select(null);
    setDropdownOpen(false);
  }, [disconnect, select]);

  if (!connected || !publicKey) {
    return (
      <button
        onClick={handleConnect}
        className="wallet-btn wallet-btn-disconnected"
      >
        CONNECT WALLET
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        className="wallet-btn wallet-btn-connected"
      >
        {wallet?.adapter.icon && (
          <img
            src={wallet.adapter.icon}
            alt=""
            width={16}
            height={16}
            className="wallet-btn-icon"
          />
        )}
        <span>{truncated}</span>
        <ChevronDown
          size={12}
          className={`ml-1 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
        <div className="wallet-dropdown-menu" role="menu">
          <button onClick={handleCopy} className="wallet-dropdown-item" role="menuitem">
            <Copy size={13} />
            <span>{copied ? 'COPIED' : 'COPY ADDRESS'}</span>
          </button>
          <button onClick={handleDisconnect} className="wallet-dropdown-item wallet-dropdown-disconnect" role="menuitem">
            <LogOut size={13} />
            <span>DISCONNECT</span>
          </button>
        </div>
      )}
    </div>
  );
}
