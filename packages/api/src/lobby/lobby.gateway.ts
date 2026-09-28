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
import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import { PresenceService } from '../presence/presence.service.ts';
import { Logger, UseGuards } from '@nestjs/common';
import {
  LobbyIDSchema,
  UserIDSchema,
  SetLobbyReadinessSchema,
  type UserID,
  type LobbyID,
  type ClientToServerLobbyEvents,
  type ServerToClientLobbyEvents,
} from '@lithello/shared';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { LobbyService } from './lobby.service.ts';

type SocketData = { userId: UserID; lobbyId: LobbyID };

type Server = SocketIOServer<ClientToServerLobbyEvents, ServerToClientLobbyEvents>;
type Socket = SocketIOSocket<ClientToServerLobbyEvents, ServerToClientLobbyEvents>;

@UseGuards(AuthGuard)
@WebSocketGateway({
  namespace: '/lobby',
  cors: { origin: ['http://localhost:5173', 'https://lithello.com'] },
})
export class LobbyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LobbyGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly presence: PresenceService,
    private readonly lobby: LobbyService,
  ) {}

  async afterInit(server: Server) {
    server.use(async (socket, next) => {
      const result = await this.lobby.validateConnection(socket);
      if (result.isErr()) {
        next(result.error);
      } else {
        next();
      }
    });

    this.lobby.lobbyChanged$.subscribe((lobbyId) => {
      this.sendStateToLobby({ lobbyId });
    });

    this.lobby.gameStarted$.subscribe(({ lobbyId, gameId }) => {
      this.server.to(lobbyId).emit('game-started', { gameId });
    });
  }

  async handleConnection(client: Socket) {
    try {
      const { lobbyId, userId } = this.getSocketData(client);

      await client.join(lobbyId);
      await this.presence.onLobbyConnect({ userId, lobbyId });

      await this.sendStateToUser({ lobbyId, client });
    } catch (error) {
      this.logger.error(error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { lobbyId, userId } = this.getSocketData(client);

      await this.presence.onLobbyDisconnect({ lobbyId, userId });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('set-ready')
  async handleSetReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    try {
      const { lobbyId, userId } = this.getSocketData(client);

      const { isReady } = SetLobbyReadinessSchema.parse(data);

      await this.lobby.setReadiness({ lobbyId, userId, isReady });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('state')
  async handleStateRequest(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const { lobbyId } = this.getSocketData(client);

      await this.sendStateToUser({ lobbyId, client });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('leave')
  async handleLeave(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const { lobbyId, userId } = this.getSocketData(client);

      await this.lobby.removeUser({ userId, lobbyId });
      client.disconnect(true);
    } catch (error) {
      this.logger.error(error);
    }
  }

  private getSocketData(client: Socket): SocketData {
    const userId = UserIDSchema.safeParse(client.data.user.id);
    const lobbyId = LobbyIDSchema.safeParse(client.data.lobbyId);

    if (!userId.success) {
      throw new Error('Missing or invalid userID');
    }

    if (!lobbyId.success) {
      throw new Error('Missing or invalid lobbyId');
    }

    return { userId: userId.data, lobbyId: lobbyId.data };
  }

  private async sendStateToLobby(args: { lobbyId: LobbyID }): Promise<void> {
    const { lobbyId } = args;

    const lobby = await this.lobby.getRequired({ lobbyId });
    if (lobby.isErr()) {
      return;
    }

    this.server.to(lobbyId).emit('state', lobby.value);
  }

  private async sendStateToUser(args: {
    lobbyId: LobbyID;
    client: Socket;
  }): Promise<void> {
    const { lobbyId, client } = args;

    const lobby = await this.lobby.getRequired({ lobbyId });
    if (lobby.isErr()) {
      return;
    }

    client.emit('state', lobby.value);
  }
}
