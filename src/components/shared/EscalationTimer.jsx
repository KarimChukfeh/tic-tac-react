/**
 * Shared EscalationTimer Component
 *
 * Displays escalation countdown/status for tournament enrollment.
 * Used in TournamentCard to show when force-start or pool-claim becomes available.
 */

import { Clock, Zap, Coins } from 'lucide-react';
import { ethers } from 'ethers';
import { formatTime } from '../../utils/formatters';

/**
 * @param {Object} props
 * @param {Object} props.escalationState - State object containing escalation data
 * @param {number} props.escalationState.activeEscalation - Current active escalation level (0, 1, or 2)
 * @param {boolean} props.escalationState.canStartEscalation1 - Whether escalation 1 is available
 * @param {boolean} props.escalationState.canStartEscalation2 - Whether escalation 2 is available
 * @param {number} props.escalationState.timeToEscalation1 - Seconds until escalation 1 activates
 * @param {number} props.escalationState.timeToEscalation2 - Seconds until escalation 2 activates
 * @param {bigint} props.escalationState.forfeitPool - Forfeit pool amount in wei
 * @param {Object|null} props.enrollmentTimeout - Enrollment timeout data (null if not active)
 */
const EscalationTimer = ({ escalationState, enrollmentTimeout }) => {
  // Don't render if no escalation data or not in escalation window
  if (!enrollmentTimeout || (escalationState.timeToEscalation1 <= 0 && escalationState.activeEscalation === 0)) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {/* Main Countdown Timer */}
      {escalationState.timeToEscalation1 > 0 && escalationState.activeEscalation === 0 ? (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-lg p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="text-orange-400" size={20} />
              <span className="text-orange-300 text-sm font-semibold">Force Start Unlocks In</span>
            </div>
            <div className="text-orange-300 font-bold text-3xl">
              {formatTime(escalationState.timeToEscalation1)}
            </div>
            <div className="text-orange-300/70 text-xs mt-1">
              Enrolled players will be able to force start the tournament
            </div>
          </div>
        </div>
      ) : (escalationState.canStartEscalation1 || escalationState.canStartEscalation2) && escalationState.activeEscalation >= 1 ? (
        <div className={`bg-gradient-to-r ${escalationState.canStartEscalation2 ? 'from-red-500/20 to-red-600/20 border-red-400/50' : 'from-green-500/20 to-emerald-500/20 border-green-400/50'} border rounded-lg p-4`}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {escalationState.canStartEscalation2 ? <Coins className="text-red-400" size={20} /> : <Zap className="text-green-400" size={20} />}
              <span className={`${escalationState.canStartEscalation2 ? 'text-red-300' : 'text-green-300'} text-sm font-semibold`}>
                {escalationState.canStartEscalation2 ? 'Pool Claim Available!' : 'Force Start Available!'}
              </span>
            </div>
            <div className={`${escalationState.canStartEscalation2 ? 'text-red-300' : 'text-green-300'} text-sm`}>
              {escalationState.canStartEscalation2
                ? 'Anyone can claim the abandoned enrollment pool'
                : 'Any enrolled player can force start this tournament'
              }
            </div>
            {escalationState.timeToEscalation2 > 0 && escalationState.activeEscalation === 1 && (
              <div className="text-green-300/70 text-xs mt-2">
                Claim access opens to everyone in {formatTime(escalationState.timeToEscalation2)}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Escalation Level 1 Window */}
      <div className={`border rounded-lg p-3 ${
        escalationState.activeEscalation >= 1 ? 'bg-green-500/20 border-green-400/50' : 'bg-gray-500/20 border-gray-400/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={escalationState.activeEscalation >= 1 ? 'text-green-400' : 'text-gray-400'} size={16} />
            <span className={`text-xs font-semibold ${escalationState.activeEscalation >= 1 ? 'text-green-300' : 'text-gray-400'}`}>
              Escalation 1: Any Enrolled Player Can Force Start
            </span>
          </div>
          <span className={`font-bold text-sm ${escalationState.activeEscalation >= 1 ? 'text-green-300' : 'text-gray-400'}`}>
            {escalationState.activeEscalation >= 1 ? 'ACTIVE' : formatTime(escalationState.timeToEscalation1)}
          </span>
        </div>
      </div>

      {/* Escalation Level 2 Window (if exists) - Show when escalation2 is configured */}
      {(escalationState.timeToEscalation2 > 0 || escalationState.activeEscalation >= 2) && (
        <div className={`border rounded-lg p-3 ${
          escalationState.activeEscalation >= 2 ? 'bg-red-500/20 border-red-400/50' : 'bg-gray-500/20 border-gray-400/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className={escalationState.activeEscalation >= 2 ? 'text-red-400' : 'text-gray-400'} size={16} />
              <span className={`text-xs font-semibold ${escalationState.activeEscalation >= 2 ? 'text-red-300' : 'text-gray-400'}`}>
                Escalation 2: Anyone Can Claim Pool
              </span>
            </div>
            <span className={`font-bold text-sm ${escalationState.activeEscalation >= 2 ? 'text-red-300' : 'text-gray-400'}`}>
              {escalationState.activeEscalation >= 2 ? 'ACTIVE' : formatTime(escalationState.timeToEscalation2)}
            </span>
          </div>
        </div>
      )}

      {/* Forfeit Pool Display */}
      {escalationState.forfeitPool && escalationState.forfeitPool > 0n && (
        <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 text-xs font-semibold">Forfeit Pool</span>
            <span className="text-purple-300 font-bold text-sm">
              {ethers.formatEther(escalationState.forfeitPool)} ETH
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationTimer;
