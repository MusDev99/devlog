import { getCookie, isAllowed, isSameOrigin, readAuthConfig, readSession, SESSION_COOKIE } from './_lib/auth.js';
import { createLimiter } from './_lib/limiter.js';
import { handleSettings } from './_lib/settings-handler.js';
import { createSheets, readSheetsConfig, readUserJira, writeUserJira, type Sheets } from './_lib/sheets.js';
import { isJiraBase, jiraFromCells, jiraToCells } from '../src/lib/jira.js';

/** GET / PUT /api/jira → the signed-in person's Jira site (an https origin, or '' for none), stored in their Users row. */
const limiter = createLimiter(30, 60_000);
let sheets: Sheets | null = null;

function handle(request: Request): Promise<Response> {
  const cfg = readAuthConfig(process.env);
  const sheetCfg = readSheetsConfig(process.env);
  const client = () => (sheets ??= createSheets(sheetCfg));
  return handleSettings(request, {
    configured: cfg.configured,
    sheetConfigured: sheetCfg.configured,
    isSameOrigin: (req) => isSameOrigin(req, cfg.appUrl),
    readUser: async (req) => {
      const user = await readSession(getCookie(req, SESSION_COOKIE), cfg.secret, Date.now());
      return user && isAllowed(cfg, user.email) ? user : null;
    },
    allow: limiter,
    field: 'jira',
    isValid: isJiraBase,
    fromCells: jiraFromCells,
    toCells: jiraToCells,
    read: (email) => readUserJira(client(), email),
    write: (email, cells) => writeUserJira(client(), email, cells),
    now: Date.now,
  });
}

export const GET = handle;
export const PUT = handle;
