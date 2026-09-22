import { Module } from "@nestjs/common";
import { SessionGateway } from "./session.gateway.ts";
import { LobbyService } from "./lobby.service.ts";
import { SessionRepository } from "./session.repository.ts";
import { SessionService } from "./session.service.ts";
import { AuthModule } from "../auth/auth.module.ts";
import { RedisModule } from "../redis/redis.module.ts";
import { GameService } from "./game.service.ts";
import { PostGameService } from "./post-game.service.ts";

@Module({
  imports: [AuthModule, RedisModule],
  providers: [
    SessionService,
    SessionRepository,
    LobbyService,
    SessionGateway,
    GameService,
    PostGameService,
  ],
})
export class SessionModule {}
