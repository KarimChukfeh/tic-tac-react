import { Link } from 'react-router-dom';

// Floating Game Particles
function FloatingParticles() {
  const particles = [
    { symbol: '✕', color: '#06b6d4', style: { top: '8%', left: '5%' } },
    { symbol: '○', color: '#a855f7', style: { top: '12%', right: '8%' } },
    { symbol: '♔', color: '#fbbf24', style: { top: '25%', left: '12%' } },
    { symbol: '🔴', color: '#ef4444', style: { top: '18%', right: '20%' } },
    { symbol: '♟', color: '#fbbf24', style: { top: '45%', right: '5%' } },
    { symbol: '○', color: '#a855f7', style: { top: '55%', left: '8%' } },
    { symbol: '🔵', color: '#3b82f6', style: { top: '65%', right: '12%' } },
    { symbol: '✕', color: '#06b6d4', style: { top: '75%', left: '15%' } },
    { symbol: '♔', color: '#fbbf24', style: { bottom: '15%', right: '8%' } },
    { symbol: '🔴', color: '#ef4444', style: { bottom: '8%', left: '25%' } },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute text-3xl opacity-20 animate-float"
          style={{ ...p.style, color: p.color, animationDelay: `${i * -2.5}s` }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}

// Game Card - The Star of the Show
function GameCard({ icon, title, stakes, tagline, features, href, accentColor }) {
  return (
    <div 
      className="group relative bg-slate-900/90 border-2 rounded-2xl p-8 transition-all duration-500 hover:-translate-y-3"
      style={{ 
        borderColor: `${accentColor}30`,
        boxShadow: `0 0 0 0 ${accentColor}00`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}80`;
        e.currentTarget.style.boxShadow = `0 20px 60px ${accentColor}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}30`;
        e.currentTarget.style.boxShadow = `0 0 0 0 ${accentColor}00`;
      }}
    >
      {/* Icon */}
      <div className="text-7xl mb-6 transition-transform duration-500 group-hover:scale-110">
        {icon}
      </div>
      
      {/* Title & Stakes */}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <div 
        className="text-sm font-semibold mb-4 tracking-wide"
        style={{ color: accentColor }}
      >
        {stakes}
      </div>
      
      {/* Tagline */}
      <p className="text-slate-400 text-lg mb-6 leading-relaxed">{tagline}</p>
      
      {/* Features */}
      <ul className="space-y-2 mb-8">
        {features.map((f, i) => (
          <li key={i} className="text-slate-500 text-sm flex items-center gap-2">
            <span style={{ color: accentColor }}>✓</span> {f}
          </li>
        ))}
      </ul>
      
      {/* CTA */}
      <Link
        to={href}
        className="block w-full py-4 rounded-xl text-center font-bold text-white text-lg transition-all duration-300 hover:scale-[1.02]"
        style={{ 
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          boxShadow: `0 4px 20px ${accentColor}40`
        }}
      >
        Play Now
      </Link>
    </div>
  );
}

// Trust Signal
function TrustSignal({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span className="text-cyan-400">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// Main Landing Component
export default function Landing() {
  return (
    <div 
      className="min-h-screen text-white overflow-x-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #030712 0%, #0a1628 50%, #030712 100%)'
      }}
    >
      <FloatingParticles />
      
      <div className="relative z-10">
        
        {/* ============ HERO SECTION ============ */}
        <section className="min-h-screen flex flex-col justify-center items-center px-6 py-20">
          
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-cyan-400 text-sm font-semibold tracking-widest uppercase">
              Live On Chain
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[1.1] mb-8 py-2">
            <span className="block text-white pb-1">Win ETH</span>
            <span
              className="block bg-clip-text text-transparent py-1"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text' }}
            >
              Playing Games
            </span>
            <span className="block text-white pt-1">You Already Know.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-400 text-center max-w-2xl mb-12 leading-relaxed">
            Classic strategy games. Real stakes. No tokens, no tricks.
            <br />
            <span className="text-white font-semibold">Just skill vs. skill.</span>
          </p>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <TrustSignal icon="🔒" text="Every move verified on-chain" />
            <TrustSignal icon="⚡" text="Instant ETH payouts to your wallet" />
            <TrustSignal icon="🎯" text="No RNG, pure skill" />
          </div>
          
          {/* CTA */}
          <button
            onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-12 py-5 rounded-2xl font-bold text-xl text-white transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              boxShadow: '0 8px 40px rgba(6, 182, 212, 0.4)'
            }}
          >
            <span className="flex items-center gap-3">
              Choose Your Game
              <span className="transition-transform duration-300 group-hover:translate-y-1">↓</span>
            </span>
          </button>
          
          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
              <div className="w-1.5 h-3 bg-slate-500 rounded-full animate-pulse" />
            </div>
          </div>
        </section>
        
        {/* ============ GAMES SECTION ============ */}
        <section id="games" className="px-6 py-24 max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Pick Your Arena
            </h2>
            <p className="text-slate-400 text-lg">
              Three games. Multiple stake levels. One rule: <span className="text-cyan-400">the better player wins.</span>
            </p>
          </div>
          
          {/* Games Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            <GameCard
              icon="✖️"
              title="Tic-Tac-Toe"
              stakes="0.001 – 0.1 ETH"
              tagline="The game everyone knows. Now with real stakes and zero mercy."
              features={[
                "Perfect for your first match",
                "Quick games, instant results",
                "Classic rules, pure strategy"
              ]}
              href="/tictactoe"
              accentColor="#06b6d4"
            />

            <GameCard
              icon="🔴"
              title="Connect Four"
              stakes="0.001 – 0.1 ETH"
              tagline="Drop. Connect. Collect. The vertical battle for supremacy."
              features={[
                "Deceptively deep strategy",
                "Fast-paced tactical play",
                "First to four wins it all"
              ]}
              href="/c4"
              accentColor="#ef4444"
            />

            <GameCard
              icon="♔"
              title="Chess"
              stakes="0.01 – 1 ETH"
              tagline="Full chess. Every rule. Every move immortalized on-chain forever."
              features={[
                "Castling, en passant, promotion",
                "Higher stakes for serious players",
                "Prove your rating means something"
              ]}
              href="/chess"
              accentColor="#fbbf24"
            />
            
          </div>
        </section>
        
        {/* ============ HOW IT WORKS ============ */}
        <section className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Dead Simple</h2>
              <p className="text-slate-400 text-lg">No accounts. No downloads. No bullshit.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-cyan-400 mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Connect Wallet</h3>
                <p className="text-slate-500">MetaMask, WalletConnect, whatever. If it holds ETH, it works.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl font-bold text-purple-400 mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Pick Your Stakes</h3>
                <p className="text-slate-500">From micro bets to serious money. You choose the tier that fits.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Win & Withdraw</h3>
                <p className="text-slate-500">Beat your opponent, ETH hits your wallet. No delays, no fees.</p>
              </div>
              
            </div>
          </div>
        </section>
        
        {/* ============ WHY TRUST THIS ============ */}
        <section className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Why This Isn't a Scam</h2>
              <p className="text-slate-400 text-lg">Everything runs on Arbitrum. Nothing hidden. Nothing centralized.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="text-3xl mb-4">⛓️</div>
                <h3 className="text-xl font-bold text-white mb-3">Fully On-Chain</h3>
                <p className="text-slate-400 leading-relaxed">
                  Every move, every game, every payout lives on the blockchain. No servers to shut down. 
                  No company to trust. The code is the only authority.
                </p>
              </div>
              
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="text-3xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-3">Open Source</h3>
                <p className="text-slate-400 leading-relaxed">
                  Read every line. Verify every function. The smart contracts are public, 
                  auditable, and can't be changed once deployed.
                </p>
              </div>
              
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="text-3xl mb-4">🚫</div>
                <h3 className="text-xl font-bold text-white mb-3">No Token</h3>
                <p className="text-slate-400 leading-relaxed">
                  We're not selling you anything. No governance token. No "utility" coin. 
                  Just ETH in, ETH out. The way crypto should work.
                </p>
              </div>
              
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="text-3xl mb-4">⏱️</div>
                <h3 className="text-xl font-bold text-white mb-3">Anti-Stall Protection</h3>
                <p className="text-slate-400 leading-relaxed">
                  Timeout escalation means no one can grief you by going AFK. 
                  If they stall, you win. Simple as that.
                </p>
              </div>
              
            </div>
          </div>
        </section>
        
        {/* ============ FINAL CTA ============ */}
        <section className="px-6 py-32 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Prove Yourself?
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-xl mx-auto">
            No more playing for points. No more fake rankings. 
            Put real ETH on the line and see where you stand.
          </p>
          <button
            onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-16 py-6 rounded-2xl font-bold text-xl text-white transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              boxShadow: '0 8px 40px rgba(6, 182, 212, 0.4)'
            }}
          >
            Start Playing
          </button>
        </section>
        
        {/* ============ FOOTER ============ */}
        <footer className="border-t border-slate-800/50 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            
            {/* Main Footer Content */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
              
              {/* Left: Tech Credit */}
              <div className="text-center md:text-left">
                <p className="text-slate-500 text-sm mb-2">
                  Powered by{' '}
                  <span 
                    className="font-semibold bg-clip-text text-transparent"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text' }}
                  >
                    ETour Protocol
                  </span>
                </p>
                <p className="text-slate-600 text-xs">
                  Open-source perpetual tournament infrastructure on Arbitrum
                </p>
              </div>
              
              {/* Right: Links */}
              <div className="flex items-center gap-6">
                <a 
                  href="https://github.com/aspect-building/etour" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-white transition-colors text-sm"
                >
                  GitHub
                </a>
                <a 
                  href="https://arbiscan.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-white transition-colors text-sm"
                >
                  Contracts
                </a>
                <a 
                  href="https://reclaimweb3.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-white transition-colors text-sm"
                >
                  RW3 Manifesto
                </a>
              </div>
              
            </div>
            
            {/* Bottom Line */}
            <div className="text-center pt-8 border-t border-slate-800/30">
              <p className="text-slate-600 text-xs">
                No company. No contacts. No permission needed. Just games.
              </p>
            </div>
            
          </div>
        </footer>
        
      </div>
      
      {/* Keyframe Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.2; }
          25% { transform: translate(30px, -40px) rotate(90deg); opacity: 0.15; }
          50% { transform: translate(-20px, -80px) rotate(180deg); opacity: 0.25; }
          75% { transform: translate(-50px, -40px) rotate(270deg); opacity: 0.15; }
        }
        .animate-float {
          animation: float 25s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
