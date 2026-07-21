import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Code2,
  ExternalLink,
  Link2,
  Lock,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import V2ContractsTable from './components/shared/V2ContractsTable';
import './LandingReimagined.css';

const GAMES = [
  {
    id: '01',
    title: 'Tic-Tac-Toe',
    shortTitle: 'Tic Tac Toe',
    href: '/tictactoe',
    accent: 'cyan',
    kicker: 'Small board. Big gains.',
    features: [
      'The game everyone knows',
      'Perfect for your first match',
      'Quick games, instant results',
    ],
  },
  {
    id: '02',
    title: 'Connect Four',
    shortTitle: 'Connect Four',
    href: '/connect4',
    accent: 'coral',
    kicker: 'Stack the odds in your favor.',
    features: [
      'Drop. Connect. Collect.',
      'Deceptively deep strategy',
      'First to four wins it all',
    ],
  },
  {
    id: '03',
    title: 'Chess',
    shortTitle: 'Chess',
    href: '/chess',
    accent: 'gold',
    kicker: 'The classic. Now with consequences.',
    features: [
      'Full chess. Every rule',
      'Castling. En-Passant. Etc..',
      'Now with real stakes',
    ],
  },
];

const PROOFS = [
  {
    number: '01',
    icon: Link2,
    title: 'Fully On-Chain',
    copy: 'Every move, every game, every payout lives on the blockchain. No servers to shut down. No company to trust. Code is the only authority.',
  },
  {
    number: '02',
    icon: Code2,
    title: 'Open Source',
    copy: "Read every line. Verify every function. The smart contracts are public, auditable, and can't be changed once deployed.",
  },
  {
    number: '03',
    icon: X,
    title: 'No Token',
    copy: 'We’re not selling you anything. No governance token. No “utility” coin. ETH in, ETH out.',
  },
  {
    number: '04',
    icon: Clock3,
    title: 'Anti-Stall Protection',
    copy: 'Timeout escalation means no one can grief you by going AFK. If they stall, you win.',
  },
];

