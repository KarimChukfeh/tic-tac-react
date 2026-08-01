import { useEffect, useRef, useState } from 'react';
import { BookOpen, MailPlus, Trophy, Wallet, Swords, Settings2, X } from 'lucide-react';
import { getV3ScrollBehavior } from '../accessibility/motionPreferences';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

const QUICK_GUIDE_TRANSITION_MS = 220;

const QUICK_GUIDE_STEPS = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description: 'Your wallet is your player ID. Pick a well funded Arbitrum ETH wallet.',
    Icon: Wallet,
  },
  {
    number: '02',
    title: 'Configure Your Lobby',
    description: 'Determine the size of your lobby (2 - 32 players) and the entry fee per player (0.0001 - 1 ETH).',
    Icon: Settings2,
  },
  {
    number: '03',
    title: 'Invite Your Players',
    description: 'After creating your lobby you can share the custom invite link with your friends and foes.',
    Icon: MailPlus,
  },
  {
    number: '04',
    title: 'Play Your Matches',
    description: 'Matches begin automatically once the lobby is full. Play your matches all the way to the finals.',
    Icon: Swords,
  },
  {
    number: '05',
    title: 'Winner Takes All',
    description: 'Whoever wins the finals gets the prize pool sent instantly to their wallet.',
    Icon: Trophy,
  },
];

const QuickGuideModal = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useAccessibleDialog({
    isOpen,
    dialogRef,
    initialFocusRef: closeRef,
    onClose,
  });

  useEffect(() => {
    let timeoutId = null;
    let frameId = null;

    if (isOpen) {
      setShouldRender(true);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else if (shouldRender) {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, QUICK_GUIDE_TRANSITION_MS);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const handleUserManualLinkClick = (event) => {
    event.preventDefault();
    onClose();
    window.dispatchEvent(new CustomEvent('open-user-manual'));
    window.setTimeout(() => {
      document.getElementById('user-manual')?.scrollIntoView({ behavior: getV3ScrollBehavior(), block: 'start' });
    }, QUICK_GUIDE_TRANSITION_MS);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto p-4 md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close quick guide"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-[220ms] ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v3-quick-guide-title"
        tabIndex={-1}
        className={`relative z-10 my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(2,6,23,0.97)_0%,rgba(23,37,84,0.94)_45%,rgba(88,28,135,0.92)_100%)] shadow-[0_30px_120px_rgba(8,145,178,0.28)] transition-[opacity,transform] duration-[220ms] ease-out md:max-h-[88vh] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-[0.985] opacity-0'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-4 md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <BookOpen size={14} />
                Quick Guide
              </div>
              <h2 id="v3-quick-guide-title" className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Five Steps
              </h2>
              <p className="mt-3 max-w-3xl text-xs leading-6 text-blue-100/80 md:text-base">
                Connect, configure, invite, play, conclude.
              </p>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close quick guide"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-8 md:px-8 md:py-7 md:pb-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
            {QUICK_GUIDE_STEPS.map(({ number, title, description, Icon }) => (
              <article
                key={number}
                className={`group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,opacity] duration-300 hover:-translate-y-1 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                    Step {number}
                  </span>
                  <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                    <Icon size={18} />
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-white">
                  {title}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-blue-100/80">
                  {description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex justify-start">
            <a
              href="#user-manual"
              onClick={handleUserManualLinkClick}
              className="inline-flex font-semibold text-cyan-200 underline decoration-cyan-300/60 underline-offset-4 transition-colors hover:text-cyan-100"
            >
              User Manual
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickGuideModal;
