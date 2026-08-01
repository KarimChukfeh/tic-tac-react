import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(import.meta.dirname, '..');
const V2_ROOT = path.join(SRC_ROOT, 'v2');
const V3_ROOT = path.join(SRC_ROOT, 'v3');
const MAIN_PATH = path.join(SRC_ROOT, 'main.jsx');
const SOURCE_EXTENSION_PATTERN = /\.(?:js|jsx)$/u;
const IMPORT_SPECIFIER_PATTERN = /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/gu;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return sourceFiles(entryPath);
    return SOURCE_EXTENSION_PATTERN.test(entry.name) ? [entryPath] : [];
  });
}

function relativeImportTargets(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');

  return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => path.resolve(path.dirname(filePath), specifier));
}

describe('V3 generation boundary', () => {
  it('does not import source from the V2 generation', () => {
    const violations = sourceFiles(V3_ROOT).flatMap((filePath) => (
      relativeImportTargets(filePath)
        .filter((target) => target === V2_ROOT || target.startsWith(`${V2_ROOT}${path.sep}`))
        .map((target) => ({
          file: path.relative(SRC_ROOT, filePath),
          target: path.relative(SRC_ROOT, target),
        }))
    ));

    expect(violations).toEqual([]);
  });

  it('keeps V2 and V3 route components explicitly separated', () => {
    const mainSource = fs.readFileSync(MAIN_PATH, 'utf8');

    expect(mainSource).toContain('<Route path="/tictactoe" element={<TicTacToeArena />} />');
    expect(mainSource).toContain('<Route path="/connect4" element={<ConnectFourArena />} />');
    expect(mainSource).toContain('<Route path="/chess" element={<ChessArena />} />');
    expect(mainSource).toContain('<Route path="/v3/tictactoe" element={<TicTacToeArenaV3 />} />');
    expect(mainSource).toContain('<Route path="/v3/connect4" element={<ConnectFourArenaV3 />} />');
    expect(mainSource).toContain('<Route path="/v3/chess" element={<ChessArenaV3 />} />');
  });

  it('keeps V3 page seams free of legacy route helpers and page names', () => {
    const pageFiles = sourceFiles(path.join(V3_ROOT, 'pages'));
    const pageSources = pageFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

    expect(pageFiles.some((filePath) => /(?:TicTacToe|ConnectFour|Chess)V2\.jsx$/u.test(filePath))).toBe(false);
    expect(pageSources).not.toContain('parseV2ContractParam');
    expect(pageSources).not.toContain('generateV2TournamentUrl');
    expect(pageSources).not.toContain("routeBase = '/tictactoe'");
    expect(pageSources).not.toContain("routeBase = '/connect4'");
    expect(pageSources).not.toContain("routeBase = '/chess'");
  });

  it('keeps shared V3 contract-read orchestration outside game pages', () => {
    const gamePageSources = [
      'TicTacToePage.jsx',
      'ConnectFourPage.jsx',
      'ChessPage.jsx',
    ].map((fileName) => (
      fs.readFileSync(path.join(V3_ROOT, 'pages', fileName), 'utf8')
    ));

    for (const source of gamePageSources) {
      expect(source).toContain('readV3FactoryDashboard');
      expect(source).toContain('readV3TournamentState');
      expect(source).toContain('readV3ActiveMatchState');
      expect(source).toContain('createV3RpcProvider');
      expect(source).not.toContain('multicallContracts');
      expect(source).not.toContain('buildV2MatchKey');
      expect(source).not.toContain('CURRENT_NETWORK.rpcUrl');
      expect(source).not.toContain("from '../../config/networks'");
      expect(source).toContain("from '../config/walletConfig'");
    }
  });

  it('makes normalized deployment configuration the only game-contract input', () => {
    const sharedContractsSource = fs.readFileSync(
      path.join(V3_ROOT, 'lib', 'gameShared.js'),
      'utf8',
    );

    expect(sharedContractsSource).toContain('getV3GameDeployment');
    expect(sharedContractsSource).not.toContain("from '../ABIs/");
    expect(sharedContractsSource).not.toContain('validateV3GameDeployment');
    expect(fs.existsSync(path.join(V3_ROOT, 'lib', 'abiContracts.js'))).toBe(false);
  });

  it('keeps every game on the shared session controller and primary identity', () => {
    const games = [
      ['TicTacToePage.jsx', 'createTicTacToeMove'],
      ['ConnectFourPage.jsx', 'createConnectFourMove'],
      ['ChessPage.jsx', 'createChessMove'],
    ];

    for (const [fileName, moveFactory] of games) {
      const source = fs.readFileSync(path.join(V3_ROOT, 'pages', fileName), 'utf8');

      expect(source).toContain('new V3MoveController()');
      expect(source).toContain(moveFactory);
      expect(source).toContain('canSubmitSessionMove(v3Session.state)');
      expect(source).toContain('sessionService: await v3Session.getService()');
      expect(source).toContain('identity: v3Session.identity');
      expect(source).toContain('<V3SessionStatus');
      expect(source).toContain('<V3ActionAnnouncer');
      expect(source).toContain("from '../components/WalletBrowserPrompt'");
      expect(source).toContain('className="v3-session-dock"');
      expect(source).toContain('getV3ScrollBehavior()');
      expect(source).toContain('browserProvider,');
      expect(source).toContain('onRefresh={v3Session.refreshSession}');
      expect(source).toContain('onRevoke={v3Session.revokeSession}');
      expect(source).toContain('formatSessionMoveFailure(descriptor)');
      expect(source).not.toContain('identity: v3Session.state.executor');
      expect(source).not.toContain("behavior: 'smooth'");
    }
  });
});
