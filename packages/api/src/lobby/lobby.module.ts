import { Module } from '@nestjs/common';
import { LobbyController } from './lobby.controller.ts';
import { LobbyService } from './lobby.service.ts';
import { LobbyGateway } from './lobby.gateway.ts';
import { LobbyRepository } from './lobby.repository.ts';

@Module({
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway, LobbyRepository],
})
export class LobbyModule {}
