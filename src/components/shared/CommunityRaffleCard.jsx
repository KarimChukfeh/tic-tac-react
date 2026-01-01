/**
 * CommunityRaffleCard - Collapsible component showing community raffle information
 *
 * Displays raffle pool progress with a progress bar that fills up to 3 ETH.
 * Shows trigger button when raffle is ready to be executed. The card glows when ready.
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Zap } from 'lucide-react';
import { ethers } from 'ethers';

const CommunityRaffleCard = ({ raffleInfo, playerActivityHeight, onRefresh, onTriggerRaffle, syncing }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Track screen size for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const thresholdETH = parseFloat(ethers.formatEther(raffleInfo.threshold || 0n));
  const currentETH = parseFloat(ethers.formatEther(raffleInfo.currentAccumulated || 0n));
  const reserveETH = parseFloat(ethers.formatEther(raffleInfo.reserve || 0n));
  const raffleAmountETH = parseFloat(ethers.formatEther(raffleInfo.raffleAmount || 0n));
  const percentage = thresholdETH > 0 ? Math.min((currentETH / thresholdETH) * 100, 100) : 0;
  const isFull = raffleInfo.isReady; // Use isReady flag from contract
  const raffleNumber = Number(raffleInfo.raffleIndex || 0n) + 1; // Display as 1-indexed

  // Handle anchor link click with collapse after scroll
  const handleCommunityRafflesClick = (e) => {
    e.preventDefault();
    const element = document.getElementById('community-raffles');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Collapse card after scrolling
      setTimeout(() => {
        setIsExpanded(false);
      }, 100);
    }
  };

  // Dynamic positioning based on actual PlayerActivity panel height
  // PlayerActivity base positions: top-4 (16px) mobile, md:top-20 (80px) desktop
  // PlayerActivity collapsed button size: ~32px mobile, ~64px desktop (with padding)
  // Spacing between components: 32px
  const BASE_TOP_MOBILE = 16; // top-4 in pixels
  const BASE_TOP_DESKTOP = 80; // md:top-20 in pixels
  const COLLAPSED_BUTTON_HEIGHT_MOBILE = 32; // collapsed button height on mobile
  const COLLAPSED_BUTTON_HEIGHT_DESKTOP = 64; // collapsed button height on desktop
  const SPACING = 32; // gap between components

  // Calculate position based on current screen size
  const baseTop = isDesktop ? BASE_TOP_DESKTOP : BASE_TOP_MOBILE;
  const collapsedButtonHeight = isDesktop ? COLLAPSED_BUTTON_HEIGHT_DESKTOP : COLLAPSED_BUTTON_HEIGHT_MOBILE;

  const topPosition = playerActivityHeight > 0
    ? baseTop + playerActivityHeight + SPACING
    : baseTop + collapsedButtonHeight + SPACING;

  return (
    <div
      className="fixed left-4 md:left-16 z-50 transition-all duration-300"
      style={{
        top: `${topPosition}px`
      }}
    >
      {/* Collapsed State - Yellow Circle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`rounded-full p-2 md:p-4 border-2 transition-all hover:scale-110 shadow-xl relative group ${
            isFull
              ? 'bg-gradient-to-br from-yellow-500/90 to-amber-500/90 border-yellow-400/70 hover:border-yellow-400 animate-pulse'
              : 'bg-gradient-to-br from-yellow-600/90 to-amber-600/90 backdrop-blur-lg border-yellow-400/40 hover:border-yellow-400/70'
          }`}
          aria-label="Open contract pool"
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
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse">
              <span className="text-white text-[11px] md:text-xs font-bold">✓</span>
            </div>
          )}

          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Community Raffle
          </div>
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div
          className={`bg-gradient-to-br from-yellow-600/20 to-amber-600/20 backdrop-blur-lg rounded-xl p-4 border-2 transition-all shadow-2xl w-[calc(100vw-2rem)] md:w-[464px] ${
            isFull
              ? 'border-yellow-400 shadow-yellow-500/50 animate-pulse'
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
                style={{ filter: 'brightness(0) saturate(100%) invert(87%) sepia(69%) saturate(425%) hue-rotate(356deg) brightness(103%) contrast(97%)' }}
              />
              <h3 className="text-white font-bold text-sm">Community Raffle #{raffleNumber}</h3>
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
                onClick={() => setIsExpanded(false)}
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
          <div className="relative w-full bg-black/30 rounded-full h-3 overflow-hidden">
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
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
              <div className="text-xs text-yellow-300/80 mb-2">
                <span className="font-semibold">Raffle Distribution:</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-yellow-300/70">
                  <span>Current Pool:</span>
                  <span className="font-mono">{currentETH.toFixed(4)} ETH</span>
                </div>
                {reserveETH > 0 && (
                  <div className="flex justify-between text-yellow-300/60">
                    <span>- Contract Reserve:</span>
                    <span className="font-mono">-{reserveETH.toFixed(4)} ETH</span>
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
        </div>
      )}
    </div>
  );
};

export default CommunityRaffleCard;
