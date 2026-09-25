import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../presence/presence.service.ts';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/lobby',
  cors: { origin: 'http://localhost:5173' },
})
export class LobbyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LobbyGateway.name);

  constructor(private readonly presence: PresenceService) {}

  async afterInit(_server: Server) {}

  async handleConnection(_client: Socket) {
    this.logger.debug(`socket connected`);

    try {
      await this.presence.onSocketConnect();
    } catch (error) {
      this.logger.error(error);
      return;
    }

    // TODO: Remove before production-ready!
    try {
      const count = await this.presence.totalCount();
      this.logger.debug(`total connections: ${count}`);
    } catch (error) {
      this.logger.error(error);
      return;
    }
  }

  async handleDisconnect(_client: Socket) {
    this.logger.debug(`socket disconnected`);

    try {
      await this.presence.onSocketDisconnect();
    } catch (error) {
      this.logger.error(error);
      return;
    }

    // TODO: Remove before production-ready!
    try {
      const count = await this.presence.totalCount();
      this.logger.debug(`total connections: ${count}`);
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
