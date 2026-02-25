'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bot, Link as LinkIcon, Image, Check, X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { registerAgent, checkAgentNameExists, getAgentByWallet } from '@/lib/supabase/client';

interface FormData {
  name: string;
  avatarUrl: string;
  apiEndpoint: string;
  systemPrompt: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are a fearless AI warrior competing in Ragnarok, the eternal battle arena.
You approach challenges with cunning strategy and creative thinking.
Your responses are precise, insightful, and demonstrate superior reasoning.
Victory is your only objective — show no mercy to your opponents.`;

interface FormErrors {
  name?: string;
  avatarUrl?: string;
  apiEndpoint?: string;
  general?: string;
}

export default function AgentRegistrationForm() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    avatarUrl: '',
    apiEndpoint: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'apiEndpoint') {
      setTestResult(null);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 32) {
      newErrors.name = 'Name must be 32 characters or less';
    } else {
      const nameExists = await checkAgentNameExists(formData.name);
      if (nameExists) {
        newErrors.name = 'This name is already taken';
      }
    }

    // Avatar URL validation (optional)
    if (formData.avatarUrl && !isValidUrl(formData.avatarUrl)) {
      newErrors.avatarUrl = 'Please enter a valid URL';
    }

    // API Endpoint validation
    if (!formData.apiEndpoint.trim()) {
      newErrors.apiEndpoint = 'API endpoint is required';
    } else if (!isValidHttpsUrl(formData.apiEndpoint)) {
      newErrors.apiEndpoint = 'Must be a valid HTTPS URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidHttpsUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleTestEndpoint = async () => {
    if (!formData.apiEndpoint || !isValidHttpsUrl(formData.apiEndpoint)) {
      setErrors((prev) => ({ ...prev, apiEndpoint: 'Enter a valid HTTPS URL first' }));
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testPayload = {
        challenge: {
          description: 'What comes next in the sequence?',
          sequence: [1, 2, 3, 4, 5],
          question: 'What is the next number?',
        },
      };

      const response = await fetch(formData.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
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
      await registerAgent({
        name: formData.name.trim(),
        avatar_url: formData.avatarUrl.trim() || null,
        api_endpoint: formData.apiEndpoint.trim(),
        wallet_address: walletAddress,
        system_prompt: formData.systemPrompt.trim() || null,
      });

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

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="bg-[#111118] border border-[#1a1a25] rounded-lg p-6 md:p-8 max-w-lg mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="font-mono text-xl tracking-[0.15em] text-[#e8e8e8] mb-6 text-center">
        REGISTER YOUR AGENT
      </h2>

      {/* General error */}
      {errors.general && (
        <div className="mb-6 p-4 bg-[#c41e3a]/10 border border-[#c41e3a]/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-[#c41e3a] flex-shrink-0" size={20} />
          <p className="text-[#c41e3a] font-mono text-sm">{errors.general}</p>
        </div>
      )}

      {/* Agent Name */}
      <div className="mb-5">
        <label className="block text-[10px] font-mono text-[#666670] tracking-[0.2em] mb-2">
          AGENT NAME <span className="text-[#c41e3a]">*</span>
        </label>
        <div className="relative">
          <Bot
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666670]"
          />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter agent name (3-32 chars)"
            className={`w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border rounded-lg focus:outline-none font-mono text-sm text-[#e8e8e8] placeholder-[#666670] transition-colors ${
              errors.name
                ? 'border-[#c41e3a] focus:border-[#c41e3a]'
                : 'border-[#1a1a25] focus:border-[#333340]'
            }`}
          />
        </div>
        {errors.name && (
          <p className="mt-1 font-mono text-xs text-[#c41e3a]">{errors.name}</p>
        )}
      </div>

      {/* Avatar URL */}
      <div className="mb-5">
        <label className="block text-[10px] font-mono text-[#666670] tracking-[0.2em] mb-2">
          AVATAR URL <span className="text-[#666670]">(optional)</span>
        </label>
        <div className="relative">
          <Image
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666670]"
          />
          <input
            type="url"
            value={formData.avatarUrl}
            onChange={(e) => handleChange('avatarUrl', e.target.value)}
            placeholder="https://example.com/avatar.png"
            className={`w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border rounded-lg focus:outline-none font-mono text-sm text-[#e8e8e8] placeholder-[#666670] transition-colors ${
              errors.avatarUrl
                ? 'border-[#c41e3a] focus:border-[#c41e3a]'
                : 'border-[#1a1a25] focus:border-[#333340]'
            }`}
          />
        </div>
        {errors.avatarUrl && (
          <p className="mt-1 font-mono text-xs text-[#c41e3a]">{errors.avatarUrl}</p>
        )}
        {/* Avatar preview */}
        {formData.avatarUrl && isValidUrl(formData.avatarUrl) && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={formData.avatarUrl}
              alt="Avatar preview"
              className="w-12 h-12 rounded-full object-cover border border-[#1a1a25]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-mono text-[10px] text-[#666670]">Preview</span>
          </div>
        )}
      </div>

      {/* API Endpoint */}
      <div className="mb-6">
        <label className="block text-[10px] font-mono text-[#666670] tracking-[0.2em] mb-2">
          API ENDPOINT <span className="text-[#c41e3a]">*</span>
        </label>
        <div className="relative">
          <LinkIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666670]"
          />
          <input
            type="url"
            value={formData.apiEndpoint}
            onChange={(e) => handleChange('apiEndpoint', e.target.value)}
            placeholder="https://your-api.com/agent"
            className={`w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border rounded-lg focus:outline-none font-mono text-sm text-[#e8e8e8] placeholder-[#666670] transition-colors ${
              errors.apiEndpoint
                ? 'border-[#c41e3a] focus:border-[#c41e3a]'
                : 'border-[#1a1a25] focus:border-[#333340]'
            }`}
          />
        </div>
        {errors.apiEndpoint && (
          <p className="mt-1 font-mono text-xs text-[#c41e3a]">{errors.apiEndpoint}</p>
        )}

        {/* Test button */}
        <button
          type="button"
          onClick={handleTestEndpoint}
          disabled={isTesting || !formData.apiEndpoint}
          className="mt-3 px-4 py-2 bg-[#1a1a25] border border-[#333340] rounded-lg font-mono text-xs text-[#e8e8e8] hover:bg-[#333340] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isTesting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Testing...
            </>
          ) : (
            'Test Endpoint'
          )}
        </button>

        {/* Test result */}
        {testResult && (
          <div
            className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
              testResult === 'success'
                ? 'bg-[#4ade80]/10 border border-[#4ade80]/30'
                : 'bg-[#c41e3a]/10 border border-[#c41e3a]/30'
            }`}
          >
            {testResult === 'success' ? (
              <>
                <Check size={16} className="text-[#4ade80]" />
                <span className="text-[#4ade80] font-mono text-xs">Endpoint responded successfully!</span>
              </>
            ) : (
              <>
                <X size={16} className="text-[#c41e3a]" />
                <span className="text-[#c41e3a] font-mono text-xs">Endpoint test failed. Check the URL.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* System Prompt */}
      <div className="mb-6">
        <label className="block text-[10px] font-mono text-[#666670] tracking-[0.2em] mb-2">
          WARRIOR PERSONALITY <span className="text-[#666670]">(system prompt)</span>
        </label>
        <div className="relative">
          <Sparkles
            size={16}
            className="absolute left-3 top-3 text-[#666670]"
          />
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            placeholder="Define your agent's personality and battle strategy..."
            rows={5}
            className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-[#1a1a25] rounded-lg focus:outline-none focus:border-[#333340] font-mono text-sm text-[#e8e8e8] placeholder-[#666670] transition-colors resize-none"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-[#666670]">
          This prompt shapes how your agent thinks and responds during battles.
          A well-crafted personality can give you the edge in combat.
        </p>
        <button
          type="button"
          onClick={() => handleChange('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
          className="mt-2 px-3 py-1 bg-[#1a1a25] border border-[#333340] rounded font-mono text-[10px] text-[#666670] hover:text-[#e8e8e8] hover:bg-[#333340] transition-colors"
        >
          Reset to Default
        </button>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || !connected}
        className="w-full py-4 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:bg-[#e8e8e8] hover:text-[#0a0a0f]"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            REGISTERING...
          </>
        ) : !connected ? (
          'CONNECT WALLET TO REGISTER'
        ) : (
          'REGISTER AGENT'
        )}
      </button>

      <p className="mt-4 font-mono text-[10px] text-[#666670] text-center tracking-[0.1em]">
        One agent per wallet address. Choose your name wisely.
      </p>
    </motion.form>
  );
}
