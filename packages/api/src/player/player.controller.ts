import { Body, Controller, Get, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import {
  getRatingForSelfAssessment,
  type Player,
  PlayerSelfAssessmentLevelSchema,
  type UserID,
} from '@lithello/shared';
import { z } from 'zod';
import { PlayerRepository } from './player.repository.ts';

const CreatePlayerBodySchema = z.object({
  level: PlayerSelfAssessmentLevelSchema,
});

@Controller('player')
export class PlayerController {
  constructor(private readonly players: PlayerRepository) {}

  /**
   * Null rather than a 404: the client uses this to decide whether onboarding
   * is still owed, which is a normal state and not an error.
   */
  @Get('me')
  async getMe(
    @Session() session: UserSession,
  ): Promise<{ player: Player | null }> {
    const player = await this.players.getPlayer({
      id: session.user.id as UserID,
    });

    return { player };
  }

  /**
   * Turns a self-assessment into a starting rating. Idempotent - a second call
   * returns the existing record rather than failing, so two tabs submitting at
   * once cannot produce an error the user has to understand.
   */
  @Post('me')
  async createMe(
    @Session() session: UserSession,
    @Body() body: unknown,
  ): Promise<{ player: Player }> {
    const { level } = CreatePlayerBodySchema.parse(body);
    const userId = session.user.id as UserID;

    const existing = await this.players.getPlayer({ id: userId });

    if (existing !== null) {
      return { player: existing };
    }

    return {
      player: await this.players.createPlayer({
        userId,
        rating: getRatingForSelfAssessment(level),
      }),
    };
  }
}
