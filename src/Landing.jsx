import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, CheckCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import tttABI from './TTTABI-modular.json';
import chessABI from './ChessOnChain-ABI-modular.json';
import connectFourABI from './ConnectFourABI-modular.json';
import TotalEarningsCard from './components/shared/TotalEarningsCard';

// Floating Game Particles - each hovers around its initial position
function FloatingParticles() {
  const PARTICLES = [
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

  const pickRandom = (excluded, poppedSet) => {
    const available = PARTICLES.map((_, i) => i).filter(i => !poppedSet.has(i) && i !== excluded);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  const [popped, setPopped] = useState(new Set());
  const [popping, setPopping] = useState(null);
  const [active, setActive] = useState(() => Math.floor(Math.random() * PARTICLES.length));

  const handleClick = (i) => {
    if (i !== active || popping !== null) return;
    setPopping(i);
    setTimeout(() => {
      setPopped(prev => {
        const next = new Set(prev).add(i);
        setPopping(null);
        setActive(pickRandom(i, next));
        return next;
      });
    }, 400);
  };

  return (
    <>
      {/* Visual layer — behind page UI */}
      <div className="fixed inset-0 overflow-hidden" style={{ pointerEvents: 'none', zIndex: 1 }}>
        {PARTICLES.map((p, i) => {
          if (popped.has(i)) return null;
          const isActive = i === active;
          const isPopping = i === popping;
          return (
            <div
              key={i}
              className={`absolute ${p.size}`}
              style={{
                left: `${p.baseX}%`,
                top: `${p.baseY}%`,
                color: p.color,
                pointerEvents: 'none',
                textShadow: isActive
                  ? `0 0 10px ${p.color}, 0 0 20px ${p.color}`
                  : `0 0 8px ${p.color}`,
                animation: isPopping
                  ? 'particle-pop 0.4s ease-out forwards'
                  : isActive
                    ? 'particle-glow-pulse 1.4s ease-in-out infinite'
                    : `particle-hover 14s ${i * -2.5}s infinite ease-in-out`,
              }}
            >
              {p.symbol}
            </div>
          );
        })}
      </div>
      {/* Hit area layer — on top for click detection only */}
      <div className="fixed inset-0 overflow-hidden" style={{ pointerEvents: 'none', zIndex: 9999 }}>
        {active !== null && !popped.has(active) && (
          <div
            onClick={() => handleClick(active)}
            className={`absolute ${PARTICLES[active].size}`}
            style={{
              left: `${PARTICLES[active].baseX}%`,
              top: `${PARTICLES[active].baseY}%`,
              color: 'transparent',
              pointerEvents: popping !== null ? 'none' : 'auto',
              cursor: 'pointer',
              animation: popping !== null
                ? 'particle-pop 0.4s ease-out forwards'
                : 'particle-glow-pulse 1.4s ease-in-out infinite',
            }}
          >
            {PARTICLES[active].symbol}
          </div>
        )}
      </div>
    </>
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
// Typing animation sequence for hero headline
// Sequence: type "Run Tournemants\nSettle Scores" → backspace → fade-in shrunk subtitle → type "Think You're Good?\nProve It."
function useHeroTyping() {
  const LINE1 = "Think You're Good?";
  const LINE2 = "Prove It.";

  const STEPS = [
    { target: LINE1,                                              backspace: false, pauseAfter: 300 },
    { target: LINE1 + "\n" + LINE2,                               backspace: false },
  ];

  const [display, setDisplay] = useState("");
  const [shrunk, setShrunk] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let current = "";

    const TYPE_SPEED = 65;
    const DELETE_SPEED = 35;
    const PAUSE_AFTER_TYPE = 600;
    const PAUSE_AFTER_DELETE = 300;
    const FADE_IN_DURATION = 500; // matches CSS transition

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    async function run() {
      for (let s = 0; s < STEPS.length; s++) {
        const step = STEPS[s];

        // Type forward to target
        while (current.length < step.target.length) {
          if (cancelled) return;
          current = step.target.slice(0, current.length + 1);
          setDisplay(current);
          await sleep(TYPE_SPEED);
        }

        if (step.pauseAfter) {
          await sleep(step.pauseAfter);
        }

        if (step.backspace) {
          await sleep(PAUSE_AFTER_TYPE);
          while (current.length > 0) {
            if (cancelled) return;
            current = current.slice(0, -1);
            setDisplay(current);
            await sleep(DELETE_SPEED);
          }
          await sleep(PAUSE_AFTER_DELETE);
          // Backspacing done — fade in the shrunk subtitle
          setShrunk(true);
          await sleep(FADE_IN_DURATION);
        }
      }
      if (!cancelled) setDone(true);
    }

    run();
    return () => { cancelled = true; };
  }, []);

  const newline = display.indexOf("\n");
  if (newline === -1) {
    return { line1: display, line2: "", shrunk, done };
  }
  return { line1: display.slice(0, newline), line2: display.slice(newline + 1), shrunk, done };
}

export default function Landing() {
  const [whitepaperExpanded, setWhitepaperExpanded] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contractsExpanded, setContractsExpanded] = useState(false);
  const [whitepaperGlow, setWhitepaperGlow] = useState(false);
  const whitepaperGlowTimer = useRef(null);
  const { line1, line2, shrunk, done: typingDone } = useHeroTyping();

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
      a: "Strategy games are perfect for blockchain: they're deterministic and impossible to cheat when moves are recorded on-chain. Unlike poker or casino games that require trusted randomness, our games are pure skill. Every move is recorded on-chain, and game outcomes are secured by the blockchain."
    },
    {
      q: "What if my opponent doesn't move?",
      a: "Each player has a time limit per move. If a player fails to make a move within the time limit, they automatically forfeit the game. The smart contract enforces all timeouts. No disputes required, no moderators needed."
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
		        <div className="h-7 md:h-12" aria-hidden="true" />
		        <section className="min-h-[70vh] flex flex-col justify-center items-center px-6 py-16">
	          
	          {/* Eyebrow */}
	          <div className="flex items-center gap-4 mb-0">
	            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <a
              href="#read-the-whitepaper"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('read-the-whitepaper')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                clearTimeout(whitepaperGlowTimer.current);
                setTimeout(() => {
                  setWhitepaperGlow(true);
                  whitepaperGlowTimer.current = setTimeout(() => setWhitepaperGlow(false), 2000);
                }, 600);
              }}
              className="text-cyan-400 text-base md:text-xl font-semibold tracking-widest uppercase hover:text-cyan-300 transition-colors cursor-pointer"
            >
              ETour Games
            </a>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          {/* Shrunk subtitle — fades in after backspacing, sits above the headline */}
          <div
            className="text-center font-bold tracking-wide"
            style={{
              opacity: typingDone ? 0.55 : 0,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              color: '#94a3b8',
              transition: 'opacity 0.6s ease',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            Run Tournaments · Settle Scores
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[1.1] mb-8 py-2">
            <span className="block text-white pb-1">
              {line1}
              {!line2 && <span className="animate-pulse">|</span>}
            </span>
            <span
              className="block bg-clip-text text-transparent py-1"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text' }}
            >
              {line2}
              {line2 && !typingDone && <span className="animate-pulse text-white">|</span>}
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-400 text-center max-w-2xl mb-12 leading-relaxed">
            <a
              href="#how-does-etour-work"
              onClick={(e) => {
                e.preventDefault();
                const faqSection = document.getElementById('how-does-etour-work');
                if (faqSection) {
                  faqSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Expand the FAQ item after scrolling
                  setTimeout(() => setExpandedFaq(0), 500);
                }
              }}
              className="inline-flex items-center gap-2 hover:text-slate-300 transition-colors cursor-pointer underline decoration-dotted decoration-slate-500 underline-offset-4"
            >
              Classic games. ETH stakes. No hidden costs.
              <HelpCircle size={20} className="text-cyan-400" />
            </a>
            <br />
            <span className="text-white font-semibold inline-block mt-4">Skill vs skill. Real ETH on the line.</span>
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
        </section>
        
        {/* ============ GAMES SECTION ============ */}
        <section id="games" className="px-6 py-0 max-w-7xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Pick Your Arena
            </h2>
            <p className="text-slate-400 text-lg mb-3">
              Three games. Multiple stake levels. One rule: <span className="text-cyan-400">winner takes all.</span>
            </p>
            <TotalEarningsCard />
          </div>
          
          {/* Games Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            
            <GameCard
              icon="✖️"
              title="Tic-Tac-Toe"
              stakes="0.0003 - 0.0013 ETH (~$1 - $4)"
              tagline="The game everyone knows. Now with real stakes and zero mercy."
              features={[
                "Each player gets 2 minutes",
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
              stakes="0.001 – 0.004 ETH"
              tagline="Drop. Connect. Collect. The vertical battle for supremacy."
              features={[
                "Each player gets 5 minutes",
                "Deceptively deep strategy",
                "Fast-paced tactical play",
                "First to four wins it all"
              ]}
              href="/connect4"
              accentColor="#ef4444"
            />

            <GameCard
              icon="♔"
              title="Chess"
              stakes="0.003 – 0.15 ETH"
              tagline="Full chess. Every rule. ETH and glory on the line."
              features={[
                "Each player gets 10 minutes",
                "Castling, en passant, promotion",
                "Higher stakes for elite players",
                "Prove your rating means something"
              ]}
              href="/chess"
              accentColor="#fbbf24"
            />

          </div>


        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="px-6 py-24">
          <div className="max-w-4xl mx-auto">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Dead Simple</h2>
              <p className="text-slate-400 text-lg">No accounts. No downloads. No nonsense.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-cyan-400 mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Connect Wallet</h3>
                <p className="text-slate-500">MetaMask, Brave, whatever. If it holds ETH, it works.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl font-bold text-purple-400 mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Pick Your Stakes</h3>
                <p className="text-slate-500">From micro stakes to serious money. You choose the tier that fits.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400 mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Win & Withdraw</h3>
                <p className="text-slate-500">Win and the ETH hits your wallet. Instant, reliable, with minimal fees.</p>
              </div>
              
            </div>
          </div>
        </section>
        
        {/* ============ WHY TRUST THIS ============ */}
        <section className="px-6 py-24 border-t border-slate-800/50">
          <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Trust by Blockchain</h2>
              <p className="text-slate-400 text-lg">Everything runs on Ethereum. Nothing is hidden. Nothing is centralized.</p>
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
                  ETH in, ETH out.
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

        {/* ============ FAQ SECTION ============ */}
        <section className="px-6 py-12 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center text-white">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  id={idx === 0 ? 'how-does-etour-work' : undefined}
                  className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/60"
                >
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

        {/* ============ FINAL CTA ============ */}
        <section className="px-6 py-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Prove Yourself?
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-xl mx-auto">
            Put real ETH on the line and see where you stand.
          </p>
          <div className="flex flex-col items-center gap-4">
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
            <span className="text-slate-500 text-lg font-medium">or</span>
            <Link
              id="read-the-whitepaper"
              to="/whitepaper"
              className="font-bold text-xl text-cyan-400 transition-all duration-300 hover:text-cyan-300"
              style={whitepaperGlow ? {
                textShadow: '0 0 8px #22d3ee, 0 0 20px #22d3ee, 0 0 40px #06b6d4',
                animation: 'whitepaperPulse 2s ease-out forwards',
              } : {}}
            >
              Read The Whitepaper
            </Link>
          </div>
        </section>
        
        {/* ============ FOOTER ============ */}
        <footer className="border-t border-slate-800/50 px-6 py-16">
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
                <button
                  onClick={() => setContractsExpanded(!contractsExpanded)}
                  className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Contracts {contractsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
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

            {/* Expandable Contracts Table */}
            {contractsExpanded && (
              <div className="mb-8 overflow-x-auto">
                <table className="w-full border-collapse bg-slate-900/60 rounded-lg">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-cyan-300 font-semibold">ETour Modules</th>
                      <th className="text-left p-4 text-cyan-300 font-semibold">Game Contracts</th>
                      <th className="text-left p-4 text-cyan-300 font-semibold">Game Modules</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          <a
                            href={`https://arbiscan.io/address/${tttABI.modules.core}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ETour_Core.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${tttABI.modules.matches}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ETour_Matches.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${tttABI.modules.prizes}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ETour_Prizes.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${tttABI.modules.raffle}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ETour_Raffle.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${tttABI.modules.escalation}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ETour_Escalation.sol
                          </a>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          <a
                            href={`https://arbiscan.io/address/${tttABI.address}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            TicTacChain.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${chessABI.address}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ChessOnChain.sol
                          </a>
                          <a
                            href={`https://arbiscan.io/address/${connectFourABI.address}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ConnectFourOnChain.sol
                          </a>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          <a
                            href={`https://arbiscan.io/address/${chessABI.modules.chessRules}#code`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                          >
                            ChessRules.sol
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

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
        @keyframes particle-hover {
          0%   { transform: translate(0px, 0px) rotate(0deg); opacity: 0.25; }
          20%  { transform: translate(12px, -15px) rotate(36deg); opacity: 0.18; }
          40%  { transform: translate(-10px, -18px) rotate(72deg); opacity: 0.30; }
          60%  { transform: translate(-16px, 8px) rotate(108deg); opacity: 0.20; }
          80%  { transform: translate(14px, 14px) rotate(144deg); opacity: 0.28; }
          100% { transform: translate(0px, 0px) rotate(180deg); opacity: 0.25; }
        }
        @keyframes particle-glow-pulse {
          0%, 100% {
            transform: scale(1.1);
            opacity: 0.8;
            filter: brightness(1.2) drop-shadow(0 0 4px currentColor) drop-shadow(0 0 10px currentColor);
          }
          50% {
            transform: scale(1.25);
            opacity: 0.95;
            filter: brightness(1.4) drop-shadow(0 0 8px currentColor) drop-shadow(0 0 18px currentColor);
          }
        }
        @keyframes particle-pop {
          0%   { transform: scale(1);   opacity: 0.25; filter: blur(0px); }
          40%  { transform: scale(2.2); opacity: 0.8;  filter: blur(0px); }
          70%  { transform: scale(2.8); opacity: 0.4;  filter: blur(2px); }
          100% { transform: scale(3.5); opacity: 0;    filter: blur(6px); }
        }
      `}</style>
    </div>
  );
}
