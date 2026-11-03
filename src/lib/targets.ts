/**
 * Daily targets: one set per profile. Import-free so `api/` can share the rules (validated on both sides).
 */

export type Targets = { tasks: number; points: number; minutes: number };
export const DEFAULT_TARGETS: Targets = { tasks: 3, points: 10, minutes: 120 };
/** min, max, step per target: what the settings steppers allow. */
export const TARGET_LIMITS: Record<keyof Targets, [number, number, number]> = { tasks: [1, 20, 1], points: [1, 100, 1], minutes: [15, 600, 15] };
/** Column order in the Users sheet (`target_tasks | target_points | target_minutes`). */
export const TARGET_KEYS = ['tasks', 'points', 'minutes'] as const;

export function isTargets(value: unknown): value is Targets {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return TARGET_KEYS.every((k) => {
    const [min, max] = TARGET_LIMITS[k];
    return Number.isInteger(v[k]) && (v[k] as number) >= min && (v[k] as number) <= max;
  });
}

/** Targets read back from sheet cells (text); null when blank or out of range (never set, or edited by hand). */
export function targetsFromCells(cells: string[]): Targets | null {
  const [tasks, points, minutes] = cells.map((c) => (c.trim() === '' ? Number.NaN : Number(c)));
  const value = { tasks, points, minutes };
  return isTargets(value) ? value : null;
}

export const targetsToCells = (t: Targets): string[] => TARGET_KEYS.map((k) => String(t[k]));
