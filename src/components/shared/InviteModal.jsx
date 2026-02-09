import React from 'react';
import { Trophy, Wallet, X } from 'lucide-react';

/**
 * InviteModal - Full-screen modal for tournament invitations
 * Displays a prominent, centered modal when a user arrives via invite link without wallet connected
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

  // Generate tournament type label (e.g., "Chess Duel", "Connect Four 8-Player Tournament")
  const getTournamentLabel = () => {
    if (playerCount === 2) {
      return `${gameName} Duel`;
    } else {
      return `${gameName} ${playerCount}-Player Tournament`;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className={`rounded-2xl p-8 shadow-2xl border-2 ${
          isElite
            ? 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[#d4a012]'
            : 'bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 border-purple-400'
        }`}>
          {/* Trophy Icon */}
          <div className="flex justify-center mb-6">
            <div className={`rounded-full p-4 ${
              isElite ? 'bg-[#fff8e7]/20' : 'bg-white/20'
            }`}>
              <Trophy
                className={isElite ? 'text-[#fff8e7]' : 'text-yellow-400'}
                size={48}
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-bold text-center mb-4 ${
            isElite ? 'text-[#fff8e7]' : 'text-white'
          }`}>
            Tournament Invitation
          </h2>

          {/* Description */}
          <div className={`text-center mb-8 space-y-2 ${
            isElite ? 'text-[#f5e6c8]' : 'text-purple-100'
          }`}>
            <p className="text-lg font-semibold">
              You've been invited to join
            </p>
            <p className={`text-2xl font-bold ${
              isElite ? 'text-[#fff8e7]' : 'text-white'
            }`}>
              {getTournamentLabel()}
            </p>
            <p className="text-base mt-4">
              Connect your wallet to view tournament details and enroll!
            </p>
          </div>

          {/* Connect Wallet Button */}
          <button
            onClick={onConnect}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              isElite
                ? 'bg-[#fff8e7] hover:bg-white text-[#d97706] hover:scale-105 shadow-lg'
                : 'bg-white hover:bg-gray-100 text-purple-600 hover:scale-105 shadow-lg'
            }`}
          >
            <Wallet size={24} />
            Connect Wallet
          </button>

          {/* Helper Text */}
          <p className={`text-center text-sm mt-6 ${
            isElite ? 'text-[#f5e6c8]/80' : 'text-purple-200/80'
          }`}>
            Don't have a wallet? We recommend MetaMask
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
