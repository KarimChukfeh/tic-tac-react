/**
 * UserManualV2 - V2-specific ETour user manual.
 *
 * Keeps the existing visual language while using the new V2 copy and
 * structure for onboarding, prize distribution, anti-griefing, draws,
 * and tournament raffle behavior.
 */

import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Shield } from 'lucide-react';

const ETOR_STEPS = [
  {
    title: 'Choose your configuration',
    body: 'Pick a player count (2 to 32 players) and set an entry fee in ETH.'
  },
  {
    title: 'Create your instance',
    body: 'Your tournament is deployed on-chain and you are automatically enrolled as the first participant.'
  },
  {
    title: 'Share your invite link',
    body: 'Every tournament comes with a unique link. Share it with friends, your community, or anyone you want to compete against.'
  },
  {
    title: 'Players enroll',
    body: 'Anyone with your link can join by paying the entry fee you set. No accounts, no approvals, no intermediaries.'
  },
  {
    title: 'Tournament starts automatically',
    body: 'The moment the last spot is filled, the tournament begins. No admin needed.'
  }
];

const PRIZE_POOL_SHARES = [
  { recipient: 'Tournament Winner', share: '90%' },
  { recipient: 'Creator Reward', share: '7.5%' },
  { recipient: 'Contract Reserve', share: '2.5%' }
];

const PRIZE_POOL_EXAMPLE = [
  { allocation: 'Tournament Winner (90%)', amount: '0.036 ETH' },
  { allocation: 'Creator Reward (7.5%)', amount: '0.003 ETH' },
  { allocation: 'Contract Reserve (2.5%)', amount: '0.001 ETH' }
];

const ENROLLMENT_TIMEOUT_EVENTS = [
  {
    id: 'el1',
    title: 'EL1: Force-Start Tournament After Enrollment Window Expires',
    paragraphs: [
      'Sometimes players enroll in a tournament but not enough join to fill all spots. Without intervention, these enrolled players would be stuck waiting indefinitely.',
      'Once the enrollment window elapses, any enrolled player can start the tournament early with whoever has joined so far.'
    ],
    highlight: 'This gives enrolled players the power to autonomously begin the tournament they paid to enter. No waiting on a full lobby, no relying on an admin.'
  },
  {
    id: 'el1x',
    title: 'EL1*: Extend Enrollment Window When Solo Enrolled',
    paragraphs: [
      'Sometimes a player enrolls in a tournament but remains the only participant when the enrollment window expires.',
      'Rather than being forced to start a solo tournament or lose their entry fee, enrolled players have the option to extend the enrollment period.'
    ],
    highlight: 'This gives solo players the option to wait for competition without penalty or escalation consequences, just a fresh enrollment window to build a proper tournament.'
  },
  {
    id: 'el2',
    title: 'EL2: Claim Abandoned Prize Pool When Tournament Never Started',
    paragraphs: [
      'If EL1 is available but no enrolled player starts the tournament, the prize pool sits idle.',
      '5 minutes after EL1, anyone (even someone who never enrolled) can claim the entire prize pool.'
    ],
    highlight: 'This ensures no ETH ever gets trapped in an abandoned tournament. Someone will always have an incentive to resolve it.',
    note: "The mere existence of EL2 pressures enrolled players to trigger EL1 first. If they don't, they risk losing their entire entry fee to an outsider."
  }
];

const MATCH_TIMEOUT_EVENTS = [
  {
    id: 'ml1',
    title: 'ML1: Claim Victory by Opponent Timeout',
    paragraphs: [
      'Each player gets 5 minutes per match to make all their moves. However during a match one player may run out of time on their clock.',
      "Their opponent shouldn't have to wait forever for a move that's never coming.",
      'When your opponent\'s clock hits zero, you can claim victory by forfeit.'
    ],
    highlight: 'This protects active players from being held hostage by opponents who walk away mid-game.'
  },
  {
    id: 'ml2',
    title: 'ML2: Eliminate Both Players in a Stalled Match',
    paragraphs: [
      "If ML1 is available but the winning player doesn't claim their victory, the match blocks the entire tournament from progressing.",
      '2 minutes after ML1, any player who has already advanced in the tournament can step in, eliminate both players, and keep things moving.'
    ],
    highlight: 'This empowers players with skin in the game to protect their tournament investment by clearing stalled matches ahead of them.',
    note: "The mere existence of ML2 pressures the winning player to claim ML1 promptly. If they don't, they risk being eliminated alongside their opponent."
  },
  {
    id: 'ml3',
    title: 'ML3: Replace Players in Abandoned Match',
    paragraphs: [
      'If ML2 is available but no advanced player steps in, the match is considered fully abandoned.',
      '2 minutes after ML2, anyone (even someone outside the tournament) can replace both players and take their spot in the bracket.'
    ],
    highlight: 'At this point, resolving the stall is risk-free profit. This final level guarantees that every match will eventually complete; someone will always claim the free ETH.',
    note: "The mere existence of ML3 pressures advanced players to act at ML2 first. If they don't, an outsider can swoop in and take a spot in the bracket that should have been theirs to protect."
  }
];

