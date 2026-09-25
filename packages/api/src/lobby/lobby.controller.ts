import { Controller, Post } from '@nestjs/common';

@Controller('lobby')
export class LobbyController {
  @Post()
  create(): void {
    // TODO: implement lobby creation
    throw new Error('Not implemented');
  }
}
