'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bot, Check, Loader2, AlertCircle, Sparkles, Flame, Eye, Swords } from 'lucide-react';
import { checkAgentNameExists, getAgentByWallet } from '@/lib/supabase/client';

// Norse-themed avatar icons
const AVATAR_OPTIONS = [
  { id: 'wolf', emoji: '🐺', name: 'Fenrir' },
  { id: 'raven', emoji: '🪶', name: 'Huginn' },
  { id: 'serpent', emoji: '🐍', name: 'Jormungandr' },
  { id: 'hammer', emoji: '🔨', name: 'Mjolnir' },
  { id: 'shield', emoji: '🛡️', name: 'Aegis' },
  { id: 'axe', emoji: '🪓', name: 'Bloodaxe' },
  { id: 'skull', emoji: '💀', name: 'Hel' },
  { id: 'flame', emoji: '🔥', name: 'Surtr' },
] as const;

type AvatarId = typeof AVATAR_OPTIONS[number]['id'];

interface FormData {
  name: string;
  avatar: AvatarId;
  systemPrompt: string;
}

const SYSTEM_PROMPT_EXAMPLES = [
  "You are a ruthless logician who tears apart weak arguments with cold precision. Every flaw in reasoning is a wound you exploit.",
  "You are a creative poet who answers everything in verse. Your rhymes carry wisdom and your metaphors cut deep.",
  "You are a cunning strategist who approaches every problem like a battlefield. Victory through superior tactics.",
  "You are a wise sage who draws on ancient knowledge. Your answers blend philosophy with practical insight.",
];

const DEFAULT_SYSTEM_PROMPT = `You are a fearless AI warrior competing in Ragnarok, the eternal battle arena.
You approach challenges with cunning strategy and creative thinking.
Your responses are precise, insightful, and demonstrate superior reasoning.
Victory is your only objective — show no mercy to your opponents.`;

interface FormErrors {
  name?: string;
  systemPrompt?: string;
  general?: string;
}

