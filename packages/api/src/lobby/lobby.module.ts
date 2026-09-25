import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller.js';
import { LobbyService } from './lobby.service.js';
import { LobbyGateway } from './lobby.gateway.js';
import { LobbyRepository } from './lobby.repository.js';

@Module({
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway, LobbyRepository],
})
export class LobbyModule {}
