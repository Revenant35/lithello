import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type Lobby,
  type LobbyID,
  LobbyIDSchema,
  type User,
  type UserID,
} from '@lithello/shared';
import { randomUUID } from 'node:crypto';
import { err, ok, Result } from 'neverthrow';
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

  constructor(
    private readonly presence: PresenceService,
    private readonly auth: AuthService,
    private readonly repository: LobbyRepository,
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

  async onUserConnect(args: { userId: UserID; lobbyId: LobbyID }) {
    const { lobbyId, userId } = args;

    await this.repository.setConnectivity({
      lobbyId,
      userId,
      connection: { status: 'connected' },
    });
  }

  async onUserDisconnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError | LobbyServiceError>> {
    const { userId, lobbyId } = args;

    const result = await this.repository.getRequired({ lobbyId });
    if (result.isErr()) {
      return err(result.error);
    }

    await this.repository.setConnectivity({
      lobbyId,
      userId,
      connection: {
        status: 'disconnected',
        expiresAt: new Date(Date.now() + LOBBY_LIFETIME_MS),
      },
    });

    const lobby = result.value;
    if (userId === lobby.host.id) {
      return await this.onHostDisconnect(lobby);
    }

    if (userId === lobby.guest?.id) {
      return await this.onGuestDisconnect(lobby);
    }

    this.logger.error('User does not belong to lobby', args);
    return err(LobbyServiceError.UnknownError);
  }

  private async onHostDisconnect(
    lobby: Lobby,
  ): Promise<Result<void, LobbyRepositoryError>> {
    // TODO: give the host a grace period (lobby.host.expiresAt) to
    // reconnect before promoting the guest / deleting the lobby.
    if (lobby.guest !== undefined) {
      const result = await this.repository.promoteGuest({ lobbyId: lobby.id });
      return result.map(() => undefined);
    }

    const result = await this.repository.delete({ lobbyId: lobby.id });
    return result.map(() => undefined);
  }

  private async onGuestDisconnect(lobby: Lobby) {
    // TODO: give the guest a grace period (lobby.guest.expiresAt) to
    // reconnect before clearing them from the lobby.
    const result = await this.repository.deleteGuest({ lobbyId: lobby.id });
    return result.map(() => undefined);
  }
}
