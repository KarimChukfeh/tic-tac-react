/**
 * Shared EscalationTimer Component
 *
 * Displays minimal escalation countdown for tournament enrollment.
 * Shows only the next pending escalation timer with a help icon.
 */

import { Clock, HelpCircle } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

/**
 * @param {Object} props
 * @param {Object} props.escalationState - State object containing escalation data
 * @param {boolean} props.escalationState.canStartEscalation1 - Whether escalation 1 is available
 * @param {boolean} props.escalationState.canStartEscalation2 - Whether escalation 2 is available
 * @param {number} props.escalationState.timeToEscalation1 - Seconds until escalation 1 activates
 * @param {number} props.escalationState.timeToEscalation2 - Seconds until escalation 2 activates
 * @param {Object|null} props.enrollmentTimeout - Enrollment timeout data (null if not active)
 */
const EscalationTimer = ({ escalationState, enrollmentTimeout }) => {
  // Don't render if no escalation data
  if (!enrollmentTimeout) {
    return null;
  }

  // Show EL1 timer if it's not yet available
  if (escalationState.timeToEscalation1 > 0) {
    return (
      <div className="mb-4">
        <div className="relative bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-400/50 rounded-lg p-3">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-400" size={16} />
              <span className="text-orange-300 text-sm font-semibold">
                EL1: Force Start in {formatTime(escalationState.timeToEscalation1)}
              </span>
            </div>
          </div>
          <a
            href="#el1"
            className="absolute top-3 right-3 text-orange-400 hover:text-orange-300 transition-colors"
            title="Learn more about force-starting tournaments"
          >
            <HelpCircle size={16} />
          </a>
        </div>
      </div>
    );
  }

  // Show EL2 timer if EL1 is active but EL2 is not yet available
  if (escalationState.canStartEscalation1 && escalationState.timeToEscalation2 > 0) {
    return (
      <div className="mb-4">
        <div className="relative bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/50 rounded-lg p-3">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Clock className="text-red-400" size={16} />
              <span className="text-red-300 text-sm font-semibold">
                EL2: Claim Abandoned Pool in {formatTime(escalationState.timeToEscalation2)}
              </span>
            </div>
          </div>
          <a
            href="#el2"
            className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors"
            title="Learn more about claiming abandoned pools"
          >
            <HelpCircle size={16} />
          </a>
        </div>
      </div>
    );
  }

  // Don't show timer if both escalations are active (CTAs will be visible instead)
  return null;
};

export default EscalationTimer;
