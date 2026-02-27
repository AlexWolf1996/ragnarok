'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bot, Search } from 'lucide-react';
import { Tables } from '@/lib/supabase/types';

type Agent = Tables<'agents'>;

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent | null) => void;
  placeholder?: string;
  excludeAgentId?: string;
  disabled?: boolean;
}

export default function AgentSelector({
  agents,
  selectedAgent,
  onSelect,
  placeholder = 'Select Agent',
  excludeAgentId,
  disabled = false,
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAgents = agents.filter((agent) => {
    if (excludeAgentId && agent.id === excludeAgentId) return false;
    if (searchTerm) {
      return agent.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border transition-all ${
          disabled
            ? 'bg-[#111118] border-[#1a1a25] cursor-not-allowed opacity-50'
            : isOpen
            ? 'bg-[#111118] border-[#e8e8e8]'
            : 'bg-[#111118] border-[#1a1a25] hover:border-[#333340]'
        }`}
      >
        <div className="flex items-center gap-3">
          {selectedAgent ? (
            <>
              {selectedAgent.avatar_url ? (
                <img
                  src={selectedAgent.avatar_url}
                  alt={selectedAgent.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1a1a25] flex items-center justify-center">
                  <Bot size={16} className="text-[#666670]" />
                </div>
              )}
              <div className="text-left">
                <p className="font-mono text-sm text-[#e8e8e8]">{selectedAgent.name}</p>
                <p className="text-[10px] font-mono text-[#666670]">ELO: {selectedAgent.elo_rating}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-[#1a1a25] flex items-center justify-center">
                <Bot size={16} className="text-[#666670]" />
              </div>
              <span className="font-mono text-sm text-[#666670]">{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-[#666670] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[100] w-full mt-2 bg-[#111118] border border-[#1a1a25] rounded-lg shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-[#1a1a25]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666670]" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0a0f] border border-[#1a1a25] rounded font-mono text-sm text-[#e8e8e8] placeholder-[#666670] focus:outline-none focus:border-[#333340]"
                />
              </div>
            </div>

            {/* Agent list */}
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
              {filteredAgents.length === 0 ? (
                <div className="p-4 text-center font-mono text-sm text-[#666670]">
                  No agents found
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      onSelect(agent);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a25] transition-colors ${
                      selectedAgent?.id === agent.id ? 'bg-[#1a1a25]' : ''
                    }`}
                  >
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1a1a25] flex items-center justify-center">
                        <Bot size={16} className="text-[#666670]" />
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm text-[#e8e8e8] truncate">{agent.name}</p>
                        {/* Win rate bar */}
                        {agent.matches_played > 0 && (
                          <div className="flex-shrink-0 w-12 h-1.5 bg-red-500/30 rounded-full overflow-hidden" title={`${Math.round((agent.wins / agent.matches_played) * 100)}% win rate`}>
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(agent.wins / agent.matches_played) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-[#666670]">
                        ELO: {agent.elo_rating} | {agent.wins}W-{agent.losses}L
                        {agent.matches_played > 0 && ` (${Math.round((agent.wins / agent.matches_played) * 100)}%)`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
