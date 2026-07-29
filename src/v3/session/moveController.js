export class DuplicateMoveIntentError extends Error {
  constructor() {
    super('A move is already being submitted');
    this.name = 'DuplicateMoveIntentError';
    this.code = 'V3_MOVE_ALREADY_PENDING';
  }
}

export class V3MoveController {
  #pending = false;

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
    return this.#submit(async () => {
      onState({ status: 'submitting', mode: 'session' });
      const result = await sessionService.submitMove(identity, move);
      onState({
        status: 'included',
        mode: 'session',
        userOperationHash: result.userOperationHash,
      });
      const reconciled = await reconcile(result);
      onState({ status: 'success', mode: 'session' });
      return { mode: 'session', result, reconciled };
    });
  }

  async submitDirect({
    submit,
    reconcile,
    onState = () => {},
  }) {
    return this.#submit(async () => {
      onState({ status: 'submitting', mode: 'primary' });
      const result = await submit();
      onState({ status: 'included', mode: 'primary' });
      const reconciled = await reconcile(result);
      onState({ status: 'success', mode: 'primary' });
      return { mode: 'primary', result, reconciled };
    });
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

export function createTicTacToeMove({ roundNumber, matchNumber, cellIndex }) {
  return Object.freeze({
    game: 'tictactoe',
    roundNumber: Number(roundNumber),
    matchNumber: Number(matchNumber),
    cellIndex: Number(cellIndex),
  });
}
