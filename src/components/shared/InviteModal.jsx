import React from 'react';
import { Trophy, Wallet, X } from 'lucide-react';

/**
 * InviteModal - Top banner for tournament invitations
 * Displays a prominent banner at the top when a user arrives via invite link without wallet connected
 *
 * @param {Object} props
 * @param {Object} props.tournamentParams - Tournament parameters { tierId, instanceId }
 * @param {Function} props.onConnect - Callback to connect wallet
 * @param {boolean} props.isElite - Whether this is an elite tournament (for Chess)
 * @param {string} props.gameName - Game name (e.g., "Tic-Tac-Toe", "Chess", "Connect Four")
 * @param {number} props.playerCount - Number of players in this tournament tier
 */
const InviteModal = ({ tournamentParams, onConnect, isElite = false, gameName = "Tournament", playerCount = 2 }) => {
  if (!tournamentParams) return null;

  const { tierId, instanceId } = tournamentParams;

  // Generate tournament type label (e.g., "duel", "4-player tournament")
  const getTournamentType = () => {
    if (playerCount === 2) {
      return 'duel';
    } else {
      return `${playerCount}-player tournament`;
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-4">
      {/* Banner Content */}
      <div className={`max-w-3xl mx-auto rounded-xl shadow-2xl border-2 ${
        isElite
          ? 'bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[#d4a012]'
          : 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border-purple-400'
      }`}>
        <div className="flex flex-col gap-4 p-4 md:p-6">
          {/* Top Section - Trophy & Info */}
          <div className="flex items-center gap-4">
            {/* Trophy Icon */}
            <div className={`rounded-full p-3 flex-shrink-0 ${
              isElite ? 'bg-[#fff8e7]/20' : 'bg-white/20'
            }`}>
              <Trophy
                className={isElite ? 'text-[#fff8e7]' : 'text-yellow-400'}
                size={32}
                strokeWidth={2}
              />
            </div>

            {/* Text Content */}
            <div className={isElite ? 'text-[#fff8e7]' : 'text-white'}>
              <h3 className="font-bold text-lg md:text-xl">
                You're Invited to Play {gameName}
              </h3>
              <p className={`text-sm md:text-base ${
                isElite ? 'text-[#f5e6c8]' : 'text-purple-100'
              }`}>
                Connect your wallet to join this <span className="font-semibold">{getTournamentType()}</span>!
              </p>
            </div>
          </div>

          {/* Bottom Section - Full Width Connect Button */}
          <button
            onClick={onConnect}
            className={`w-full py-2 md:py-4 px-6 rounded-lg font-extrabold text-lg md:text-xl transition-all flex items-center justify-center gap-2 ${
              isElite
                ? 'bg-[#fff8e7] hover:bg-white text-[#d97706] hover:scale-105 shadow-lg'
                : 'bg-white hover:bg-gray-100 text-purple-600 hover:scale-105 shadow-lg'
            }`}
          >
            <Wallet size={24} />
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
