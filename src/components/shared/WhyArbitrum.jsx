import { Info } from 'lucide-react';

/**
 * WhyArbitrum - Shared component explaining Arbitrum to new users
 *
 * @param {Object} props
 * @param {string} props.variant - Color variant: 'blue' (default), 'red', 'purple'
 */
export default function WhyArbitrum({ variant = 'blue' }) {
  const colors = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-400/30',
      icon: 'text-blue-400',
      text: 'text-blue-200',
      subtext: 'text-blue-300',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-400/30',
      icon: 'text-red-400',
      text: 'text-red-200',
      subtext: 'text-red-300',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-400/30',
      icon: 'text-purple-400',
      text: 'text-purple-200',
      subtext: 'text-purple-300',
    },
  };

  const theme = colors[variant] || colors.blue;

  return (
    <div className="mt-6 max-w-2xl mx-auto px-4">
      <div className={`${theme.bg} border ${theme.border} rounded-lg p-3 md:p-4`}>
        <div className="flex items-start gap-3">
          <div className="text-sm w-full">
            <p className={`${theme.text} font-medium mb-2`}>Why Arbitrum?</p>
            <p className={`${theme.subtext} opacity-80 leading-relaxed mb-3`}>
              This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className={`font-semibold ${theme.text} hover:text-green-300 underline decoration-current/50 hover:decoration-green-300 transition-colors`}>Arbitrum One</a>, an Ethereum L2 network.
            </p>
            <div className={`${theme.subtext} opacity-80 leading-relaxed space-y-2 text-sm`}>
              <p><strong className={theme.text}>First time on Arbitrum?</strong> You'll need to:</p>
              <ol className="list-decimal list-inside pl-2 space-y-1">
                <li>Select to the Arbitrum One network in MetaMask</li>
                <li>Bridge ETH from Ethereum mainnet to Arbitrum</li>
              </ol>
              <p><strong className={theme.text}>Already have Arbitrum ETH?</strong> Just connect and play.</p>
              <p className="pt-1"><span className={theme.text}>Lower fees. Same ETH.</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
