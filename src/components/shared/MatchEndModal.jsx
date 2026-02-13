import { useEffect, useCallback } from 'react';
import { Trophy, Frown, Equal, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ethers } from 'ethers';
import { shortenAddress } from '../../utils/formatters';

/**
 * MatchEndModal - Shared component for displaying match end feedback
 *
 * @param {Object} props
 * @param {'win' | 'lose' | 'draw' | 'forfeit_win' | 'forfeit_lose' | 'double_forfeit' | 'tournament_ended'} props.result - The match result
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {string} props.winnerLabel - Custom label for winner (e.g., "White", "Player 1", or address)
 * @param {string} props.winnerAddress - Winner's wallet address
 * @param {string} props.loserAddress - Loser's wallet address
 * @param {string} props.currentAccount - Current user's wallet address
 * @param {string} props.gameType - The game type for customized messages (e.g., "chess", "tictactoe", "connectfour")
 * @param {boolean} props.isVisible - Whether the modal is visible
 * @param {number} props.roundNumber - Current round number (0-indexed)
 * @param {number} props.totalRounds - Total number of rounds in tournament
 * @param {string} props.prizePool - Prize pool amount (in wei as BigInt string)
 * @param {number} props.completionReason - Tournament completion reason enum value (for tournament_ended result)
 * @param {string} props.tournamentWinner - Tournament winner address (for tournament_ended result)
 */
