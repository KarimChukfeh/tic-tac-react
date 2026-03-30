import { ethers } from 'ethers';

export const DEFAULT_MIN_ENTRY_FEE = '0.0005';

const DEFAULT_MAX_ENTRY_FEE = '1';
const USD_PER_ETH_ESTIMATE = 2000;
const PRIZE_POOL_SHARE = 0.9;
const SLIDER_SEGMENTS = [
  { endEth: '0.01', stepMultiplier: 1n },
  { endEth: '0.05', stepMultiplier: 5n },
  { endEth: '0.2', stepMultiplier: 20n },
  { endEth: '0.5', stepMultiplier: 50n },
  { endEth: DEFAULT_MAX_ENTRY_FEE, stepMultiplier: 100n },
];
const DEFAULT_MAX_ENTRY_FEE_WEI = ethers.parseEther(DEFAULT_MAX_ENTRY_FEE);

function formatEthString(value) {
  return ethers.formatEther(value).replace(/\.?0+$/, '');
}

function formatUsdEstimate(ethAmount) {
  const estimate = Math.max(1, Math.round(ethAmount * USD_PER_ETH_ESTIMATE));
  return `~$${estimate.toLocaleString()}`;
}

function mixChannel(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

function buildWinnerPillStyle(progress) {
  const accent = [
    mixChannel(34, 114, progress),
    mixChannel(211, 214, progress),
    mixChannel(238, 54, progress),
  ];
  const accentSoft = [
    mixChannel(14, 30, progress),
    mixChannel(116, 130, progress),
    mixChannel(144, 24, progress),
  ];
  const glowAlpha = 0.16 + (progress * 0.74);
  const glowSpreadAlpha = 0.08 + (progress * 0.34);
  const borderAlpha = 0.22 + (progress * 0.48);
  const shimmerAlpha = 0.08 + (progress * 0.2);

  return {
    '--winner-accent': `${accent[0]}, ${accent[1]}, ${accent[2]}`,
    '--winner-accent-soft': `${accentSoft[0]}, ${accentSoft[1]}, ${accentSoft[2]}`,
    '--winner-glow-alpha': glowAlpha.toFixed(3),
    '--winner-glow-spread-alpha': glowSpreadAlpha.toFixed(3),
    '--winner-border-alpha': borderAlpha.toFixed(3),
    '--winner-shimmer-alpha': shimmerAlpha.toFixed(3),
  };
}

function getSparkleCount(progress) {
  if (progress >= 0.72) return 3;
  if (progress >= 0.34) return 2;
  return 1;
}

function buildEntryFeeOptions(minEntryFeeWei, feeIncrementWei) {
  const minWei = minEntryFeeWei > 0n ? minEntryFeeWei : ethers.parseEther(DEFAULT_MIN_ENTRY_FEE);
  const incrementWei = feeIncrementWei > 0n ? feeIncrementWei : minWei;
  const values = [minWei];
  let current = minWei;

  for (const segment of SLIDER_SEGMENTS) {
    const segmentEndWei = ethers.parseEther(segment.endEth);
    const cappedEndWei = segmentEndWei > DEFAULT_MAX_ENTRY_FEE_WEI ? DEFAULT_MAX_ENTRY_FEE_WEI : segmentEndWei;
    const stepWei = incrementWei * segment.stepMultiplier;

    while (current + stepWei < cappedEndWei) {
      current += stepWei;
      values.push(current);
    }

    if (current < cappedEndWei) {
      current = cappedEndWei;
      values.push(current);
    }

    if (current >= DEFAULT_MAX_ENTRY_FEE_WEI) break;
  }

  return Array.from(new Set(values.map(value => value.toString()))).map(value => BigInt(value));
}

function findClosestValueIndex(values, entryFeeEth) {
  if (!values.length) return 0;

  let targetWei;
  try {
    targetWei = ethers.parseEther(entryFeeEth || DEFAULT_MIN_ENTRY_FEE);
  } catch {
    return 0;
  }

  let closestIndex = 0;
  let smallestDelta = values[0] > targetWei ? values[0] - targetWei : targetWei - values[0];

  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] > targetWei ? values[index] - targetWei : targetWei - values[index];
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closestIndex = index;
    }
  }

  return closestIndex;
}

