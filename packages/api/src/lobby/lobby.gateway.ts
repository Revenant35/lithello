import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/lobby', cors: { origin: 'http://localhost:5173' } })
export class LobbyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  async afterInit(_server: Server) {}

  async handleConnection(_client: Socket) {}

  async handleDisconnect(_client: Socket) {}

  @SubscribeMessage('message')
  handleMessage(_client: Socket): string {
    return 'Hello world!';
  }
}