const MatchEndModal = ({
  result,
  onClose,
  winnerLabel = 'Winner',
  winnerAddress,
  loserAddress,
  currentAccount,
  gameType = 'game',
  isVisible = true,
  roundNumber,
  totalRounds,
  prizePool,
  completionReason,
  tournamentWinner
}) => {
  // Fire confetti for wins (mobile-optimized)
  const fireConfetti = useCallback(() => {
    // Detect mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#ffd700', '#ffb347', '#ff6961', '#77dd77', '#84b6f4', '#fdfd96'];

    // Mobile-specific settings for better performance and visibility
    const particleCount = isMobile ? 5 : 3; // More particles on mobile for visibility
    const burstCount = isMobile ? 150 : 100; // Bigger burst on mobile

    // Ensure confetti canvas is created with proper settings
    const canvasConfig = {
      resize: true,
      useWorker: true, // Use web worker for better performance
      disableForReducedMotion: false // Always show confetti
    };

    // Create confetti instance with mobile-friendly config
    const myConfetti = confetti.create(undefined, canvasConfig);

    (function frame() {
      // Left side confetti
      myConfetti({
        particleCount: particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }, // Adjusted for mobile viewport
        colors: colors,
        ticks: 200,
        gravity: 1,
        scalar: isMobile ? 1.2 : 1, // Larger particles on mobile
        startVelocity: isMobile ? 35 : 30
      });

      // Right side confetti
      myConfetti({
        particleCount: particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }, // Adjusted for mobile viewport
        colors: colors,
        ticks: 200,
        gravity: 1,
        scalar: isMobile ? 1.2 : 1, // Larger particles on mobile
        startVelocity: isMobile ? 35 : 30
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    // Big burst in the middle
    setTimeout(() => {
      myConfetti({
        particleCount: burstCount,
        spread: isMobile ? 90 : 70, // Wider spread on mobile
        origin: { y: 0.6 },
        colors: colors,
        ticks: 200,
        gravity: 1,
        scalar: isMobile ? 1.2 : 1,
        startVelocity: isMobile ? 40 : 30
      });
    }, 300);

    // Add extra burst for mobile
    if (isMobile) {
      setTimeout(() => {
        myConfetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.5, y: 0.5 },
          colors: colors,
          ticks: 150
        });
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (isVisible && (result === 'win' || result === 'forfeit_win')) {
      // Small delay to ensure modal is rendered before confetti
      const timer = setTimeout(() => {
        fireConfetti();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, result, fireConfetti]);

  // Ensure confetti canvas is on top
  useEffect(() => {
    if (isVisible) {
      // Find confetti canvas and ensure proper z-index
      const confettiCanvas = document.querySelector('canvas');
      if (confettiCanvas && confettiCanvas.style) {
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100%';
        confettiCanvas.style.height = '100%';
        confettiCanvas.style.zIndex = '9999';
        confettiCanvas.style.pointerEvents = 'none';
      }
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  // Determine if this is the final round
  const isFinalRound = totalRounds !== undefined && roundNumber !== undefined && roundNumber === totalRounds - 1;

  // Format prize pool if available
  const formattedPrizePool = prizePool ? ethers.formatEther(prizePool) : null;

  // Get next round name
  const getNextRoundName = () => {
    if (!totalRounds || roundNumber === undefined) return 'the next round';

    const nextRound = roundNumber + 2; // +1 for 0-index, +1 for next round

    if (nextRound === totalRounds) {
      return 'the Finals';
    } else if (nextRound === totalRounds - 1) {
      return 'the Semi-Finals';
    } else if (nextRound === totalRounds - 2) {
      return 'the Quarter-Finals';
    } else {
      return `Round ${nextRound}`;
    }
  };

  // Get tournament completion reason message
  const getCompletionReasonMessage = (reason) => {
    const reasons = {
      0: `Tournament completed with a winner. Winner: ${tournamentWinner ? shortenAddress(tournamentWinner) : 'N/A'}`,
      1: 'Tournament finals resulted in a draw. Prizes split between finalists.',
      2: 'Tournament ended - all matches in the round resulted in draws. Prizes distributed equally.',
      3: 'Tournament ended due to match escalation (Level 2). Stalled match was force-eliminated.',
      4: 'Tournament ended due to match escalation (Level 3). Match slot was claimed by replacement player.'
    };
    return reasons[reason] || 'Tournament ended';
  };

  // Game-specific victory text
  const getVictoryText = () => {
    if (isFinalRound) {
      return 'Tournament Champion!';
    }

    // Game-specific victory messages
    switch (gameType) {
      case 'tictactoe':
        return 'Three in a Row!';
      case 'chess':
        return 'Checkmate!';
      case 'connectfour':
        return 'Four Connected!';
      default:
        return 'You Win!';
    }
  };

  // Game-specific defeat text
  const getDefeatText = () => {
    switch (gameType) {
      case 'tictactoe':
        return 'Opponent Got Three in a Row';
      case 'chess':
        return "You've Been Checkmated";
      case 'connectfour':
        return 'Opponent Connected Four';
      default:
        return 'Defeated';
    }
  };

  const config = {
    win: {
      icon: Trophy,
      title: getVictoryText(),
      subtitle: 'You Won!',
      description: winnerAddress && loserAddress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 font-bold">Winner (You):</span>
            <span className="text-white/90 font-mono text-sm">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-red-400">Opponent:</span>
            <span className="text-white/70 font-mono text-sm">
              {shortenAddress(loserAddress)}
            </span>
          </div>
          {isFinalRound ? (
            <p className="text-white/70 mt-4">
              Congratulations! You have won the tournament!
              {formattedPrizePool && (
                <span className="block text-green-400 font-bold mt-2">
                  Prize: {formattedPrizePool} ETH
                </span>
              )}
            </p>
          ) : (
            <p className="text-white/70 mt-4">
              Congratulations! You advance to {getNextRoundName()}.
            </p>
          )}
        </div>
      ) : (
        isFinalRound
          ? `Congratulations! You have won the tournament!${formattedPrizePool ? ` Prize: ${formattedPrizePool} ETH` : ''}`
          : `Congratulations! You advance to ${getNextRoundName()}.`
      ),
      bgGradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
      borderColor: 'border-green-400/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
      glowColor: 'shadow-green-500/30',
      animation: 'animate-bounce'
    },
    forfeit_win: {
      icon: Trophy,
      title: isFinalRound ? 'Tournament Champion!' : 'You Win!',
      subtitle: completionReason === 1
        ? 'Victory via ML1'
        : completionReason === 3 || completionReason === 4
        ? `Victory via ${completionReason === 3 ? 'ML2' : 'ML3'}`
        : 'Victory by Forfeit!',
      description: completionReason === 1 ? (
        <div className="space-y-2">
          {winnerAddress && loserAddress && (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400 font-bold">Winner (You):</span>
                <span className="text-white/90 font-mono text-sm">
                  {shortenAddress(winnerAddress)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-red-400">Opponent (Timed Out):</span>
                <span className="text-white/70 font-mono text-sm">
                  {shortenAddress(loserAddress)}
                </span>
              </div>
            </>
          )}
          <p className="text-white/90">
            Your opponent timed out via{' '}
            <a
              href="#ml1"
              className="text-orange-400 underline decoration-dotted hover:text-orange-300 font-semibold"
            >
              ML1
            </a>
            {' '}timeout escalation.
          </p>
          {isFinalRound ? (
            <p className="text-white/70 mt-4">
              You have won the tournament!
              {formattedPrizePool && (
                <span className="block text-green-400 font-bold mt-2">
                  Prize: {formattedPrizePool} ETH
                </span>
              )}
            </p>
          ) : (
            <p className="text-white/70 mt-4">
              You advance to {getNextRoundName()}!
            </p>
          )}
        </div>
      ) : completionReason === 3 || completionReason === 4 ? (
        <div className="space-y-2">
          {winnerAddress && loserAddress && (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400 font-bold">Winner (You):</span>
                <span className="text-white/90 font-mono text-sm">
                  {shortenAddress(winnerAddress)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-red-400">Opponent (Eliminated):</span>
                <span className="text-white/70 font-mono text-sm">
                  {shortenAddress(loserAddress)}
                </span>
              </div>
            </>
          )}
          <p className="text-white/90">
            Your opponent was eliminated via{' '}
            <a
              href={completionReason === 3 ? '#ml2' : '#ml3'}
              className="text-orange-400 underline decoration-dotted hover:text-orange-300 font-semibold"
            >
              {completionReason === 3 ? 'ML2' : 'ML3'}
            </a>
            {' '}match escalation.
          </p>
          {isFinalRound ? (
            <p className="text-white/70 mt-4">
              You have won the tournament!
              {formattedPrizePool && (
                <span className="block text-green-400 font-bold mt-2">
                  Prize: {formattedPrizePool} ETH
                </span>
              )}
            </p>
          ) : (
            <p className="text-white/70 mt-4">
              You advance to {getNextRoundName()}!
            </p>
          )}
        </div>
      ) : winnerAddress && loserAddress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 font-bold">Winner (You):</span>
            <span className="text-white/90 font-mono text-sm">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-red-400">Opponent (Timed Out):</span>
            <span className="text-white/70 font-mono text-sm">
              {shortenAddress(loserAddress)}
            </span>
          </div>
          {isFinalRound ? (
            <p className="text-white/70 mt-4">
              Your opponent failed to move in time. You have won the tournament!
              {formattedPrizePool && (
                <span className="block text-green-400 font-bold mt-2">
                  Prize: {formattedPrizePool} ETH
                </span>
              )}
            </p>
          ) : (
            <p className="text-white/70 mt-4">
              Your opponent failed to move in time. You advance to {getNextRoundName()}!
            </p>
          )}
        </div>
      ) : (
        isFinalRound
          ? `Your opponent failed to move in time. You have won the tournament!${formattedPrizePool ? ` Prize: ${formattedPrizePool} ETH` : ''}`
          : `Your opponent failed to move in time. You advance to ${getNextRoundName()}!`
      ),
      bgGradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
      borderColor: 'border-green-400/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
      glowColor: 'shadow-green-500/30',
      animation: 'animate-bounce'
    },
    lose: {
      icon: completionReason === 3 || completionReason === 4 ? AlertCircle : Frown,
      title: completionReason === 3 || completionReason === 4 ? 'Match Eliminated' : getDefeatText(),
      subtitle: completionReason === 3 || completionReason === 4 ? 'Tournament Escalation' : 'Better luck next time!',
      description: completionReason === 3 || completionReason === 4 ? (
        <div className="space-y-2">
          <p className="text-white/90">
            Your match was eliminated via{' '}
            <a
              href={completionReason === 3 ? '#ml2' : '#ml3'}
              className="text-orange-400 underline decoration-dotted hover:text-orange-300 font-semibold"
            >
              {completionReason === 3 ? 'ML2' : 'ML3'}
            </a>
            {' '}due to match escalation.
          </p>
        </div>
      ) : winnerAddress && loserAddress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400">Winner:</span>
            <span className="text-white/90 font-mono text-sm">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-red-400 font-bold">Loser (You):</span>
            <span className="text-white/70 font-mono text-sm">
              {shortenAddress(loserAddress)}
            </span>
          </div>
        </div>
      ) : null,
      bgGradient: completionReason === 3 || completionReason === 4 ? 'from-orange-500/20 via-amber-500/20 to-yellow-500/20' : 'from-red-500/20 via-rose-500/20 to-pink-500/20',
      borderColor: completionReason === 3 || completionReason === 4 ? 'border-orange-400/50' : 'border-red-400/50',
      iconColor: completionReason === 3 || completionReason === 4 ? 'text-orange-400' : 'text-red-400',
      titleColor: completionReason === 3 || completionReason === 4 ? 'text-orange-300' : 'text-red-300',
      glowColor: completionReason === 3 || completionReason === 4 ? 'shadow-orange-500/30' : 'shadow-red-500/30',
      animation: ''
    },
    forfeit_lose: {
      icon: Frown,
      title: 'Timeout!',
      subtitle: 'You ran out of time',
      description: winnerAddress && loserAddress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400">Winner:</span>
            <span className="text-white/90 font-mono text-sm">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-red-400 font-bold">Loser (You):</span>
            <span className="text-white/70 font-mono text-sm">
              {shortenAddress(loserAddress)}
            </span>
          </div>
          <p className="text-white/70 mt-4">
            You failed to make a move in time and forfeit the match. You have been eliminated from the tournament.
          </p>
        </div>
      ) : 'You failed to make a move in time and forfeit the match. You have been eliminated from the tournament.',
      bgGradient: 'from-red-500/20 via-rose-500/20 to-pink-500/20',
      borderColor: 'border-red-400/50',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300',
      glowColor: 'shadow-red-500/30',
      animation: ''
    },
    draw: {
      icon: Equal,
      title: "It's a Draw!",
      subtitle: 'Evenly matched',
      description: 'Neither player could secure a victory.',
      bgGradient: 'from-blue-500/20 via-cyan-500/20 to-teal-500/20',
      borderColor: 'border-blue-400/50',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300',
      glowColor: 'shadow-blue-500/30',
      animation: ''
    },
    double_forfeit: {
      icon: Frown,
      title: 'Double Forfeit',
      subtitle: 'Both players eliminated',
      description: 'Neither player made a move in time. Both are eliminated from the tournament.',
      bgGradient: 'from-gray-500/20 via-slate-500/20 to-zinc-500/20',
      borderColor: 'border-gray-400/50',
      iconColor: 'text-gray-400',
      titleColor: 'text-gray-300',
      glowColor: 'shadow-gray-500/30',
      animation: ''
    },
    tournament_ended: {
      icon: AlertCircle,
      title: 'Tournament Ended',
      subtitle: 'You Were Eliminated',
      description: (
        <div className="space-y-3">
          <p className="text-white/90 font-semibold">
            Your active match was terminated because the tournament completed.
          </p>
          {tournamentWinner && (
            <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-400/40">
              <p className="text-orange-300 text-sm">
                <span className="font-semibold">Tournament Winner: </span>
                <span className="font-mono">{shortenAddress(tournamentWinner)}</span>
              </p>
            </div>
          )}
          <div className="bg-white/10 rounded-lg p-3 border border-white/20">
            <p className="text-white/80 text-sm">
              <span className="font-semibold text-orange-400">Completion Reason: </span>
              {completionReason !== undefined ? getCompletionReasonMessage(completionReason, tournamentWinner) : 'Tournament ended'}
            </p>
          </div>
          <p className="text-white/60 text-sm">
            Your match did not finish before the tournament concluded.
          </p>
        </div>
      ),
      bgGradient: 'from-orange-500/20 via-yellow-500/20 to-red-500/20',
      borderColor: 'border-orange-400/50',
      iconColor: 'text-orange-400',
      titleColor: 'text-orange-300',
      glowColor: 'shadow-orange-500/30',
      animation: ''
    }
  };

  const currentConfig = config[result] || config.lose;
  const IconComponent = currentConfig.icon;

  // Match results (win/lose/draw) should have higher priority than tournament_ended
  const zIndex = result === 'tournament_ended' ? 'z-50' : 'z-[60]';

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative max-w-md w-full
          bg-gradient-to-br ${currentConfig.bgGradient}
          backdrop-blur-xl rounded-2xl
          border ${currentConfig.borderColor}
          shadow-2xl ${currentConfig.glowColor}
          p-8 transform transition-all duration-300
          animate-in fade-in zoom-in-95
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={20} className="text-white/70" />
        </button>

        {/* Icon */}
        <div className={`flex justify-center mb-6 ${currentConfig.animation}`}>
          <div className={`p-4 rounded-full bg-white/10 ${currentConfig.iconColor}`}>
            <IconComponent size={64} />
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-4xl font-bold text-center mb-2 ${currentConfig.titleColor}`}>
          {currentConfig.title}
        </h2>

        {/* Subtitle */}
        <p className="text-xl text-center text-white/90 mb-4">
          {currentConfig.subtitle}
        </p>

        {/* Description */}
        <div className="text-center text-white/70 mb-8">
          {currentConfig.description}
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className={`
            w-full py-3 px-6 rounded-xl font-bold text-lg
            bg-white/10 hover:bg-white/20
            border border-white/20 hover:border-white/30
            transition-all duration-200
            text-white
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default MatchEndModal;
