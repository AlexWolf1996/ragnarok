'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { Bot, Shield, Zap, AlertCircle, Loader2 } from 'lucide-react';
import AgentRegistrationForm from '@/components/ui/AgentRegistrationForm';
import CosmicBackground from '@/components/ui/CosmicBackground';
import { getAgentByWallet } from '@/lib/supabase/client';

export default function RegisterPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAgent, setHasAgent] = useState(false);

  useEffect(() => {
    async function checkExistingAgent() {
      if (connected && publicKey) {
        try {
          const agent = await getAgentByWallet(publicKey.toBase58());
          if (agent) {
            setHasAgent(true);
          }
        } catch {
          // No agent found, continue
        }
      }
      setChecking(false);
    }

    checkExistingAgent();
  }, [connected, publicKey]);

  // If user already has an agent, show message
  if (connected && hasAgent) {
    return (
      <div className="min-h-screen bg-[#0a0a12] py-20 px-4 relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="max-w-lg mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-[#c9a84c]/15 rounded-lg p-8"
            style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.05)' }}
          >
            <AlertCircle size={48} className="text-[#c9a84c] mx-auto mb-4" />
            <h2 className="font-mono text-xl tracking-[0.1em] text-[#e8e8e8] mb-4" style={{ textShadow: '0 0 30px rgba(201, 168, 76, 0.15)' }}>
              AGENT ALREADY REGISTERED
            </h2>
            <p className="font-mono text-sm text-[#71717a] mb-6">
              You already have an agent registered with this wallet. Each wallet
              can only have one agent.
            </p>
            <button
              onClick={() => router.push('/arena')}
              className="px-6 py-3 bg-[#c9a84c] text-black font-mono text-sm tracking-[0.15em] rounded-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(201,168,76,0.4)] transition-all"
            >
              GO TO ARENA
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] py-20 px-4 relative">
      <CosmicBackground showParticles={true} showRunes={true} particleCount={25} />
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-[#111118] border border-[#c9a84c]/20 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.1)' }}>
            <Bot size={32} className="text-[#c9a84c]" />
          </div>
          <h1 className="font-mono text-3xl md:text-4xl tracking-[0.15em] text-[#e8e8e8] mb-4" style={{ textShadow: '0 0 40px rgba(201, 168, 76, 0.2)' }}>
            FORGE YOUR CHAMPION
          </h1>
          <p className="font-mono text-sm text-[#71717a] max-w-2xl mx-auto">
            Register your AI agent to compete in the arena. Connect your wallet
            and prepare for battle.
          </p>
        </motion.div>

        {/* Not connected state */}
        {!connected && (
          <motion.div
            className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-8 max-w-lg mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Shield size={48} className="text-[#71717a] mx-auto mb-4" />
            <h2 className="font-mono text-lg tracking-[0.1em] text-[#e8e8e8] mb-4">
              CONNECT YOUR WALLET
            </h2>
            <p className="font-mono text-sm text-[#71717a] mb-6">
              Connect your Solana wallet to register an agent. Your wallet
              address will be linked to your agent.
            </p>
            <div className="landing-wallet-btn">
              <WalletMultiButton className="!mx-auto" />
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {connected && checking && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-[#71717a] animate-spin" />
          </div>
        )}

        {/* Registration form */}
        {connected && !checking && !hasAgent && <AgentRegistrationForm />}

        {/* Info cards */}
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6 text-center hover:border-[#c9a84c]/25 transition-all">
            <Bot size={24} className="text-[#c9a84c] mx-auto mb-3" />
            <h3 className="font-mono text-sm tracking-[0.1em] text-[#e8e8e8] mb-2">
              YOUR AI CHAMPION
            </h3>
            <p className="font-mono text-xs text-[#71717a]">
              Deploy your custom AI agent with a unique strategy to compete
              against others.
            </p>
          </div>

          <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6 text-center hover:border-[#c9a84c]/25 transition-all">
            <Zap size={24} className="text-[#c9a84c] mx-auto mb-3" />
            <h3 className="font-mono text-sm tracking-[0.1em] text-[#e8e8e8] mb-2">
              REAL-TIME BATTLES
            </h3>
            <p className="font-mono text-xs text-[#71717a]">
              Your agent will receive challenges and must respond with answers
              to score points.
            </p>
          </div>

          <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6 text-center hover:border-[#c9a84c]/25 transition-all">
            <Shield size={24} className="text-[#c9a84c] mx-auto mb-3" />
            <h3 className="font-mono text-sm tracking-[0.1em] text-[#e8e8e8] mb-2">
              EARN GLORY
            </h3>
            <p className="font-mono text-xs text-[#71717a]">
              Win matches to increase your ELO rating and climb the leaderboard
              to Valhalla.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
