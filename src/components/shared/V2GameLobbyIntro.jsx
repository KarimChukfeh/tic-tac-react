import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Loader, Wallet } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

export default function V2GameLobbyIntro({
  account,
  isConnecting = false,
  onConnectWallet,
  connectCtaClassName = '',
  children = null,
}) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!isTooltipOpen) return;

    const handlePointerDown = (event) => {
      if (!tooltipRef.current?.contains(event.target)) {
        setIsTooltipOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isTooltipOpen]);

  return (
    <div className="max-w-lg mx-auto space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3 text-center">
        {account ? (
          <div className="text-sm md:text-base font-semibold text-green-300">
            Connected as <span className="font-mono">{shortenAddress(account)}</span>
          </div>
        ) : onConnectWallet ? (
          <div className="relative inline-flex items-center justify-center" ref={tooltipRef}>
            <button
              type="button"
              onClick={onConnectWallet}
              disabled={isConnecting}
              className={`inline-flex min-w-[240px] items-center justify-center gap-3 px-6 py-3 text-base md:text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${connectCtaClassName}`}
            >
              {isConnecting ? <Loader size={20} className="animate-spin" /> : <Wallet size={20} />}
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <div className="absolute left-full top-1/2 ml-2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setIsTooltipOpen((open) => !open)}
                onMouseEnter={() => setIsTooltipOpen(true)}
                onMouseLeave={() => setIsTooltipOpen(false)}
                aria-label="Why Arbitrum?"
                aria-expanded={isTooltipOpen}
                className="relative inline-flex items-center justify-center text-purple-300 transition-colors hover:text-white"
              >
                <HelpCircle size={22} />
              </button>
              {isTooltipOpen && (
                <div
                  className="absolute bottom-full left-1/2 z-20 mb-3 w-[300px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-4 text-left shadow-2xl shadow-cyan-500/10 backdrop-blur-md"
                  onMouseEnter={() => setIsTooltipOpen(true)}
                  onMouseLeave={() => setIsTooltipOpen(false)}
                >
                  <p className="text-sm font-semibold text-cyan-200">Why Arbitrum?</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-300 underline decoration-current/50 transition-colors hover:text-white">Arbitrum One</a>, an Ethereum L2 network.
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
                    <p><strong className="text-cyan-200">First time on Arbitrum?</strong> You&apos;ll need to select Arbitrum One in MetaMask and bridge ETH from Ethereum mainnet.</p>
                    <p><strong className="text-cyan-200">Already have Arbitrum ETH?</strong> Just connect and play.</p>
                    <p><strong className="text-cyan-200">Why Arbitrum?</strong> Lower fees. Same ETH.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {children ? (
        <div className="flex justify-center text-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
