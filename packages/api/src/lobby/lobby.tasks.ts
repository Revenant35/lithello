import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Lobby, LobbyID, UserID } from '@lithello/shared';
import { LobbyService } from './lobby.service.ts';
import { PresenceService } from '../presence/presence.service.ts';

const LOBBY_MEMBER_LIFETIME_MS = 15 * 1000;
const GAME_START_DELAY_MS = 1000;

@Injectable()
export class LobbyTasks {
  private readonly logger = new Logger(LobbyTasks.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly presence: PresenceService,
    private readonly lobbyService: LobbyService,
  ) {
    this.lobbyService.lobbyReady$.subscribe(({ lobbyId }) => {
      this.scheduleGameStart({ lobbyId, delayMs: GAME_START_DELAY_MS });
    });

    this.lobbyService.lobbyUnready$.subscribe(({ lobbyId }) => {
      this.cancelGameStart({ lobbyId });
    });

    this.lobbyService.lobbyCreated$.subscribe(({ lobby }) => {
      this.scheduleLobbyDestruction({ lobby });
    });

    this.presence.lobbyConnections$.subscribe(
      ({ userId, lobbyId, isConnected }) => {
        if (isConnected) {
          this.cancelLobbyMemberKick({ userId, lobbyId });
        } else {
          this.scheduleLobbyMemberKick({ userId, lobbyId });
        }
      },
    );
  }

  private scheduleLobbyDestruction(args: { lobby: Lobby }): void {
    const { lobby } = args;

    const key = this.getLobbyDestructionKey({ lobbyId: lobby.id });
    const durationMs =
      lobby.expiresAt.getTime() - new Date(Date.now()).getTime();

    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(key);
      this.lobbyService
        .destroy({ lobbyId: lobby.id })
        .catch((error) => this.logger.error(error));
    }, durationMs);

    this.schedulerRegistry.addTimeout(key, timeout);
  }

  private scheduleGameStart(args: { lobbyId: LobbyID; delayMs: number }): void {
    const { lobbyId, delayMs } = args;

    this.cancelGameStart({ lobbyId });

    const key = this.getGameStartKey({ lobbyId });
    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(key);
      this.lobbyService
        .startGame({ lobbyId })
        .catch((error) => this.logger.error(error));
    }, delayMs);

    this.schedulerRegistry.addTimeout(key, timeout);
  }

  private scheduleLobbyMemberKick(args: {
    lobbyId: LobbyID;
    userId: UserID;
  }): void {
    const { lobbyId, userId } = args;

    this.cancelLobbyMemberKick(args);

    const key = this.getLobbyMemberKickKey(args);
    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(key);
      this.lobbyService
        .removeUser({ lobbyId, userId })
        .catch((error) => this.logger.error(error));
    }, LOBBY_MEMBER_LIFETIME_MS);

    this.schedulerRegistry.addTimeout(key, timeout);
  }

  private cancelGameStart(args: { lobbyId: LobbyID }): void {
    const name = this.getGameStartKey(args);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private cancelLobbyMemberKick(args: {
    lobbyId: LobbyID;
    userId: UserID;
  }): void {
    const name = this.getLobbyMemberKickKey(args);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private getLobbyDestructionKey(args: { lobbyId: LobbyID }): string {
    return `lobby:${args.lobbyId}:destroy`;
  }

  private getLobbyMemberKickKey(args: {
    lobbyId: LobbyID;
    userId: UserID;
  }): string {
    return `lobby:${args.lobbyId}:user:${args.userId}:kick`;
  }

  private getGameStartKey(args: { lobbyId: LobbyID }): string {
    return `lobby:${args.lobbyId}:game-start`;
  }
}
