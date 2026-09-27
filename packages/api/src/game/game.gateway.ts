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
  UseGuards,
} from '@nestjs/common';
import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import {
  GameIDSchema,
  type GameID,
  ClientToServerGameEvents,
  ServerToClientGameEvents,
  GameState,
  BoardLocationSchema,
  GameMessageContentSchema,
  UserSchema,
  User,
} from '@lithello/shared';
import { AuthGuard, AuthService } from '@thallesp/nestjs-better-auth';
import { PresenceService } from '../presence/presence.service.ts';
import { fromNodeHeaders } from 'better-auth/node';
import { GameService } from './game.service.ts';

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

  async afterInit(server: Server) {
    this.game.gameChanged$.subscribe((gameId) => {
      this.sendStateToGame({ gameId });
    });

    server.use(async (socket, next) => {
      try {
        const result = await this.auth.api.getSession({
          headers: fromNodeHeaders(socket.request.headers),
        });

        if (!result) {
          return next(new UnauthorizedException());
        }

        const gameResult = GameIDSchema.safeParse(
          socket.handshake.auth['gameId'],
        );

        if (!gameResult.success) {
          return next(new BadRequestException());
        }

        const gameStateResult = await this.game.getState({
          gameId: gameResult.data,
        });
        if (gameStateResult.isErr()) {
          return next(new NotFoundException());
        }

        if (
          result.user.id !== gameStateResult.value.white.id &&
          result.user.id !== gameStateResult.value.black.id
        ) {
          return next(new UnauthorizedException());
        }

        socket.data.user = result.user;
        socket.data.gameId = gameResult.data;
        return next();
      } catch (error) {
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

  @SubscribeMessage('get-state')
  async handleGetState(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const { gameId } = this.getSocketData(client);

      const result = await this.game.getState({ gameId });
      if (result.isErr()) {
        return;
      }

      this.sendState({ gameId, state: result.value });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const { user, gameId } = this.getSocketData(client);
      const location = BoardLocationSchema.parse(body);

      const result = await this.game.move({ userId: user.id, gameId, location });
      if (result.isErr()) {
        return;
      }

      this.sendState({ gameId, state: result.value });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('resign')
  async handleResign(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const { user, gameId } = this.getSocketData(client);

      const result = await this.game.resign({ userId: user.id, gameId });
      if (result.isErr()) {
        return;
      }

      this.sendState({ gameId, state: result.value });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const { user, gameId } = this.getSocketData(client);
      const content = GameMessageContentSchema.parse(body);

      const result = await this.game.sendMessage({ userId: user.id, gameId, content });
      if (result.isErr()) {
        return;
      }

      this.sendState({ gameId, state: result.value });
    } catch (error) {
      this.logger.error(error);
    }
  }

  // @SubscribeMessage('offer-draw')
  // async handleOfferDraw(@ConnectedSocket() client: Socket): Promise<void> {
  //   try {
  //     const { user, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.offerDraw({ user, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.server.to(gameId).emit('draw-offered', result.value);
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('cancel-draw-offer')
  // async handleCancelDrawOffer(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { user, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.cancelDrawOffer({ gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.server.to(gameId).emit('draw-offer-cancelled');
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('accept-draw-offer')
  // async handleAcceptDrawOffer(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { userId, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.acceptDrawOffer({ userId, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.sendState({ gameId, state: result.value });
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('reject-draw-offer')
  // async handleRejectDrawOffer(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.rejectDrawOffer({ gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.server.to(gameId).emit('draw-offer-rejected');
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('request-rematch')
  // async handleRequestRematch(@ConnectedSocket() client: Socket): Promise<void> {
  //   try {
  //     const { userId, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.requestRematch({ userId, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.sendState({ gameId, state: result.value });
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('cancel-rematch-request')
  // async handleCancelRematchRequest(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { userId, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.cancelRematchRequest({ userId, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.sendState({ gameId, state: result.value });
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('accept-rematch-request')
  // async handleAcceptRematchRequest(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { userId, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.acceptRematchRequest({ userId, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.sendState({ gameId, state: result.value });
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }
  //
  // @SubscribeMessage('reject-rematch-request')
  // async handleRejectRematchRequest(
  //   @ConnectedSocket() client: Socket,
  // ): Promise<void> {
  //   try {
  //     const { userId, gameId } = this.getSocketData(client);
  //
  //     const result = await this.game.rejectRematchRequest({ userId, gameId });
  //     if (result.isErr()) {
  //       return;
  //     }
  //
  //     this.sendState({ gameId, state: result.value });
  //   } catch (error) {
  //     this.logger.error(error);
  //   }
  // }

  private sendState(args: { gameId: GameID; state: GameState }) {
    this.server.to(args.gameId).emit('state', args.state);
  }

  private async sendStateToGame(args: { gameId: GameID }): Promise<void> {
    const { gameId } = args;

    const result = await this.game.getState({ gameId });
    if (result.isErr()) {
      return;
    }

    this.sendState({ gameId, state: result.value });
  }

  private getSocketData(client: Socket): SocketData {
    const user = UserSchema.safeParse(client.data.user);
    const gameId = GameIDSchema.safeParse(client.data.gameId);

    if (!user.success) {
      throw new Error('Missing or invalid user');
    }

    if (!gameId.success) {
      throw new Error('Missing or invalid gameId');
    }

    return { user: user.data, gameId: gameId.data };
  }
}
