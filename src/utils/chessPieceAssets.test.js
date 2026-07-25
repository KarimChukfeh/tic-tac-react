import { describe, expect, it } from 'vitest';
import { getChessKingIconSvg, getChessPlayerSideIcons } from './chessPieceAssets';

describe('getChessKingIconSvg', () => {
  it('maps each chess symbol to the matching piece colour', () => {
    expect(getChessKingIconSvg('♔')).toBe('/chess-pieces/king-w.svg');
    expect(getChessKingIconSvg('♚')).toBe('/chess-pieces/king-b.svg');
  });

  it('ignores non-chess player icons', () => {
    expect(getChessKingIconSvg('X')).toBeNull();
  });

  it('assigns matching icons whether player 1 or player 2 is white', () => {
    const player1 = '0x1111111111111111111111111111111111111111';
    const player2 = '0x2222222222222222222222222222222222222222';

    expect(getChessPlayerSideIcons(player1, player1)).toEqual({
      player1IsWhite: true,
      player1Icon: '♔',
      player2Icon: '♚',
    });
    expect(getChessPlayerSideIcons(player2, player1)).toEqual({
      player1IsWhite: false,
      player1Icon: '♚',
      player2Icon: '♔',
    });
  });

  it('defaults player 1 to white before a side has been assigned', () => {
    expect(getChessPlayerSideIcons(undefined, '0x1111111111111111111111111111111111111111')).toEqual({
      player1IsWhite: true,
      player1Icon: '♔',
      player2Icon: '♚',
    });
  });
});
