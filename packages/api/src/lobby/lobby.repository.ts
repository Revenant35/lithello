import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_POOL } from '../redis/redis-pool.provider.ts';
import {
  LobbySchema,
  type ConnectionState,
  type Lobby,
  type LobbyID,
  type LobbyMember,
  type UserID,
} from '@lithello/shared';
import { err, ok, Result } from 'neverthrow';
import type { AppRedisPool } from '../redis/app-redis-pool.type.ts';

export enum LobbyRepositoryError {
  AlreadyExists = 'Lobby Already Exists',
  NotFound = 'Lobby Not Found',
  NoGuestToPromote = 'No Guest To Promote',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class LobbyRepository {
  private readonly logger = new Logger(LobbyRepository.name);

  constructor(@Inject(REDIS_POOL) private readonly redis: AppRedisPool) {}

  async create(args: {
    lobby: Lobby;
  }): Promise<Result<Lobby, LobbyRepositoryError>> {
    const { lobby } = args;

    const key = this.getLobbyKey(lobby.id);

    let result: string | null;
    try {
      result = await this.redis.json.set(key, '$', lobby, {
        condition: 'NX',
      });
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    if (result !== 'OK') {
      return err(LobbyRepositoryError.AlreadyExists);
    }

    try {
      await this.redis.pExpireAt(key, lobby.expiresAt.getTime());
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok(lobby);
  }

  async createGuest(args: {
    lobbyId: LobbyID;
    guest: LobbyMember;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, guest } = args;

    const key = this.getLobbyKey(lobbyId);

    try {
      const result = await this.redis.json.set(key, '$.guest', guest, {
        condition: 'NX',
      });

      if (result !== 'OK') {
        return err(LobbyRepositoryError.AlreadyExists);
      }
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok();
  }

  async get(args: {
    lobbyId: LobbyID;
  }): Promise<Result<Lobby | null, LobbyRepositoryError>> {
    const { lobbyId } = args;

    const key = this.getLobbyKey(lobbyId);

    let raw: unknown;
    try {
      raw = await this.redis.json.get(key);
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    if (raw === null) {
      return ok(null);
    }

    const result = LobbySchema.safeParse(raw);
    if (!result.success) {
      this.logger.error(result.error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok(result.data);
  }

  async getRequired(args: {
    lobbyId: LobbyID;
  }): Promise<Result<Lobby, LobbyRepositoryError>> {
    const result = await this.get(args);

    if (result.isErr()) {
      return err(result.error);
    }

    if (result.value === null) {
      return err(LobbyRepositoryError.NotFound);
    }

    return ok(result.value);
  }

  async setReadiness(args: {
    lobbyId: LobbyID;
    userId: UserID;
    isReady: boolean;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId, isReady } = args;

    const key = this.getLobbyKey(lobbyId);
    const path = this.getMemberPath(userId, 'isReady');

    try {
      const result = await this.redis.json.set(key, path, isReady, {
        condition: 'XX',
      });

      if (result !== 'OK') {
        return err(LobbyRepositoryError.NotFound);
      }
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok();
  }

  async setConnectivity(args: {
    lobbyId: LobbyID;
    userId: UserID;
    connection: ConnectionState;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId, connection } = args;

    const key = this.getLobbyKey(lobbyId);
    const path = this.getMemberPath(userId, 'connection');

    try {
      const result = await this.redis.json.set(key, path, connection, {
        condition: 'XX',
      });

      if (result !== 'OK') {
        return err(LobbyRepositoryError.NotFound);
      }
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok();
  }

  async delete(args: {
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId } = args;

    const key = this.getLobbyKey(lobbyId);

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok(undefined);
  }

  async deleteGuest(args: {
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId } = args;

    const key = this.getLobbyKey(lobbyId);

    try {
      await this.redis.json.del(key, {
        path: '$.guest',
      });
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok();
  }

  async promoteGuest(args: {
    lobbyId: LobbyID;
  }): Promise<Result<Lobby, LobbyRepositoryError>> {
    const { lobbyId } = args;

    const key = this.getLobbyKey(lobbyId);

    let raw: string | null;
    try {
      raw = await this.redis.promoteGuest(key);
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    if (raw === null) {
      return err(LobbyRepositoryError.NoGuestToPromote);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    const result = LobbySchema.safeParse(parsed);
    if (!result.success) {
      this.logger.error(result.error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok(result.data);
  }

  private getLobbyKey(lobbyId: LobbyID): string {
    return `lobby:${lobbyId}`;
  }

  private getMemberPath(userId: UserID, field: string): string {
    return `$[?(@.id=="${userId}")].${field}`;
  }
}
