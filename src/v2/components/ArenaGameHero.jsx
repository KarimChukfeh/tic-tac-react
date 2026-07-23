import { Link } from 'react-router-dom';

const HELP_LINKS = [
  { label: "What's This?", key: 'what' },
  { label: 'Quick Guide', key: 'guide' },
  { label: 'User Manual', key: 'manual' },
];

const HERO_CONTENT = {
  chess: {
    title: 'Chess',
    kicker: <>Think deeper. <strong>Take the board.</strong></>,
    lede: 'The timeless strategy game, rebuilt as a fully verifiable tournament. Every move on-chain. Every outcome settled in ETH.',
    marks: ['♜', '♞', '♝', '♛', '♟', '♙', '♕', '♗', '♘'],
  },
  connect4: {
    title: 'Connect Four',
    kicker: <>Line them up. <strong>Cash it out.</strong></>,
    lede: 'The classic race to four, rebuilt as a fully verifiable tournament. Every drop on-chain. Every outcome settled in ETH.',
    marks: Array.from({ length: 42 }, (_, index) => {
      if ([35, 30, 25, 20].includes(index)) return 'red';
      if ([36, 29, 22, 15].includes(index)) return 'blue';
      return '';
    }),
  },
};

export default function ArenaGameHero({
  game,
  compact = false,
  effectsEnabled = true,
  onToggleEffects,
  onOpenWhatIsThis,
  onOpenQuickGuide,
  onOpenManual,
}) {
  const content = HERO_CONTENT[game];
  const handlers = {
    what: onOpenWhatIsThis,
    guide: onOpenQuickGuide,
    manual: onOpenManual,
  };

  return (
    <section className={`t2-hero arena-hero arena-hero--${game} ${compact ? 't2-hero--compact' : ''}`}>
      <div className="t2-hero__grid" aria-hidden="true" />
      <div className="t2-hero__copy">
        <div className="t2-hero__eyebrow">
          <Link to="/">ETour games</Link>
          <button
            type="button"
            role="switch"
            aria-checked={effectsEnabled}
            aria-label={`3D Effects ${effectsEnabled ? 'on' : 'off'}`}
            className="t2-effects-switch"
            onClick={onToggleEffects}
          >
            <span className="t2-effects-switch__label">3D Effects</span>
            <span className="t2-effects-switch__track" aria-hidden="true"><i /></span>
            <strong>{effectsEnabled ? 'ON' : 'OFF'}</strong>
          </button>
        </div>

        <h1>{content.title}</h1>
        <p className="t2-hero__kicker">{content.kicker}</p>
        {!compact ? <p className="t2-hero__lede">{content.lede}</p> : null}

        <div className="t2-hero__meta t2-hero__help-links">
          {HELP_LINKS.map((link, index) => (
            <div key={link.key} className="t2-hero__help-link">
              {index > 0 ? <span aria-hidden="true">•</span> : null}
              <a
                href={link.key === 'manual' ? '#user-manual' : '#'}
                onClick={handlers[link.key]}
              >
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="t2-hero__scene" aria-hidden="true">
        {game === 'chess' ? (
          <div className="t2-hero-board arena-chess-hero-board">
            {content.marks.map((mark, index) => <span key={index}>{mark}</span>)}
          </div>
        ) : (
          <div className="arena-connect-hero-board">
            {content.marks.map((mark, index) => (
              <span className={mark ? `is-${mark}` : ''} key={index}><i /></span>
            ))}
          </div>
        )}
        <div className="t2-hero__orbit"><i /><i /></div>
        <div className="t2-hero__status"><i /> Arena ready</div>
      </div>
    </section>
  );
}
