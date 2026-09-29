/**
 * Failures the game service raises. The gateway maps these onto socket errors,
 * so the code is the part clients branch on and the message is for humans.
 */
export type GameErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'ILLEGAL_MOVE'
  | 'NOT_YOUR_TURN'
  | 'GAME_FINISHED'
  | 'INVALID_GAME';

export abstract class GameError extends Error {
  abstract readonly code: GameErrorCode;

  protected constructor(message: string) {
    super(message);
    // Without this every subclass reports as "Error" in logs and stack traces.
    this.name = new.target.name;
  }
}

export class GameNotFoundError extends GameError {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Game not found') {
    super(message);
  }
}

export class PlayerNotFoundError extends GameError {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Player not found') {
    super(message);
  }
}

export class TimeControlNotFoundError extends GameError {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Time control not found') {
    super(message);
  }
}

export class NotAParticipantError extends GameError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Not a participant in this game') {
    super(message);
  }
}

export class GameAlreadyEndedError extends GameError {
  readonly code = 'GAME_FINISHED';

  constructor(message = 'Game has already ended') {
    super(message);
  }
}

export class NotYourTurnError extends GameError {
  readonly code = 'NOT_YOUR_TURN';

  constructor(message = 'Not your turn') {
    super(message);
  }
}

export class IllegalMoveError extends GameError {
  readonly code = 'ILLEGAL_MOVE';

  constructor(message = 'Illegal move') {
    super(message);
  }
}

/** The game cannot be created or is not in a state the command makes sense in. */
export class InvalidGameError extends GameError {
  readonly code = 'INVALID_GAME';

  constructor(message: string) {
    super(message);
  }
}
