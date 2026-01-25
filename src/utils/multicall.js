/**
 * Multicall utility for batching multiple contract calls into a single RPC request
 * Uses Multicall3 contract which is deployed on most major networks
 */

import { ethers } from 'ethers';

// Multicall3 ABI - only the aggregate3 function we need
// Using the correct ABI format for ethers v6
const MULTICALL3_ABI = [
  {
    type: 'function',
    name: 'aggregate3',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' }
        ]
      }
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' }
        ]
      }
    ]
  }
];

// Multicall3 is deployed at this address on most chains (including Arbitrum One)
// For localhost/testnets without Multicall3, we'll fall back to parallel calls
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

/**
 * Check if Multicall3 is available on the current network
 */
async function isMulticallAvailable(provider) {
  try {
    const code = await provider.getCode(MULTICALL3_ADDRESS);
    return code !== '0x' && code !== '0x0';
  } catch {
    return false;
  }
}

/**
 * Batch multiple contract calls using Multicall3
 *
 * @param {ethers.Contract} contract - The contract to call
 * @param {string} functionName - The function name to call
 * @param {Array<Array>} paramsArray - Array of parameter arrays for each call
 * @param {ethers.Provider} provider - The provider to use
 * @param {boolean} allowFailure - Whether to allow individual calls to fail
 * @returns {Promise<Array>} Array of decoded results
 */
export async function multicall(contract, functionName, paramsArray, provider, allowFailure = true) {
  // Check if multicall is available
  const multicallAvailable = await isMulticallAvailable(provider);

  if (!multicallAvailable) {
    // Fall back to parallel calls
    const fallbackResults = await Promise.all(
      paramsArray.map(params =>
        contract[functionName](...params)
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error }))
      )
    );
    return fallbackResults;
  }

  // Get the function fragment
  const fragment = contract.interface.getFunction(functionName);
  if (!fragment) {
    throw new Error(`Function ${functionName} not found in contract interface`);
  }

  // Encode each call
  const calls = paramsArray.map(params => ({
    target: contract.target,
    allowFailure,
    callData: contract.interface.encodeFunctionData(fragment, params)
  }));

  // Create multicall contract
  const multicallContract = new ethers.Contract(
    MULTICALL3_ADDRESS,
    MULTICALL3_ABI,
    provider
  );

  // Execute multicall with timeout
  let results;
  try {
    // Add timeout to detect hanging calls
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Multicall timeout after 10s')), 10000)
    );

    // Use staticCall for read-only operation (ethers v6 best practice)
    const callPromise = multicallContract.aggregate3.staticCall(calls);

    results = await Promise.race([
      callPromise,
      timeoutPromise
    ]);
  } catch (error) {

    // Fallback to parallel calls
    return Promise.all(
      paramsArray.map(params =>
        contract[functionName](...params)
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error }))
      )
    );
  }

  // Decode results
  const decodedResults = results.map((result, index) => {
    if (!result.success) {
      return { success: false, error: new Error('Call failed') };
    }

    try {
      const decoded = contract.interface.decodeFunctionResult(fragment, result.returnData);
      // ethers v6 returns results as arrays, so we get the first element if it's a single return value
      const finalResult = decoded.length === 1 ? decoded[0] : decoded;
      return { success: true, result: finalResult };
    } catch (error) {
      return { success: false, error };
    }
  });

  const successCount = decodedResults.filter(r => r.success).length;
  return decodedResults;
}

/**
 * Specialized function for fetching tournament data in batch
 * For TicTacChain contract (uses tournaments() function)
 *
 * @param {ethers.Contract} contract - The tournament contract
 * @param {number} tierId - The tier ID
 * @param {number} instanceCount - Number of instances to fetch
 * @param {ethers.Provider} provider - The provider to use
 * @returns {Promise<Array>} Array of tournament data with status and enrolledCount
 */
export async function batchFetchTournaments(contract, tierId, instanceCount, provider) {
  // Create parameter arrays for each tournament call
  const paramsArray = Array.from(
    { length: instanceCount },
    (_, instanceId) => [tierId, instanceId]
  );

  // Execute multicall
  const results = await multicall(contract, 'tournaments', paramsArray, provider, true);

  // Transform results to match existing format
  // tournaments() returns the full struct, so extract all fields we need
  const transformed = results.map((result, idx) => {
    if (!result.success) {
      return { success: false, error: result.error };
    }

    try {
      const tournament = result.result;
      return {
        success: true,
        status: Number(tournament.status),
        enrolledCount: Number(tournament.enrolledCount),
        currentRound: Number(tournament.currentRound || 0),
        enrollmentTimeout: tournament.enrollmentTimeout,
        hasStartedViaTimeout: tournament.hasStartedViaTimeout
      };
    } catch (error) {
      return { success: false, error };
    }
  });

  const successCount = transformed.filter(r => r.success).length;
  return transformed;
}

/**
 * Specialized function for fetching isEnrolled status in batch
 *
 * @param {ethers.Contract} contract - The tournament contract
 * @param {number} tierId - The tier ID
 * @param {number} instanceCount - Number of instances to check
 * @param {string} userAddress - The user address to check enrollment for
 * @param {ethers.Provider} provider - The provider to use
 * @returns {Promise<Array>} Array of boolean enrollment statuses
 */
export async function batchFetchIsEnrolled(contract, tierId, instanceCount, userAddress, provider) {
  // Create parameter arrays for each isEnrolled call
  const paramsArray = Array.from(
    { length: instanceCount },
    (_, instanceId) => [tierId, instanceId, userAddress]
  );

  // Execute multicall
  const results = await multicall(contract, 'isEnrolled', paramsArray, provider, true);

  // Transform results to simple boolean array
  const transformed = results.map((result, idx) => {
    if (!result.success) {
      return false;
    }
    return Boolean(result.result);
  });

  const enrolledCount = transformed.filter(r => r).length;
  return transformed;
}

/**
 * Specialized function for fetching tournament info in batch
 * For Chess/ConnectFour contracts (uses getTournamentInfo() function)
 *
 * @param {ethers.Contract} contract - The tournament contract
 * @param {number} tierId - The tier ID
 * @param {number} instanceCount - Number of instances to fetch
 * @param {ethers.Provider} provider - The provider to use
 * @returns {Promise<Array>} Array of tournament data with status and enrolledCount
 */
export async function batchFetchTournamentInfo(contract, tierId, instanceCount, provider) {
  // Create parameter arrays for each tournament call
  const paramsArray = Array.from(
    { length: instanceCount },
    (_, instanceId) => [tierId, instanceId]
  );

  // Execute multicall
  const results = await multicall(contract, 'getTournamentInfo', paramsArray, provider, true);

  // Transform results to match existing format
  // getTournamentInfo returns an array: [status, currentRound, enrolledCount, prizePool, winner]
  const transformed = results.map((result, idx) => {
    if (!result.success) {
      return { success: false, error: result.error };
    }

    try {
      const tournamentInfo = result.result;
      return {
        success: true,
        status: Number(tournamentInfo[0]),
        currentRound: Number(tournamentInfo[1]),
        enrolledCount: Number(tournamentInfo[2])
      };
    } catch (error) {
      return { success: false, error };
    }
  });

  return transformed;
}
