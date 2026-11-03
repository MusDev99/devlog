import { useRef, useState } from 'preact/hooks';
import { calendar, dayTasks, reportCsv, tasksBetween, type Cell } from '../lib/calendar.ts';
import { plainText } from '../lib/links.ts';
import { placeOf, sizeOf, type Note } from '../lib/notes.ts';
import { dayStats, formatMinutes } from '../lib/stats.ts';
import { Icon } from './Icon.tsx';
import { PLACE_NAMES, PLACE_TONE } from './TaskRow.tsx';

type Props = { tasks: Note[]; today: string; nowMs: number; timeZone: string; onToast: (message: string) => void };

const CARD = 'rounded-[28px] border border-line/70 bg-surface/80 p-4 sm:p-5';
const LEVEL = ['bg-surface-high', 'bg-ok/25', 'bg-ok/45', 'bg-ok/70', 'bg-ok'] as const;
const ROWS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const DAY_MS = 86_400_000;
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);
const longDay = (day: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.parse(`${day}T00:00:00Z`));

/** Saves the CSV with a BOM so Excel reads UTF-8. Built on the device; nothing is sent anywhere. */
function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Last 12 weeks as a heatmap of focus time. Tap a day to see what was worked on and finished then
 * (arrow keys move between days). CSV downloads the 12 weeks, or the picked day.
 */
