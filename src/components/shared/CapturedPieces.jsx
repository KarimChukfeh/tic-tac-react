/**
 * CapturedPieces - Component for displaying captured chess pieces
 *
 * Shows pieces lost by a player, grouped by type with count (e.g., "3x♙ 1x♗")
 */

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

const CapturedPieces = ({ capturedPieces, color }) => {
  const colorLabel = color === 'white' ? 'White' : 'Black';

  if (!capturedPieces || capturedPieces.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-lg p-2 border border-gray-600/30">
        <div className="text-xs text-gray-400 mb-1 font-semibold">{colorLabel} Lost Pieces</div>
        <div className="text-xs text-gray-500 italic">None</div>
      </div>
    );
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

  return (
    <div className="bg-slate-800/30 rounded-lg p-2 border border-gray-600/30">
      <div className="text-xs text-gray-400 mb-1.5 font-semibold">{colorLabel} Lost Pieces</div>
      <div className="flex flex-wrap gap-2 items-center">
        {sortedPieces.map(([pieceType, count]) => (
          <div
            key={pieceType}
            className="flex items-center gap-1 bg-slate-700/50 rounded px-1.5 py-0.5"
            title={`${count} ${PIECE_NAMES[pieceType]}${count > 1 ? 's' : ''}`}
          >
            <span className="text-xs font-bold text-gray-300">{count}x</span>
            <img
              src={icons[pieceType]}
              alt={PIECE_NAMES[pieceType]}
              className="w-5 h-5"
              draggable="false"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CapturedPieces;
