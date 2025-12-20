/**
 * TournamentHeader - Shared component for tournament bracket header
 *
 * Displays the header section for tournament bracket views across all games.
 * Includes: back button, title, sync indicator, prize pool, stats, enrolled players.
 */

import { Trophy, ChevronDown } from 'lucide-react';
import { ethers } from 'ethers';
import StatsGrid from './StatsGrid';
import EnrolledPlayersList from './EnrolledPlayersList';

// Game-specific configurations
const GAME_CONFIGS = {
  tictactoe: {
    name: 'Tournament',
    icon: null,
    usesTrophyIcon: true,
    colors: {
      headerBg: 'from-purple-600/30 to-blue-600/30',
      headerBorder: 'border-purple-400/30',
      text: 'text-purple-300',
      textHover: 'hover:text-purple-200',
      textMuted: 'text-purple-300/70',
      icon: 'text-purple-400',
      buttonGradient: 'from-blue-500 to-purple-500',
      buttonHover: 'hover:from-blue-600 hover:to-purple-600'
    }
  },
  chess: {
    name: 'Chess Tournament',
    icon: null,
    usesTrophyIcon: true,
    colors: {
      headerBg: 'from-purple-600/30 to-blue-600/30',
      headerBorder: 'border-purple-400/30',
      text: 'text-purple-300',
      textHover: 'hover:text-purple-200',
      textMuted: 'text-purple-300/70',
      icon: 'text-purple-400',
      buttonGradient: 'from-blue-500 to-purple-500',
      buttonHover: 'hover:from-blue-600 hover:to-purple-600'
    }
  },
  connectfour: {
    name: 'Connect Four',
    icon: '🔴',
    usesTrophyIcon: false,
    colors: {
      headerBg: 'from-purple-600/30 to-blue-600/30',
      headerBorder: 'border-purple-400/30',
      text: 'text-purple-300',
      textHover: 'hover:text-purple-200',
      textMuted: 'text-purple-300/70',
      icon: 'text-purple-400',
      buttonGradient: 'from-blue-500 to-cyan-500',
      buttonHover: 'hover:from-blue-600 hover:to-cyan-600'
    }
  }
};

const TournamentHeader = ({
  gameType,
  tierId,
  instanceId,
  status,
  currentRound,
  playerCount,
  enrolledCount,
  prizePool,
  enrolledPlayers,
  syncDots,
  account,
  onBack,

  // Optional: Enrollment section
  isEnrolled,
  isFull,
  entryFee,
  onEnroll,
  loading,

  // Optional: Countdown timer content (render prop)
  renderCountdown,

  // Optional: Escalation timers content (render prop)
  renderEscalation
}) => {
  const config = GAME_CONFIGS[gameType] || GAME_CONFIGS.tictactoe;
  const { colors } = config;
  const totalRounds = Math.ceil(Math.log2(playerCount));

  return (
    <div className={`bg-gradient-to-r ${colors.headerBg} backdrop-blur-lg rounded-2xl p-4 md:p-8 border ${colors.headerBorder} mb-8`}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`mb-4 flex items-center gap-2 ${colors.text} ${colors.textHover} transition-colors`}
      >
        <ChevronDown className="rotate-90" size={20} />
        Back to Tournaments
      </button>

      {/* Title Row - stacks on mobile */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          {config.usesTrophyIcon ? (
            <Trophy className={`${colors.icon} shrink-0`} size={40} />
          ) : (
            <span className="text-4xl md:text-5xl shrink-0">{config.icon}</span>
          )}

          <div className="min-w-0">
            <h2 className="text-2xl md:text-4xl font-bold text-white truncate">
              {config.name} T{tierId + 1}-I{instanceId + 1}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <p className={colors.text}>
                Round {currentRound + 1} of {totalRounds}
              </p>
              <span className="text-cyan-400 text-sm font-semibold flex items-center gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                Syncing{'.'.repeat(syncDots)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:block md:text-right bg-black/20 md:bg-transparent rounded-lg p-3 md:p-0">
          <div className={`${colors.text} text-sm`}>Prize Pool</div>
          <div className="text-xl md:text-3xl font-bold text-yellow-400 whitespace-nowrap">
            {ethers.formatEther(prizePool)} ETH
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid
        enrolledCount={enrolledCount}
        playerCount={playerCount}
        status={status}
        currentRound={currentRound}
        totalRounds={totalRounds}
        colors={colors}
      />

      {/* Enroll Button */}
      {status === 0 && account && !isEnrolled && !isFull && onEnroll && (
        <div className="mt-4">
          <button
            onClick={() => onEnroll(tierId, instanceId, entryFee)}
            disabled={loading}
            className={`w-full bg-gradient-to-r ${colors.buttonGradient} ${colors.buttonHover} text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
          >
            <Trophy size={20} />
            {loading ? 'Enrolling...' : `Enroll in Tournament (${entryFee} ETH)`}
          </button>
          <p className={`${colors.textMuted} text-xs text-center mt-2`}>
            Join this tournament and compete for the prize pool
          </p>
        </div>
      )}

      {/* Countdown Timer (optional) */}
      {renderCountdown && renderCountdown()}

      {/* Enrolled Players */}
      <EnrolledPlayersList
        enrolledPlayers={enrolledPlayers}
        account={account}
        colors={colors}
      />

      {/* Escalation Timers (optional) */}
      {renderEscalation && renderEscalation()}
    </div>
  );
};

export default TournamentHeader;
