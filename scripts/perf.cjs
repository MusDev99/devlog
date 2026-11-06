// Manual perf harness (not part of verify). Needs Playwright (preinstalled in agent sessions) and a running `npm run preview`.
// Usage: NODE_PATH=$(npm root -g) node scripts/perf.cjs http://localhost:4173/ <label>
// Seeds 100 tasks, 375px viewport, 4x CPU throttle; prints idle-tick cost, tap-to-paint and drag cost.
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:4173/';
const label = process.argv[3] || 'run';
const N = 100;

const seed = (n) => {
  const now = Date.now();
  const places = ['unsorted', 'do', 'schedule', 'delegate', 'eliminate'];
  return Array.from({ length: n }, (_, i) => {
    const done = i % 5 === 0;
    const at = new Date(now - i * 3_600_000).toISOString();
    return {
      id: `perf-${i}`,
      text: i % 7 === 0 ? `Task ${i} https://airasia.atlassian.net/browse/SKYIQ-${10000 + i} review` : `Task ${i} write the thing`,
      tag: done ? 'done' : i === 1 ? 'doing' : 'todo',
      quadrant: places[i % 5],
      size: [1, 2, 3, 5, 8][i % 5],
      spentMs: (i % 9) * 120_000,
      createdAt: at,
      movedAt: at,
      day: at.slice(0, 10),
      ...(i === 1 ? { startedAt: new Date(now - 60_000).toISOString() } : {}),
    };
  });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(() => { localStorage.setItem('devlog.screen', 'tasks'); localStorage.setItem('devlog.view', 'matrix'); });
  await page.goto(url);
  await page.waitForSelector('#note-text', { state: 'attached', timeout: 15000 });
  await page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('devlog', 2);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction('notes', 'readwrite');
    rows.forEach((x) => tx.objectStore('notes').put(x));
    await new Promise((res) => (tx.oncomplete = res));
  }, seed(N));
  await page.evaluate(() => localStorage.setItem('devlog.view', 'matrix'));
  await page.reload();
  await page.waitForSelector('li');
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const out = { label, rows: await page.locator('li').count() };

  // 1) Idle tick cost: a stopwatch is running; 5 seconds of ticks.
  await page.evaluate(() => {
    window.__mut = 0;
    window.__nodes = new Set();
    new MutationObserver((l) => {
      window.__mut += l.length;
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await page.evaluate(() => (window.__mut = 0));
  const m0 = await metrics();
  await page.waitForTimeout(5000);
  const m1 = await metrics();
  out.tick5s = {
    scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000),
    layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000),
    styleMs: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000),
    taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000),
    domMutations: await page.evaluate(() => window.__mut),
  };

  // 2) Tap to visual change: "Mark done" on an open task.
  const taps = [];
  for (let i = 0; i < 5; i++) {
    const t = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const btn = [...document.querySelectorAll('button[aria-label^="Mark done"]')].find((b) => b.offsetParent);
          const list = btn.closest('section, main') || document.body;
          const t0 = performance.now();
          const mo = new MutationObserver(() => {
            mo.disconnect();
            requestAnimationFrame(() => resolve(performance.now() - t0));
          });
          mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
          btn.click();
        }),
    );
    taps.push(Math.round(t));
    await page.waitForTimeout(300);
  }
  out.tapToPaintMs = taps;

  // 3) Drag: mouse down on a row, 60 moves across the matrix, drop.
  const box = await page.locator('li button[data-row-main]').nth(3).boundingBox();
  const d0 = await metrics();
  const t0 = Date.now();
  await page.mouse.move(box.x + 40, box.y + 10);
  await page.mouse.down();
  for (let i = 0; i < 60; i++) await page.mouse.move(box.x + 40 + i * 2, box.y + 10 + i * 6);
  const d1 = await metrics();
  await page.mouse.up();
  out.drag60moves = {
    scriptMs: Math.round((d1.ScriptDuration - d0.ScriptDuration) * 1000),
    layoutMs: Math.round((d1.LayoutDuration - d0.LayoutDuration) * 1000),
    styleMs: Math.round((d1.RecalcStyleDuration - d0.RecalcStyleDuration) * 1000),
    perMoveMs: Math.round(((d1.TaskDuration - d0.TaskDuration) * 1000) / 60),
    wallMs: Date.now() - t0,
  };

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
