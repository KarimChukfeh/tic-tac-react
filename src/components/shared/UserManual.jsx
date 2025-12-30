/**
 * UserManual - Displays anti-griefing system documentation
 *
 * Shows comprehensive documentation about how the ETour anti-griefing
 * system works, including escalation levels, time settings, and rules.
 */

import { useEffect } from 'react';
import { BookOpen, Shield } from 'lucide-react';

const UserManual = () => {
  // Handle hash navigation and trigger highlight animation
  useEffect(() => {
    const handleHashChange = () => {
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
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="text-blue-400" size={24} />
        <h3 className="text-xl font-bold text-blue-300">How Does Anti-Griefing Work?</h3>
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
            <span className="font-semibold text-blue-300">Enrollment</span> - some players enroll, but not enough start the tournament.
          </li>
          <li>
            <span className="font-semibold text-blue-300">Match Play</span> - one or both players in a match stop making moves.
          </li>
        </ol>

        <p className="text-gray-300">
          Legacy systems rely on centralized authorities to resolve these stalls, which requires trust in a person or a company.
        </p>
        
        <br/>

        {/* Highlighted Key Value Proposition */}
        <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50 rounded-xl p-5 shadow-lg shadow-cyan-500/10">
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
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4">
          <ul className="space-y-2 text-gray-200 font-medium mb-3">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>It's fair and simple, and follows common sense</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>The closer you are to the prize, the sooner you get a chance to resolve a stall</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>Payouts are instant and impossible to stop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">•</span>
              <span><strong>Griefing is impossible when stallers lose and resolvers earn real ETH</strong></span>
            </li>
          </ul>
        </div>
      </div>
       
      <br/>

      <hr className="border-purple-500/20 mb-8" />

      <br/>

      {/* Timeout Events Section */}
      <div className="space-y-8">
        {/* Timeout Events Header */}
        <div>
          <h2 className="text-2xl font-bold text-blue-300 mb-4">Timeout Events</h2>
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

        <hr className="border-blue-500/20" />

        {/* Enrollment Timeout Events */}
        <div>
          <h2 className="text-xl font-bold text-purple-300 mb-6">Enrollment Timeout Events</h2>

          {/* EL1 */}
          <div className="mb-8">
            <h3 id="el1" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">EL1: Force-Start Tournament When Not Enough Enrolled Players</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Sometimes players enroll in a tournament but not enough join to fill all spots. Without intervention, these enrolled players would be stuck waiting indefinitely.
              </p>
              <p>
                Once the enrollment window elapses, any enrolled player can start the tournament early with whoever has joined so far.
              </p>
              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This gives enrolled players the power to autonomously begin the tournament they paid to enter. No waiting on a full lobby, no relying on an admin.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* Enrollment Windows Table */}
          <div className="mb-8">
            <h5 className="text-md font-semibold text-blue-300 mb-3">Enrollment Windows</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-500/30">
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Format</th>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Enrollment Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  <tr className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">1v1 Duels</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">5 minutes</td>
                  </tr>
                  <tr className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">4-Player Tournaments</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">10 minutes</td>
                  </tr>
                  <tr className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">8-Player Tournaments</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">20 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* EL2 */}
          <div className="mb-8 mt-4">
            <h3 id="el2" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">EL2: Claim Abandoned Prize Pool When Tournament Never Started</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If EL1 is available but no enrolled player starts the tournament, the prize pool sits idle.
              </p>
              <p>
                5 minutes after EL1, anyone (even someone who never enrolled) can claim the entire prize pool.
              </p>
              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This ensures no ETH ever gets trapped in an abandoned tournament. Someone will always have an incentive to resolve it.
                </p>
              </div>
              <p className="italic">
                The mere existence of EL2 pressures enrolled players to trigger EL1 first. If they don't, they risk losing their entire entry fee to an outsider.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-blue-500/20" />

        {/* Match Timeout Events */}
        <div>
          <h2 className="text-xl font-bold text-purple-300 mb-6">Match Timeout Events</h2>

          {/* ML1 */}
          <div className="mb-8">
            <h3 id="ml1" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML1: Claim Victory by Opponent Timeout</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                During a match, one player may run out of time on their clock. Their opponent shouldn't have to wait forever for a move that's never coming.
              </p>
              <p>
                When your opponent's clock hits zero, you can claim victory by forfeit.
              </p>
              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This protects active players from being held hostage by opponents who walk away mid-game.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* ML2 */}
          <div className="mb-8">
            <h3 id="ml2" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML2: Eliminate Both Players in a Stalled Match</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML1 is available but the winning player doesn't claim their victory, the match blocks the entire tournament from progressing.
              </p>
              <p>
                2 minutes after ML1, any player who has already advanced in the tournament can step in, eliminate both players, and keep things moving.
              </p>
              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This empowers players with skin in the game to protect their tournament investment by clearing stalled matches ahead of them.
                </p>
              </div>
              <p className="italic">
                The mere existence of ML2 pressures the winning player to claim ML1 promptly. If they don't, they risk being eliminated alongside their opponent.
              </p>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* ML3 */}
          <div className="mb-8">
            <h3 id="ml3" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML3: Replace Players in Abandoned Match</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML2 is available but no advanced player steps in, the match is considered fully abandoned.
              </p>
              <p>
                2 minutes after ML2, anyone (even someone outside the tournament) can replace both players and take their spot in the bracket.
              </p>
              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  At this point, resolving the stall is risk-free profit. This final level guarantees that every match will eventually complete; someone will always claim the free ETH.
                </p>
              </div>
              <p className="italic">
                The mere existence of ML3 pressures advanced players to act at ML2 first. If they don't, an outsider can swoop in and take a spot in the bracket that should have been theirs to protect.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-blue-500/20" />

        {/* Community Raffles Section */}
        <div>
          <h2 id="community-raffles" className="text-2xl font-bold text-blue-300 mb-6 scroll-mt-24">Community Raffles</h2>

          {/* How Does the Community Raffle Work */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">How Does the Community Raffle Work?</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                ETour keeps 2.5% of every entry fee to ensure the protocol remains healthy and operational.
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

          <hr className="border-purple-500/20 mb-8" />

          {/* Trigger Raffle When Threshold Reached */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">Trigger the raffle when the threshold is reached</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                When the contract's accumulated balance reaches the current threshold, any currently enrolled player can trigger the raffle. A randomly selected enrolled player wins the prize pool.
              </p>

              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This ensures accumulated ETH flows back to active community members.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* Weighted Odds by Active Enrollments */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">Weighted odds by active enrollments</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                Your odds of winning scale with how many tournaments you're currently enrolled in across all tiers.
              </p>

              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-500/30">
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

              <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-3">
                <p className="text-purple-200">
                  This rewards committed players who actively participate across multiple tournaments.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />
          
          {/* Prize Distribution */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">Prize Distribution</h3>
            <div className="space-y-3 text-gray-300">
              <p>
                The game always keeps 10% of the threshold to ensure continuous operation remains covered. The remaining accumulated pool is then split between the winner and owner.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-500/30">
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Recipient</th>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/20">
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Random Winner</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">80%</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Owner</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">20%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="font-semibold text-gray-200">
                Example: A raffle with a 1 ETH threshold triggers after accumulating 1.5 ETH.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-500/30">
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Allocation</th>
                      <th className="text-left py-3 px-4 text-blue-200 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/20">
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Contract Reserve (10% of threshold)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">0.1 ETH</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300">Raffle Pool</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">1.4 ETH</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300 pl-8">→ Random Winner (80%)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">1.12 ETH</td>
                    </tr>
                    <tr className="hover:bg-blue-500/5 transition-colors">
                      <td className="py-3 px-4 text-gray-300 pl-8">→ Owner (20%)</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">0.28 ETH</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-purple-500/20 mb-8" />

          {/* Raffle Trigger Thresholds */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">Raffle Thresholds</h3>
            <p>
              Early raffles have lower thresholds since the system doesn't expect heavy traffic at launch. As user adoption grows, subsequent raffles scale up with higher thresholds and bigger prizes.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-500/30">
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Raffle Number</th>
                    <th className="text-left py-3 px-4 text-blue-200 font-semibold">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
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
