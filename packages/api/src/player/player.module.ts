import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.ts';
import { PlayerRepository } from './player.repository.ts';

@Module({
  imports: [DatabaseModule],
  providers: [PlayerRepository],
  exports: [PlayerRepository],
})
export class PlayerModule {}
