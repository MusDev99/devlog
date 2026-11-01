/** Post-deploy checks: `npm run smoke -- https://your-devlog.vercel.app`. Exits 1 if any check fails. */
import { runSmoke } from './smoke-checks.ts';

const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  console.error('Usage: npm run smoke -- <https://deploy-url>');
  process.exit(2);
}

const checks = await runSmoke(base, (url, init) => fetch(url, init));
for (const c of checks) console.log(`${c.ok ? '✅' : '❌'} ${c.name} (${c.detail})`);
const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `${failed} of ${checks.length} checks failed` : `All ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
