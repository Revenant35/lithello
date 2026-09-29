import { randomUUID } from 'node:crypto';
import { GameSchema, GameMessageSchema, GameMoveSchema } from '@lithello/shared';
import { z } from 'zod';
import type {
  GameMessageRow,
  GameMoveRow,
  GameRow,
  GameTimeControlRow,
} from '../database/database.type.ts';
import {
  toGame,
  toGameMessage,
  toGameMove,
  toGameTimeControl,
} from './game.mapper.ts';

const WHITE_USER_ID = randomUUID();
const BLACK_USER_ID = randomUUID();
const GAME_ID = randomUUID();

function timeControlRow(
  overrides: Partial<GameTimeControlRow> = {},
): GameTimeControlRow {
  return {
    id: randomUUID(),
    startClockMs: 300_000,
    incrementMs: 2_000,
    ...overrides,
  };
}

/** An in-progress game: started, with every outcome column still null. */
function gameRow(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: GAME_ID,
    whiteUserId: WHITE_USER_ID,
    blackUserId: BLACK_USER_ID,
    timeControlId: randomUUID(),
    whiteRatingBefore: 1500,
    blackRatingBefore: 1520,
    isRated: true,
    createdAt: new Date('2026-09-29T12:00:00Z'),
    startedAt: new Date('2026-09-29T12:00:01Z'),
    endedAt: null,
    result: null,
    endReason: null,
    finalWhitePieces: null,
    finalBlackPieces: null,
    whiteRatingAfter: null,
    blackRatingAfter: null,
    ...overrides,
  };
}

function moveRow(overrides: Partial<GameMoveRow> = {}): GameMoveRow {
  return {
    gameId: GAME_ID,
    ply: 1,
    whitePieces: 68_853_694_464n,
    blackPieces: 34_628_173_824n,
    square: 19,
    whiteTimeMs: 300_000,
    blackTimeMs: 297_500,
    playedAt: new Date('2026-09-29T12:00:11Z'),
    ...overrides,
  };
}

function messageRow(overrides: Partial<GameMessageRow> = {}): GameMessageRow {
  return {
    id: randomUUID(),
    gameId: GAME_ID,
    userId: WHITE_USER_ID,
    content: 'good luck!',
    createdAt: new Date('2026-09-29T12:00:05Z'),
    ...overrides,
  };
}

describe('toGameTimeControl', () => {
  it('maps every column', () => {
    const row = timeControlRow();

    expect(toGameTimeControl(row)).toEqual({
      id: row.id,
      startClockMs: 300_000,
      incrementMs: 2_000,
    });
  });

  it('rejects an id that is not a uuid', () => {
    expect(() => toGameTimeControl(timeControlRow({ id: 'nope' }))).toThrow();
  });
});

