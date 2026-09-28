import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis-client.provider.ts';
import {
  LobbySchema,
  type ClosedLobby,
  type GameID,
  type Lobby,
  type LobbyID,
  type LobbyMember,
  type OpenLobby,
  type UserID,
} from '@lithello/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import type { AppRedisClient } from '../redis/app-redis-client.type.ts';
import { RedisJSON } from 'redis';

export enum LobbyRepositoryError {
  AlreadyExists = 'Lobby Already Exists',
  NotFound = 'Lobby Not Found',
  NoGuestToPromote = 'No Guest To Promote',
  UnknownError = 'Unknown Error',
}

@Injectable()
export class LobbyRepository {
  private readonly logger = new Logger(LobbyRepository.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: AppRedisClient) {}

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

    return await this.modify({
      lobbyId,
      data: isReady,
      path: this.getMemberPath(userId, 'isReady'),
      condition: 'XX',
    });
  }

  async setConnectivity(args: {
    lobbyId: LobbyID;
    userId: UserID;
    isConnected: boolean;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId, isConnected } = args;

    return await this.modify({
      lobbyId,
      data: isConnected,
      path: this.getMemberPath(userId, 'isConnected'),
      condition: 'XX',
    });
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

  async close(args: {
    lobby: OpenLobby;
    gameId: GameID;
  }): Promise<Result<ClosedLobby, LobbyRepositoryError>> {
    const { lobby, gameId } = args;

    if (lobby.guest === undefined) {
      return err(LobbyRepositoryError.NoGuestToPromote);
    }

    const closed: ClosedLobby = {
      ...lobby,
      guest: lobby.guest,
      status: 'closed',
      gameId,
    };

    const key = this.getLobbyKey(lobby.id);

    try {
      const result = await this.redis.json.set(key, '$', closed, {
        condition: 'XX',
      });

      if (result !== 'OK') {
        return err(LobbyRepositoryError.NotFound);
      }
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }

    return ok(closed);
  }

  private async modify(args: {
    lobbyId: LobbyID;
    data: RedisJSON;
    path: string;
    condition: 'NX' | 'XX' | undefined;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, data, path, condition } = args;

    const key = this.getLobbyKey(lobbyId);

    try {
      const result = await this.redis.json.set(key, path, data, {
        condition,
      });

      if (result !== 'OK') {
        if (condition === 'NX') {
          return err(LobbyRepositoryError.AlreadyExists);
        }
        if (condition === 'XX') {
          return err(LobbyRepositoryError.NotFound);
        }
        return err(LobbyRepositoryError.UnknownError);
      }

      return ok();
    } catch (error) {
      this.logger.error(error);
      return err(LobbyRepositoryError.UnknownError);
    }
  }

  private getLobbyKey(lobbyId: LobbyID): string {
    return `lobby:${lobbyId}`;
  }

  private getMemberPath(userId: UserID, field: string): string {
    return `$[?(@.id=="${userId}")].${field}`;
  }
}
