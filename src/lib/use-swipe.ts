import { useEffect, useRef } from 'preact/hooks';
import { buzz } from './haptics.ts';
import { armed, commitOf, lockAxis, pull, type Allow } from './swipe.ts';

/** Set by the task list while a long-press drag is on, so a swipe never starts under it. */
export const dragState = { active: false };

type Options = { canRight: boolean; onRight: () => void; onLeft: () => void };

/**
 * Horizontal swipe on a touch row. The row's content follows the finger by transform only (no layout, no
 * re-render); two layers behind it show what letting go will do. Touch and pen only: a mouse drags instead.
 * Vertical movement is never touched, so scrolling stays the browser's (the row sets `touch-action: pan-y`).
 */
export function useSwipe(options: Options) {
  const row = useRef<HTMLLIElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const rightLayer = useRef<HTMLDivElement>(null);
  const leftLayer = useRef<HTMLDivElement>(null);
  const latest = useRef(options);
  latest.current = options;
  const lastSwipe = useRef(0);

  useEffect(() => {
    const el = row.current;
    const body = content.current;
    if (!el || !body) return;
    let id = -1;
    let x0 = 0;
    let y0 = 0;
    let axis: 'x' | 'y' | null = null;
    let width = 1;
    let isArmed = false;
    let last = { t: 0, x: 0 };
    let prev = last;
    let reset: ReturnType<typeof setTimeout> | undefined;

    const allow = (): Allow => ({ left: true, right: latest.current.canRight });
    const layers = (x: number) => {
      const r = rightLayer.current;
      const l = leftLayer.current;
      if (r) r.style.visibility = x > 0 ? 'visible' : 'hidden';
      if (l) l.style.visibility = x < 0 ? 'visible' : 'hidden';
    };
    const place = (x: number) => {
      body.style.transform = `translate3d(${x}px, 0, 0)`;
      layers(x);
    };
    const settle = () => {
      body.style.transition = 'transform 220ms var(--ease-spring)';
      body.style.transform = 'translate3d(0, 0, 0)';
      clearTimeout(reset);
      reset = setTimeout(() => {
        body.style.transition = '';
        layers(0);
      }, 230);
    };
    const mark = (on: boolean) => {
      for (const layer of [rightLayer.current, leftLayer.current]) if (layer) layer.dataset.armed = String(on);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.button !== 0 || id !== -1 || dragState.active) return;
      clearTimeout(reset);
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      axis = null;
      isArmed = false;
      width = el.offsetWidth || 1;
      last = prev = { t: e.timeStamp, x: e.clientX };
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (dragState.active) return void end(e, false);
      const dx = e.clientX - x0;
      if (axis === null) {
        axis = lockAxis(dx, e.clientY - y0);
        if (axis === null) return;
        if (axis === 'y') {
          id = -1;
          return;
        }
        el.setPointerCapture(id);
        body.style.transition = 'none';
      }
      prev = last;
      last = { t: e.timeStamp, x: e.clientX };
      place(pull(dx, width, allow()));
      const now = armed(dx, width, allow());
      if (now !== isArmed) {
        isArmed = now;
        mark(now);
        if (now) buzz('grab');
      }
    };
    const end = (e: PointerEvent, commit: boolean) => {
      if (e.pointerId !== id) return;
      const was = axis;
      const dx = e.clientX - x0;
      id = -1;
      axis = null;
      mark(false);
      if (was !== 'x') return;
      lastSwipe.current = Date.now();
      const verdict = commit ? commitOf(dx, width, (last.x - prev.x) / Math.max(1, last.t - prev.t), allow()) : null;
      settle();
      if (verdict === 'right') latest.current.onRight();
      else if (verdict === 'left') latest.current.onLeft();
    };
    const up = (e: PointerEvent) => end(e, true);
    const cancel = (e: PointerEvent) => end(e, false);

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      clearTimeout(reset);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, []);

  /** True just after a swipe ends: the tap the browser may still send must not select the row. */
  const justSwiped = () => Date.now() - lastSwipe.current < 350;
  return { row, content, rightLayer, leftLayer, justSwiped };
}
