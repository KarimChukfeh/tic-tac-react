export function getChessKingIconSvg(icon) {
  if (icon === '♔') return '/chess-pieces/king-w.svg';
  if (icon === '♚') return '/chess-pieces/king-b.svg';
  return null;
}

export function getChessPlayerSideIcons(firstPlayer, player1) {
  const normalizedFirstPlayer = firstPlayer?.toLowerCase?.() || '';
  const normalizedPlayer1 = player1?.toLowerCase?.() || '';
  const firstPlayerIsAssigned = normalizedFirstPlayer
    && normalizedFirstPlayer !== '0x0000000000000000000000000000000000000000';
  const player1IsWhite = !firstPlayerIsAssigned || normalizedFirstPlayer === normalizedPlayer1;

  return {
    player1IsWhite,
    player1Icon: player1IsWhite ? '♔' : '♚',
    player2Icon: player1IsWhite ? '♚' : '♔',
  };
}
