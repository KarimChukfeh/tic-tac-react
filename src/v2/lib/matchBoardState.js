export function resolveFlatBoard(boardRaw, fallbackBoard = [], size) {
  const safeFallback = Array.isArray(fallbackBoard) ? fallbackBoard : [];
  const rawArray = Array.isArray(boardRaw) ? boardRaw : null;

  return Array.from({ length: size }, (_, index) => {
    const rawValue = rawArray?.[index];
    if (rawValue !== undefined && rawValue !== null) {
      return Number(rawValue);
    }

    const fallbackValue = safeFallback[index];
    return fallbackValue !== undefined && fallbackValue !== null
      ? Number(fallbackValue)
      : 0;
  });
}

export function resolveChessBoardState(boardResult, fallbackState = {}) {
  const rawPackedBoard = Array.isArray(boardResult) ? boardResult[0] : boardResult?.board;
  const rawPackedState = Array.isArray(boardResult) ? boardResult[1] : boardResult?.state;
  const fallbackBoard = fallbackState.packedBoard ?? 0n;
  const fallbackPackedState = fallbackState.packedState ?? 0n;

  return {
    packedBoard: rawPackedBoard !== undefined && rawPackedBoard !== null
      ? BigInt(rawPackedBoard)
      : BigInt(fallbackBoard),
    packedState: rawPackedState !== undefined && rawPackedState !== null
      ? BigInt(rawPackedState)
      : BigInt(fallbackPackedState),
  };
}
