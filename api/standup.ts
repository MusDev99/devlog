import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { MAX_PROMPT_CHARS, MAX_PROMPT_NOTES, promptSize } from '../src/lib/standup';
import { generateStandup } from './_lib/standup-model';
import { getCookie, isSameOrigin, readAuthConfig, readSession, SESSION_COOKIE } from './_lib/auth';
import { createLimiter } from './_lib/limiter';

/**
 * POST /api/standup — turns one or two days of notes into a standup.
 * Needs a Google sign-in session for an allow-listed email. Fails closed (503) when sign-in or
 * ANTHROPIC_API_KEY is not configured; the app then uses its rule-based standup.
 * Errors are generic to the client; details go to the server log only.
 */

const limiter = createLimiter(10, 60_000);

const RequestSchema = z.object({
  notes: z
    .array(
      z.object({
        ref: z.string().regex(/^N\d{1,3}$/),
        tag: z.enum(['done', 'doing', 'blocker']),
        when: z.enum(['previous', 'today']),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(MAX_PROMPT_NOTES),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  if (!cfg.configured || !process.env.ANTHROPIC_API_KEY) return json(503, { error: 'unavailable' });
  if (!isSameOrigin(request, cfg.appUrl)) return json(403, { error: 'forbidden' });
  const email = await readSession(getCookie(request, SESSION_COOKIE), cfg.secret, Date.now());
  if (!email || !cfg.allowedEmails.includes(email)) return json(401, { error: 'unauthorized' });
  if (!limiter(email, Date.now())) return json(429, { error: 'rate_limited' });

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid_request' });
  const notes = parsed.data.notes;
  if (promptSize(notes) > MAX_PROMPT_CHARS) return json(413, { error: 'too_long' });

  try {
    const result = await generateStandup(notes);
    return result ? json(200, result) : json(502, { error: 'ai_failed' });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json(429, { error: 'rate_limited' });
    if (error instanceof Anthropic.APIError) console.error('Standup API error', error.status);
    else console.error('Standup failed', error instanceof Error ? error.name : 'unknown');
    return json(502, { error: 'ai_failed' });
  }
}
