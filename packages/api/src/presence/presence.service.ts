import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_POOL } from '../redis/redis-pool.provider.ts';
import { randomUUID } from 'node:crypto';
import type { AppRedisPool } from '../redis/app-redis-pool.type.ts';
import { GameID, LobbyID, UserID, UserIDSchema } from '@lithello/shared';
import { Subject } from 'rxjs';
import { UserConnectionEvent } from './user-connection-event.type.ts';
import { LobbyConnectionEvent } from './lobby-connection-event.type.ts';
import { LobbyEntryCodec } from './lobby-entry.type.ts';
import { GameConnectionEvent } from './game-connection-event.type.ts';
import { GameEntryCodec } from './game-entry.type.ts';

const PROCESS_ID = randomUUID();

const GLOBAL_PROCESSES = 'processes';
const GLOBAL_USER_CONNECTIONS = 'user-connections';
const GLOBAL_LOBBY_CONNECTIONS = 'lobby-connections';
const GLOBAL_GAME_CONNECTIONS = 'game-connections';

const PROCESS_HEARTBEAT = livenessKey(PROCESS_ID);
const PROCESS_USER_CONNECTIONS = userConnectionsKey(PROCESS_ID);
const PROCESS_LOBBY_CONNECTIONS = lobbyConnectionsKey(PROCESS_ID);
const PROCESS_GAME_CONNECTIONS = gameConnectionsKey(PROCESS_ID);

function livenessKey(processId: string): string {
  return `${processId}:is-up`;
}

function userConnectionsKey(processId: string): string {
  return `${processId}:${GLOBAL_USER_CONNECTIONS}`;
}

function lobbyConnectionsKey(processId: string): string {
  return `${processId}:${GLOBAL_LOBBY_CONNECTIONS}`;
}

function gameConnectionsKey(processId: string): string {
  return `${processId}:${GLOBAL_GAME_CONNECTIONS}`;
}

@Injectable()
export class PresenceService {
  private readonly heartbeatTtlSeconds: number;

  constructor(
    @Inject(REDIS_POOL) private readonly redis: AppRedisPool,
    config: ConfigService,
  ) {
    this.heartbeatTtlSeconds = Number(
      config.get('PRESENCE_HEARTBEAT_TTL_SECONDS', 10),
    );
  }

  private readonly logger = new Logger(PresenceService.name);

  private readonly _userConnections$ = new Subject<UserConnectionEvent>();
  public readonly userConnections$ = this._userConnections$.asObservable();

  private readonly _lobbyConnections$ = new Subject<LobbyConnectionEvent>();
  public readonly lobbyConnections$ = this._lobbyConnections$.asObservable();

  private readonly _gameConnections$ = new Subject<GameConnectionEvent>();
  public readonly gameConnections$ = this._gameConnections$.asObservable();

  async registerProcess(): Promise<void> {
    await this.redis
      .multi()
      .sAdd(GLOBAL_PROCESSES, PROCESS_ID)
      .set(PROCESS_HEARTBEAT, '1', {
        expiration: { type: 'EX', value: this.heartbeatTtlSeconds },
      })
      .exec();
  }

  async refreshHeartbeat(): Promise<void> {
    const renewed = await this.redis.expire(
      PROCESS_HEARTBEAT,
      this.heartbeatTtlSeconds,
    );

    if (!renewed) {
      this.logger.fatal('Presence heartbeat expired!');
      process.exit(1);
    }
  }

  async cleanupDeadProcesses(): Promise<void> {
    const processIds = await this.redis.sMembers(GLOBAL_PROCESSES);

    if (processIds.length === 0) {
      return;
    }

    const states = await this.redis.mGet(processIds.map(livenessKey));

    await Promise.all(
      processIds
        .filter((processId, index) => states[index] !== '1')
        .map((processId) => this.cleanupDeadProcess(processId)),
    );
  }

  async isUserConnected(args: { userId: UserID }): Promise<boolean> {
    const entry = args.userId;
    const result = await this.redis.hExists(GLOBAL_USER_CONNECTIONS, entry);
    return result === 1;
  }

