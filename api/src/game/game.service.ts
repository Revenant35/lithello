import { Injectable } from "@nestjs/common";
import { ResultAsync } from "neverthrow";
import type {
  Game,
  GameAction,
  GameCompletion,
  GameEndReason,
  GameID,
  GameMessage,
  GameResult,
  TurnAction,
  UserID,
} from "@lithello/shared/types";
import { GameRepository, GameRepositoryError } from "./game.repository.ts";

@Injectable()
export class GameService {
  constructor(private readonly repository: GameRepository) {}

  // TODO: Wire this up to the larger app!
  recordGameStart(args: {
    white_id: UserID;
    black_id: UserID;
    start_clock_ms: number;
  }): ResultAsync<Game, GameRepositoryError> {
    const { white_id, black_id, start_clock_ms } = args;

    return this.repository.withClient((client) =>
      client.insertGame({ white_id, black_id, start_clock_ms, status: "active" }),
    );
  }

  // TODO: Wire this up to the larger app!
  recordAction(args: {
    game_id: GameID;
    user_id: UserID;
    action_number: number;
    action: TurnAction;
    clock_ms_remaining: number;
  }): ResultAsync<GameAction, GameRepositoryError> {
    const { game_id, user_id, action_number, action, clock_ms_remaining } = args;

    return this.repository.withClient((client) =>
      client.insertAction({
        game_id,
        user_id,
        action_number,
        kind: action.kind,
        clock_ms_remaining,
        row: action.kind === "move" ? action.location.row : null,
        col: action.kind === "move" ? action.location.col : null,
      }),
    );
  }

  // TODO: Wire this up to the larger app!
  recordGameEnd(args: {
    game_id: GameID;
    completion: GameCompletion;
  }): ResultAsync<Game, GameRepositoryError> {
    const { game_id, completion } = args;

    return this.repository.withTransaction(async (client) => {
      const game = await client.findGameById(game_id);
      return client.updateGame(game_id, {
        status: "finished",
        result: this.completionToResult(completion, game.white_id),
        end_reason: this.completionToEndReason(completion),
        ended_at: new Date(),
      });
    });
  }

  // TODO: Wire this up to the larger app!
  recordMessage(args: {
    game_id: GameID;
    user_id: UserID;
    content: string;
  }): ResultAsync<GameMessage, GameRepositoryError> {
    const { game_id, user_id, content } = args;

    return this.repository.withClient((client) =>
      client.insertMessage({ game_id, user_id, content }),
    );
  }

  completionToResult(completion: GameCompletion, white_id: UserID): GameResult {
    if (completion.reason === "draw") return "draw";
    if (completion.reason === "resignation") {
      return completion.resignerId === white_id ? "black_win" : "white_win";
    }
    return completion.winnerId === white_id ? "white_win" : "black_win";
  }

  completionToEndReason(completion: GameCompletion): GameEndReason {
    if (completion.reason === "resignation") return "resignation";
    if (completion.reason === "timeout") return "timeout";
    return "normal";
  }
}
