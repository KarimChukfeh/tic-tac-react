/**
 * RecentMatchesCard - Collapsible component showing player's recent match history
 *
 * Displays completed matches with board states and move history
 */

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, History, ChevronDown, ChevronUp, Eye, ChevronLeft, ChevronRight, ArrowUpRight, TrendingUp, ExternalLink, ArrowUp, Trophy } from 'lucide-react';
import { shortenAddress, getCellPositionName } from '../../utils/formatters';
import {
  CompletionReason,
  getCompletedMatchOutcomeLabel,
  getMatchCompletionReasonValue,
  getTournamentResolutionReasonValue,
  isDraw,
} from '../../utils/completionReasons';
import {
  getV2CompletedMatchOutcomeLabel,
  getV2TournamentResolutionText,
  isV2TournamentCancelledReason,
} from '../../v2/lib/reasonLabels';
import CapturedPieces from './CapturedPieces';
import CompletedMatchOutcomeBadge from './CompletedMatchOutcomeBadge';
import { ethers } from 'ethers';
import { linkifyReasonText } from './UserManualAnchorLink';

const RecentMatchesCard = ({
  contract,
  account,
  gameName,
  gameEmoji,
  gamesCardHeight = 0,
  playerActivityHeight = 0,
  onHeightChange,
  isExpanded: externalIsExpanded,
  onToggleExpand,
  tierConfig = null,
  isElite = false,
  disabled = false, // Disable interaction when wallet not connected
  showTooltip = false, // External control for tooltip visibility
  onShowTooltip, // Callback to show this component's tooltip
  onHideTooltip, // Callback to hide this component's tooltip
  onNavigateToTournament, // Callback to navigate to tournament bracket view
  onRefresh = null, // External refresh for pre-fetched data sources
  leaderboard = [], // Leaderboard data to find player earnings
  onMatchesLoad, // Callback(matches) fired after matches are fetched
  onScrollToMatch, // Callback(fn) receives the scrollToMatch function for external callers
  playerProfile = null, // { stats, enrollments } from usePlayerProfile
  onViewTournament = null, // Callback(instanceAddress) to navigate to a tournament bracket
  getTournamentTypeLabel = null, // Function(playerCount) => string
  v2Matches = null, // Pre-fetched matches array (bypasses internal contract fetch)
  v2MatchesLoading = false, // Loading state for v2Matches
  showTournamentRaffles = true,
  connectCtaClassName = 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-2xl border-2 border-purple-400/60 hover:scale-105',
  reasonLabelMode = 'default',
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [historyTab, setHistoryTab] = useState('matches'); // 'matches' | 'tournaments'
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [expandedRecentMatches, setExpandedRecentMatches] = useState(new Set());
  const [syncing, setSyncing] = useState(false);
  const [moveIndices, setMoveIndices] = useState({}); // Track current move index for each match
  const [expandedModalMatch, setExpandedModalMatch] = useState(null); // Track which match is in modal view
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  // Transaction history state
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0n);
  const [isScrolled, setIsScrolled] = useState(false); // Track if user has scrolled
  const [displayTournamentStats, setDisplayTournamentStats] = useState(null);
  const [displayTournamentEnrollments, setDisplayTournamentEnrollments] = useState([]);
  const panelShellRef = useRef(null);
  const expandedPanelRef = useRef(null);
  const prevExpandedRef = useRef(false);
  const prevAccountRef = useRef(account);
  const matchCardRefs = useRef({});
  const tournamentItemRefs = useRef({});
  const useV2ReasonLabels = reasonLabelMode === 'v2';
  const isRefreshing = syncing || v2MatchesLoading;
  const hasRenderedMatches = recentMatches.length > 0;
  const showMatchesLoadingState = (loadingRecentMatches || v2MatchesLoading) && !hasRenderedMatches;
  const hasTournamentData = Boolean(displayTournamentStats) || displayTournamentEnrollments.length > 0;
  const showTournamentLoadingState = Boolean(playerProfile?.loading) && !hasTournamentData;

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Switch to Tournaments tab and scroll to a specific instance
  const goToTournamentInstance = (instanceAddress) => {
    setHistoryTab('tournaments');
    setTimeout(() => {
      const el = tournamentItemRefs.current[instanceAddress?.toLowerCase()];
      if (el && expandedPanelRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 16px rgba(168,85,247,0.6)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1500);
      }
    }, 50);
  };

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      setInternalIsExpanded(value);
    }
  };

  // Track screen size for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update totalEarnings from leaderboard data
  useEffect(() => {
    if (account && leaderboard.length > 0) {
      const playerEntry = leaderboard.find(
        entry => entry.player.toLowerCase() === account.toLowerCase()
      );
      if (playerEntry) {
        setTotalEarnings(BigInt(playerEntry.earnings));
      } else {
        setTotalEarnings(0n);
      }
    }
  }, [account, leaderboard]);

  useEffect(() => {
    if (prevAccountRef.current !== account) {
      prevAccountRef.current = account;
      setDisplayTournamentStats(null);
      setDisplayTournamentEnrollments([]);
    }
  }, [account]);

  useEffect(() => {
    if (!account) {
      setDisplayTournamentStats(null);
      setDisplayTournamentEnrollments([]);
      return;
    }

    const nextStats = playerProfile?.stats ?? null;
    const nextEnrollments = Array.isArray(playerProfile?.enrollments) ? playerProfile.enrollments : [];
    const hasFreshTournamentData = Boolean(nextStats) || nextEnrollments.length > 0;

    if (hasFreshTournamentData || !playerProfile?.loading) {
      setDisplayTournamentStats(nextStats);
      setDisplayTournamentEnrollments(nextEnrollments);
    }
  }, [account, playerProfile]);

  // When v2Matches is provided externally, sync it into recentMatches state
  useEffect(() => {
    if (v2Matches !== null) {
      setRecentMatches(v2Matches);
      if (onMatchesLoad) onMatchesLoad(v2Matches);
    }
  }, [v2Matches]);

  useEffect(() => {
    if (historyTab !== 'matches') return;

    console.groupCollapsed(`[RecentMatchesCard] Matches tab history (${recentMatches.length})`);
    console.table(recentMatches.map((match, index) => ({
      index,
      matchId: match.matchId,
      tierId: match.tierId,
      instanceId: match.instanceId,
      instanceAddress: match.instanceAddress ?? null,
      roundNumber: match.roundNumber,
      matchNumber: match.matchNumber,
      player1: match.player1,
      player2: match.player2,
      winner: match.winner,
      reason: match.reason ?? null,
      completionReason: match.completionReason ?? null,
      matchCompletionReason: match.matchCompletionReason ?? null,
      playerOutcomeReason: match.playerOutcomeReason ?? null,
      resolvedReason: getMatchCompletionReasonValue(match),
      startTime: match.startTime,
      endTime: match.endTime,
    })));
    console.groupEnd();
  }, [historyTab, recentMatches]);

  // Pre-fetch matches silently when wallet connects so ConnectedWalletCard stats are ready
  useEffect(() => {
    if (v2Matches !== null) return; // skip internal fetch when externally supplied
    if (account && contract) {
      fetchRecentMatches();
    }
  }, [account, contract]);

  // Fetch fresh data when panel transitions from collapsed to expanded
  useEffect(() => {
    if (isExpanded && !prevExpandedRef.current) {
      setCurrentPage(1); // Reset to first page when opening
      setIsScrolled(false); // Reset scroll state when opening
      if (onRefresh) {
        onRefresh();
      }
      if (v2Matches === null) {
        fetchRecentMatches();
        fetchTransactionHistory();
      }
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, onRefresh, v2Matches]);

  // Handle scroll events to show/hide header styling and scroll-to-top button
  useEffect(() => {
    const scrollContainer = expandedPanelRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setIsScrolled(scrollTop > 20); // Show enhancements after scrolling 20px
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  // Reset to page 1 if current page exceeds total pages after matches update
  useEffect(() => {
    const totalPages = Math.ceil(recentMatches.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [recentMatches.length, currentPage, itemsPerPage]);

  // Measure and report height whenever content changes
  useEffect(() => {
    if (isExpanded && panelShellRef.current && onHeightChange) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.target.offsetHeight;
          onHeightChange(height);
        }
      });

      observer.observe(panelShellRef.current);

      // Report initial height immediately
      onHeightChange(panelShellRef.current.offsetHeight);

      return () => observer.disconnect();
    } else if (!isExpanded && onHeightChange) {
      onHeightChange(0);
    }
  }, [isExpanded, recentMatches, expandedRecentMatches, onHeightChange]);

  // Auto-collapse boards when scrolled past
  useEffect(() => {
    if (!isExpanded || !expandedPanelRef.current) return;

    const scrollContainer = expandedPanelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const matchKey = entry.target.dataset.matchKey;

          // If the match card is scrolled out of view (either direction)
          // and the board is expanded, collapse it
          if (!entry.isIntersecting) {
            const scrolledPastDown = entry.boundingClientRect.top < entry.rootBounds.top;
            const scrolledPastUp = entry.boundingClientRect.bottom > entry.rootBounds.bottom;

            if ((scrolledPastDown || scrolledPastUp) && expandedRecentMatches.has(matchKey)) {
              setExpandedRecentMatches(prev => {
                const next = new Set(prev);
                next.delete(matchKey);
                return next;
              });
            }
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0,
        rootMargin: '0px'
      }
    );

    // Observe all match cards
    Object.values(matchCardRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [isExpanded, expandedRecentMatches, recentMatches]);

  // Fetch recent matches using getPlayerMatches()
  const fetchRecentMatches = async () => {
    if (!contract || !account) return;

    setLoadingRecentMatches(true);
    setSyncing(true);
    try {
      console.log('[RecentMatches] Fetching player matches for:', account);

      const allMatches = await contract.getPlayerMatches();

      console.log('[RecentMatches] Total matches fetched:', allMatches.length);

      const recentCompletedMatches = [...allMatches]
        .filter(m => {
          const status = Number(m.status);
          const endTime = Number(m.endTime);
          return status === 2 || endTime > 0;
        })
        .sort((a, b) => Number(b.endTime) - Number(a.endTime));

      console.log('[RecentMatches] Recent completed matches:', recentCompletedMatches.length);

      const matchesWithMoveHistory = recentCompletedMatches.map((match) => {
        const movesString = match.moves || '';
        let moveHistory = [];

        if (movesString && movesString.length > 0) {
          try {
            if (gameName === 'chess') {
              for (let i = 0; i < movesString.length - 1; i += 2) {
                const fromByte = movesString.charCodeAt(i);
                const toByte = movesString.charCodeAt(i + 1);
                if (fromByte >= 0 && fromByte < 64 && toByte >= 0 && toByte < 64) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  const fromFile = String.fromCharCode(97 + (fromByte % 8));
                  const fromRank = Math.floor(fromByte / 8) + 1;
                  const toFile = String.fromCharCode(97 + (toByte % 8));
                  const toRank = Math.floor(toByte / 8) + 1;
                  moveHistory.push({
                    player: isPlayer1Move ? '♚' : '♔',
                    move: `${fromFile}${fromRank}→${toFile}${toRank}`,
                    from: fromByte,
                    to: toByte
                  });
                }
              }
            } else if (gameName === 'tictactoe') {
              for (let i = 0; i < movesString.length; i++) {
                const cellIndex = movesString.charCodeAt(i);
                if (cellIndex >= 0 && cellIndex <= 8) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  moveHistory.push({
                    player: isPlayer1Move ? 'X' : 'O',
                    cell: cellIndex
                  });
                }
              }
            } else if (gameName === 'connect4') {
              for (let i = 0; i < movesString.length; i++) {
                const cellIndex = movesString.charCodeAt(i);
                if (cellIndex >= 0 && cellIndex <= 41) {
                  const isPlayer1Move = (moveHistory.length) % 2 === 0;
                  const column = (cellIndex % 7) + 1;
                  moveHistory.push({
                    player: isPlayer1Move ? 'Red' : 'Blue',
                    column: column,
                    cellIndex: cellIndex
                  });
                }
              }
            }
          } catch (err) {
            console.warn('[RecentMatches] Error parsing moves for match:', err);
          }
        }

        return {
          matchId: `${match.tierId}-${match.instanceId}-${match.roundNumber}-${match.matchNumber}`,
          tierId: Number(match.tierId),
          instanceId: Number(match.instanceId),
          roundNumber: Number(match.roundNumber),
          matchNumber: Number(match.matchNumber),
          player1: match.player1,
          player2: match.player2,
          firstPlayer: match.firstPlayer,
          winner: match.winner,
          reason: Number(match.completionReason),
          completionReason: Number(match.completionReason),
          isDraw: Boolean(match.isDraw),
          board: match.packedBoard,
          startTime: Number(match.startTime),
          endTime: Number(match.endTime),
          timestamp: Number(match.endTime),
          moveHistory: moveHistory
        };
      });

      console.log('[RecentMatches] Parsed matches with move history:', matchesWithMoveHistory.length);
      setRecentMatches(matchesWithMoveHistory);
      if (onMatchesLoad) onMatchesLoad(matchesWithMoveHistory);
    } catch (err) {
      console.error('[RecentMatches] Error fetching recent matches:', err);
    } finally {
      setLoadingRecentMatches(false);
      setSyncing(false);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1); // Reset to first page on refresh
    if (onRefresh) {
      onRefresh();
    }
    if (v2Matches === null) {
      fetchRecentMatches();
    }
    // Also refresh transaction history if it's visible
    if (showTransactionHistory) {
      fetchTransactionHistory();
    }
  };

  // Fetch Transfer events for transaction history
  const fetchTransactionHistory = async () => {
    if (!contract || !account) return;

    setLoadingHistory(true);
    try {
      // Query Transfer events where `to` is the player's address
      const filter = contract.filters.Transfer(null, account);
      const events = await contract.queryFilter(filter);

      // Process events with transaction details
      const historyWithTxHash = await Promise.all(
        events.map(async (event) => {
          try {
            // Get the transaction that triggered this Transfer event
            const tx = await event.getTransaction();

            // Get the block to extract timestamp
            const provider = contract.provider || contract.runner.provider;
            const block = await provider.getBlock(event.blockNumber);
            console.log('[Transfer Debug] Block data:', { blockNumber: event.blockNumber, block, timestamp: block?.timestamp });

            // Decode the function call from transaction data
            let functionName = 'Unknown';
            let functionParams = null;
            let matchId = null;

            try {
              const description = contract.interface.parseTransaction({
                data: tx.data,
                value: tx.value
              });
              functionName = description.name;
              functionParams = description.args;

              // Extract match information from function parameters
              // Most functions have: tierId, instanceId, roundIdx, matchIdx
              if (functionParams && (functionParams.tierId !== undefined || functionParams[0] !== undefined)) {
                const tierId = functionParams.tierId !== undefined ? Number(functionParams.tierId) : Number(functionParams[0]);
                const instanceId = functionParams.instanceId !== undefined ? Number(functionParams.instanceId) : Number(functionParams[1]);
                const roundIdx = functionParams.roundIdx !== undefined ? Number(functionParams.roundIdx) : Number(functionParams[2]);
                const matchIdx = functionParams.matchIdx !== undefined ? Number(functionParams.matchIdx) : Number(functionParams[3]);

                console.log('[Transfer Debug] Extracted params:', { functionName, tierId, instanceId, roundIdx, matchIdx });

                if (tierId !== undefined && instanceId !== undefined && roundIdx !== undefined && matchIdx !== undefined) {
                  matchId = `${tierId}-${instanceId}-${roundIdx}-${matchIdx}`;
                }
              } else {
                console.log('[Transfer Debug] No function params found for:', functionName);
              }
            } catch (decodeErr) {
              console.warn('Could not decode transaction:', decodeErr);
            }

            const result = {
              from: event.args.from,
              to: event.args.to,
              value: event.args.value,
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: block?.timestamp,
              functionName: functionName,
              functionParams: functionParams,
              txFrom: tx.from, // Who called the function
              matchId: matchId, // Match identifier for linking
            };

            console.log('[Transfer Debug] Transaction history entry:', result);
            return result;
          } catch (err) {
            console.error('Error processing Transfer event:', err);
            return null;
          }
        })
      );

      // Filter out any failed event processing and sort by block number (most recent first)
      const validHistory = historyWithTxHash
        .filter(item => item !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      setTransactionHistory(validHistory);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Toggle transaction history and fetch if needed
  const toggleTransactionHistory = () => {
    const willShow = !showTransactionHistory;
    setShowTransactionHistory(willShow);

    // Fetch transaction history when opening for the first time
    if (willShow && transactionHistory.length === 0) {
      fetchTransactionHistory();
    }
  };

  // Scroll to a specific match in the list
  const scrollToMatch = (matchId, timestamp) => {
    // Grace period to account for timestamp misalignment (5 seconds before/after)
    const GRACE_PERIOD = 5;

    // First, try exact matchId match
    let index = recentMatches.findIndex(m => {
      const matchesId = m.matchId === matchId;
      const startTime = m.startTime || 0;
      const endTime = m.endTime || 0;
      const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);

      return matchesId && inTimeRange;
    });

    // If no exact match, try matching by tournament (same tierId and instanceId) and timestamp
    if (index === -1 && matchId) {
      const [tierId, instanceId] = matchId.split('-');

      index = recentMatches.findIndex(m => {
        const [mTierId, mInstanceId] = m.matchId.split('-');
        const sameTournament = mTierId === tierId && mInstanceId === instanceId;
        const startTime = m.startTime || 0;
        const endTime = m.endTime || 0;
        const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);

        return sameTournament && inTimeRange;
      });
    }

    if (index === -1) return;

    const actualMatch = recentMatches[index];
    const matchKey = `recent-${actualMatch.matchId}-${index}`;

    // Calculate which page this match is on
    const pageForMatch = Math.floor(index / itemsPerPage) + 1;

    // Navigate to the correct page first if needed
    if (pageForMatch !== currentPage) {
      setCurrentPage(pageForMatch);
      // Wait for page change to render, then scroll
      setTimeout(() => {
        const matchElement = matchCardRefs.current[matchKey];
        if (matchElement) {
          matchElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

          // Highlight the match briefly
          matchElement.style.transition = 'box-shadow 0.3s';
          matchElement.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.6)';
          setTimeout(() => {
            matchElement.style.boxShadow = '';
          }, 2000);
        }
      }, 100);
    } else {
      // Already on the right page, just scroll
      const matchElement = matchCardRefs.current[matchKey];
      if (matchElement) {
        matchElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Highlight the match briefly
        matchElement.style.transition = 'box-shadow 0.3s';
        matchElement.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.6)';
        setTimeout(() => {
          matchElement.style.boxShadow = '';
        }, 2000);
      }
    }
  };

  // Expose scrollToMatch to parent via callback ref
  useEffect(() => {
    if (onScrollToMatch) {
      onScrollToMatch(scrollToMatch);
    }
  }, [recentMatches, currentPage]);

  // Get match resolution label (Victory, Defeat, Draw)
  const getMatchResolution = (matchId, timestamp) => {
    // Grace period to account for timestamp misalignment (5 seconds before/after)
    const GRACE_PERIOD = 5;

    // First, try exact matchId match
    let matchIndex = recentMatches.findIndex(m => {
      const matchesId = m.matchId === matchId;
      const startTime = m.startTime || 0;
      const endTime = m.endTime || 0;
      const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);
      return matchesId && inTimeRange;
    });

    // If no exact match, try matching by tournament and timestamp
    if (matchIndex === -1 && matchId) {
      const [tierId, instanceId] = matchId.split('-');
      matchIndex = recentMatches.findIndex(m => {
        const [mTierId, mInstanceId] = m.matchId.split('-');
        const sameTournament = mTierId === tierId && mInstanceId === instanceId;
        const startTime = m.startTime || 0;
        const endTime = m.endTime || 0;
        const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);
        return sameTournament && inTimeRange;
      });
    }

    if (matchIndex === -1) return 'Unknown';

    const match = recentMatches[matchIndex];
    const reason = getMatchReason(match);
    const accountLower = account?.toLowerCase() || '';
    const winnerLower = match.winner?.toLowerCase() || '';
    const matchIsDraw = isDraw(reason);

    // Get tier type prefix
    const tierLabel = getTierLabel(match.tierId);
    const tierPrefix = tierLabel === 'Duel' ? 'Duel' : 'Tournament';

    if (matchIsDraw) {
      const outcome = useV2ReasonLabels
        ? getV2CompletedMatchOutcomeLabel(reason, false, gameName)
        : 'Draw';
      return `${tierPrefix} ${outcome}`;
    }

    const isWinner = winnerLower === accountLower;
    const outcome = useV2ReasonLabels
      ? getV2CompletedMatchOutcomeLabel(reason, isWinner, gameName)
      : getCompletedMatchOutcomeLabel(reason, isWinner, gameName);
    return `${tierPrefix} ${outcome}`;
  };

  // Find match number by matchId and timestamp
  const getMatchNumber = (matchId, timestamp) => {
    // Grace period to account for timestamp misalignment (5 seconds before/after)
    const GRACE_PERIOD = 5;

    // First, try exact matchId match
    let index = recentMatches.findIndex(m => {
      const matchesId = m.matchId === matchId;
      const startTime = m.startTime || 0;
      const endTime = m.endTime || 0;
      const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);

      if (matchesId) {
        console.log('[Transfer Debug] Match correlation attempt (exact):', {
          matchId,
          timestamp,
          startTime,
          endTime,
          inTimeRange,
          matchFound: matchesId && inTimeRange
        });
      }

      return matchesId && inTimeRange;
    });

    // If no exact match, try matching by tournament (same tierId and instanceId) and timestamp
    if (index === -1 && matchId) {
      const [tierId, instanceId] = matchId.split('-');

      index = recentMatches.findIndex(m => {
        const [mTierId, mInstanceId] = m.matchId.split('-');
        const sameTournament = mTierId === tierId && mInstanceId === instanceId;
        const startTime = m.startTime || 0;
        const endTime = m.endTime || 0;
        const inTimeRange = timestamp >= (startTime - GRACE_PERIOD) && timestamp <= (endTime + GRACE_PERIOD);

        if (sameTournament && inTimeRange) {
          console.log('[Transfer Debug] Match correlation attempt (same tournament):', {
            originalMatchId: matchId,
            foundMatchId: m.matchId,
            timestamp,
            startTime,
            endTime,
            inTimeRange,
            matchFound: true
          });
        }

        return sameTournament && inTimeRange;
      });
    }

    if (index === -1) {
      console.warn('[Transfer Debug] No match found for:', { matchId, timestamp, availableMatches: recentMatches.map(m => ({ matchId: m.matchId, startTime: m.startTime, endTime: m.endTime })) });
      return null;
    }
    return recentMatches.length - index;
  };

  // Helper functions
  const getTierLabel = (tierId) => {
    if (!tierConfig || !tierConfig[tierId]) return null;
    const playerCount = tierConfig[tierId].playerCount;
    if (playerCount === 2) return 'Duel';
    if (playerCount === 4) return '4-Players';
    if (playerCount === 8) return '8-Players';
    return `${playerCount}-Players`;
  };

  // Format timestamp as "X time ago"
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 0) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
  };

  const getRoundLabel = (tierId, roundNumber, explicitTotalRounds) => {
    const playerCount = tierConfig?.[tierId]?.playerCount;
    const totalRounds = explicitTotalRounds ?? (
      playerCount ? Math.ceil(Math.log2(playerCount)) : null
    );

    if (!Number.isFinite(totalRounds) || totalRounds <= 1) return null;
    if (playerCount === 2) return null;
    if (roundNumber === totalRounds - 1) return 'Finals';
    if (roundNumber === totalRounds - 2) return 'Semifinals';
    if (roundNumber === totalRounds - 3) return 'Quarterfinals';
    return `Round ${roundNumber + 1}/${totalRounds}`;
  };

  // History badges are rendered from the match completion reason.
  // PlayerProfile `outcome` is a different enum and must not be fed into these helpers.
  const getMatchReason = (match) => getMatchCompletionReasonValue(match);

  const getRecordPrizePool = (record) => record?.prizePool ?? record?.prize ?? 0n;
  const getRecordPayout = (record) => record?.payout ?? 0n;
  const isCancelledTournamentRecord = (record) => Number(record?.instanceStatus ?? -1) === 3;
  const isDrawTournamentRecord = (record) => (
    useV2ReasonLabels &&
    getTournamentResolutionReasonValue(record) === 2 &&
    getRecordPayout(record) > 0n
  );
  const hasCancelledTournamentReason = (record) => (
    useV2ReasonLabels
      ? isV2TournamentCancelledReason(getTournamentResolutionReasonValue(record))
      : getTournamentResolutionReasonValue(record) === CompletionReason.SOLO_ENROLL_CANCELLED
  );

  const formatEthAmount = (value, digits = 4) => {
    const parsed = Number(ethers.formatEther(value ?? 0n));
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : '0';
  };

  const getTournamentResolutionText = (record) => {
    if (useV2ReasonLabels) {
      if (hasCancelledTournamentReason(record) || isCancelledTournamentRecord(record)) {
        return getV2TournamentResolutionText(5).text;
      }
      if (!record?.won && getRecordPayout(record) > 0n && record?.entryFee != null && getRecordPayout(record) === record.entryFee) {
        return getV2TournamentResolutionText(5).text;
      }
      return getV2TournamentResolutionText(getTournamentResolutionReasonValue(record)).text;
    }

    if (hasCancelledTournamentReason(record) || isCancelledTournamentRecord(record)) {
      return getRecordPayout(record) > 0n ? 'EL0 cancellation' : 'Tournament cancelled';
    }
    if (!record?.won && getRecordPayout(record) > 0n && record?.entryFee != null && getRecordPayout(record) === record.entryFee) {
      return 'EL0 cancellation';
    }
    const reason = getTournamentResolutionReasonValue(record);
    switch (reason) {
      case CompletionReason.NORMAL_WIN:
        return 'Normal victory';
      case CompletionReason.TIMEOUT:
        return 'ML1 timeout';
      case CompletionReason.DRAW:
        return 'Draw resolution';
      case CompletionReason.FORCE_ELIMINATION:
        return 'ML2 force elimination';
      case CompletionReason.REPLACEMENT:
        return 'ML3 replacement';
      case CompletionReason.ALL_DRAW_SCENARIO:
        return 'All-draw resolution';
      case CompletionReason.SOLO_ENROLL_CANCELLED:
        return 'EL0 cancellation';
      case CompletionReason.ABANDONED_TOURNAMENT_CLAIMED:
        return 'EL2 abandoned pool claim';
      case CompletionReason.UNCONTESTED_FINALS_WIN:
        return 'Uncontested Finalist Resolution';
      default:
        return 'Tournament completed';
    }
  };

  const formatTimeAgo = (timestamp) => {
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
  };

  const formatTimestamp = (timestamp, label = 'Started') => {
    const date = new Date(timestamp * 1000);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = String(date.getFullYear()).slice(-2);
    return {
      label,
      time,
      date: `(${month} ${day}, ${year})`
    };
  };

  const toggleRecentMatchExpand = (matchKey) => {
    setExpandedRecentMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchKey)) {
        next.delete(matchKey);
      } else {
        next.add(matchKey);
      }
      return next;
    });
  };

  const unpackBoard = (packedBoard, gameType) => {
    if (gameType === 'tictactoe') {
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 9; i++) {
        board.push(Number(p & 3n));
        p = p >> 2n;
      }
      return board;
    } else if (gameType === 'chess') {
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 64; i++) {
        const value = Number(p & 0xFn);
        let pieceType = 0;
        let color = 0;
        if (value >= 1 && value <= 6) {
          pieceType = value;
          color = 1;
        } else if (value >= 7 && value <= 12) {
          pieceType = value - 6;
          color = 2;
        }
        board.push({ pieceType, color });
        p = p >> 4n;
      }
      return board;
    } else if (gameType === 'connect4') {
      const board = [];
      let p = BigInt(packedBoard);
      for (let i = 0; i < 42; i++) {
        board.push(Number(p & 3n));
        p = p >> 2n;
      }
      return board;
    }
    return [];
  };

  // Calculate captured pieces for chess by comparing current board to starting position
  const calculateCapturedPieces = (board) => {
    if (!board || board.length !== 64) {
      return { white: [], black: [] };
    }

    // Starting piece counts for each side
    const startingPieces = {
      1: 8,  // pawns
      2: 2,  // knights
      3: 2,  // bishops
      4: 2,  // rooks
      5: 1,  // queen
      6: 1   // king
    };

    // Count current pieces on board
    const whitePieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const blackPieces = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    board.forEach(square => {
      if (square.pieceType > 0) {
        if (square.color === 1) {
          // White piece
          whitePieces[square.pieceType]++;
        } else if (square.color === 2) {
          // Black piece
          blackPieces[square.pieceType]++;
        }
      }
    });

    // Calculate missing pieces (captured)
    const whiteCaptured = [];
    const blackCaptured = [];

    for (let pieceType = 1; pieceType <= 6; pieceType++) {
      const whiteLost = startingPieces[pieceType] - whitePieces[pieceType];
      const blackLost = startingPieces[pieceType] - blackPieces[pieceType];

      for (let i = 0; i < whiteLost; i++) {
        whiteCaptured.push(pieceType);
      }
      for (let i = 0; i < blackLost; i++) {
        blackCaptured.push(pieceType);
      }
    }

    return { white: whiteCaptured, black: blackCaptured };
  };

  // Reconstruct chess board state at a specific move index
  const reconstructChessBoardAtMove = (moveHistory, moveIndex) => {
    // Start with the initial chess board position
    const board = [];

    // Initialize empty board
    for (let i = 0; i < 64; i++) {
      board.push({ pieceType: 0, color: 0 });
    }

    // Set up initial position
    // White pieces (color 1)
    // Pawns
    for (let i = 8; i < 16; i++) {
      board[i] = { pieceType: 1, color: 1 };
    }
    // Rooks
    board[0] = { pieceType: 4, color: 1 };
    board[7] = { pieceType: 4, color: 1 };
    // Knights
    board[1] = { pieceType: 2, color: 1 };
    board[6] = { pieceType: 2, color: 1 };
    // Bishops
    board[2] = { pieceType: 3, color: 1 };
    board[5] = { pieceType: 3, color: 1 };
    // Queen
    board[3] = { pieceType: 5, color: 1 };
    // King
    board[4] = { pieceType: 6, color: 1 };

    // Black pieces (color 2)
    // Pawns
    for (let i = 48; i < 56; i++) {
      board[i] = { pieceType: 1, color: 2 };
    }
    // Rooks
    board[56] = { pieceType: 4, color: 2 };
    board[63] = { pieceType: 4, color: 2 };
    // Knights
    board[57] = { pieceType: 2, color: 2 };
    board[62] = { pieceType: 2, color: 2 };
    // Bishops
    board[58] = { pieceType: 3, color: 2 };
    board[61] = { pieceType: 3, color: 2 };
    // Queen
    board[59] = { pieceType: 5, color: 2 };
    // King
    board[60] = { pieceType: 6, color: 2 };

    // Apply moves up to moveIndex
    for (let i = 0; i <= moveIndex && i < moveHistory.length; i++) {
      const move = moveHistory[i];
      const fromPos = move.from;
      const toPos = move.to;

      // Move piece from source to destination
      if (fromPos >= 0 && fromPos < 64 && toPos >= 0 && toPos < 64) {
        board[toPos] = board[fromPos];
        board[fromPos] = { pieceType: 0, color: 0 };
      }
    }

    return board;
  };

  // Handle move navigation
  const handlePreviousMove = (matchKey, moveHistory) => {
    setMoveIndices(prev => {
      const currentIndex = prev[matchKey] ?? moveHistory.length - 1;
      const newIndex = Math.max(-1, currentIndex - 1);
      return { ...prev, [matchKey]: newIndex };
    });
  };

  const handleNextMove = (matchKey, moveHistory) => {
    setMoveIndices(prev => {
      const currentIndex = prev[matchKey] ?? moveHistory.length - 1;
      const newIndex = Math.min(moveHistory.length - 1, currentIndex + 1);
      return { ...prev, [matchKey]: newIndex };
    });
  };

  // Desktop positioning
  const BASE_TOP_DESKTOP = 80;
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64;
  const SPACING_DESKTOP = 16; // gap between collapsed circles
  const EXPANDED_BOTTOM_MARGIN = 88; // margin below expanded cards

  let topPositionDesktop = BASE_TOP_DESKTOP;

  if (gamesCardHeight > 0) {
    topPositionDesktop += gamesCardHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  if (playerActivityHeight > 0) {
    topPositionDesktop += playerActivityHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16`}
      style={{
        top: isDesktop ? `${topPositionDesktop}px` : undefined
      }}
    >
      {/* Toggle Button */}
      <div className="max-md:flex max-md:flex-col max-md:items-center max-md:gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent click from bubbling to document
            if (disabled) {
              if (onShowTooltip) onShowTooltip();
            } else {
              handleSetExpanded(!isExpanded);
            }
          }}
          disabled={false}
          className={`max-md:mx-auto bg-gradient-to-br backdrop-blur-lg rounded-full p-2 md:p-4 transition-all md:shadow-xl relative group ${
            disabled
              ? 'opacity-100 cursor-not-allowed from-gray-600/90 to-gray-700/90 border-2 border-gray-500/40'
              : 'from-teal-600/90 to-cyan-600/90 ' + (isExpanded
              ? 'border-2 border-teal-300 md:shadow-[0_0_20px_rgba(94,234,212,0.6)] scale-105'
              : 'md:border-2 md:border-teal-400/40 md:hover:border-teal-400/70 hover:scale-110')
          }`}
          aria-label={disabled ? "Connect wallet to access recent matches" : isExpanded ? "Close recent matches" : "Open recent matches"}
          title={disabled ? "Connect Wallet to View Your Match History" : ""}
        >
          <History size={16} className="text-white md:w-6 md:h-6" />

          {/* Sync Circle Animation */}
          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
          )}

          {/* Tooltip - Desktop only */}
          {disabled ? (
            <a
              href="#connect-wallet-cta"
              className={`max-md:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all ${connectCtaClassName}`}
            >
              Connect Wallet to View Your Match History
            </a>
          ) : (
            <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Match History
            </div>
          )}

        </button>

        {/* Label - Mobile only */}
        <span className="md:hidden text-[10px] text-white/80 font-medium">History</span>

        {/* Tooltip - Mobile only */}
        {showTooltip && disabled && (
          <a
            href="#connect-wallet-cta"
            onClick={(e) => {
              e.stopPropagation(); // Allow navigation but prevent document click
              if (onHideTooltip) onHideTooltip();
            }}
            className={`md:hidden fixed bottom-20 left-4 right-4 px-6 py-3 z-[100] animate-fade-in transition-transform text-center ${connectCtaClassName}`}
          >
            Connect Wallet to View Your Match History
          </a>
        )}
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div
          ref={panelShellRef}
          className="max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-teal-900/95 to-cyan-900/95 backdrop-blur-lg rounded-2xl border-2 border-teal-400/40 shadow-2xl md:w-[464px] overflow-hidden flex flex-col"
          style={{
            maxHeight: isDesktop ? `calc(100vh - ${topPositionDesktop}px - 6rem)` : 'min(80vh, calc(100vh - 7rem))'
          }}
        >
          {/* Sticky Header */}
          <div className={`sticky top-0 z-10 px-4 md:px-6 pt-4 md:pt-5 pb-2 transition-all duration-300 ${
            isScrolled
              ? 'bg-gradient-to-br from-teal-900/95 to-cyan-900/95 backdrop-blur-lg border-b border-teal-400/20 shadow-lg'
              : ''
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={24} className="text-teal-400" />
                <h3 className="text-white font-bold text-lg">History</h3>
              </div>
              <div className="flex items-center gap-1">
                {/* Scroll to Top Button - only show when scrolled */}
                {isScrolled && (
                  <button
                    onClick={() => {
                      if (expandedPanelRef.current) {
                        expandedPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded animate-fade-in"
                    aria-label="Scroll to top"
                    title="Scroll to top"
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh"
                  title="Refresh recent matches"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                {/* Close Button */}
                <button
                  onClick={() => handleSetExpanded(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
          <hr className="border-purple-100/10" />

          {/* Tab Bar */}
          <div className="flex border-b border-teal-400/20 px-4 md:px-6">
            <button
              onClick={() => setHistoryTab('tournaments')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${historyTab === 'tournaments' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Tournaments
            </button>
            <button
              onClick={() => setHistoryTab('matches')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${historyTab === 'matches' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Matches
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            ref={expandedPanelRef}
            className="p-4 md:p-6 pb-8 overflow-y-auto overflow-x-hidden flex-1 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-teal-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-teal-500/70 [&::-webkit-scrollbar-thumb]:to-cyan-500/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-teal-400/30 hover:[&::-webkit-scrollbar-thumb]:from-teal-400 hover:[&::-webkit-scrollbar-thumb]:to-cyan-400 [scrollbar-width:thin] [scrollbar-color:rgb(20_184_166_/_0.7)_rgb(4_47_46_/_0.4)]"
          >

          {/* Tournaments Tab */}
          {historyTab === 'tournaments' && (
            <>
              {showTournamentLoadingState ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400 mx-auto"></div>
                  <p className="text-slate-400 mt-2 text-xs">Loading tournament history...</p>
                </div>
              ) : displayTournamentStats ? (
                <>
                  {playerProfile?.loading && (
                    <div className="flex items-center gap-2 text-[11px] text-teal-300 mb-3">
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Syncing latest tournaments...</span>
                    </div>
                  )}
                  {/* Summary metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-blue-500/15 border border-blue-400/30 rounded-xl p-3 text-center">
                      <div className="text-xs font-semibold text-blue-300 mb-1">Played</div>
                      <div className="text-xl font-bold text-white">{displayTournamentStats.totalPlayed}</div>
                    </div>
                    <div className="bg-green-500/15 border border-green-400/30 rounded-xl p-3 text-center">
                      <div className="text-xs font-semibold text-green-300 mb-1">Wins</div>
                      <div className="text-xl font-bold text-white">{displayTournamentStats.totalWins}</div>
                    </div>
                    <div className="bg-green-500/15 border border-green-400/30 rounded-xl p-3 text-center">
                      <div className="text-xs font-semibold mb-1 text-green-300">Payouts (ETH)</div>
                      <div className="text-sm font-bold text-white leading-tight">
                        {formatEthAmount(displayTournamentEnrollments.reduce((sum, r) => sum + getRecordPayout(r), 0n))}
                      </div>
                    </div>
                  </div>

                  {/* Tournament list */}
                  {displayTournamentEnrollments.length > 0 ? (
                    <div className="space-y-2">
                      {displayTournamentEnrollments.map((rec, idx) => (
                        <div key={idx} ref={(el) => { if (el && rec.instance) tournamentItemRefs.current[rec.instance.toLowerCase()] = el; }} className="bg-slate-900/60 border border-purple-400/15 rounded-xl px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                              {rec.concluded ? (
                                hasCancelledTournamentReason(rec) || isCancelledTournamentRecord(rec)
                                  ? <span className="text-slate-400 font-semibold text-xs">Cancelled</span>
                                  : isDrawTournamentRecord(rec)
                                  ? <span className="text-yellow-300 font-semibold text-xs">Draw</span>
                                  : rec.won
                                  ? <span className="text-green-300 font-semibold text-xs">Won</span>
                                  : <span className="text-red-300 font-semibold text-xs">Lost</span>
                              ) : (
                                <span className="text-yellow-300 font-semibold text-xs">Active</span>
                              )}
                              {rec.enrolledAt > 0 && (
                                <span className="text-slate-400 text-[10px]">{formatTimeAgo(rec.enrolledAt)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onViewTournament && onViewTournament(rec.instance)}
                              className="text-purple-300 hover:text-purple-200 transition-colors shrink-0"
                              title="View tournament"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                            {hasCancelledTournamentReason(rec) || isCancelledTournamentRecord(rec) ? (
                              <span className="text-slate-400 text-[10px]">(No Players)</span>
                            ) : rec.playerCount != null && (
                              <span className="text-slate-400 text-[10px]">({rec.playerCount} Players)</span>
                            )}
                            <span className="text-slate-400 text-[10px]">{ethers.formatEther(rec.entryFee)} ETH entry</span>
                            {rec.concluded && (
                              (hasCancelledTournamentReason(rec) || isCancelledTournamentRecord(rec)) && getRecordPayout(rec) > 0n
                                ? <span className="text-green-400 text-[10px]">+{ethers.formatEther(getRecordPayout(rec))} ETH refunded</span>
                                : getRecordPayout(rec) > 0n
                                ? <span className="text-green-400 text-[10px]">+{ethers.formatEther(getRecordPayout(rec))} ETH payout</span>
                                : !rec.won && getRecordPrizePool(rec) > 0n
                                  ? <span className="text-slate-500 text-[10px]">{ethers.formatEther(getRecordPrizePool(rec))} ETH prize pool</span>
                                  : null
                            )}
                            {showTournamentRaffles && rec.concluded && rec.wonRaffle && (rec.rafflePool ?? 0n) > 0n && (
                              <span className="text-cyan-300 text-[10px]">+{ethers.formatEther(rec.rafflePool)} ETH raffle</span>
                            )}
                          </div>
                          {rec.concluded && (
                            <div className="mt-1 text-[10px] text-slate-400">
                              Resolved via <span className="text-slate-200">{linkifyReasonText(getTournamentResolutionText(rec), { keyPrefix: `recent-matches-resolution-${rec.id ?? rec.instanceId ?? 'record'}`, linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white' })}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Trophy className="text-slate-500 mx-auto mb-2" size={28} />
                      <p className="text-slate-400 text-xs">No tournament history yet</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <Trophy className="text-slate-500 mx-auto mb-2" size={28} />
                  <p className="text-slate-400 text-xs">No tournament data available</p>
                  <p className="text-slate-500 text-xs mt-1">Connect your wallet and join a tournament!</p>
                </div>
              )}
            </>
          )}

          {/* Matches Tab */}
          {historyTab === 'matches' && <>

          {/* Content */}
          <h3 className="text-white font-semibold text-lg md:text-md mb-3">Match History</h3>
          {showMatchesLoadingState ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400 mx-auto"></div>
              <p className="text-slate-400 mt-2 text-xs">Loading recent matches...</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="text-center py-6">
              <History className="text-slate-500 mx-auto mb-2" size={32} />
              <p className="text-slate-400 text-xs">No match history found</p>
              <p className="text-slate-500 text-xs mt-1">Join a tournament to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {isRefreshing && (
                <div className="flex items-center gap-2 text-[11px] text-teal-300 -mb-3">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Syncing latest history...</span>
                </div>
              )}
              {/* Pagination calculations */}
              {(() => {
                const totalPages = Math.ceil(recentMatches.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedMatches = recentMatches.slice(startIndex, endIndex);

                return paginatedMatches.map((match, paginatedIndex) => {
                  const index = startIndex + paginatedIndex; // Global index for match numbering
                const accountLower = account?.toLowerCase() || '';
                const winnerLower = match.winner?.toLowerCase() || '';
                const player1Lower = match.player1?.toLowerCase() || '';
                const player2Lower = match.player2?.toLowerCase() || '';

                const reason = getMatchReason(match);
                const matchIsDraw = isDraw(reason);
                const isWinner = !matchIsDraw && winnerLower === accountLower && winnerLower !== '0x0000000000000000000000000000000000000000';

                // Check if account is actually one of the players
                const isAccountPlayer1 = player1Lower === accountLower;
                const isAccountPlayer2 = player2Lower === accountLower;
                const isAccountActualPlayer = isAccountPlayer1 || isAccountPlayer2;

                const opponent = isAccountPlayer1 ? match.player2 : match.player1;
                const matchKey = `recent-${match.matchId}-${index}`;
                const isMatchExpanded = expandedRecentMatches.has(matchKey);

                const firstPlayerLower = match.firstPlayer?.toLowerCase() || '';
                const isPlayer1First = firstPlayerLower === player1Lower;

                // Determine symbols for each player
                let player1Symbol = '';
                let player2Symbol = '';

                if (gameName === 'tictactoe') {
                  player1Symbol = isPlayer1First ? 'X' : 'O';
                  player2Symbol = isPlayer1First ? 'O' : 'X';
                } else if (gameName === 'connect4') {
                  player1Symbol = isPlayer1First ? 'Red' : 'Blue';
                  player2Symbol = isPlayer1First ? 'Blue' : 'Red';
                } else if (gameName === 'chess') {
                  player1Symbol = isPlayer1First ? 'White' : 'Black';
                  player2Symbol = isPlayer1First ? 'Black' : 'White';
                }

                // For account/opponent display when account is a player
                const accountSymbol = isAccountPlayer1 ? player1Symbol : player2Symbol;
                const opponentSymbol = isAccountPlayer1 ? player2Symbol : player1Symbol;

                return (
                  <div
                    key={matchKey}
                    ref={(el) => { matchCardRefs.current[matchKey] = el; }}
                    data-match-key={matchKey}
                    className={`border-[3px] rounded-lg p-3 transition-all ${
                      matchIsDraw
                        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/80'
                        : isWinner
                        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/80'
                        : 'bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-400/80'
                    }`}
                  >
                    {/* Match Number and Details */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap relative">
                        {match.instanceAddress ? (
                          <button
                            onClick={() => goToTournamentInstance(match.instanceAddress)}
                            className="bg-purple-500/20 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-400/30 hover:bg-purple-500/30 transition-colors cursor-pointer underline decoration-dotted"
                            title="View tournament"
                          >
                            {getTournamentTypeLabel ? getTournamentTypeLabel(match.playerCount) : (match.playerCount === 2 ? 'Duel' : `${match.playerCount} Players`)}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-semibold">Match #{recentMatches.length - index}</span>
                        )}
                        {/* Expand to Modal Button - Chess only, Desktop only */}
                        {gameName === 'chess' && isDesktop && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedModalMatch({ match, matchKey, index });
                            }}
                            className="absolute top-0 right-0 p-1 rounded bg-slate-700/50 hover:bg-slate-600/70 text-teal-300 hover:text-teal-200 transition-colors"
                            title="Expand to full view"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        )}
                        {/* Tier Type with Instance - Combined Link */}
                        {getTierLabel(match.tierId) && (
                          <button
                            onClick={() => {
                              if (onNavigateToTournament) {
                                onNavigateToTournament(match.tierId, match.instanceId);
                                handleSetExpanded(false);
                              }
                            }}
                            className="bg-teal-500/20 text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-teal-400/30 hover:bg-teal-500/30 transition-colors cursor-pointer underline decoration-dotted"
                            title="View tournament bracket"
                          >
                            {getTierLabel(match.tierId)}
                          </button>
                        )}
                        {getRoundLabel(match.tierId, match.roundNumber, match.totalRounds) && (
                          <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-400/30">
                            {getRoundLabel(match.tierId, match.roundNumber, match.totalRounds)}
                          </span>
                        )}
                        <CompletedMatchOutcomeBadge
                          reason={reason}
                          isWinner={isWinner}
                          gameName={gameName}
                          reasonLabelMode={reasonLabelMode}
                          onClick={() => handleSetExpanded(false)}
                        />
                      </div>
                    </div>

                    {/* Started Timestamp */}
                    <div className="mb-2.5">
                      <div className="bg-purple-500/20 text-purple-300 text-[10px] font-semibold px-2 py-1 rounded border border-purple-400/30 text-center w-full">
                        {(() => {
                          const ts = formatTimestamp(match.startTime, 'Started');
                          return <span className="font-normal">{ts.label} <span className="font-semibold">{ts.time}</span> {ts.date}</span>;
                        })()}
                      </div>
                    </div>

                    {/* Match Participants */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      {isAccountActualPlayer ? (
                        <>
                          {/* When account is a player - show "You" and "vs opponent" */}
                          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-0.5" style={{flex: '1'}}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-normal">You</span>
                              <span className="font-semibold">{account.slice(0, 5)}...{account.slice(-2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-normal text-[9px]">as</span>
                              {gameName === 'chess' ? (
                                <img
                                  src={accountSymbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                  alt={accountSymbol}
                                  className="w-3.5 h-3.5 inline-block"
                                  draggable="false"
                                />
                              ) : gameName === 'tictactoe' ? (
                                accountSymbol === 'X' ? (
                                  <span className="w-3 h-3 inline-block relative">
                                    <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                    <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                  </span>
                                ) : (
                                  <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                                )
                              ) : gameName === 'connect4' ? (
                                <span className={`w-3 h-3 rounded-full inline-block ${accountSymbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                              ) : (
                                <span>({accountSymbol})</span>
                              )}
                            </div>
                          </span>

                          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-0.5" style={{flex: '1'}}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-normal">vs</span>
                              <span className="font-semibold">{opponent.slice(0, 5)}...{opponent.slice(-2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-normal text-[9px]">as</span>
                              {gameName === 'chess' ? (
                                <img
                                  src={opponentSymbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                  alt={opponentSymbol}
                                  className="w-3.5 h-3.5 inline-block"
                                  draggable="false"
                                />
                              ) : gameName === 'tictactoe' ? (
                                opponentSymbol === 'X' ? (
                                  <span className="w-3 h-3 inline-block relative">
                                    <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                    <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                  </span>
                                ) : (
                                  <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                                )
                              ) : gameName === 'connect4' ? (
                                <span className={`w-3 h-3 rounded-full inline-block ${opponentSymbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                              ) : (
                                <span>({opponentSymbol})</span>
                              )}
                            </div>
                          </span>
                        </>
                      ) : (
                        <>
                          {/* When account is NOT a player (ML3 winner) - show both players normally */}
                          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-0.5" style={{flex: '1'}}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{match.player1.slice(0, 5)}...{match.player1.slice(-2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-normal text-[9px]">as</span>
                              {gameName === 'chess' ? (
                                <img
                                  src={player1Symbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                  alt={player1Symbol}
                                  className="w-3.5 h-3.5 inline-block"
                                  draggable="false"
                                />
                              ) : gameName === 'tictactoe' ? (
                                player1Symbol === 'X' ? (
                                  <span className="w-3 h-3 inline-block relative">
                                    <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                    <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                  </span>
                                ) : (
                                  <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                                )
                              ) : gameName === 'connect4' ? (
                                <span className={`w-3 h-3 rounded-full inline-block ${player1Symbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                              ) : (
                                <span>({player1Symbol})</span>
                              )}
                            </div>
                          </span>

                          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-400/30 font-mono flex flex-col items-center gap-0.5" style={{flex: '1'}}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-normal">vs</span>
                              <span className="font-semibold">{match.player2.slice(0, 5)}...{match.player2.slice(-2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-normal text-[9px]">as</span>
                              {gameName === 'chess' ? (
                                <img
                                  src={player2Symbol === 'White' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                  alt={player2Symbol}
                                  className="w-3.5 h-3.5 inline-block"
                                  draggable="false"
                                />
                              ) : gameName === 'tictactoe' ? (
                                player2Symbol === 'X' ? (
                                  <span className="w-3 h-3 inline-block relative">
                                    <span className="absolute inset-0 bg-blue-500 transform rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                    <span className="absolute inset-0 bg-blue-500 transform -rotate-45" style={{width: '2px', height: '100%', left: '50%', marginLeft: '-1px'}}></span>
                                  </span>
                                ) : (
                                  <span className="w-3 h-3 rounded-full inline-block border-2 border-red-500"></span>
                                )
                              ) : gameName === 'connect4' ? (
                                <span className={`w-3 h-3 rounded-full inline-block ${player2Symbol === 'Red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                              ) : (
                                <span>({player2Symbol})</span>
                              )}
                            </div>
                          </span>
                        </>
                      )}
                    </div>

                    {/* View Board Button - Full Width */}
                    <div className="mb-2.5">
                      <button
                        onClick={() => toggleRecentMatchExpand(matchKey)}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-all text-xs font-semibold ${
                          matchIsDraw
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-400/30'
                            : isWinner
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30'
                            : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30'
                        }`}
                      >
                        <span>{isMatchExpanded ? 'Hide Board' : 'View Board'}</span>
                        {isMatchExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {/* Ended Timestamp */}
                    <div className="mb-2.5">
                      <div className="bg-purple-500/20 text-purple-300 text-[10px] font-semibold px-2 py-1 rounded border border-purple-400/30 text-center w-full">
                        {(() => {
                          const ts = formatTimestamp(match.endTime, 'Ended');
                          return <span className="font-normal">{ts.label} <span className="font-semibold">{ts.time}</span> {ts.date}</span>;
                        })()}
                      </div>
                    </div>

                    {/* Winner Info - Only show for ML3 wins or no winner cases */}
                    {(() => {
                      const noWinner = matchIsDraw || reason === CompletionReason.FORCE_ELIMINATION;
                      const isML3Win = reason === CompletionReason.REPLACEMENT;
                      const hasNoWinnerAddress = !match.winner || match.winner === '0x0000000000000000000000000000000000000000';

                      // Only show this section if: no winner, ML3 win, or no winner address
                      if (!noWinner && !isML3Win && !hasNoWinnerAddress) {
                        return null;
                      }

                      return (
                        <div className="text-slate-300 text-[10px] mb-2.5 text-center flex justify-center">
                          {noWinner ? (
                            <span className="text-slate-400">No winner</span>
                          ) : hasNoWinnerAddress ? (
                            <><span className="text-slate-400">Winner </span><span className="text-slate-500 font-semibold">None</span></>
                          ) : isML3Win ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Winner </span>
                              <span className={`font-mono ${isWinner ? 'text-green-400 font-semibold' : 'text-red-400'}`}>
                                {shortenAddress(match.winner)}
                              </span>
                              <span className="text-slate-400">
                                {' '}({linkifyReasonText('ML3', { keyPrefix: `recent-matches-ml3-${matchKey}`, linkClassName: 'underline decoration-dotted underline-offset-2 hover:text-white' })})
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    {/* Board Display */}
                    {isMatchExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-600/30">
                        {/* Lost Pieces for Chess ONLY */}
                        {gameName === 'chess' && (() => {
                          const currentMoveIndex = moveIndices[matchKey] ?? match.moveHistory.length - 1;
                          // Use reconstructed board if navigating through moves, otherwise use final board
                          const board = (currentMoveIndex < match.moveHistory.length - 1 || currentMoveIndex === -1)
                            ? reconstructChessBoardAtMove(match.moveHistory, currentMoveIndex)
                            : unpackBoard(match.board, 'chess');
                          const capturedPieces = calculateCapturedPieces(board);

                          return (
                            <div className="mb-4 space-y-2">
                              <CapturedPieces capturedPieces={capturedPieces.white} color="white" />
                              <CapturedPieces capturedPieces={capturedPieces.black} color="black" />
                            </div>
                          );
                        })()}

                        {gameName === 'tictactoe' && (() => {
                          const board = unpackBoard(match.board, 'tictactoe');

                          // Determine which cell value (1 or 2) corresponds to the firstPlayer
                          // X = firstPlayer (always blue), O = second player (always red)
                          const isPlayer1First = match.firstPlayer?.toLowerCase() === match.player1?.toLowerCase();

                          return (
                            <div className="flex justify-center">
                              <div className="grid grid-cols-3 gap-1 w-32 h-32">
                                {board.map((cell, idx) => (
                                  <div
                                    key={idx}
                                    className="aspect-square bg-slate-800/50 border border-slate-600/50 rounded flex items-center justify-center text-xl font-bold"
                                  >
                                    {cell === 1 ? (
                                      isPlayer1First ? (
                                        <span className="text-blue-400">X</span>
                                      ) : (
                                        <span className="text-red-400">O</span>
                                      )
                                    ) : cell === 2 ? (
                                      isPlayer1First ? (
                                        <span className="text-red-400">O</span>
                                      ) : (
                                        <span className="text-blue-400">X</span>
                                      )
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {gameName === 'chess' && (() => {
                          const currentMoveIndex = moveIndices[matchKey] ?? match.moveHistory.length - 1;
                          // Use reconstructed board if navigating through moves, otherwise use final board
                          const board = (currentMoveIndex < match.moveHistory.length - 1 || currentMoveIndex === -1)
                            ? reconstructChessBoardAtMove(match.moveHistory, currentMoveIndex)
                            : unpackBoard(match.board, 'chess');
                          const pieceTypes = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

                          // Determine if viewing account is playing white
                          // Need to flip when playing white since board is stored with black at top
                          const isAccountPlayingWhite = (isAccountPlayer1 && isPlayer1First) || (isAccountPlayer2 && !isPlayer1First);
                          const shouldFlip = isAccountPlayingWhite; // Flip if playing white

                          // Adjust labels based on perspective
                          // When playing white: a-h from left to right, ranks 1-8 from bottom to top
                          // When playing black: h-a from left to right, ranks 8-1 from bottom to top
                          const files = shouldFlip ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
                          const ranks = shouldFlip ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

                          return (
                            <div className="flex justify-center">
                              <div className="relative inline-block">
                                <div className="flex">
                                  {/* Row labels (ranks) - left */}
                                  <div className="flex flex-col justify-around w-3 mr-1">
                                    {ranks.map((rank, idx) => (
                                      <div key={idx} className="text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center" style={{ height: 'calc(256px / 8)' }}>
                                        {rank}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Chess board */}
                                  <div className="grid grid-cols-8 grid-rows-8 gap-0 w-full max-w-[256px] aspect-square border border-slate-600">
                                    {board.map((_cell, idx) => {
                                      const displayRow = Math.floor(idx / 8);
                                      const displayCol = idx % 8;

                                      // When playing white: flip vertically only
                                      // When playing black: flip horizontally (to get h-a orientation)
                                      const actualIdx = shouldFlip ?
                                        ((7 - displayRow) * 8 + displayCol) : // White: flip vertically only
                                        (displayRow * 8 + (7 - displayCol)); // Black: flip horizontally only
                                      const actualCell = board[actualIdx];

                                      const row = Math.floor(actualIdx / 8);
                                      const col = actualIdx % 8;
                                      const isLight = (row + col) % 2 === 0;

                                      let svgPath = '';
                                      if (actualCell.pieceType > 0) {
                                        const pieceName = pieceTypes[actualCell.pieceType];
                                        const colorSuffix = actualCell.color === 1 ? 'w' : 'b';
                                        svgPath = `/chess-pieces/${pieceName}-${colorSuffix}.svg`;
                                      }

                                      // Highlight the current move being viewed
                                      const currentMoveIndex = moveIndices[matchKey] ?? match.moveHistory.length - 1;
                                      const currentMove = currentMoveIndex >= 0 && currentMoveIndex < match.moveHistory.length
                                        ? match.moveHistory[currentMoveIndex]
                                        : null;

                                      const isCurrentMoveFrom = currentMove && currentMove.from === actualIdx;
                                      const isCurrentMoveTo = currentMove && currentMove.to === actualIdx;

                                      // Determine if the current move is the player's move
                                      const isPlayerMove = currentMove && (currentMoveIndex % 2 === 0
                                        ? (isAccountPlayer1 && isPlayer1First) || (isAccountPlayer2 && !isPlayer1First)
                                        : (isAccountPlayer1 && !isPlayer1First) || (isAccountPlayer2 && isPlayer1First));

                                      // Calculate highlighting classes and styles
                                      const getHighlightClass = () => {
                                        if (isCurrentMoveFrom) {
                                          return isPlayerMove ? 'ring-2 ring-purple-400 ring-inset' : 'ring-2 ring-yellow-400 ring-inset';
                                        }
                                        if (isCurrentMoveTo) {
                                          return isPlayerMove ? 'ring-2 ring-blue-400 ring-inset' : 'ring-2 ring-red-400 ring-inset';
                                        }
                                        return '';
                                      };

                                      const getHighlightBg = () => {
                                        if (isCurrentMoveFrom) {
                                          return isPlayerMove
                                            ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(147, 51, 234, 0.5))'
                                            : 'linear-gradient(135deg, rgba(234, 179, 8, 0.5), rgba(202, 138, 4, 0.5))';
                                        }
                                        if (isCurrentMoveTo) {
                                          return isPlayerMove
                                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(29, 78, 216, 0.5))'
                                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.5))';
                                        }
                                        return undefined;
                                      };

                                      const getHighlightShadow = () => {
                                        if (isCurrentMoveTo) {
                                          return isPlayerMove
                                            ? 'inset 0 0 25px rgba(59, 130, 246, 0.6), 0 0 15px rgba(59, 130, 246, 0.4)'
                                            : 'inset 0 0 25px rgba(239, 68, 68, 0.6), 0 0 15px rgba(239, 68, 68, 0.4)';
                                        }
                                        if (isCurrentMoveFrom) {
                                          return isPlayerMove
                                            ? 'inset 0 0 20px rgba(168, 85, 247, 0.5), 0 0 12px rgba(168, 85, 247, 0.3)'
                                            : 'inset 0 0 20px rgba(234, 179, 8, 0.5), 0 0 12px rgba(234, 179, 8, 0.3)';
                                        }
                                        return undefined;
                                      };

                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center justify-center p-0.5 min-h-0 min-w-0 ${
                                            isLight ? 'bg-amber-200/20' : 'bg-amber-900/20'
                                          } ${getHighlightClass()}`}
                                          style={{
                                            background: getHighlightBg() || undefined,
                                            boxShadow: getHighlightShadow() || undefined,
                                          }}
                                        >
                                          {svgPath && <img src={svgPath} alt="" className="w-full h-full object-contain" draggable="false" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Column labels (files) - bottom */}
                                <div className="flex justify-center mt-1">
                                  <div className="w-3"></div>
                                  <div className="grid grid-cols-8 gap-0 w-full max-w-[256px]">
                                    {files.map((file, idx) => (
                                      <div key={idx} className="text-center text-[10px] text-slate-400 font-semibold">
                                        {file}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {gameName === 'connect4' && (() => {
                          const board = unpackBoard(match.board, 'connect4');
                          const grid = [];
                          for (let row = 0; row < 6; row++) {
                            grid.push(board.slice(row * 7, (row + 1) * 7));
                          }

                          // Determine which cell value (1 or 2) corresponds to the firstPlayer
                          // to correctly assign RED (firstPlayer) and BLUE (second player) colors
                          const isPlayer1First = match.firstPlayer?.toLowerCase() === match.player1?.toLowerCase();
                          const firstPlayerCellValue = isPlayer1First ? 1 : 2;

                          return (
                            <div className="flex justify-center">
                              <div className="bg-blue-900/30 p-2 rounded-lg border border-blue-500/30">
                                <div className="grid grid-rows-6 gap-1">
                                  {grid.map((row, rowIdx) => (
                                    <div key={rowIdx} className="grid grid-cols-7 gap-1">
                                      {row.map((cell, colIdx) => (
                                        <div
                                          key={colIdx}
                                          className="w-6 h-6 rounded-full border-2 border-slate-600/50 flex items-center justify-center"
                                        >
                                          {cell === firstPlayerCellValue ? (
                                            <div className="w-5 h-5 rounded-full bg-red-500"></div>
                                          ) : cell === (firstPlayerCellValue === 1 ? 2 : 1) ? (
                                            <div className="w-5 h-5 rounded-full bg-blue-500"></div>
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-slate-800/50"></div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Move History Section */}
                        {match.moveHistory && match.moveHistory.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-600/30">
                            <div className="flex items-center gap-2 mb-2">
                              <History size={14} className="text-teal-400" />
                              <h5 className="text-xs font-semibold text-slate-300 uppercase">
                                Move History ({match.moveHistory.length} moves)
                              </h5>
                              {gameName === 'chess' && (
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    onClick={() => handlePreviousMove(matchKey, match.moveHistory)}
                                    disabled={(moveIndices[matchKey] ?? match.moveHistory.length - 1) <= -1}
                                    className="p-1 rounded bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Previous move"
                                  >
                                    <ChevronLeft size={16} className="text-teal-300" />
                                  </button>
                                  <span className="text-[10px] text-slate-400 min-w-[3rem] text-center">
                                    {moveIndices[matchKey] === -1 ? 'Start' : moveIndices[matchKey] !== undefined ? `Move ${moveIndices[matchKey] + 1}` : 'Final'}
                                  </span>
                                  <button
                                    onClick={() => handleNextMove(matchKey, match.moveHistory)}
                                    disabled={(moveIndices[matchKey] ?? match.moveHistory.length - 1) >= match.moveHistory.length - 1}
                                    className="p-1 rounded bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Next move"
                                  >
                                    <ChevronRight size={16} className="text-teal-300" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-teal-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-teal-500/70 [&::-webkit-scrollbar-thumb]:to-cyan-500/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:from-teal-400 hover:[&::-webkit-scrollbar-thumb]:to-cyan-400 [scrollbar-width:thin] [scrollbar-color:rgb(20_184_166_/_0.7)_rgb(4_47_46_/_0.4)]">
                              {[...match.moveHistory].reverse().map((move, reverseIdx) => {
                                const idx = match.moveHistory.length - 1 - reverseIdx;
                                const currentMoveIndex = moveIndices[matchKey] ?? match.moveHistory.length - 1;
                                const isCurrentMove = idx === currentMoveIndex;
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-2 text-xs rounded px-2 py-1 transition-colors ${
                                      isCurrentMove
                                        ? 'bg-teal-500/30 border border-teal-400/50'
                                        : 'bg-slate-800/30'
                                    }`}
                                  >
                                    <span className={`font-mono w-6 ${isCurrentMove ? 'text-teal-300 font-bold' : 'text-slate-500'}`}>{idx + 1}.</span>
                                  <div className="w-6 h-6 flex items-center justify-center">
                                    {gameName === 'chess' ? (
                                      <img
                                        src={move.player === '♚' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                        alt={move.player === '♚' ? 'White' : 'Black'}
                                        className="w-5 h-5"
                                        draggable="false"
                                      />
                                    ) : (
                                      <span className="font-bold text-center">{move.player}</span>
                                    )}
                                  </div>
                                  <span className="text-slate-300 flex-1">
                                    {gameName === 'chess' && move.move}
                                    {gameName === 'tictactoe' && `→ ${getCellPositionName(move.cell)}`}
                                    {gameName === 'connect4' && `Column ${move.column}`}
                                  </span>
                                </div>
                              );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
              })()}

              {/* Pagination Controls */}
              {(() => {
                const totalPages = Math.ceil(recentMatches.length / itemsPerPage);
                if (totalPages <= 1) return null;

                return (
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded transition-colors ${
                        currentPage === 1
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-teal-300 hover:bg-teal-500/20 hover:text-teal-200'
                      }`}
                      title="Previous page"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <span className="text-slate-500 text-xs">
                        ({recentMatches.length} total matches)
                      </span>
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded transition-colors ${
                        currentPage === totalPages
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-teal-300 hover:bg-teal-500/20 hover:text-teal-200'
                      }`}
                      title="Next page"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
          </>}
          </div>
        </div>
      )}

      {/* Expanded Modal View - Desktop only */}
      {expandedModalMatch && isDesktop && (() => {
        const { match, matchKey, index } = expandedModalMatch;
        const accountLower = account?.toLowerCase() || '';
        const winnerLower = match.winner?.toLowerCase() || '';
        const player1Lower = match.player1?.toLowerCase() || '';
        const player2Lower = match.player2?.toLowerCase() || '';

        const reason = getMatchReason(match);
        const matchIsDraw = isDraw(reason);
        const isWinner = !matchIsDraw && winnerLower === accountLower && winnerLower !== '0x0000000000000000000000000000000000000000';

        const isAccountPlayer1 = player1Lower === accountLower;
        const isAccountPlayer2 = player2Lower === accountLower;
        const isAccountActualPlayer = isAccountPlayer1 || isAccountPlayer2;

        const opponent = isAccountPlayer1 ? match.player2 : match.player1;

        const firstPlayerLower = match.firstPlayer?.toLowerCase() || '';
        const isPlayer1First = firstPlayerLower === player1Lower;

        const player1Symbol = isPlayer1First ? 'White' : 'Black';
        const player2Symbol = isPlayer1First ? 'Black' : 'White';
        const accountSymbol = isAccountPlayer1 ? player1Symbol : player2Symbol;
        const opponentSymbol = isAccountPlayer1 ? player2Symbol : player1Symbol;

        const currentMoveIndex = moveIndices[matchKey] ?? match.moveHistory.length - 1;
        const board = (currentMoveIndex < match.moveHistory.length - 1 || currentMoveIndex === -1)
          ? reconstructChessBoardAtMove(match.moveHistory, currentMoveIndex)
          : unpackBoard(match.board, 'chess');
        const capturedPieces = calculateCapturedPieces(board);
        const pieceTypes = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

        const isAccountPlayingWhite = (isAccountPlayer1 && isPlayer1First) || (isAccountPlayer2 && !isPlayer1First);
        const shouldFlip = isAccountPlayingWhite; // Flip if playing white

        // When playing white: a-h from left to right, ranks 1-8 from bottom to top
        // When playing black: h-a from left to right, ranks 8-1 from bottom to top
        const files = shouldFlip ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
        const ranks = shouldFlip ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-teal-400/40 shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <History size={28} className="text-teal-400" />
                  {match.instanceAddress
                    ? (getTournamentTypeLabel ? getTournamentTypeLabel(match.playerCount) : (match.playerCount === 2 ? 'Duel' : `${match.playerCount} Players`))
                    : `Match #${recentMatches.length - index}`}
                  {match.instanceAddress && getRoundLabel(match.tierId, match.roundNumber, match.totalRounds) && (
                    <span className="text-slate-400 text-lg font-normal">· {getRoundLabel(match.tierId, match.roundNumber, match.totalRounds)}</span>
                  )}
                </h2>
                <button
                  onClick={() => setExpandedModalMatch(null)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column - Match Stats */}
                <div className="col-span-3 space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">Match Info</h3>

                    {/* Tier and Instance */}
                    {getTierLabel(match.tierId) && (
                      <div className="mb-2">
                        <button
                          onClick={() => {
                            if (onNavigateToTournament) {
                              onNavigateToTournament(match.tierId, match.instanceId);
                              setExpandedModalMatch(null);
                            }
                          }}
                          className="bg-teal-500/20 text-teal-300 text-xs font-semibold px-2 py-1 rounded border border-teal-400/30 hover:bg-teal-500/30 transition-colors w-full"
                        >
                          {getTierLabel(match.tierId)}
                        </button>
                      </div>
                    )}

                    {/* Outcome */}
                    <div className="mb-3">
                      <CompletedMatchOutcomeBadge
                        reason={reason}
                        isWinner={isWinner}
                        gameName={gameName}
                        reasonLabelMode={reasonLabelMode}
                        className="text-xs px-2 py-1 block text-center"
                      />
                    </div>

                    {/* Started */}
                    <div className="text-xs text-slate-400 mb-1">
                      <span className="text-slate-300">
                        {(() => {
                          const ts = formatTimestamp(match.startTime, 'Started');
                          return <>{ts.label} <span className="font-bold">{ts.time}</span> {ts.date}</>;
                        })()}
                      </span>
                    </div>

                    {/* Ended */}
                    <div className="text-xs text-slate-400">
                      <span className="text-slate-300">
                        {(() => {
                          const ts = formatTimestamp(match.endTime, 'Ended');
                          return <>{ts.label} <span className="font-bold">{ts.time}</span> {ts.date}</>;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">Players</h3>

                    {isAccountActualPlayer ? (
                      <>
                        <div className="mb-3 p-2 bg-blue-500/10 rounded border border-blue-400/30">
                          <div className="text-xs text-blue-300 mb-1">You ({accountSymbol})</div>
                          <div className="text-xs font-mono text-slate-300">{account.slice(0, 10)}...{account.slice(-6)}</div>
                        </div>
                        <div className="p-2 bg-slate-700/30 rounded border border-slate-600/30">
                          <div className="text-xs text-slate-400 mb-1">Opponent ({opponentSymbol})</div>
                          <div className="text-xs font-mono text-slate-300">{opponent.slice(0, 10)}...{opponent.slice(-6)}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3 p-2 bg-slate-700/30 rounded border border-slate-600/30">
                          <div className="text-xs text-slate-400 mb-1">Player 1 ({player1Symbol})</div>
                          <div className="text-xs font-mono text-slate-300">{match.player1.slice(0, 10)}...{match.player1.slice(-6)}</div>
                        </div>
                        <div className="p-2 bg-slate-700/30 rounded border border-slate-600/30">
                          <div className="text-xs text-slate-400 mb-1">Player 2 ({player2Symbol})</div>
                          <div className="text-xs font-mono text-slate-300">{match.player2.slice(0, 10)}...{match.player2.slice(-6)}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Captured Pieces */}
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">Captured</h3>
                    <div className="space-y-2">
                      <CapturedPieces capturedPieces={capturedPieces.white} color="white" />
                      <CapturedPieces capturedPieces={capturedPieces.black} color="black" />
                    </div>
                  </div>
                </div>

                {/* Center Column - Chess Board */}
                <div className="col-span-6 flex items-center justify-center">
                  <div className="relative inline-block">
                    <div className="flex">
                      {/* Row labels (ranks) - left */}
                      <div className="flex flex-col justify-around w-5 mr-2">
                        {ranks.map((rank, idx) => (
                          <div key={idx} className="text-center text-sm text-slate-400 font-semibold flex items-center justify-center" style={{ height: 'calc(512px / 8)' }}>
                            {rank}
                          </div>
                        ))}
                      </div>

                      {/* Chess board - 512px (2x the size) */}
                      <div className="grid grid-cols-8 grid-rows-8 gap-0 w-[512px] h-[512px] border-2 border-slate-600 shadow-2xl">
                        {board.map((_cell, idx) => {
                          const displayRow = Math.floor(idx / 8);
                          const displayCol = idx % 8;

                          // When playing white: flip vertically only
                          // When playing black: flip horizontally (to get h-a orientation)
                          const actualIdx = shouldFlip ?
                            ((7 - displayRow) * 8 + displayCol) : // White: flip vertically only
                            (displayRow * 8 + (7 - displayCol)); // Black: flip horizontally only
                          const actualCell = board[actualIdx];

                          const row = Math.floor(actualIdx / 8);
                          const col = actualIdx % 8;
                          const isLight = (row + col) % 2 === 0;

                          let svgPath = '';
                          if (actualCell.pieceType > 0) {
                            const pieceName = pieceTypes[actualCell.pieceType];
                            const colorSuffix = actualCell.color === 1 ? 'w' : 'b';
                            svgPath = `/chess-pieces/${pieceName}-${colorSuffix}.svg`;
                          }

                          const currentMove = currentMoveIndex >= 0 && currentMoveIndex < match.moveHistory.length
                            ? match.moveHistory[currentMoveIndex]
                            : null;

                          const isCurrentMoveFrom = currentMove && currentMove.from === actualIdx;
                          const isCurrentMoveTo = currentMove && currentMove.to === actualIdx;

                          const isPlayerMove = currentMove && (currentMoveIndex % 2 === 0
                            ? (isAccountPlayer1 && isPlayer1First) || (isAccountPlayer2 && !isPlayer1First)
                            : (isAccountPlayer1 && !isPlayer1First) || (isAccountPlayer2 && isPlayer1First));

                          const getHighlightClass = () => {
                            if (isCurrentMoveFrom) {
                              return isPlayerMove ? 'ring-4 ring-purple-400 ring-inset' : 'ring-4 ring-yellow-400 ring-inset';
                            }
                            if (isCurrentMoveTo) {
                              return isPlayerMove ? 'ring-4 ring-blue-400 ring-inset' : 'ring-4 ring-red-400 ring-inset';
                            }
                            return '';
                          };

                          const getHighlightBg = () => {
                            if (isCurrentMoveFrom) {
                              return isPlayerMove
                                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(147, 51, 234, 0.5))'
                                : 'linear-gradient(135deg, rgba(234, 179, 8, 0.5), rgba(202, 138, 4, 0.5))';
                            }
                            if (isCurrentMoveTo) {
                              return isPlayerMove
                                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(29, 78, 216, 0.5))'
                                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.5), rgba(220, 38, 38, 0.5))';
                            }
                            return undefined;
                          };

                          const getHighlightShadow = () => {
                            if (isCurrentMoveTo) {
                              return isPlayerMove
                                ? 'inset 0 0 30px rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.5)'
                                : 'inset 0 0 30px rgba(239, 68, 68, 0.7), 0 0 20px rgba(239, 68, 68, 0.5)';
                            }
                            if (isCurrentMoveFrom) {
                              return isPlayerMove
                                ? 'inset 0 0 25px rgba(168, 85, 247, 0.6), 0 0 15px rgba(168, 85, 247, 0.4)'
                                : 'inset 0 0 25px rgba(234, 179, 8, 0.6), 0 0 15px rgba(234, 179, 8, 0.4)';
                            }
                            return undefined;
                          };

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-center p-1 ${
                                isLight ? 'bg-amber-200/20' : 'bg-amber-900/20'
                              } ${getHighlightClass()}`}
                              style={{
                                background: getHighlightBg() || undefined,
                                boxShadow: getHighlightShadow() || undefined,
                              }}
                            >
                              {svgPath && <img src={svgPath} alt="" className="w-full h-full object-contain" draggable="false" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column labels (files) - bottom */}
                    <div className="flex justify-center mt-2">
                      <div className="w-5 mr-2"></div>
                      <div className="grid grid-cols-8 gap-0 w-[512px]">
                        {files.map((file, idx) => (
                          <div key={idx} className="text-center text-sm text-slate-400 font-semibold">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Move History */}
                <div className="col-span-3">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase flex items-center gap-2">
                        <History size={16} className="text-teal-400" />
                        Move History ({match.moveHistory.length})
                      </h3>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2 mb-4 bg-slate-700/30 rounded-lg p-3">
                      <button
                        onClick={() => handlePreviousMove(matchKey, match.moveHistory)}
                        disabled={(moveIndices[matchKey] ?? match.moveHistory.length - 1) <= -1}
                        className="p-2 rounded bg-slate-600/50 hover:bg-slate-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous move"
                      >
                        <ChevronLeft size={20} className="text-teal-300" />
                      </button>
                      <span className="text-sm text-slate-300 min-w-[5rem] text-center font-semibold">
                        {moveIndices[matchKey] === -1 ? 'Start' : moveIndices[matchKey] !== undefined ? `Move ${moveIndices[matchKey] + 1}` : 'Final'}
                      </span>
                      <button
                        onClick={() => handleNextMove(matchKey, match.moveHistory)}
                        disabled={(moveIndices[matchKey] ?? match.moveHistory.length - 1) >= match.moveHistory.length - 1}
                        className="p-2 rounded bg-slate-600/50 hover:bg-slate-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next move"
                      >
                        <ChevronRight size={20} className="text-teal-300" />
                      </button>
                    </div>

                    {/* Move List */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-teal-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-teal-500/70 [&::-webkit-scrollbar-thumb]:to-cyan-500/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:from-teal-400 hover:[&::-webkit-scrollbar-thumb]:to-cyan-400">
                      {[...match.moveHistory].reverse().map((move, reverseIdx) => {
                        const idx = match.moveHistory.length - 1 - reverseIdx;
                        const isCurrentMove = idx === currentMoveIndex;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 transition-colors ${
                              isCurrentMove
                                ? 'bg-teal-500/30 border-2 border-teal-400/50'
                                : 'bg-slate-700/30'
                            }`}
                          >
                            <span className={`font-mono w-8 ${isCurrentMove ? 'text-teal-300 font-bold' : 'text-slate-500'}`}>{idx + 1}.</span>
                            <div className="w-8 h-8 flex items-center justify-center">
                              <img
                                src={move.player === '♚' ? '/chess-pieces/king-w.svg' : '/chess-pieces/king-b.svg'}
                                alt={move.player === '♚' ? 'White' : 'Black'}
                                className="w-6 h-6"
                                draggable="false"
                              />
                            </div>
                            <span className="text-slate-200 flex-1 font-medium">{move.move}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RecentMatchesCard;
