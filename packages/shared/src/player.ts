import { z } from 'zod';
import { UserSchema } from './user.ts';

/**
 * A user's standing in the rating system - their current rating, not a snapshot
 * taken during a game. For the per-seat view of a single game, see GamePlayer.
 */
export const PlayerSchema = UserSchema.extend({
  rating: z.int().nonnegative(),
});
export type Player = z.infer<typeof PlayerSchema>;

const PLAYER_SELF_ASSESSMENT_LEVELS = [
  'beginner',
  'novice',
  'intermediate',
  'advanced',
  'expert',
] as const;
export const PlayerSelfAssessmentLevelSchema = z.enum(
  PLAYER_SELF_ASSESSMENT_LEVELS,
);
export type PlayerSelfAssessmentLevel = z.infer<
  typeof PlayerSelfAssessmentLevelSchema
>;

/**
 * Starting rating for a player who has not played a rated game yet. Placeholder
 * numbers - they want revisiting once there is a real rating distribution.
 *
 * Typed as a total Record so adding a level without a rating fails to compile.
 */
export const SELF_ASSESSMENT_RATINGS: Record<
  PlayerSelfAssessmentLevel,
  number
> = {
  beginner: 400,
  novice: 800,
  intermediate: 1100,
  advanced: 1500,
  expert: 2000,
};

export function getRatingForSelfAssessment(
  level: PlayerSelfAssessmentLevel,
): number {
  return SELF_ASSESSMENT_RATINGS[level];
}
