import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { RedisModule } from "../redis/redis.module.ts";
import { GameRepository } from "./game.repository.ts";
import { GameService } from "./game.service.ts";
import { GameSessionRepository } from "./game-session.repository.ts";

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [GameRepository, GameService, GameSessionRepository],
  exports: [GameService],
})
export class GameModule {}
