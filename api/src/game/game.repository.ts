import { Inject, Injectable, Logger } from "@nestjs/common";
import { Kysely, NoResultError } from "kysely";
import { ResultAsync } from "neverthrow";
import { KYSELY } from "../database/kysely.provider.ts";
import {
  type DatabaseSchema,
  type GameRowUpdate,
  type NewGameActionRow,
  type NewGameMessageRow,
  type NewGameRow,
} from "../database/database-schema.ts";
import {
  Game,
  GameAction,
  GameActionSchema,
  GameID,
  GameMessage,
  GameMessageSchema,
  GameSchema,
} from "@lithello/shared/types";
import { ZodError } from "zod";

export enum GameRepositoryError {
  NotFound = "Not Found",
  ParseError = "Parse Error",
  UnknownError = "Unknown Error",
}

export class GameRepositoryClient {
  constructor(private readonly connection: Kysely<DatabaseSchema>) {}

  async insertGame(game: NewGameRow): Promise<Game> {
    const row = await this.connection
      .insertInto("game")
      .values(game)
      .returningAll()
      .executeTakeFirstOrThrow();
    return GameSchema.parse(row);
  }

  async updateGame(id: GameID, update: GameRowUpdate): Promise<Game> {
    const row = await this.connection
      .updateTable("game")
      .set(update)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return GameSchema.parse(row);
  }

  async findGameById(id: GameID): Promise<Game> {
    const row = await this.connection
      .selectFrom("game")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
    return GameSchema.parse(row);
  }

  async insertAction(action: NewGameActionRow): Promise<GameAction> {
    const row = await this.connection
      .insertInto("game_action")
      .values(action)
      .returningAll()
      .executeTakeFirstOrThrow();
    return GameActionSchema.parse(row);
  }

  async findActionsByGameId(gameId: GameID): Promise<GameAction[]> {
    const rows = await this.connection
      .selectFrom("game_action")
      .selectAll()
      .where("game_id", "=", gameId)
      .orderBy("action_number", "asc")
      .execute();
    return rows.map((row) => GameActionSchema.parse(row));
  }

  async insertMessage(message: NewGameMessageRow): Promise<GameMessage> {
    const row = await this.connection
      .insertInto("game_message")
      .values(message)
      .returningAll()
      .executeTakeFirstOrThrow();
    return GameMessageSchema.parse(row);
  }

  async findMessagesByGameId(gameId: GameID): Promise<GameMessage[]> {
    let rows = await this.connection
      .selectFrom("game_message")
      .selectAll()
      .where("game_id", "=", gameId)
      .orderBy("created_at", "asc")
      .execute();
    return rows.map((row) => GameMessageSchema.parse(row));
  }
}

@Injectable()
export class GameRepository {
  private readonly logger = new Logger(GameRepository.name);
  private readonly client: GameRepositoryClient;

  constructor(@Inject(KYSELY) private readonly db: Kysely<DatabaseSchema>) {
    this.client = new GameRepositoryClient(this.db);
  }

  withClient<T>(
    operation: (client: GameRepositoryClient) => Promise<T>,
  ): ResultAsync<T, GameRepositoryError> {
    return ResultAsync.fromPromise(operation(this.client), this.handleError);
  }

  withTransaction<T>(
    operation: (client: GameRepositoryClient) => Promise<T>,
  ): ResultAsync<T, GameRepositoryError> {
    return ResultAsync.fromPromise(
      this.db.transaction().execute((trx) => {
        const client = new GameRepositoryClient(trx);
        return operation(client);
      }),
      this.handleError,
    );
  }

  private readonly handleError = (error: unknown): GameRepositoryError => {
    if (error instanceof NoResultError) {
      return GameRepositoryError.NotFound;
    }

    this.logger.error(error);

    if (error instanceof ZodError) {
      return GameRepositoryError.ParseError;
    }

    return GameRepositoryError.UnknownError;
  };
}