  async isUserConnectedToLobby(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<boolean> {
    const entry = LobbyEntryCodec.encode(args);
    const result = await this.redis.hExists(GLOBAL_LOBBY_CONNECTIONS, entry);
    return result === 1;
  }

  async isUserConnectedToGame(args: {
    userId: UserID;
    gameId: GameID;
  }): Promise<boolean> {
    const entry = GameEntryCodec.encode(args);
    const result = await this.redis.hExists(GLOBAL_GAME_CONNECTIONS, entry);
    return result === 1;
  }

  async onLobbyConnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<void> {
    const { userId, lobbyId } = args;

    const lobbyEntry = LobbyEntryCodec.encode(args);
    const [connections, lobbyConnections] = await this.redis
      .multi()
      .adjustConnection(
        GLOBAL_USER_CONNECTIONS,
        PROCESS_USER_CONNECTIONS,
        PROCESS_HEARTBEAT,
        userId,
        1,
      )
      .adjustConnection(
        GLOBAL_LOBBY_CONNECTIONS,
        PROCESS_LOBBY_CONNECTIONS,
        PROCESS_HEARTBEAT,
        lobbyEntry,
        1,
      )
      .execTyped();

    if (connections === 1) {
      this._userConnections$.next({ userId, isConnected: true });
    }

    if (lobbyConnections === 1) {
      this._lobbyConnections$.next({ userId, lobbyId, isConnected: true });
    }
  }

  async onLobbyDisconnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<void> {
    const { userId, lobbyId } = args;

    const lobbyEntry = LobbyEntryCodec.encode(args);
    const [connections, lobbyConnections] = await this.redis
      .multi()
      .adjustConnection(
        GLOBAL_USER_CONNECTIONS,
        PROCESS_USER_CONNECTIONS,
        PROCESS_HEARTBEAT,
        userId,
        -1,
      )
      .adjustConnection(
        GLOBAL_LOBBY_CONNECTIONS,
        PROCESS_LOBBY_CONNECTIONS,
        PROCESS_HEARTBEAT,
        lobbyEntry,
        -1,
      )
      .execTyped();

    if (connections === 0) {
      this._userConnections$.next({ userId, isConnected: false });
    }

    if (lobbyConnections === 0) {
      this._lobbyConnections$.next({ userId, lobbyId, isConnected: false });
    }
  }

  async onGameConnect(args: { userId: UserID; gameId: GameID }): Promise<void> {
    const { userId, gameId } = args;

    const gameEntry = GameEntryCodec.encode(args);
    const [connections, gameConnections] = await this.redis
      .multi()
      .adjustConnection(
        GLOBAL_USER_CONNECTIONS,
        PROCESS_USER_CONNECTIONS,
        PROCESS_HEARTBEAT,
        userId,
        1,
      )
      .adjustConnection(
        GLOBAL_GAME_CONNECTIONS,
        PROCESS_GAME_CONNECTIONS,
        PROCESS_HEARTBEAT,
        gameEntry,
        1,
      )
      .execTyped();

    if (connections === 1) {
      this._userConnections$.next({ userId, isConnected: true });
    }

    if (gameConnections === 1) {
      this._gameConnections$.next({ userId, gameId, isConnected: true });
    }
  }

  async onGameDisconnect(args: {
    userId: UserID;
    gameId: GameID;
  }): Promise<void> {
    const { userId, gameId } = args;

    const gameEntry = GameEntryCodec.encode(args);
    const [connections, gameConnections] = await this.redis
      .multi()
      .adjustConnection(
        GLOBAL_USER_CONNECTIONS,
        PROCESS_USER_CONNECTIONS,
        PROCESS_HEARTBEAT,
        userId,
        -1,
      )
      .adjustConnection(
        GLOBAL_GAME_CONNECTIONS,
        PROCESS_GAME_CONNECTIONS,
        PROCESS_HEARTBEAT,
        gameEntry,
        -1,
      )
      .execTyped();

    if (connections === 0) {
      this._userConnections$.next({ userId, isConnected: false });
    }

    if (gameConnections === 0) {
      this._gameConnections$.next({ userId, gameId, isConnected: false });
    }
  }

  private async cleanupDeadProcess(processId: string) {
    const [disconnectedUsers, disconnectedLobbies, disconnectedGames] =
      await this.redis
        .multi()
        .cleanup(GLOBAL_USER_CONNECTIONS, userConnectionsKey(processId))
        .cleanup(GLOBAL_LOBBY_CONNECTIONS, lobbyConnectionsKey(processId))
        .cleanup(GLOBAL_GAME_CONNECTIONS, gameConnectionsKey(processId))
        .sRem(GLOBAL_PROCESSES, processId)
        .execTyped();

    disconnectedUsers.forEach((entry) => this.onUserCleanup(entry));
    disconnectedLobbies.forEach((entry) => this.onLobbyCleanup(entry));
    disconnectedGames.forEach((entry) => this.onGameCleanup(entry));
  }

  private onUserCleanup(entry: string) {
    const result = UserIDSchema.safeParse(entry);
    if (!result.success) {
      this.logger.error(result.error);
      return;
    }

    this._userConnections$.next({
      userId: result.data,
      isConnected: false,
    });
  }

  private onLobbyCleanup(entry: string) {
    const result = LobbyEntryCodec.safeDecode(entry);
    if (!result.success) {
      this.logger.error(result.error);
      return;
    }

    const { lobbyId, userId } = result.data;

    this._lobbyConnections$.next({
      userId,
      lobbyId,
      isConnected: false,
    });
  }

  private onGameCleanup(entry: string) {
    const result = GameEntryCodec.safeDecode(entry);
    if (!result.success) {
      this.logger.error(result.error);
      return;
    }

    const { gameId, userId } = result.data;

    this._gameConnections$.next({
      userId,
      gameId,
      isConnected: false,
    });
  }
}
