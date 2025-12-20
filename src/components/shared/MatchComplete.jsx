/**
 * MatchComplete - Shared component for match completion display
 *
 * Shows win/lose/draw status and winner information.
 */

import { shortenAddress } from '../../utils/formatters';

const MatchComplete = ({
  isDraw,
  winner,
  currentAccount,
  gameSpecificText // Optional override for win text (e.g., "Checkmate!" for chess)
}) => {
  const userWon = winner && currentAccount &&
    winner.toLowerCase() === currentAccount.toLowerCase();

  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.15)'
      }}
    >
      <p className="text-white font-bold text-xl mb-2">
        {isDraw ? "It's a Draw!" : (gameSpecificText || 'Match Complete!')}
      </p>
      {!isDraw && winner && (
        <p className="text-green-300">
          Winner: {shortenAddress(winner)}
          {userWon && ' (YOU!)'}
        </p>
      )}
    </div>
  );
};

export default MatchComplete;
