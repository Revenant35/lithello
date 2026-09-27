import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { GameID, UserID } from '@lithello/shared';
import { Subject } from 'rxjs';

export type ClockExpiredEvent = { gameId: GameID; userId: UserID };

@Injectable()
export class GameTasks {
  private readonly logger = new Logger(GameTasks.name);

  private readonly _clockExpired$ = new Subject<ClockExpiredEvent>();
  public readonly clockExpired$ = this._clockExpired$.asObservable();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  scheduleClock(args: {
    gameId: GameID;
    userId: UserID;
    expiresAt: Date;
  }): void {
    const { gameId, userId, expiresAt } = args;

    this.cancelClock({ gameId });

    const delayMs = Math.max(0, expiresAt.getTime() - Date.now());
    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(this.getTimeoutName({ gameId }));
      this._clockExpired$.next({ gameId, userId });
    }, delayMs);

    this.schedulerRegistry.addTimeout(this.getTimeoutName({ gameId }), timeout);
  }

  cancelClock(args: { gameId: GameID }): void {
    const name = this.getTimeoutName(args);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private getTimeoutName(args: { gameId: GameID }): string {
    return `game:${args.gameId}:clock`;
  }
}
