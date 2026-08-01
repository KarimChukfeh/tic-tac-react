import { useRef } from 'react';
import { Wallet } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

const WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    logo: '/mm-logo.png',
    classes: 'border-orange-500/30 bg-orange-500/10 hover:border-orange-500/50 hover:bg-orange-500/20',
  },
  {
    id: 'brave',
    name: 'Brave',
    logo: '/brave-logo.png',
    classes: 'border-red-500/30 bg-red-500/10 hover:border-red-500/50 hover:bg-red-500/20',
  },
  {
    id: 'trust',
    name: 'Trust',
    logo: '/trust-logo.png',
    classes: 'border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50 hover:bg-blue-500/20',
  },
];

export default function WalletBrowserPrompt({ onWalletChoice, onContinueChoice }) {
  const dialogRef = useRef(null);
  const initialFocusRef = useRef(null);
  useAccessibleDialog({
    isOpen: true,
    dialogRef,
    initialFocusRef,
    onClose: onContinueChoice,
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Continue in the current browser"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onContinueChoice}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v3-wallet-browser-title"
        aria-describedby="v3-wallet-browser-description"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl border-2 border-cyan-500/30 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex justify-center" aria-hidden="true">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-500/30 bg-cyan-500/10">
            <Wallet className="text-cyan-400" size={28} />
          </div>
        </div>

        <h2 id="v3-wallet-browser-title" className="mb-3 text-center text-xl font-bold text-white">
          Choose a Wallet Browser
        </h2>
        <div id="v3-wallet-browser-description" className="mb-5 text-center text-xs leading-relaxed text-slate-400">
          <p>A wallet browser can connect this device to your wallet.</p>
          <p>You can also continue here and use an installed wallet extension.</p>
        </div>

        <p className="mb-3 text-center text-sm font-medium text-slate-300">Open with</p>
        <div className="mb-6 flex justify-center gap-3">
          {WALLETS.map((wallet, index) => (
            <button
              key={wallet.id}
              ref={index === 0 ? initialFocusRef : undefined}
              type="button"
              onClick={() => onWalletChoice(wallet.id)}
              className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-200 hover:scale-105 ${wallet.classes}`}
              aria-label={`Open with ${wallet.name}`}
            >
              <img src={wallet.logo} alt="" className="mb-2 h-12 w-12 object-contain" />
              <span className="text-xs font-medium text-slate-300">{wallet.name}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-4" aria-hidden="true">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-slate-900 px-2 text-slate-500">OR</span></div>
        </div>

        <button
          type="button"
          onClick={onContinueChoice}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700"
        >
          Continue in Browser
        </button>
      </section>
    </div>
  );
}
