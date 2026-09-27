import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway.ts';
import { GameRepository } from './game.repository.ts';
import { GameService } from './game.service.ts';
import { PresenceModule } from '../presence/presence.module.ts';
import { DatabaseModule } from '../database/database.module.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { GameTasks } from './game.tasks.ts';
import { OthelloService } from './othello.service.ts';

@Module({
  imports: [PresenceModule, DatabaseModule, AuthModule],
  providers: [
    GameGateway,
    GameRepository,
    GameService,
    GameTasks,
    OthelloService,
  ],
  exports: [GameService],
})
export class GameModule {}
