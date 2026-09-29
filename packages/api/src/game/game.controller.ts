import { Controller, Get, Query } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { GameSchema, type UserID } from '@lithello/shared';
import { z } from 'zod';
import { GameService } from './game.service.ts';

const GameListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

@Controller('game')
export class GameController {
  constructor(private readonly games: GameService) {}

  /**
   * Games the caller played either side of, newest first.
   *
   * Encoded on the way out: a Game carries its bitboards as bigint, which
   * JSON.stringify refuses. `z.encode` turns them into their hex wire form.
   */
  @Get()
  async getGames(
    @Session() session: UserSession,
    @Query() query: unknown,
  ): Promise<{ games: z.input<typeof GameSchema>[] }> {
    const { limit, offset } = GameListQuerySchema.parse(query);

    const games = await this.games.getGames({
      userId: session.user.id as UserID,
      limit,
      offset,
    });

    return { games: games.map((game) => z.encode(GameSchema, game)) };
  }
}
