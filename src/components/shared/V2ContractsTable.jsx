import TicTacToeV2Deployment from '../../v2/ABIs/TicTacChainFactory-ABI.json';
import ChessV2Deployment from '../../v2/ABIs/ChessOnChainFactory-ABI.json';
import ConnectFourV2Deployment from '../../v2/ABIs/ConnectFourFactory-ABI.json';

const ARBISCAN_BASE_URL = 'https://arbiscan.io/address';

const SHARED_MODULES = [
  { label: 'Core Module', address: TicTacToeV2Deployment.modules.ETourInstance_Core },
  { label: 'Matches Module', address: TicTacToeV2Deployment.modules.ETourInstance_Matches },
  { label: 'Prizes Module', address: TicTacToeV2Deployment.modules.ETourInstance_Prizes },
  { label: 'Escalation Module', address: TicTacToeV2Deployment.modules.ETourInstance_Escalation },
];

const GAME_DEPLOYMENTS = {
  landing: [
    {
      title: 'ETour Modules',
      entries: SHARED_MODULES,
    },
    {
      title: 'TicTacToe v2',
      entries: [
        { label: 'Player Profile', address: TicTacToeV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: TicTacToeV2Deployment.playerProfile.PlayerRegistry.address },
        { label: 'TicTacToe Factory', address: TicTacToeV2Deployment.factory.address },
        { label: 'TicTacToe Instance', address: TicTacToeV2Deployment.instance.address },
      ],
    },
    {
      title: 'Chess v2',
      entries: [
        { label: 'Player Profile', address: ChessV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: ChessV2Deployment.playerProfile.PlayerRegistry.address },
        { label: 'Chess Factory', address: ChessV2Deployment.factory.address },
        { label: 'Chess Instance', address: ChessV2Deployment.instance.address },
        { label: 'Chess Rules Module', address: ChessV2Deployment.modules.ChessRulesModule },
      ],
    },
    {
      title: 'Connect Four v2',
      entries: [
        { label: 'Player Profile', address: ConnectFourV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: ConnectFourV2Deployment.playerProfile.PlayerRegistry.address },
        { label: 'ConnectFour Factory', address: ConnectFourV2Deployment.factory.address },
        { label: 'ConnectFour Instance', address: ConnectFourV2Deployment.instance.address },
      ],
    },
  ],
  tictactoe: [
    {
      title: 'ETour Modules',
      entries: SHARED_MODULES,
    },
    {
      title: 'Player Contracts',
      entries: [
        { label: 'Player Profile', address: TicTacToeV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: TicTacToeV2Deployment.playerProfile.PlayerRegistry.address },
      ],
    },
    {
      title: 'Game Contracts',
      entries: [
        { label: 'TicTacToe Factory', address: TicTacToeV2Deployment.factory.address },
        { label: 'TicTacToe Instance', address: TicTacToeV2Deployment.instance.address },
      ],
    },
  ],
  chess: [
    {
      title: 'ETour Modules',
      entries: SHARED_MODULES,
    },
    {
      title: 'Player Contracts',
      entries: [
        { label: 'Player Profile', address: ChessV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: ChessV2Deployment.playerProfile.PlayerRegistry.address },
      ],
    },
    {
      title: 'Game Contracts',
      entries: [
        { label: 'Chess Factory', address: ChessV2Deployment.factory.address },
        { label: 'Chess Instance', address: ChessV2Deployment.instance.address },
        { label: 'Chess Rules Module', address: ChessV2Deployment.modules.ChessRulesModule },
      ],
    },
  ],
  connectfour: [
    {
      title: 'ETour Modules',
      entries: SHARED_MODULES,
    },
    {
      title: 'Player Contracts',
      entries: [
        { label: 'Player Profile', address: ConnectFourV2Deployment.playerProfile.PlayerProfileImpl.address },
        { label: 'Player Registry', address: ConnectFourV2Deployment.playerProfile.PlayerRegistry.address },
      ],
    },
    {
      title: 'Game Contracts',
      entries: [
        { label: 'ConnectFour Factory', address: ConnectFourV2Deployment.factory.address },
        { label: 'ConnectFour Instance', address: ConnectFourV2Deployment.instance.address },
      ],
    },
  ],
};

function getContractUrl(address) {
  return `${ARBISCAN_BASE_URL}/${address}#code`;
}

function ContractGroup({ title, entries }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{title}</h4>
      <div className="space-y-3">
        {entries.map(({ label, address }) => (
          <a
            key={`${title}-${label}-${address}`}
            href={getContractUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-800/50 bg-slate-950/70 px-3 py-2 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
          >
            <span className="block text-sm font-medium text-slate-200">{label}</span>
            <span className="mt-1 block break-all font-mono text-xs text-slate-500">{address}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function V2ContractsTable({ scope = 'landing' }) {
  const groups = GAME_DEPLOYMENTS[scope] || GAME_DEPLOYMENTS.landing;

  return (
    <div className="mb-8 rounded-2xl border border-slate-800/50 bg-slate-950/60 p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-300">All listed v2 deployments link to verified source on Arbiscan.</p>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Arbitrum One</p>
      </div>
      <div className={`grid gap-4 ${scope === 'landing' ? 'xl:grid-cols-4 md:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {groups.map((group) => (
          <ContractGroup key={group.title} title={group.title} entries={group.entries} />
        ))}
      </div>
    </div>
  );
}
