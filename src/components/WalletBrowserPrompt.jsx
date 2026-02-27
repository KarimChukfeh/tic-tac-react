import { Shield, Wallet } from 'lucide-react';

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
      icon: '🦊',
      description: 'Open in MetaMask browser',
      gradient: 'from-orange-500 to-orange-600',
      shadowColor: 'rgba(251, 146, 60, 0.4)'
    },
    {
      id: 'brave',
      name: 'Brave Wallet',
      icon: '🦁',
      description: 'Open in Brave browser',
      gradient: 'from-orange-400 to-red-500',
      shadowColor: 'rgba(251, 113, 133, 0.4)'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Open in Trust browser',
      gradient: 'from-blue-500 to-blue-600',
      shadowColor: 'rgba(59, 130, 246, 0.4)'
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
      <div className="relative bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
            <Wallet className="text-cyan-400" size={32} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          Choose Your Wallet Browser
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-center mb-6 leading-relaxed text-sm">
          For the best experience with wallet connections, we recommend using a wallet's built-in browser.
        </p>

        {/* Wallet Options */}
        <div className="space-y-2 mb-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => onWalletChoice(wallet.id)}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white text-base transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${wallet.gradient.replace('from-', '').replace('to-', '').split(' ').map(c => {
                  const colorMap = {
                    'orange-500': '#f97316',
                    'orange-600': '#ea580c',
                    'orange-400': '#fb923c',
                    'red-500': '#ef4444',
                    'blue-500': '#3b82f6',
                    'blue-600': '#2563eb'
                  };
                  return colorMap[c] || c;
                }).join(', ')})`,
                boxShadow: `0 4px 20px ${wallet.shadowColor}`
              }}
            >
              <span className="text-xl">{wallet.icon}</span>
              <span>{wallet.description}</span>
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinueChoice}
          className="w-full py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 border border-slate-700 transition-all duration-300 hover:bg-slate-700 hover:border-slate-600"
        >
          Continue in Current Browser
        </button>

        {/* Info note */}
        <p className="text-slate-500 text-xs text-center mt-4">
          Your choice will be remembered for this session
        </p>
      </div>
    </div>
  );
}