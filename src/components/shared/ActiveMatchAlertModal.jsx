import React from 'react';

// Tier configuration to determine tournament type
const TIER_CONFIG = {
  0: { playerCount: 2 },
  1: { playerCount: 4 },
  2: { playerCount: 8 }
};

const ActiveMatchAlertModal = ({ match, onClose, onEnterMatch }) => {
  if (!match) return null;

  const handleGoToMatch = () => {
    // Call the parent's onEnterMatch handler (handlePlayMatch from the game component)
    if (onEnterMatch) {
      onEnterMatch(match.tierId, match.instanceId, match.roundIdx, match.matchIdx);
    }
    onClose();
  };

  const tierNames = {
    0: 'Tic-Tac-Toe',
    1: 'Chess',
    2: 'Connect Four'
  };

  // Determine if it's a duel or tournament
  const playerCount = TIER_CONFIG[match.tierId]?.playerCount || 2;
  const tournamentType = playerCount === 2 ? 'Duel' : 'Tournament';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-amber-700 to-amber-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-amber-600/50">
        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          Time to Play!
        </h2>

        {/* Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 mb-5">
          <p className="text-lg text-white text-center mb-4">
            You're in an active match vs{' '}
            <span className="font-mono font-semibold text-amber-200">
              {match.opponent?.slice(0, 6)}...{match.opponent?.slice(-4)}
            </span>
          </p>

          {match.isMyTurn && (
            <div className="pt-2">
              <p className="text-center text-amber-100 font-semibold">
                It's your turn
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGoToMatch}
            className="flex-1 bg-white hover:bg-yellow-50 text-amber-900 font-semibold py-3 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Go to Match
          </button>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg backdrop-blur-sm transition-all duration-200"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveMatchAlertModal;
