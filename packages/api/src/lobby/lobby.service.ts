import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_POOL } from '../redis/redis-pool.provider.ts';
import { LobbySchema, type Lobby, type LobbyID, type User } from '@lithello/shared';
import { randomUUID } from 'node:crypto';
import { err, ok, Result } from 'neverthrow';
import type { AppRedisPool } from '../redis/app-redis-pool.type.ts';

const LOBBY_LIFETIME_MS = 15 * 60 * 1000;

enum LobbyServiceError {
  LobbyAlreadyExists = 'Lobby Already Exists',
  GuestAlreadyExists = 'Guest Already Exists',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);

  constructor(@Inject(REDIS_POOL) private readonly redis: AppRedisPool) {}

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
    let result: string | null;
    try {
      result = await this.redis.json.set(key, '$', lobby, {
        condition: 'NX',
      });
    } catch (error) {
      this.logger.error(error);
      return err(LobbyServiceError.UnknownError);
    }

    if (result !== 'OK') {
      return err(LobbyServiceError.LobbyAlreadyExists);
    }

    try {
      await this.redis.pExpireAt(key, lobby.expiresAt.getTime());
    } catch (error) {
      this.logger.error(error);
      return err(LobbyServiceError.UnknownError);
    }

    return ok(lobby.id);
  }

  async getLobby(
    lobbyId: LobbyID,
  ): Promise<Result<Lobby | null, LobbyServiceError>> {
    const key = this.getLobbyKey(lobbyId);

    let raw: unknown;
    try {
      raw = await this.redis.json.get(key);
    } catch (error) {
      this.logger.error(error);
      return err(LobbyServiceError.UnknownError);
    }

    if (raw === null) {
      return ok(null);
    }

    const result = LobbySchema.safeParse(raw);
    if (!result.success) {
      this.logger.error(result.error);
      return err(LobbyServiceError.UnknownError);
    }

    return ok(result.data);
  }

  async addGuest(args: {
    lobbyId: LobbyID;
    guest: User;
  }): Promise<Result<void, LobbyServiceError>> {
    const key = this.getLobbyKey(args.lobbyId);
    const guest = {
      id: args.guest.id,
      name: args.guest.name,
      ready: false,
    };

    let result: string | null;
    try {
      result = await this.redis.json.set(key, '$.guest', guest, {
        condition: 'NX',
      });
    } catch (error) {
      this.logger.error(error);
      return err(LobbyServiceError.UnknownError);
    }

    if (result !== 'OK') {
      return err(LobbyServiceError.GuestAlreadyExists);
    }

    return ok(undefined);
  }

  private getLobbyKey(lobbyId: LobbyID): string {
    return `lobby:${lobbyId}`;
  }
}
