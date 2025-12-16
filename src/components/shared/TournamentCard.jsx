/**
 * Shared TournamentCard Component
 *
 * Displays a tournament instance card with enrollment info, escalation timers, and action buttons.
 * Used in the tournament list view across all games.
 */

import { useState, useEffect } from 'react';
import { Trophy, Play, Users, Zap, Coins, Eye } from 'lucide-react';
import { ethers } from 'ethers';
import EscalationTimer from './EscalationTimer';

// Default color theme (purple/blue - TicTacToe style)
const DEFAULT_COLORS = {
  cardBg: 'from-purple-600/20 to-blue-600/20',
  cardBorder: 'border-purple-400/40 hover:border-purple-400/70',
  cardShadow: 'hover:shadow-purple-500/20',
  icon: 'text-purple-400',
  text: 'text-purple-300',
  textMuted: 'text-purple-300/70',
  progress: 'from-purple-500 to-blue-500',
  buttonEnter: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
  fullBadgeBg: 'bg-red-500/20',
  fullBadgeBorder: 'border-red-400',
  fullBadgeText: 'text-red-300',
};

/**
 * @param {Object} props
 * @param {number} props.tierId - Tournament tier ID
 * @param {number} props.instanceId - Tournament instance ID
 * @param {number} props.maxPlayers - Maximum players allowed
 * @param {number} props.currentEnrolled - Current number of enrolled players
 * @param {string} props.entryFee - Entry fee in ETH
 * @param {boolean} props.isEnrolled - Whether current user is enrolled
 * @param {Function} props.onEnroll - Handler for enrollment
 * @param {Function} props.onEnter - Handler for entering/viewing tournament
 * @param {boolean} props.loading - Loading state
 * @param {string} props.tierName - Display name for the tier
 * @param {Object|null} props.enrollmentTimeout - Enrollment timeout data
 * @param {Function} props.onManualStart - Handler for force starting tournament
 * @param {Function} [props.onClaimAbandonedPool] - Handler for claiming abandoned pool
 * @param {number} props.tournamentStatus - Tournament status (0=enrollment, 1=active, 2+=completed)
 * @param {string|null} props.account - Current user's wallet address
 * @param {Object} [props.colors] - Custom color theme
 */
