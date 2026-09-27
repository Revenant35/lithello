import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller.ts';
import { LobbyService } from './lobby.service.ts';
import { LobbyGateway } from './lobby.gateway.ts';
import { LobbyRepository } from './lobby.repository.ts';
import { LobbyTasks } from './lobby.tasks.ts';
import { PresenceModule } from '../presence/presence.module.ts';
import { RedisModule } from '../redis/redis.module.ts';
import { GameModule } from '../game/game.module.ts';

@Module({
  imports: [PresenceModule, RedisModule, GameModule],
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway, LobbyRepository, LobbyTasks],
})
export class LobbyModule {}
