/**
 * Team-code conventions for picks.
 *
 * A pick's team code carries an `_L` suffix when the pick lost
 * (e.g. "BRA_L"), so the UI can render burned/lost picks distinctly.
 */

export const LOST_PICK_SUFFIX = '_L';

/** True if the code marks a lost pick (e.g. "BRA_L"). */
export function isLostCode(code: string | null | undefined): boolean {
  return !!code && code.endsWith(LOST_PICK_SUFFIX);
}

/** Strips the lost-pick suffix, returning the plain team code. */
export function baseTeamCode(code: string): string {
  return isLostCode(code) ? code.slice(0, -LOST_PICK_SUFFIX.length) : code;
}

/**
 * Team codes burned in stages other than `excludeStage`.
 *
 * The current stage's own pick is excluded so the user can still change it
 * (or keep it) before lock. Lost picks are excluded too — they didn't carry
 * the user forward, so they don't burn the team.
 */
export function usedTeams(
  picks: Partial<Record<string, string | null>> | null | undefined,
  excludeStage?: string,
): string[] {
  return Object.entries(picks ?? {})
    .filter(([stage, code]) => stage !== excludeStage && !!code && !isLostCode(code))
    .map(([, code]) => baseTeamCode(code as string));
}

/** The still-pending pick for `stage`, or null if none or it already lost. */
export function currentStagePick(
  picks: Partial<Record<string, string | null>> | null | undefined,
  stage: string,
): string | null {
  const code = picks?.[stage];
  return code && !isLostCode(code) ? code : null;
}
