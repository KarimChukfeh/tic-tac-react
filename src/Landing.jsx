import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

// Floating Game Particles with cursor attraction
function FloatingParticles() {
  const particles = [
    { symbol: '✕', color: '#06b6d4', baseX: 5, baseY: 8, size: 'text-3xl' },
    { symbol: '○', color: '#a855f7', baseX: 92, baseY: 12, size: 'text-3xl' },
    { symbol: '♔', color: '#fbbf24', baseX: 12, baseY: 25, size: 'text-4xl' },
    { symbol: '🔴', color: '#ef4444', baseX: 80, baseY: 18, size: 'text-2xl' },
    { symbol: '♟', color: '#fbbf24', baseX: 95, baseY: 45, size: 'text-4xl' },
    { symbol: '○', color: '#a855f7', baseX: 8, baseY: 55, size: 'text-3xl' },
    { symbol: '🔵', color: '#3b82f6', baseX: 88, baseY: 65, size: 'text-2xl' },
    { symbol: '✕', color: '#06b6d4', baseX: 15, baseY: 75, size: 'text-3xl' },
    { symbol: '♔', color: '#fbbf24', baseX: 92, baseY: 85, size: 'text-4xl' },
    { symbol: '🔴', color: '#ef4444', baseX: 25, baseY: 92, size: 'text-2xl' },
  ];

  const mousePos = useRef({ x: null, y: null });
  const particleOffsets = useRef(particles.map(() => ({ x: 0, y: 0 })));
  const particleRefs = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      };
    };

    const handleMouseLeave = () => {
      mousePos.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop for smooth attraction
    const animate = () => {
      const mouse = mousePos.current;

      particles.forEach((p, i) => {
        const offset = particleOffsets.current[i];
        const el = particleRefs.current[i];
        if (!el) return;

        if (mouse.x !== null && mouse.y !== null) {
          // Calculate direction to cursor (in percentage units)
          const targetX = mouse.x - p.baseX;
          const targetY = mouse.y - p.baseY;

          // Convert 50px radius to viewport units (approximate)
          const forceFieldRadius = 50 / window.innerWidth * 100; // ~50px in vw

          // Calculate current distance from particle to cursor target
          const currentDistX = targetX - offset.x;
          const currentDistY = targetY - offset.y;
          const distance = Math.sqrt(currentDistX * currentDistX + currentDistY * currentDistY);

          // Only attract if outside the force field radius
          if (distance > forceFieldRadius) {
            // Attract toward the edge of the force field, not the cursor itself
            const scale = (distance - forceFieldRadius) / distance;
            const edgeTargetX = offset.x + currentDistX * scale;
            const edgeTargetY = offset.y + currentDistY * scale;

            // Extremely slow attraction - barely perceptible drift
            offset.x += (edgeTargetX - offset.x) * 0.0006;
            offset.y += (edgeTargetY - offset.y) * 0.0006;
          }
        } else {
          // Very slowly return to base position when cursor leaves
          offset.x *= 0.999;
          offset.y *= 0.999;
        }

        // Apply the attraction offset as a CSS variable
        el.style.setProperty('--attract-x', `${offset.x}vw`);
        el.style.setProperty('--attract-y', `${offset.y}vh`);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          ref={el => particleRefs.current[i] = el}
          className={`absolute ${p.size} opacity-20 animate-float-attract`}
          style={{
            left: `${p.baseX}%`,
            top: `${p.baseY}%`,
            color: p.color,
            animationDelay: `${i * -2.5}s`,
            '--attract-x': '0vw',
            '--attract-y': '0vh',
          }}
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

// Whitepaper Markdown Renderer Component
function WhitepaperSection() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/ETour_Whitepaper.md')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load whitepaper');
        }
        return response.text();
      })
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const generateId = (text) => {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-cyan-500/30">
        <p className="text-slate-300 text-center">Loading whitepaper...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-cyan-500/30">
        <p className="text-red-400 text-center">Error loading whitepaper: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-cyan-500/30">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({node, children, ...props}) => {
            const id = generateId(children);
            return <h1 id={id} className="text-5xl md:text-5xl font-bold text-cyan-300 mb-6 mt-8 text-center" {...props}>{children}</h1>;
          },
          h2: ({node, children, ...props}) => {
            const id = generateId(children);
            return <h2 id={id} className="text-3xl font-bold text-cyan-300 mb-4 mt-8" {...props}>{children}</h2>;
          },
          h3: ({node, children, ...props}) => {
            const id = generateId(children);
            const isSubtitle = children?.toString().includes('Tournament Infrastructure');
            return <h3 id={id} className={`text-2xl font-bold text-cyan-300 mb-3 mt-6 ${isSubtitle ? 'text-center' : ''}`} {...props}>{children}</h3>;
          },
          p: ({node, ...props}) => <p className="text-slate-300 mb-4 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 text-slate-300 space-y-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 text-slate-300 space-y-2" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
          code: ({node, inline, className, ...props}) => {
            const isInline = inline || !className?.includes('language-');
            return isInline
              ? <code className="bg-cyan-500/20 px-2 py-1 rounded text-cyan-200 text-sm" {...props} />
              : <code className="block bg-slate-800/50 p-4 rounded-lg text-cyan-200 text-sm overflow-x-auto mb-4" {...props} />;
          },
          pre: ({node, ...props}) => <pre className="bg-slate-800/50 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-cyan-400 pl-4 italic text-slate-400 my-4" {...props} />,
          hr: ({node, ...props}) => <hr className="border-slate-700/50 my-8" {...props} />,
          a: ({node, href, children, ...props}) => {
            if (href?.startsWith('#')) {
              return (
                <a
                  href={href}
                  className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(href.slice(1));
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return <a href={href} className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
          },
          strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto mb-6"><table className="w-full border-collapse" {...props} /></div>,
          thead: ({node, ...props}) => <thead className="border-b border-cyan-500/30" {...props} />,
          th: ({node, ...props}) => <th className="text-left p-3 text-cyan-300" {...props} />,
          td: ({node, ...props}) => <td className="p-3 text-slate-300 border-b border-slate-700/30" {...props} />,
          details: ({node, ...props}) => <details className="mb-6 border border-cyan-500/30 rounded-lg p-4 bg-slate-800/30" {...props} />,
          summary: ({node, ...props}) => <summary className="cursor-pointer text-cyan-300 text-xl font-bold mb-2 hover:text-cyan-200 transition-colors" {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

// Main Landing Component
export default function Landing() {
  const [whitepaperExpanded, setWhitepaperExpanded] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Set page title
  useEffect(() => {
    document.title = 'ETour - Pure Competition. No Nonsense.';
  }, []);

  // FAQ data
  const faqs = [
    {
      q: "How does ETour work?",
      a: "ETour matches enrolled players on the blockchain. Players enroll by paying an entry fee, then they take turns making moves on-chain. The winner receives 90% of the total entry fees (with 7.5% to owner and 2.5% to protocol)."
    },
    {
      q: "Why play games on the blockchain?",
      a: "Strategy games are perfect for blockchain: they're deterministic and impossible to cheat when moves are recorded on-chain. Unlike poker or casino games that require trusted randomness, our games are pure skill. Every move is recorded on-chain, and game outcomes are cryptographically secured."
    },
    {
      q: "What if my opponent doesn't move?",
      a: "Each player has a time limit per move. If a player fails to make a move within the time limit, they automatically forfeit the game. The smart contract enforces all timeouts. No disputes required, no moderators needed."
    },
    {
      q: "Can this really run forever?",
      a: "Yes. The smart contracts are deployed on Arbitrum (an Ethereum Layer 2) with no off-switch. No admin panel, no company required to keep them running. Even if this website disappears, anyone can interact with the contracts directly via Arbiscan or build their own interface. The contracts continue executing and game outcomes remain permanent."
    },
    {
      q: "How do I know the prize pool is safe?",
      a: "All entry fees go directly to the smart contract on Arbitrum. The contract holds the funds and distributes them automatically when a winner is determined. No human can access the funds. You can verify this by reading the contract code on Arbiscan."
    }
  ];

  return (
    <div 
      className="min-h-screen text-white overflow-x-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #030712 0%, #0a1628 50%, #030712 100%)'
      }}
    >
      <FloatingParticles />
      
      <div className="relative z-10">

        {/* Trust Banner */}
        <div style={{
          background: 'rgba(0, 100, 200, 0.2)',
          borderBottom: '1px solid rgba(100, 150, 200, 0.3)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 10,
        }}>
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:gap-6 justify-center text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">100% On-Chain</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Immutable Rules</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Every Move Verifiable</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-blue-400" size={16} />
                <span className="text-blue-100 font-medium">Zero Cookies</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ HERO SECTION ============ */}
        <br/>
        <br/>
        <br/>
        <section className="min-h-[70vh] flex flex-col justify-center items-center px-6 py-16">
          
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <a
              href="#whitepaper"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('whitepaper')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-cyan-400 text-base md:text-xl font-semibold tracking-widest uppercase hover:text-cyan-300 transition-colors cursor-pointer"
            >
              ETour Games
            </a>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[1.1] mb-8 py-2">
            <span className="block text-white pb-1">Think You're Good?</span>
            <span
              className="block bg-clip-text text-transparent py-1"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text' }}
            >
              Prove It.
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-400 text-center max-w-2xl mb-12 leading-relaxed">
            Classic strategy games. Real stakes. No tokens, no tricks.
            <br />
            <span className="text-white font-semibold">Skill vs skill. Real ETH on the line.</span>
          </p>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-6 mb-12 py-8">
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
        </section>
        
        {/* ============ GAMES SECTION ============ */}
        <section id="games" className="px-6 py-0 max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Pick Your Arena
            </h2>
            <p className="text-slate-400 text-lg">
              Three games. Multiple stake levels. One rule: <span className="text-cyan-400">winner takes all.</span>
            </p>
          </div>
          
          {/* Games Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            <GameCard
              icon="✖️"
              title="Tic-Tac-Toe"
              stakes="0.001 ETH"
              tagline="The game everyone knows. Now with real stakes and zero mercy."
              features={[
                "5 minutes per match",
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
              stakes="0.002 – 0.01 ETH"
              tagline="Drop. Connect. Collect. The vertical battle for supremacy."
              features={[
                "1 minute per move",
                "Deceptively deep strategy",
                "Fast-paced tactical play",
                "First to four wins it all"
              ]}
              href="/c42"
              accentColor="#ef4444"
            />

            <GameCard
              icon="♔"
              title="Chess"
              stakes="0.01 – 0.02 ETH"
              tagline="Full chess. Every rule. Every move immortalized on-chain forever."
              features={[
                "1 minute per move",
                "Castling, en passant, promotion",
                "Higher stakes for serious players",
                "Prove your rating means something"
              ]}
              href="/chess2"
              accentColor="#fbbf24"
            />
            
          </div>
        </section>
        
        {/* ============ HOW IT WORKS ============ */}
        <section className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Dead Simple</h2>
              <p className="text-slate-400 text-lg">No accounts. No downloads. No Nonsense.</p>
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
              <p className="text-slate-400 text-lg">Everything runs on Ethereum. Nothing hidden. Nothing centralized.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8">
                <div className="text-3xl mb-4">⛓️</div>
                <h3 className="text-xl font-bold text-white mb-3">Fully On-Chain</h3>
                <p className="text-slate-400 leading-relaxed">
                  Every move, every game, every payout lives on the blockchain. No servers to shut down. 
                  No company to trust. Code is the only authority.
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
                  ETH in, ETH out. The way crypto should be.
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

        {/* ============ ZERO TRUST ARCHITECTURE ============ */}
        <section id="zero-trust" className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-green-500/30">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-6 text-center text-green-300">Zero-Trust Architecture</h2>

                <div className="bg-green-500/10 border-l-4 border-green-400 p-6 rounded-r-xl mb-8">
                  <p className="text-lg leading-relaxed text-green-100">
                    ETour is a <strong className="text-green-300">fully autonomous protocol</strong> deployed on Arbitrum (Ethereum Layer 2). Every game move is recorded on-chain. Every rule is enforced by immutable code. No servers can go down. No admins can interfere. No company can shut it down.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-3 text-green-300 flex items-center gap-2">
                      <span className="text-2xl">🎮</span> The Game Protocol
                    </h3>
                    <ul className="space-y-2 text-green-100">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>Every move recorded on-chain</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>Smart contract validates all moves</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>Automatic timeout enforcement</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>Provably fair matchmaking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>Game outcomes permanent on L1</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">→</span>
                        <a
                          href="https://arbiscan.io/address/0x7fc74A84a41Ac0E4872fB94EB3d6A8998884Ec9d#code"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-300 hover:text-green-200 underline decoration-green-400/50 hover:decoration-green-300 transition-colors"
                        >
                          You can read its immutable source code here.
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold mb-3 text-blue-300 flex items-center gap-2">
                      <span className="text-2xl">🌐</span> This Interface
                    </h3>
                    <ul className="space-y-2 text-blue-100">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Demo interface by creator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Reads 100% public blockchain data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Simply calls smart contract functions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Can be rebuilt by anyone</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>No special privileges</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">→</span>
                        <a
                          href="https://github.com/KarimChukfeh/tic-tac-react"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-blue-200 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors"
                        >
                          Feel free to fork it and build your own!
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3 text-yellow-300 flex items-center gap-2">
                    <span className="text-2xl">💡</span> What This Means
                  </h3>
                  <div className="space-y-3 text-yellow-100">
                    <p>
                      <strong className="text-yellow-200">Anyone can build their own game interface</strong> to these games. All interfaces connect to the same games, display the same boards, and follow the same rules.
                    </p>
                    <p>
                      <strong className="text-yellow-200">This website is optional.</strong> You could play via Arbiscan, build your own UI, or use any third-party interface. The outcomes are secured by Arbitrum (and ultimately Ethereum L1), not by this website.
                    </p>
                    <p>
                      <strong className="text-yellow-200">Game outcomes are permanent.</strong> Even if every website disappears, the game continues forever. Your wins and prizes are secured by smart contracts settling to Ethereum L1.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ SECTION ============ */}
        <section className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center text-white">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/60">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-left text-white">{faq.q}</span>
                    {expandedFaq === idx ? <ChevronUp size={20} className="text-cyan-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-6 py-5 bg-slate-800/30 border-t border-slate-700/50">
                      <p className="text-slate-300 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ WHITEPAPER ============ */}
        <section id="whitepaper" className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setWhitepaperExpanded(!whitepaperExpanded)}
              className="w-full text-center mb-8 group cursor-pointer"
            >
              <h2 className="text-4xl font-bold text-white mb-4 group-hover:text-cyan-300 transition-colors">
                Read the Whitepaper
              </h2>
              <p className="text-slate-400 text-lg mb-4">Deep dive into ETour's architecture and philosophy.</p>
              <div className="flex items-center justify-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                <span className="text-sm font-medium">{whitepaperExpanded ? 'Collapse' : 'Expand'}</span>
                <ChevronDown
                  size={20}
                  className={`transform transition-transform duration-300 ${whitepaperExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            {whitepaperExpanded && <WhitepaperSection />}
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-6 py-16 text-center">
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
                No company needed. No trust required. No servers to shutdown.
              </p>
            </div>
            
          </div>
        </footer>
        
      </div>
      
      {/* Keyframe Animations */}
      <style>{`
        @keyframes float-attract {
          0%, 100% { transform: translate(calc(var(--attract-x, 0vw)), calc(var(--attract-y, 0vh))) rotate(0deg); opacity: 0.25; }
          25% { transform: translate(calc(45px + var(--attract-x, 0vw)), calc(-55px + var(--attract-y, 0vh))) rotate(90deg); opacity: 0.18; }
          50% { transform: translate(calc(-30px + var(--attract-x, 0vw)), calc(-110px + var(--attract-y, 0vh))) rotate(180deg); opacity: 0.32; }
          75% { transform: translate(calc(-70px + var(--attract-x, 0vw)), calc(-55px + var(--attract-y, 0vh))) rotate(270deg); opacity: 0.18; }
        }
        .animate-float-attract {
          animation: float-attract 18s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
