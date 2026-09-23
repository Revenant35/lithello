import type { UserID } from "@lithello/shared/types";

/**
 * Finds the player and opponent in a session by user ID.
 * Works with any phase's member type as long as both host and guest are present.
 * Returns null if the user is not a participant.
 */
export function findPlayer<M extends { id: UserID }>(
  host: M,
  guest: M,
  userId: UserID,
): { player: M; opponent: M } | null {
  if (userId === host.id) return { player: host, opponent: guest };
  if (userId === guest.id) return { player: guest, opponent: host };
  return null;
}