describe('toGameMessage', () => {
  it('maps every column and keeps createdAt a Date', () => {
    const row = messageRow();
    const message = toGameMessage(row);

    expect(message).toEqual({
      id: row.id,
      gameId: GAME_ID,
      userId: WHITE_USER_ID,
      content: 'good luck!',
      createdAt: row.createdAt,
    });
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('produces something the shared schema accepts', () => {
    const message = toGameMessage(messageRow());

    expect(GameMessageSchema.safeParse(message).success).toBe(true);
  });

  it.each([['id'], ['gameId'], ['userId']] as const)(
    'rejects a malformed %s',
    (field) => {
      expect(() => toGameMessage(messageRow({ [field]: 'nope' }))).toThrow();
    },
  );
});

describe('toGameMove', () => {
  it('nests the flat bitboard columns under board', () => {
    const row = moveRow();
    const move = toGameMove(row);

    expect(move.board).toEqual({
      whitePieces: row.whitePieces,
      blackPieces: row.blackPieces,
    });
    expect(move).not.toHaveProperty('whitePieces');
  });

  it('keeps bitboards as bigint rather than coercing them', () => {
    const move = toGameMove(moveRow());

    expect(typeof move.board.whitePieces).toBe('bigint');
    expect(typeof move.board.blackPieces).toBe('bigint');
  });

  it('carries a negative bitboard through untouched', () => {
    // A disc on the last square sets bit 63, which int8 stores as negative.
    const lastSquare = BigInt.asIntN(64, 1n << 63n);
    const move = toGameMove(moveRow({ whitePieces: lastSquare }));

    expect(move.board.whitePieces).toBe(lastSquare);
    expect(move.board.whitePieces).toBeLessThan(0n);
  });

  it('keeps a pass as a null square', () => {
    expect(toGameMove(moveRow({ ply: 0, square: null })).square).toBeNull();
  });

  it('produces something that survives the wire round trip', () => {
    const move = toGameMove(moveRow());
    const wire = z.encode(GameMoveSchema, move);

    expect(z.decode(GameMoveSchema, JSON.parse(JSON.stringify(wire)))).toEqual(
      move,
    );
  });
});

describe('toGame', () => {
  it('splits the paired columns into two seats', () => {
    const game = toGame(gameRow(), timeControlRow());

    expect(game.white).toEqual({
      gameId: GAME_ID,
      userId: WHITE_USER_ID,
      color: 'w',
      ratingBefore: 1500,
      ratingAfter: null,
    });
    expect(game.black).toEqual({
      gameId: GAME_ID,
      userId: BLACK_USER_ID,
      color: 'b',
      ratingBefore: 1520,
      ratingAfter: null,
    });
  });

  it('embeds the time control it is handed, not the row id', () => {
    const timeControl = timeControlRow();
    const game = toGame(gameRow({ timeControlId: timeControl.id }), timeControl);

    expect(game.timeControl).toEqual({
      id: timeControl.id,
      startClockMs: 300_000,
      incrementMs: 2_000,
    });
  });

  it('leaves every outcome column null while the game is in progress', () => {
    const game = toGame(gameRow(), timeControlRow());

    expect(game.endedAt).toBeNull();
    expect(game.result).toBeNull();
    expect(game.endReason).toBeNull();
    expect(game.finalWhitePieces).toBeNull();
    expect(game.finalBlackPieces).toBeNull();
    expect(game.white.ratingAfter).toBeNull();
    expect(game.black.ratingAfter).toBeNull();
  });

  it('maps a finished game, landing ratings on the right seats', () => {
    const game = toGame(
      gameRow({
        endedAt: new Date('2026-09-29T12:30:00Z'),
        result: 'black_win',
        endReason: 'resignation',
        finalWhitePieces: 3n,
        finalBlackPieces: 12n,
        whiteRatingAfter: 1488,
        blackRatingAfter: 1532,
      }),
      timeControlRow(),
    );

    expect(game.result).toBe('black_win');
    expect(game.endReason).toBe('resignation');
    expect(game.finalWhitePieces).toBe(3n);
    expect(game.finalBlackPieces).toBe(12n);
    expect(game.white.ratingAfter).toBe(1488);
    expect(game.black.ratingAfter).toBe(1532);
  });

  it('does not swap the two seats', () => {
    const game = toGame(
      gameRow({ whiteRatingBefore: 1100, blackRatingBefore: 1900 }),
      timeControlRow(),
    );

    expect(game.white.userId).toBe(WHITE_USER_ID);
    expect(game.white.ratingBefore).toBe(1100);
    expect(game.black.userId).toBe(BLACK_USER_ID);
    expect(game.black.ratingBefore).toBe(1900);
  });

  it('produces something the shared schema accepts', () => {
    const game = toGame(gameRow(), timeControlRow());
    const wire = z.encode(GameSchema, game);

    expect(GameSchema.safeParse(wire).success).toBe(true);
  });

  it.each([['id'], ['whiteUserId'], ['blackUserId']] as const)(
    'rejects a malformed %s',
    (field) => {
      expect(() => toGame(gameRow({ [field]: 'nope' }), timeControlRow())).toThrow();
    },
  );
});