export default function EntryFeeSlider({
  factoryRules,
  entryFee,
  playerCount,
  disabled,
  onChange,
}) {
  const minEntryFeeWei = factoryRules?.minEntryFee ?? ethers.parseEther(DEFAULT_MIN_ENTRY_FEE);
  const feeIncrementWei = factoryRules?.feeIncrement ?? minEntryFeeWei;
  const feeOptions = buildEntryFeeOptions(minEntryFeeWei, feeIncrementWei);
  const selectedIndex = findClosestValueIndex(feeOptions, entryFee);
  const selectedWei = feeOptions[selectedIndex] ?? minEntryFeeWei;
  const selectedEth = formatEthString(selectedWei);
  const selectedEthNumber = Number.parseFloat(selectedEth) || 0;
  const normalizedPlayerCount = Number(playerCount) || 2;
  const prizePoolEth = selectedEthNumber * normalizedPlayerCount * PRIZE_POOL_SHARE;
  const prizePoolEthDisplay = prizePoolEth.toFixed(4).replace(/\.?0+$/, '');
  const progressRatio = feeOptions.length > 1 ? selectedIndex / (feeOptions.length - 1) : 0;
  const progress = progressRatio * 100;
  const sliderBackground = {
    background: `linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(168,85,247,0.95) ${progress}%, rgba(51,65,85,0.75) ${progress}%, rgba(51,65,85,0.35) 100%)`,
  };
  const winnerPillStyle = buildWinnerPillStyle(progressRatio);
  const sparkleCount = getSparkleCount(progressRatio);
  const sparkleDescriptors = [
    { className: 'winner-gets-sparkle-1', size: 'h-2 w-2' },
    { className: 'winner-gets-sparkle-2', size: 'h-1.5 w-1.5' },
    { className: 'winner-gets-sparkle-3', size: 'h-2.5 w-2.5' },
  ];

  return (
    <div className={`h-full rounded-2xl border p-4 md:p-5 ${disabled ? 'border-slate-800 bg-slate-900/50' : 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_30px_rgba(56,189,248,0.08)]'}`}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-purple-200">Entry Fee</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-2xl md:text-3xl font-semibold text-white">{selectedEth} ETH</span>
              <span className="text-xs md:text-sm font-medium text-cyan-200/85">{formatUsdEstimate(selectedEthNumber)} estimated</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">Dollar estimates assume 1 ETH = ~$2000</div>
          </div>

          <div className="winner-gets-pill relative overflow-hidden rounded-xl px-3 py-2 text-sm text-slate-100" style={winnerPillStyle}>
            {sparkleDescriptors.map((sparkle, index) => (
              <span
                key={sparkle.className}
                aria-hidden="true"
                className={`winner-gets-sparkle ${sparkle.className} ${sparkle.size} ${index < sparkleCount ? 'winner-gets-sparkle-active' : 'winner-gets-sparkle-idle'}`}
              />
            ))}
            <span>Winner Gets {prizePoolEthDisplay} ETH </span>
            <span className="text-[11px] text-slate-200/75">({formatUsdEstimate(prizePoolEth)} estimated)</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4">
          <input
            type="range"
            min="0"
            max={String(Math.max(feeOptions.length - 1, 0))}
            step="1"
            value={selectedIndex}
            disabled={disabled}
            aria-label="Entry fee"
            aria-valuetext={`${selectedEth} ETH`}
            onChange={event => {
              const nextValue = feeOptions[Number(event.target.value)] ?? selectedWei;
              onChange(formatEthString(nextValue));
            }}
            className="entry-fee-slider w-full"
            style={sliderBackground}
          />

          <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
            <span>{formatEthString(minEntryFeeWei)} ETH</span>
            <span>0.01</span>
            <span>0.05</span>
            <span>0.5</span>
            <span>1 ETH</span>
          </div>
        </div>
      </div>
    </div>
  );
}
