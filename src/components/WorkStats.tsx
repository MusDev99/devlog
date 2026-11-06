import { formatMinutes } from '../lib/stats.ts';
import type { Sizing, Streams } from '../lib/work.ts';
import { Icon } from './Icon.tsx';

const CARD = 'rounded-[28px] border border-line/70 bg-surface/80 p-4 sm:p-5';

/** Last 7 days of tracked time grouped by the Jira ticket or GitHub repo in each task's link. */
export function TicketTime({ data }: { data: Streams }) {
  const unlinked = data.totalMs - data.linkedMs;
  return (
    <section aria-labelledby="tickets-title" class={CARD}>
      <h2 id="tickets-title" class="text-lg font-semibold">
        Time by ticket or repo
      </h2>
      <p class="text-xs text-muted">
        Last 7 days · {formatMinutes(data.linkedMs)} of {formatMinutes(data.totalMs)} tracked has a link
      </p>
      {data.streams.length === 0 ? (
        <p class="mt-4 text-sm leading-6 text-muted">Paste a Jira or GitHub link into a task and time it: this shows how long each ticket and repo took.</p>
      ) : (
        <ul class="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          {data.streams.slice(0, 6).map((s) => (
            <li key={s.source.key}>
              <div class="flex items-center gap-2 text-sm">
                <a
                  href={s.source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.source.href}
                  class="press inline-flex min-h-11 min-w-0 max-w-[60%] items-center gap-1 text-google-blue"
                >
                  <span class="truncate font-semibold">{s.source.label}</span>
                  <Icon name="open" class="size-3.5 shrink-0" />
                </a>
                <span class="min-w-0 flex-1 truncate text-xs text-muted">
                  {s.tasks} {s.tasks === 1 ? 'task' : 'tasks'}
                  {s.done > 0 ? ` · ${s.done} done · ${s.points} SP` : ''}
                </span>
                <span class="shrink-0 font-medium tabular-nums">{formatMinutes(s.ms)}</span>
              </div>
              <div class="-mt-1 h-1.5 overflow-hidden rounded-full bg-surface-high">
                <div class="h-full rounded-full bg-google-blue/70" style={{ width: `${Math.max(2, s.share * 100)}%` }} />
              </div>
            </li>
          ))}
          {unlinked > 0 && (
            <li class="flex items-center justify-between text-xs text-muted">
              <span>No link</span>
              <span class="tabular-nums">{formatMinutes(unlinked)}</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

/** Do bigger story points really take longer? Average time of finished, timed tasks per size (last 4 weeks). */
export function SizingCheck({ data }: { data: Sizing }) {
  const max = Math.max(1, ...data.rows.map((r) => r.avgMs));
  return (
    <section aria-labelledby="sizing-title" class={CARD}>
      <h2 id="sizing-title" class="text-lg font-semibold">
        Sizing check
      </h2>
      <p class="text-xs text-muted">Finished tasks, last 4 weeks · average time per size</p>
      {data.rows.length === 0 ? (
        <p class="mt-4 text-sm leading-6 text-muted">Finish a few timed tasks (5 min or more) to see how long each size really takes.</p>
      ) : (
        <>
          <ul class="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {data.rows.map((r) => (
              <li key={r.size} class="flex items-center gap-3 text-sm">
                <span class="w-10 shrink-0 font-semibold tabular-nums">{r.size} SP</span>
                <div class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-high">
                  <div class="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (r.avgMs / max) * 100)}%` }} />
                </div>
                <span class="w-24 shrink-0 text-right text-xs tabular-nums">
                  <span class="font-medium">{formatMinutes(r.avgMs)}</span> <span class="text-muted">· {r.tasks}×</span>
                </span>
              </li>
            ))}
          </ul>
          {data.verdict && (
            <p class={`mt-4 rounded-xl px-3 py-2 text-sm leading-6 ${data.verdict === 'tracks' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>
              {data.verdict === 'tracks'
                ? 'Bigger sizes take longer: your story points track effort.'
                : `A ${data.example?.[1]} SP task took less time than a ${data.example?.[0]} SP one. Re-size after finishing so the next estimate is closer.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
