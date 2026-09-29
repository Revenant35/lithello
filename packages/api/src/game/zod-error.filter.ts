import { ArgumentsHost, Catch, Logger, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ZodError } from 'zod';

/**
 * A ZodError inside a handler means the client sent a payload that does not
 * match the event contract, so it is reported as an invalid payload rather than
 * leaking the issue tree.
 */
@Catch(ZodError)
export class ZodErrorFilter implements WsExceptionFilter<ZodError> {
  private readonly logger = new Logger(ZodErrorFilter.name);

  catch(error: ZodError, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    const message = error.issues
      .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
      .join('; ');

    this.logger.warn(`Invalid payload - ${message}`);

    const exception = new WsException({ code: 'INVALID_PAYLOAD', message });

    client.emit('exception', exception.getError());
  }
}