const TournamentCard = ({
  tierId,
  instanceId,
  maxPlayers,
  currentEnrolled,
  entryFee,
  isEnrolled,
  onEnroll,
  onEnter,
  loading,
  tierName,
  enrollmentTimeout,
  onManualStart,
  onClaimAbandonedPool,
  tournamentStatus,
  account,
  colors: customColors,
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  // Merge custom colors with defaults
  const colors = { ...DEFAULT_COLORS, ...customColors };

  // Escalation system state (for enrollment force-start)
  const [escalationState, setEscalationState] = useState({
    activeEscalation: 0,
    canStartEscalation1: false,
    canStartEscalation2: false,
    timeToEscalation1: 0,
    timeToEscalation2: 0,
    forfeitPool: 0n
  });

  useEffect(() => {
    if (!enrollmentTimeout) {
      setEscalationState({
        activeEscalation: 0,
        canStartEscalation1: false,
        canStartEscalation2: false,
        timeToEscalation1: 0,
        timeToEscalation2: 0,
        forfeitPool: 0n
      });
      return;
    }

    const updateEscalationState = () => {
      const now = Math.floor(Date.now() / 1000);
      const escalation1Start = Number(enrollmentTimeout.escalation1Start);
      const escalation2Start = Number(enrollmentTimeout.escalation2Start);
      const forfeitPool = enrollmentTimeout.forfeitPool || 0n;

      const timeToEscalation1 = escalation1Start > 0 ? Math.max(0, escalation1Start - now) : 0;
      const timeToEscalation2 = escalation2Start > 0 ? Math.max(0, escalation2Start - now) : 0;

      const canStartEscalation1 = escalation1Start > 0 && now >= escalation1Start;
      const canStartEscalation2 = escalation2Start > 0 && now >= escalation2Start;

      let activeEscalation = 0;
      if (canStartEscalation2) {
        activeEscalation = 2;
      } else if (canStartEscalation1) {
        activeEscalation = 1;
      }

      setEscalationState({
        activeEscalation,
        canStartEscalation1,
        canStartEscalation2,
        timeToEscalation1,
        timeToEscalation2,
        forfeitPool
      });
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 1000);

    return () => clearInterval(interval);
  }, [enrollmentTimeout]);

  return (
    <div className={`bg-gradient-to-br ${colors.cardBg} backdrop-blur-lg rounded-2xl p-6 border-2 ${colors.cardBorder} transition-all hover:shadow-xl ${colors.cardShadow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className={colors.icon} size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">
              {tierName || `Tier ${tierId}`}
            </h3>
            <div className={`text-xs ${colors.textMuted}`}>Instance #{instanceId + 1}</div>
          </div>
        </div>
        {isFull && (
          <div className={`${colors.fullBadgeBg} border ${colors.fullBadgeBorder} px-3 py-1 rounded-full`}>
            <span className={`${colors.fullBadgeText} text-xs font-bold`}>FULL</span>
          </div>
        )}
        {!isFull && !isEnrolled && (
          <div className="bg-green-500/20 border border-green-400 px-3 py-1 rounded-full">
            <span className="text-green-300 text-xs font-bold">OPEN</span>
          </div>
        )}
        {isEnrolled && (
          <div className="bg-blue-500/20 border border-blue-400 px-3 py-1 rounded-full">
            <span className="text-blue-300 text-xs font-bold">ENROLLED</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className={colors.text} size={16} />
            <span className={`${colors.text} text-xs font-semibold`}>Players</span>
          </div>
          <div className="text-white font-bold text-lg">
            {currentEnrolled} / {maxPlayers}
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="text-yellow-300" size={16} />
            <span className="text-yellow-300 text-xs font-semibold">Entry Fee</span>
          </div>
          <div className="text-white font-bold text-lg">
            {entryFee} ETH
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className={`flex justify-between text-xs ${colors.text} mb-1`}>
          <span>Enrollment</span>
          <span>{enrollmentPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colors.progress} transition-all duration-500 rounded-full`}
            style={{ width: `${enrollmentPercentage}%` }}
          />
        </div>
      </div>

      {/* Enrollment Escalation System */}
      <EscalationTimer
        escalationState={escalationState}
        enrollmentTimeout={enrollmentTimeout}
      />

      {/* Action Buttons */}
      {/* Escalation 1: Enrolled players can force start */}
      {tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
        <button
          onClick={() => onManualStart(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mb-2"
        >
          <Zap size={18} />
          {loading ? 'Starting...' : !account ? 'Connect Wallet to Force Start' : 'Force Start Tournament'}
        </button>
      )}

      {/* Escalation 2: Anyone can claim abandoned pool */}
      {tournamentStatus === 0 && escalationState.canStartEscalation2 && onClaimAbandonedPool && (
        <button
          onClick={() => onClaimAbandonedPool(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mb-2"
        >
          <Coins size={18} />
          {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : 'Claim Abandoned Pool'}
        </button>
      )}

      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading || !account}
          className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
        >
          <Play size={18} />
          {loading ? 'Loading...' : !account ? 'Connect Wallet to Enter' : 'Enter Tournament'}
        </button>
      ) : (
        <>
          {/* Enroll button for non-enrolled users (only during enrollment phase) */}
          {tournamentStatus === 0 && !isFull && (
            <button
              onClick={onEnroll}
              disabled={loading || !account}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <Trophy size={18} />
              {loading ? 'Enrolling...' : !account ? 'Connect Wallet to Enroll' : 'Enroll Now'}
            </button>
          )}

          {/* Enter Tournament / View Bracket button for non-enrolled users */}
          <button
            onClick={onEnter}
            disabled={loading}
            className={`w-full ${tournamentStatus === 0 && !isFull ? 'mt-2' : ''} bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 border ${colors.cardBorder}`}
          >
            <Eye size={18} />
            {loading ? 'Loading...' : 'View Tournament'}
          </button>
        </>
      )}

      {/* Abandoned Pool Claim Button - show for completed/abandoned tournaments with claimable funds */}
      {onClaimAbandonedPool && tournamentStatus >= 2 &&
        escalationState.forfeitPool && escalationState.forfeitPool > 0n && (
        <button
          onClick={() => onClaimAbandonedPool(tierId, instanceId)}
          disabled={loading || !account}
          className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Coins size={18} />
          {loading ? 'Claiming...' : !account ? 'Connect Wallet to Claim' : `Claim Pool (${ethers.formatEther(escalationState.forfeitPool)} ETH)`}
        </button>
      )}
    </div>
  );
};

export default TournamentCard;
