/**
 * TournamentHeader - Shared component for tournament bracket header
 *
 * Displays the header section for tournament bracket views across all games.
 * Includes: back button, title, sync indicator, prize pool, stats, enrolled players.
 */

import { Trophy, ChevronDown, Copy, Check, Clock, HelpCircle, Zap, Coins, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { useState, useEffect, useRef } from 'react';
import { generateTournamentUrl, copyToClipboard } from '../../utils/urlHelpers';
import StatsGrid from './StatsGrid';
import EnrolledPlayersList from './EnrolledPlayersList';
import { formatTime, getTournamentTypeLabel, shortenAddress } from '../../utils/formatters';
import { getTournamentCompletionText, getTournamentResolutionReasonValue } from '../../utils/completionReasons';

// Game-specific configurations
const GAME_CONFIGS = {
  tictactoe: {
    gameName: 'TicTacToe',
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
    gameName: 'Chess',
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
    gameName: 'Connect Four',
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

  // Escalation system props
  enrollmentTimeout,
  onManualStart,
  onClaimAbandonedPool,
  onResetEnrollmentWindow,
  contract,

  // Optional: override the share URL (e.g. for V2 contract-address-based URLs)
  shareUrlOverride,

  // Optional: completed tournament summary
  winner,
  completionReason,
  resolutionReason,

  // Optional: Custom colors override
  colors: customColors
}) => {
  const config = GAME_CONFIGS[gameType] || GAME_CONFIGS.tictactoe;
  const colors = customColors || config.colors;
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const isInProgress = status === 1;
  const isCompleted = status >= 2;
  const tournamentResolutionReason = getTournamentResolutionReasonValue({ resolutionReason, completionReason });
  const resolutionText = getTournamentCompletionText(tournamentResolutionReason);
  const winnerLabel = winner && winner !== ethers.ZeroAddress ? shortenAddress(winner) : '0x000';
  const resolutionSummary = tournamentResolutionReason === 0 ? '' : ` by ${resolutionText.summary}`;

  // Determine tournament type label (Duel vs Tournament)
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);

  // State for copy feedback
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  // Visibility tracking: component is visible and tab is active
  const headerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(!document.hidden);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track component scroll visibility with IntersectionObserver
  useEffect(() => {
    if (!headerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // Consider visible if at least 10% is in viewport
    );

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  // Escalation polling effect - only polls when visible and tab is active
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

    // Only poll if component is visible and tab is active
    if (!isVisible || !isTabActive) return;

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

      // Check canResetEnrollmentWindow when enrollment window expires
      // Continue checking even when EL2 is active - solo player can still reset
      if ((canStartEscalation1 || canStartEscalation2) && isEnrolled && contract) {
        try {
          // Use staticCall to ensure this is a read-only call even if contract has signer
          const canReset = await contract.canResetEnrollmentWindow.staticCall(tierId, instanceId);
          setCanResetWindow(canReset);
        } catch (error) {
          console.error('Error checking canResetEnrollmentWindow:', error);
          setCanResetWindow(false);
        }
      } else if (!canStartEscalation1 && !canStartEscalation2) {
        // Reset the flag only when both escalation windows are cleared
        setCanResetWindow(false);
      }
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 5000); // Changed from 1000ms to 5000ms

    return () => clearInterval(interval);
  }, [enrollmentTimeout, isEnrolled, contract, tierId, instanceId, isVisible, isTabActive]);

  // Generate shareable URL
  const shareUrl = shareUrlOverride || generateTournamentUrl(gameType, tierId, instanceId);

  // Copy handler
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div ref={headerRef} className={`bg-gradient-to-r ${colors.headerBg} backdrop-blur-lg rounded-2xl p-4 md:p-8 border ${colors.headerBorder} mb-8`}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`mb-4 flex items-center gap-2 ${colors.text} ${colors.textHover} transition-colors`}
      >
        <ChevronDown className="rotate-90" size={20} />
        Back to {tournamentTypeLabel}s
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
              {config.gameName} {tournamentTypeLabel} T{tierId + 1}-I{instanceId + 1}
            </h2>
            <p className={colors.text}>
              Round {currentRound + 1}/{totalRounds}
            </p>
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
        syncDots={syncDots}
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
            {loading ? 'Enrolling...' : `Enroll in ${tournamentTypeLabel} (${entryFee} ETH)`}
          </button>
          <p className={`${colors.textMuted} text-xs text-center mt-2`}>
            Join this {tournamentTypeLabel.toLowerCase()} and compete for the prize pool
          </p>
        </div>
      )}

      {/* Countdown Timer (optional) */}
      {renderCountdown && renderCountdown()}

      {/* Tournament Status Badge - Waiting for more players */}
      {status === 0 && enrolledCount > 0 && (
        <div className="mt-4">
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
        </div>
      )}

      {/* Escalation Timers */}
      {status === 0 && enrollmentTimeout && (
        <>
          {/* EL1 Timer */}
          {escalationState.timeToEscalation1 > 0 && (
            <div className="mt-4">
              <div className="relative bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-400/50 rounded-lg p-3">
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-2">
                    <Clock className="text-orange-400" size={16} />
                    <span className="text-orange-300 text-xs font-semibold">
                      EL1: Force Start in {formatTime(escalationState.timeToEscalation1)}
                    </span>
                  </div>
                </div>
                <a
                  href="#el1"
                  className="absolute top-3 right-3 text-orange-400 hover:text-orange-300 transition-colors"
                  title="Learn more about force-starting tournaments"
                >
                  <HelpCircle size={16} />
                </a>
              </div>
            </div>
          )}

          {/* EL2 Timer - Only show for non-enrolled players */}
          {escalationState.canStartEscalation1 && escalationState.timeToEscalation2 > 0 && !isEnrolled && (
            <div className="mt-4">
              <div className="relative bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/50 rounded-lg p-3">
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-2">
                    <Clock className="text-red-400" size={16} />
                    <span className="text-red-300 text-xs font-semibold">
                      EL2: Claim Abandoned Pool in {formatTime(escalationState.timeToEscalation2)}
                    </span>
                  </div>
                </div>
                <a
                  href="#el2"
                  className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors"
                  title="Learn more about claiming abandoned pools"
                >
                  <HelpCircle size={16} />
                </a>
              </div>
            </div>
          )}

          {/* EL1*: Reset Enrollment Window - Solo player can extend enrollment */}
          {canResetWindow && isEnrolled && onResetEnrollmentWindow && (
            <div className="mt-4">
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
          {escalationState.canStartEscalation1 && isEnrolled && onManualStart && (
            <div className="mt-4">
              <button
                onClick={() => onManualStart(tierId, instanceId)}
                disabled={loading || !account}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs"
              >
                <Zap size={14} />
                {loading ? 'Starting...' : !account ? 'Connect Wallet' : `EL1: Force Start with ${enrolledCount} Players`}
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
          {escalationState.canStartEscalation2 && !isEnrolled && onClaimAbandonedPool && (
            <div className="mt-4">
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
        </>
      )}

      {isCompleted && (
        <div className="mt-4 bg-black/20 rounded-lg p-4 border border-purple-400/30">
          <div className="text-purple-300 text-sm mb-1">Resolution</div>
          <div className="text-white text-sm md:text-base">
            <span className="font-mono">{winnerLabel}</span>
            <span> wins{resolutionSummary}</span>
            <span className="text-purple-300"> • </span>
            <span>Winner awarded <span className="font-semibold text-yellow-400">{ethers.formatEther(prizePool)} ETH</span></span>
          </div>
        </div>
      )}

      {/* Enrolled Players */}
      <EnrolledPlayersList
        enrolledPlayers={enrolledPlayers}
        account={account}
        colors={colors}
      />

      {/* Shareable URL Section */}
      {!isInProgress && (
        <div className="mt-4 bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-purple-300 text-sm mb-1">{isCompleted ? 'Share results' : 'Invite a Friend'}</div>
              <div className="font-mono text-xs md:text-sm text-white bg-black/20 rounded px-3 py-2 overflow-x-auto">
                {shareUrl}
              </div>
            </div>
            <button
              onClick={handleCopyUrl}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                copiedUrl
                  ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
              }`}
            >
              {copiedUrl ? <Check size={18} /> : <Copy size={18} />}
              {copiedUrl ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentHeader;
