import { Grid } from 'lucide-react';

function buildMatchTree(rounds, roundIdx, matchIdx) {
  const round = rounds[roundIdx];
  const match = round?.matches?.[matchIdx];
  if (!round || !match) return null;

  const node = {
    round,
    roundIdx,
    match,
    matchIdx,
    key: `${round.roundIndex ?? roundIdx}-${match.matchNumber ?? matchIdx}`,
    children: [],
  };

  if (roundIdx > 0) {
    const leftChild = buildMatchTree(rounds, roundIdx - 1, matchIdx * 2);
    const rightChild = buildMatchTree(rounds, roundIdx - 1, (matchIdx * 2) + 1);
    node.children = [leftChild, rightChild].filter(Boolean);
  }

  return node;
}

function TreeConnector({ branching }) {
  return (
    <div
      aria-hidden="true"
      className="relative my-3 h-8 w-full min-w-[7rem] sm:my-4 sm:h-10"
    >
      {branching ? (
        <>
          <div className="absolute left-1/4 top-0 h-4 w-px -translate-x-1/2 bg-gradient-to-b from-cyan-300/45 to-fuchsia-300/55 sm:h-5" />
          <div className="absolute right-1/4 top-0 h-4 w-px translate-x-1/2 bg-gradient-to-b from-cyan-300/45 to-fuchsia-300/55 sm:h-5" />
          <div className="absolute left-1/4 right-1/4 top-4 h-px bg-gradient-to-r from-cyan-300/40 via-fuchsia-300/55 to-cyan-300/40 sm:top-5" />
          <div className="absolute left-1/2 top-4 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-fuchsia-300/55 to-cyan-300/40 sm:top-5" />
        </>
      ) : (
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-fuchsia-300/55 to-cyan-300/40" />
      )}
    </div>
  );
}

function RoundLevelLabel({ label, roundLabelClassName }) {
  if (!label) return null;

  return (
    <div className="mb-2 text-center sm:mb-3">
      <div className={`${roundLabelClassName} inline-flex rounded-full border border-purple-300/20 bg-purple-500/8 px-3 py-1`}>
        {label}
      </div>
    </div>
  );
}

function BracketTreeNode({ node, renderMatch, roundLabelClassName, isRoot = false }) {
  const hasChildren = node.children.length > 0;
  const childRoundLabel = hasChildren ? node.children[0]?.round?.label : null;

  return (
    <div className="inline-flex min-w-fit flex-col items-center">
      {hasChildren && (
        <div className="flex min-w-fit flex-col items-center">
          <RoundLevelLabel
            label={childRoundLabel}
            roundLabelClassName={roundLabelClassName}
          />
          <div className="flex min-w-fit items-start justify-center gap-3 sm:gap-4 lg:gap-6">
          {node.children.map((child) => (
            <BracketTreeNode
              key={child.key}
              node={child}
              renderMatch={renderMatch}
              roundLabelClassName={roundLabelClassName}
            />
          ))}
          </div>
        </div>
      )}

      {hasChildren && <TreeConnector branching={node.children.length > 1} />}

      <div className="w-[15rem] max-w-full sm:w-[16.75rem] lg:w-[21rem]">
        {isRoot && (
          <RoundLevelLabel
            label={node.round?.label}
            roundLabelClassName={roundLabelClassName}
          />
        )}
        {renderMatch({
          match: node.match,
          round: node.round,
          roundIdx: node.roundIdx,
          matchIdx: node.matchIdx,
        })}
      </div>
    </div>
  );
}

export default function TraditionalTournamentBracket({
  bracketRef,
  title,
  rounds,
  hasValidRounds,
  panelClassName = 'bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30',
  titleClassName = 'text-2xl font-bold text-purple-300',
  roundLabelClassName = 'text-sm font-semibold uppercase tracking-[0.22em] text-purple-300/80',
  emptyStateClassName = 'text-purple-300 text-lg',
  emptyMessage,
  renderMatch,
  renderEmpty,
}) {
  const rootNodes = hasValidRounds
    ? (rounds.at(-1)?.matches || [])
        .map((_, matchIdx) => buildMatchTree(rounds, rounds.length - 1, matchIdx))
        .filter(Boolean)
    : [];

  return (
    <div ref={bracketRef} className={panelClassName}>
      <h3 className={`${titleClassName} mb-5 flex items-center gap-2`}>
        <Grid size={24} />
        {title}
      </h3>

      {hasValidRounds ? (
          <div className="-mx-3 overflow-x-auto px-3 pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:rgba(103,232,249,0.45)_rgba(15,23,42,0.25)]">
            <div className="flex min-w-fit justify-center">
              <div className="inline-flex min-w-fit flex-col items-center">
                {rootNodes.map((node) => (
                  <BracketTreeNode
                    key={node.key}
                    node={node}
                    renderMatch={renderMatch}
                    roundLabelClassName={roundLabelClassName}
                    isRoot={true}
                  />
                ))}
              </div>
            </div>
          </div>
      ) : (
        <div className="space-y-6">
          <div className="text-left py-4">
            <div className={emptyStateClassName}>
              {emptyMessage}
            </div>
          </div>
          {renderEmpty?.()}
        </div>
      )}
    </div>
  );
}
