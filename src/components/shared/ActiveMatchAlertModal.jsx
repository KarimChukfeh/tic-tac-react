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
    <div className="fixed top-0 left-0 right-0 z-[70] p-4">
      <div className="max-w-3xl mx-auto bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-xl shadow-2xl border-2 border-amber-600/50">
        <div className="flex flex-col gap-4 p-4 md:p-6">
          {/* Top Section - Info */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-white">
              <h3 className="font-bold text-lg md:text-xl">
                Time to Play!
              </h3>
              <p className="text-sm md:text-base text-amber-100">
                Active match vs{' '}
                <span className="font-mono font-semibold text-amber-200">
                  {match.opponent?.slice(0, 6)}...{match.opponent?.slice(-4)}
                </span>
                {match.isMyTurn && (
                  <span className="ml-2 font-semibold text-yellow-300">— It's your turn!</span>
                )}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleGoToMatch}
                className="bg-white hover:bg-yellow-50 text-amber-900 font-semibold py-2 px-4 rounded-lg shadow-lg hover:scale-105 transition-all duration-200"
              >
                Go to Match
              </button>
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveMatchAlertModal;
