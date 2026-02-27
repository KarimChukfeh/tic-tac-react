import { Wallet } from 'lucide-react';

/**
 * Wallet Browser Prompt Modal
 *
 * Shows mobile users a choice between opening in different wallet browsers
 * (MetaMask, Brave, Trust) or continuing in their current browser.
 */
export default function WalletBrowserPrompt({ onWalletChoice, onContinueChoice }) {
  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      logo: '/mm-logo.png',
      bgColor: 'bg-orange-500/10',
      hoverBg: 'hover:bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      hoverBorder: 'hover:border-orange-500/50'
    },
    {
      id: 'brave',
      name: 'Brave',
      logo: '/brave-logo.png',
      bgColor: 'bg-red-500/10',
      hoverBg: 'hover:bg-red-500/20',
      borderColor: 'border-red-500/30',
      hoverBorder: 'hover:border-red-500/50'
    },
    {
      id: 'trust',
      name: 'Trust',
      logo: '/trust-logo.png',
      bgColor: 'bg-blue-500/10',
      hoverBg: 'hover:bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      hoverBorder: 'hover:border-blue-500/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onContinueChoice}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
            <Wallet className="text-cyan-400" size={28} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-3">
          Choose Wallet Browser
        </h2>

        {/* Explanation Text */}
        <p className="text-slate-400 text-center mb-5 text-xs leading-relaxed">
          Traditional Web2 mobile browsers such as Chrome and Safari don't support wallet connections. Open ETour in a Web3 browser in order to connect and play.
        </p>

        {/* Open With Label */}
        <p className="text-slate-300 text-center mb-3 text-sm font-medium">
          Open With
        </p>

        {/* Wallet Options - Horizontal Layout */}
        <div className="flex justify-center gap-3 mb-6">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => onWalletChoice(wallet.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${wallet.bgColor} ${wallet.hoverBg} ${wallet.borderColor} ${wallet.hoverBorder}`}
              aria-label={`Open with ${wallet.name}`}
            >
              <img
                src={wallet.logo}
                alt={wallet.name}
                className="w-12 h-12 object-contain mb-2"
              />
              <span className="text-xs text-slate-300 font-medium">
                {wallet.name}
              </span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-slate-900 text-slate-500">OR</span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinueChoice}
          className="w-full py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 border border-slate-700 transition-all duration-200 hover:bg-slate-700 hover:border-slate-600 text-sm"
        >
          Continue in Browser
        </button>

        {/* Info note */}
        <p className="text-slate-500 text-xs text-center mt-3">
          For best experience, use a wallet browser
        </p>
      </div>
    </div>
  );
}