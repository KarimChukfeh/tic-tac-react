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
 * Batch heterogeneous contract calls using Multicall3.
 *
 * @param {Array<{contract: ethers.Contract, functionName: string, params?: Array, allowFailure?: boolean}>} callSpecs
 * @param {ethers.Provider} provider
 * @param {number} chunkSize
 * @returns {Promise<Array<{success: boolean, result?: any, error?: Error}>>}
 */
export async function multicallContracts(callSpecs, provider, chunkSize = 150) {
  if (!Array.isArray(callSpecs) || callSpecs.length === 0) return [];

  const multicallAvailable = await isMulticallAvailable(provider);
  const chunks = [];
  for (let i = 0; i < callSpecs.length; i += chunkSize) {
    chunks.push(callSpecs.slice(i, i + chunkSize));
  }

  const allResults = [];

  for (const chunk of chunks) {
    if (!multicallAvailable) {
      const fallbackResults = await Promise.all(
        chunk.map(async ({ contract, functionName, params = [] }) => {
          try {
            const result = await contract[functionName](...params);
            return { success: true, result };
          } catch (error) {
            return { success: false, error };
          }
        })
      );
      allResults.push(...fallbackResults);
      continue;
    }

    const preparedCalls = chunk.map((spec) => {
      const fragment = spec.contract.interface.getFunction(spec.functionName);
      if (!fragment) {
        throw new Error(`Function ${spec.functionName} not found in contract interface`);
      }

      return {
        ...spec,
        fragment,
        call: {
          target: spec.contract.target,
          allowFailure: spec.allowFailure ?? true,
          callData: spec.contract.interface.encodeFunctionData(fragment, spec.params || []),
        },
      };
    });

    const multicallContract = new ethers.Contract(
      MULTICALL3_ADDRESS,
      MULTICALL3_ABI,
      provider
    );

    let results;
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Multicall timeout after 10s')), 10000)
      );

      const callPromise = multicallContract.aggregate3.staticCall(
        preparedCalls.map(({ call }) => call)
      );

      results = await Promise.race([callPromise, timeoutPromise]);
    } catch (error) {
      const fallbackResults = await Promise.all(
        chunk.map(async ({ contract, functionName, params = [] }) => {
          try {
            const result = await contract[functionName](...params);
            return { success: true, result };
          } catch (fallbackError) {
            return { success: false, error: fallbackError };
          }
        })
      );
      allResults.push(...fallbackResults);
      continue;
    }

    const decodedResults = results.map((result, index) => {
      if (!result.success) {
        return { success: false, error: new Error('Call failed') };
      }

      try {
        const { contract, fragment } = preparedCalls[index];
        const decoded = contract.interface.decodeFunctionResult(fragment, result.returnData);
        const finalResult = decoded.length === 1 ? decoded[0] : decoded;
        return { success: true, result: finalResult };
      } catch (error) {
        return { success: false, error };
      }
    });

    allResults.push(...decodedResults);
  }

  return allResults;
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

/**
 * Specialized function for checking if any matches in an active tournament have escalations available
 * This checks all matches in the current round of a tournament
 *
 * @param {ethers.Contract} contract - The tournament contract
 * @param {number} tierId - The tier ID
 * @param {number} instanceId - The instance ID
 * @param {number} currentRound - Current round number
 * @param {ethers.Provider} provider - The provider to use
 * @returns {Promise<{hasEscalations: boolean, escL2Count: number, escL3Count: number}>}
 */
export async function checkInstanceEscalations(contract, tierId, instanceId, currentRound, provider) {
  try {
    // Get round info to determine how many matches to check
    // Note: currentRound might be 0 if the tournament just started - we'll check anyway
    const roundInfo = await contract.getRoundInfo(tierId, instanceId, currentRound);
    const totalMatches = Number(roundInfo.totalMatches || roundInfo[0]);

    if (totalMatches === 0) {
      return { hasEscalations: false, escL2Count: 0, escL3Count: 0, firstML3Match: null };
    }

    // Create parameter arrays for checking escalations on all matches
    const paramsArrayL2 = Array.from(
      { length: totalMatches },
      (_, matchNum) => [tierId, instanceId, currentRound, matchNum]
    );
    const paramsArrayL3 = [...paramsArrayL2];

    // Execute multicalls for both L2 and L3 escalations
    // Note: These functions revert if escalation isn't available, so we allow failures
    const [resultsL2, resultsL3] = await Promise.all([
      multicall(contract, 'isMatchEscL2Available', paramsArrayL2, provider, true),
      multicall(contract, 'isMatchEscL3Available', paramsArrayL3, provider, true)
    ]);

    // Count how many matches have escalations available and track first match with ML3
    let escL2Count = 0;
    let escL3Count = 0;
    let firstML3Match = null; // Track first match with ML3 for scrolling

    for (let i = 0; i < resultsL2.length; i++) {
      if (resultsL2[i].success && resultsL2[i].result === true) {
        escL2Count++;
      }
    }

    for (let i = 0; i < resultsL3.length; i++) {
      if (resultsL3[i].success && resultsL3[i].result === true) {
        escL3Count++;
        if (firstML3Match === null) {
          firstML3Match = { round: currentRound, match: i };
        }
      }
    }

    return {
      hasEscalations: escL2Count > 0 || escL3Count > 0,
      escL2Count,
      escL3Count,
      firstML3Match // { round: X, match: Y } or null
    };
  } catch (error) {
    console.debug(`Could not check escalations for tier ${tierId} instance ${instanceId}:`, error);
    return { hasEscalations: false, escL2Count: 0, escL3Count: 0, firstML3Match: null };
  }
}
