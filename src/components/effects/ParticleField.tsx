'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
}

interface ParticleFieldProps {
  className?: string;
  particleCount?: number;
  mobileParticleCount?: number;
  colors?: string[];
}

// Pre-parse hex colors to RGB values for performance
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  return { r: 200, g: 100, b: 50 }; // Fallback warm color
}

export default function ParticleField({
  className = '',
  particleCount = 40,
  mobileParticleCount = 15,
  colors = ['#c41e3a', '#e8590c', '#ffa500', '#d4a843'],
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  // Pre-parse colors once
  const parsedColors = useRef(colors.map(hexToRgb));

  const isMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  const initParticles = useCallback((width: number, height: number) => {
    const count = isMobile() ? mobileParticleCount : particleCount;
    const particles: Particle[] = [];
    const colorOptions = parsedColors.current;

    for (let i = 0; i < count; i++) {
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      particles.push({
        x: Math.random() * width,
        y: height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.8 + 0.3),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        r: color.r,
        g: color.g,
        b: color.b,
      });
    }

    particlesRef.current = particles;
  }, [isMobile, mobileParticleCount, particleCount]);

  const isVisibleRef = useRef(isVisible);
  const animateFnRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  const animate = useCallback(() => {
    if (!isVisibleRef.current) {
      animationRef.current = requestAnimationFrame(() => animateFnRef.current?.());
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const edgeDistance = 100;

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Add slight wavering motion
      particle.vx += (Math.random() - 0.5) * 0.02;
      particle.vx = Math.max(-0.5, Math.min(0.5, particle.vx));

      // Reset particle if off screen
      if (particle.y < -10) {
        particle.y = height + Math.random() * 50;
        particle.x = Math.random() * width;
        particle.alpha = Math.random() * 0.5 + 0.2;
      }

      // Calculate edge fade
      let edgeFade = 1;

      if (particle.x < edgeDistance) {
        edgeFade = particle.x / edgeDistance;
      } else if (particle.x > width - edgeDistance) {
        edgeFade = (width - particle.x) / edgeDistance;
      }

      if (particle.y < edgeDistance) {
        edgeFade *= particle.y / edgeDistance;
      } else if (particle.y > height - edgeDistance) {
        edgeFade *= (height - particle.y) / edgeDistance;
      }

      const alpha = particle.alpha * Math.max(0, edgeFade);

      // Draw outer glow
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${alpha * 0.15})`;
      ctx.fill();

      // Draw core particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${alpha})`;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(() => animateFnRef.current?.());
  }, []);

  useEffect(() => {
    animateFnRef.current = animate;
  }, [animate]);

  // Intersection Observer to pause animation when off-screen
  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [reducedMotion]);

  // Handle resize and initialization
  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles(canvas.width, canvas.height);
    };

    // Use ResizeObserver for more accurate resize handling
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    handleResize();
    animate();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, initParticles, reducedMotion]);

  if (reducedMotion) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ mixBlendMode: 'screen' }}
      aria-hidden="true"
    />
  );
}
