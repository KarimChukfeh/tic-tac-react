/**
 * MiniMatchEndModal - Compact match end feedback for Activity Panel
 *
 * Displays victory/defeat/draw results inline within the mini board area
 */

import { Trophy, Frown, Equal, X, AlertCircle } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { ethers } from 'ethers';
import UserManualAnchorLink from './UserManualAnchorLink';
import { getUserManualHrefForReasonCode } from '../../utils/userManualLinks';

const MiniMatchEndModal = ({
  result,
  completionReason = 0,
  onClose,
  winnerAddress,
  loserAddress,
  currentAccount,
  gameType = 'game',
  isVisible = true,
  roundNumber,
  totalRounds,
  prizePool
}) => {
  if (!isVisible) return null;

  // Determine if this is the final round
  const isFinalRound = totalRounds !== undefined && roundNumber !== undefined && roundNumber === totalRounds - 1;

  // Format prize pool if available
  const formattedPrizePool = prizePool ? ethers.formatEther(prizePool) : null;

  // Get next round name
  const getNextRoundName = () => {
    if (!totalRounds || roundNumber === undefined) return 'next round';

    const nextRound = roundNumber + 2; // +1 for 0-index, +1 for next round

    if (nextRound === totalRounds) {
      return 'Finals';
    } else if (nextRound === totalRounds - 1) {
      return 'Semi-Finals';
    } else if (nextRound === totalRounds - 2) {
      return 'Quarter-Finals';
    } else {
      return `Round ${nextRound}`;
    }
  };

  // Game-specific victory text
  const getGameSpecificVictoryMessage = () => {
    switch (gameType) {
      case 'tictactoe':
        return 'Three in a row!';
      case 'chess':
        return 'Checkmate!';
      case 'connectfour':
        return 'Four connected!';
      default:
        return 'Victory!';
    }
  };

  // Game-specific defeat text
  const getGameSpecificDefeatMessage = () => {
    switch (gameType) {
      case 'tictactoe':
        return 'Opponent got three in a row';
      case 'chess':
        return "You've been checkmated";
      case 'connectfour':
        return 'Opponent connected four';
      default:
        return 'Defeated';
    }
  };

  // Get message based on completion reason
  const getReasonMessage = () => {
    // Completion reasons:
    // 0: Normal, 1: Timeout (ML1), 2: Draw/Forfeit, 3: Force Elimination (ML2),
    // 4: Abandoned Match (ML3), 5: All Draw

    if (completionReason === 1) {
      // ML1: Timeout
      if (result === 'forfeit_win') {
        if (isFinalRound) {
          return (
            <span>
              Opponent timed out via <UserManualAnchorLink href={getUserManualHrefForReasonCode('ML1')} onClick={onClose} className="underline decoration-dotted hover:text-white">ML1</UserManualAnchorLink>. Champion!{formattedPrizePool ? ` +${formattedPrizePool} ETH` : ''}
            </span>
          );
        }
        return (
          <span>
            Opponent timed out via <UserManualAnchorLink href={getUserManualHrefForReasonCode('ML1')} onClick={onClose} className="underline decoration-dotted hover:text-white">ML1</UserManualAnchorLink>. Advance to {getNextRoundName()}
          </span>
        );
      } else if (result === 'forfeit_lose') {
        return 'You ran out of time';
      }
    } else if (completionReason === 3) {
      // ML2: Force Elimination
      return (
        <span>
          Match eliminated via <UserManualAnchorLink href={getUserManualHrefForReasonCode('ML2')} onClick={onClose} className="underline decoration-dotted hover:text-white">ML2</UserManualAnchorLink>
        </span>
      );
    } else if (completionReason === 4) {
      // ML3: Abandoned Match
      return (
        <span>
          Match eliminated via <UserManualAnchorLink href={getUserManualHrefForReasonCode('ML3')} onClick={onClose} className="underline decoration-dotted hover:text-white">ML3</UserManualAnchorLink>
        </span>
      );
    }

    // Default messages based on result type
    if (result === 'win') {
      if (isFinalRound) {
        return `Tournament Champion!${formattedPrizePool ? ` +${formattedPrizePool} ETH` : ''}`;
      }
      return `Advance to ${getNextRoundName()}`;
    } else if (result === 'forfeit_win') {
      if (isFinalRound) {
        return `Opponent timed out. Champion!${formattedPrizePool ? ` +${formattedPrizePool} ETH` : ''}`;
      }
      return `Opponent timed out. Advance to ${getNextRoundName()}`;
    } else if (result === 'forfeit_lose') {
      return 'You ran out of time';
    } else if (result === 'draw') {
      return 'Neither player won';
    } else if (result === 'lose') {
      return 'You have been eliminated';
    }

    return '';
  };

  // Get title based on completion reason and result
  const getTitle = () => {
    // ML1: Timeout
    if (completionReason === 1) {
      if (result === 'forfeit_win') {
        return 'Victory by Timeout!';
      } else if (result === 'forfeit_lose') {
        return 'Timeout';
      }
    }

    // ML2 or ML3 eliminations
    if (completionReason === 3 || completionReason === 4) {
      return 'Match Eliminated';
    }

    // Normal results
    if (result === 'win' || result === 'forfeit_win') {
      if (isFinalRound) {
        return 'Champion!';
      }
      return getGameSpecificVictoryMessage();
    } else if (result === 'lose') {
      return getGameSpecificDefeatMessage();
    } else if (result === 'forfeit_lose') {
      return 'Timeout';
    } else if (result === 'draw') {
      return 'Draw';
    }

    return 'Match Complete';
  };

  // Determine config based on completion reason
  const getConfig = () => {
    // ML2 or ML3 eliminations
    if (completionReason === 3 || completionReason === 4) {
      return {
        icon: AlertCircle,
        title: getTitle(),
        message: getReasonMessage(),
        bgGradient: 'from-orange-500/30 to-amber-500/30',
        borderColor: 'border-orange-400/60',
        iconColor: 'text-orange-400',
        titleColor: 'text-orange-300'
      };
    }

    // Normal results
    const configs = {
      win: {
        icon: Trophy,
        bgGradient: 'from-green-500/30 to-emerald-500/30',
        borderColor: 'border-green-400/60',
        iconColor: 'text-green-400',
        titleColor: 'text-green-300'
      },
      forfeit_win: {
        icon: Trophy,
        bgGradient: 'from-green-500/30 to-emerald-500/30',
        borderColor: 'border-green-400/60',
        iconColor: 'text-green-400',
        titleColor: 'text-green-300'
      },
      lose: {
        icon: Frown,
        bgGradient: 'from-red-500/30 to-pink-500/30',
        borderColor: 'border-red-400/60',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300'
      },
      forfeit_lose: {
        icon: Frown,
        bgGradient: 'from-red-500/30 to-pink-500/30',
        borderColor: 'border-red-400/60',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300'
      },
      draw: {
        icon: Equal,
        bgGradient: 'from-blue-500/30 to-cyan-500/30',
        borderColor: 'border-blue-400/60',
        iconColor: 'text-blue-400',
        titleColor: 'text-blue-300'
      }
    };

    const baseConfig = configs[result] || configs.lose;
    return {
      ...baseConfig,
      title: getTitle(),
      message: getReasonMessage()
    };
  };

  const currentConfig = getConfig();
  const IconComponent = currentConfig.icon;

  return (
    <div className={`
      relative mb-2 p-2
      bg-gradient-to-br ${currentConfig.bgGradient}
      backdrop-blur-sm rounded-lg
      border ${currentConfig.borderColor}
      animate-in fade-in zoom-in-95 duration-300
    `}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-1 right-1 p-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X size={12} className="text-white/70" />
      </button>

      {/* Icon and Title - Compact */}
      <div className="flex items-center justify-center gap-2">
        <IconComponent size={20} className={currentConfig.iconColor} />
        <div className="text-center">
          <h3 className={`text-sm font-bold ${currentConfig.titleColor}`}>
            {currentConfig.title}
          </h3>
          <p className="text-[10px] text-white/70">
            {currentConfig.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MiniMatchEndModal;
