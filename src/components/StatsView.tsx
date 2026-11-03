import { useState } from 'preact/hooks';
import { plainText } from '../lib/links.ts';
import { placeOf, PLACES, sizeOf, type Note, type Place } from '../lib/notes.ts';
import {
  breakdown,
  dayStats,
  formatMinutes,
  insights,
  isActive,
  longestStreak,
  onTarget,
  series,
  streak,
  weekday,
  weeklyReview,
  type DayStat,
  type Insight,
  type Targets,
} from '../lib/stats.ts';
import { taskTiming } from '../lib/timing.ts';
import { ActivityCalendar } from './ActivityCalendar.tsx';
import { Icon, type IconName } from './Icon.tsx';
import { PLACE_NAMES, PLACE_TONE } from './TaskRow.tsx';

type Props = { tasks: Note[]; today: string; nowMs: number; timeZone: string; targets: Targets; onEditTargets: () => void; onToast: (message: string) => void };

type Metric = 'time' | 'points' | 'tasks';
const METRICS: { id: Metric; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'points', label: 'Points' },
  { id: 'tasks', label: 'Tasks' },
];

const CARD = 'rounded-[28px] border border-line/70 bg-surface/80 p-4 sm:p-5';
const TILE = 'rounded-2xl bg-surface-high/80 px-3.5 py-3';

