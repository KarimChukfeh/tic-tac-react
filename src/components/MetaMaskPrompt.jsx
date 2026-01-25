import { Shield } from 'lucide-react';

/**
 * MetaMask Prompt Modal
 *
 * Shows mobile users a choice between opening in MetaMask or continuing
 * in their current browser.
 */
export default function MetaMaskPrompt({ onMetaMaskChoice, onContinueChoice }) {
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
            <Shield className="text-cyan-400" size={32} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          Choose Your Browser
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-center mb-6 leading-relaxed">
          For the best experience with wallet connections, we recommend using MetaMask's built-in browser.
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          {/* MetaMask Button */}
          <button
            onClick={onMetaMaskChoice}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)'
            }}
          >
            Open in MetaMask
          </button>

          {/* Continue Button */}
          <button
            onClick={onContinueChoice}
            className="w-full py-4 rounded-xl font-semibold text-slate-300 bg-slate-800 border border-slate-700 transition-all duration-300 hover:bg-slate-700 hover:border-slate-600"
          >
            Continue in Current Browser
          </button>
        </div>

        {/* Info note */}
        <p className="text-slate-500 text-xs text-center mt-4">
          Your choice will be remembered for this session
        </p>
      </div>
    </div>
  );
}
