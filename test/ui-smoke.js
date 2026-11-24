// Browser smoke test against the local test server (node test/server.js). Covers the setup screen, the demo,
// the brand kit, sign-up, the coach chat, the library, the admin page and the set password link, light and dark,
// desktop and phone.
// Usage: node test/ui-smoke.js        Screenshots land in test/shots.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = +process.env.PORT || 5055;
const U = `http://127.0.0.1:${PORT}/`;
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = (p, n, full) => p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: !!full });
let pass = 0; let fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? String(extra).slice(0, 300) : ''); } };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errs = [];
  const page = async (vp, theme = 'light') => {
    const c = await b.newContext({ viewport: vp });
    await c.addInitScript((t) => { localStorage.setItem('gai-theme', t); localStorage.setItem('gai-about-seen', '1'); }, theme);
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return p;
  };
  const signIn = async (p, email, password) => { await p.fill('input[name=email]', email); await p.fill('input[name=password]', password); await p.click('button[type=submit]'); };

  // 1. A deploy without its settings shows what to do and links to the setup guide.
  let p = await page({ width: 1280, height: 820 });
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  await p.route(U, (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.APP_CONFIG = {"error":"SUPABASE_URL is missing. Add it in Vercel, then redeploy.","guide":"https://github.com/gustensun/funnel-os-kit/blob/main/SETUP.md"};' }));
  await p.goto(U); await p.waitForSelector('.gate');
  const gateText = await p.locator('.gate').innerText();
  ok('setup screen', /Finish the setup/.test(gateText) && /SUPABASE_URL is missing/.test(gateText), gateText);
  ok('setup guide link', (await p.locator('.gate a[href$="SETUP.md"]').count()) === 1);
  await shot(p, 'setup-screen');

  // 2. Sign-in page with the one click demo.
  p = await page({ width: 1280, height: 820 });
  await p.goto(U); await p.waitForSelector('[data-demo]'); await shot(p, 'signin');
  await p.click('[data-demo]'); await p.waitForSelector('.demo-note'); await p.waitForTimeout(500); await shot(p, 'demo');
  ok('demo user named', /Sam Rivera/.test(await p.locator('.side').innerText()));
  ok('brand kit tabs in the sidebar', (await p.locator('#kitnav [data-kit]').count()) === 5, await p.locator('#kitnav').innerText());
  ok('demo pinned chat listed', /first low-ticket offer/.test(await p.locator('#threads').innerText()), await p.locator('#threads').innerText());
  await p.click('#kitnav [data-kit=offers]'); await p.waitForSelector('.kit-head'); await p.waitForTimeout(400); await shot(p, 'brand-kit');
  ok('brand kit opens on its tab', (await p.locator('#kitnav [data-kit=offers][aria-current=page]').count()) === 1 && /What you sell/.test(await p.locator('#main').innerText()), await p.locator('#main').innerText());

  // 3. Sign-up waits for approval.
  await p.click('[data-join]'); await p.waitForSelector('input[name=name]');
  await p.fill('input[name=name]', 'Sam Taylor'); await p.fill('input[name=email]', 'sam@person.test'); await p.fill('input[name=password]', 'samspassword');
  await p.click('button[type=submit]'); await p.waitForSelector('.gate'); await shot(p, 'pending');
  ok('sign-up waits for approval', /You are on the list/.test(await p.locator('.gate').innerText()));

  // 4. The admin: Funnel OS home, the coach chat with a streamed answer, the library.
  p = await page({ width: 1280, height: 860 });
  await p.goto(U); await signIn(p, 'admin@x.test', 'password1'); await p.waitForSelector('.side'); await p.waitForTimeout(1200);
  await shot(p, 'home-light');
  ok('home is Funnel OS', /My funnels/.test(await p.locator('main').innerText()) && /Ask Jamie AI/.test(await p.locator('main').innerText()));
  await p.click('[data-ask-coach]'); await p.waitForSelector('#q');
  await p.fill('#q', 'My sales page does not convert, what do I fix first?'); await p.click('#send');
  await p.waitForSelector('text=Next step', { timeout: 20000 }); await p.waitForTimeout(800); await shot(p, 'chat-answer');
  ok('answer cites the library', /Funnel Formula|CONVERSIONS|Coaching call|sales page/i.test(await p.locator('main').innerText()));
  await p.click('[data-me]'); await p.click('[data-a=library]');
  await p.waitForSelector('.sheet input[type=search]', { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(600);
  const lib = await p.locator('.sheet').innerText().catch(() => '');
  ok('library lists the starter frameworks', /The Funnel Formula/.test(lib) && /The 17Ps of funnel sections/.test(lib), lib.slice(0, 200));
  await shot(p, 'library');

  // 5. Admin page: approve the new member, a bad key explains the fix, a good key saves.
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.goto(U + '#/admin'); await p.waitForSelector('#keys');
  await p.locator('#pend .member', { hasText: 'sam@person.test' }).locator('[data-set=approved]').click(); await p.waitForTimeout(800);
  ok('member approved', (await p.locator('#act .member', { hasText: 'sam@person.test' }).count()) === 1);
  const row = p.locator('[data-k=perplexity]');
  await row.locator('input').fill('bad-key'); await row.locator('[data-key=save]').click(); await p.waitForSelector('.key-err');
  ok('bad key says what to do', /key/i.test(await p.locator('.key-err').innerText()), await p.locator('.key-err').innerText());
  await row.locator('input').fill('pplx-good-1234'); await row.locator('[data-key=save]').click();
  await p.waitForFunction(() => /ending 1234/.test(document.body.innerText), null, { timeout: 8000 }).then(() => ok('good key saved', true)).catch(() => ok('good key saved', false));
  await p.locator('#keys').scrollIntoViewIfNeeded(); await shot(p, 'admin');

  // 6. Password link for a member, used once.
  await p.locator('#act .member', { hasText: 'sam@person.test' }).locator('[data-reset]').click(); await p.waitForSelector('.sheet .copy-row');
  const shown = await p.locator('.sheet .copy-row input').inputValue();
  ok('password link uses APP_URL', shown.startsWith('https://funnels.example.com/#set/'), shown.replace(/[a-f0-9]{30,}/, 'CODE'));
  const link = shown.replace('https://funnels.example.com/', U);
  ok('password link made', /#set\/[a-f0-9]{20,}/.test(link), link.replace(/[a-f0-9]{30,}/, 'CODE'));
  const p2 = await page({ width: 1280, height: 820 });
  await p2.goto(link); await p2.waitForSelector('input[name=password]');
  await p2.fill('input[name=password]', 'brandnew123'); await p2.click('button[type=submit]'); await p2.waitForSelector('.side');
  ok('set password signs in', true);
  const p3 = await page({ width: 1280, height: 820 }); await p3.goto(link); await p3.waitForSelector('.form-msg.bad');
  ok('used link refused', /used|expired|new link/i.test(await p3.locator('.form-msg').innerText()), await p3.locator('.form-msg').innerText());

  // 7. Dark mode and phone.
  for (const [vp, theme, name] of [[{ width: 1280, height: 860 }, 'dark', 'home-dark'], [{ width: 390, height: 844 }, 'light', 'home-phone'], [{ width: 390, height: 844 }, 'dark', 'chat-phone-dark']]) {
    const q = await page(vp, theme);
    await q.goto(U); await signIn(q, 'admin@x.test', 'password1'); await q.waitForSelector('.side', { state: 'attached' }); await q.waitForTimeout(1200);
    if (name.startsWith('chat')) { await q.click('[data-ask-coach]'); await q.waitForSelector('#q'); await q.waitForTimeout(400); }
    await shot(q, name);
    ok(name + ' fits the screen', !(await overflow(q)));
  }

  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`passed ${pass}, failed ${fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
