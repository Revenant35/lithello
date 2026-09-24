import { Logger } from "@nestjs/common";
import { NoResultError } from "kysely";
import { err, ok } from "neverthrow";

import { GameRepository, GameRepositoryClient, GameRepositoryError } from "./game.repository.ts";
import type { DatabaseSchema } from "../database/database-schema.ts";
import type { Kysely } from "kysely";
import type { GameID } from "@lithello/shared/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GAME_ID = "00000000-0000-4000-8000-000000000001" as GameID;
const WHITE_ID = "00000000-0000-4000-8000-000000000002";
const BLACK_ID = "00000000-0000-4000-8000-000000000003";
const NOW = new Date("2026-09-23T08:00:00.000Z");

const gameRow = {
  id: GAME_ID,
  white_id: WHITE_ID,
  black_id: BLACK_ID,
  start_clock_ms: 300000,
  status: "active" as const,
  result: null,
  end_reason: null,
  started_at: NOW,
  ended_at: null,
};

const finishedGameRow = {
  ...gameRow,
  status: "finished" as const,
  result: "white_win" as const,
  end_reason: "normal" as const,
  ended_at: NOW,
};

const actionRow = {
  id: "00000000-0000-4000-8000-000000000010",
  game_id: GAME_ID,
  user_id: WHITE_ID,
  action_number: 1,
  kind: "move" as const,
  clock_ms_remaining: 290000,
  row: 2,
  col: 3,
  created_at: NOW,
};

const passActionRow = {
  id: "00000000-0000-4000-8000-000000000011",
  game_id: GAME_ID,
  user_id: BLACK_ID,
  action_number: 2,
  kind: "pass" as const,
  clock_ms_remaining: 285000,
  row: null,
  col: null,
  created_at: NOW,
};

const messageRow = {
  id: "00000000-0000-4000-8000-000000000020",
  game_id: GAME_ID,
  user_id: WHITE_ID,
  content: "good game",
  created_at: NOW,
};

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

function makeQueryBuilder(result: unknown) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.insertInto = chain;
  builder.updateTable = chain;
  builder.selectFrom = chain;
  builder.values = chain;
  builder.set = chain;
  builder.where = chain;
  builder.orderBy = chain;
  builder.forUpdate = chain;
  builder.returningAll = chain;
  builder.selectAll = chain;
  builder.executeTakeFirstOrThrow = vi.fn().mockResolvedValue(result);
  builder.executeTakeFirst = vi.fn().mockResolvedValue(result);
  builder.execute = vi.fn().mockResolvedValue(result);

  return builder;
}

function makeDb(overrides: Partial<Record<string, unknown>> = {}): Kysely<DatabaseSchema> {
  const builder = makeQueryBuilder(gameRow);
  return {
    insertInto: vi.fn(() => builder),
    updateTable: vi.fn(() => builder),
    selectFrom: vi.fn(() => builder),
    transaction: vi.fn(() => ({
      execute: vi.fn(async (fn: (trx: unknown) => unknown) => fn(db)),
    })),
    ...overrides,
  } as unknown as Kysely<DatabaseSchema>;
}

let db: Kysely<DatabaseSchema>;

// ---------------------------------------------------------------------------
// GameRepositoryClient
// ---------------------------------------------------------------------------

