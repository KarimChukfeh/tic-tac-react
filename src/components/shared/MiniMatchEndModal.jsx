/**
 * MiniMatchEndModal - Compact match end feedback for Activity Panel
 *
 * Displays victory/defeat/draw results inline within the mini board area
 */

import { Trophy, Frown, Equal, X } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';
import { ethers } from 'ethers';

const MiniMatchEndModal = ({
  result,
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
  const getVictoryText = () => {
    if (isFinalRound) {
      return 'Champion!';
    }

    switch (gameType) {
      case 'chess':
        return 'Checkmate!';
      case 'connectfour':
        return '4 in a Row!';
      case 'tictactoe':
        return '3 in a Row!';
      default:
        return 'Victory!';
    }
  };

  const config = {
    win: {
      icon: Trophy,
      title: getVictoryText(),
      subtitle: 'You Won!',
      message: isFinalRound
        ? `Tournament Champion!${formattedPrizePool ? ` +${formattedPrizePool} ETH` : ''}`
        : `Advance to ${getNextRoundName()}`,
      bgGradient: 'from-yellow-500/30 to-orange-500/30',
      borderColor: 'border-yellow-400/60',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-300'
    },
    forfeit_win: {
      icon: Trophy,
      title: isFinalRound ? 'Champion!' : 'Win by Forfeit',
      subtitle: 'You Won!',
      message: isFinalRound
        ? `Opponent timed out. Champion!${formattedPrizePool ? ` +${formattedPrizePool} ETH` : ''}`
        : `Opponent timed out. Advance to ${getNextRoundName()}`,
      bgGradient: 'from-yellow-500/30 to-orange-500/30',
      borderColor: 'border-yellow-400/60',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-300'
    },
    lose: {
      icon: Frown,
      title: 'Defeated',
      subtitle: 'Better luck next time',
      message: 'You have been eliminated',
      bgGradient: 'from-red-500/30 to-pink-500/30',
      borderColor: 'border-red-400/60',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300'
    },
    forfeit_lose: {
      icon: Frown,
      title: 'Timeout',
      subtitle: 'You ran out of time',
      message: 'You have been eliminated',
      bgGradient: 'from-red-500/30 to-pink-500/30',
      borderColor: 'border-red-400/60',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300'
    },
    draw: {
      icon: Equal,
      title: "Draw",
      subtitle: 'Evenly matched',
      message: 'Neither player won',
      bgGradient: 'from-blue-500/30 to-cyan-500/30',
      borderColor: 'border-blue-400/60',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300'
    },
    double_forfeit: {
      icon: Frown,
      title: 'Double Forfeit',
      subtitle: 'Both eliminated',
      message: 'Both players timed out',
      bgGradient: 'from-gray-500/30 to-slate-500/30',
      borderColor: 'border-gray-400/60',
      iconColor: 'text-gray-400',
      titleColor: 'text-gray-300'
    }
  };

  const currentConfig = config[result] || config.lose;
  const IconComponent = currentConfig.icon;

  return (
    <div className={`
      relative mt-3 p-4
      bg-gradient-to-br ${currentConfig.bgGradient}
      backdrop-blur-sm rounded-lg
      border-2 ${currentConfig.borderColor}
      animate-in fade-in zoom-in-95 duration-300
    `}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X size={14} className="text-white/70" />
      </button>

      {/* Icon and Title */}
      <div className="flex flex-col items-center mb-3">
        <div className={`p-2 rounded-full bg-white/10 ${currentConfig.iconColor} mb-2`}>
          <IconComponent size={32} />
        </div>
        <h3 className={`text-lg font-bold ${currentConfig.titleColor}`}>
          {currentConfig.title}
        </h3>
        <p className="text-xs text-white/80 mt-0.5">
          {currentConfig.subtitle}
        </p>
      </div>

      {/* Player Info */}
      {winnerAddress && loserAddress && (
        <div className="space-y-1.5 mb-3 text-xs">
          <div className="flex items-center justify-center gap-2">
            <span className={result.includes('win') ? 'text-green-400 font-bold' : 'text-green-400'}>
              Winner{result.includes('win') ? ' (You)' : ''}:
            </span>
            <span className="text-white/90 font-mono">
              {shortenAddress(winnerAddress)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className={result.includes('lose') || result === 'forfeit_lose' ? 'text-red-400 font-bold' : 'text-red-400'}>
              Loser{result.includes('lose') || result === 'forfeit_lose' ? ' (You)' : ''}:
            </span>
            <span className="text-white/70 font-mono">
              {shortenAddress(loserAddress)}
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      <p className="text-center text-white/80 text-xs mb-3">
        {currentConfig.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={onClose}
        className="w-full py-2 px-4 rounded-lg font-semibold text-sm
          bg-white/10 hover:bg-white/20
          border border-white/20 hover:border-white/30
          transition-all duration-200 text-white"
      >
        {result.includes('lose') || result === 'forfeit_lose' ? 'View Board' : 'Continue'}
      </button>
    </div>
  );
};

export default MiniMatchEndModal;
