// A one-shot sound effect (the "yay" after finishing a task), played with Web Audio from a decoded buffer.
// Why not an <audio> element: it plays instantly from memory (Doherty), and Safari refuses media that a service
// worker answers without Range support. Everything the browser provides is injected, so tests never need audio.

export const SOUND_KEY = 'devlog.sound';
/** Per-device preference (localStorage via `loadPref` / `savePref`); on unless explicitly "off". */
export const parseSound = (stored: string | null): boolean => stored !== 'off';

export interface AudioNode0 {
  connect(to: unknown): unknown;
}
export interface GainLike extends AudioNode0 {
  gain: { value: number };
}
export interface SourceLike extends AudioNode0 {
  buffer: unknown;
  start(when?: number): void;
}
export interface ContextLike {
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
  createBufferSource(): SourceLike;
  createGain(): GainLike;
}

export interface PlayerDeps {
  url: string;
  /** null where Web Audio does not exist: the player is then silent */
  makeContext: () => ContextLike | null;
  fetchFn: (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>;
  /** 0..1 */
  volume?: number;
}

export interface Player {
  /** Fetch and decode ahead of time so the first play is instant. Safe to call repeatedly. */
  preload(): Promise<boolean>;
  /** Play once. Call it straight from the tap handler (browsers only unlock audio on a gesture). Never throws. */
  play(): Promise<boolean>;
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  readonly available: boolean;
}

export function createPlayer({ url, makeContext, fetchFn, volume = 0.7 }: PlayerDeps): Player {
  let enabled = true;
  let ctx: ContextLike | null | undefined;
  let decoded: Promise<unknown | null> | null = null;

  const context = (): ContextLike | null => {
    if (ctx === undefined) {
      try {
        ctx = makeContext();
      } catch {
        ctx = null;
      }
    }
    return ctx;
  };

  const buffer = (): Promise<unknown | null> => {
    const c = context();
    if (!c) return Promise.resolve(null);
    // One download and one decode, ever; a failure is forgotten so the next play can try again (e.g. back online).
    decoded ??= fetchFn(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('sound not available'))))
      .then((bytes) => c.decodeAudioData(bytes))
      .catch(() => {
        decoded = null;
        return null;
      });
    return decoded;
  };

  return {
    get enabled() {
      return enabled;
    },
    get available() {
      return context() !== null;
    },
    setEnabled(on) {
      enabled = on;
    },
    async preload() {
      return (await buffer()) !== null;
    },
    async play() {
      if (!enabled) return false;
      const c = context();
      if (!c) return false;
      try {
        // Resume first and synchronously from the tap: iOS / Chrome unlock the context only inside the gesture.
        const resumed = c.state === 'suspended' ? c.resume() : Promise.resolve();
        const [data] = await Promise.all([buffer(), resumed]);
        if (!data) return false;
        const source = c.createBufferSource();
        const gain = c.createGain();
        gain.gain.value = Math.min(1, Math.max(0, volume));
        source.buffer = data;
        source.connect(gain);
        gain.connect(c.destination);
        source.start();
        return true;
      } catch {
        return false;
      }
    },
  };
}
