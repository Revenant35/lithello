import { Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { LobbyService } from './lobby.service.ts';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { LobbyID, UserID } from '@lithello/shared';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Post('new')
  async create(@Session() session: UserSession): Promise<{ lobbyId: LobbyID }> {
    const result = await this.lobbyService.createLobby({
      host: {
        id: session.user.id as UserID,
        name: session.user.name,
      },
    });

    if (result.isErr()) {
      throw new InternalServerErrorException();
    }

    return {
      lobbyId: result.value.id,
    };
  }
}
