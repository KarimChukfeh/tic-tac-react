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
  },
  magenta: {
    bg: 'bg-gradient-to-br from-fuchsia-600/20 to-purple-600/20',
    border: 'border-fuchsia-400/30',
    iconBg: 'bg-fuchsia-500',
    text: 'text-fuchsia-300',
    activeHighlight: 'bg-fuchsia-500/30 border-fuchsia-400'
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-600/20 to-blue-600/20',
    border: 'border-cyan-400/30',
    iconBg: 'bg-cyan-500',
    text: 'text-cyan-300',
    activeHighlight: 'bg-cyan-500/30 border-cyan-400'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-600/20 to-violet-600/20',
    border: 'border-purple-400/30',
    iconBg: 'bg-purple-500',
    text: 'text-purple-300',
    activeHighlight: 'bg-purple-500/30 border-purple-400'
  },
  neonblue: {
    bg: 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20',
    border: 'border-blue-400/30',
    iconBg: 'bg-blue-500',
    text: 'text-blue-300',
    activeHighlight: 'bg-blue-500/30 border-blue-400'
  },
  neonred: {
    bg: 'bg-gradient-to-br from-red-600/20 to-rose-600/20',
    border: 'border-red-400/30',
    iconBg: 'bg-red-500',
    text: 'text-red-300',
    activeHighlight: 'bg-red-500/30 border-red-400'
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
      <div className={`relative flex flex-col gap-2 p-3 rounded-lg ${
        isCurrentTurn && !isGameOver
          ? `${colors.activeHighlight} border-2 shadow-lg animate-pulse`
          : isYou
          ? 'bg-yellow-500/20 border border-yellow-400/50'
          : 'bg-black/30'
      } ${isYou ? 'ring-2 ring-yellow-400/30' : ''}`}>
        {isCurrentTurn && !isGameOver && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg animate-bounce z-50">
            YOUR TURN!
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="font-mono text-xs">{shortenAddress(playerAddress)}</div>
            {isYou && (
              <div className="text-yellow-300 text-xs font-bold mt-1">YOU</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant for sidebar/column layouts
  return (
    <div className={`relative ${colors.bg} backdrop-blur-lg rounded-2xl p-6 border-2 ${
      isCurrentTurn && !isGameOver
        ? 'border-green-400 shadow-2xl shadow-green-400/50 ring-4 ring-green-400/30 animate-pulse'
        : isYou
        ? 'border-yellow-400 shadow-lg shadow-yellow-400/50 ring-2 ring-yellow-400/30'
        : colors.border
    }`}>
      {isCurrentTurn && !isGameOver && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-6 py-2 rounded-full text-center font-black text-lg shadow-2xl z-50 animate-bounce">
          YOUR TURN!
        </div>
      )}
      {isYou && !isCurrentTurn && (
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-4 py-2 rounded-lg mb-4 text-center font-bold text-lg shadow-md flex items-center justify-center gap-2">
          YOU
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 ${colors.iconBg} rounded-full flex items-center justify-center text-2xl font-bold border-2 ${
          isCurrentTurn && !isGameOver
            ? 'border-green-400 shadow-lg shadow-green-400/50'
            : isYou
            ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
            : colors.border
        }`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{label}</h3>
          <p className={`${colors.text} font-mono text-sm`}>
            {shortenAddress(playerAddress)}
          </p>
        </div>
      </div>

      {renderStats && (
        <div className="space-y-2">
          {renderStats()}
        </div>
      )}

      {extraContent}
    </div>
  );
};

export default PlayerPanel;
