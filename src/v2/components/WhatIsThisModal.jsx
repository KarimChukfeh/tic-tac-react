import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';

const WHAT_IS_THIS_TRANSITION_MS = 220;

const WhatIsThisModal = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

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
      }, WHAT_IS_THIS_TRANSITION_MS);
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
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto p-4 md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close what is this modal"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-[220ms] ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative z-10 my-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(2,6,23,0.97)_0%,rgba(23,37,84,0.94)_45%,rgba(88,28,135,0.92)_100%)] shadow-[0_30px_120px_rgba(8,145,178,0.28)] transition-[opacity,transform] duration-[220ms] ease-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-[0.985] opacity-0'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-4 md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <BookOpen size={14} />
                What&apos;s This?
              </div>
              <div className="mt-3 max-w-2xl space-y-4 text-sm leading-7 text-blue-100/80 md:text-base">
                <p className="font-semibold text-white">
                  This is a fully on-chain gaming platform.
                </p>
                <p>
                  You compete in skill-based games against real opponents over real ETH stakes.
                </p>
                <p>
                  You create your lobby, set your ETH entry fee, and invite whoever you want to challenge.
                </p>
                <p>
                  Winners advance through the bracket until the champion takes the entire ETH prize pool, paid instantly to their wallet.
                </p>
                <p className="font-semibold text-white">
                  No one can change these rules.
                </p>
                <p className="font-semibold text-white">
                  Every outcome is permanent.
                </p>
                <p className="font-semibold text-white">
                  Every payout is instant.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIsThisModal;
