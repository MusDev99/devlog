/** Pure launch rules for the installed app: which screen a home-screen shortcut opens, and iOS detection. */

export const SCREENS = ['timer', 'tasks', 'stats'] as const;
/** Top-level screens. On wide screens Timer and Tasks share one "Focus" screen side by side. */
export type Screen = (typeof SCREENS)[number];

export const isScreen = (value: unknown): value is Screen => SCREENS.includes(value as Screen);

/** `?screen=stats` opens that screen; `&new=1` puts the cursor in the add field (manifest shortcuts). */
export function launchParams(search: string): { screen: Screen | null; newTask: boolean } {
  const params = new URLSearchParams(search);
  const screen = params.get('screen');
  return { screen: isScreen(screen) ? screen : null, newTask: params.get('new') === '1' };
}

/** iPhone / iPad (iPadOS reports as a Mac with touch). iOS has no install prompt, so these get an "Add to Home Screen" hint. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
