import { Injectable, Logger } from "@nestjs/common";
import { err, ok, ResultAsync } from "neverthrow";
import { type GameID, type UserID, UserIDSchema } from "@lithello/shared/types";
import { RedisService, RedisServiceError } from "../redis/redis.service.ts";

export enum GameSessionRepositoryError {
  UnknownError = "Unknown Error",
  ParseError = "Parse Error",
  Conflict = "Conflict",
}

@Injectable()
export class GameSessionRepository {
  private readonly logger = new Logger(GameSessionRepository.name);

  constructor(private readonly redis: RedisService) {}

  setDrawOffer(args: {
    game_id: GameID;
    user_id: UserID;
  }): ResultAsync<void, GameSessionRepositoryError> {
    const { user_id } = args;

    return this.redis
      .setJson({
        key: this.getDrawKey(args),
        value: user_id,
        condition: "NX",
      })
      .mapErr((error) => {
        switch (error) {
          case RedisServiceError.Conflict:
            return GameSessionRepositoryError.Conflict;
          default:
            return GameSessionRepositoryError.UnknownError;
        }
      });
  }

  getDrawOffer(args: { game_id: GameID }): ResultAsync<UserID | null, GameSessionRepositoryError> {
    return this.redis
      .getJson({
        key: this.getDrawKey(args),
      })
      .mapErr(() => GameSessionRepositoryError.UnknownError)
      .andThen((res) => {
        if (!res) {
          return ok(null);
        }

        const parseResult = UserIDSchema.safeParse(res);
        if (!parseResult.success) {
          this.logger.error(parseResult.error);
          return err(GameSessionRepositoryError.ParseError);
        }

        return ok(parseResult.data);
      });
  }

  clearDrawOffer(args: { game_id: GameID }): ResultAsync<void, GameSessionRepositoryError> {
    return this.redis
      .deleteJson({
        key: this.getDrawKey(args),
      })
      .mapErr(() => GameSessionRepositoryError.UnknownError);
  }

  setRematchRequest(args: {
    game_id: GameID;
    user_id: UserID;
  }): ResultAsync<void, GameSessionRepositoryError> {
    const { user_id } = args;

    return this.redis
      .setJson({
        key: this.getRematchKey(args),
        value: user_id,
        condition: "NX",
      })
      .mapErr((error) => {
        switch (error) {
          case RedisServiceError.Conflict:
            return GameSessionRepositoryError.Conflict;
          default:
            return GameSessionRepositoryError.UnknownError;
        }
      });
  }

  clearRematchRequest(args: { game_id: GameID }): ResultAsync<void, GameSessionRepositoryError> {
    return this.redis
      .deleteJson({
        key: this.getRematchKey(args),
      })
      .mapErr(() => GameSessionRepositoryError.UnknownError);
  }

  private getDrawKey(args: { game_id: GameID }): string {
    return `game:${args.game_id}:draw-offer`;
  }

  private getRematchKey(args: { game_id: GameID }): string {
    return `game:${args.game_id}:rematch-request`;
  }
}
