/**
 * Shared ParticleBackground Component
 *
 * Renders floating particles/symbols as a background decoration.
 * Used across TicTacToe, Chess, and ConnectFour games.
 */

import { useState, useEffect, useMemo } from 'react';

/**
 * @param {Object} props
 * @param {string[]} props.colors - Array of two color strings for particles
 * @param {string[]} props.symbols - Array of symbols to display as particles
 * @param {string} [props.fontSize] - Optional font size (default: undefined, uses inherited)
 */
const ParticleBackground = ({ colors, symbols, fontSize }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const particles = useMemo(() => {
    const particleCount = isMobile ? 15 : 35;
    return Array.from({ length: particleCount }, (_, i) => {
      const useFirstColor = Math.random() > 0.5;
      const symbolIndex = Math.floor(Math.random() * symbols.length);
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 20 + Math.random() * 20,
        colorIndex: useFirstColor ? 0 : 1,
        symbol: symbols[symbolIndex]
      };
    });
  }, [isMobile, symbols]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map((p) => {
        const color = colors[p.colorIndex];
        return (
          <div
            key={p.id}
            className="particle"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              transform: 'translateY(100vh)',
              animation: `particle-float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              willChange: 'transform, opacity',
              color: color,
              fontWeight: 'bold',
              textShadow: `0 0 8px ${color}`,
              ...(fontSize && { fontSize })
            }}
          >
            {p.symbol}
          </div>
        );
      })}
    </div>
  );
};

export default ParticleBackground;
