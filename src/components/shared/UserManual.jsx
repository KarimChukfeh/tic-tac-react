/**
 * UserManual - Displays anti-griefing system documentation
 *
 * Shows comprehensive documentation about how the ETour anti-griefing
 * system works, including escalation levels, time settings, and rules.
 */

import { useEffect, useState, useRef } from 'react';
import { BookOpen, Shield } from 'lucide-react';
import { ethers } from 'ethers';

const UserManual = ({
  contractInstance = null,
  // Optional overrides for configuration values
  enrollmentWindows = null, // e.g., { '2': 300, '4': 600, '8': 1200 } in seconds
  raffleThresholds = null, // e.g., ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0'] in ETH
  protocolFeePercent = null,
  // Hardcoded tier configurations (for modular contracts that removed tierConfigs)
  // Format: [{ tierId, playerCount, instanceCount, entryFee, timeouts: { matchTimePerPlayer, timeIncrementPerMove, matchLevel2Delay, matchLevel3Delay, enrollmentWindow, enrollmentLevel2Delay } }]
  tierConfigurations = null,
  // Elite theme flag
  isElite = false,
  // Game-specific content to render between Match Escalation and Community Raffles
  gameSpecificContent = null
}) => {
  // Color scheme based on elite status
  const colors = isElite ? {
    primary: 'text-[#fbbf24]',
    secondary: 'text-[#fff8e7]',
    muted: 'text-[#d4b866]',
    bg: 'from-[#fbbf24]/10 to-[#f59e0b]/10',
    border: 'border-[#d4a012]/30',
    borderDark: 'border-[#d4a012]/20',
    highlight: 'bg-[#fbbf24]/20 border-[#d4a012]/40',
    highlightText: 'text-[#fff8e7]'
  } : {
    primary: 'text-purple-400',
    secondary: 'text-purple-200',
    muted: 'text-purple-300',
    bg: 'from-blue-500/10 to-purple-500/10',
    border: 'border-purple-400/30',
    borderDark: 'border-purple-400/20',
    highlight: 'bg-purple-500/20 border-purple-400/40',
    highlightText: 'text-purple-100'
  };
  // Track if config has been loaded to prevent re-fetching
  const hasLoadedConfig = useRef(false);

  // State for contract-fetched values
  const [contractConfig, setContractConfig] = useState({
    basisPoints: 10000,
    protocolShareBps: 250, // 2.5%
    tierConfigurations: [], // Array of tier configs: { tierId, playerCount, entryFee, matchTimePerPlayer, timeIncrementPerMove, matchLevel2Delay, matchLevel3Delay, enrollmentWindow, enrollmentLevel2Delay }
    raffleThresholds: [], // Array of threshold values
    raffleOwnerSharePercentage: 20,
    raffleWinnerSharePercentage: 80,
    currentRaffleThreshold: null,
    isLoading: true
  });

  // Fetch contract configuration on mount (or use hardcoded values)
  useEffect(() => {
    // Only fetch once
    if (hasLoadedConfig.current) return;

    const fetchContractConfig = async () => {
      // If hardcoded tierConfigurations and raffleThresholds provided, use them directly (skip contract calls)
      if (tierConfigurations && tierConfigurations.length > 0 && raffleThresholds) {
        hasLoadedConfig.current = true;
        setContractConfig(prev => ({
          ...prev,
          tierConfigurations: tierConfigurations.sort((a, b) => a.playerCount - b.playerCount),
          isLoading: false
        }));
        return;
      }

      // If only tierConfigurations provided, use them directly (skip contract calls)
      if (tierConfigurations && tierConfigurations.length > 0) {
        hasLoadedConfig.current = true;
        setContractConfig(prev => ({
          ...prev,
          tierConfigurations: tierConfigurations.sort((a, b) => a.playerCount - b.playerCount),
          isLoading: false
        }));
        return;
      }

      if (!contractInstance) {
        setContractConfig(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Fetch all tier IDs first
        const tierIdsRaw = await contractInstance.getAllTierIds();
        console.log('[UserManual] Raw tier IDs result:', tierIdsRaw);

        // Convert ethers Result object to plain array
        // ethers.js v6 Result objects need manual conversion
        const tierIds = [];
        for (let i = 0; i < tierIdsRaw.length; i++) {
          tierIds.push(tierIdsRaw[i]);
        }
        console.log('[UserManual] Fetched tier IDs:', tierIds, `(${tierIds.length} tiers)`);

        const canGetRaffleConfig = typeof contractInstance.getRaffleConfiguration === 'function';
        const canGetRaffleThresholds = typeof contractInstance.getRaffleThresholds === 'function';

        const [
          basisPoints,
          protocolShareBps,
          raffleInfo,
          raffleConfig,
          raffleThresholdsData
        ] = await Promise.all([
          contractInstance.BASIS_POINTS(),
          contractInstance.PROTOCOL_SHARE_BPS(),
          contractInstance.getRaffleInfo().catch(() => null),
          canGetRaffleConfig ? contractInstance.getRaffleConfiguration().catch(() => null) : null,
          canGetRaffleThresholds ? contractInstance.getRaffleThresholds().catch(() => null) : null
        ]);

        // Fetch configuration for each tier
        const fetchedTierConfigurations = [];
        for (const tierId of tierIds) {
          try {
            // Fetch basic tier info and prize distribution (all contracts have these)
            const [tierInfo, prizeDistribution] = await Promise.all([
              contractInstance.getTierInfo(Number(tierId)),
              contractInstance.getTierPrizeDistribution(Number(tierId))
            ]);

            // Fetch timeout config - different methods per contract
            let timeouts = null;

            // Try ConnectFour method: getTierTimeouts(tierId)
            if (typeof contractInstance.getTierTimeouts === 'function') {
              try {
                timeouts = await contractInstance.getTierTimeouts(Number(tierId));
                console.log(`[UserManual] Loaded timeouts via getTierTimeouts for tier ${tierId}:`, timeouts);
              } catch (err) {
                console.log(`[UserManual] getTierTimeouts failed for tier ${tierId}, trying tierConfigs:`, err.message);
              }
            }

            // Try TicTacChain/Chess method: tierConfigs(tierId).timeouts
            if (!timeouts && typeof contractInstance.tierConfigs === 'function') {
              try {
                const fullConfig = await contractInstance.tierConfigs(Number(tierId));
                timeouts = fullConfig.timeouts;
                console.log(`[UserManual] Loaded timeouts via tierConfigs for tier ${tierId}:`, timeouts);
              } catch (err) {
                console.warn(`[UserManual] tierConfigs failed for tier ${tierId}:`, err);
              }
            }

            if (!timeouts) {
              console.warn(`[UserManual] No timeouts found for tier ${tierId}, using defaults`);
            }

            fetchedTierConfigurations.push({
              tierId: Number(tierId),
              playerCount: Number(tierInfo.playerCount),
              instanceCount: Number(tierInfo.instanceCount),
              entryFee: tierInfo.entryFee,
              matchTimePerPlayer: timeouts ? Number(timeouts.matchTimePerPlayer) : 300,
              timeIncrementPerMove: timeouts ? Number(timeouts.timeIncrementPerMove) : 0,
              matchLevel2Delay: timeouts ? Number(timeouts.matchLevel2Delay) : 60,
              matchLevel3Delay: timeouts ? Number(timeouts.matchLevel3Delay) : 120,
              enrollmentWindow: timeouts ? Number(timeouts.enrollmentWindow) : 60,
              enrollmentLevel2Delay: timeouts ? Number(timeouts.enrollmentLevel2Delay) : 60,
              prizeDistribution: prizeDistribution.percentages || prizeDistribution
            });
          } catch (err) {
            console.warn(`Could not fetch config for tier ${tierId}:`, err);
          }
        }

        // Sort tier configurations by player count for consistent display
        fetchedTierConfigurations.sort((a, b) => a.playerCount - b.playerCount);
        console.log('[UserManual] Final tier configurations:', fetchedTierConfigurations);

        // Parse raffle thresholds
        const thresholds = raffleThresholdsData
          ? raffleThresholdsData.thresholds.map(t => ethers.formatEther(t))
          : [];

        hasLoadedConfig.current = true;
        setContractConfig({
          basisPoints: Number(basisPoints),
          protocolShareBps: Number(protocolShareBps),
          tierConfigurations: fetchedTierConfigurations,
          raffleThresholds: thresholds,
          raffleOwnerSharePercentage: raffleConfig ? Number(raffleConfig.ownerSharePercentage) : 20,
          raffleWinnerSharePercentage: raffleConfig ? Number(raffleConfig.winnerSharePercentage) : 80,
          currentRaffleThreshold: raffleInfo ? ethers.formatEther(raffleInfo.threshold) : null,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching contract config:', error);
        setContractConfig(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchContractConfig();
  }, [contractInstance, tierConfigurations, raffleThresholds]);

  // Calculate protocol fee percentage from basis points
  const protocolFee = protocolFeePercent ?? (contractConfig.protocolShareBps / contractConfig.basisPoints * 100);

  // Raffle prize distribution from contract
  const raffleWinnerShare = contractConfig.raffleWinnerSharePercentage;
  const raffleOwnerShare = contractConfig.raffleOwnerSharePercentage;

  // Format enrollment windows for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  };

  // Use provided raffle thresholds or contract values
  const finalRaffleThresholds = raffleThresholds
    ? raffleThresholds
    : (contractConfig.raffleThresholds.length > 0
        ? contractConfig.raffleThresholds
        : ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0']);

  // Get match time per player from first tier (should be consistent across tiers)
  const matchTimePerPlayer = contractConfig.tierConfigurations.length > 0
    ? contractConfig.tierConfigurations[0].matchTimePerPlayer
    : 300;

  // Handle hash navigation and trigger highlight animation
  useEffect(() => {    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash) {
        const element = document.getElementById(hash);
        if (element && (element.tagName === 'H3' || element.tagName === 'H2')) {
          // Remove any existing highlight-target class
          document.querySelectorAll('.highlight-target').forEach(el => {
            el.classList.remove('highlight-target');
          });

          // Add highlight-target class to trigger animation
          element.classList.add('highlight-target');

          // Remove the class after animation completes
          setTimeout(() => {
            element.classList.remove('highlight-target');
          }, 3500);
        }
      }
    };

    // Trigger on mount if there's already a hash in URL
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-6`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className={colors.primary} size={24} />
        <h3 className={`text-xl font-bold ${colors.secondary}`}>How Does Anti-Griefing Work?</h3>
        {contractConfig.isLoading && (
          <span className="text-sm text-gray-400">(Loading contract config...)</span>
        )}
      </div>

      {/* Introduction */}
      <div className="mb-6 space-y-4">
        <p className="text-gray-300">
          Griefing is when players intentionally disrupt a game and prevent it from progressing or concluding.
        </p>

        <p className="text-gray-300">
          Competitive tournaments can get stuck during:
        </p>

        <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-2">
          <li>
            <span className={`font-semibold ${colors.secondary}`}>Enrollment</span> - some players enroll, but not enough to start the tournament.
          </li>
          <li>
            <span className={`font-semibold ${colors.secondary}`}>Match Play</span> - one or both players in a match stop making moves.
          </li>
        </ol>

        <p className="text-gray-300">
          Legacy systems rely on centralized authorities to resolve these stalls, which requires trust in a person or a company.
        </p>

        {/* Highlighted Key Value Proposition */}
        <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50 rounded-xl p-5 shadow-lg shadow-cyan-500/10 !mt-10">
          <div className="flex items-start gap-3">
            <Shield className="text-cyan-400 flex-shrink-0 mt-1" size={28} />
            <div className="text-gray-100 text-lg font-bold leading-relaxed space-y-2">
              <p>ETour rewards ETH to whoever steps in to resolve these scenarios.</p>
              <p>Rewards are instant, blockchain-enforced, and don't require a centralized authority.</p>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 rounded-xl blur-xl -z-10"></div>
        </div>

        {/* Secondary Highlight - Fair System */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4 !mt-10">
          <ul className="space-y-2 text-gray-200 font-medium mb-3">
            <li className="flex items-start gap-2">
              <span className={`${colors.primary} mt-0.5`}>•</span>
              <span>It's fair and simple, and follows common sense</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`${colors.primary} mt-0.5`}>•</span>
              <span>The closer you are to the prize, the sooner you get a chance to resolve a stall</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`${colors.primary} mt-0.5`}>•</span>
              <span>Payouts are instant and impossible to stop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`${colors.primary} mt-0.5`}>•</span>
              <span><strong>Griefing is impossible when stallers lose and resolvers earn real ETH</strong></span>
            </li>
          </ul>
        </div>
      </div>
       
      <br/>

      <hr className={`${colors.borderDark} mb-8`} />

      <br/>

      {/* Timeout Events Section */}
      <div className="space-y-8">
        {/* Timeout Events Header */}
        <div>
          <h2 className={`text-2xl font-bold ${colors.secondary} mb-4`}>Timeout Events</h2>
          <p className="text-gray-300 mb-2">
            ETour gracefully handles all enrollment and match stalling scenarios.
          </p>
          <p className="text-gray-300 mb-2">
            Each event progresses to the next over time. Early levels reward those with skin in the game, while later levels open up to anyone.
          </p>
          <p className="text-gray-300">
            By the final level, resolving a stall becomes risk-free profit, guaranteeing someone will always step in.
          </p>
        </div>

        <hr className={colors.borderDark} />

        {/* Enrollment Timeout Events */}
        <div>
          <h2 className={`text-xl font-bold ${colors.muted} mb-6`}>Enrollment Timeout Events</h2>

          {/* EL1 */}
          <div className="mb-8">
            <h3 id="el1" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>EL1: Force-Start Tournament After Enrollment Window Expires</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Sometimes players enroll in a tournament but not enough join to fill all spots. Without intervention, these enrolled players would be stuck waiting indefinitely.
              </p>
              <p>
                Once the enrollment window elapses, any enrolled player can start the tournament early with whoever has joined so far.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This gives enrolled players the power to autonomously begin the tournament they paid to enter. No waiting on a full lobby, no relying on an admin.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 id="el1x" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>EL1* : Extend Enrollment Window When Solo Enrolled</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Sometimes a player enrolls in a tournament but remains the only participant when the enrollment window expires.</p>
              <p>
                Rather than being forced to start a solo tournament or lose their entry fee, enrolled players have the option to extend the enrollment period.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This gives solo players the option to wait for competition without penalty or escalation consequences, just a fresh enrollment window to build a proper tournament.
                </p>
              </div>
            </div>
          </div>




          <hr className={`${colors.borderDark} mb-8`} />

          {/* Enrollment Windows Table */}
          <div className="mb-8">
            <h5 className={`text-md font-semibold ${colors.secondary} mb-3`}>Enrollment Windows</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${colors.border}`}>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Format</th>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Entry Fee</th>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Enrollment Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {contractConfig.tierConfigurations.length > 0 ? (
                    contractConfig.tierConfigurations.map((tier) => (
                      <tr key={tier.tierId} className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">
                          {tier.playerCount === 2 ? '1v1 Duels' : `${tier.playerCount}-Player Tournaments`}
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-mono">{tier.entryFee} ETH</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">{formatTime(tier.enrollmentWindow)}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">1v1 Duels</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">0.001 ETH</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">5 minutes</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">4-Player Tournaments</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">0.002 ETH</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">10 minutes</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">8-Player Tournaments</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">0.004 ETH</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">20 minutes</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* EL2 */}
          <div className="mb-8 mt-4">
            <h3 id="el2" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>EL2: Claim Abandoned Prize Pool When Tournament Never Started</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If EL1 is available but no enrolled player starts the tournament, the prize pool sits idle.
              </p>
              <p>
                {contractConfig.tierConfigurations.length > 0
                  ? formatTime(contractConfig.tierConfigurations[0].enrollmentLevel2Delay)
                  : '5 minutes'} after EL1, anyone (even someone who never enrolled) can claim the entire prize pool.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This ensures no ETH ever gets trapped in an abandoned tournament. Someone will always have an incentive to resolve it.
                </p>
              </div>
              <p className="italic">
                The mere existence of EL2 pressures enrolled players to trigger EL1 first. If they don't, they risk losing their entire entry fee to an outsider.
              </p>
            </div>
          </div>
        </div>

        <hr className={colors.borderDark} />

        {/* Match Timeout Events */}
        <div>
          <h2 className={`text-xl font-bold ${colors.muted} mb-6`}>Match Timeout Events</h2>

          {/* ML1 */}
          <div className="mb-8">
            <h3 id="ml1" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>ML1: Claim Victory by Opponent Timeout</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Each player gets {formatTime(matchTimePerPlayer)} per match to make all their moves. However during a match one player may run out of time on their clock.
              </p>
              <p>
                <strong>Their opponent shouldn't have to wait forever for a move that's never coming.</strong>
              </p>
              <p>
                When your opponent's clock hits zero, you can claim victory by forfeit.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This protects active players from being held hostage by opponents who walk away mid-game.
                </p>
              </div>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* ML2 */}
          <div className="mb-8">
            <h3 id="ml2" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>ML2: Eliminate Both Players in a Stalled Match</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML1 is available but the winning player doesn't claim their victory, the match blocks the entire tournament from progressing.
              </p>
              <p>
                {contractConfig.tierConfigurations.length > 0
                  ? formatTime(contractConfig.tierConfigurations[0].matchLevel2Delay)
                  : '2 minutes'} after ML1, any player who has already advanced in the tournament can step in, eliminate both players, and keep things moving.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This empowers players with skin in the game to protect their tournament investment by clearing stalled matches ahead of them.
                </p>
              </div>
              <p className="italic">
                The mere existence of ML2 pressures the winning player to claim ML1 promptly. If they don't, they risk being eliminated alongside their opponent.
              </p>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* ML3 */}
          <div className="mb-8">
            <h3 id="ml3" className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>ML3: Replace Players in Abandoned Match</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML2 is available but no advanced player steps in, the match is considered fully abandoned.
              </p>
              <p>
                {contractConfig.tierConfigurations.length > 0
                  ? formatTime(contractConfig.tierConfigurations[0].matchLevel3Delay)
                  : '2 minutes'} after ML2, anyone (even someone outside the tournament) can replace both players and take their spot in the bracket.
              </p>
              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  At this point, resolving the stall is risk-free profit. This final level guarantees that every match will eventually complete; someone will always claim the free ETH.
                </p>
              </div>
              <p className="italic">
                The mere existence of ML3 pressures advanced players to act at ML2 first. If they don't, an outsider can swoop in and take a spot in the bracket that should have been theirs to protect.
              </p>
            </div>
          </div>
        </div>

        <hr className={colors.borderDark} />

        {/* Game-Specific Content (e.g., Chess Tournament Specifics) */}
        {gameSpecificContent && (
          <>
            {gameSpecificContent}
            <hr className={colors.borderDark} />
          </>
        )}

        {/* How Are Draws Handled Section */}
        <div>
          <h2 id="draws" className={`text-2xl font-bold ${colors.secondary} mb-6 scroll-mt-24`}>How Are Draws Handled?</h2>

          <div className="space-y-3 text-gray-300">
            <p>
              In most cases, <span className={colors.highlightText}>a draw means both players are eliminated</span> from the tournament. There is no winner, and neither player advances to the next round.
            </p>

            <div className={`${colors.accentBg} border ${colors.accentBorder} rounded-lg p-4 mt-4`}>
              <h4 className={`text-base font-semibold ${colors.highlightText} mb-2`}>Exception: Final Round Draws</h4>
              <p>
                If <strong>all matches</strong> in the final round result in draws, the situation is handled differently:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3 ml-2">
                <li>
                  <strong>Finals draw:</strong> If the finals match ends in a draw, the two finalists split the prize pool evenly.
                </li>
                <li>
                  <strong>Semi-finals draws:</strong> If both semi-final matches end in draws, all four semi-finalists split the prize pool evenly.
                </li>
                <li>
                  <strong>Quarter-finals draws:</strong> If all quarter-final matches end in draws, all eight quarter-finalists split the prize pool evenly.
                </li>
              </ul>
              <p className="mt-3">
                This ensures that when the final round concludes with no clear winners, the remaining players share the prize rather than the tournament ending without distribution.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm italic text-gray-400">
                <strong>Note:</strong> Draws are relatively uncommon in most games, but this rule ensures fair outcomes when they do occur at critical moments.
              </p>
            </div>
          </div>
        </div>

        <hr className={colors.borderDark} />

        {/* Community Raffles Section */}
        <div>
          <h2 id="community-raffles" className={`text-2xl font-bold ${colors.secondary} mb-6 scroll-mt-24`}>Community Raffles</h2>

          {/* How Does the Community Raffle Work */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>How Does the Community Raffle Work?</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                ETour keeps {protocolFee.toFixed(1)}% of every entry fee to ensure the protocol remains healthy and operational.
              </p>
              <p>
                Rather than letting this ETH accumulate indefinitely, ETour redistributes it back to the community through periodic raffle events. This is part of ETour's commitment to fairness.
              </p>

              {/* Highlighted Key Message */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4">
                <p className="text-gray-200 font-bold mb-2">
                  ETour rewards a random enrolled player with accumulated ETH.
                </p>
                <p className="text-gray-200 font-bold">
                  The protocol doesn't hoard fees or funnel them to privileged insiders. Instead, accumulated capital flows back to active players who keep the ecosystem alive.
                </p>
              </div>

              <ul className="space-y-2 text-gray-300 ml-4">
                <li className="flex items-start gap-2">
                  <span>• It prevents ETH from sitting idle in the contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>• Active players have a chance to win significant prizes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>• The more tournaments you're enrolled in, the higher your odds</span>
                </li>
              </ul>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* Trigger Raffle When Threshold Reached */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>Trigger the raffle when the threshold is reached</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                When the contract's accumulated balance reaches the current threshold, any currently enrolled player can trigger the raffle. A randomly selected enrolled player wins the prize pool.
              </p>

              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This ensures accumulated ETH flows back to active community members.
                </p>
              </div>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* Weighted Odds by Active Enrollments */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>Weighted odds by active enrollments</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Your odds of winning scale with how many tournaments you're currently enrolled in across all tiers.
              </p>

              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${colors.border}`}>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Active Enrollments</th>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Odds Multiplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/20">
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">1 tournament</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">1x</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">2 tournaments</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">2x</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">3 tournaments</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">3x</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={`${colors.highlight} border rounded-lg p-3`}>
                <p className={colors.highlightText}>
                  This rewards committed players who actively participate across multiple tournaments.
                </p>
              </div>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />
          
          {/* Prize Distribution */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>Prize Distribution</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                The raffle pot is split between the contract itself, the ETour's creator, and the randomly selected raffle winner. This ensures the protocol remains sustainable while rewarding active community members.
              </p>
              <p>
                When the raffle is triggered the pot is immediately distributed as follows:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${colors.border}`}>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Recipient</th>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/20">
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Randomly Selected Raffle Winner</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">90%</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Contract Reserve</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">5%</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Creator Reward</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">5%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="font-semibold text-gray-200">
                For example: a raffle with a pot of 1 ETH is distributed as follows:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${colors.border}`}>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Allocation</th>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/20">
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Randomly Selected Raffle Winner (90%)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">0.9 ETH</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Contract Reserve (5%)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">0.05 ETH</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Creator Reward (5%)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">0.05 ETH</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className={`${colors.borderDark} mb-8`} />

          {/* Raffle Trigger Thresholds */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>Raffle Thresholds</h3>
            <p>
              Early raffles have lower thresholds since the system doesn't expect heavy traffic at launch. As user adoption grows, subsequent raffles scale up with higher thresholds and bigger prizes.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${colors.border}`}>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Raffle Number</th>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {finalRaffleThresholds.length > 0 ? (
                    <>
                      {finalRaffleThresholds.slice(0, -1).map((threshold, index) => (
                        <tr key={index} className="hover:bg-blue-500/5 transition-colors">
                          <td className="py-3 px-4 text-gray-300">{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Raffle</td>
                          <td className="py-3 px-4 text-gray-300 font-mono">{threshold} ETH</td>
                        </tr>
                      ))}
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">{finalRaffleThresholds.length}{finalRaffleThresholds.length === 1 ? 'st' : finalRaffleThresholds.length === 2 ? 'nd' : finalRaffleThresholds.length === 3 ? 'rd' : 'th'}+ Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">{finalRaffleThresholds[finalRaffleThresholds.length - 1]} ETH</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">1st Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">0.5 ETH</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">2nd Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">1.0 ETH</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">3rd Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">1.5 ETH</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">4th Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">2.0 ETH</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">5th Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">2.5 ETH</td>
                      </tr>
                      <tr className="hover:bg-blue-500/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300">6th+ Raffle</td>
                        <td className="py-3 px-4 text-gray-300 font-mono">3.0 ETH</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
