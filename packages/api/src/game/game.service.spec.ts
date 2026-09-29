import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  type Game,
  type GameID,
  type GameMove,
  type GameSession,
  type GameTimeControlID,
  INITIAL_BOARD,
  type Player,
  type UserID,
} from '@lithello/shared';
import { REDIS_CLIENT } from '../redis/redis-client.provider.ts';
import { PlayerRepository } from '../player/player.repository.ts';
import {
  GameAlreadyEndedError,
  GameNotFoundError,
  IllegalMoveError,
  InvalidGameError,
  NotAParticipantError,
  NotYourTurnError,
  PlayerNotFoundError,
} from './game.error.ts';
import { GameRepository } from './game.repository.ts';
import { GameService } from './game.service.ts';

// The engine has its own tests; stubbing it here lets each branch of the
// service be driven directly instead of hunting for Othello positions that
// happen to produce a pass or a finish. The pure helpers stay real.
vi.mock('@lithello/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lithello/shared')>()),
  isLegalMove: vi.fn(),
  applyMove: vi.fn(),
  hasLegalMove: vi.fn(),
  getWinner: vi.fn(),
}));

const { applyMove, getWinner, hasLegalMove, isLegalMove } = await import(
  '@lithello/shared'
);

const NOW = new Date('2026-09-29T12:00:30Z');
const STARTED_AT = new Date('2026-09-29T12:00:00Z');

const GAME_ID = randomUUID() as GameID;
const WHITE_ID = randomUUID() as UserID;
const BLACK_ID = randomUUID() as UserID;
const STRANGER_ID = randomUUID() as UserID;
const TIME_CONTROL_ID = randomUUID() as GameTimeControlID;

const TIME_CONTROL = {
  id: TIME_CONTROL_ID,
  startClockMs: 300_000,
  incrementMs: 2_000,
} as Game['timeControl'];

const WHITE: Player = { id: WHITE_ID, name: 'White', rating: 1500 };
const BLACK: Player = { id: BLACK_ID, name: 'Black', rating: 1520 };

/** The next board applyMove returns; contents are irrelevant to the service. */
const NEXT_BOARD = { whitePieces: 1n, blackPieces: 2n };

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: GAME_ID,
    timeControl: TIME_CONTROL,
    white: {
      id: WHITE_ID,
      name: 'White',
      color: 'w',
      ratingBefore: 1500,
      ratingAfter: null,
    },
    black: {
      id: BLACK_ID,
      name: 'Black',
      color: 'b',
      ratingBefore: 1520,
      ratingAfter: null,
    },
    isRated: true,
    createdAt: STARTED_AT,
    startedAt: STARTED_AT,
    endedAt: null,
    result: null,
    endReason: null,
    finalWhitePieces: null,
    finalBlackPieces: null,
    ...overrides,
  } as Game;
}

/** Ply 0 only: the initial position, so black is to move on ply 1. */
function initialMoves(): GameMove[] {
  return [
    {
      gameId: GAME_ID,
      ply: 0,
      board: INITIAL_BOARD,
      square: null,
      whiteTimeMs: 300_000,
      blackTimeMs: 300_000,
      playedAt: STARTED_AT,
    } as GameMove,
  ];
}

