import { useState } from 'react';
import { Loader, Wallet } from 'lucide-react';
import WhyArbitrum from './WhyArbitrum';

export default function V2GameLobbyIntro({
  account,
  isConnecting = false,
  onConnectWallet,
  connectCtaClassName = '',
}) {
  const [isWhyArbitrumExpanded, setIsWhyArbitrumExpanded] = useState(false);

  return (
    <div className="max-w-lg mx-auto space-y-5 md:space-y-6">
      <WhyArbitrum
        variant="blue"
        isExpanded={isWhyArbitrumExpanded}
        onToggle={() => setIsWhyArbitrumExpanded(prev => !prev)}
      />
      {!account && onConnectWallet && (
        <div>
          <button
            type="button"
            onClick={onConnectWallet}
            disabled={isConnecting}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 text-lg md:text-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${connectCtaClassName}`}
          >
            {isConnecting ? <Loader size={22} className="animate-spin" /> : <Wallet size={22} />}
            {isConnecting ? 'Connecting...' : 'Connect Wallet to Enter'}
          </button>
        </div>
      )}
    </div>
  );
}
