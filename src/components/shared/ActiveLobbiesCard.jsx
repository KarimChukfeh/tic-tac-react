import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock3, RefreshCw, Rocket, TimerReset, X, Zap } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'inProgress', label: 'In Progress' },
  { id: 'escalations', label: 'Escalations' },
];

function formatCountdown(targetTs, now) {
  const diff = Math.max(0, Number(targetTs || 0) - Number(now || 0));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatEntryFee(entryFeeEth) {
  const amount = Number.parseFloat(entryFeeEth || '0');
  if (!Number.isFinite(amount)) return entryFeeEth || '0';
  if (amount === 0) return '0';
  if (amount < 0.001) return amount.toFixed(5).replace(/\.?0+$/, '');
  return amount.toFixed(3).replace(/\.?0+$/, '');
}

function getLobbyHighlights(lobby, now) {
  const highlights = [];
  const canShowEnrollmentEscalations = lobby.status === 0;

  if (canShowEnrollmentEscalations && lobby.enrollmentEscalation?.el2Available) {
    highlights.push({ key: 'el2-live', label: 'EL2 available now', tone: 'yellow' });
  } else if (canShowEnrollmentEscalations && lobby.enrollmentEscalation?.el2Soon) {
    highlights.push({
      key: 'el2-soon',
      label: `EL2 in ${formatCountdown(lobby.enrollmentEscalation.el2At, now)}`,
      tone: 'amber',
    });
  }

  for (const match of lobby.matchHighlights || []) {
    if (match.ml3Available) {
      highlights.push({
        key: `ml3-${match.roundNumber}-${match.matchNumber}`,
        label: `Match ${match.matchNumber + 1}: ML3 available`,
        tone: 'yellow',
      });
      continue;
    }

    if (match.ml3Soon && match.ml2Available && match.ml3At > 0) {
      highlights.push({
        key: `ml3-soon-${match.roundNumber}-${match.matchNumber}`,
        label: `Match ${match.matchNumber + 1}: ML3 in ${formatCountdown(match.ml3At, now)}`,
        tone: 'amber',
      });
    }
  }

  return highlights.slice(0, 4);
}

function highlightToneClass(tone) {
  if (tone === 'yellow') return 'border-yellow-300/50 bg-yellow-400/10 text-yellow-100';
  if (tone === 'amber') return 'border-amber-300/40 bg-amber-400/10 text-amber-100';
  return 'border-orange-300/40 bg-orange-400/10 text-orange-100';
}

function hasFeaturedEscalation(lobby) {
  return Boolean(
    (lobby?.status === 0 && (
      lobby?.enrollmentEscalation?.el1Available ||
      lobby?.enrollmentEscalation?.el2Available
    )) ||
    (lobby?.matchEscalationSummary?.ml3AvailableCount || 0) > 0
  );
}

const ActiveLobbiesCard = ({
  lobbies = [],
  loading = false,
  syncing = false,
  error = null,
  gamesCardHeight = 0,
  playerActivityHeight = 0,
  recentMatchesCardHeight = 0,
  onHeightChange,
  onRefresh,
  isExpanded: externalIsExpanded,
  onToggleExpand,
  onViewTournament,
  getTournamentTypeLabel,
  disabled = false,
  showTooltip = false,
  onShowTooltip,
  onHideTooltip,
  connectCtaClassName = 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-2xl border-2 border-purple-400/60 hover:scale-105',
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [toggleRect, setToggleRect] = useState(null);
  const toggleButtonRef = useRef(null);
  const expandedPanelRef = useRef(null);

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      if (value && !externalIsExpanded) onToggleExpand();
      if (!value && externalIsExpanded) onToggleExpand();
      return;
    }
    setInternalIsExpanded(value);
  };

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && onRefresh) {
      onRefresh();
    }
  }, [isExpanded, onRefresh]);

  useEffect(() => {
    if (!isExpanded || !toggleButtonRef.current) {
      setToggleRect(null);
      return undefined;
    }

    const updateRect = () => {
      const rect = toggleButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setToggleRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isExpanded, isDesktop]);

  useEffect(() => {
    if (!isExpanded || !expandedPanelRef.current || !onHeightChange) {
      if (!isExpanded && onHeightChange) onHeightChange(0);
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      onHeightChange(expandedPanelRef.current.offsetHeight);
    });

    observer.observe(expandedPanelRef.current);
    onHeightChange(expandedPanelRef.current.offsetHeight);

    return () => observer.disconnect();
  }, [isExpanded, lobbies, filter, loading, error, onHeightChange]);

  const filteredLobbies = lobbies.filter((lobby) => {
    if (filter === 'waiting') return lobby.status === 0;
    if (filter === 'inProgress') return lobby.status === 1;
    if (filter === 'escalations') return hasFeaturedEscalation(lobby);
    return true;
  });

  const totalWaiting = lobbies.filter((lobby) => lobby.status === 0).length;
  const totalInProgress = lobbies.filter((lobby) => lobby.status === 1).length;
  const totalEscalations = lobbies.filter((lobby) => hasFeaturedEscalation(lobby)).length;

  const BASE_TOP_DESKTOP = 80;
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64;
  const SPACING_DESKTOP = 16;
  const EXPANDED_BOTTOM_MARGIN = 120;

  let topPositionDesktop = BASE_TOP_DESKTOP;

  if (gamesCardHeight > 0) topPositionDesktop += gamesCardHeight + EXPANDED_BOTTOM_MARGIN;
  else topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  if (playerActivityHeight > 0) topPositionDesktop += playerActivityHeight + EXPANDED_BOTTOM_MARGIN;
  else topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  if (recentMatchesCardHeight > 0) topPositionDesktop += recentMatchesCardHeight + EXPANDED_BOTTOM_MARGIN;
  else topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;

  return (
    <div
      className="relative max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16"
      style={{ top: isDesktop ? `${topPositionDesktop}px` : undefined }}
    >
      <div className="max-md:flex max-md:flex-col max-md:items-center max-md:gap-1 relative z-[70]">
        <button
          ref={toggleButtonRef}
          onClick={(event) => {
            event.stopPropagation();
            if (disabled) {
              if (onShowTooltip) onShowTooltip();
            } else {
              handleSetExpanded(!isExpanded);
            }
          }}
          className={`max-md:mx-auto rounded-full p-2 md:p-4 transition-all md:shadow-xl relative z-[70] group bg-gradient-to-br ${
            disabled
              ? 'opacity-100 cursor-not-allowed from-gray-600/90 to-gray-700/90 border-2 border-gray-500/40'
              : isExpanded
              ? 'from-yellow-400 to-amber-500 border-2 border-yellow-200 md:shadow-[0_0_20px_rgba(251,191,36,0.55)] scale-105'
              : 'from-yellow-500/90 to-amber-600/90 md:border-2 md:border-yellow-300/40 md:hover:border-yellow-300/70 hover:scale-110'
          }`}
          aria-label={disabled ? 'Connect wallet to access discover lobbies' : isExpanded ? 'Close discover lobbies' : 'Open discover lobbies'}
          title={disabled ? 'Connect Wallet to View Discover Lobbies' : ''}
        >
          <Rocket size={16} className="text-white md:w-6 md:h-6" />

          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-300 animate-spin"></div>
          )}

          {lobbies.some((lobby) => lobby.publicOpportunityCount > 0) && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {lobbies.reduce((sum, lobby) => sum + lobby.publicOpportunityCount, 0)}
            </div>
          )}

          {disabled ? (
            <a
              href="#connect-wallet-cta"
              className={`max-md:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all ${connectCtaClassName}`}
            >
              Connect Wallet to View Discover Lobbies
            </a>
          ) : (
            <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Discover Lobbies
            </div>
          )}
        </button>
        <span className="md:hidden text-[10px] text-white/80 font-medium">Discover</span>

        {showTooltip && disabled && (
          <a
            href="#connect-wallet-cta"
            onClick={(event) => {
              event.stopPropagation();
              if (onHideTooltip) onHideTooltip();
            }}
            className={`md:hidden fixed bottom-20 left-4 right-4 px-6 py-3 z-[100] animate-fade-in transition-transform text-center ${connectCtaClassName}`}
          >
            Connect Wallet to View Discover Lobbies
          </a>
        )}
      </div>

      {isExpanded && !disabled && toggleRect && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSetExpanded(false);
          }}
          aria-label="Close discover lobbies"
          className="fixed z-[90] rounded-full"
          style={{
            left: `${toggleRect.left}px`,
            top: `${toggleRect.top}px`,
            width: `${toggleRect.width}px`,
            height: `${toggleRect.height}px`,
            background: 'transparent',
          }}
        />
      )}

      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className="z-[60] max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:absolute md:top-[76px] md:left-0 bg-gradient-to-br from-yellow-700 via-amber-800 to-orange-900 rounded-xl p-4 border-2 border-yellow-300/50 shadow-2xl md:w-[480px] max-h-[calc(100vh-7rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-amber-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-yellow-400/70 [&::-webkit-scrollbar-thumb]:to-amber-500/70 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgb(251_191_36_/_0.7)_rgb(69_26_3_/_0.4)]"
          style={{ maxHeight: isDesktop ? `calc(100vh - ${topPositionDesktop + 76}px - 6rem)` : 'min(80vh, calc(100vh - 7rem))' }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Zap size={18} className="text-yellow-200" />
                <span>Discover Lobbies</span>
              </div>
              <p className="text-yellow-100/80 text-sm">
                Public tournaments and live escalation windows.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onRefresh}
                className="rounded-lg border border-yellow-200/30 bg-white/10 hover:bg-white/15 transition-colors p-2 text-yellow-50"
                aria-label="Refresh active lobbies"
                title="Refresh active lobbies"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => handleSetExpanded(false)}
                className="rounded-lg border border-yellow-200/30 bg-white/10 hover:bg-white/15 transition-colors p-2 text-yellow-50"
                aria-label="Close active lobbies"
                title="Close active lobbies"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === option.id
                    ? 'bg-yellow-200 text-amber-950'
                    : 'bg-white/10 text-yellow-50 hover:bg-white/15'
                }`}
                >
                {option.label} ({option.id === 'all'
                  ? lobbies.length
                  : option.id === 'waiting'
                  ? totalWaiting
                  : option.id === 'inProgress'
                  ? totalInProgress
                  : totalEscalations})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-xl border border-yellow-200/20 bg-black/15 p-6 text-center text-yellow-50">
              <RefreshCw size={18} className="animate-spin mx-auto mb-3 text-yellow-200" />
              Scanning public instances...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-300/30 bg-red-950/30 p-4 text-red-100">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle size={16} />
                <span>Could not load active lobbies</span>
              </div>
              <p className="text-sm text-red-100/80">{error}</p>
            </div>
          ) : filteredLobbies.length === 0 ? (
            <div className="rounded-xl border border-yellow-200/20 bg-black/15 p-6 text-center text-yellow-50">
              <Rocket size={18} className="mx-auto mb-3 text-yellow-200" />
              {filter === 'all' && 'No available lobbies right now.'}
              {filter === 'waiting' && 'No open lobbies are currently waiting for players.'}
              {filter === 'inProgress' && 'No public lobbies are currently in progress.'}
              {filter === 'escalations' && 'No live escalation windows are visible right now.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLobbies.map((lobby) => {
                const highlights = getLobbyHighlights(lobby, now);
                const tournamentType = getTournamentTypeLabel
                  ? getTournamentTypeLabel(lobby.playerCount)
                  : (lobby.playerCount === 2 ? 'Duel' : 'Tournament');

                return (
                  <div
                    key={lobby.address}
                    className="rounded-xl border border-yellow-200/20 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{tournamentType}</span>
                          <span className={`text-[11px] uppercase tracking-[0.16em] px-2 py-1 rounded-full border ${
                            lobby.status === 0
                              ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                              : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                          }`}>
                            {lobby.statusLabel}
                          </span>
                          {lobby.publicOpportunityCount > 0 && (
                            <span className="text-[11px] uppercase tracking-[0.16em] px-2 py-1 rounded-full border border-yellow-300/40 bg-yellow-300/15 text-yellow-100">
                              Public Opportunity
                            </span>
                          )}
                        </div>
                        <div className="text-yellow-100/80 text-sm mt-1">
                          {shortenAddress(lobby.address)} • {formatEntryFee(lobby.entryFeeEth)} ETH • {lobby.enrolledCount}/{lobby.playerCount} players
                        </div>
                      </div>
                      <button
                        onClick={() => onViewTournament?.(lobby.address)}
                        className="shrink-0 rounded-lg bg-yellow-200 text-amber-950 px-3 py-2 text-sm font-semibold hover:bg-yellow-100 transition-colors"
                      >
                        {lobby.status === 0 ? 'View & Enroll' : 'View Bracket'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div className="flex items-center gap-2 text-yellow-100/70 text-xs uppercase tracking-[0.14em] mb-1">
                          <Clock3 size={12} />
                          <span>Status</span>
                        </div>
                        <div className="text-sm text-white">
                          {lobby.status === 0
                            ? 'Waiting for more players'
                            : `Round ${lobby.currentRound + 1}/${Math.max(lobby.actualTotalRounds, lobby.currentRound + 1)}`}
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div className="flex items-center gap-2 text-yellow-100/70 text-xs uppercase tracking-[0.14em] mb-1">
                          <TimerReset size={12} />
                          <span>Escalations</span>
                        </div>
                        <div className="text-sm text-white">
                          {lobby.publicOpportunityCount > 0
                            ? `${lobby.publicOpportunityCount} live public`
                            : lobby.publicOpportunitySoonCount > 0
                            ? `${lobby.publicOpportunitySoonCount} public soon`
                            : lobby.hasEscalationActivity
                            ? 'Monitoring timers'
                            : 'Quiet'}
                        </div>
                      </div>
                    </div>

                    {lobby.status === 1 && (
                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        {lobby.matchEscalationSummary.ml3AvailableCount > 0 && (
                          <span className="px-2 py-1 rounded-full bg-yellow-300/15 text-yellow-100 border border-yellow-300/30">
                            ML3 {lobby.matchEscalationSummary.ml3AvailableCount}
                          </span>
                        )}
                        {lobby.matchEscalationSummary.ml3SoonCount > 0 && (
                          <span className="px-2 py-1 rounded-full bg-yellow-300/10 text-yellow-50 border border-yellow-300/20">
                            ML3 soon {lobby.matchEscalationSummary.ml3SoonCount}
                          </span>
                        )}
                      </div>
                    )}

                    {highlights.length > 0 && (
                      <div className="space-y-2">
                        {highlights.map((highlight) => (
                          <div
                            key={highlight.key}
                            className={`rounded-lg border px-3 py-2 text-sm ${highlightToneClass(highlight.tone)}`}
                          >
                            {highlight.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ActiveLobbiesCard;
