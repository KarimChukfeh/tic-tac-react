import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Trophy, TrendingUp, User, X } from 'lucide-react';
import { ethers } from 'ethers';
import { getAddressUrl } from '../../config/networks';
import { shortenAddress, getBracketRoundLabel, getTournamentTypeLabel } from '../../utils/formatters';
import { getMatchCompletionReasonValue, getTournamentResolutionReasonValue, isDraw } from '../../utils/completionReasons';
import { getV2TournamentResolutionText, isV2TournamentCancelledReason } from '../../v2/lib/reasonLabels';
import { usePlayerProfile } from '../../v2/hooks/usePlayerProfile';
import { useConnectFourPlayerProfile } from '../../v2/hooks/useConnectFourPlayerProfile';
import { useChessPlayerProfile } from '../../v2/hooks/useChessPlayerProfile';
import { useV2MatchHistory } from '../../v2/hooks/useV2MatchHistory';
import { useConnectFourV2MatchHistory } from '../../v2/hooks/useConnectFourV2MatchHistory';
import { useChessV2MatchHistory } from '../../v2/hooks/useChessV2MatchHistory';
import CompletedMatchOutcomeBadge from './CompletedMatchOutcomeBadge';
import { linkifyReasonText } from './UserManualAnchorLink';

const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();

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

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

function getMatchMetaLabel(match) {
  const playerCount = Number(match.playerCount || 2);
  const tournamentLabel = getTournamentTypeLabel(playerCount);
  const bracketRoundLabel = getBracketRoundLabel(playerCount, match.roundNumber);
  if (playerCount === 2) return tournamentLabel;
  if (bracketRoundLabel) return `${tournamentLabel} • ${bracketRoundLabel}`;
  return `${tournamentLabel} • Round ${Number(match.roundNumber ?? 0) + 1}`;
}

function getGameName(gameType) {
  if (gameType === 'connectfour') return 'connect4';
  return gameType;
}

