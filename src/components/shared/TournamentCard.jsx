/**
 * Shared TournamentCard Component
 *
 * Displays a tournament instance card with enrollment info, escalation timers, and action buttons.
 * Used in the tournament list view across all games.
 */

import { useState, useEffect } from 'react';
import { Trophy, Play, Users, Zap, Coins, Eye, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import EscalationTimer from './EscalationTimer';
import { formatTime, getTournamentTypeLabel } from '../../utils/formatters';

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
 * @param {string} props.prizePool - Total prize pool in ETH
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
 * @param {Function} [props.onResetEnrollmentWindow] - Handler for resetting enrollment window
 * @param {Object} [props.contract] - Contract instance for calling canResetEnrollmentWindow
 */
const TournamentCard = ({
  tierId,
  instanceId,
  maxPlayers,
  currentEnrolled,
  entryFee,
  prizePool,
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
  onResetEnrollmentWindow,
  contract,
}) => {
  const isFull = currentEnrolled >= maxPlayers;
  const enrollmentPercentage = (currentEnrolled / maxPlayers) * 100;

  // Merge custom colors with defaults
  const colors = { ...DEFAULT_COLORS, ...customColors };

  // Determine tournament type label (Duel vs Tournament)
  const tournamentTypeLabel = getTournamentTypeLabel(maxPlayers);

  // Escalation system state (for enrollment force-start)
  const [escalationState, setEscalationState] = useState({
    activeEscalation: 0,
    canStartEscalation1: false,
    canStartEscalation2: false,
    timeToEscalation1: 0,
    timeToEscalation2: 0,
    forfeitPool: 0n
  });

  // EL1* - Reset enrollment window state
  const [canResetWindow, setCanResetWindow] = useState(false);

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

    const updateEscalationState = async () => {
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

      // Check canResetEnrollmentWindow every second when enrollment window expires
      // Continue checking even when EL2 is active - solo player can still reset
      if ((canStartEscalation1 || canStartEscalation2) && isEnrolled && contract) {
        try {
          const canReset = await contract.canResetEnrollmentWindow(tierId, instanceId);
          console.log(`[TournamentCard T${tierId}I${instanceId}] canResetEnrollmentWindow:`, canReset, {
            currentEnrolled,
            maxPlayers,
            canStartEscalation1,
            canStartEscalation2,
            isEnrolled,
            hasContract: !!contract,
            escalation1Start: escalation1Start,
            escalation2Start: escalation2Start,
            now,
            activeEscalation
          });
          setCanResetWindow(canReset);
        } catch (error) {
          console.error(`[TournamentCard T${tierId}I${instanceId}] Error checking canResetEnrollmentWindow:`, error);
          setCanResetWindow(false);
        }
      } else {
        if (!canStartEscalation1 && !canStartEscalation2) {
          // Reset the flag only when both escalation windows are cleared
          setCanResetWindow(false);
        }
        // Debug: log why we're not checking
        if (canStartEscalation1 || canStartEscalation2) {
          console.log(`[TournamentCard T${tierId}I${instanceId}] Not checking canResetEnrollmentWindow:`, {
            canStartEscalation1,
            canStartEscalation2,
            isEnrolled,
            hasContract: !!contract
          });
        }
      }
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 1000);

    return () => clearInterval(interval);
  }, [enrollmentTimeout, isEnrolled, contract, tierId, instanceId]);

  return (
    <div className={`bg-gradient-to-br ${colors.cardBg} backdrop-blur-lg rounded-2xl p-6 border-2 ${colors.cardBorder} transition-all hover:shadow-xl ${colors.cardShadow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className={colors.icon} size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">
              {tierName || `Tier ${tierId + 1}`}
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

      {/* Tournament Status Badge */}
      {(tournamentStatus === 0 && currentEnrolled > 0) || tournamentStatus >= 1 ? (
        <div className="mb-4">
          {tournamentStatus === 0 && currentEnrolled > 0 && (
            <div className={`${
              isEnrolled && escalationState.canStartEscalation2
                ? 'bg-red-500/20 border-red-400'
                : 'bg-yellow-500/20 border-yellow-400'
            } border rounded-lg p-3`}>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 ${
                  isEnrolled && escalationState.canStartEscalation2
                    ? 'bg-red-400'
                    : 'bg-yellow-400'
                } rounded-full animate-pulse`}></div>
                <span className={`${
                  isEnrolled && escalationState.canStartEscalation2
                    ? 'text-red-300'
                    : 'text-yellow-300'
                } font-bold text-sm`}>Waiting for more players</span>
              </div>
              {isEnrolled && escalationState.timeToEscalation2 > 0 && escalationState.canStartEscalation1 && (
                <div className="text-center mt-1">
                  <span className="text-yellow-300/70 text-[10px]">
                    {formatTime(escalationState.timeToEscalation2)} until considered abandoned
                  </span>
                </div>
              )}
              {isEnrolled && escalationState.canStartEscalation2 && (
                <div className="text-center mt-1">
                  <a
                    href="#el2"
                    className="text-red-300 hover:text-red-200 text-[10px] underline underline-offset-[2px]"
                  >
                    Abandoned! (EL2 active)
                  </a>
                </div>
              )}
            </div>
          )}
          {tournamentStatus === 1 && (
            <div className="bg-green-500/20 border border-green-400 rounded-lg p-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-bold text-sm">In Progress</span>
            </div>
          )}
          {tournamentStatus >= 2 && (
            <div className="bg-gray-500/20 border border-gray-400 rounded-lg p-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-300 font-bold text-sm">Completed</span>
            </div>
          )}
        </div>
      ) : null}

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

      {/* Prize Pool Display - Only when at least 1 player enrolled */}
      {currentEnrolled > 0 && (
        <div className="mb-6">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="text-yellow-300" size={16} />
              <span className="text-yellow-300 text-xs font-semibold">Current Prize Pool</span>
            </div>
            <div className="text-white font-bold text-lg">
              {prizePool} ETH
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Escalation System */}
      <EscalationTimer
        escalationState={escalationState}
        enrollmentTimeout={enrollmentTimeout}
        isEnrolled={isEnrolled}
      />

      {/* Action Buttons */}
      {/* EL1*: Reset Enrollment Window - Solo player can extend enrollment */}
      {tournamentStatus === 0 && currentEnrolled === 1 && isEnrolled && escalationState.canStartEscalation1 && onResetEnrollmentWindow && (
        <div className="mb-4">
          <button
            onClick={() => onResetEnrollmentWindow(tierId, instanceId)}
            disabled={loading || !account}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs"
          >
            <RefreshCw size={14} />
            {loading ? 'Resetting...' : !account ? 'Connect Wallet' : 'EL1*: Reset Enrollment Window'}
          </button>
        </div>
      )}

      {/* Escalation 1: Enrolled players can force start */}
      {tournamentStatus === 0 && escalationState.canStartEscalation1 && isEnrolled && (
        <div className="mb-4">
          <button
            onClick={() => onManualStart(tierId, instanceId)}
            disabled={loading || !account}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs"
          >
            <Zap size={14} />
            {loading ? 'Starting...' : !account ? 'Connect Wallet' : `EL1: Force Start with ${currentEnrolled} Players`}
          </button>
          <a
            href="#el1"
            className="block w-full text-center text-orange-300 hover:text-orange-200 hover:bg-orange-500/10 text-xs mt-2 py-2 px-4 rounded-lg border border-orange-400/30 hover:border-orange-400/50 transition-all"
          >
            Learn more about EL1 (Force Start)
          </a>
        </div>
      )}

      {/* Escalation 2: Non-enrolled players can claim abandoned pool */}
      {tournamentStatus === 0 && escalationState.canStartEscalation2 && !isEnrolled && onClaimAbandonedPool && (
        <div className="mb-4">
          <button
            onClick={() => onClaimAbandonedPool(tierId, instanceId)}
            disabled={loading || !account}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs"
          >
            <Coins size={14} />
            {loading ? 'Claiming...' : !account ? 'Connect Wallet' : 'EL2: Claim Abandoned Pool'}
          </button>
          <a
            href="#el2"
            className="block w-full text-center text-red-300 hover:text-red-200 hover:bg-red-500/10 text-xs mt-2 py-2 px-4 rounded-lg border border-red-400/30 hover:border-red-400/50 transition-all"
          >
            Learn more about EL2 (Claim Pool)
          </a>
        </div>
      )}

      {isEnrolled ? (
        <button
          onClick={onEnter}
          disabled={loading || !account}
          className={`w-full bg-gradient-to-r ${colors.buttonEnter} text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
        >
          <Play size={18} />
          {loading ? 'Loading...' : !account ? 'Connect Wallet to Enter' : `Enter ${tournamentTypeLabel}`}
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
            {loading ? 'Loading...' : `View ${tournamentTypeLabel}`}
          </button>
        </>
      )}

      {/* Abandoned Pool Claim Button - show for completed/abandoned tournaments with claimable funds */}
      {onClaimAbandonedPool && tournamentStatus >= 2 &&
        escalationState.forfeitPool && escalationState.forfeitPool > 0n && (
        <div className="mt-4">
          <button
            onClick={() => onClaimAbandonedPool(tierId, instanceId)}
            disabled={loading || !account}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs"
          >
            <Coins size={14} />
            {loading ? 'Claiming...' : !account ? 'Connect Wallet' : `EL2: Claim Pool (${ethers.formatEther(escalationState.forfeitPool)} ETH)`}
          </button>
          <a
            href="#el2"
            className="block w-full text-center text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 text-xs mt-2 py-2 px-4 rounded-lg border border-purple-400/30 hover:border-purple-400/50 transition-all"
          >
            Learn more about EL2 (Claim Pool)
          </a>
        </div>
      )}
    </div>
  );
};

export default TournamentCard;
