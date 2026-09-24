import { err, errAsync, ok, ResultAsync } from "neverthrow";

import { GameService } from "./game.service.ts";
import { GameRepository, GameRepositoryError } from "./game.repository.ts";
import type {
  GameActionID,
  GameCompletion,
  GameID,
  GameMessageID,
  UserID,
} from "@lithello/shared/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GAME_ID = "00000000-0000-4000-8000-000000000001" as GameID;
const WHITE_ID = "00000000-0000-4000-8000-000000000002" as UserID;
const BLACK_ID = "00000000-0000-4000-8000-000000000003" as UserID;
const ACTION_ID = "00000000-0000-4000-8000-000000000010" as GameActionID;
const MESSAGE_ID = "00000000-0000-4000-8000-000000000020" as GameMessageID;
const NOW = new Date("2026-09-23T08:00:00.000Z");

const activeGame = {
  id: GAME_ID,
  white_id: WHITE_ID,
  black_id: BLACK_ID,
  start_clock_ms: 300000,
  status: "active" as const,
  started_at: NOW.toISOString(),
};

const finishedGame = {
  ...activeGame,
  status: "finished" as const,
  result: "white_win" as const,
  end_reason: "normal" as const,
  ended_at: NOW.toISOString(),
};

const gameAction = {
  id: ACTION_ID,
  game_id: GAME_ID,
  user_id: WHITE_ID,
  action_number: 1,
  kind: "move" as const,
  clock_ms_remaining: 290000,
  row: 2,
  col: 3,
  created_at: NOW.toISOString(),
};

