import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GameService } from './game.service.ts';

/**
 * Scheduling for the game module. Keeps the cron wiring out of the service so
 * the service stays callable - and testable - without a scheduler.
 */
@Injectable()
export class GameTasks {
  constructor(private readonly game: GameService) {}

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async sweepExpiredClocks(): Promise<void> {
    await this.game.sweepExpiredClocks();
  }

  @Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
  async sweepAbandonedGames(): Promise<void> {
    await this.game.sweepAbandonedGames();
  }
}
