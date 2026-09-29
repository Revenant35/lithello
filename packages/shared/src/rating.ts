import type { GameResult } from './game.ts';

/**
 * Elo. Each player's expected score comes from the rating gap, and they move by
 * the difference between what they scored and what was expected of them.
 *
 * Glicko-2 would model uncertainty better for players with few games, but it
 * needs a rating deviation and volatility per player, which the schema does not
 * carry. This stays plain Elo until it does.
 */

/** Ratings are stored in a smallint column with a non-negative check. */
export const MIN_RATING = 0;
export const MAX_RATING = 32_767;

/**
 * How far a single game can move a rating. Stronger players move less, so an
 * established rating is not upset by one result.
 */
export function getKFactor(rating: number): number {
  if (rating >= 2400) {
    return 16;
  }

  if (rating >= 2100) {
    return 24;
  }

  return 32;
}

/** The share of a point a player is expected to take against this opponent. */
export function getExpectedScore(
  rating: number,
  opponentRating: number,
): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function clampRating(rating: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating));
}

/** `score` is 1 for a win, 0.5 for a draw, 0 for a loss. */
export function getNewRating(args: {
  rating: number;
  opponentRating: number;
  score: number;
  kFactor?: number;
}): number {
  const {
    rating,
    opponentRating,
    score,
    kFactor = getKFactor(rating),
  } = args;

  const expected = getExpectedScore(rating, opponentRating);

  return clampRating(Math.round(rating + kFactor * (score - expected)));
}

const SCORES: Record<GameResult, { white: number; black: number }> = {
  white_win: { white: 1, black: 0 },
  black_win: { white: 0, black: 1 },
  draw: { white: 0.5, black: 0.5 },
};

/** Both players' ratings after a decided game. */
export function getRatingsAfterGame(args: {
  whiteRating: number;
  blackRating: number;
  result: GameResult;
}): { white: number; black: number } {
  const { whiteRating, blackRating, result } = args;
  const score = SCORES[result];

  return {
    white: getNewRating({
      rating: whiteRating,
      opponentRating: blackRating,
      score: score.white,
    }),
    black: getNewRating({
      rating: blackRating,
      opponentRating: whiteRating,
      score: score.black,
    }),
  };
}
