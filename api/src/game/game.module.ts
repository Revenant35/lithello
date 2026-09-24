import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { RedisModule } from "../redis/redis.module.ts";
import { GameRepository } from "./game.repository.ts";
import { GameService } from "./game.service.ts";
import { GameSessionRepository } from "./game-session.repository.ts";
import { GameSessionService } from "./game-session.service.ts";

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [GameRepository, GameService, GameSessionRepository, GameSessionService],
  exports: [GameService, GameSessionService],
})
export class GameModule {}
