// Smoke test for a built tracker: loads it at desktop and phone widths on several places and reports page errors,
// horizontal overflow and whether the main sections rendered. Saves a screenshot of each page to widget/test/shots/.
//   node widget/test/smoke.mjs [built file, default widget/out/nc-turnout-tracker.js] [place ...]
// Places are hash routes: state, county:Wake, cd:1, hd:22, sd:9. Needs Playwright (preinstalled in the cloud container).
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');   // require() also finds a global install
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const file = path.resolve(args[0] && args[0].endsWith('.js') ? args.shift() : path.join(here, '..', 'out', 'nc-turnout-tracker.js'));
const places = args.length ? args : ['state', 'county:Wake', 'cd:1', 'hd:22', 'sd:18'];
const page = path.join(here, 'page.html'), shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(page, '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body><pre><code>nc-turnout-tracker</code></pre><script src="file://' + file + '"></script></body>');
const b = await chromium.launch(); let bad = 0;
for (const w of [900, 390]) for (const h of places) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + page + '#nc-turnout=' + encodeURIComponent(h)); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => ({
    over: document.documentElement.scrollWidth - innerWidth,
    sections: ['.tt-tiers', '.tt-edw', '.tt-gfx', '.tt-whosec'].filter(s => document.querySelector(s)).length,
    text: document.body.innerText.length }));
  await p.screenshot({ path: path.join(shots, w + '_' + h.replace(':', '') + '.png'), fullPage: true });
  const ok = !errs.length && r.over <= 0;
  if (!ok) bad++;
  console.log((ok ? 'ok  ' : 'BAD ') + w + ' ' + h + ' ' + JSON.stringify(r) + (errs.length ? ' errors: ' + errs.join(' | ') : ''));
  await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
