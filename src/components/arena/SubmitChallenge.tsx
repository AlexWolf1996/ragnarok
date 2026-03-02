'use client';

import { useState } from 'react';
import { Plus, ChevronDown, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSubmitChallenge } from '@/hooks/useSubmitChallenge';

const CATEGORIES = ['Strategy', 'Code', 'Reasoning', 'Creative', 'Knowledge'];
const MIN_CHARS = 50;
const MAX_CHARS = 2000;

export default function SubmitChallenge() {
  const wallet = useWallet();
  const { submit, loading, error, success, result, reset } = useSubmitChallenge();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [text, setText] = useState('');

  const charCount = text.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const canSubmit = isValid && wallet.connected && wallet.publicKey && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !wallet.publicKey) return;
    await submit({
      wallet_address: wallet.publicKey.toString(),
      category: category.toLowerCase(),
      challenge_text: text,
    });
  };

  const handleReset = () => {
    reset();
    setText('');
    setCategory(CATEGORIES[0]);
  };

  // Success state
  if (success && result) {
    return (
      <div className="border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Check size={14} className="text-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase">
            {result.status === 'approved' ? 'Challenge Submitted' : 'Challenge Reviewed'}
          </span>
        </div>
        {result.status === 'rejected' && result.rejection_reason && (
          <p className="font-mono text-[10px] text-red-400 mb-2">{result.rejection_reason}</p>
        )}
        <button
          onClick={handleReset}
          className="font-mono text-[10px] text-neutral-500 hover:text-[#D4A843] tracking-widest uppercase transition-colors"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 font-mono text-[10px] text-neutral-400 tracking-widest uppercase">
          <Plus size={12} />
          Submit Your Own Challenge
        </span>
        <ChevronDown
          size={12}
          className={`text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Category dropdown */}
          <div>
            <label className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase block mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full bg-[#0d0d0d] border border-neutral-800 px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-[#D4A843]/50 appearance-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Challenge textarea */}
          <div>
            <label className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase block mb-1">
              Challenge Prompt
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              disabled={loading}
              placeholder="Write a challenge for AI agents to compete on..."
              rows={4}
              className="w-full bg-[#0d0d0d] border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#D4A843]/50 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className={`font-mono text-[9px] ${charCount < MIN_CHARS ? 'text-red-400' : 'text-neutral-600'}`}>
                {charCount < MIN_CHARS ? `${MIN_CHARS - charCount} more chars needed` : 'Ready'}
              </span>
              <span className="font-mono text-[9px] text-neutral-600">
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Info */}
          <p className="font-mono text-[9px] text-neutral-600">
            Cost: 0.001 SOL &middot; Earn 1% rake on each use
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 border border-red-500/30 bg-red-500/5">
              <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
              <span className="font-mono text-[10px] text-red-400">{error}</span>
            </div>
          )}

          {/* Submit button */}
          {!wallet.connected ? (
            <div className="py-2 border border-neutral-700 text-center font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
              Connect Wallet to Submit
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-2 border font-mono text-[10px] tracking-widest uppercase transition-colors ${
                canSubmit
                  ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20'
                  : 'border-neutral-700 text-neutral-600 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Challenge'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
