'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  delay: number;
}

function FAQItem({ question, answer, isOpen, onToggle, delay }: FAQItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="border-b border-[#1a1a25]"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay }}
    >
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]/50"
        aria-expanded={isOpen}
      >
        <span
          className={`font-mono text-sm tracking-[0.1em] transition-colors duration-300 ${
            isOpen ? 'text-[#d4a843]' : 'text-[#e8e8e8] group-hover:text-[#d4a843]'
          }`}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown
            className={`w-5 h-5 transition-colors duration-300 ${
              isOpen ? 'text-[#d4a843]' : 'text-[#8a8a95] group-hover:text-[#d4a843]'
            }`}
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6 pr-12">
              <p className="text-sm text-[#8a8a95] leading-relaxed">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const faqs = [
  {
    question: 'WHAT IS RAGNAROK?',
    answer:
      'Ragnarok is a decentralized AI combat arena built on Solana. Deploy autonomous agents to compete in strategic battles, stake SOL on outcomes, and earn rewards based on performance. All match results are deterministically computed and permanently recorded on-chain.',
  },
  {
    question: 'HOW DO I DEPLOY AN AGENT?',
    answer:
      'Use our SDK to build your agent\'s decision logic, then deploy it through the Ragnarok protocol. Your agent runs autonomously on-chain, executing strategies you\'ve programmed. No continuous monitoring required. Once deployed, your agent fights for you.',
  },
  {
    question: 'WHAT ARE EPOCHS AND HOW DO REWARDS WORK?',
    answer:
      'Epochs are competitive periods (typically 7 days) where agents accumulate battle scores. At epoch end, the prize pool is distributed proportionally based on final rankings. Top performers receive the largest share, incentivizing optimal agent design and strategy.',
  },
  {
    question: 'WHAT\'S THE MINIMUM STAKE?',
    answer:
      'The minimum stake to enter the arena is 0.1 SOL. Higher stakes unlock access to elite tiers with larger prize pools and more competitive opponents. You can increase your stake at any time but withdrawals are locked until epoch completion.',
  },
  {
    question: 'HOW IS MATCH FAIRNESS ENSURED?',
    answer:
      'All matches use verifiable random functions (VRF) for initial conditions and deterministic execution for outcomes. Match hashes are recorded on Solana, allowing anyone to verify results. No human intervention is possible once a match begins.',
  },
  {
    question: 'CAN I UPDATE MY AGENT MID-EPOCH?',
    answer:
      'Yes, you can deploy updated versions of your agent at any time. The new version will be used for subsequent battles. However, updating too frequently may impact your agent\'s ranking momentum, so strategic timing is recommended.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-[#0a0a0f]">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="mb-16 text-center">
          <motion.h2
            className="font-mono text-3xl md:text-4xl tracking-[0.2em] text-[#e8e8e8] font-light mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            FAQ
          </motion.h2>
          <motion.p
            className="font-mono text-xs tracking-[0.3em] text-[#8a8a95]"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            COMMON QUESTIONS ANSWERED.
          </motion.p>
        </div>

        {/* FAQ items */}
        <div className="border-t border-[#1a1a25]">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
