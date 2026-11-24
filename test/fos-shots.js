// The quality check's screenshots in a real browser: full-page tiles on desktop and phone, and the layout
// facts read from the page (sideways scrolling, broken images, text out of its box, tiny text, small tap
// targets, content that never appears). Test only, never deployed.
// Usage: FOS_CHROME=/path/to/chrome-headless-shell node test/fos-shots.js
//        SPARTICUZ=1 node test/fos-shots.js   (the Chromium build the Vercel function uses)
if (process.env.SPARTICUZ) { delete process.env.FOS_CHROME; process.env.VERCEL = '1'; }
delete process.env.FOS_SHOT_MOCK;
const http = require('http');
const sharp = require('sharp');
const S = require('../api/_shot.js');
const F = require('../api/_fos.js');
let pass = 0; let fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } };

const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font:16px/1.5 sans-serif}section{padding:80px 24px;min-height:700px}h1{font-size:44px;margin:0}</style>';
const PAGES = {
  '/good': `${head}</head><body><header id="top" style="height:80px">Northside</header><main><section id="hero"><h1>Run without knee pain</h1><p>A six week plan.</p><a href="#" style="display:inline-block;padding:14px 22px">Join</a></section><section id="offer"><h2>What is included</h2><p>Six sessions.</p></section><section id="faq"><h2>Questions</h2><p>Answers.</p></section></main><footer style="height:200px">Footer</footer></body></html>`,
  '/bad': `${head}<style>.wide{width:640px;background:#eee}.tiny{font-size:10px}.reveal{opacity:0}.box{width:160px;overflow:visible}.box h2{white-space:nowrap}</style></head><body><header style="height:80px">Northside</header><main><section id="hero"><h1>Run without knee pain</h1><div class="wide">This block is wider than a phone</div><img src="/missing.png" alt="Runner" width="300" height="200"></section><section id="proof"><div class="box"><h2>A heading that never wraps at all</h2></div>${Array.from({ length: 10 }, (_, i) => `<p class="tiny">Fine print ${i + 1}</p>`).join('')}<div class="reveal">Shows on scroll</div><p><a href="#" style="display:inline-block;padding:2px">a</a> <a href="#" style="display:inline-block;padding:2px">b</a> <a href="#" style="display:inline-block;padding:2px">c</a> <a href="#" style="display:inline-block;padding:2px">d</a></p><button style="height:24px">Go</button> <button style="height:24px">Back</button> <button style="height:24px">More</button> <button style="height:24px">Less</button></section></main><footer>Footer</footer></body></html>`,
  '/tall': `${head}</head><body>${Array.from({ length: 25 }, (_, i) => `<section id="s${i}" style="height:800px;background:${i % 2 ? '#f4efe6' : '#fff'}"><h2>Section ${i + 1}</h2></section>`).join('')}</body></html>`,
};
const server = http.createServer((req, res) => {
  const html = PAGES[req.url.split('?')[0]];
  if (!html) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const U = 'http://127.0.0.1:' + server.address().port;
  const t0 = Date.now();
  let r = await S.shoot([U + '/good', U + '/bad'], { deadline: Date.now() + 120000 });
  console.log('two pages on two devices in', Math.round((Date.now() - t0) / 100) / 10, 's');
  ok('browser started', !r.error && r.pages.length === 2, r.error);
  const [good, bad] = r.pages;
  for (const d of ['desktop', 'phone']) {
    const g = good[d] || {};
    ok(`${d}: tiles taken`, (g.tiles || []).length >= 1 && g.tiles.every((t) => t.media_type === 'image/jpeg' && t.data.length > 1000), g.error || (g.tiles || []).length);
    if (!(g.tiles || []).length) continue;
    const m = await sharp(Buffer.from(g.tiles[0].data, 'base64')).metadata();
    ok(`${d}: tile sized for the reviewer`, m.format === 'jpeg' && m.width <= (d === 'phone' ? 390 : 1024) && m.width >= (d === 'phone' ? 300 : 900), m);
    ok(`${d}: clean page has no layout facts`, g.facts && !g.facts.overflow.length && !g.facts.broken.length && !g.facts.spill.length && g.facts.tiny === 0 && g.facts.hidden === 0, g.facts);
    ok(`${d}: sections named on the tiles`, g.facts.sections.some((x) => x.id === 'hero') && g.facts.sections.some((x) => x.id === 'footer') && g.tiles[0].sections.includes('hero'), [g.facts.sections, g.tiles.map((t) => t.sections)]);
  }
  ok('phone: clean page has big enough tap targets', good.phone.facts.small === 0, good.phone.facts.small);
  const bp = bad.phone.facts || {}; const bd = bad.desktop.facts || {};
  ok('phone: sideways scrolling found and named', bp.overflow.length >= 1 && /div\.wide/.test(bp.overflow.join(' ')), bp.overflow);
  ok('desktop: no sideways scrolling', bd.overflow.length === 0, bd.overflow);
  ok('broken image found', bd.broken.length === 1 && /missing\.png/.test(bd.broken[0]), bd.broken);
  ok('heading out of its box found', bd.spill.length >= 1 && /never wraps/.test(bd.spill.join(' ')), bd.spill);
  ok('tiny text counted', bd.tiny >= 10, bd.tiny);
  ok('content that never appears counted', bd.hidden >= 1, bd.hidden);
  ok('small tap targets on the phone counted', bp.small >= 4, bp.small);
  const checks = [...F.factChecks(bd, 'desktop'), ...F.factChecks(bp, 'phone')];
  ok('facts become checks with the fix', checks.some((c) => /^On the phone, the page scrolls sideways: .*Make these fit the screen width/.test(c)) && checks.some((c) => /image does not load/.test(c)) && checks.some((c) => /smaller than 12px/.test(c)) && checks.some((c) => /44px/.test(c)) && checks.some((c) => /data-reveal/.test(c)), checks);
  // A long page is cut into at most 10 tiles that cover it from top to bottom.
  r = await S.shoot([U + '/tall'], { deadline: Date.now() + 120000 });
  const tl = r.pages[0].desktop.tiles;
  ok('long page: at most 10 tiles, top to bottom', tl.length <= 10 && tl.length >= 9 && tl[0].y === 0 && tl.every((t, i) => !i || t.y === tl[i - 1].y + tl[i - 1].h) && tl[tl.length - 1].y + tl[tl.length - 1].h >= 19900, tl.map((t) => [t.y, t.h]));
  ok('long page: phone tiles too', r.pages[0].phone.tiles.length >= 9, r.pages[0].phone.tiles.length);
  // A page that does not open is reported, the browser keeps going.
  r = await S.shoot(['http://127.0.0.1:1/nothing'], { deadline: Date.now() + 60000 });
  ok('unreachable page reported per device', r.pages[0].desktop.tiles.length === 0 && /ERR_CONNECTION_REFUSED|net::/.test(r.pages[0].desktop.error), r.pages[0].desktop.error);
  await S.close();
  r = await S.shoot([U + '/good'], { deadline: Date.now() + 60000 });
  ok('browser starts again after close', r.pages[0].desktop.tiles.length >= 1, r.error);
  await S.close();
  server.close();
  console.log(`shots: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
