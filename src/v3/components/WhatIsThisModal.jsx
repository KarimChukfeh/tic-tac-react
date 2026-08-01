import { useEffect, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

const WHAT_IS_THIS_TRANSITION_MS = 220;

const WhatIsThisModal = ({ isOpen, onClose, onOpenQuickGuide, gameTitle }) => {
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

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  const handleQuickGuideLinkClick = (event) => {
    event.preventDefault();
    onClose();
    window.setTimeout(() => {
      onOpenQuickGuide();
    }, WHAT_IS_THIS_TRANSITION_MS);
  };

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v3-what-is-this-title"
        tabIndex={-1}
        className={`relative z-10 my-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(2,6,23,0.97)_0%,rgba(23,37,84,0.94)_45%,rgba(88,28,135,0.92)_100%)] shadow-[0_30px_120px_rgba(8,145,178,0.28)] transition-[opacity,transform] duration-[220ms] ease-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-[0.985] opacity-0'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-4 md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div id="v3-what-is-this-title" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <BookOpen size={14} />
                What&apos;s This?
              </div>
              <div className="mt-3 max-w-2xl space-y-4 text-sm leading-7 text-blue-100/80 md:text-base">
                <p className="text-white">
                  This is fully on-chain {gameTitle} competition.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Configure your lobby (2–32 players)</li>
                  <li>Set the ETH entry fee per player</li>
                  <li>Share the invite link with your opponents</li>
                  <li>Winners advance through the bracket</li>
                  <li>Finals&apos; winner takes the ETH prize pool</li>
                </ul>
                <a
                  href="#"
                  onClick={handleQuickGuideLinkClick}
                  className="inline-flex font-semibold text-cyan-200 underline decoration-cyan-300/60 underline-offset-4 transition-colors hover:text-cyan-100"
                >
                  Quick Guide
                </a>
              </div>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close what is this dialog"
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
