import seatbelt from '../assets/sounds/seatbelt.mp3?url';
import yay from '../assets/sounds/yay.mp3?url';
import { createPlayer, type ContextLike } from './sound.ts';

type AudioWindow = typeof globalThis & { AudioContext?: new () => ContextLike; webkitAudioContext?: new () => ContextLike };

/** One shared audio context (browsers cap them), one decoded buffer per sound. */
let shared: ContextLike | null | undefined;
const makeContext = (): ContextLike | null => {
  if (shared === undefined) {
    const w = globalThis as AudioWindow;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    shared = Ctor ? new Ctor() : null;
  }
  return shared;
};
const player = (url: string) => createPlayer({ url, makeContext, fetchFn: (u) => fetch(u) });

/** Both files are hashed into /assets and precached by the service worker, so they play offline. */
const finish = player(yay); // the cheer when a task is finished
const toggle = player(seatbelt); // the chime when a clock starts or pauses
const all = [finish, toggle];

export const playFinish = (): void => void finish.play();
export const playToggle = (): void => void toggle.play();
export const preloadSounds = (): void => all.forEach((p) => void p.preload());
export const setSounds = (on: boolean): void => all.forEach((p) => p.setEnabled(on));
export const canPlaySounds = (): boolean => toggle.available;
