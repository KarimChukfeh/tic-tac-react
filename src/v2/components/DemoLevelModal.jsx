import { useEffect, useState } from 'react';
import { Bot, Gamepad2, X } from 'lucide-react';

const TRANSITION_MS = 220;

export default function DemoLevelModal({
  isOpen,
  level,
  minLevel,
  maxLevel,
  step = 25,
  onChange,
  onClose,
  onStart,
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const safeLevel = Math.min(maxLevel, Math.max(minLevel, Number(level) || minLevel));
  const progress = ((safeLevel - minLevel) / Math.max(1, maxLevel - minLevel)) * 100;
  const sliderBackground = {
    background: `linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(168,85,247,0.95) ${progress}%, rgba(51,65,85,0.75) ${progress}%, rgba(51,65,85,0.35) 100%)`,
  };

  useEffect(() => {
    let timeoutId = null;
    let frameId = null;

    if (isOpen) {
      setShouldRender(true);
      frameId = window.requestAnimationFrame(() => setIsVisible(true));
    } else if (shouldRender) {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => setShouldRender(false), TRANSITION_MS);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto p-4 md:p-6">
      <button
        type="button"
        aria-label="Close demo level modal"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-[220ms] ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-level-title"
        className={`relative z-10 my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(2,6,23,0.97)_0%,rgba(23,37,84,0.94)_45%,rgba(88,28,135,0.92)_100%)] shadow-[0_30px_120px_rgba(8,145,178,0.28)] transition-[opacity,transform] duration-[220ms] ease-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-5 scale-[0.985] opacity-0'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Bot size={14} />
                Demo Level
              </div>
              <h2 id="demo-level-title" className="mt-3 text-2xl font-bold text-white md:text-3xl">
                Computer Rating
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close demo level modal"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 md:px-6 md:py-6">
          <div className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(56,189,248,0.08)] md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span className="text-sm text-purple-200">Demo Level</span>
              <output className="text-3xl font-semibold text-white md:text-4xl">{safeLevel} ELO</output>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4">
              <input
                type="range"
                min={String(minLevel)}
                max={String(maxLevel)}
                step={String(step)}
                value={safeLevel}
                aria-label="Demo level"
                aria-valuetext={`${safeLevel} ELO`}
                onChange={event => onChange(Number(event.target.value))}
                className="entry-fee-slider w-full"
                style={sliderBackground}
              />

              <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <span>{minLevel}</span>
                <span>500</span>
                <span>1000</span>
                <span>1500</span>
                <span>{maxLevel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-400/15 px-5 py-2.5 text-sm font-bold text-cyan-50 transition-colors hover:border-cyan-200 hover:bg-cyan-400/25"
          >
            <Gamepad2 size={18} />
            Start Demo
          </button>
        </div>
      </section>
    </div>
  );
}