/** Stats tab: today against the daily targets, the last 7 days, the weekly review, where the time went, and what it means. */
export function StatsView({ tasks, today, nowMs, timeZone, targets, onEditTargets, onToast }: Props) {
  const days = dayStats(tasks, nowMs, timeZone);
  const todayStat = days.get(today) ?? { day: today, focusMs: 0, runs: 0, done: 0, points: 0 };
  const week = series(days, today, 7);
  const review = weeklyReview(days, today);
  const split = breakdown(tasks, nowMs, timeZone, today);
  const notes = insights(tasks, nowMs, timeZone, today, targets);
  const activeStreak = streak(days, today, isActive);
  const targetStreak = streak(days, today, onTarget(targets));
  const doneToday = tasks.filter((t) => t.tag === 'done' && t.day === today);

  return (
    <div class="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <section aria-labelledby="today-goals" class={`${CARD} lg:col-span-2`}>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="today-goals" class="text-lg font-semibold">
            Today
          </h2>
          <div class="flex flex-wrap items-center gap-2">
            {/* Streaks: never break the chain (Zeigarnik), shown as plain counts. */}
            <span class="rounded-full bg-warn/15 px-3 py-1 text-sm font-semibold text-warn" title="Days in a row with time logged or a task done">
              <span aria-hidden="true">🔥 </span>
              {activeStreak}d streak
            </span>
            <span class="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary" title={`Days in a row reaching ${targets.points} SP`}>
              <span aria-hidden="true">🎯 </span>
              {targetStreak}d on target
            </span>
            <button
              type="button"
              onClick={onEditTargets}
              class="press state-layer inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-high px-3.5 text-sm font-medium text-muted hover:text-fg"
            >
              <Icon name="edit" class="size-4" />
              Targets
            </button>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-3 gap-2 sm:gap-6">
          <Goal label="Story points" value={todayStat.points} target={targets.points} unit="SP" tone="stroke-primary" />
          <Goal label="Tasks done" value={todayStat.done} target={targets.tasks} unit="" tone="stroke-ok" />
          <Goal
            label="Focus time"
            value={Math.round(todayStat.focusMs / 60_000)}
            target={targets.minutes}
            unit="min"
            tone="stroke-live"
            display={formatMinutes(todayStat.focusMs)}
            targetDisplay={formatMinutes(targets.minutes * 60_000)}
          />
        </div>

        <h3 class="mt-6 text-[11px] font-semibold tracking-wider text-muted uppercase">Finished today</h3>
        {doneToday.length === 0 ? (
          <p class="mt-2 text-sm text-muted">Nothing finished yet today. Tick a task to score its points.</p>
        ) : (
          <ul class="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
            {doneToday.map((t) => (
              <li key={t.id} class="flex items-center gap-3 rounded-xl bg-surface-high/80 px-3 py-2.5 text-sm">
                <span class="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-bg">
                  <Icon name="check" class="size-3.5" />
                </span>
                <span class="min-w-0 flex-1 truncate">{plainText(t.text)}</span>
                <FinishedTime note={t} nowMs={nowMs} />
                <span class="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">+{sizeOf(t)} SP</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActivityCalendar tasks={tasks} today={today} nowMs={nowMs} timeZone={timeZone} onToast={onToast} />

      <WeekChart week={week} today={today} targets={targets} />

      <section aria-labelledby="review-title" class={CARD}>
        <h2 id="review-title" class="text-lg font-semibold">
          Weekly review
        </h2>
        <p class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-4xl font-semibold tracking-tight tabular-nums">{formatMinutes(review.totalMs)}</span>
          <Trend now={review.totalMs} before={review.previousMs} />
        </p>
        <p class="mt-1 text-xs text-muted">Focus time, last 7 days · {formatMinutes(review.previousMs)} the week before</p>
        <dl class="mt-4 grid grid-cols-2 gap-2">
          <Tile label="Sessions" value={String(review.runs)} />
          <Tile label="Best day" value={review.bestDay ? `${weekday(review.bestDay.day)} · ${formatMinutes(review.bestDay.focusMs)}` : '—'} />
          <Tile label="Points scored" value={`${review.points} SP`} />
          <Tile label="Tasks done" value={String(review.done)} />
          <Tile label="Top task" value={split.tasks[0] ? plainText(split.tasks[0].note.text) : '—'} />
          <Tile label="Longest streak" value={`${longestStreak(days, isActive)} days`} />
        </dl>
      </section>

      <Breakdown split={split} />

      <section aria-labelledby="insights-title" class={CARD}>
        <h2 id="insights-title" class="text-lg font-semibold">
          Insights
        </h2>
        {notes.length === 0 ? (
          <p class="mt-3 text-sm leading-6 text-muted">Track a few tasks with Start / Stop and finish them; insights appear once there is a pattern to read.</p>
        ) : (
          <ul class="mt-3 grid gap-2">
            {notes.map((n, i) => (
              <InsightRow key={i} insight={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const R = 40;
const C = 2 * Math.PI * R;

/** A goal ring: fills toward the target and turns into a check when reached (Goal-gradient). */
function Goal({ label, value, target, unit, tone, display, targetDisplay }: { label: string; value: number; target: number; unit: string; tone: string; display?: string; targetDisplay?: string }) {
  const ratio = Math.min(1, value / target);
  const reached = value >= target;
  return (
    <div class="flex flex-col items-center text-center" aria-label={`${label}: ${display ?? value} of ${targetDisplay ?? `${target} ${unit}`}`}>
      <div class="relative aspect-square w-full max-w-[120px]">
        <svg viewBox="0 0 100 100" aria-hidden="true" class="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke-width="9" class="stroke-surface-high" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke-width="9"
            stroke-linecap="round"
            stroke-dasharray={C}
            stroke-dashoffset={C * (1 - ratio)}
            class={`${tone} transition-[stroke-dashoffset] duration-700 ease-[var(--ease-standard)]`}
          />
        </svg>
        <div class="absolute inset-0 grid place-items-center">
          <span class={`font-semibold tabular-nums ${display && display.length > 4 ? 'text-base sm:text-xl' : 'text-xl sm:text-3xl'}`}>
            {reached ? <Icon name="check" class="size-7 animate-pop text-ok sm:size-9" /> : (display ?? value)}
          </span>
        </div>
      </div>
      <p class="mt-2 text-xs font-medium sm:text-sm">{label}</p>
      <p class="text-xs text-muted tabular-nums">
        {display ?? value} / {targetDisplay ?? `${target}${unit ? ` ${unit}` : ''}`}
      </p>
    </div>
  );
}

/** Last 7 days as bars, switchable between time, points and tasks, with the daily target as a dashed line. */
function WeekChart({ week, today, targets }: { week: DayStat[]; today: string; targets: Targets }) {
  const [metric, setMetric] = useState<Metric>('time');
  const value = (d: DayStat) => (metric === 'time' ? d.focusMs / 60_000 : metric === 'points' ? d.points : d.done);
  const target = metric === 'time' ? targets.minutes : metric === 'points' ? targets.points : targets.tasks;
  const show = (v: number) => (metric === 'time' ? formatMinutes(v * 60_000) : String(v));
  const max = Math.max(target, ...week.map(value)) * 1.1 || 1;
  const total = week.reduce((sum, d) => sum + value(d), 0);

  return (
    <section aria-labelledby="week-title" class={CARD}>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="week-title" class="text-lg font-semibold">
            Last 7 days
          </h2>
          <p class="text-xs text-muted">
            {show(total)} total · target {show(target)} a day
          </p>
        </div>
        <div role="tablist" aria-label="Chart metric" class="flex rounded-full bg-surface-low p-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={metric === m.id}
              onClick={() => setMetric(m.id)}
              class={`press min-h-11 rounded-full px-3.5 text-sm font-medium transition-colors ${metric === m.id ? 'bg-surface-highest text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div class="relative mt-5 h-44">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 border-t border-dashed border-outline/70"
          style={{ bottom: `${(target / max) * 100}%` }}
        />
        <ul class="flex h-full items-end gap-2">
          {week.map((d) => {
            const v = value(d);
            const hit = v >= target;
            return (
              <li key={d.day} class="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${weekday(d.day)}: ${show(v)}`}>
                {v > 0 && <span class="text-[10px] font-medium text-muted tabular-nums">{show(v)}</span>}
                <div
                  aria-label={`${weekday(d.day)} ${show(v)}${hit ? ', target reached' : ''}`}
                  class={`w-full max-w-10 rounded-t-lg rounded-b-sm transition-[height] duration-500 ease-[var(--ease-standard)] ${
                    v === 0 ? 'bg-surface-high' : hit ? 'bg-ok' : d.day === today ? 'bg-accent' : 'bg-accent/55'
                  }`}
                  style={{ height: `${v === 0 ? 3 : Math.max(4, (v / max) * 100)}%` }}
                />
              </li>
            );
          })}
        </ul>
      </div>
      <ul class="mt-2 flex gap-2" aria-hidden="true">
        {week.map((d) => (
          <li key={d.day} class={`flex-1 text-center text-xs ${d.day === today ? 'font-semibold text-fg' : 'text-muted'}`}>
            {weekday(d.day)}
          </li>
        ))}
      </ul>
      <p class="mt-3 flex items-center gap-3 text-xs text-muted">
        <span class="inline-flex items-center gap-1.5">
          <span class="size-2 rounded-sm bg-ok" /> target reached
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-4 border-t border-dashed border-outline" /> daily target
        </span>
      </p>
    </section>
  );
}

/** Where the time went: quadrant split as one stacked bar, then each task with its share and pace per point. */
function Breakdown({ split }: { split: ReturnType<typeof breakdown> }) {
  const used = PLACES.filter((p) => split.places[p] > 0);
  return (
    <section aria-labelledby="split-title" class={CARD}>
      <h2 id="split-title" class="text-lg font-semibold">
        Where your time went
      </h2>
      <p class="text-xs text-muted">Last 7 days · {formatMinutes(split.totalMs)} tracked</p>
      {split.totalMs === 0 ? (
        <p class="mt-4 text-sm text-muted">No tracked time in the last 7 days yet.</p>
      ) : (
        <>
          <div class="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-high" role="img" aria-label={used.map((p) => `${PLACE_NAMES[p]} ${Math.round((split.places[p] / split.totalMs) * 100)}%`).join(', ')}>
            {used.map((p) => (
              <span key={p} class={`h-full ${PLACE_TONE[p].dot}`} style={{ width: `${(split.places[p] / split.totalMs) * 100}%` }} />
            ))}
          </div>
          <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {used.map((p: Place) => (
              <li key={p} class="inline-flex items-center gap-1.5">
                <span aria-hidden="true" class={`size-2 rounded-full ${PLACE_TONE[p].dot}`} />
                <span class={PLACE_TONE[p].text}>{PLACE_NAMES[p]}</span>
                <span class="text-muted tabular-nums">
                  {Math.round((split.places[p] / split.totalMs) * 100)}% · {formatMinutes(split.places[p])}
                </span>
              </li>
            ))}
          </ul>

          <h3 class="mt-5 text-[11px] font-semibold tracking-wider text-muted uppercase">By task</h3>
          <ul class="mt-2 grid gap-2.5">
            {split.tasks.slice(0, 8).map((t) => (
              <li key={t.note.id}>
                <div class="flex items-baseline gap-2 text-sm">
                  <span class={`min-w-0 flex-1 truncate ${t.note.tag === 'done' ? 'text-muted' : ''}`}>{plainText(t.note.text)}</span>
                  <span class="shrink-0 text-xs text-muted tabular-nums" title="Time per story point">
                    {formatMinutes(t.msPerPoint)}/SP
                  </span>
                  <span class="w-14 shrink-0 text-right font-medium tabular-nums">{formatMinutes(t.ms)}</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-high">
                  <div class={`h-full rounded-full ${PLACE_TONE[placeOf(t.note)].dot}`} style={{ width: `${Math.max(2, t.share * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div class={TILE}>
      <dt class="text-xs text-muted">{label}</dt>
      <dd class="mt-0.5 truncate font-semibold" title={value}>
        {value}
      </dd>
    </div>
  );
}

function Trend({ now, before }: { now: number; before: number }) {
  if (before === 0) return now > 0 ? <span class="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-ok">New</span> : null;
  const change = Math.round(((now - before) / before) * 100);
  const up = change >= 0;
  return (
    <span class={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${up ? 'bg-ok/15 text-ok' : 'bg-error/15 text-error'}`}>
      {up ? '▲' : '▼'} {Math.abs(change)}%
    </span>
  );
}

const INSIGHT: Record<Insight['tone'], { icon: IconName; tone: string }> = {
  good: { icon: 'done', tone: 'text-ok' },
  warn: { icon: 'do', tone: 'text-warn' },
  info: { icon: 'timer', tone: 'text-live' },
};

function InsightRow({ insight }: { insight: Insight }) {
  const look = INSIGHT[insight.tone];
  return (
    <li class="flex animate-rise gap-3 rounded-2xl bg-surface-high/80 px-3.5 py-3 text-sm leading-5">
      <Icon name={look.icon} class={`mt-px size-5 shrink-0 ${look.tone}`} />
      <span>{insight.text}</span>
    </li>
  );
}

/** "1h 30m · span 2h" for a finished task: the work, then the clock time it took including pauses. */
function FinishedTime({ note, nowMs }: { note: Note; nowMs: number }) {
  const t = taskTiming(note, nowMs);
  if (!t || t.actualMs < 60_000) return null;
  return (
    <span class="shrink-0 text-xs text-muted tabular-nums" title={t.start ? `${t.pauses} pauses, ${formatMinutes(t.pausedMs)} paused` : undefined}>
      {formatMinutes(t.actualMs)}
      {t.start && t.pausedMs >= 60_000 && <span class="hidden sm:inline"> · span {formatMinutes(t.spanMs)}</span>}
    </span>
  );
}
