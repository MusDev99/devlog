import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin, type ViteDevServer } from 'vite';

/** The Vercel functions, by URL. Keep in step with `api/` (a new function needs a line here). */
export const API_ROUTES: Record<string, string> = {
  '/api/auth/login': '/api/auth/login.ts',
  '/api/auth/callback': '/api/auth/callback.ts',
  '/api/auth/session': '/api/auth/session.ts',
  '/api/tasks': '/api/tasks.ts',
};

type Handler = (request: Request) => Promise<Response>;

/**
 * `npm run dev` only: serves the real `api/` functions next to the app, so Google sign-in and the sheet
 * work locally without the Vercel CLI. Secrets come from `.env.local` (git-ignored), never the code.
 * Without them the functions answer 503 and the app runs local-only, exactly as on an unconfigured deploy.
 */
export function devApi(): Plugin {
  return {
    name: 'devlog-dev-api',
    apply: 'serve',
    configureServer(server) {
      // '' prefix: load every variable from .env / .env.local, not only VITE_* (server side only, never sent to the page).
      Object.assign(process.env, loadEnv(server.config.mode, server.config.root, ''));
      server.middlewares.use((req, res, next) => void serve(server, req, res).then((handled) => handled || next(), next));
    },
  };
}

async function serve(server: ViteDevServer, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const file = API_ROUTES[url.pathname];
  if (!file) return false;
  const method = req.method ?? 'GET';
  const handler = ((await server.ssrLoadModule(file)) as Record<string, Handler | undefined>)[method];
  if (!handler) {
    res.statusCode = 405;
    res.end();
    return true;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(key, v);
  }
  const chunks: Buffer[] = [];
  if (method !== 'GET' && method !== 'HEAD') for await (const chunk of req) chunks.push(chunk as Buffer);
  const response = await handler(new Request(url, { method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));

  res.statusCode = response.status;
  response.headers.forEach((value, key) => key !== 'set-cookie' && res.setHeader(key, value));
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}
