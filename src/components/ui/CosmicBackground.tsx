'use client';

import { useEffect, useRef } from 'react';

// Floating Norse runes at 3% opacity
function FloatingRunes() {
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {runes.map((rune, i) => (
        <span
          key={i}
          className="absolute text-4xl md:text-6xl text-white/[0.03] animate-rune-float select-none"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            top: `${15 + (i * 13) % 70}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${15 + i * 2}s`,
          }}
        >
          {rune}
        </span>
      ))}
    </div>
  );
}

// Subtle gold ember particles
function EmberParticles({ particleCount = 25 }: { particleCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    opacity: number;
    flickerSpeed: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(particleCount * 0.4) : particleCount;

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      size: 1.5 + Math.random() * 1.5,
      speedY: 0.2 + Math.random() * 0.4,
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: 0.2 + Math.random() * 0.3,
      flickerSpeed: 0.01 + Math.random() * 0.02,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speedY;
        particle.x += particle.speedX + Math.sin(time + particle.y * 0.01) * 0.1;

        const flicker = Math.sin(time * particle.flickerSpeed * 100) * 0.15;
        const currentOpacity = Math.max(0.05, Math.min(0.5, particle.opacity + flicker));

        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }

        // Gold/warm colors only
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, `rgba(201, 168, 76, ${currentOpacity})`);
        gradient.addColorStop(0.5, `rgba(180, 140, 50, ${currentOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(150, 120, 40, 0)`);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

interface CosmicBackgroundProps {
  showParticles?: boolean;
  showRunes?: boolean;
  particleCount?: number;
}

export default function CosmicBackground({
  showParticles = true,
  showRunes = true,
  particleCount = 25,
}: CosmicBackgroundProps) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Cosmic gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 30%, #0f0a08 70%, #0a0a12 100%)',
        }}
      />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(201, 168, 76, 0.03) 0%, transparent 50%)',
        }}
      />

      {/* Floating runes */}
      {showRunes && <FloatingRunes />}

      {/* Ember particles */}
      {showParticles && <EmberParticles particleCount={particleCount} />}
    </div>
  );
}
