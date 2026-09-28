import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { GameService } from './game.service.ts';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { GameSummary, UserID } from '@lithello/shared';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('history')
  async getHistory(
    @Session() session: UserSession,
  ): Promise<{ games: GameSummary[] }> {
    const result = await this.gameService.getMatchHistory({
      userId: session.user.id as UserID,
    });

    if (result.isErr()) {
      throw new InternalServerErrorException();
    }

    return { games: result.value };
  }
}
