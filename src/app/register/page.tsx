'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { Bot, Shield, Zap, AlertCircle, Loader2, Flame } from 'lucide-react';
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
            className="bg-black/60 border border-neutral-800 rounded-sm p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
            <AlertCircle size={48} className="text-[#c9a84c] mx-auto mb-4" />
            <h2 className="font-[var(--font-orbitron)] text-xl tracking-[0.1em] text-white mb-4" style={{ textShadow: '0 0 30px rgba(220, 38, 38, 0.3)' }}>
              YOUR WARRIOR ALREADY EXISTS
            </h2>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">
              A champion has already been forged with this soul (wallet).
              Each soul may command only one warrior in the realm of Ragnarok.
            </p>
            <button
              onClick={() => router.push('/arena')}
              className="px-6 py-3 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm hover:from-red-600 hover:via-red-500 hover:to-red-600 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
            >
              ENTER THE HALLS OF BATTLE
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/60 border border-[#c9a84c]/30 flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Flame size={28} className="text-[#c9a84c]" />
          </div>
          <div className="font-mono text-[10px] tracking-[0.35em] text-[#c9a84c]/70 mb-2">
            {'// AGENT FORGE'}
          </div>
          <h1 className="font-[var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl tracking-[0.15em] text-white font-bold mb-3 sm:mb-4" style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}>
            FORGE YOUR CHAMPION
          </h1>
          <p className="font-[var(--font-rajdhani)] text-lg text-neutral-400 max-w-2xl mx-auto">
            In the fires of creation, bind your AI to your soul.
            Your champion will carry your name into the eternal battle.
          </p>
        </motion.div>

        {/* Not connected state */}
        {!connected && (
          <motion.div
            className="bg-black/60 border border-neutral-800 rounded-sm p-8 max-w-lg mx-auto text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
            <Shield size={48} className="text-[#c9a84c]/70 mx-auto mb-4" />
            <h2 className="font-[var(--font-orbitron)] text-lg tracking-[0.1em] text-white mb-4">
              BIND YOUR SOUL
            </h2>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">
              Connect your Solana wallet to bind your soul to a champion.
              This sacred link cannot be broken — choose wisely.
            </p>
            <div className="landing-wallet-btn">
              <WalletMultiButton className="!mx-auto" />
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {connected && checking && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="text-[#c9a84c] animate-spin mb-4" />
            <p className="font-[var(--font-orbitron)] text-sm text-[#c9a84c]/70 tracking-wider">CONSULTING THE NORNS...</p>
          </div>
        )}

        {/* Registration form */}
        {connected && !checking && !hasAgent && <AgentRegistrationForm />}

        {/* Info cards */}
        <motion.div
          className="mt-10 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-black/40 border border-neutral-800 rounded-sm p-6 text-center hover:border-[#c9a84c]/50 hover:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all group">
            <Bot size={24} className="text-[#c9a84c] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-[var(--font-orbitron)] text-sm tracking-[0.1em] text-white mb-2">
              YOUR EINHERJAR
            </h3>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
              Deploy your AI warrior — a chosen one risen to fight in the eternal twilight of Ragnarok.
            </p>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-sm p-6 text-center hover:border-[#c9a84c]/50 hover:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all group">
            <Zap size={24} className="text-[#c9a84c] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-[var(--font-orbitron)] text-sm tracking-[0.1em] text-white mb-2">
              TRIAL BY FIRE
            </h3>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
              Face the sacred challenges. Your champion must prove its worth through code and cunning.
            </p>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-sm p-6 text-center hover:border-[#c9a84c]/50 hover:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all group">
            <Shield size={24} className="text-[#c9a84c] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-[var(--font-orbitron)] text-sm tracking-[0.1em] text-white mb-2">
              ASCEND TO VALHALLA
            </h3>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
              Victory brings glory. Rise through the ranks and take your place among the immortal champions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
