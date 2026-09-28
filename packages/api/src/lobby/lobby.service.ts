import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type GameID,
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
import { GameService } from '../game/game.service.ts';

const LOBBY_LIFETIME_MS = 15 * 60 * 1000;
const DEFAULT_GAME_CLOCK_MS = 5 * 60 * 1000;

export enum LobbyServiceError {
  UnknownError = 'Unknown Error',
}

type LobbyCreatedEvent = { lobby: Lobby };
type LobbyReadyEvent = { lobbyId: LobbyID };
type LobbyUnreadyEvent = { lobbyId: LobbyID };
type LobbyDestroyedEvent = { lobbyId: LobbyID };
type GameStartedEvent = { lobbyId: LobbyID; gameId: GameID };

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);

  private readonly _lobbyChanged$ = new Subject<LobbyID>();
  public readonly lobbyChanged$ = this._lobbyChanged$.asObservable();

  private readonly _lobbyCreated$ = new Subject<LobbyCreatedEvent>();
  public readonly lobbyCreated$ = this._lobbyCreated$.asObservable();

  private readonly _lobbyReady$ = new Subject<LobbyReadyEvent>();
  public readonly lobbyReady$ = this._lobbyReady$.asObservable();

  private readonly _lobbyUnready$ = new Subject<LobbyUnreadyEvent>();
  public readonly lobbyUnready$ = this._lobbyUnready$.asObservable();

  private readonly _lobbyDestroyed$ = new Subject<LobbyDestroyedEvent>();
  public readonly lobbyDestroyed$ = this._lobbyDestroyed$.asObservable();

  private readonly _gameStarted$ = new Subject<GameStartedEvent>();
  public readonly gameStarted$ = this._gameStarted$.asObservable();

  constructor(
    private readonly presence: PresenceService,
    private readonly auth: AuthService,
    private readonly repository: LobbyRepository,
    private readonly game: GameService,
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
    const result = await this.repository.create({
      lobby: {
        id: randomUUID() as LobbyID,
        host: {
          id: args.host.id,
          name: args.host.name,
          isReady: false,
          connection: { status: 'disconnected' },
        },
        expiresAt: new Date(Date.now() + LOBBY_LIFETIME_MS),
        status: 'open',
        gameSettings: {},
      },
    });

    if (result.isOk()) {
      this._lobbyCreated$.next({ lobby: result.value });
    }

    return result;
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

  async setReadiness(args: {
    lobbyId: LobbyID;
    userId: UserID;
    isReady: boolean;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId, isReady } = args;

    const result = await this.repository.setReadiness({
      lobbyId,
      userId,
      isReady,
    });
    if (result.isErr()) {
      return result;
    }

    this._lobbyChanged$.next(lobbyId);

    if (!isReady) {
      this._lobbyUnready$.next({ lobbyId });
      return ok();
    }

    const lobbyResult = await this.repository.getRequired({ lobbyId });
    if (
      lobbyResult.isOk() &&
      lobbyResult.value.status === 'open' &&
      lobbyResult.value.guest !== undefined &&
      lobbyResult.value.host.isReady &&
      lobbyResult.value.guest.isReady
    ) {
      this._lobbyReady$.next({ lobbyId });
    }

    return ok();
  }

  async onUserConnect(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId, userId } = args;

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

    const result = await this.repository.setConnectivity({
      lobbyId,
      userId,
      connection: { status: 'disconnected' },
    });

    if (result.isErr()) {
      return result;
    }

    this._lobbyChanged$.next(lobbyId);

    return result;
  }

  async removeUser(args: {
    userId: UserID;
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError | LobbyServiceError>> {
    const { userId, lobbyId } = args;

    this._lobbyUnready$.next({ lobbyId });

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

  async startGame(args: { lobbyId: LobbyID }): Promise<void> {
    const { lobbyId } = args;

    const lobbyResult = await this.repository.getRequired({ lobbyId });
    if (lobbyResult.isErr()) {
      return;
    }

    const lobby = lobbyResult.value;

    if (
      lobby.status !== 'open' ||
      lobby.guest === undefined ||
      !lobby.host.isReady ||
      !lobby.guest.isReady
    ) {
      // Someone left, unreadied, or the lobby already closed since the
      // timer was scheduled - abort rather than starting a stale game.
      return;
    }

    const gameResult = await this.game.createGame({
      whiteId: lobby.host.id,
      blackId: lobby.guest.id,
      startClockMs: DEFAULT_GAME_CLOCK_MS,
    });

    if (gameResult.isErr()) {
      this.logger.error(gameResult.error);
      return;
    }

    const closeResult = await this.repository.close({
      lobby,
      gameId: gameResult.value.gameId,
    });

    if (closeResult.isErr()) {
      this.logger.error(closeResult.error);
      return;
    }

    this._lobbyChanged$.next(lobbyId);
    this._gameStarted$.next({ lobbyId, gameId: gameResult.value.gameId });
  }

  async destroy(args: {
    lobbyId: LobbyID;
  }): Promise<Result<void, LobbyRepositoryError>> {
    const { lobbyId } = args;

    const result = await this.repository.delete({ lobbyId });
    if (result.isOk()) {
      this._lobbyDestroyed$.next({ lobbyId });
    }

    return result;
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

      return this.destroy({ lobbyId: lobby.id });
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
}
