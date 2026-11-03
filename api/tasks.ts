import { getCookie, isAllowed, isSameOrigin, readAuthConfig, readSession, SESSION_COOKIE } from './_lib/auth';
import { createLimiter } from './_lib/limiter';
import { createSheets, readSheetsConfig, upsertTasks, type Sheets } from './_lib/sheets';
import { handleTaskSync } from './_lib/tasks-handler';
import { isNote } from '../src/lib/notes';
import { TASK_HEADERS, taskRow } from '../src/lib/timing';

/** POST /api/tasks → upsert the signed-in person's changed tasks into the Tasks tab. */
const limiter = createLimiter(30, 60_000);
let sheets: Sheets | null = null;

export async function POST(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  const sheetCfg = readSheetsConfig(process.env);
  return handleTaskSync(request, {
    configured: cfg.configured,
    sheetConfigured: sheetCfg.configured,
    isSameOrigin: (req) => isSameOrigin(req, cfg.appUrl),
    readUser: async (req) => {
      const user = await readSession(getCookie(req, SESSION_COOKIE), cfg.secret, Date.now());
      return user && isAllowed(cfg, user.email) ? user : null;
    },
    allow: limiter,
    isTask: isNote,
    row: taskRow,
    write: (email, rows, deletes) => upsertTasks((sheets ??= createSheets(sheetCfg)), TASK_HEADERS, email, rows, deletes),
    now: Date.now,
  });
}
