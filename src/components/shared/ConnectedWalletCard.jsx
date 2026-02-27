import React from 'react';
import { timeAgo } from '../../utils/formatters';

/**
 * ConnectedWalletCard
 *
 * Props:
 *   account          - connected wallet address
 *   balance          - ETH balance string
 *   contractAddress  - contract address to link
 *   contractName     - human-readable contract name (e.g. "TicTacChain")
 *   shortenAddress   - function(addr) => shortened string
 *   payout           - formatted payout string (e.g. "+0.012 ETH"), or null
 *   lastWin          - Unix timestamp (seconds) of the latest win, or null
 *   isEnrolledInElite - optional; enables elite (gold) theme variant
 *   currentTheme     - optional; theme object with successBg / successBorder keys
 */
export default function ConnectedWalletCard({
  account,
  balance,
  contractAddress,
  contractName,
  shortenAddress,
  payout = null,
  lastWin = null,
  isEnrolledInElite = false,
  currentTheme = {},
}) {
  const wrapperCls = isEnrolledInElite
    ? `${currentTheme.successBg} ${currentTheme.successBorder} border`
    : 'bg-green-500/40 border border-green-400/50';

  const dotCls = isEnrolledInElite ? 'bg-[#22c55e]' : 'bg-green-400';

  const addressTextCls = isEnrolledInElite ? 'text-[#fff8e7]' : 'text-white';
  const dividerCls = isEnrolledInElite ? 'bg-[#d4a012]/30' : 'bg-green-400/30';
  const metaTextCls = isEnrolledInElite ? 'text-[#f5e6c8]' : 'text-green-200';

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className={`flex items-start gap-4 px-8 py-4 rounded-2xl ${wrapperCls}`}>
        <div className="flex items-center h-6">
          <div className={`w-3 h-3 rounded-full animate-pulse ${dotCls}`}></div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <span className={`text-base ${addressTextCls}`}>
            Connected as <strong className="font-mono">{shortenAddress(account)}</strong>
            {' '}to{' '}
            <a
              href={`https://arbiscan.io/address/${contractAddress}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-300 hover:text-blue-200 underline decoration-blue-300/50 hover:decoration-blue-200 transition-colors"
            >
              {contractName ?? shortenAddress(contractAddress)}
            </a>
          </span>
          <div className={`w-full h-[1px] ${dividerCls}`}></div>
          <span className={`text-base ${metaTextCls}`}>
            You earned a total of <strong>{payout != null ? (() => {
              const stripped = payout.replace(/^[+-]/, '').replace(/\s*ETH\s*$/i, '').trim();
              return `${parseFloat(stripped).toFixed(6)} ETH`;
            })() : 'N/A'}</strong>
          </span>
          <span className={`text-base ${metaTextCls}`}>
            Your current balance is <strong>{balance ? `${parseFloat(balance).toFixed(6)} ETH` : 'N/A'}</strong>
          </span>
          <span className={`text-base ${metaTextCls}`}>
            Your last victory was <strong>{lastWin != null ? timeAgo(lastWin) : 'N/A'}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