export function ActivityCalendar({ tasks, today, nowMs, timeZone, onToast }: Props) {
  const days = dayStats(tasks, nowMs, timeZone);
  const cal = calendar(days, today);
  const [picked, setPicked] = useState(today);
  const grid = useRef<HTMLDivElement>(null);
  const day = picked >= cal.from && picked <= today ? picked : today;
  const cells = cal.weeks.flat().filter((c) => !c.future);
  const active = cells.filter((c) => c.level > 0).length;
  const total = cells.reduce((sum, c) => sum + c.focusMs, 0);
  const list = dayTasks(tasks, day, nowMs, timeZone);
  const stat = days.get(day);

  function pick(next: string, focus = false) {
    if (next < cal.from || next > today) return;
    setPicked(next);
    if (focus) requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus());
  }

  function onKey(e: KeyboardEvent) {
    const by = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    pick(shiftDay(day, by), true);
  }

  function exportCsv(scope: 'range' | 'day') {
    const notes = scope === 'day' ? list.map((t) => t.note) : tasksBetween(tasks, cal.from, today, nowMs, timeZone);
    if (notes.length === 0) return onToast(scope === 'day' ? 'Nothing on this day to export' : 'Nothing to export yet');
    download(scope === 'day' ? `devlog-${day}.csv` : `devlog-${cal.from}-to-${today}.csv`, reportCsv(notes, nowMs, timeZone));
    onToast(`Report downloaded · ${notes.length} ${notes.length === 1 ? 'task' : 'tasks'}`);
  }

  return (
    <section aria-labelledby="calendar-title" class={`${CARD} lg:col-span-2`}>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="calendar-title" class="text-lg font-semibold">
            Last 12 weeks
          </h2>
          <p class="text-xs text-muted">
            {active} active {active === 1 ? 'day' : 'days'} · {formatMinutes(total)} tracked · tap a day
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv('range')}
          class="press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-high px-3.5 text-sm font-medium text-muted hover:text-fg"
        >
          <Icon name="download" class="size-[18px]" />
          CSV report
        </button>
      </div>

      <div class="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div class="w-full max-w-[680px]">
          <div class="grid grid-cols-[1.75rem_repeat(12,minmax(0,1fr))] gap-[3px] text-[10px] text-muted" aria-hidden="true">
            <span />
            {cal.weeks.map((_, col) => (
              <span key={col} class="h-4 overflow-visible whitespace-nowrap">
                {cal.months.find((m) => m.col === col)?.label ?? ''}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" aria-label="Activity by day, last 12 weeks" onKeyDown={onKey} class="grid grid-cols-[1.75rem_repeat(12,minmax(0,1fr))] gap-[3px]">
            {ROWS.map((label, row) => (
              <div key={row} role="row" class="contents">
                <span aria-hidden="true" class="self-center text-[10px] text-muted">
                  {label}
                </span>
                {cal.weeks.map((week) => {
                  const c = week[row];
                  return c ? <Day key={c.day} cell={c} today={today} selected={c.day === day} onPick={pick} /> : null;
                })}
              </div>
            ))}
          </div>
          <p class="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted" aria-hidden="true">
            Less
            {LEVEL.map((tone) => (
              <span key={tone} class={`size-3 rounded-[3px] ${tone}`} />
            ))}
            More
          </p>
        </div>

        <div aria-live="polite">
          <div class="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pick(shiftDay(day, -1))}
              disabled={day <= cal.from}
              aria-label="Previous day"
              class="press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg disabled:opacity-40"
            >
              <Icon name="arrow" class="size-5 rotate-180" />
            </button>
            <div class="min-w-0 flex-1 text-center">
              <h3 class="font-semibold">{day === today ? `Today · ${longDay(day)}` : longDay(day)}</h3>
              <p class="text-xs text-muted tabular-nums">
                {formatMinutes(stat?.focusMs ?? 0)} focus · {stat?.done ?? 0} done · {stat?.points ?? 0} SP
              </p>
            </div>
            <button
              type="button"
              onClick={() => pick(shiftDay(day, 1))}
              disabled={day >= today}
              aria-label="Next day"
              class="press state-layer grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg disabled:opacity-40"
            >
              <Icon name="arrow" class="size-5" />
            </button>
          </div>

          {list.length === 0 ? (
            <p class="mt-3 rounded-2xl bg-surface-high/60 px-3.5 py-4 text-center text-sm text-muted">No tracked time or finished tasks on this day.</p>
          ) : (
            <>
              <ul class="mt-3 grid gap-1.5">
                {list.map(({ note, ms, finished }) => {
                  const place = placeOf(note);
                  return (
                    <li key={note.id} class="flex items-center gap-3 rounded-xl bg-surface-high/80 px-3 py-2.5 text-sm">
                      {finished ? (
                        <span class="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-bg" title="Finished this day">
                          <Icon name="check" class="size-3.5" />
                        </span>
                      ) : (
                        <span aria-hidden="true" class={`ml-1.5 size-2 shrink-0 rounded-full ${PLACE_TONE[place].dot}`} />
                      )}
                      <span class="min-w-0 flex-1">
                        <span class={`block truncate ${finished ? 'text-muted' : ''}`}>{plainText(note.text)}</span>
                        <span class={`text-xs ${PLACE_TONE[place].text}`}>
                          {PLACE_NAMES[place]}
                          {finished ? ' · finished' : ''}
                        </span>
                      </span>
                      {ms >= 60_000 && <span class="shrink-0 text-xs font-medium tabular-nums">{formatMinutes(ms)}</span>}
                      <span class="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">{sizeOf(note)} SP</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => exportCsv('day')}
                class="press state-layer mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent"
              >
                <Icon name="download" class="size-[18px]" />
                CSV for this day
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** One day square. Only the picked day is in the tab order (roving focus); arrows move it. */
function Day({ cell, today, selected, onPick }: { cell: Cell; today: string; selected: boolean; onPick: (day: string) => void }) {
  if (cell.future) return <span role="gridcell" aria-hidden="true" class="aspect-square" />;
  const summary = cell.focusMs > 0 || cell.done > 0 ? `${formatMinutes(cell.focusMs)}, ${cell.done} done` : 'no activity';
  return (
    <span role="gridcell" class="contents">
      <button
        type="button"
        data-day={cell.day}
        tabIndex={selected ? 0 : -1}
        aria-pressed={selected}
        aria-label={`${longDay(cell.day)}: ${summary}`}
        title={`${longDay(cell.day)} · ${summary}`}
        onClick={() => onPick(cell.day)}
        class={`aspect-square w-full rounded-[4px] transition-transform active:scale-90 motion-reduce:transition-none ${LEVEL[cell.level]} ${
          selected ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : cell.day === today ? 'ring-1 ring-outline' : ''
        }`}
      />
    </span>
  );
}