describe('GameService', () => {
  let service: GameService;
  let games: Record<string, ReturnType<typeof vi.fn>>;
  let players: Record<string, ReturnType<typeof vi.fn>>;
  let redis: Record<string, ReturnType<typeof vi.fn>>;

  /** Points the repository mocks at a given game state. */
  function givenSession(args: { game?: Game; moves?: GameMove[] } = {}) {
    const game = args.game ?? makeGame();
    const moves = args.moves ?? initialMoves();

    games.getGame.mockResolvedValue(game);
    games.getGameMoves.mockResolvedValue(moves);
    games.getGameMessages.mockResolvedValue([]);

    return { game, moves };
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    games = {
      getGame: vi.fn(),
      getGames: vi.fn(),
      getGameMoves: vi.fn(),
      getGameMessages: vi.fn(),
      getTimeControl: vi.fn().mockResolvedValue(TIME_CONTROL),
      getTimeControls: vi.fn().mockResolvedValue([TIME_CONTROL]),
      createGame: vi.fn().mockResolvedValue(GAME_ID),
      insertMove: vi.fn().mockResolvedValue(undefined),
      insertMessage: vi.fn().mockResolvedValue(undefined),
      updateGame: vi.fn().mockResolvedValue(undefined),
      finishGame: vi.fn().mockResolvedValue(undefined),
    };

    players = {
      getPlayer: vi.fn(async ({ id }: { id: UserID }) =>
        id === WHITE_ID ? WHITE : id === BLACK_ID ? BLACK : null,
      ),
    };

    redis = {
      zAdd: vi.fn().mockResolvedValue(1),
      zRem: vi.fn().mockResolvedValue(1),
      claimDueDeadlines: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(isLegalMove).mockReturnValue(true);
    vi.mocked(applyMove).mockReturnValue(NEXT_BOARD);
    vi.mocked(hasLegalMove).mockReturnValue(true);
    vi.mocked(getWinner).mockReturnValue('draw');

    const module = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: GameRepository, useValue: games },
        { provide: PlayerRepository, useValue: players },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get(GameService);
    givenSession();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('assembles the game with its moves and messages', async () => {
      const session = await service.getSession({ gameId: GAME_ID });

      expect(session.game.id).toBe(GAME_ID);
      expect(session.moves).toHaveLength(1);
      expect(session.messages).toEqual([]);
    });

    it('carries both seats, names included, on the game itself', async () => {
      const session = await service.getSession({ gameId: GAME_ID });

      expect(session.game.white.id).toBe(WHITE_ID);
      expect(session.game.white.name).toBe('White');
      expect(session.game.black.id).toBe(BLACK_ID);
    });

    it('does not load players separately - the join already has them', async () => {
      await service.getSession({ gameId: GAME_ID });

      expect(players.getPlayer).not.toHaveBeenCalled();
    });

    it('throws when the game does not exist', async () => {
      games.getGame.mockResolvedValue(null);

      await expect(service.getSession({ gameId: GAME_ID })).rejects.toThrow(
        GameNotFoundError,
      );
    });

    it('throws when the game does not exist, without touching moves', async () => {
      games.getGame.mockResolvedValue(null);

      await expect(service.getSession({ gameId: GAME_ID })).rejects.toThrow(
        GameNotFoundError,
      );
    });
  });

  describe('createGame', () => {
    it('throws when a user has no player record to take a rating from', async () => {
      players.getPlayer.mockResolvedValue(null);

      await expect(
        service.createGame({
          whiteUserId: WHITE_ID,
          blackUserId: BLACK_ID,
          timeControlId: TIME_CONTROL_ID,
          isRated: true,
        }),
      ).rejects.toThrow(PlayerNotFoundError);
    });

    it('refuses to seat the same user twice', async () => {
      await expect(
        service.createGame({
          whiteUserId: WHITE_ID,
          blackUserId: WHITE_ID,
          timeControlId: TIME_CONTROL_ID,
          isRated: true,
        }),
      ).rejects.toThrow(InvalidGameError);

      expect(games.createGame).not.toHaveBeenCalled();
    });

    it('seats both players by their loaded records', async () => {
      await service.createGame({
        whiteUserId: WHITE_ID,
        blackUserId: BLACK_ID,
        timeControlId: TIME_CONTROL_ID,
        isRated: true,
      });

      expect(games.createGame).toHaveBeenCalledWith({
        white: WHITE,
        black: BLACK,
        timeControlId: TIME_CONTROL_ID,
        isRated: true,
        startedAt: NOW,
      });
    });

    it('writes ply 0 as the opening position with full clocks', async () => {
      await service.createGame({
        whiteUserId: WHITE_ID,
        blackUserId: BLACK_ID,
        timeControlId: TIME_CONTROL_ID,
        isRated: false,
      });

      expect(games.insertMove).toHaveBeenCalledWith({
        gameId: GAME_ID,
        ply: 0,
        board: INITIAL_BOARD,
        square: null,
        whiteTimeMs: 300_000,
        blackTimeMs: 300_000,
        playedAt: NOW,
      });
    });
  });

  describe('move', () => {
    it('rejects someone who is not playing', async () => {
      await expect(
        service.move({ gameId: GAME_ID, userId: STRANGER_ID, square: 19 }),
      ).rejects.toThrow(NotAParticipantError);
    });

    it('rejects a move in a finished game', async () => {
      givenSession({ game: makeGame({ endedAt: NOW }) });

      await expect(
        service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 }),
      ).rejects.toThrow(GameAlreadyEndedError);
    });

    it('rejects a move out of turn', async () => {
      // Ply 1 belongs to black, so white moving here is out of turn.
      await expect(
        service.move({ gameId: GAME_ID, userId: WHITE_ID, square: 19 }),
      ).rejects.toThrow(NotYourTurnError);

      expect(games.insertMove).not.toHaveBeenCalled();
    });

    it('rejects an illegal square', async () => {
      vi.mocked(isLegalMove).mockReturnValue(false);

      await expect(
        service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 }),
      ).rejects.toThrow(IllegalMoveError);

      expect(games.insertMove).not.toHaveBeenCalled();
    });

    it('writes the move with the board the engine returned', async () => {
      await service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 });

      expect(games.insertMove).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: GAME_ID,
          ply: 1,
          board: NEXT_BOARD,
          square: 19,
          playedAt: NOW,
        }),
      );
    });

    it('charges the mover for their think time and adds the increment', async () => {
      // 30s elapsed since ply 0, on a 5+2: 300000 - 30000 + 2000.
      await service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 });

      expect(games.insertMove).toHaveBeenCalledWith(
        expect.objectContaining({ blackTimeMs: 272_000, whiteTimeMs: 300_000 }),
      );
    });

    it('records a pass for the opponent when they have no legal reply', async () => {
      vi.mocked(hasLegalMove).mockImplementation((_board, color) => color === 'b');

      await service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 });

      expect(games.insertMove).toHaveBeenCalledTimes(2);
      expect(games.insertMove).toHaveBeenLastCalledWith(
        expect.objectContaining({ ply: 2, square: null, board: NEXT_BOARD }),
      );
      expect(games.finishGame).not.toHaveBeenCalled();
    });

    it('finishes the game when neither side can move', async () => {
      vi.mocked(hasLegalMove).mockReturnValue(false);
      vi.mocked(getWinner).mockReturnValue('black_win');

      await service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 });

      expect(games.finishGame).toHaveBeenCalledWith(
        expect.objectContaining({
          id: GAME_ID,
          result: 'black_win',
          endReason: 'normal',
          finalBoard: NEXT_BOARD,
        }),
      );
    });

    it('ends as a timeout instead of accepting a move made after the flag', async () => {
      // Ply 0 left black 10s; 30s have passed.
      givenSession({
        moves: [
          { ...initialMoves()[0]!, blackTimeMs: 10_000 } as GameMove,
        ],
      });

      await service.move({ gameId: GAME_ID, userId: BLACK_ID, square: 19 });

      expect(games.finishGame).toHaveBeenCalledWith(
        expect.objectContaining({ result: 'white_win', endReason: 'timeout' }),
      );
      expect(games.insertMove).not.toHaveBeenCalled();
    });
  });

  describe('resign', () => {
    it.each([
      [WHITE_ID, 'black_win'],
      [BLACK_ID, 'white_win'],
    ] as const)('gives the win to the opponent when %s resigns', async (
      userId,
      result,
    ) => {
      await service.resign({ gameId: GAME_ID, userId });

      expect(games.finishGame).toHaveBeenCalledWith(
        expect.objectContaining({ result, endReason: 'resignation' }),
      );
    });

    it('rejects a stranger', async () => {
      await expect(
        service.resign({ gameId: GAME_ID, userId: STRANGER_ID }),
      ).rejects.toThrow(NotAParticipantError);
    });

    it('settles ratings unchanged while rating calculation is pending', async () => {
      await service.resign({ gameId: GAME_ID, userId: WHITE_ID });

      expect(games.finishGame).toHaveBeenCalledWith(
        expect.objectContaining({
          whiteRatingAfter: 1500,
          blackRatingAfter: 1520,
        }),
      );
    });
  });

  describe('sendMessage', () => {
    it('stores a participant message', async () => {
      await service.sendMessage({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'good luck',
      });

      expect(games.insertMessage).toHaveBeenCalledWith({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'good luck',
      });
    });

    it('rejects a stranger', async () => {
      await expect(
        service.sendMessage({
          gameId: GAME_ID,
          userId: STRANGER_ID,
          content: 'hello',
        }),
      ).rejects.toThrow(NotAParticipantError);

      expect(games.insertMessage).not.toHaveBeenCalled();
    });
  });

  describe('gameSessionChanged$', () => {
    it('publishes the session after a command', async () => {
      const seen: GameSession[] = [];
      service.gameSessionChanged$.subscribe((session) => seen.push(session));

      await service.sendMessage({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'hi',
      });

      expect(seen).toHaveLength(1);
      expect(seen[0]!.game.id).toBe(GAME_ID);
    });
  });

  describe('clock deadlines', () => {
    it('records when the side to move runs out', async () => {
      await service.sendMessage({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'hi',
      });

      // Black is on the clock with 300s, counting from ply 0 at 12:00:00.
      expect(redis.zAdd).toHaveBeenCalledWith('game-deadlines', {
        score: STARTED_AT.getTime() + 300_000,
        value: GAME_ID,
      });
    });

    it('does not extend the deadline when something unrelated republishes', async () => {
      await service.sendMessage({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'one',
      });
      vi.setSystemTime(new Date(NOW.getTime() + 60_000));
      await service.sendMessage({
        gameId: GAME_ID,
        userId: BLACK_ID,
        content: 'two',
      });

      const [first, second] = redis.zAdd.mock.calls;
      expect(second![1].score).toBe(first![1].score);
    });

    it('drops the deadline once the game has ended', async () => {
      givenSession({ game: makeGame({ endedAt: NOW, result: 'black_win' }) });
      redis.claimDueDeadlines.mockResolvedValue([GAME_ID]);

      await service.sweepExpiredClocks();

      expect(redis.zRem).toHaveBeenCalledWith('game-deadlines', GAME_ID);
      expect(redis.zAdd).not.toHaveBeenCalled();
    });
  });

  describe('sweepExpiredClocks', () => {
    it('ends a claimed game whose clock has run out', async () => {
      givenSession({
        moves: [{ ...initialMoves()[0]!, blackTimeMs: 10_000 } as GameMove],
      });
      redis.claimDueDeadlines.mockResolvedValue([GAME_ID]);

      await service.sweepExpiredClocks();

      expect(games.finishGame).toHaveBeenCalledWith(
        expect.objectContaining({ result: 'white_win', endReason: 'timeout' }),
      );
    });

    it('leaves a game alone when the clock has moved on since the claim', async () => {
      // Black still has 300s from ply 0, so the claim was stale.
      redis.claimDueDeadlines.mockResolvedValue([GAME_ID]);

      await service.sweepExpiredClocks();

      expect(games.finishGame).not.toHaveBeenCalled();
      expect(redis.zAdd).toHaveBeenCalledWith('game-deadlines', {
        score: STARTED_AT.getTime() + 300_000,
        value: GAME_ID,
      });
    });

    it('does nothing when nothing is due', async () => {
      await service.sweepExpiredClocks();

      expect(games.getGame).not.toHaveBeenCalled();
      expect(games.finishGame).not.toHaveBeenCalled();
    });
  });
});
