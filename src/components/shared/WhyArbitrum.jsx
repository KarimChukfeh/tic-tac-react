/**
 * WhyArbitrum - Shared component explaining Arbitrum to new users
 *
 * @param {Object} props
 * @param {string} props.variant - Color variant: 'blue' (default), 'red', 'purple'
 * @param {boolean} props.isExpanded - Whether the card is expanded
 * @param {Function} props.onToggle - Callback when toggle button is clicked
 */
export default function WhyArbitrum({ variant = 'blue', isExpanded = true, onToggle }) {
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
    <div className="mt-6 max-w-lg mx-auto">
      <div className={`${theme.bg} border ${theme.border} rounded-lg overflow-hidden transition-all duration-300`}>
        <button
          onClick={onToggle}
          className="w-full p-3 md:p-4 flex items-center justify-center relative hover:opacity-80 transition-opacity no-underline focus:outline-none focus:ring-0 focus-visible:outline-none outline-none [&:focus]:outline-none [&:focus-visible]:outline-none [&:active]:outline-none"
          style={{ outline: 'none !important', boxShadow: 'none !important', border: 'none' }}
        >
          <p className={`${theme.text} font-medium no-underline`}>Why Arbitrum?</p>
          <svg
            className={`w-5 h-5 ${theme.icon} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} absolute right-3 md:right-4`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-3 md:px-4 pb-3 md:pb-4">
            <div className="text-sm w-full">
              <p className={`${theme.subtext} opacity-80 leading-relaxed mb-3`}>
                This game runs on <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className={`font-semibold ${theme.text} hover:text-green-300 underline decoration-current/50 hover:decoration-green-300 transition-colors`}>Arbitrum One</a>, an Ethereum L2 network.
              </p>
              <div className={`${theme.subtext} opacity-80 leading-relaxed space-y-2 text-sm`}>
                <p><strong className={theme.text}>First time on Arbitrum?</strong> You'll need to:</p>
                <ol className="list-decimal list-inside pl-2 space-y-1">
                  <li>Select the Arbitrum One network in MetaMask</li>
                  <li>Bridge ETH from Ethereum mainnet to Arbitrum</li>
                </ol>
                <p><strong className={theme.text}>Already have Arbitrum ETH?</strong> Just connect and play.</p>
                <p className="pt-1"><span className={theme.text}>Lower fees. Same ETH.</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
