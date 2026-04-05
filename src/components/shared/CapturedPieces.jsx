/**
 * CapturedPieces - Component for displaying pieces captured by a player
 *
 * Shows pieces a player has captured from their opponent, grouped by type (e.g., "3x♙ 1x♗")
 *
 * Props:
 *   capturedPieces - array of piece type numbers (opponent's pieces this player captured)
 *   color          - color of the captured pieces (opponent's color)
 *   collapsible    - when true (mobile): collapsed by default, showing only a
 *                    "show {n}x captured ▾" toggle; tap to expand the full piece list
 */

import { useState } from 'react';

const PIECE_ICONS = {
  white: {
    1: '/chess-pieces/pawn-w.svg',
    2: '/chess-pieces/knight-w.svg',
    3: '/chess-pieces/bishop-w.svg',
    4: '/chess-pieces/rook-w.svg',
    5: '/chess-pieces/queen-w.svg',
    6: '/chess-pieces/king-w.svg'
  },
  black: {
    1: '/chess-pieces/pawn-b.svg',
    2: '/chess-pieces/knight-b.svg',
    3: '/chess-pieces/bishop-b.svg',
    4: '/chess-pieces/rook-b.svg',
    5: '/chess-pieces/queen-b.svg',
    6: '/chess-pieces/king-b.svg'
  }
};

const PIECE_NAMES = {
  1: 'Pawn',
  2: 'Knight',
  3: 'Bishop',
  4: 'Rook',
  5: 'Queen',
  6: 'King'
};

const CapturedPieces = ({ capturedPieces, color, collapsible = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (nextValue) => {
    setIsExpanded(nextValue);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  };

  if (!capturedPieces || capturedPieces.length === 0) {
    return null;
  }

  // Count pieces by type
  const pieceCounts = {};
  capturedPieces.forEach(pieceType => {
    pieceCounts[pieceType] = (pieceCounts[pieceType] || 0) + 1;
  });

  // Sort by piece value/importance (pawns first, then knights, bishops, rooks, queens, kings)
  const sortedPieces = Object.entries(pieceCounts).sort((a, b) => {
    return parseInt(a[0]) - parseInt(b[0]);
  });

  const icons = color === 'white' ? PIECE_ICONS.white : PIECE_ICONS.black;
  const totalCount = capturedPieces.length;

  const pieceBadges = sortedPieces.map(([pieceType, count]) => (
    <div
      key={pieceType}
      className="flex items-center gap-0.5 bg-slate-700/50 rounded px-1 py-0.5"
      title={`${count} ${PIECE_NAMES[pieceType]}${count > 1 ? 's' : ''}`}
    >
      <span className="text-[11px] font-bold text-gray-300">{count}x</span>
      <img
        src={icons[pieceType]}
        alt={PIECE_NAMES[pieceType]}
        className="w-3.5 h-3.5"
        draggable="false"
      />
    </div>
  ));

  const chevron = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Non-collapsible (desktop): single inline row with "Lost:" prefix
  if (!collapsible) {
    return (
      <div className="bg-slate-800/30 rounded-lg px-2 py-1 border border-gray-600/30">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] text-gray-400 font-semibold">Captured:</span>
          {pieceBadges}
        </div>
      </div>
    );
  }

  // Collapsible (mobile): toggle replaces the entire "Lost:" + pieces section
  return (
    <div className="bg-slate-800/30 rounded-lg px-2 py-1 border border-gray-600/30">
      {isExpanded ? (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {pieceBadges}
          </div>
          <button
            onClick={() => toggleExpanded(false)}
            className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors w-full justify-end"
            aria-label="Collapse lost pieces"
          >
            <span>hide {totalCount}x captured</span>
            {chevron}
          </button>
        </>
      ) : (
        <button
          onClick={() => toggleExpanded(true)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors w-full"
          aria-label="Show lost pieces"
        >
          <span className="font-semibold">{totalCount}x captured</span>
          {chevron}
        </button>
      )}
    </div>
  );
};

export default CapturedPieces;
