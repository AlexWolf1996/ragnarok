'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type CommentaryColor = 'amber' | 'cyan' | 'red' | 'emerald' | 'purple';

interface CommentaryLine {
  icon: string;
  label: string;
  text: string;
  color: CommentaryColor;
}

interface MatchCommentaryProps {
  matchData: {
    agentA: { name: string; elo_rating: number };
    agentB: { name: string; elo_rating: number };
    challenge: { name: string; type: string; difficulty_level: string };
    score_a: number;
    score_b: number;
    winner_id: string | null;
    winnerName: string;
  } | null;
  isVisible: boolean;
  onDismiss: () => void;
}

// Color mapping for Tailwind classes
const colorClasses: Record<CommentaryColor, { border: string; text: string }> = {
  amber: {
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  cyan: {
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
  red: {
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  emerald: {
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  purple: {
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
};

// Validate color is a valid key
function getColorClasses(color: string): { border: string; text: string } {
  if (color in colorClasses) {
    return colorClasses[color as CommentaryColor];
  }
  return colorClasses.amber;
}

// TypingText component - renders text character by character
function TypingText({
  text,
  speed = 14,
  onComplete,
  skipAnimation = false,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    if (skipAnimation) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }

      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, onComplete, skipAnimation]);

  return (
    <span className="text-sm text-gray-200">
      {displayedText}
      {!isComplete && !skipAnimation && (
        <span className="animate-pulse text-gray-400" aria-hidden="true">▊</span>
      )}
    </span>
  );
}

// CommentaryLine component - displays a single line of commentary
function CommentaryLineItem({
  line,
  onComplete,
  shouldStart,
  skipAnimation = false,
}: {
  line: CommentaryLine;
  onComplete?: () => void;
  shouldStart: boolean;
  skipAnimation?: boolean;
}) {
  const colors = getColorClasses(line.color);

  if (!shouldStart) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`border-l-2 ${colors.border} pl-3 py-1 mb-3`}
      role="listitem"
    >
      <div className={`flex items-center gap-2 ${colors.text} text-xs font-bold uppercase tracking-wide mb-1`}>
        <span aria-hidden="true">{line.icon}</span>
        <span>{line.label}</span>
      </div>
      <TypingText text={line.text} onComplete={onComplete} skipAnimation={skipAnimation} />
    </motion.div>
  );
}

export default function MatchCommentary({
  matchData,
  isVisible,
  onDismiss,
}: MatchCommentaryProps) {
  const [lines, setLines] = useState<CommentaryLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCommentary = useCallback(async () => {
    if (!matchData) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLines([]);
    setCurrentLineIndex(0);
    setIsAllComplete(false);

    try {
      const response = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch commentary');
      }

      const data = await response.json();

      // Validate response structure
      if (Array.isArray(data.lines)) {
        setLines(data.lines);

        // If reduced motion, show all lines immediately
        if (reducedMotion) {
          setCurrentLineIndex(data.lines.length);
          setIsAllComplete(true);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Don't log abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // API failed - use fallback commentary

      // Generate fallback commentary client-side if API fails
      const fallbackLines: CommentaryLine[] = [
        {
          icon: '»',
          label: 'MATCH BEGINS',
          text: `${matchData.agentA.name} and ${matchData.agentB.name} enter the arena. The crowd roars across the nine realms.`,
          color: 'amber',
        },
        {
          icon: '◎',
          label: 'CHALLENGE REVEALED',
          text: `The Norns present: ${matchData.challenge.name}. A ${matchData.challenge.difficulty_level} trial awaits.`,
          color: 'cyan',
        },
        {
          icon: '▸',
          label: 'FIRST STRIKE',
          text: `${matchData.agentA.name} scores ${matchData.score_a} points. ${matchData.score_a > 70 ? 'Devastating precision!' : 'A solid attempt.'}`,
          color: 'purple',
        },
        {
          icon: '◆',
          label: 'COUNTER ATTACK',
          text: `${matchData.agentB.name} fires back with ${matchData.score_b} points. ${matchData.score_b > matchData.score_a ? 'The tide turns!' : 'Not enough!'}`,
          color: 'red',
        },
        {
          icon: '✦',
          label: 'VERDICT',
          text: `${matchData.winnerName} claims victory! ${Math.abs(matchData.score_a - matchData.score_b) > 40 ? 'Worthy of Valhalla.' : 'A battle that shook Yggdrasil.'}`,
          color: 'emerald',
        },
      ];

      setLines(fallbackLines);

      // If reduced motion, show all lines immediately
      if (reducedMotion) {
        setCurrentLineIndex(fallbackLines.length);
        setIsAllComplete(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [matchData, reducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch commentary when visible and matchData changes
  useEffect(() => {
    if (isVisible && matchData) {
      fetchCommentary();
    }
  }, [isVisible, matchData, fetchCommentary]);

  // Auto-scroll to bottom as new lines appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentLineIndex]);

  const handleLineComplete = useCallback(() => {
    const timeoutId = setTimeout(() => {
      setCurrentLineIndex((prev) => {
        const next = prev + 1;
        if (next >= lines.length) {
          setIsAllComplete(true);
        }
        return next;
      });
    }, reducedMotion ? 0 : 400);

    return () => clearTimeout(timeoutId);
  }, [lines.length, reducedMotion]);

  if (!isVisible || !matchData) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
        animate={{ opacity: 1, maxHeight: 500, marginBottom: 16 }}
        exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeOut' }}
        className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 overflow-hidden"
        role="region"
        aria-label="Match commentary"
      >
        {/* Runes decoration */}
        <div className="text-amber-500/40 text-xs mb-1 font-mono" aria-hidden="true">
          ᚺᛖᛁᛗᛞᚨᛚᛚ
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold text-gray-400 tracking-wider">
              HEIMDALL&apos;S SIGHT
            </span>
          </div>
          {isAllComplete && (
            <button
              onClick={onDismiss}
              className="text-gray-600 hover:text-gray-400 transition-colors p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Dismiss"
              aria-label="Dismiss commentary"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Commentary lines */}
        <div
          ref={containerRef}
          className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          role="list"
          aria-label="Commentary lines"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm" role="status" aria-live="polite">
              <span className="animate-spin" aria-hidden="true">⏳</span>
              <span>Heimdall gazes upon the battlefield...</span>
            </div>
          ) : (
            lines.map((line, index) => (
              <CommentaryLineItem
                key={index}
                line={line}
                shouldStart={index <= currentLineIndex}
                onComplete={index === currentLineIndex ? handleLineComplete : undefined}
                skipAnimation={reducedMotion}
              />
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