const TOURNAMENT_RAFFLE_BULLETS = [
  'No ETH accumulates indefinitely in the contract',
  'Every participant has a chance to win back more than they paid in',
  'The raffle resolves automatically when the tournament concludes'
];

const MANUAL_SECTION_IDS = [
  'user-manual',
  'draws',
  'community-raffles',
  ...ENROLLMENT_TIMEOUT_EVENTS.map((event) => event.id),
  ...MATCH_TIMEOUT_EVENTS.map((event) => event.id)
];

const UserManualV2 = ({
  protocolFeePercent = 2.5,
  isElite = false,
  gameSpecificContent = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const colors = isElite ? {
    primary: 'text-[#fbbf24]',
    secondary: 'text-[#fff8e7]',
    muted: 'text-[#d4b866]',
    bg: 'from-[#fbbf24]/10 to-[#f59e0b]/10',
    border: 'border-[#d4a012]/30',
    borderDark: 'border-[#d4a012]/20',
    highlight: 'bg-[#fbbf24]/20 border-[#d4a012]/40',
    highlightText: 'text-[#fff8e7]',
    accentBg: 'bg-[#fbbf24]/10',
    accentBorder: 'border-[#d4a012]/30'
  } : {
    primary: 'text-purple-400',
    secondary: 'text-purple-200',
    muted: 'text-purple-300',
    bg: 'from-blue-500/10 to-purple-500/10',
    border: 'border-purple-400/30',
    borderDark: 'border-purple-400/20',
    highlight: 'bg-purple-500/20 border-purple-400/40',
    highlightText: 'text-purple-100',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-400/30'
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      if (MANUAL_SECTION_IDS.includes(hash)) {
        setIsExpanded(true);
      }

      window.requestAnimationFrame(() => {
        const element = document.getElementById(hash);
        if (element && (element.tagName === 'H3' || element.tagName === 'H2')) {
          document.querySelectorAll('.highlight-target').forEach((target) => {
            target.classList.remove('highlight-target');
          });

          element.classList.add('highlight-target');
          setTimeout(() => {
            element.classList.remove('highlight-target');
          }, 3500);
        }
      });
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const handleOpenManual = () => {
      setIsExpanded(true);
    };

    window.addEventListener('open-user-manual', handleOpenManual);
    return () => {
      window.removeEventListener('open-user-manual', handleOpenManual);
    };
  }, []);

  const reserveFee = Number(protocolFeePercent).toFixed(1);

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-6`}>
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <BookOpen className={colors.primary} size={24} />
          <h3 className={`text-xl font-bold ${colors.secondary}`}>User Manual</h3>
        </span>
        <span className={colors.primary}>
          {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-8 mt-6">
        <div className="space-y-4">
          <h2 className={`text-2xl font-bold ${colors.secondary}`}>How Does ETour Work?</h2>
          <p className="text-gray-300">
            Starting a tournament on ETour is simple:
          </p>

          <ol className="list-decimal list-inside space-y-3 text-gray-300 ml-2">
            {ETOR_STEPS.map((step) => (
              <li key={step.title}>
                <span className={`font-semibold ${colors.secondary}`}>{step.title}</span>
                <span>{' '} - {step.body}</span>
              </li>
            ))}
          </ol>

          <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50 rounded-xl p-5 shadow-lg shadow-cyan-500/10 !mt-8">
            <div className="flex items-start gap-3">
              <Shield className="text-cyan-400 flex-shrink-0 mt-1" size={28} />
              <div className="text-gray-100 text-lg font-bold leading-relaxed space-y-2">
                <p>Every tournament lives on-chain from creation to payout.</p>
                <p>No accounts, no approvals, no admin intervention.</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 rounded-xl blur-xl -z-10"></div>
          </div>
        </div>

        <hr className={colors.borderDark} />

        <div className="space-y-4">
          <h2 className={`text-2xl font-bold ${colors.secondary}`}>Prize Pool</h2>
          <p className="text-gray-300">
            All entry fees pool together. At the end of the tournament, the pool is distributed as follows:
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
                {PRIZE_POOL_SHARES.map((row) => (
                  <tr key={row.recipient} className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">{row.recipient}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">{row.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-semibold text-gray-200">
            For example, in a 4-player tournament with a 0.01 ETH entry fee (0.04 ETH total pool):
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
                {PRIZE_POOL_EXAMPLE.map((row) => (
                  <tr key={row.allocation} className="hover:bg-blue-500/5 transition-colors">
                    <td className="py-3 px-4 text-gray-300">{row.allocation}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <hr className={colors.borderDark} />

        <div className="space-y-4">
          <h2 className={`text-2xl font-bold ${colors.secondary}`}>How Does Anti-Griefing Work?</h2>
          <p className="text-gray-300">
            Griefing is when players intentionally disrupt a game and prevent it from progressing or concluding.
          </p>
          <p className="text-gray-300">
            Competitive tournaments can get stuck during:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-2">
            <li>
              <span className={`font-semibold ${colors.secondary}`}>Enrollment</span>
              <span>{' '} - some players enroll, but not enough to start the tournament.</span>
            </li>
            <li>
              <span className={`font-semibold ${colors.secondary}`}>Match Play</span>
              <span>{' '} - one or both players in a match stop making moves.</span>
            </li>
          </ol>

          <p className="text-gray-300">
            Legacy systems rely on centralized authorities to resolve these stalls, which requires trust in a person or a company.
          </p>

          <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50 rounded-xl p-5 shadow-lg shadow-cyan-500/10 !mt-8">
            <div className="flex items-start gap-3">
              <Shield className="text-cyan-400 flex-shrink-0 mt-1" size={28} />
              <div className="text-gray-100 text-lg font-bold leading-relaxed space-y-2">
                <p>ETour rewards ETH to whoever steps in to resolve these scenarios.</p>
                <p>Rewards are instant, blockchain-enforced, and don't require a centralized authority.</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-blue-400/5 rounded-xl blur-xl -z-10"></div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4 !mt-8">
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

        <hr className={colors.borderDark} />

        <div className="space-y-8">
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

          <div>
            <h2 className={`text-xl font-bold ${colors.muted} mb-6`}>Enrollment Timeout Events</h2>
            <div className="space-y-8">
              {ENROLLMENT_TIMEOUT_EVENTS.map((event) => (
                <div key={event.id}>
                  <h3 id={event.id} className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>
                    {event.title}
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    {event.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className={`${colors.highlight} border rounded-lg p-3`}>
                      <p className={colors.highlightText}>{event.highlight}</p>
                    </div>
                    {event.note ? <p className="italic">{event.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className={colors.borderDark} />

          <div>
            <h2 className={`text-xl font-bold ${colors.muted} mb-6`}>Match Timeout Events</h2>
            <div className="space-y-8">
              {MATCH_TIMEOUT_EVENTS.map((event) => (
                <div key={event.id}>
                  <h3 id={event.id} className={`text-lg font-semibold ${colors.highlightText} mb-3 scroll-mt-24`}>
                    {event.title}
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    {event.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className={`${colors.highlight} border rounded-lg p-3`}>
                      <p className={colors.highlightText}>{event.highlight}</p>
                    </div>
                    {event.note ? <p className="italic">{event.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {gameSpecificContent && (
          <>
            <hr className={colors.borderDark} />
            {gameSpecificContent}
          </>
        )}

        <hr className={colors.borderDark} />

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

        <div id="community-raffles">
          <h2 className={`text-2xl font-bold ${colors.secondary} mb-6 scroll-mt-24`}>How Does the Tournament Raffle Work?</h2>

          <div className="space-y-3 text-gray-300">
            <p>
              ETour keeps {reserveFee}% of every entry fee as a Contract Reserve. This reserve covers the operational costs the protocol incurs on-chain.
            </p>
            <p>
              Whatever remains unused from the accumulated reserve after those costs are covered doesn't sit idle. When a tournament concludes, the leftover reserve balance from that tournament is raffled to a randomly selected participant from that tournament.
            </p>
            <p>
              Fees that aren't needed for operations flow directly back to the players who generated them.
            </p>

            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg p-4">
              <p className="text-gray-200 font-bold mb-2">
                Reserve ETH is not meant to pile up passively.
              </p>
              <p className="text-gray-200 font-bold">
                What isn't needed for operations gets recycled back into the same tournament's player base.
              </p>
            </div>

            <ul className="space-y-2 text-gray-300 ml-4">
              {TOURNAMENT_RAFFLE_BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span>• {bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default UserManualV2;
