/**
 * Activity Helpers
 *
 * Utility functions for processing and displaying player activity data
 */

/**
 * Calculate match priority score based on time remaining
 * Lower time remaining = higher priority (lower score)
 *
 * @param {Object} match - Match object with timeRemaining property
 * @returns {number} Priority score (lower = more urgent)
 */
export const calculateMatchPriority = (match) => {
  return match.timeRemaining || 0;
};

/**
 * Sort active matches by urgency (time remaining)
 * Most urgent (least time) appears first
 *
 * @param {Array} matches - Array of match objects
 * @returns {Array} Sorted array of matches
 */
export const sortMatchesByUrgency = (matches) => {
  return [...matches].sort((a, b) => {
    const priorityA = calculateMatchPriority(a);
    const priorityB = calculateMatchPriority(b);
    return priorityA - priorityB;
  });
};

/**
 * Format time remaining in seconds as "Xm Ys"
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "3m 45s")
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '0s';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
