import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Github } from 'lucide-react';
import V2ContractsTable from './V2ContractsTable';
import './EtourFooter.css';

export default function EtourFooter({ scope = 'landing' }) {
  const [contractsExpanded, setContractsExpanded] = useState(false);

  return (
    <footer className="etour-footer">
      <div className="etour-footer__content">
        <div className="etour-footer__top">
          <p className="etour-footer__credit">
            Powered by <strong>ETour Protocol</strong>
          </p>
          <div className="etour-footer__links">
            <a href="https://github.com/KarimChukfeh/e-tour/" target="_blank" rel="noopener noreferrer">
              <Github size={15} aria-hidden="true" /> Solidity Code
            </a>
            <a href="https://github.com/KarimChukfeh/etour-react-client" target="_blank" rel="noopener noreferrer">
              <Github size={15} aria-hidden="true" /> Client Code
            </a>
            <button
              type="button"
              onClick={() => setContractsExpanded((expanded) => !expanded)}
              aria-expanded={contractsExpanded}
            >
              Contracts {contractsExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <a href="https://reclaimweb3.com" target="_blank" rel="noopener noreferrer">
              RW3 Manifesto <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <p className="etour-footer__statement">
          No company needed. No trust required. No servers to shutdown.
        </p>
      </div>
      {contractsExpanded && (
        <div className="etour-footer__contracts">
          <V2ContractsTable scope={scope} />
        </div>
      )}
    </footer>
  );
}
