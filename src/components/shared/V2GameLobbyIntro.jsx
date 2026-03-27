import { useState } from 'react';
import { Clock, HelpCircle, Shield } from 'lucide-react';
import WhyArbitrum from './WhyArbitrum';

function EthIcon({ className = '' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 256 417"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.6" />
      <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
      <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity="0.6" />
      <path d="M127.962 416.905v-104.72L0 236.585z" />
      <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="0.2" />
      <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.6" />
    </svg>
  );
}

export default function V2GameLobbyIntro({
  descriptionLines = [],
  matchTimeLabel,
  matchTimeDescription,
}) {
  const [isWhyArbitrumExpanded, setIsWhyArbitrumExpanded] = useState(false);

  return (
    <div className="max-w-4xl mx-auto mb-10">
      {descriptionLines.length > 0 ? (
        <div className="text-center mb-8 space-y-1">
          {descriptionLines.map(line => (
            <p key={line} className="text-lg text-blue-300 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-yellow-400" size={20} />
            <span className="font-bold text-yellow-300">{matchTimeLabel}</span>
          </div>
          <p className="text-sm text-yellow-200">{matchTimeDescription}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <EthIcon className="text-green-400" />
            <span className="font-bold text-green-300">Instant ETH Payouts</span>
          </div>
          <p className="text-sm text-green-200">
            Winners paid automatically on-chain. No delays, no middlemen.
          </p>
        </div>

        <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-purple-400" size={20} />
            <span className="font-bold text-purple-300">Impossible to grief</span>
          </div>
          <a
            href="#user-manual"
            className="absolute top-3 right-3 text-purple-400 hover:text-purple-300 transition-colors"
            title="Learn more about anti-griefing"
          >
            <HelpCircle size={16} />
          </a>
          <p className="text-sm text-purple-200">
            Anti-stalling mechanisms ensure every match completes. No admin required.
          </p>
        </div>
      </div>

      <WhyArbitrum
        variant="blue"
        isExpanded={isWhyArbitrumExpanded}
        onToggle={() => setIsWhyArbitrumExpanded(prev => !prev)}
      />
    </div>
  );
}
