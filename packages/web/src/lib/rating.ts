/**
 * A rating change for display: '+26', '-18', or '±0'.
 *
 * Zero is written '±0' rather than '+0' so "no change" reads as a deliberate
 * outcome instead of a suspiciously small gain - which it is, at a wide rating
 * gap where an expected win is worth a fraction of a point.
 */
export function formatRatingDelta(delta: number): string {
  if (delta === 0) {
    return '±0';
  }

  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}
