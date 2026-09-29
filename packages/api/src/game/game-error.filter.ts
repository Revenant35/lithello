import { ArgumentsHost, Catch, Logger, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { GameError } from './game.error.ts';

/**
 * Turns a GameError into the socket's `exception` event.
 *
 * Only covers @SubscribeMessage handlers - Nest does not run exception filters
 * for handleConnection, handleDisconnect or server.use middleware.
 */
@Catch(GameError)
export class GameErrorFilter implements WsExceptionFilter<GameError> {
  private readonly logger = new Logger(GameErrorFilter.name);

  catch(error: GameError, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    // Expected refusals, not faults - warn so they do not read as crashes.
    this.logger.warn(`${error.name}: ${error.message}`);

    const exception = new WsException({
      code: error.code,
      message: error.message,
    });

    client.emit('exception', exception.getError());
  }
}
