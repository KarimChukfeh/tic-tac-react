import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import tttABI from '../../TTTABI-modular.json';
import chessABI from '../../ChessOnChain-ABI-modular.json';
import connectFourABI from '../../ConnectFourABI-modular.json';

/**
 * TotalEarningsCard
 * Displays total ETH won by all players across all three games in the last 24 hours
 */
export default function TotalEarningsCard() {
  const [totalEarnings, setTotalEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTotalEarnings();
  }, []);

  const fetchTotalEarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create provider
      const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

      // Create contract instances
      const tttContract = new ethers.Contract(tttABI.address, tttABI.abi, provider);
      const chessContract = new ethers.Contract(chessABI.address, chessABI.abi, provider);
      const connectFourContract = new ethers.Contract(connectFourABI.address, connectFourABI.abi, provider);

      // Arbitrum produces ~4 blocks per second
      // 24 hours = 86400 seconds = ~345,600 blocks
      const blocksPerHour = 14400;
      const blocksIn24Hours = blocksPerHour * 24;

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blocksIn24Hours);

      console.log(`[TotalEarnings] Querying from block ${fromBlock} to ${currentBlock}`);

      // Query Transfer events from all three contracts where `from` is the contract address
      // This captures prize payouts to winners
      const [tttEvents, chessEvents, connectFourEvents] = await Promise.all([
        tttContract.queryFilter(tttContract.filters.Transfer(tttABI.address, null), fromBlock, currentBlock),
        chessContract.queryFilter(chessContract.filters.Transfer(chessABI.address, null), fromBlock, currentBlock),
        connectFourContract.queryFilter(connectFourContract.filters.Transfer(connectFourABI.address, null), fromBlock, currentBlock)
      ]);

      console.log(`[TotalEarnings] Found events - TTT: ${tttEvents.length}, Chess: ${chessEvents.length}, C4: ${connectFourEvents.length}`);

      // Sum all transfer values
      let totalWei = BigInt(0);

      for (const event of [...tttEvents, ...chessEvents, ...connectFourEvents]) {
        totalWei += BigInt(event.args.value.toString());
      }

      // Convert to ETH
      const totalEth = Number(ethers.formatEther(totalWei));
      console.log(`[TotalEarnings] Total 24h earnings: ${totalEth} ETH`);

      setTotalEarnings(totalEth);
    } catch (err) {
      console.error('[TotalEarnings] Error fetching earnings:', err);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-2">
        <p className="text-slate-500 text-sm">Loading stats...</p>
      </div>
    );
  }

  if (error || totalEarnings === null || totalEarnings < 0.009) {
    return null; // Only show if >= 0.009 ETH
  }

  return (
    <div className="inline-block mt-4 px-4 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
      <p className="text-slate-400 text-sm">
        In the last 24 hours{' '}
        <span className="text-cyan-400 font-semibold">
          {totalEarnings.toFixed(4)} ETH
        </span>
        {' '} have been sent to winners
      </p>
    </div>
  );
}
