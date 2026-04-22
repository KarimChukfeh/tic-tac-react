const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function normalizePrizeDistribution(prizeDistribution) {
  const players = Array.isArray(prizeDistribution?.players)
    ? prizeDistribution.players
    : Array.isArray(prizeDistribution?.[0])
      ? prizeDistribution[0]
      : [];
  const amounts = Array.isArray(prizeDistribution?.amounts)
    ? prizeDistribution.amounts
    : Array.isArray(prizeDistribution?.[1])
      ? prizeDistribution[1]
      : [];

  return players
    .map((recipient, index) => ({
      recipient,
      amount: amounts[index] ?? 0n,
    }))
    .filter(({ recipient, amount }) => (
      recipient &&
      recipient !== ZERO_ADDRESS &&
      typeof amount === 'bigint' &&
      amount > 0n
    ));
}