describe("GameRepositoryClient", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    db = makeDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("insertGame", () => {
    it("inserts and returns a mapped Game", async () => {
      const builder = makeQueryBuilder(gameRow);
      db = makeDb({ insertInto: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.insertGame({
        white_id: WHITE_ID,
        black_id: BLACK_ID,
        start_clock_ms: 300000,
        status: "active",
      });

      expect(result.id).toBe(GAME_ID);
      expect(result.status).toBe("active");
      expect(db.insertInto).toHaveBeenCalledWith("game");
    });
  });

  describe("updateGame", () => {
    it("updates and returns a mapped Game", async () => {
      const builder = makeQueryBuilder(finishedGameRow);
      db = makeDb({ updateTable: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.updateGame(GAME_ID, {
        status: "finished",
        result: "white_win",
        end_reason: "normal",
        ended_at: NOW,
      });

      expect(result.status).toBe("finished");
      expect((result as { result: string }).result).toBe("white_win");
    });
  });

  describe("findGameById", () => {
    it("finds and returns a mapped Game", async () => {
      const builder = makeQueryBuilder(gameRow);
      db = makeDb({ selectFrom: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.findGameById(GAME_ID);

      expect(result.id).toBe(GAME_ID);
    });

    it("throws NoResultError when not found", async () => {
      const builder = makeQueryBuilder(undefined);
      (builder.executeTakeFirstOrThrow as ReturnType<typeof vi.fn>).mockRejectedValue(
        new NoResultError({ sql: "", parameters: [], query: { kind: "SelectQueryNode" } } as never),
      );
      db = makeDb({ selectFrom: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      await expect(client.findGameById(GAME_ID)).rejects.toBeInstanceOf(NoResultError);
    });
  });

  describe("insertAction", () => {
    it("inserts and returns a mapped move GameAction", async () => {
      const builder = makeQueryBuilder(actionRow);
      db = makeDb({ insertInto: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.insertAction({
        id: actionRow.id,
        game_id: GAME_ID,
        user_id: WHITE_ID,
        action_number: 1,
        kind: "move",
        clock_ms_remaining: 290000,
        row: 2,
        col: 3,
      });

      assert(result.kind === "move");
      expect(result.row).toBe(2);
      expect(result.col).toBe(3);
    });

    it("inserts and returns a mapped pass GameAction", async () => {
      const builder = makeQueryBuilder(passActionRow);
      db = makeDb({ insertInto: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.insertAction({
        id: passActionRow.id,
        game_id: GAME_ID,
        user_id: BLACK_ID,
        action_number: 2,
        kind: "pass",
        clock_ms_remaining: 285000,
        row: null,
        col: null,
      });

      expect(result.kind).toBe("pass");
    });
  });

  describe("findActionsByGameId", () => {
    it("returns mapped actions ordered by action_number", async () => {
      const builder = makeQueryBuilder([actionRow, passActionRow]);
      db = makeDb({ selectFrom: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const results = await client.findActionsByGameId(GAME_ID);

      expect(results).toHaveLength(2);
      expect(results[0].kind).toBe("move");
      expect(results[1].kind).toBe("pass");
    });
  });

  describe("insertMessage", () => {
    it("inserts and returns a mapped GameMessage", async () => {
      const builder = makeQueryBuilder(messageRow);
      db = makeDb({ insertInto: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const result = await client.insertMessage({
        id: messageRow.id,
        game_id: GAME_ID,
        user_id: WHITE_ID,
        content: "good game",
      });

      expect(result.content).toBe("good game");
      expect(result.user_id).toBe(WHITE_ID);
    });
  });

  describe("findMessagesByGameId", () => {
    it("returns mapped messages ordered by created_at", async () => {
      const builder = makeQueryBuilder([messageRow]);
      db = makeDb({ selectFrom: vi.fn(() => builder) });
      const client = new GameRepositoryClient(db);

      const results = await client.findMessagesByGameId(GAME_ID);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe("good game");
    });
  });
});

// ---------------------------------------------------------------------------
// GameRepository
// ---------------------------------------------------------------------------

describe("GameRepository", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    db = makeDb();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("withClient", () => {
    it("returns ok on success", async () => {
      const repo = new GameRepository(db);
      const result = await repo.withClient(() => Promise.resolve("value"));
      expect(result).toEqual(ok("value"));
    });

    it("returns UnknownError on unexpected error", async () => {
      const repo = new GameRepository(db);
      const result = await repo.withClient(() => Promise.reject(new Error("boom")));
      expect(result).toEqual(err(GameRepositoryError.UnknownError));
    });

    it("returns NotFound on NoResultError", async () => {
      const repo = new GameRepository(db);
      const result = await repo.withClient(() =>
        Promise.reject(new NoResultError({ sql: "", parameters: [], query: { kind: "SelectQueryNode" } } as never)),
      );
      expect(result).toEqual(err(GameRepositoryError.NotFound));
    });
  });

  describe("withTransaction", () => {
    it("runs operation inside a transaction and returns ok", async () => {
      const txExecute = vi.fn(async (fn: (trx: unknown) => unknown) => fn({}));
      db = makeDb({ transaction: vi.fn(() => ({ execute: txExecute })) });
      const repo = new GameRepository(db);

      const result = await repo.withTransaction(() => Promise.resolve("tx-value"));

      expect(result).toEqual(ok("tx-value"));
      expect(txExecute).toHaveBeenCalledOnce();
    });

    it("returns UnknownError if transaction throws", async () => {
      const txExecute = vi.fn().mockRejectedValue(new Error("tx failed"));
      db = makeDb({ transaction: vi.fn(() => ({ execute: txExecute })) });
      const repo = new GameRepository(db);

      const result = await repo.withTransaction(() => Promise.resolve("irrelevant"));

      expect(result).toEqual(err(GameRepositoryError.UnknownError));
    });
  });
});
