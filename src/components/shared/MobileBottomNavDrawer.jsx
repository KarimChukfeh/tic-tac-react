import { ChevronDown, ChevronUp, TrendingUp, Users, Zap } from 'lucide-react';

export default function MobileBottomNavDrawer({ enabled = false, expanded = true, onToggle, children }) {
  const containerClassName = 'md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-t border-purple-400/30';

  if (!enabled) {
    return (
      <div className={`${containerClassName} px-4 py-2.5 flex items-center justify-between`}>
        {children}
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className={`${containerClassName} px-4 py-1`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand bottom navigation"
          className="flex w-full items-center justify-center gap-2 rounded-full py-0.5 text-purple-200 transition-colors hover:text-white"
        >
          <ChevronUp size={18} />
          <div className="flex items-center gap-1.5 text-white/70" aria-hidden="true">
            <img
              src="/games-icon.png"
              alt=""
              className="h-2.5 w-2.5"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.75 }}
            />
            <Users size={11} />
            <TrendingUp size={11} />
            <Zap size={11} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-center pt-1">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse bottom navigation"
          className="flex items-center justify-center rounded-full p-0.5 text-purple-200 transition-colors hover:text-white"
        >
          <ChevronDown size={18} />
        </button>
      </div>
      <div className="px-4 pb-2.5 flex items-center justify-between">
        {children}
      </div>
    </div>
  );
}
