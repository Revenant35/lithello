import type { UserID } from "@lithello/shared/types";

/**
 * Finds the player and opponent in a game or post-game session by user ID.
 * Returns null if the user is not a participant.
 */
export function findPlayer<M extends { id: UserID }>(
  white: M,
  black: M,
  userId: UserID,
): { player: M; opponent: M } | null {
  if (userId === white.id) return { player: white, opponent: black };
  if (userId === black.id) return { player: black, opponent: white };
  return null;
}