const PlayerProfileModal = ({
  isOpen,
  onClose,
  gameType,
  targetAddress,
  factoryContract,
  runner,
  onViewTournament,
  reasonLabelMode = 'v2',
}) => {
  const [activeTab, setActiveTab] = useState('tournaments');
  const enabled = Boolean(isOpen && targetAddress && factoryContract && runner);
  const normalizedTargetAddress = targetAddress || '';
  const targetLower = normalizedTargetAddress.toLowerCase();
  const gameName = getGameName(gameType);

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

  const ticTacToeMatchHistory = useV2MatchHistory(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'tictactoe',
    pollIntervalMs: null,
  });
  const connectFourMatchHistory = useConnectFourV2MatchHistory(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'connectfour',
    pollIntervalMs: null,
  });
  const chessMatchHistory = useChessV2MatchHistory(factoryContract, runner, normalizedTargetAddress, {
    enabled: enabled && gameType === 'chess',
    pollIntervalMs: null,
  });

  const playerProfile = gameType === 'chess'
    ? chessProfile
    : gameType === 'connectfour'
      ? connectFourProfile
      : ticTacToeProfile;
  const matchHistory = gameType === 'chess'
    ? chessMatchHistory
    : gameType === 'connectfour'
      ? connectFourMatchHistory
      : ticTacToeMatchHistory;

  const totalPayouts = (playerProfile.enrollments || []).reduce((sum, record) => sum + getRecordPayout(record), 0n);
  const walletExplorerUrl = normalizedTargetAddress
    ? (getAddressUrl(normalizedTargetAddress) || `https://arbiscan.io/address/${normalizedTargetAddress}`)
    : null;
  const profileExplorerUrl = playerProfile.profileAddress
    ? `${getAddressUrl(playerProfile.profileAddress) || `https://arbiscan.io/address/${playerProfile.profileAddress}`}#events`
    : null;

  useEffect(() => {
    if (!isOpen) return undefined;

    setActiveTab('tournaments');
  }, [isOpen, normalizedTargetAddress]);

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
  const matchesLoading = Boolean(matchHistory.loading);
  const stats = playerProfile.stats;
  const enrollments = Array.isArray(playerProfile.enrollments) ? playerProfile.enrollments : [];
  const matches = Array.isArray(matchHistory.matches) ? matchHistory.matches : [];

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-teal-400/30 bg-gradient-to-br from-teal-950/95 via-slate-900/95 to-cyan-950/95 shadow-[0_25px_80px_rgba(8,145,178,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-teal-400/20 px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User className="text-teal-300" size={22} />
                <h2 className="text-xl font-bold text-white md:text-2xl">Player Stats</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-teal-100/90">
                <span className="inline-flex items-center rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 font-mono">
                  {shortenAddress(normalizedTargetAddress)}
                </span>
                {walletExplorerUrl && (
                  <a
                    href={walletExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-200 transition-colors hover:text-white"
                  >
                    Wallet
                    <ExternalLink size={13} />
                  </a>
                )}
                {profileExplorerUrl && (
                  <a
                    href={profileExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-200 transition-colors hover:text-white"
                  >
                    Profile Contract {shortenAddress(playerProfile.profileAddress)}
                    <ExternalLink size={13} />
                  </a>
                )}
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
            <button
              type="button"
              onClick={() => setActiveTab('tournaments')}
              className={`border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'tournaments'
                  ? 'border-teal-400 text-teal-200'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Tournaments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'matches'
                  ? 'border-teal-400 text-teal-200'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Matches
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-9.5rem)] overflow-y-auto px-5 py-5 md:px-6">
          {activeTab === 'tournaments' ? (
            <>
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
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Total Payouts</div>
                      <div className="mt-2 text-lg font-bold text-white">{formatEthAmount(totalPayouts)} ETH</div>
                    </div>
                  </div>

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
            </>
          ) : (
            <>
              {matchesLoading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-teal-400" />
                  <p className="mt-3 text-sm text-slate-400">Loading match history...</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="rounded-2xl border border-slate-400/15 bg-slate-900/50 px-6 py-10 text-center">
                  <TrendingUp className="mx-auto mb-3 text-slate-500" size={30} />
                  <p className="text-sm text-slate-300">No completed matches found for this player.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match, index) => {
                    const reason = getMatchCompletionReasonValue(match);
                    const winnerLower = match.winner?.toLowerCase() || '';
                    const isWinner = !isDraw(reason) && winnerLower === targetLower && winnerLower !== ZERO_ADDRESS;

                    return (
                      <div key={`${match.matchId}-${index}`} className="rounded-2xl border border-slate-400/15 bg-slate-900/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-200">
                                {getMatchMetaLabel(match)}
                              </span>
                              <CompletedMatchOutcomeBadge
                                reason={reason}
                                isWinner={isWinner}
                                gameName={gameName}
                                reasonLabelMode={reasonLabelMode}
                                className="text-xs"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-mono ${match.player1?.toLowerCase() === targetLower ? 'border-teal-400/30 bg-teal-500/10 text-teal-100' : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'}`}>
                                {shortenAddress(match.player1)}
                              </span>
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">vs</span>
                              <span className={`rounded-full border px-3 py-1 text-xs font-mono ${match.player2?.toLowerCase() === targetLower ? 'border-teal-400/30 bg-teal-500/10 text-teal-100' : 'border-pink-400/20 bg-pink-500/10 text-pink-100'}`}>
                                {shortenAddress(match.player2)}
                              </span>
                              {match.winner && match.winner.toLowerCase() !== ZERO_ADDRESS && match.winner.toLowerCase() !== match.player1?.toLowerCase() && match.winner.toLowerCase() !== match.player2?.toLowerCase() && (
                                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-100">
                                  Winner {shortenAddress(match.winner)}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>Started {formatTimestamp(match.startTime)}</span>
                              <span>Ended {formatTimestamp(match.endTime)}</span>
                            </div>
                          </div>
                          {onViewTournament && match.instanceAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                onViewTournament(match.instanceAddress);
                                onClose?.();
                              }}
                              className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition-colors hover:text-white"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerProfileModal;
