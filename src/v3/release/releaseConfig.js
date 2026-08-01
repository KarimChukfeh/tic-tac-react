import { V3_DEPLOYMENTS } from '../config/deploymentLoader';
import { getGenerationGamePath } from '../../routing/gameRoutes';

function booleanFlag(value, fallback) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Expected a boolean release flag, received "${value}"`);
}

function percentage(value, fallback) {
  const normalized = value == null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 100) {
    throw new Error('VITE_V3_CANARY_PERCENT must be between 0 and 100');
  }
  return normalized;
}

function cohortBucket(value) {
  const source = String(value || 'default');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function loadV3ReleaseConfig(
  env = import.meta.env,
  deployment = V3_DEPLOYMENTS,
) {
  const local = deployment.network === 'localhost';
  const requestedGeneration = String(
    env?.VITE_NEW_TOURNAMENT_GENERATION || 'v3',
  ).trim().toLowerCase();
  if (!['v2', 'v3'].includes(requestedGeneration)) {
    throw new Error('VITE_NEW_TOURNAMENT_GENERATION must be "v2" or "v3"');
  }

  const releaseApproved = booleanFlag(
    env?.VITE_V3_RELEASE_APPROVED,
    local,
  );
  const creationEnabled = booleanFlag(
    env?.VITE_V3_CREATION_ENABLED,
    true,
  );
  const canaryPercent = percentage(
    env?.VITE_V3_CANARY_PERCENT,
    local ? 100 : 0,
  );
  const cohort = String(env?.VITE_V3_CANARY_COHORT || 'default');
  const bucket = cohortBucket(cohort);
  const v3Eligible = requestedGeneration === 'v3'
    && releaseApproved
    && creationEnabled
    && bucket < canaryPercent;

  return Object.freeze({
    requestedGeneration,
    selectedGeneration: v3Eligible ? 'v3' : 'v2',
    releaseApproved,
    creationEnabled,
    canaryPercent,
    cohortBucket: bucket,
    rollbackReady: true,
    diagnostics: Object.freeze({
      generation: v3Eligible ? 'v3' : 'v2',
      network: deployment.network,
      releaseApproved,
      creationEnabled,
      canaryPercent,
      cohortBucket: bucket,
      reason: v3Eligible
        ? 'V3 creation cohort enabled'
        : requestedGeneration === 'v2'
          ? 'V2 selected by release flag'
          : !releaseApproved
            ? 'V3 release approval missing'
            : !creationEnabled
              ? 'V3 creation disabled'
              : 'Outside V3 canary cohort',
    }),
  });
}

export function getNewTournamentPath(game, config = V3_RELEASE_CONFIG) {
  return getGenerationGamePath(game, config.selectedGeneration);
}

export const V3_RELEASE_CONFIG = loadV3ReleaseConfig();
