/** Picks lock this many minutes before kickoff. */
export const LOCK_BEFORE_KICKOFF_MINUTES = 60;

/** Returns the moment a pick locks for a given match kickoff time. */
export function lockTimeFor(utcDate: string): Date {
  return new Date(new Date(utcDate).getTime() - LOCK_BEFORE_KICKOFF_MINUTES * 60_000);
}

/** True if picks are no longer accepted for this kickoff. */
export function isLocked(utcDate: string, now: Date = new Date()): boolean {
  return now >= lockTimeFor(utcDate);
}
