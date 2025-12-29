/**
 * UserManual - Displays anti-griefing system documentation
 *
 * Shows comprehensive documentation about how the ETour anti-griefing
 * system works, including escalation levels, time settings, and rules.
 */

import { BookOpen, Shield } from 'lucide-react';

const UserManual = () => {
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
          Competitive tournaments stall during:
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
            <p className="text-gray-100 text-lg font-bold leading-relaxed">
              ETour rewards ETH to whoever steps in to resolve these scenarios. Rewards are blockchain-enforced and don't require a centralized authority.
            </p>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 rounded-xl blur-xl -z-10"></div>
        </div>
        
        <br/>


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
          </ul>
        </div>
      </div>
       
      <br/>

      <p className="text-gray-300 font-semibold text-xl">
        Griefing becomes impossible when stallers lose (real ETH) and resolvers earn (real ETH).
      </p>


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
          <h3 className="text-xl font-bold text-purple-300 mb-6">Enrollment Timeout Events</h3>

          {/* EL1 */}
          <div className="mb-8">
            <h4 id="el1" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">EL1: Force-Start Tournament When Not Enough Enrolled Players</h4>
            <div className="space-y-3 text-gray-300">
              <p>
                Sometimes players enroll in a tournament but not enough join to fill all spots. Without intervention, these enrolled players would be stuck waiting indefinitely.
              </p>
              <p>
                Once the enrollment window elapses, any enrolled player can start the tournament early with whoever has joined so far.
              </p>
              <p>
                This gives enrolled players the power to autonomously begin the tournament they paid to enter—no waiting on a full lobby, no relying on an admin.
              </p>
            </div>
          </div>

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

          {/* EL2 */}
          <div className="mb-8 mt-4">
            <h4 id="el2" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">EL2: Claim Abandoned Prize Pool When Tournament Never Started</h4>
            <div className="space-y-3 text-gray-300">
              <p>
                If EL1 is available but no enrolled player starts the tournament, the prize pool sits idle.
              </p>
              <p>
                5 minutes after EL1, anyone—even someone who never enrolled—can claim the entire prize pool.
              </p>
              <p>
                This ensures no ETH ever gets trapped in an abandoned tournament. Someone will always have an incentive to resolve it.
              </p>
              <p className="italic">
                The mere existence of EL2 pressures enrolled players to trigger EL1 first—if they don't, they risk losing their entire entry fee to an outsider.
              </p>
            </div>
          </div>
        </div>

        <hr className="border-blue-500/20" />

        {/* Match Timeout Events */}
        <div>
          <h3 className="text-xl font-bold text-purple-300 mb-6">Match Timeout Events</h3>

          {/* ML1 */}
          <div className="mb-8">
            <h4 id="ml1" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML1: Claim Victory by Opponent Timeout</h4>
            <div className="space-y-3 text-gray-300">
              <p>
                During a match, one player may run out of time on their clock. Their opponent shouldn't have to wait forever for a move that's never coming.
              </p>
              <p>
                When your opponent's clock hits zero, you can claim victory by forfeit.
              </p>
              <p>
                This protects active players from being held hostage by opponents who walk away mid-game.
              </p>
            </div>
          </div>

          {/* ML2 */}
          <div className="mb-8">
            <h4 id="ml2" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML2: Eliminate Both Players in a Stalled Match</h4>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML1 is available but the winning player doesn't claim their victory, the match blocks the entire tournament from progressing.
              </p>
              <p>
                2 minutes after ML1, any player who has already advanced in the tournament can step in, eliminate both players, and keep things moving.
              </p>
              <p>
                This empowers players with skin in the game to protect their tournament investment by clearing stalled matches ahead of them.
              </p>
              <p className="italic">
                The mere existence of ML2 pressures the winning player to claim ML1 promptly—if they don't, they risk being eliminated alongside their opponent.
              </p>
            </div>
          </div>

          {/* ML3 */}
          <div className="mb-8">
            <h4 id="ml3" className="text-lg font-semibold text-purple-200 mb-3 scroll-mt-24">ML3: Replace Players in Abandoned Match</h4>
            <div className="space-y-3 text-gray-300">
              <p>
                If ML2 is available but no advanced player steps in, the match is considered fully abandoned.
              </p>
              <p>
                2 minutes after ML2, anyone—even someone outside the tournament—can replace both players and take their spot in the bracket.
              </p>
              <p>
                At this point, resolving the stall is risk-free profit. This final level guarantees that every match will eventually complete—someone will always claim the free ETH.
              </p>
              <p className="italic">
                The mere existence of ML3 pressures advanced players to act at ML2 first—if they don't, an outsider can swoop in and take a spot in the bracket that should have been theirs to protect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
