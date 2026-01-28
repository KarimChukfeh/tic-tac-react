/**
 * GamesCard - Collapsible component showing games navigation
 *
 * Displays a list of available games with navigation links.
 * Current game link is disabled.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const GamesCard = ({
  currentGame, // 'home', 'tictactoe', 'connect4', 'chess'
  onHeightChange,
  isExpanded: externalIsExpanded, // External control for mobile single-panel coordination
  onToggleExpand, // External toggle handler
  hideOnMobile = false, // Hide this panel on mobile when another panel is expanded
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const expandedPanelRef = useRef(null);
  const navigate = useNavigate();

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      // External control: only toggle if needed
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      // Internal control
      setInternalIsExpanded(value);
    }
  };

  // Track screen size for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Measure and report height whenever content changes
  useEffect(() => {
    if (isExpanded && expandedPanelRef.current && onHeightChange) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.target.offsetHeight;
          onHeightChange(height);
        }
      });

      observer.observe(expandedPanelRef.current);

      // Report initial height immediately
      onHeightChange(expandedPanelRef.current.offsetHeight);

      return () => observer.disconnect();
    } else if (!isExpanded && onHeightChange) {
      // When collapsed, report 0
      onHeightChange(0);
    }
  }, [isExpanded, onHeightChange]);

  // Desktop positioning (top-left, vertical)
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels

  // Game options
  const games = [
    { name: 'Homepage', path: '/', id: 'home', emoji: '🏠' },
    { name: 'TicTacToe', path: '/tictactoe', id: 'tictactoe', emoji: '✖️' },
    { name: 'Connect Four', path: '/connect4', id: 'connect4', emoji: '🔴' },
    { name: 'Chess', path: '/chess', id: 'chess', emoji: '♟️' },
  ];

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16`}
      style={{
        // On desktop: use top positioning
        top: isDesktop ? `${BASE_TOP_DESKTOP}px` : undefined
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => handleSetExpanded(!isExpanded)}
        className={`max-md:mx-auto rounded-full p-2.5 md:p-4 border-2 transition-all hover:scale-110 shadow-xl relative group bg-gradient-to-br from-slate-700 to-slate-800 ${
          isExpanded
            ? 'border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.6)] scale-105'
            : 'border-slate-600/70 hover:border-slate-500'
        }`}
        aria-label={isExpanded ? "Close games" : "Open games"}
      >
        <img
          src="/games-icon.png"
          alt="Games"
          className="w-[18px] h-[18px] md:w-6 md:h-6"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        {/* Tooltip - Desktop only */}
        <div className="max-md:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-cyan-400/30">
          Games
        </div>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/30 shadow-2xl md:w-[464px] max-h-[calc(100vh-7rem)] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-cyan-500/60 [&::-webkit-scrollbar-thumb]:to-blue-500/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-cyan-400/30 hover:[&::-webkit-scrollbar-thumb]:from-cyan-500/80 hover:[&::-webkit-scrollbar-thumb]:to-blue-500/80"
        >
          {/* Content - Games List */}
          <div className="p-3">
            <div className="space-y-1.5">
              {games.map((game) => {
                const isCurrent = currentGame === game.id;

                return (
                  <Link
                    key={game.id}
                    to={game.path}
                    onClick={(e) => {
                      if (isCurrent) {
                        e.preventDefault();

                        // Always navigate to ensure we're on the game's home view (not a sub-view like tournament bracket)
                        // The replace option keeps the browser history clean
                        navigate(game.path, {
                          replace: true,
                          state: { scrollToLiveInstances: true }
                        });

                        // Close the games panel after clicking
                        handleSetExpanded(false);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${
                      isCurrent
                        ? 'bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 hover:border-cyan-400/60'
                        : 'bg-slate-700/40 border border-slate-600/40 hover:bg-cyan-500/20 hover:border-cyan-400/40'
                    }`}
                  >
                    <span className="text-lg">{game.emoji}</span>
                    <span className={`font-medium text-sm transition-colors ${
                      isCurrent ? 'text-cyan-200' : 'text-white group-hover:text-cyan-200'
                    }`}>
                      {game.name}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-cyan-300">(Current)</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesCard;
