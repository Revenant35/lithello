import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { LobbyID } from '@lithello/shared';
import { Subject } from 'rxjs';

export type GameStartDueEvent = { lobbyId: LobbyID };

@Injectable()
export class LobbyTasks {
  private readonly logger = new Logger(LobbyTasks.name);

  private readonly _gameStartDue$ = new Subject<GameStartDueEvent>();
  public readonly gameStartDue$ = this._gameStartDue$.asObservable();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  scheduleGameStart(args: { lobbyId: LobbyID; delayMs: number }): void {
    const { lobbyId, delayMs } = args;

    this.cancelGameStart({ lobbyId });

    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(this.getTimeoutName({ lobbyId }));
      this._gameStartDue$.next({ lobbyId });
    }, delayMs);

    this.schedulerRegistry.addTimeout(this.getTimeoutName({ lobbyId }), timeout);
  }

  cancelGameStart(args: { lobbyId: LobbyID }): void {
    const name = this.getTimeoutName(args);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private getTimeoutName(args: { lobbyId: LobbyID }): string {
    return `lobby:${args.lobbyId}:game-start`;
  }
}
