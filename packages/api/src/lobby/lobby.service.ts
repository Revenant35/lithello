import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_POOL } from '../redis/redis-pool.provider.ts';
import type { RedisClientPoolType } from 'redis';
import type { Lobby, LobbyID, User } from '@lithello/shared';
import { randomUUID } from 'node:crypto';
import { err, ok, Result } from 'neverthrow';

const LOBBY_LIFETIME_MS = 15 * 60 * 1000;

enum LobbyServiceError {
  LobbyAlreadyExists = 'Lobby Already Exists',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);

  constructor(
    @Inject(REDIS_POOL) private readonly redis: RedisClientPoolType,
  ) {}

  async createLobby(args: {
    host: User;
  }): Promise<Result<LobbyID, LobbyServiceError>> {
    const lobby: Lobby = {
      id: randomUUID() as LobbyID,
      host: {
        id: args.host.id,
        name: args.host.name,
        ready: false,
      },
      expiresAt: new Date(Date.now() + LOBBY_LIFETIME_MS),
      status: 'open',
      gameSettings: {},
    };

    const key = this.getLobbyKey(lobby.id);
    let result: string | null | undefined;
    try {
      result = await this.redis.set(key, JSON.stringify(lobby), {
        expiration: {
          type: 'PXAT',
          value: lobby.expiresAt.getTime(),
        },
        condition: 'NX',
      });
    } catch (error) {
      this.logger.error(error);
      return err(LobbyServiceError.UnknownError);
    }

    if (result !== 'OK') {
      return err(LobbyServiceError.LobbyAlreadyExists);
    }

    return ok(lobby.id);
  }

  private getLobbyKey(lobbyId: LobbyID): string {
    return `lobby:${lobbyId}`;
  }
}
