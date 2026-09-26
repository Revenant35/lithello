import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../presence/presence.service.ts';
import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  LobbyIDSchema,
  UserIDSchema,
  type UserID,
  LobbyID,
  Lobby,
} from '@lithello/shared';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { LobbyService } from './lobby.service.ts';

@WebSocketGateway({
  namespace: '/lobby',
  cors: { origin: 'http://localhost:5173' },
})
export class LobbyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LobbyGateway.name);

  constructor(
    private readonly auth: AuthService,
    private readonly presence: PresenceService,
    private readonly lobbyService: LobbyService,
  ) {}

  async afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const result = await this.auth.api.getSession({
          headers: fromNodeHeaders(socket.request.headers),
        });

        if (!result) {
          return next(new UnauthorizedException());
        }

        const lobbyResult = LobbyIDSchema.safeParse(
          socket.handshake.auth['lobbyId'],
        );
        if (!lobbyResult.success) {
          return next(new UnauthorizedException());
        }

        const lobby = await this.lobbyService.getLobby(lobbyResult.data);
        if (lobby.isErr()) {
          this.logger.error(lobby.error);
          return next(new UnauthorizedException());
        }

        if (lobby.value === null) {
          return next(new UnauthorizedException());
        }

        const isHost = lobby.value.host.id === result.user.id;
        const isExistingGuest = lobby.value.guest?.id === result.user.id;

        if (!isHost && !isExistingGuest) {
          if (lobby.value.guest !== undefined) {
            return next(new UnauthorizedException());
          }

          const addGuestResult = await this.lobbyService.addGuest({
            lobbyId: lobbyResult.data,
            guest: {
              id: result.user.id as UserID,
              name: result.user.name,
            },
          });

          if (addGuestResult.isErr()) {
            this.logger.error(addGuestResult.error);
            return next(new UnauthorizedException());
          }
        }

        socket.data.user = result.user;
        socket.data.lobbyId = lobbyResult.data;
      } catch (error) {
        this.logger.error(error);
        return next(new UnauthorizedException());
      }

      next();
    });

    this.presence.lobbyConnections$.subscribe((event) => {
      if (event.isConnected) {
        server.to(event.lobbyId).emit('user:connected', event.userId);
      } else {
        server.to(event.lobbyId).emit('user:disconnected', event.userId);
      }
    });
  }

  async handleConnection(client: Socket) {
    const userId = UserIDSchema.safeParse(client.data.user.id);
    const lobbyId = LobbyIDSchema.safeParse(client.data.lobbyId);

    if (!userId.success || !lobbyId.success) {
      client.disconnect(true);
      return;
    }

    await client.join(lobbyId.data);

    try {
      await this.presence.onLobbyConnect({
        userId: userId.data,
        lobbyId: lobbyId.data,
      });
    } catch (error) {
      this.logger.error(error);
      return;
    }

    // TODO: Do we want to send state here? Or maybe leave that to an event?
  }

  async handleDisconnect(client: Socket) {
    const userId = UserIDSchema.safeParse(client.data.user.id);
    const lobbyId = LobbyIDSchema.safeParse(client.data.lobbyId);

    if (!userId.success || !lobbyId.success) {
      client.disconnect(true);
      return;
    }

    try {
      await this.presence.onLobbyDisconnect({
        userId: userId.data,
        lobbyId: lobbyId.data,
      });
    } catch (error) {
      this.logger.error(error);
      return;
    }
  }

  @SubscribeMessage('message')
  handleMessage(_client: Socket): string {
    return 'Hello world!';
  }
}
