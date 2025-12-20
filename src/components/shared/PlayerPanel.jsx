/**
 * PlayerPanel - Shared component for displaying player info in match view
 *
 * Shows player icon, address, "THIS IS YOU" badge, and turn indicator.
 * Configurable styling based on player color theme.
 */

import { shortenAddress } from '../../utils/formatters';

const COLOR_CONFIGS = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-400/30',
    iconBg: 'bg-blue-500',
    text: 'text-blue-300',
    activeHighlight: 'bg-cyan-500/30 border-cyan-400'
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-600/20 to-purple-600/20',
    border: 'border-pink-400/30',
    iconBg: 'bg-pink-500',
    text: 'text-pink-300',
    activeHighlight: 'bg-pink-500/30 border-pink-400'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-600/20 to-orange-600/20',
    border: 'border-red-400/30',
    iconBg: 'bg-red-500',
    text: 'text-red-300',
    activeHighlight: 'bg-red-500/30 border-red-400'
  },
  white: {
    bg: 'bg-slate-900/50',
    border: 'border-blue-500/30',
    iconBg: 'bg-white text-black',
    text: 'text-blue-300',
    activeHighlight: 'bg-blue-500/30 border-blue-400'
  },
  black: {
    bg: 'bg-slate-900/50',
    border: 'border-pink-500/30',
    iconBg: 'bg-gray-900 text-white',
    text: 'text-pink-300',
    activeHighlight: 'bg-pink-500/30 border-pink-400'
  }
};

const PlayerPanel = ({
  playerAddress,
  currentAccount,
  isCurrentTurn,
  isGameOver,
  icon,
  label,
  colorScheme = 'blue',
  variant = 'full', // 'full' | 'compact'
  renderStats, // Optional render prop for game-specific stats
  extraContent // Optional extra content (e.g., check indicator for chess)
}) => {
  const colors = COLOR_CONFIGS[colorScheme] || COLOR_CONFIGS.blue;
  const isYou = currentAccount && playerAddress?.toLowerCase() === currentAccount.toLowerCase();

  if (variant === 'compact') {
    // Compact variant for centered/inline layouts
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${
        isCurrentTurn && !isGameOver
          ? `${colors.activeHighlight} border`
          : 'bg-black/30'
      }`}>
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="font-mono text-sm">{shortenAddress(playerAddress)}</div>
        </div>
      </div>
    );
  }

  // Full variant for sidebar/column layouts
  return (
    <div className={`${colors.bg} backdrop-blur-lg rounded-2xl p-6 border ${colors.border}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 ${colors.iconBg} rounded-full flex items-center justify-center text-2xl font-bold border-2 ${colors.border}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{label}</h3>
          <p className={`${colors.text} font-mono text-sm`}>
            {shortenAddress(playerAddress)}
          </p>
          {isYou && (
            <span className="text-yellow-300 text-xs font-bold">THIS IS YOU</span>
          )}
        </div>
      </div>

      {renderStats && (
        <div className="space-y-2">
          {renderStats()}
        </div>
      )}

      {isCurrentTurn && !isGameOver && (
        <div className="bg-green-500/20 border border-green-400 rounded-lg p-3 text-center mt-2">
          <span className="text-green-300 font-bold">Your Turn!</span>
        </div>
      )}

      {extraContent}
    </div>
  );
};

export default PlayerPanel;
