/**
 * Shared EnrolledPlayersList Component
 *
 * Displays a list of enrolled players in a tournament bracket.
 * Highlights the current user's address with arrows.
 */

import { Users } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

/**
 * @param {Object} props
 * @param {string[]} props.enrolledPlayers - Array of player addresses
 * @param {string|null} props.account - Current user's address
 * @param {Object} props.colors - Color theme object with 'icon' and 'text' properties
 */
const EnrolledPlayersList = ({ enrolledPlayers, account, colors }) => {
  if (!enrolledPlayers || enrolledPlayers.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 bg-black/20 rounded-lg p-4 border border-purple-400/30">
      <div className="flex items-center gap-2 mb-3">
        <Users className={colors.icon} size={20} />
        <h4 className={`${colors.text} font-semibold`}>
          Enrolled Players ({enrolledPlayers.length})
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-purple-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:from-purple-400 hover:[&::-webkit-scrollbar-thumb]:to-blue-400 [scrollbar-width:thin] [scrollbar-color:rgb(168_85_247_/_0.7)_rgb(24_24_27_/_0.4)]">
        {enrolledPlayers.map((address, idx) => {
          const isCurrentUser = address.toLowerCase() === account?.toLowerCase();
          return (
            <div
              key={idx}
              className={`font-mono text-sm p-2 rounded ${
                isCurrentUser
                  ? 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 font-bold'
                  : 'bg-purple-500/10 text-purple-300'
              }`}
            >
              {isCurrentUser && (
                <span className="text-yellow-400 text-xs mr-1">→</span>
              )}
              {shortenAddress(address)}
              {isCurrentUser && (
                <span className="text-yellow-400 text-xs ml-1">←</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnrolledPlayersList;
