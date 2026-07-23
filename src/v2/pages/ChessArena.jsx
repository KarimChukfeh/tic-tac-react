import ChessV2 from './ChessV2';
import './TicTacToeArena.css';
import './GameArenaVariants.css';

export default function ChessArena() {
  return <ChessV2 experience="arena" routeBase="/chess2" />;
}
