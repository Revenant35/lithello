import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.ts';
import { DatabaseModule } from '../database/database.module.ts';
import { PlayerController } from './player.controller.ts';
import { PlayerRepository } from './player.repository.ts';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PlayerController],
  providers: [PlayerRepository],
  exports: [PlayerRepository],
})
export class PlayerModule {}