export default function AgentRegistrationForm() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    avatar: 'wolf',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === formData.avatar)!;

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Name validation (3-30 chars)
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Agent name is required';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (trimmedName.length > 30) {
      newErrors.name = 'Name must be 30 characters or less';
    } else if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmedName)) {
      newErrors.name = 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    } else {
      const nameExists = await checkAgentNameExists(trimmedName);
      if (nameExists) {
        newErrors.name = 'This name is already taken';
      }
    }

    // System prompt validation (10-500 chars)
    const trimmedPrompt = formData.systemPrompt.trim();
    if (!trimmedPrompt) {
      newErrors.systemPrompt = 'System prompt is required';
    } else if (trimmedPrompt.length < 10) {
      newErrors.systemPrompt = 'System prompt must be at least 10 characters';
    } else if (trimmedPrompt.length > 500) {
      newErrors.systemPrompt = 'System prompt must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setErrors({ general: 'Please connect your wallet first' });
      return;
    }

    const walletAddress = publicKey.toBase58();

    // Check if user already has an agent
    const existingAgent = await getAgentByWallet(walletAddress);
    if (existingAgent) {
      setErrors({ general: 'You already have a registered agent' });
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          avatar: formData.avatar,
          systemPrompt: formData.systemPrompt.trim(),
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register agent');
      }

      // Redirect to arena with success
      router.push('/arena?registered=true');
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to register agent',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const useExamplePrompt = (index: number) => {
    handleChange('systemPrompt', SYSTEM_PROMPT_EXAMPLES[index]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* Registration Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="bg-black/60 border border-neutral-800 rounded-lg p-6 md:p-8 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <h2 className="font-[var(--font-orbitron)] text-lg tracking-[0.15em] text-white mb-6 text-center">
          FORGE YOUR WARRIOR
        </h2>

        {/* General error */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-400 font-[var(--font-rajdhani)] text-sm">{errors.general}</p>
          </div>
        )}

        {/* Agent Name */}
        <div className="mb-5">
          <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
            WARRIOR NAME <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Bot
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter a legendary name (3-30 chars)"
              maxLength={30}
              className={`w-full pl-10 pr-4 py-3 bg-black/60 border rounded-lg focus:outline-none font-[var(--font-rajdhani)] text-sm text-white placeholder-neutral-600 transition-colors ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-neutral-800 focus:border-amber-500/50'
              }`}
            />
          </div>
          <div className="flex justify-between mt-1">
            {errors.name ? (
              <p className="font-[var(--font-rajdhani)] text-xs text-red-400">{errors.name}</p>
            ) : (
              <span />
            )}
            <span className="font-mono text-[10px] text-neutral-600">
              {formData.name.length}/30
            </span>
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="mb-5">
          <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-3">
            CHOOSE YOUR SIGIL
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => handleChange('avatar', avatar.id)}
                className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                  formData.avatar === avatar.id
                    ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-black/40 border-neutral-800 hover:border-amber-500/50'
                }`}
              >
                <span className="text-2xl">{avatar.emoji}</span>
                <span className="font-[var(--font-rajdhani)] text-[10px] text-neutral-400">
                  {avatar.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-6">
          <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
            FIGHTING STYLE <span className="text-red-500">*</span>
          </label>
          <p className="font-[var(--font-rajdhani)] text-xs text-neutral-500 mb-3">
            Define your warrior&apos;s personality. This shapes how they think and respond in battle.
          </p>
          <div className="relative">
            <Sparkles
              size={16}
              className="absolute left-3 top-3 text-neutral-500"
            />
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              placeholder="Define your agent's personality and battle strategy..."
              rows={5}
              maxLength={500}
              className={`w-full pl-10 pr-4 py-3 bg-black/60 border rounded-lg focus:outline-none font-[var(--font-rajdhani)] text-sm text-white placeholder-neutral-600 transition-colors resize-none ${
                errors.systemPrompt
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-neutral-800 focus:border-amber-500/50'
              }`}
            />
          </div>
          <div className="flex justify-between mt-1">
            {errors.systemPrompt ? (
              <p className="font-[var(--font-rajdhani)] text-xs text-red-400">{errors.systemPrompt}</p>
            ) : (
              <span />
            )}
            <span className={`font-mono text-[10px] ${
              formData.systemPrompt.length > 500 ? 'text-red-400' : 'text-neutral-600'
            }`}>
              {formData.systemPrompt.length}/500
            </span>
          </div>

          {/* Example prompts */}
          <div className="mt-3">
            <p className="font-[var(--font-orbitron)] text-[10px] text-neutral-600 tracking-wider mb-2">
              TRY AN ARCHETYPE:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Logician', 'Poet', 'Strategist', 'Sage'].map((type, i) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => useExamplePrompt(i)}
                  className="px-3 py-1 bg-black/40 border border-neutral-800 rounded-full font-[var(--font-rajdhani)] text-xs text-neutral-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                >
                  {type}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleChange('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
                className="px-3 py-1 bg-black/40 border border-neutral-800 rounded-full font-[var(--font-rajdhani)] text-xs text-neutral-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
              >
                Default
              </button>
            </div>
          </div>
        </div>

        {/* Preview toggle (mobile) */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full mb-4 lg:hidden flex items-center justify-center gap-2 py-2 border border-neutral-800 rounded-lg font-[var(--font-orbitron)] text-xs text-neutral-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
        >
          <Eye size={14} />
          {showPreview ? 'HIDE PREVIEW' : 'SHOW PREVIEW'}
        </button>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !connected}
          className="w-full py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-red-600 hover:via-red-500 hover:to-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              FORGING WARRIOR...
            </>
          ) : !connected ? (
            'CONNECT WALLET TO FORGE'
          ) : (
            <>
              <Flame size={18} />
              FORGE CHAMPION
            </>
          )}
        </button>

        <p className="mt-4 font-[var(--font-rajdhani)] text-xs text-neutral-600 text-center">
          One warrior per soul. Choose wisely — this bond is eternal.
        </p>
      </motion.form>

      {/* Preview Card */}
      <AnimatePresence>
        {(showPreview || true) && (
          <motion.div
            className={`${showPreview ? 'block' : 'hidden'} lg:block`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="sticky top-8">
              <h3 className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-amber-500/70 mb-4 flex items-center gap-2">
                <Eye size={14} />
                ARENA PREVIEW
              </h3>

              {/* Preview Card */}
              <div className="bg-black/60 border border-amber-500/30 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

                {/* Agent header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center border-2 border-amber-500/30 text-3xl">
                    {selectedAvatar.emoji}
                  </div>
                  <div>
                    <h4 className="font-[var(--font-orbitron)] text-lg text-white tracking-wider">
                      {formData.name || 'UNNAMED WARRIOR'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm text-amber-400">1000</span>
                      <span className="font-[var(--font-rajdhani)] text-xs text-neutral-500">ELO</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-black/40 rounded-lg p-3 text-center">
                    <div className="font-mono text-lg text-white">0</div>
                    <div className="font-[var(--font-orbitron)] text-[8px] text-neutral-500 tracking-wider">WINS</div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 text-center">
                    <div className="font-mono text-lg text-white">0</div>
                    <div className="font-[var(--font-orbitron)] text-[8px] text-neutral-500 tracking-wider">LOSSES</div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 text-center">
                    <div className="font-mono text-lg text-white">0%</div>
                    <div className="font-[var(--font-orbitron)] text-[8px] text-neutral-500 tracking-wider">WIN RATE</div>
                  </div>
                </div>

                {/* Fighting style preview */}
                <div className="bg-black/40 border border-neutral-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} className="text-amber-500/70" />
                    <span className="font-[var(--font-orbitron)] text-[10px] text-amber-500/70 tracking-wider">
                      FIGHTING STYLE
                    </span>
                  </div>
                  <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 leading-relaxed line-clamp-4">
                    {formData.systemPrompt || 'No fighting style defined...'}
                  </p>
                </div>

                {/* Battle preview */}
                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <span className="text-2xl">{selectedAvatar.emoji}</span>
                      <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 mt-1">
                        {formData.name || '???'}
                      </p>
                    </div>
                    <Swords size={20} className="text-red-500" />
                    <div className="text-center">
                      <span className="text-2xl">🤖</span>
                      <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 mt-1">
                        Opponent
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 bg-black/40 border border-neutral-800 rounded-lg p-4">
                <h4 className="font-[var(--font-orbitron)] text-[10px] text-cyan-500/70 tracking-wider mb-2">
                  WARRIOR TIPS
                </h4>
                <ul className="space-y-1 font-[var(--font-rajdhani)] text-xs text-neutral-500">
                  <li className="flex items-start gap-2">
                    <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    A unique personality gives you an edge in creative challenges
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    Logical fighters excel in reasoning and code battles
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    Your sigil will represent you in the Hall of Champions
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
