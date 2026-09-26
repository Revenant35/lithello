import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  type Lobby,
  type LobbyID,
  LobbyIDSchema,
  type User,
  type UserID,
} from '@lithello/shared';
import { randomUUID } from 'node:crypto';
import { err, ok, Result } from 'neverthrow';
import { Subject } from 'rxjs';
import { LobbyRepository, LobbyRepositoryError } from './lobby.repository.ts';
import { fromNodeHeaders } from 'better-auth/node';
import { Socket } from 'socket.io';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { PresenceService } from '../presence/presence.service.ts';

const LOBBY_LIFETIME_MS = 15 * 60 * 1000;
const LOBBY_MEMBER_LIFETIME_MS = 15 * 1000;

export enum LobbyServiceError {
  UnknownError = 'Unknown Error',
}

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);

  private readonly _lobbyChanged$ = new Subject<LobbyID>();
  public readonly lobbyChanged$ = this._lobbyChanged$.asObservable();

  constructor(
    private readonly presence: PresenceService,
    private readonly auth: AuthService,
    private readonly repository: LobbyRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.presence.lobbyConnections$.subscribe((event) => {
      const { userId, lobbyId, isConnected } = event;

      if (isConnected) {
        this.onUserConnect({ lobbyId, userId });
      } else {
        this.onUserDisconnect({ lobbyId, userId });
      }
    });
  }

  async validateConnection(socket: Socket): Promise<Result<void, Error>> {
    try {
      const result = await this.auth.api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });

      if (!result) {
        return err(new UnauthorizedException());
      }

      const lobbyResult = LobbyIDSchema.safeParse(
        socket.handshake.auth['lobbyId'],
      );

      if (!lobbyResult.success) {
        return err(new BadRequestException());
      }

      const lobby = await this.getRequired({
        lobbyId: lobbyResult.data,
      });
      if (lobby.isErr()) {
        return err(new NotFoundException());
      }

      const isHost = lobby.value.host.id === result.user.id;
      const isExistingGuest = lobby.value.guest?.id === result.user.id;

      if (!isHost && !isExistingGuest) {
        if (lobby.value.guest !== undefined) {
          return err(new UnauthorizedException());
        }

        const addGuestResult = await this.addGuest({
          lobbyId: lobbyResult.data,
          guest: {
            id: result.user.id as UserID,
            name: result.user.name,
          },
        });

        if (addGuestResult.isErr()) {
          this.logger.error(addGuestResult.error);
          return err(new InternalServerErrorException());
        }
      }

      socket.data.user = result.user;
      socket.data.lobbyId = lobbyResult.data;
      return ok();
    } catch (error) {
      this.logger.error(error);
      return err(new InternalServerErrorException());
    }
  }

  async createLobby(args: {
    host: User;
  }): Promise<Result<Lobby, LobbyRepositoryError>> {
    return this.repository.create({
      lobby: {
        id: randomUUID() as LobbyID,
        host: {
          id: args.host.id,
          name: args.host.name,
          isReady: false,
          connection: {
            status: 'disconnected',
            expiresAt: new Date(Date.now() + LOBBY_MEMBER_LIFETIME_MS),
          },
        },
        expiresAt: new Date(Date.now() + LOBBY_LIFETIME_MS),
        status: 'open',
        gameSettings: {},
      },
    });
  }

  async addGuest(args: {
    lobbyId: LobbyID;
    guest: User;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, guest } = args;

    return this.repository.createGuest({
      lobbyId,
      guest: {
        id: guest.id,
        name: guest.name,
        isReady: false,
        connection: { status: 'connected' },
      },
    });
  }

  async getRequired(args: {
    lobbyId: LobbyID;
  }): Promise<Result<Lobby, LobbyRepositoryError>> {
    return this.repository.getRequired(args);
  }

  async onUserConnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId } = args;

    this.cancelExpiryTimer(args);

    const result = await this.repository.setConnectivity({
      lobbyId,
      userId,
      connection: { status: 'connected' },
    });

    if (result.isOk()) {
      this._lobbyChanged$.next(lobbyId);
    }

    return result;
  }

  async onUserDisconnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { userId, lobbyId } = args;

    const expiresAt = new Date(Date.now() + LOBBY_MEMBER_LIFETIME_MS);

    const result = await this.repository.setConnectivity({
      lobbyId,
      userId,
      connection: { status: 'disconnected', expiresAt },
    });

    if (result.isErr()) {
      return result;
    }

    this.scheduleExpiry({ lobbyId, userId, expiresAt });
    this._lobbyChanged$.next(lobbyId);

    return result;
  }

  async removeUser(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError | LobbyServiceError>> {
    const { userId, lobbyId } = args;

    this.cancelExpiryTimer(args);

    const result = await this.repository.getRequired({ lobbyId });
    if (result.isErr()) {
      return err(result.error);
    }

    const removed = await this.removeMemberFromLobby(result.value, userId);
    if (removed.isOk()) {
      this._lobbyChanged$.next(lobbyId);
    }

    return removed;
  }

  private async evictExpiredMember(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<void> {
    const { userId, lobbyId } = args;

    this.cancelExpiryTimer(args);

    const result = await this.repository.getRequired({ lobbyId });
    if (result.isErr()) {
      return;
    }

    const lobby = result.value;
    const member =
      userId === lobby.host.id
        ? lobby.host
        : userId === lobby.guest?.id
          ? lobby.guest
          : undefined;

    if (!member || member.connection.status === 'connected') {
      // Reconnected (or already removed) before the grace period expired.
      return;
    }

    const removed = await this.removeMemberFromLobby(lobby, userId);
    if (removed.isOk()) {
      this._lobbyChanged$.next(lobbyId);
    } else {
      this.logger.error(removed.error);
    }
  }

  private async removeMemberFromLobby(
    lobby: Lobby,
    userId: UserID,
  ): Promise<Result<void, LobbyRepositoryError | LobbyServiceError>> {
    if (userId === lobby.host.id) {
      if (lobby.guest !== undefined) {
        const result = await this.repository.promoteGuest({
          lobbyId: lobby.id,
        });
        return result.map(() => undefined);
      }

      const result = await this.repository.delete({ lobbyId: lobby.id });
      return result.map(() => undefined);
    }

    if (userId === lobby.guest?.id) {
      const result = await this.repository.deleteGuest({ lobbyId: lobby.id });
      return result.map(() => undefined);
    }

    this.logger.error('User does not belong to lobby', {
      lobbyId: lobby.id,
      userId,
    });
    return err(LobbyServiceError.UnknownError);
  }

  private scheduleExpiry(args: {
    lobbyId: LobbyID;
    userId: UserID;
    expiresAt: Date;
  }): void {
    const { lobbyId, userId, expiresAt } = args;

    this.cancelExpiryTimer({ lobbyId, userId });

    const delayMs = Math.max(0, expiresAt.getTime() - Date.now());
    const timeout = setTimeout(() => {
      this.evictExpiredMember({ lobbyId, userId }).catch((error) =>
        this.logger.error(error),
      );
    }, delayMs);

    this.schedulerRegistry.addTimeout(
      this.getTimeoutName({ lobbyId, userId }),
      timeout,
    );
  }

  private cancelExpiryTimer(args: { lobbyId: LobbyID; userId: UserID }): void {
    const name = this.getTimeoutName(args);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private getTimeoutName(args: { lobbyId: LobbyID; userId: UserID }): string {
    return `lobby:${args.lobbyId}:member:${args.userId}`;
  }
}
