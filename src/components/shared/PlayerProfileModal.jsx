import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Trophy, User, X } from 'lucide-react';
import { ethers } from 'ethers';
import { getAddressUrl } from '../../config/networks';
import { shortenAddress, getTournamentTypeLabel } from '../../utils/formatters';
import { getTournamentResolutionReasonValue } from '../../utils/completionReasons';
import { getV2TournamentResolutionText, isV2TournamentCancelledReason } from '../../v2/lib/reasonLabels';
import { usePlayerProfile } from '../../v2/hooks/usePlayerProfile';
import { useConnectFourPlayerProfile } from '../../v2/hooks/useConnectFourPlayerProfile';
import { useChessPlayerProfile } from '../../v2/hooks/useChessPlayerProfile';
import { linkifyReasonText } from './UserManualAnchorLink';

function formatEthAmount(value, digits = 4) {
  const parsed = Number(ethers.formatEther(value ?? 0n));
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : '0';
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function getRecordPayout(record) {
  return record?.payout ?? 0n;
}

function getRecordPrizePool(record) {
  return record?.prizePool ?? record?.prize ?? 0n;
}

function isCancelledTournamentRecord(record) {
  return Number(record?.instanceStatus ?? -1) === 3;
}

function hasCancelledTournamentReason(record) {
  return isV2TournamentCancelledReason(getTournamentResolutionReasonValue(record));
}

function getTournamentResolutionText(record) {
  if (hasCancelledTournamentReason(record) || isCancelledTournamentRecord(record)) {
    return getV2TournamentResolutionText(5).text;
  }
  if (!record?.won && getRecordPayout(record) > 0n && record?.entryFee != null && getRecordPayout(record) === record.entryFee) {
    return getV2TournamentResolutionText(5).text;
  }
  return getV2TournamentResolutionText(getTournamentResolutionReasonValue(record)).text;
}

function getTournamentOutcomeClass(record) {
  if (!record?.concluded) return 'text-yellow-300 border-yellow-400/30 bg-yellow-500/10';
  if (hasCancelledTournamentReason(record) || isCancelledTournamentRecord(record)) return 'text-slate-300 border-slate-400/30 bg-slate-500/10';
  if (record?.won) return 'text-green-300 border-green-400/30 bg-green-500/10';
  return 'text-red-300 border-red-400/30 bg-red-500/10';
}

const PlayerProfileModal = ({
  isOpen,
  onClose,
  gameType,
  targetAddress,
  factoryContract,
  runner,
  onViewTournament,
}) => {
  const enabled = Boolean(isOpen && targetAddress && factoryContract && runner);
  const normalizedTargetAddress = targetAddress || '';

  const ticTacToeProfile = usePlayerProfile(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'tictactoe',
    pollIntervalMs: null,
  });
  const connectFourProfile = useConnectFourPlayerProfile(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'connectfour',
    pollIntervalMs: null,
  });
  const chessProfile = useChessPlayerProfile(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'chess',
    pollIntervalMs: null,
  });

  const playerProfile = gameType === 'chess'
    ? chessProfile
    : gameType === 'connectfour'
      ? connectFourProfile
      : ticTacToeProfile;

  const totalPayouts = (playerProfile.enrollments || []).reduce((sum, record) => sum + getRecordPayout(record), 0n);
  const walletExplorerUrl = normalizedTargetAddress
    ? (getAddressUrl(normalizedTargetAddress) || `https://arbiscan.io/address/${normalizedTargetAddress}`)
    : null;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tournamentsLoading = Boolean(playerProfile.loading);
  const stats = playerProfile.stats;
  const enrollments = Array.isArray(playerProfile.enrollments) ? playerProfile.enrollments : [];

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-teal-400/30 bg-gradient-to-br from-teal-950/95 via-slate-900/95 to-cyan-950/95 shadow-[0_25px_80px_rgba(8,145,178,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-teal-400/20 px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User className="text-teal-300" size={22} />
                <h2 className="text-xl font-bold text-white md:text-2xl">Player Stats</h2>
              </div>
              <div className="mt-2 space-y-2 text-sm text-teal-100/90">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">Player:</span>
                  <a
                    href={walletExplorerUrl || undefined}
                    target={walletExplorerUrl ? '_blank' : undefined}
                    rel={walletExplorerUrl ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1 rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 font-mono text-sm text-teal-100/90 transition-colors hover:border-teal-300/40 hover:bg-teal-500/15 hover:text-white"
                  >
                    {shortenAddress(normalizedTargetAddress)}
                    {walletExplorerUrl && (
                      <ExternalLink size={13} />
                    )}
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">Wins:</span>
                  <span>{stats?.totalWins ?? 0}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-amber-200/90">
                  <span className="font-semibold text-white">Payouts:</span>
                  <span>{formatEthAmount(totalPayouts)} ETH</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-400/20 bg-slate-500/10 p-2 text-slate-200 transition-colors hover:text-white"
              aria-label="Close player stats"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="border-b border-teal-400/20 px-5 md:px-6">
          <div className="flex gap-2">
            <div className="border-b-2 border-teal-400 px-3 py-3 text-sm font-semibold text-teal-200">
              Enrollments
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pt-5 pb-8 md:px-6">
          {tournamentsLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-teal-400" />
              <p className="mt-3 text-sm text-slate-400">Loading player profile...</p>
            </div>
          ) : !playerProfile.profileAddress ? (
            <div className="rounded-2xl border border-slate-400/15 bg-slate-900/50 px-6 py-10 text-center">
              <Trophy className="mx-auto mb-3 text-slate-500" size={30} />
              <p className="text-sm text-slate-300">No on-chain profile found for this address yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {enrollments.length > 0 ? (
                <div className="space-y-3">
                  {enrollments.map((record, index) => (
                    <div key={`${record.instance}-${record.enrolledAt}-${index}`} className="rounded-2xl border border-slate-400/15 bg-slate-900/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getTournamentOutcomeClass(record)}`}>
                              {record.concluded
                                ? (hasCancelledTournamentReason(record) || isCancelledTournamentRecord(record) ? 'Cancelled' : record.won ? 'Won' : 'Lost')
                                : 'Active'}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {record.playerCount ? getTournamentTypeLabel(record.playerCount) : 'Tournament'}
                            </span>
                            {record.enrolledAt > 0 && <span className="text-xs text-slate-400">{formatTimeAgo(record.enrolledAt)}</span>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
                            <span>{record.playerCount ? `${record.playerCount} Players` : 'Player count unavailable'}</span>
                            <span>{ethers.formatEther(record.entryFee ?? 0n)} ETH entry</span>
                            {getRecordPayout(record) > 0n && (
                              <span className="text-green-300">
                                +{ethers.formatEther(getRecordPayout(record))} ETH {hasCancelledTournamentReason(record) ? 'refund' : 'payout'}
                              </span>
                            )}
                            {!record.won && getRecordPrizePool(record) > 0n && getRecordPayout(record) === 0n && (
                              <span>{ethers.formatEther(getRecordPrizePool(record))} ETH prize pool</span>
                            )}
                          </div>
                          {record.concluded && (
                            <div className="mt-2 text-xs text-slate-400">
                              Resolved via <span className="text-slate-200">{linkifyReasonText(getTournamentResolutionText(record), { keyPrefix: `player-profile-resolution-${index}`, linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white' })}</span>
                            </div>
                          )}
                        </div>
                        {onViewTournament && record.instance && (
                          <button
                            type="button"
                            onClick={() => {
                              onViewTournament(record.instance);
                              onClose?.();
                            }}
                            className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition-colors hover:text-white"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-400/15 bg-slate-900/50 px-6 py-10 text-center">
                  <Trophy className="mx-auto mb-3 text-slate-500" size={30} />
                  <p className="text-sm text-slate-300">No tournament history yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerProfileModal;