const gameMessage = {
  id: MESSAGE_ID,
  game_id: GAME_ID,
  user_id: WHITE_ID,
  content: "good game",
  created_at: NOW.toISOString(),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setup() {
  const repository = {
    withClient: vi.fn(),
    withTransaction: vi.fn(),
  } as unknown as GameRepository;

  const service = new GameService(repository);

  return { repository, service };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("recordGameStart", () => {
    it("inserts a game and returns ok", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withClient).mockResolvedValue(ok(activeGame));

      const result = await service.recordGameStart({
        white_id: WHITE_ID,
        black_id: BLACK_ID,
        start_clock_ms: 300000,
      });

      expect(result).toEqual(ok(activeGame));
      expect(repository.withClient).toHaveBeenCalledOnce();
    });

    it("returns an error if the repository fails", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withClient).mockResolvedValue(err(GameRepositoryError.UnknownError));

      const result = await service.recordGameStart({
        white_id: WHITE_ID,
        black_id: BLACK_ID,
        start_clock_ms: 300000,
      });

      expect(result).toEqual(err(GameRepositoryError.UnknownError));
    });
  });

  describe("recordAction", () => {
    it("inserts a move action and returns ok", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withClient).mockResolvedValue(ok(gameAction));

      const result = await service.recordAction({
        game_id: GAME_ID,
        user_id: WHITE_ID,
        action_number: 1,
        action: { kind: "move", location: { row: 2, col: 3 }, playerColor: "w" },
        clock_ms_remaining: 290000,
      });

      expect(result).toEqual(ok(gameAction));
      expect(repository.withClient).toHaveBeenCalledOnce();
    });

    it("inserts a pass action and returns ok", async () => {
      const { repository, service } = setup();
      const passAction = { ...gameAction, kind: "pass" as const, row: null, col: null };
      vi.mocked(repository.withClient).mockResolvedValue(ok(passAction));

      const result = await service.recordAction({
        game_id: GAME_ID,
        user_id: WHITE_ID,
        action_number: 1,
        action: { kind: "pass", playerColor: "w" },
        clock_ms_remaining: 290000,
      });

      expect(result).toEqual(ok(passAction));
    });
  });

  describe("recordGameEnd", () => {
    it("resolves white_win when white wins by victory", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withTransaction).mockImplementation((fn) => {
        return ResultAsync.fromPromise(
          fn({
            findGameById: async () => activeGame,
            updateGame: async () => finishedGame,
          } as never),
          () => GameRepositoryError.UnknownError,
        );
      });

      const completion: GameCompletion = { reason: "victory", winnerId: WHITE_ID };
      const result = await service.recordGameEnd({ game_id: GAME_ID, completion });

      expect(result).toEqual(ok(finishedGame));
    });

    it("resolves black_win when white resigns", async () => {
      const { repository, service } = setup();
      let capturedUpdate: Record<string, unknown> = {};
      vi.mocked(repository.withTransaction).mockImplementation((fn) =>
        ResultAsync.fromPromise(
          fn({
            findGameById: async () => activeGame,
            updateGame: async (_id: string, update: Record<string, unknown>) => {
              capturedUpdate = update;
              return { ...finishedGame, result: "black_win", end_reason: "resignation" };
            },
          } as never),
          () => GameRepositoryError.UnknownError,
        ),
      );

      const completion: GameCompletion = { reason: "resignation", resignerId: WHITE_ID };
      await service.recordGameEnd({ game_id: GAME_ID, completion });

      expect(capturedUpdate.result).toBe("black_win");
      expect(capturedUpdate.end_reason).toBe("resignation");
    });

    it("resolves draw", async () => {
      const { repository, service } = setup();
      let capturedUpdate: Record<string, unknown> = {};
      vi.mocked(repository.withTransaction).mockImplementation((fn) =>
        ResultAsync.fromPromise(
          fn({
            findGameById: async () => activeGame,
            updateGame: async (_id: string, update: Record<string, unknown>) => {
              capturedUpdate = update;
              return { ...finishedGame, result: "draw", end_reason: "normal" };
            },
          } as never),
          () => GameRepositoryError.UnknownError,
        ),
      );

      const completion: GameCompletion = { reason: "draw" };
      await service.recordGameEnd({ game_id: GAME_ID, completion });

      expect(capturedUpdate.result).toBe("draw");
      expect(capturedUpdate.end_reason).toBe("normal");
    });

    it("resolves timeout with correct winner", async () => {
      const { repository, service } = setup();
      let capturedUpdate: Record<string, unknown> = {};
      vi.mocked(repository.withTransaction).mockImplementation((fn) =>
        ResultAsync.fromPromise(
          fn({
            findGameById: async () => activeGame,
            updateGame: async (_id: string, update: Record<string, unknown>) => {
              capturedUpdate = update;
              return { ...finishedGame, result: "black_win", end_reason: "timeout" };
            },
          } as never),
          () => GameRepositoryError.UnknownError,
        ),
      );

      const completion: GameCompletion = { reason: "timeout", winnerId: BLACK_ID };
      await service.recordGameEnd({ game_id: GAME_ID, completion });

      expect(capturedUpdate.result).toBe("black_win");
      expect(capturedUpdate.end_reason).toBe("timeout");
    });

    it("returns an error if the transaction fails", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withTransaction).mockImplementation(() =>
        errAsync(GameRepositoryError.UnknownError),
      );

      const completion: GameCompletion = { reason: "draw" };
      const result = await service.recordGameEnd({ game_id: GAME_ID, completion });

      expect(result).toEqual(err(GameRepositoryError.UnknownError));
    });
  });

  describe("recordMessage", () => {
    it("inserts a message and returns ok", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withClient).mockResolvedValue(ok(gameMessage));

      const result = await service.recordMessage({
        game_id: GAME_ID,
        user_id: WHITE_ID,
        content: "good game",
      });

      expect(result).toEqual(ok(gameMessage));
      expect(repository.withClient).toHaveBeenCalledOnce();
    });

    it("returns an error if the repository fails", async () => {
      const { repository, service } = setup();
      vi.mocked(repository.withClient).mockResolvedValue(err(GameRepositoryError.UnknownError));

      const result = await service.recordMessage({
        game_id: GAME_ID,
        user_id: WHITE_ID,
        content: "good game",
      });

      expect(result).toEqual(err(GameRepositoryError.UnknownError));
    });
  });
});
