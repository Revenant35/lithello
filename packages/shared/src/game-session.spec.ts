import { INITIAL_BOARD } from './game-board.ts';
import type { GameMove } from './game-move.ts';
import {
  getConnectionState,
  getDisplayClocks,
  type GameSession,
  getTurnDeadline,
} from './game-session.ts';
import type { Game } from './game.ts';

const STARTED_AT = new Date('2026-09-29T12:00:00Z');

const TIME_CONTROL = {
  id: '3f1a6c2e-0b7d-4a91-9c3e-52d8b4f7a610',
  startClockMs: 300_000,
  incrementMs: 2_000,
} as Game['timeControl'];

function move(overrides: Partial<GameMove> = {}): GameMove {
  return {
    gameId: 'c8e4b2a1-7f36-4d05-8b19-6a2f9c4e1d73',
    ply: 0,
    board: INITIAL_BOARD,
    square: null,
    whiteTimeMs: 300_000,
    blackTimeMs: 300_000,
    playedAt: STARTED_AT,
    ...overrides,
  } as GameMove;
}

function session(args: {
  moves?: GameMove[];
  endedAt?: Date | null;
} = {}): GameSession {
  return {
    game: {
      timeControl: TIME_CONTROL,
      endedAt: args.endedAt ?? null,
    },
    moves: args.moves ?? [move()],
  } as GameSession;
}

describe('getTurnDeadline', () => {
  it('puts black on the clock after ply 0, since black moves first', () => {
    const deadline = getTurnDeadline(session());

    expect(deadline).not.toBeNull();
    expect(deadline!.color).toBe('b');
    expect(deadline!.expiresAt).toEqual(
      new Date(STARTED_AT.getTime() + 300_000),
    );
  });

  it('counts white from black’s move, not from the start of the game', () => {
    const blackMovedAt = new Date(STARTED_AT.getTime() + 10_000);

    const deadline = getTurnDeadline(
      session({
        moves: [
          move(),
          move({ ply: 1, playedAt: blackMovedAt, blackTimeMs: 292_000 }),
        ],
      }),
    );

    expect(deadline!.color).toBe('w');
    expect(deadline!.expiresAt).toEqual(
      new Date(blackMovedAt.getTime() + 300_000),
    );
  });

  it('is absolute, so recomputing it never extends the turn', () => {
    const live = session();

    const first = getTurnDeadline(live);
    const second = getTurnDeadline(live);

    expect(second!.expiresAt.getTime()).toBe(first!.expiresAt.getTime());
  });

  it('resolves the last move by ply, not array order', () => {
    const blackMovedAt = new Date(STARTED_AT.getTime() + 10_000);
    const moves = [
      move({ ply: 1, playedAt: blackMovedAt, blackTimeMs: 292_000 }),
      move(),
    ];

    expect(getTurnDeadline(session({ moves }))!.color).toBe('w');
  });

  it('expires immediately when the side to move has no time left', () => {
    const deadline = getTurnDeadline(
      session({ moves: [move({ blackTimeMs: 0 })] }),
    );

    expect(deadline!.expiresAt).toEqual(STARTED_AT);
  });

  it('is null once the game has ended', () => {
    expect(getTurnDeadline(session({ endedAt: new Date() }))).toBeNull();
  });

  it('is null when there are no moves at all', () => {
    expect(getTurnDeadline(session({ moves: [] }))).toBeNull();
  });
});

describe('getDisplayClocks', () => {
  const T0 = STARTED_AT;
  const T1 = new Date(T0.getTime() + 10_000);

  it('shows the stored values while the game is live', () => {
    expect(
      getDisplayClocks(session({ moves: [move({ blackTimeMs: 280_000 })] })),
    ).toEqual({ white: 300_000, black: 280_000 });
  });

  it('charges the side on the clock for the turn they never finished', () => {
    // Black is to move after ply 0 and the game ends 10s later.
    const ended = session({ endedAt: T1 });

    expect(getDisplayClocks(ended)).toEqual({
      white: 300_000,
      black: 290_000,
    });
  });

  it('leaves the idle side untouched', () => {
    const ended = session({
      moves: [move(), move({ ply: 1, playedAt: T0, blackTimeMs: 292_000 })],
      endedAt: T1,
    });

    // White was to move on ply 2, so only white is charged.
    expect(getDisplayClocks(ended)).toEqual({
      white: 290_000,
      black: 292_000,
    });
  });

  it('never goes negative when the game outlived the clock', () => {
    const ended = session({
      moves: [move({ blackTimeMs: 3_000 })],
      endedAt: T1,
    });

    expect(getDisplayClocks(ended).black).toBe(0);
  });
});

describe('getConnectionState', () => {
  it('reports a live game’s connection state', () => {
    const live = {
      ...session(),
      whiteConnected: true,
      blackConnected: false,
      whiteAbandonsAt: null,
      blackAbandonsAt: new Date('2026-09-29T12:00:30Z'),
    } as GameSession;

    expect(getConnectionState(live, 'w')).toEqual({
      isConnected: true,
      abandonsAt: null,
    });
    expect(getConnectionState(live, 'b')).toEqual({
      isConnected: false,
      abandonsAt: new Date('2026-09-29T12:00:30Z'),
    });
  });

  it('is null once the game has ended, even if a side is away', () => {
    const finished = {
      ...session({ endedAt: new Date('2026-09-29T12:30:00Z') }),
      whiteConnected: false,
      blackConnected: false,
      whiteAbandonsAt: null,
      blackAbandonsAt: null,
    } as GameSession;

    expect(getConnectionState(finished, 'w')).toBeNull();
    expect(getConnectionState(finished, 'b')).toBeNull();
  });
});
