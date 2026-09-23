/**
 * Formats a clock time given in milliseconds into a human-readable string.
 *
 * - 1 hour or more:    HH:MM   (e.g. "1:05")
 * - 1 minute or more:  MM:SS   (e.g. "04:32")
 * - Under 1 minute:    SS.ss   (e.g. "12.07")
 */
export function formatClockTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }

  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  const hundredths = Math.floor((ms % 1000) / 10);

  return `${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}
