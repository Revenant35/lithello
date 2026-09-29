import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import {
  type ClientToServerGameEvents,
  type GameID,
  GameIDSchema,
  GameMessageContentSchema,
  GameSessionSchema,
  type ServerToClientGameEvents,
  SquareSchema,
  type User,
  UserSchema,
} from '@lithello/shared';
import { AuthGuard, AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';
import { PresenceService } from '../presence/presence.service.ts';
import { GameErrorFilter } from './game-error.filter.ts';
import { GameNotFoundError } from './game.error.ts';
import { GameService } from './game.service.ts';
import { ZodErrorFilter } from './zod-error.filter.ts';

type SocketData = { user: User; gameId: GameID };

type Server = SocketIOServer<
  ClientToServerGameEvents,
  ServerToClientGameEvents
>;
type Socket = SocketIOSocket<
  ClientToServerGameEvents,
  ServerToClientGameEvents
>;

@UseGuards(AuthGuard)
@UseFilters(GameErrorFilter, ZodErrorFilter)
@WebSocketGateway({ namespace: '/game' })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly presence: PresenceService,
    private readonly auth: AuthService,
    private readonly game: GameService,
  ) {}

  afterInit(server: Server) {
    // Every command the service completes republishes the session, so this is
    // the only place a change is broadcast - handlers do not emit themselves.
    this.game.gameSessionChanged$.subscribe((session) => {
      server
        .to(session.game.id)
        .emit('session', z.encode(GameSessionSchema, session));
    });

    server.use(async (socket, next) => {
      try {
        const result = await this.auth.api.getSession({
          headers: fromNodeHeaders(socket.request.headers),
        });

        if (!result) {
          return next(new UnauthorizedException());
        }

        const gameId = GameIDSchema.safeParse(socket.handshake.auth['gameId']);

        if (!gameId.success) {
          return next(new BadRequestException());
        }

        const session = await this.game.getSession({ gameId: gameId.data });

        if (
          result.user.id !== session.game.white.id &&
          result.user.id !== session.game.black.id
        ) {
          return next(new UnauthorizedException());
        }

        socket.data.user = result.user;
        socket.data.gameId = gameId.data;

        return next();
      } catch (error) {
        // Filters do not run for middleware, so this maps by hand.
        if (error instanceof GameNotFoundError) {
          return next(new NotFoundException(error.message));
        }

        this.logger.error(error);

        return next(new InternalServerErrorException());
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const { user, gameId } = this.getSocketData(client);

      await client.join(gameId);
      await this.presence.onGameConnect({ userId: user.id, gameId });

      client.emit('session', await this.getEncodedSession(gameId));
    } catch (error) {
      this.logger.error(error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { user, gameId } = this.getSocketData(client);

      await this.presence.onGameDisconnect({ userId: user.id, gameId });
    } catch (error) {
      this.logger.error(error);
    }
  }

  /** A read, so it answers the asking socket rather than the whole room. */
  @SubscribeMessage('get-session')
  async handleGetSession(@ConnectedSocket() client: Socket): Promise<void> {
    const { gameId } = this.getSocketData(client);

    client.emit('session', await this.getEncodedSession(gameId));
  }

  @SubscribeMessage('move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const { user, gameId } = this.getSocketData(client);
    const square = SquareSchema.parse(body);

    await this.game.move({ gameId, userId: user.id, square });
  }

  @SubscribeMessage('resign')
  async handleResign(@ConnectedSocket() client: Socket): Promise<void> {
    const { user, gameId } = this.getSocketData(client);

    await this.game.resign({ gameId, userId: user.id });
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const { user, gameId } = this.getSocketData(client);
    const content = GameMessageContentSchema.parse(body);

    await this.game.sendMessage({ gameId, userId: user.id, content });
  }

  /**
   * A GameSession holds its bitboards as bigint, which JSON - and so socket.io -
   * cannot serialize. Encoding turns them into their hex wire form.
   */
  private async getEncodedSession(gameId: GameID) {
    return z.encode(GameSessionSchema, await this.game.getSession({ gameId }));
  }

  private getSocketData(client: Socket): SocketData {
    const user = UserSchema.parse(client.data.user);
    const gameId = GameIDSchema.parse(client.data.gameId);

    return { user: user, gameId: gameId };
  }
}