function TrustRail() {
  const signals = [
    { icon: Shield, label: '100% On-Chain' },
    { icon: Link2, label: 'Immutable Rules' },
    { icon: Lock, label: 'Every Move Verifiable' },
    { icon: CheckCircle, label: 'Zero Cookies' },
  ];

  return (
    <div className="lr-trust-rail" aria-label="Protocol trust signals">
      <div className="lr-trust-rail__track">
        {signals.map(({ icon: Icon, label }) => (
          <div className="lr-trust-rail__item" key={label}>
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneBoard() {
  const sceneRef = useRef(null);

  const handlePointerMove = (event) => {
    if (!sceneRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = sceneRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    sceneRef.current.style.setProperty('--scene-x', `${x * 10}deg`);
    sceneRef.current.style.setProperty('--scene-y', `${y * -8}deg`);
  };

  const resetPointer = () => {
    sceneRef.current?.style.setProperty('--scene-x', '0deg');
    sceneRef.current?.style.setProperty('--scene-y', '0deg');
  };

  return (
    <div
      className="lr-scene-wrap"
      ref={sceneRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-hidden="true"
    >
      <div className="lr-scene-glow" />
      <div className="lr-orbit lr-orbit--outer">
        <span className="lr-orbit__node lr-orbit__node--one" />
        <span className="lr-orbit__node lr-orbit__node--two" />
      </div>
      <div className="lr-orbit lr-orbit--inner" />

      <div className="lr-scene">
        <div className="lr-board">
          <div className="lr-board__surface">
            {Array.from({ length: 9 }, (_, index) => (
              <span className="lr-board__cell" key={index} />
            ))}
            <span className="lr-board__mark lr-board__mark--x lr-board__mark--x1">×</span>
            <span className="lr-board__mark lr-board__mark--x lr-board__mark--x2">×</span>
            <span className="lr-board__mark lr-board__mark--o lr-board__mark--o1" />
            <span className="lr-board__mark lr-board__mark--o lr-board__mark--o2" />
          </div>
          <div className="lr-board__edge lr-board__edge--front" />
          <div className="lr-board__edge lr-board__edge--side" />
        </div>

        <div className="lr-core">
          <div className="lr-core__face lr-core__face--front">E</div>
          <div className="lr-core__face lr-core__face--back">T</div>
          <div className="lr-core__face lr-core__face--right">O</div>
          <div className="lr-core__face lr-core__face--left">U</div>
          <div className="lr-core__face lr-core__face--top">R</div>
          <div className="lr-core__face lr-core__face--bottom" />
        </div>

        <div className="lr-scene-piece lr-scene-piece--disc"><span /></div>
        <div className="lr-scene-piece lr-scene-piece--knight">♞</div>
      </div>

      <div className="lr-scene-status">
        <span className="lr-scene-status__live"><i /> Protocol live</span>
        <span>Arbitrum One</span>
        <span>ETH native</span>
      </div>
    </div>
  );
}

function TicTacVisual() {
  const marks = ['×', '', '○', '', '×', '', '○', '', '×'];
  return (
    <div className="lr-game-visual lr-game-visual--tictac" aria-hidden="true">
      <div className="lr-mini-board">
        {marks.map((mark, index) => (
          <span className={mark === '×' ? 'is-x' : mark === '○' ? 'is-o' : ''} key={index}>{mark}</span>
        ))}
      </div>
    </div>
  );
}

function ConnectFourVisual() {
  const red = new Set([23, 24, 29, 30]);
  const blue = new Set([19, 25, 31]);
  return (
    <div className="lr-game-visual lr-game-visual--connect" aria-hidden="true">
      <div className="lr-connect-board">
        {Array.from({ length: 35 }, (_, index) => (
          <span className={red.has(index) ? 'is-red' : blue.has(index) ? 'is-blue' : ''} key={index} />
        ))}
      </div>
      <div className="lr-connect-chip" />
    </div>
  );
}

function ChessVisual() {
  return (
    <div className="lr-game-visual lr-game-visual--chess" aria-hidden="true">
      <div className="lr-chess-board">
        {Array.from({ length: 16 }, (_, index) => <span key={index} />)}
      </div>
      <span className="lr-chess-piece lr-chess-piece--king">♚</span>
      <span className="lr-chess-piece lr-chess-piece--knight">♞</span>
    </div>
  );
}

function GameVisual({ accent }) {
  if (accent === 'cyan') return <TicTacVisual />;
  if (accent === 'coral') return <ConnectFourVisual />;
  return <ChessVisual />;
}

function GamePortal({ game }) {
  return (
    <article className={`lr-game-card lr-game-card--${game.accent}`}>
      <div className="lr-game-card__topline">
        <span>Arena / {game.id}</span>
        <span>Winner takes all</span>
      </div>
      <GameVisual accent={game.accent} />
      <div className="lr-game-card__body">
        <p>{game.kicker}</p>
        <h3>{game.title}</h3>
        <ul>
          {game.features.map((feature) => (
            <li key={feature}><span>+</span>{feature}</li>
          ))}
        </ul>
        <Link to={game.href} className="lr-game-card__cta" aria-label={`Play ${game.shortTitle}`}>
          <span>Play now</span>
          <span className="lr-game-card__arrow"><ArrowRight size={18} /></span>
        </Link>
      </div>
    </article>
  );
}

function ProofCard({ proof }) {
  const Icon = proof.icon;
  return (
    <article className="lr-proof-card">
      <div className="lr-proof-card__number">{proof.number}</div>
      <div className="lr-proof-card__icon"><Icon size={22} aria-hidden="true" /></div>
      <h3>{proof.title}</h3>
      <p>{proof.copy}</p>
      <div className="lr-proof-card__verified"><CheckCircle size={14} /> Verifiable by anyone</div>
    </article>
  );
}

export default function LandingReimagined() {
  const [contractsExpanded, setContractsExpanded] = useState(false);

  useEffect(() => {
    document.title = 'ETour — The On-Chain Arena';
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="lr-page">
      <TrustRail />

      <main>
        <section className="lr-hero">
          <div className="lr-hero__grid" aria-hidden="true" />
          <div className="lr-hero__content">
            <div className="lr-eyebrow">
              <span><i /> ETour games</span>
            </div>
            <h1 aria-label="Bring your game. Leave with the pot.">
              Bring Your Game.
              <span>Take the Pot.</span>
            </h1>
            <p className="lr-hero__lede">
              Challenge your crew. Settle the score.
              <br />
              <strong>Fully on-chain.</strong>
            </p>
            <p className="lr-hero__sublede">Classic games with ETH stakes on the line.</p>
            <div className="lr-hero__actions">
              <button className="lr-button lr-button--primary" onClick={() => scrollTo('arenas')}>
                Browse arenas <ArrowDown size={18} />
              </button>
              <button className="lr-button lr-button--ghost" onClick={() => scrollTo('proof')}>
                See why it’s trustless <ArrowRight size={18} />
              </button>
            </div>
            <div className="lr-hero__signals">
              <span><Lock size={15} /> Every move is verified</span>
              <span><Sparkles size={15} /> Every payout is instant</span>
              <span><Shield size={15} /> Every match is grief-proof</span>
            </div>
          </div>
          <SceneBoard />
        </section>

        <section className="lr-arenas" id="arenas">
          <div className="lr-section-heading">
            <div>
              <h2>Three ways to<br /><em>settle it.</em></h2>
            </div>
            <p>
              Three games. One rule: <strong>winner takes all.</strong>
            </p>
          </div>
          <div className="lr-games-grid">
            {GAMES.map((game) => <GamePortal game={game} key={game.title} />)}
          </div>
        </section>

        <section className="lr-proof" id="proof">
          <div className="lr-proof__ambient" aria-hidden="true" />
          <div className="lr-proof__intro">
            <h2>Trust the chain.<br /><em>Not us.</em></h2>
            <p>Everything runs on Ethereum. Nothing is hidden. Nothing is centralized.</p>
            <Link to="/manual" className="lr-proof__manual">
              Full manual <ArrowRight size={16} />
            </Link>
          </div>
          <div className="lr-proof__cards">
            {PROOFS.map((proof) => <ProofCard proof={proof} key={proof.title} />)}
          </div>
        </section>

        <section className="lr-ready" id="protocol">
          <div className="lr-ready__halo" aria-hidden="true" />
          <div className="lr-ready__header">
            <h2>Ready to prove <em>yourself?</em></h2>
            <p>Play the games or build the next arena.</p>
          </div>
          <div className="lr-paths">
            <article className="lr-path lr-path--player">
              <div className="lr-path__meta"><span>As a player</span><span>01</span></div>
              <h3>Walk in with a rival.<br />Walk out a winner.</h3>
              <div className="lr-path__links">
                <Link to="/manual">Read the manual <ExternalLink size={15} /></Link>
                <button onClick={() => scrollTo('arenas')}>Start playing <ArrowRight size={17} /></button>
              </div>
            </article>
            <article className="lr-path lr-path--builder">
              <div className="lr-path__meta"><span>As a builder</span><span>02</span></div>
              <h3>Read the rules.<br />Extend the arena.</h3>
              <div className="lr-path__links">
                <Link to="/whitepaper">Read the whitepaper <ExternalLink size={15} /></Link>
                <Link to="/docs" className="lr-path__button">Start building <ArrowRight size={17} /></Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="lr-footer">
        <div className="lr-footer__top">
          <Link to="/" className="lr-brand" aria-label="ETour home">
            <span className="lr-brand__mark">E</span>
            <span className="lr-brand__word">ETOUR</span>
          </Link>
          <p>
            Powered by <strong>ETour Protocol</strong><br />
            <span>Open-source perpetual tournament infrastructure on Arbitrum</span>
          </p>
          <div className="lr-footer__links">
            <button onClick={() => setContractsExpanded((expanded) => !expanded)} aria-expanded={contractsExpanded}>
              Contracts {contractsExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <a href="https://reclaimweb3.com" target="_blank" rel="noopener noreferrer">
              RW3 Manifesto <ExternalLink size={13} />
            </a>
          </div>
        </div>
        {contractsExpanded && (
          <div className="lr-footer__contracts">
            <V2ContractsTable scope="landing" />
          </div>
        )}
        <div className="lr-footer__bottom">
          <span>No company needed. No trust required. No servers to shutdown.</span>
          <span>ETOUR / ON-CHAIN SINCE BLOCK ONE</span>
        </div>
      </footer>
    </div>
  );
}
