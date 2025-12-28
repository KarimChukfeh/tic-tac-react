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
        <h3 className="text-xl font-bold text-blue-300">How Anti-Stalling/Griefing Works</h3>
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
          Legacy systems rely on centralized authorities to resolve these stalls, which requires trust in a person a company.
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
      
      {/* Escalation Tables */}       
      <div className="space-y-8">
        {/* Tournament Escalations */}
        <div>
          <h4 className="text-lg font-bold text-purple-300 mb-4">Enrollment Scenarios</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Level</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Reason</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Trigger</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Actor</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/20">
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td className="py-3 px-4 text-purple-300 font-mono">L1</td>
                  <td className="py-3 px-4 text-gray-300">Not Enough Enrolled Players</td>
                  <td className="py-3 px-4 text-gray-300">After enrollment window elapses</td>
                  <td className="py-3 px-4 text-gray-300">Any enrolled player</td>
                  <td className="py-3 px-4 text-gray-300">Start tournament early</td>
                </tr>
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td className="py-3 px-4 text-purple-300 font-mono">L2</td>
                  <td className="py-3 px-4 text-gray-300">Tournament Never Started</td>
                  <td className="py-3 px-4 text-gray-300">5 minutes after L1</td>
                  <td className="py-3 px-4 text-gray-300">Anyone</td>
                  <td className="py-3 px-4 text-gray-300">Claim entire prize pool</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Match Escalations */}
        <div>
          <h4 className="text-lg font-bold text-purple-300 mb-4">Match Scenarios</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Level</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Reason</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Trigger</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Actor</th>
                  <th className="text-left py-3 px-4 text-purple-200 font-semibold">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/20">
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td className="py-3 px-4 text-purple-300 font-mono">L1</td>
                  <td className="py-3 px-4 text-gray-300">Opponent Timeout</td>
                  <td className="py-3 px-4 text-gray-300">When opponent runs out of time</td>
                  <td className="py-3 px-4 text-gray-300">Current player</td>
                  <td className="py-3 px-4 text-gray-300">Claim victory by opponent forfeit</td>
                </tr>
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td className="py-3 px-4 text-purple-300 font-mono">L2</td>
                  <td className="py-3 px-4 text-gray-300">Stalled Match</td>
                  <td className="py-3 px-4 text-gray-300">2 minuntes after L1</td>
                  <td className="py-3 px-4 text-gray-300">Any advanced player in the ournament</td>
                  <td className="py-3 px-4 text-gray-300">Eliminate both players</td>
                </tr>
                <tr className="hover:bg-purple-500/5 transition-colors">
                  <td className="py-3 px-4 text-purple-300 font-mono">L3</td>
                  <td className="py-3 px-4 text-gray-300">Abandoned Match</td>
                  <td className="py-3 px-4 text-gray-300">2 minuntes after L2</td>
                  <td className="py-3 px-4 text-gray-300">Anyone but advanced players</td>
                  <td className="py-3 px-4 text-gray-300">Replace both players and advance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Time Settings */}
        <div>
          {/* Enrollment Windows */}
          <div className="mb-6">
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
        </div>
      </div>
    </div>
  );
};

export default UserManual;
