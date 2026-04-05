/**
 * CommunityRaffleCard - Collapsible component showing community raffle information
 *
 * Displays raffle pool progress with a progress bar that fills up to 3 ETH.
 * Shows trigger button when raffle is ready to be executed. The card glows when ready.
 */

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Zap, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { ethers } from 'ethers';
import { shortenAddress } from '../../utils/formatters';

const CommunityRaffleCard = ({
  raffleInfo,
  raffleHistory = [],
  account,
  gamesCardHeight = 0,
  playerActivityHeight,
  recentMatchesCardHeight = 0,
  onRefresh,
  onFetchHistory,
  onTriggerRaffle,
  syncing,
  onHeightChange,
  isExpanded: externalIsExpanded, // External control for mobile single-panel coordination
  onToggleExpand, // External toggle handler
  hideOnMobile = false, // Hide this panel on mobile when another panel is expanded
  disabled = false, // Disable interaction when wallet not connected
  showTooltip = false, // External control for tooltip visibility
  onShowTooltip, // Callback to show this component's tooltip
  onHideTooltip, // Callback to hide this component's tooltip
}) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const expandedPanelRef = useRef(null);

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  // Helper to handle expansion changes
  const handleSetExpanded = (value) => {
    if (onToggleExpand) {
      // External control: only toggle if needed
      if (value && !externalIsExpanded) {
        onToggleExpand();
      } else if (!value && externalIsExpanded) {
        onToggleExpand();
      }
    } else {
      // Internal control
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

  // Measure and report height whenever content changes
  useEffect(() => {
    if (isExpanded && expandedPanelRef.current && onHeightChange) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.target.offsetHeight;
          onHeightChange(height);
        }
      });

      observer.observe(expandedPanelRef.current);

      // Report initial height immediately
      onHeightChange(expandedPanelRef.current.offsetHeight);

      return () => observer.disconnect();
    } else if (!isExpanded && onHeightChange) {
      // When collapsed, report 0
      onHeightChange(0);
    }
  }, [isExpanded, raffleInfo, onHeightChange]);

  // Fetch raffle info when card is expanded
  useEffect(() => {
    if (isExpanded) {
      if (onRefresh) {
        onRefresh();
      }
      // Fetch history whenever expanded so it stays in sync with raffle info
      if (onFetchHistory) {
        onFetchHistory();
      }
    }
  }, [isExpanded, onRefresh, onFetchHistory]);

  const thresholdETH = parseFloat(ethers.formatEther(raffleInfo.threshold || 0n));
  const currentETH = parseFloat(ethers.formatEther(raffleInfo.currentAccumulated || 0n));
  const reserveETH = parseFloat(ethers.formatEther(raffleInfo.reserve || 0n));
  const ownerShareETH = parseFloat(ethers.formatEther(raffleInfo.ownerShare || 0n));
  const raffleAmountETH = parseFloat(ethers.formatEther(raffleInfo.raffleAmount || 0n));
  const percentage = thresholdETH > 0 ? Math.min((currentETH / thresholdETH) * 100, 100) : 0;
  const isFull = raffleInfo.isReady; // Use isReady flag from contract
  const raffleNumber = Number(raffleInfo.raffleIndex || 0n) + 1; // Display as 1-indexed
  const normalizedAccount = account ? account.toLowerCase() : null;

  // Handle anchor link click with collapse after scroll
  const handleCommunityRafflesClick = (e) => {
    e.preventDefault();
    const element = document.getElementById('community-raffles');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Collapse card after scrolling
      setTimeout(() => {
        handleSetExpanded(false);
      }, 100);
    }
  };

  // Dynamic positioning:
  // Mobile (<768px): Horizontal layout at bottom-left, positioned to the right of PlayerActivity
  // Desktop (>=768px): Vertical layout at top-left, positioned below PlayerActivity

  // Mobile positioning (bottom-left, horizontal)
  // Button size calculation: p-2.5 (10px × 2) + icon (18px) + border-2 (2px × 2) = 42px
  const MOBILE_LEFT = 74; // 16px (left-4) + 42px (button width) + 16px (gap)

  // Desktop positioning (top-left, vertical stack below GamesCard and PlayerActivity)
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64; // collapsed button height on desktop
  const SPACING_DESKTOP = 16; // gap between collapsed circles
  const EXPANDED_BOTTOM_MARGIN = 160; // margin below expanded cards

  // Calculate desktop top position accounting for both GamesCard and PlayerActivity
  let topPositionDesktop = BASE_TOP_DESKTOP;

  // Add GamesCard height (or collapsed height if not expanded)
  if (gamesCardHeight > 0) {
    topPositionDesktop += gamesCardHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  // Add PlayerActivity height (or collapsed height if not expanded)
  if (playerActivityHeight > 0) {
    topPositionDesktop += playerActivityHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  // Add RecentMatchesCard height (or collapsed height if not expanded)
  if (recentMatchesCardHeight > 0) {
    topPositionDesktop += recentMatchesCardHeight + EXPANDED_BOTTOM_MARGIN;
  } else {
    topPositionDesktop += COLLAPSED_BUTTON_HEIGHT_DESKTOP + SPACING_DESKTOP;
  }

  return (
    <div
      className={`max-md:relative md:fixed max-md:flex-1 max-md:flex max-md:justify-center z-50 transition-all duration-300 md:bottom-auto md:left-16`}
      style={{
        // On desktop: use top positioning
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
          className={`max-md:mx-auto rounded-full p-2 md:p-4 transition-all md:shadow-xl relative group ${
            disabled
              ? 'opacity-100 cursor-not-allowed bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500/40'
              : isExpanded
              ? 'bg-gradient-to-br from-yellow-500 to-amber-500 border-2 border-yellow-300 md:shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-105'
              : isFull
              ? 'bg-gradient-to-br from-yellow-500 to-amber-500 md:border-2 md:border-yellow-400/70 md:hover:border-yellow-400 hover:scale-110'
              : 'bg-gradient-to-br from-yellow-600 to-amber-600 md:border-2 md:border-yellow-400/40 md:hover:border-yellow-400/70 hover:scale-110'
          }`}
          aria-label={disabled ? "Connect wallet to access community raffle" : isExpanded ? "Close community raffle" : "Open community raffle"}
          title={disabled ? "Connect Wallet to View Community Raffle" : ""}
        >
          <img
            src="/raffle-icon.png"
            alt="Raffle"
            className="w-4 h-4 md:w-6 md:h-6"
            style={{ filter: 'brightness(0) invert(1)' }}
          />

          {/* Sync Circle Animation */}
          {syncing && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"></div>
          )}

          {/* Full Badge */}
          {isFull && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
              <span className="text-white text-[10px] md:text-xs font-bold">✓</span>
            </div>
          )}

          {/* Tooltip - Desktop only */}
          {disabled ? (
            <a
              href="#connect-wallet-cta"
              className="max-md:hidden absolute left-full ml-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all shadow-2xl border-2 border-purple-400/60 hover:scale-105"
            >
              Connect Wallet to View Community Raffle
            </a>
          ) : (
            <div className="max-md:hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Community Raffle
            </div>
          )}

          {/* Tooltip - Mobile only */}
          {showTooltip && disabled && (
            <a
              href="#connect-wallet-cta"
              onClick={(e) => {
                e.stopPropagation(); // Allow navigation but prevent document click
                if (onHideTooltip) onHideTooltip();
              }}
              className="md:hidden fixed bottom-20 left-4 right-4 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl z-[100] animate-fade-in shadow-2xl border-2 border-purple-400/60 hover:scale-105 transition-transform text-center"
            >
              Connect Wallet to View Community Raffle
            </a>
          )}
        </button>

        {/* Label - Mobile only */}
        <span className="md:hidden text-[10px] text-white/80 font-medium">Raffle</span>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div
          ref={expandedPanelRef}
          className={`max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-auto md:mt-3 bg-gradient-to-br from-yellow-700 to-amber-800 rounded-xl p-4 border-2 transition-all shadow-2xl md:w-[464px] max-h-[calc(100vh-7rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-amber-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-amber-500/70 [&::-webkit-scrollbar-thumb]:to-yellow-600/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-amber-400/30 hover:[&::-webkit-scrollbar-thumb]:from-amber-400 hover:[&::-webkit-scrollbar-thumb]:to-yellow-500 [scrollbar-width:thin] [scrollbar-color:rgb(245_158_11_/_0.7)_rgb(69_26_3_/_0.4)] ${
            isFull
              ? 'border-yellow-400 shadow-yellow-500/50'
              : 'border-yellow-400/40'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src="/raffle-icon.png"
                alt="Raffle"
                className="w-5 h-5"
                style={{ filter: 'brightness(0) saturate(100%) invert(87%) sepia(69%) saturate(425%) hue-rotate(10deg) brightness(103%) contrast(97%)' }}
              />
              <h3 className="text-white font-bold text-lg">Raffle #{raffleNumber}</h3>
            </div>
            <div className="flex items-center gap-1">
              {isFull && (
                <span className="text-yellow-300 text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded-full">
                  READY
                </span>
              )}
              {/* Refresh Button */}
              <button
                onClick={onRefresh}
                disabled={syncing}
                className="text-yellow-300 hover:text-yellow-100 transition-colors p-1 hover:bg-yellow-700/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh"
                title="Refresh contract pool"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              </button>
              {/* Close Button */}
              <button
                onClick={() => handleSetExpanded(false)}
                className="text-yellow-300 hover:text-yellow-100 transition-colors p-1 hover:bg-yellow-700/30 rounded"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Current Value */}
          <div className="mb-3">
            <div className="text-2xl font-bold text-white">
              {currentETH.toFixed(4)} ETH
            </div>
            <div className="text-xs text-yellow-300/70">
              Target: {thresholdETH.toFixed(4)} ETH
            </div>
            {reserveETH > 0 && (
              <div className="text-[10px] text-yellow-300/50 mt-1">
                Reserve: {reserveETH.toFixed(4)} ETH kept in contract
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative w-full bg-black/50 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFull
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Percentage Label */}
          <div className="text-right mt-1">
            <span className={`text-xs font-semibold ${isFull ? 'text-yellow-300' : 'text-yellow-300/70'}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>

          {/* Raffle Distribution Info - Only show when ready */}
          {isFull && raffleAmountETH > 0 && (
            <div className="mt-3 p-3 bg-yellow-800/80 border border-yellow-400/30 rounded-lg">
              <div className="text-xs text-yellow-300/80 mb-2">
                <span className="font-semibold">Raffle Distribution:</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-yellow-300/70">
                  <span>Current Pool:</span>
                  <span className="font-mono">{currentETH.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between text-yellow-300/70">
                  <span>Eligible Players:</span>
                  <span className="font-mono">{Number(raffleInfo.eligiblePlayerCount || 0n)}</span>
                </div>
                {reserveETH > 0 && (
                  <div className="flex justify-between text-yellow-300/60">
                    <span>- Contract Reserve:</span>
                    <span className="font-mono">-{reserveETH.toFixed(4)} ETH</span>
                  </div>
                )}
                {ownerShareETH > 0 && (
                  <div className="flex justify-between text-yellow-300/60">
                    <span>- Owner Share:</span>
                    <span className="font-mono">-{ownerShareETH.toFixed(4)} ETH</span>
                  </div>
                )}
                <div className="flex justify-between text-yellow-300 font-semibold border-t border-yellow-400/20 pt-1">
                  <span>= Raffle Prize Pool:</span>
                  <span className="font-mono">{raffleAmountETH.toFixed(4)} ETH</span>
                </div>
              </div>
            </div>
          )}

          {/* Trigger Raffle Button - Only show when ready */}
          {isFull && (
            <button
              onClick={onTriggerRaffle}
              disabled={syncing}
              className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-sm shadow-lg shadow-yellow-500/20"
            >
              <Zap size={16} />
              {syncing ? 'Triggering Raffle...' : 'Trigger Raffle'}
            </button>
          )}

          {/* What are Community Raffles? Link */}
          <a
            href="#community-raffles"
            onClick={handleCommunityRafflesClick}
            className="block w-full text-center text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 text-xs mt-3 py-2 px-4 rounded-lg border border-yellow-400/30 hover:border-yellow-400/50 transition-all cursor-pointer"
          >
            What are Community Raffles?
          </a>

          {/* Raffle History Section */}
          <div className="mt-4 border-t border-yellow-400/20 pt-4">
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full flex items-center justify-between text-yellow-300 font-semibold text-xs bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-400/20 rounded-lg px-3 py-2 transition-colors"
              aria-expanded={isHistoryExpanded}
            >
              <span className="flex items-center gap-1">
                <Trophy size={14} />
                Past Raffle Winners
              </span>
              {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isHistoryExpanded && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-amber-950/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-amber-500/70 [&::-webkit-scrollbar-thumb]:to-yellow-600/70 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:from-amber-400 hover:[&::-webkit-scrollbar-thumb]:to-yellow-500 [scrollbar-width:thin] [scrollbar-color:rgb(245_158_11_/_0.7)_rgb(69_26_3_/_0.4)]">
                {raffleHistory.length === 0 ? (
                  <div className="text-[11px] text-yellow-300/70 bg-yellow-900/40 border border-yellow-400/10 rounded-lg p-3 text-center">
                    No community raffles have been executed yet
                  </div>
                ) : (
                  raffleHistory.map((raffle) => {
                    const isWinner = normalizedAccount && raffle.winner?.toLowerCase() === normalizedAccount;
                    return (
                      <div
                        key={raffle.raffleNumber}
                        className={`rounded-lg p-2.5 border transition-colors ${
                          isWinner
                            ? 'bg-amber-600/30 border-amber-300/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                            : 'bg-yellow-900/60 border-yellow-400/10 hover:border-yellow-400/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-yellow-300 font-semibold text-xs">
                            Raffle #{raffle.raffleNumber + 1}
                          </span>
                          <span className="text-yellow-300/50 text-[10px]">
                            {new Date(raffle.timestamp * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-yellow-300/70">
                            <span>Winner:</span>
                            <span className={`font-mono ${isWinner ? 'text-amber-200 font-semibold' : 'text-yellow-200'}`}>
                              {shortenAddress(raffle.winner)}
                            </span>
                          </div>
                          <div className="flex justify-between text-yellow-300/70">
                            <span>Prize:</span>
                            <span className="font-mono text-amber-400 font-semibold">
                              {parseFloat(ethers.formatEther(raffle.winnerPrize)).toFixed(4)} ETH
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityRaffleCard;
