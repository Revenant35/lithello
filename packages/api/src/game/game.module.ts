import { Module } from '@nestjs/common';
import { GameController } from './game.controller.ts';
import { GameGateway } from './game.gateway.ts';
import { GameAbandonmentService } from './game-abandonment.service.ts';
import { GameRepository } from './game.repository.ts';
import { GameService } from './game.service.ts';
import { GameTasks } from './game.tasks.ts';
import { PresenceModule } from '../presence/presence.module.ts';
import { DatabaseModule } from '../database/database.module.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { PlayerModule } from '../player/player.module.ts';
import { RedisModule } from '../redis/redis.module.ts';

@Module({
  imports: [PresenceModule, DatabaseModule, AuthModule, PlayerModule, RedisModule],
  controllers: [GameController],
  providers: [
    GameGateway,
    GameAbandonmentService,
    GameRepository,
    GameService,
    GameTasks,
  ],
  exports: [GameService],
})
export class GameModule {}
