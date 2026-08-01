import { emitV3OperationalEvent } from '../observability/publicEvents';

export class DuplicateMoveIntentError extends Error {
  constructor() {
    super('A move is already being submitted');
    this.name = 'DuplicateMoveIntentError';
    this.code = 'V3_MOVE_ALREADY_PENDING';
  }
}

export function formatSessionMoveFailure(descriptor) {
  const message = descriptor?.message || 'The prompt-free move could not be submitted.';
  return `${message} Your move was not resubmitted. Select “Use wallet for moves” to retry explicitly.`;
}

export class V3MoveController {
  #pending = false;

  #observer;

  constructor({ observer = emitV3OperationalEvent } = {}) {
    this.#observer = observer;
  }

  get pending() {
    return this.#pending;
  }

  async submitSession({
    sessionService,
    identity,
    move,
    reconcile,
    onState = () => {},
  }) {
    const startedAt = Date.now();
    return this.#submit(async () => {
      onState({ status: 'submitting', mode: 'session' });
      this.#observe({
        event: 'move_submitting', mode: 'session', game: move?.game,
        instance: identity?.instance,
      });
      try {
        const result = await sessionService.submitMove(identity, move);
        onState({
          status: 'included',
          mode: 'session',
          userOperationHash: result.userOperationHash,
        });
        this.#observe({
          event: 'move_included', mode: 'session', outcome: 'included',
          game: move?.game, instance: identity?.instance,
          executor: result.metadata?.account,
          userOperationHash: result.userOperationHash,
          transactionHash: result.receipt?.receipt?.transactionHash,
          inclusionLatencyMs: Date.now() - startedAt,
        });
        const reconciled = await reconcile(result);
        onState({ status: 'success', mode: 'session' });
        return { mode: 'session', result, reconciled };
      } catch (error) {
        this.#observe({
          event: 'move_failed', mode: 'session', outcome: 'failed',
          game: move?.game, instance: identity?.instance,
          errorCode: error?.code || error?.name || 'V3_MOVE_FAILED',
          fallback: 'explicit-only',
          inclusionLatencyMs: Date.now() - startedAt,
        });
        throw error;
      }
    });
  }

  async submitDirect({
    submit,
    reconcile,
    onState = () => {},
  }) {
    const startedAt = Date.now();
    return this.#submit(async () => {
      onState({ status: 'submitting', mode: 'primary' });
      this.#observe({ event: 'move_submitting', mode: 'primary' });
      try {
        const result = await submit();
        onState({ status: 'included', mode: 'primary' });
        this.#observe({
          event: 'move_included', mode: 'primary', outcome: 'included',
          transactionHash: result?.hash,
          inclusionLatencyMs: Date.now() - startedAt,
        });
        const reconciled = await reconcile(result);
        onState({ status: 'success', mode: 'primary' });
        return { mode: 'primary', result, reconciled };
      } catch (error) {
        this.#observe({
          event: 'move_failed', mode: 'primary', outcome: 'failed',
          errorCode: error?.code || error?.name || 'V3_MOVE_FAILED',
          inclusionLatencyMs: Date.now() - startedAt,
        });
        throw error;
      }
    });
  }

  #observe(event) {
    try {
      this.#observer(event);
    } catch {
      // Observability is deliberately non-blocking.
    }
  }

  async #submit(task) {
    if (this.#pending) throw new DuplicateMoveIntentError();
    this.#pending = true;
    try {
      return await task();
    } finally {
      this.#pending = false;
    }
  }
}

function integerInRange(value, label, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) {
    throw new RangeError(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function matchCoordinates(roundNumber, matchNumber) {
  return {
    roundNumber: integerInRange(roundNumber, 'roundNumber', 0, 255),
    matchNumber: integerInRange(matchNumber, 'matchNumber', 0, 255),
  };
}

export function createTicTacToeMove({ roundNumber, matchNumber, cellIndex }) {
  return Object.freeze({
    game: 'tictactoe',
    ...matchCoordinates(roundNumber, matchNumber),
    cellIndex: integerInRange(cellIndex, 'cellIndex', 0, 8),
  });
}

export function createConnectFourMove({ roundNumber, matchNumber, column }) {
  return Object.freeze({
    game: 'connectfour',
    ...matchCoordinates(roundNumber, matchNumber),
    column: integerInRange(column, 'column', 0, 6),
  });
}

export function createChessMove({
  roundNumber,
  matchNumber,
  fromSquare,
  toSquare,
  promotionPiece = 0,
}) {
  const promotion = integerInRange(promotionPiece, 'promotionPiece', 0, 5);
  if (promotion === 1) {
    throw new RangeError('promotionPiece must be 0 or a piece between 2 and 5');
  }
  return Object.freeze({
    game: 'chess',
    ...matchCoordinates(roundNumber, matchNumber),
    fromSquare: integerInRange(fromSquare, 'fromSquare', 0, 63),
    toSquare: integerInRange(toSquare, 'toSquare', 0, 63),
    promotionPiece: promotion,
  });
}
