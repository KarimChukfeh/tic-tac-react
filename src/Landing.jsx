import { Link } from 'react-router-dom';

// Floating Particles Component
function FloatingParticles() {
  const particles = [
    { type: 'x', style: { top: '10%', left: '8%' }, symbol: '✕' },
    { type: 'o', style: { top: '15%', left: '75%' }, symbol: '○' },
    { type: 'chess', style: { top: '25%', left: '45%' }, symbol: '♔' },
    { type: 'ship', style: { top: '20%', right: '15%' }, symbol: '🚢' },
    { type: 'x', style: { top: '45%', left: '85%' }, symbol: '✕' },
    { type: 'o', style: { top: '50%', left: '12%' }, symbol: '○' },
    { type: 'chess', style: { top: '60%', right: '25%' }, symbol: '♟' },
    { type: 'ship', style: { top: '70%', left: '30%' }, symbol: '🚢' },
    { type: 'x', style: { top: '80%', right: '10%' }, symbol: '✕' },
    { type: 'o', style: { top: '85%', left: '60%' }, symbol: '○' },
    { type: 'chess', style: { bottom: '8%', left: '20%' }, symbol: '♔' },
    { type: 'ship', style: { bottom: '12%', right: '35%' }, symbol: '🚢' },
  ];

  const getColor = (type) => {
    switch (type) {
      case 'x': return '#06b6d4';
      case 'o': return '#a855f7';
      case 'chess': return '#3b82f6';
      case 'ship': return '#22c55e';
      default: return '#fff';
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[1]">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-25 animate-float"
          style={{ ...p.style, color: getColor(p.type), animationDelay: `-${i * 3}s` }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}

// Section Divider
function SectionDivider() {
  return (
    <div
      className="h-px my-1"
      style={{ background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)' }}
    />
  );
}

// RW3 Principle Card
function RW3Item({ icon, title, description }) {
  return (
    <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-5 text-center transition-all duration-300 hover:border-cyan-500/50 hover:-translate-y-1">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-sm font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

// Game Card Component
function GameCard({ icon, title, stakes, description, href, comingSoon = false }) {
  return (
    <div className={`bg-slate-900/80 border border-blue-500/20 rounded-2xl p-8 text-center transition-all duration-300 relative ${comingSoon ? 'opacity-60' : 'hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-[0_15px_40px_rgba(59,130,246,0.2)]'}`}>
      {comingSoon && (
        <span className="absolute top-4 right-4 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
          Coming Soon
        </span>
      )}
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-slate-100 mb-2">{title}</h3>
      <div className="text-sm text-cyan-400 mb-4">{stakes}</div>
      <p className="text-slate-400 text-base mb-6 leading-relaxed">{description}</p>
      {comingSoon ? (
        <button
          disabled
          className="w-full py-3 px-6 rounded-lg text-base font-semibold bg-slate-600/30 text-slate-500 cursor-not-allowed"
        >
          Coming Soon
        </button>
      ) : (
        <Link
          to={href}
          className="block w-full py-3 px-6 rounded-lg text-base font-semibold text-white transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.4)]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          Play Now
        </Link>
      )}
    </div>
  );
}

// What Card (For Gamers / For Developers)
function WhatCard({ type, label, title, description, items }) {
  const isGamer = type === 'gamer';
  const borderColor = isGamer ? 'border-t-cyan-400' : 'border-t-purple-400';
  const labelColor = isGamer ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div className={`bg-slate-900/60 border border-blue-500/20 rounded-2xl p-10 transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 border-t-[3px] ${borderColor}`}>
      <span className={`text-xs font-semibold uppercase tracking-wider mb-4 block ${labelColor}`}>{label}</span>
      <h3 className="text-2xl font-bold text-slate-100 mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
      <ul className="list-none">
        {items.map((item, i) => (
          <li key={i} className="text-slate-300 py-2 pl-6 relative before:content-['→'] before:absolute before:left-0 before:text-blue-500">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Developer Feature Tag
function DevFeature({ children }) {
  return (
    <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-full text-sm">
      {children}
    </span>
  );
}

// Trust Badge Component
function TrustBadge({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-blue-500/30 text-slate-400 px-4 py-2 rounded-md text-sm font-medium">
      <span className="text-cyan-400">{icon}</span> {text}
    </span>
  );
}

// Trust Divider
function TrustDivider() {
  return <span className="text-blue-500/30 text-xs">•</span>;
}

// Main Landing Component
export default function Landing() {
  return (
    <div className="min-h-screen text-slate-200 overflow-x-hidden" style={{ background: '#0a0e27' }}>
      <FloatingParticles />

      <div className="max-w-6xl mx-auto px-8 relative z-10">
        {/* Hero Section */}
        <section className="text-center py-24 min-h-[90vh] flex flex-col justify-center">
          {/* Brand Intro */}
          <p className="text-3xl md:text-4xl text-slate-500 mb-8 tracking-[4px] uppercase">
            <span
              className="font-bold bg-clip-text text-transparent"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}
            >
              ETour
            </span>{' '}
            is
          </p>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 text-slate-100">
            <span
              className="bg-clip-text text-transparent"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text' }}
            >
              Pure Competition.
            </span>
            <br />
            No Bullshit.
          </h1>

          {/* Trust Bar */}
          <div className="flex justify-center items-center gap-2 flex-wrap mt-6 mb-8">
            <TrustBadge icon="💎" text="ETH Only" />
            <TrustDivider />
            <TrustBadge icon="⛓️" text="Fully On-Chain" />
            <TrustDivider />
            <TrustBadge icon="🌱" text="Self-Sustaining" />
            <TrustDivider />
            <TrustBadge icon="⚖️" text="Fair Play" />
          </div>

          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Competitive gaming infrastructure that runs forever, needs no servers, 
            and doesn't try to sell you a token. Skill vs skill,<strong> real ETH on the line.</strong>
          </p>
          
          {/* Value Props Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <RW3Item icon="🎯" title="Skill Wins" description="No luck. No RNG." />
            <RW3Item icon="⚡" title="Instant Payouts" description="Win → Wallet. Done." />
            <RW3Item icon="🔒" title="Can't Cheat" description="Every move verified." />
            <RW3Item icon="🌍" title="Always Live" description="24/7. No downtime." />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-12 py-5 text-lg font-semibold rounded-xl text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(59,130,246,0.5)] inline-flex items-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' }}
              >
                ▶ Play Now
              </button>
              <button
                onClick={() => document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-12 py-5 text-lg font-semibold rounded-xl bg-transparent border-2 border-purple-500/50 text-purple-400 transition-all duration-300 hover:bg-purple-500/10 hover:border-purple-400 hover:-translate-y-1 inline-flex items-center gap-2 cursor-pointer"
              >
                {'{ }'} Build a Game
              </button>
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* What It Is Section */}
        <section className="py-16">
          <h2 className="text-center text-4xl font-bold text-slate-100 mb-4">One Protocol. Unlimited Potential.</h2>
          <p className="text-center text-slate-400 text-lg max-w-2xl mx-auto mb-12">
            ETour is built for <strong>creators</strong>.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <WhatCard
              type="gamer"
              label="For Gamers"
              title="Play for Real Stakes"
              description="Join perpetual tournaments where your skill determines your earnings. No accounts, no sign-ups. Just connect your wallet and compete."
              items={[
                'Instant matchmaking across multiple stake tiers',
                'Provably fair—impossible to cheat or manipulate',
                'Winnings sent directly to your wallet',
                'Play from anywhere, anytime'
              ]}
            />
            <WhatCard
              type="dev"
              label="For Developers"
              title="Build Without Limits"
              description="Drop-in tournament infrastructure for any competitive game. Focus on your game logic. ETour handles matchmaking, stakes, and payouts."
              items={[
                'Implement 2 functions, get a full tournament system',
                'Supports 2-128 player brackets',
                'Built-in timeout and anti-stalling mechanics',
                'No backend required—runs entirely on-chain'
              ]}
            />
          </div>
        </section>

        <SectionDivider />

        {/* Games Section */}
        <section className="py-16" id="games">
          <h2 className="text-center text-4xl font-bold text-slate-100 mb-2">Live Games</h2>
          <p className="text-center text-slate-400 mb-12">Built on ETour Protocol • Real ETH • Real Competition</p>

          <div className="grid md:grid-cols-3 gap-6">
            <GameCard
              icon="⭕"
              title="Eternal TicTacToe"
              stakes="0.001 - 0.1 ETH"
              description="The classic game with real stakes. Perfect for learning the ropes."
              href="/tictactoe"
            />
            <GameCard
              icon="♔"
              title="ChessOnChain"
              stakes="0.01 - 1 ETH"
              description="Full chess rules verified on-chain. Castling, en passant, awll of it."
              href="/chess"
            />
            <GameCard
              icon="🚢"
              title="Battleship"
              stakes="High Stakes"
              description="Strategic naval warfare with hidden information. Commitment-reveal mechanics."
              comingSoon
            />
          </div>
        </section>

        <SectionDivider />

        {/* Developer Section */}
        <section className="py-16" id="build">
          <div className="bg-slate-900/60 border border-purple-500/30 rounded-3xl p-12 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">Ship Your Game in Hours, Not Months</h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                ETour handles the hard parts: matchmaking, stake management,
                timeout escalation, bracket advancement, and payout distribution.
                You just define what a valid move looks like and how to determine a winner.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <DevFeature>Solidity Interface</DevFeature>
                <DevFeature>MIT Licensed</DevFeature>
                <DevFeature>Gas Optimized</DevFeature>
                <DevFeature>Fully Documented</DevFeature>
                <DevFeature>Test Suite Included</DevFeature>
              </div>

              <div className="flex gap-4">
                <a
                  href="https://github.com"
                  className="bg-slate-100 text-slate-900 px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-all duration-300 hover:bg-white"
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="#"
                  className="bg-transparent border border-purple-500/50 text-purple-400 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:bg-purple-500/10"
                >
                  Documentation →
                </a>
              </div>
            </div>

            <div
              className="bg-black/50 border border-purple-500/30 rounded-xl p-6 font-mono text-sm text-slate-300 overflow-x-auto"
            >
              <span className="text-slate-500">// Your entire integration</span><br /><br />
              <span className="text-purple-400">contract</span> <span className="text-cyan-400">YourGame</span> <span className="text-purple-400">is</span> IETourGame {'{'}<br /><br />
              &nbsp;&nbsp;<span className="text-purple-400">function</span> <span className="text-cyan-400">validateMove</span>(<br />
              &nbsp;&nbsp;&nbsp;&nbsp;bytes <span className="text-purple-400">memory</span> moveData<br />
              &nbsp;&nbsp;) <span className="text-purple-400">external view returns</span> (bool) {'{'}<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Your game rules here</span><br />
              &nbsp;&nbsp;{'}'}<br /><br />
              &nbsp;&nbsp;<span className="text-purple-400">function</span> <span className="text-cyan-400">checkWinner</span>(<br />
              &nbsp;&nbsp;&nbsp;&nbsp;GameState <span className="text-purple-400">memory</span> state<br />
              &nbsp;&nbsp;) <span className="text-purple-400">external view returns</span> (address) {'{'}<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Your win condition here</span><br />
              &nbsp;&nbsp;{'}'}<br />
              {'}'}
            </div>
          </div>
        </section>

        <SectionDivider />

        {/* Manifesto Section */}
        <section className="py-16 text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">Built on Principles</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">
            ETour is part of the Reclaim Web3 movement—a return to what
            blockchain was supposed to be before the speculation took over.
          </p>
          <a
            href="https://reclaimweb3.com"
            className="text-cyan-400 font-semibold inline-flex items-center gap-2 transition-all duration-300 hover:text-blue-400"
          >
            Read the RW3 Manifesto →
          </a>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center py-12 border-t border-blue-500/20 mt-16">
        <p className="text-slate-500">
          <span className="text-slate-400 font-semibold">ETour Protocol</span> • Built on Arbitrum One • Open Source • Reclaim Web3
        </p>
        <p className="mt-3 text-sm text-slate-600">© 2025 ETour Protocol. MIT License.</p>
      </footer>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(50px, -50px) rotate(90deg); }
          50% { transform: translate(-30px, -100px) rotate(180deg); }
          75% { transform: translate(-80px, -50px) rotate(270deg); }
        }
        .animate-float {
          animation: float 20s infinite;
        }
      `}</style>
    </div>
  );
}
