import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller.ts';
import { LobbyService } from './lobby.service.ts';
import { LobbyGateway } from './lobby.gateway.ts';
import { LobbyRepository } from './lobby.repository.ts';
import { PresenceModule } from '../presence/presence.module.ts';
import { RedisModule } from '../redis/redis.module.ts';

@Module({
  imports: [PresenceModule, RedisModule],
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway, LobbyRepository],
})
export class LobbyModule {}
