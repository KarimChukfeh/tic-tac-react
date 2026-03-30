/**
 * TournamentHeader - Shared component for tournament bracket header
 *
 * Displays the header section for tournament bracket views across all games.
 * Includes: back button, title, sync indicator, prize pool, stats, enrolled players.
 */

import { Trophy, ChevronDown, Copy, Check, Clock, HelpCircle, Zap, Coins, RefreshCw, XCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { useState, useEffect, useRef } from 'react';
import { getAddressUrl } from '../../config/networks';
import { generateTournamentUrl, copyToClipboard } from '../../utils/urlHelpers';
import StatsGrid from './StatsGrid';
import EnrolledPlayersList from './EnrolledPlayersList';
import { formatTime, getTournamentTypeLabel, shortenAddress } from '../../utils/formatters';
import { CompletionReason, getTournamentCompletionText, getTournamentResolutionReasonValue } from '../../utils/completionReasons';

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
  onConnectWallet,
  loading,
  connectLoading,
  connectButtonGradient,
  connectButtonHover,

  // Optional: Countdown timer content (render prop)
  renderCountdown,

  // Escalation system props
  enrollmentTimeout,
  onManualStart,
  onClaimAbandonedPool,
  onResetEnrollmentWindow,
  onCancelTournament,
  contract,

  // Optional: override the share URL (e.g. for V2 contract-address-based URLs)
  shareUrlOverride,
  instanceAddress,

  // Optional: completed tournament summary
  winner,
  completionReason,
  resolutionReason,
  totalEntryFeesAccrued,
  prizeAwarded,
  prizeRecipient,
  raffleAwarded,
  raffleRecipient,

  // Optional: Custom colors override
  colors: customColors
}) => {
  const formatEnrollmentFee = (value) => {
    if (typeof value === 'bigint') return ethers.formatEther(value);
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) return ethers.formatEther(BigInt(value));
      return value;
    }
    return String(value ?? '0');
  };

  const config = GAME_CONFIGS[gameType] || GAME_CONFIGS.tictactoe;
  const colors = customColors || config.colors;
  const totalRounds = Math.ceil(Math.log2(playerCount));
  const isInProgress = status === 1;
  const tournamentTypeLabel = getTournamentTypeLabel(playerCount);
  const formattedEntryFee = formatEnrollmentFee(entryFee);
  const showEnrollmentCta = status === 0 && !isEnrolled && !isFull && (account ? !!onEnroll : !!onConnectWallet);
  const enrollmentCtaLoading = account ? loading : connectLoading;
  const connectCtaGradient = connectButtonGradient || colors.buttonGradient;
  const connectCtaHover = connectButtonHover || colors.buttonHover;
  const enrollmentCtaLabel = account
    ? (loading ? 'Enrolling...' : `Enroll in ${tournamentTypeLabel} (${formattedEntryFee} ETH)`)
    : (connectLoading ? 'Connecting...' : 'Connect to Enrol');
  const tournamentResolutionReason = getTournamentResolutionReasonValue({ resolutionReason, completionReason });
  const isCancelled = status === 3 || tournamentResolutionReason === CompletionReason.SOLO_ENROLL_CANCELLED;
  const isCompleted = status >= 2;
  const resolutionText = getTournamentCompletionText(tournamentResolutionReason);
  const winnerLabel = winner && winner !== ethers.ZeroAddress ? shortenAddress(winner) : '0x000';
  const resolutionSummary = tournamentResolutionReason === 0 ? '' : ` by ${resolutionText.summary}`;
  const detailedResolutionAvailable = [
    prizeAwarded,
    prizeRecipient,
    raffleAwarded,
    raffleRecipient,
  ].some((value) => value !== undefined && value !== null);
  const resolvedPrizeAwarded = prizeAwarded ?? prizePool ?? 0n;
  const resolvedPrizeRecipient = prizeRecipient ?? winner ?? ethers.ZeroAddress;
  const resolvedRaffleAwarded = raffleAwarded ?? 0n;
  const resolvedRaffleRecipient = raffleRecipient ?? ethers.ZeroAddress;
  const formatResolutionEth = (value) => Number.parseFloat(ethers.formatEther(value ?? 0n)).toFixed(5);
  const formatRecipient = (address) => (
    address && address !== ethers.ZeroAddress ? shortenAddress(address) : 'None'
  );
  const isSoloEnrollmentState = status === 0 && enrolledCount === 1;
  const isSoloEnrolled = isSoloEnrollmentState && isEnrolled;

  const instanceExplorerUrl = instanceAddress
    ? (getAddressUrl(instanceAddress) || `https://arbiscan.io/address/${instanceAddress}`)
    : null;

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
    if (!enrollmentTimeout || status !== 0) {
      setEscalationState({
        activeEscalation: 0,
        canStartEscalation1: false,
        canStartEscalation2: false,
        timeToEscalation1: 0,
        timeToEscalation2: 0,
        forfeitPool: 0n
      });
      setCanResetWindow(false);
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

      if (isSoloEnrolled && contract?.canResetEnrollmentWindow) {
        try {
          const canResetMethod = contract.canResetEnrollmentWindow;
          const canReset = typeof canResetMethod.staticCall === 'function'
            ? await canResetMethod.staticCall()
            : await canResetMethod();
          setCanResetWindow(Boolean(canReset));
        } catch (error) {
          console.error('Error checking canResetEnrollmentWindow:', error);
          setCanResetWindow(false);
        }
      } else {
        setCanResetWindow(false);
      }
    };

    updateEscalationState();
    const interval = setInterval(updateEscalationState, 5000); // Changed from 1000ms to 5000ms

    return () => clearInterval(interval);
  }, [enrollmentTimeout, status, isSoloEnrolled, contract, isVisible, isTabActive]);

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
              {config.gameName} {tournamentTypeLabel}{instanceAddress ? '' : ` T${tierId + 1}-I${instanceId + 1}`}
            </h2>
            {instanceAddress && instanceExplorerUrl && (
              <a
                href={instanceExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${colors.text} ${colors.textHover} transition-colors text-xs md:text-sm break-all`}
              >
                {instanceAddress}
              </a>
            )}
            {!instanceAddress && (
              <p className={colors.text}>
                Round {currentRound + 1}/{totalRounds}
              </p>
            )}
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
        resolutionReason={tournamentResolutionReason}
        currentRound={currentRound}
        totalRounds={totalRounds}
        colors={colors}
        syncDots={syncDots}
      />

      {/* Enroll Button */}
      {showEnrollmentCta && (
        <div className="mt-4">
          <button
            onClick={() => {
              if (account) {
                onEnroll?.(tierId, instanceId, entryFee);
                return;
              }
              onConnectWallet?.();
            }}
            disabled={enrollmentCtaLoading}
            className={`w-full bg-gradient-to-r ${account ? colors.buttonGradient : connectCtaGradient} ${account ? colors.buttonHover : connectCtaHover} text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
          >
            <Trophy size={20} />
            {enrollmentCtaLabel}
          </button>
          <p className={`${colors.textMuted} text-xs text-center mt-2`}>
            {account
              ? `Join this ${tournamentTypeLabel.toLowerCase()} and compete for the prize pool`
              : `Connect your wallet to join this ${tournamentTypeLabel.toLowerCase()}`}
          </p>
        </div>
      )}

      {/* Countdown Timer (optional) */}
      {renderCountdown && renderCountdown()}

      {/* Tournament Status Badge - Waiting for more players */}
      {status === 0 && enrolledCount > 0 && (
        <div className="mt-4">
          <div className={`${
            !isSoloEnrollmentState && isEnrolled && escalationState.canStartEscalation2
              ? 'bg-red-500/20 border-red-400'
              : isSoloEnrolled
                ? 'bg-blue-500/20 border-blue-400'
                : 'bg-yellow-500/20 border-yellow-400'
          } border rounded-lg p-3`}>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 ${
                !isSoloEnrollmentState && isEnrolled && escalationState.canStartEscalation2
                  ? 'bg-red-400'
                  : isSoloEnrolled
                    ? 'bg-blue-400'
                    : 'bg-yellow-400'
              } rounded-full animate-pulse`}></div>
              <span className={`${
                !isSoloEnrollmentState && isEnrolled && escalationState.canStartEscalation2
                  ? 'text-red-300'
                  : isSoloEnrolled
                    ? 'text-blue-300'
                    : 'text-yellow-300'
              } font-bold text-sm`}>
                {isSoloEnrolled ? 'You are the sole enroller' : 'Waiting for more players'}
              </span>
            </div>
            {isSoloEnrolled ? (
              <div className="text-center mt-1">
                <span className="text-blue-200/80 text-[10px]">
                  You can cancel or reset the enrollment window at any time while no one else is enrolled
                </span>
              </div>
            ) : isEnrolled && escalationState.timeToEscalation2 > 0 && escalationState.canStartEscalation1 ? (
              <div className="text-center mt-1">
                <span className="text-yellow-300/70 text-[10px]">
                  {formatTime(escalationState.timeToEscalation2)} until considered abandoned
                </span>
              </div>
            ) : null}
            {isEnrolled && !isSoloEnrollmentState && escalationState.canStartEscalation2 && (
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
          {!isSoloEnrollmentState && escalationState.timeToEscalation1 > 0 && (
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
          {!isSoloEnrollmentState && escalationState.canStartEscalation1 && escalationState.timeToEscalation2 > 0 && !isEnrolled && (
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

          {/* EL0: Solo player can cancel at any time while still alone */}
          {isSoloEnrolled && onCancelTournament && (
            <div className="mt-4">
              <button
                onClick={() => onCancelTournament(tierId, instanceId)}
                disabled={loading || !account}
                className={`w-full bg-gradient-to-r ${account ? 'from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800' : `${connectCtaGradient} ${connectCtaHover}`} text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs`}
              >
                <XCircle size={14} />
                {loading ? 'Cancelling...' : !account ? 'Connect Wallet' : 'EL0: Cancel Tournament'}
              </button>
            </div>
          )}

          {/* EL1*: Reset Enrollment Window - Solo player can extend enrollment */}
          {canResetWindow && isSoloEnrolled && onResetEnrollmentWindow && (
            <div className="mt-4">
              <button
                onClick={() => onResetEnrollmentWindow(tierId, instanceId)}
                disabled={loading || !account}
                className={`w-full bg-gradient-to-r ${account ? 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' : `${connectCtaGradient} ${connectCtaHover}`} text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs`}
              >
                <RefreshCw size={14} />
                {loading ? 'Resetting...' : !account ? 'Connect Wallet' : 'EL1*: Reset Enrollment Window'}
              </button>
            </div>
          )}

          {/* Escalation 1: Enrolled players can force start */}
          {escalationState.canStartEscalation1 && isEnrolled && enrolledCount > 1 && onManualStart && (
            <div className="mt-4">
              <button
                onClick={() => onManualStart(tierId, instanceId)}
                disabled={loading || !account}
                className={`w-full bg-gradient-to-r ${account ? 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' : `${connectCtaGradient} ${connectCtaHover}`} text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs`}
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
                className={`w-full bg-gradient-to-r ${account ? 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' : `${connectCtaGradient} ${connectCtaHover}`} text-white font-semibold py-2 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-xs`}
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
          <div className="text-purple-300 text-sm mb-1">{detailedResolutionAvailable ? 'Payouts' : 'Resolution'}</div>
          {!detailedResolutionAvailable ? (
            isCancelled ? (
              <div className="text-white text-sm md:text-base">
                Tournament cancelled
              </div>
            ) : (
              <div className="text-white text-sm md:text-base">
                <span className="font-mono">{winnerLabel}</span>
                <span> wins{resolutionSummary}</span>
                <span className="text-purple-300"> • </span>
                <span>Winner awarded <span className="font-semibold text-yellow-400">{formatResolutionEth(prizePool)} ETH</span></span>
              </div>
            )
          ) : (
            isCancelled ? (
              <div className="text-white text-sm md:text-base">
                <span className="text-purple-300">Refunded </span>
                <span className="font-semibold text-yellow-400">{formatResolutionEth(resolvedPrizeAwarded)} ETH</span>
                <span className="text-purple-300"> to </span>
                <span className="font-mono">{formatRecipient(resolvedPrizeRecipient)}</span>
              </div>
            ) : (
              <div className="text-white text-sm md:text-base flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-6">
                <div>
                  <span className="text-purple-300">Prize </span>
                  <span className="font-semibold text-yellow-400">{formatResolutionEth(resolvedPrizeAwarded)} ETH</span>
                  <span className="text-purple-300"> to </span>
                  <span className="font-mono">{formatRecipient(resolvedPrizeRecipient)}</span>
                </div>
                <div>
                  <span className="text-purple-300">Raffle </span>
                  <span className="font-semibold text-yellow-400">{formatResolutionEth(resolvedRaffleAwarded)} ETH</span>
                  <span className="text-purple-300"> to </span>
                  <span className="font-mono">{formatRecipient(resolvedRaffleRecipient)}</span>
                </div>
              </div>
            )
          )}
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
