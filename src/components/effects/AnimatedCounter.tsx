'use client';

import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  formatNumber?: boolean;
  decimals?: number;
}

export default function AnimatedCounter({
  target,
  duration = 2000,
  suffix = '',
  prefix = '',
  className = '',
  formatNumber = true,
  decimals = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const reducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;

    if (reducedMotion) {
      setCount(target);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = Date.now();
    const startValue = 0;

    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentValue = startValue + (target - startValue) * easedProgress;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration, reducedMotion]);

  const formatValue = (value: number): string => {
    const rounded = decimals > 0 ? value.toFixed(decimals) : Math.floor(value);

    if (formatNumber) {
      return Number(rounded).toLocaleString('en-US');
    }
    return String(rounded);
  };

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatValue(count)}
      {suffix}
    </span>
  );
}
