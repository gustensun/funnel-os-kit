// Full-page screenshots of the live previews for the quality check, on desktop and phone, cut into tiles so a
// reviewer sees every section from top to bottom. While the page is open it also reads layout facts that are
// hard to see in a picture: sideways scrolling on the phone, broken images, headings running out of their box,
// tiny text, small tap targets and content that never appeared.
// Chromium runs inside the function. FOS_CHROME points to a local Chrome for tests, FOS_SHOT_MOCK=1 returns
// synthetic tiles so the test suite runs without a browser.
const sharp = require('sharp');

const DEVICES = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  phone: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const TILE_MIN = 1500; // CSS px per tile before it grows to fit the tile cap
const MAX_TILES = 10; // per page and device
const OUT_W = { desktop: 1024, phone: 390 }; // pixel size sent to the reviewer
const OUT_H = { desktop: 2400, phone: 4000 };

let launching = null;
async function browser() {
  if (launching) return launching;
  launching = (async () => {
    const puppeteer = (await import('puppeteer-core')).default;
    if (process.env.FOS_CHROME) return puppeteer.launch({ executablePath: process.env.FOS_CHROME, headless: 'shell', args: ['--no-sandbox', '--hide-scrollbars', '--disable-dev-shm-usage'] });
    const chromium = (await import('@sparticuz/chromium')).default;
    chromium.setGraphicsMode = false;
    return puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: await puppeteer.defaultArgs({ args: [...chromium.args, '--hide-scrollbars'], headless: 'shell' }) });
  })();
  try { return await launching; } catch (e) { launching = null; throw e; }
}
async function close() {
  const l = launching; launching = null;
  if (l) { try { const b = await l; await b.close(); } catch { /* already gone */ } }
}

// Runs inside the page.
/* eslint-disable no-undef */
function readPage(phone) {
  // The layout width. A phone browser zooms out to fit content that is too wide, so innerWidth grows with it.
  const W = document.documentElement.clientWidth || window.innerWidth; const out = { height: Math.ceil(document.documentElement.scrollHeight), overflow: [], broken: [], spill: [], tiny: 0, small: 0, hidden: 0, sections: [] };
  const name = (el) => {
    const id = el.id ? '#' + el.id : ''; const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const t = (el.innerText || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return el.tagName.toLowerCase() + id + cls + (t ? ' "' + t + '"' : '');
  };
  const visible = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length; };
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return true; } return false; };
  if (document.documentElement.scrollWidth > W + 2) {
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      if (out.overflow.length >= 5) break;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W + 2 && visible(el) && !clipped(el) && !(el.parentElement && el.parentElement.getBoundingClientRect().right > W + 2)) out.overflow.push(name(el) + ' is ' + Math.round(r.right - W) + 'px too wide');
    }
    if (!out.overflow.length) out.overflow.push('the page scrolls sideways by ' + (document.documentElement.scrollWidth - W) + 'px');
  }
  for (const im of document.images) if (im.complete && im.naturalWidth === 0 && im.getAttribute('src') && out.broken.length < 6) out.broken.push((im.getAttribute('src') || '').slice(0, 90));
  for (const h of document.querySelectorAll('h1,h2,h3,.btn,button,a[class*="btn"]')) {
    if (out.spill.length >= 5) break;
    if (visible(h) && h.scrollWidth > h.clientWidth + 2 && getComputedStyle(h).overflowX === 'visible' && h.clientWidth > 0) out.spill.push(name(h) + ' runs ' + (h.scrollWidth - h.clientWidth) + 'px out of its box');
  }
  for (const el of document.querySelectorAll('p,li,span,a,small,label,td,figcaption,button')) {
    if (!el.childNodes.length || ![].some.call(el.childNodes, (n) => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
    if (!visible(el)) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 12) out.tiny++;
  }
  if (phone) for (const el of document.querySelectorAll('a,button,input,select,textarea')) {
    if (!visible(el)) continue; const s = getComputedStyle(el); if (s.display === 'inline' && el.closest('p,li')) continue;
    const r = el.getBoundingClientRect(); if (r.width && r.height && (r.height < 32 || r.width < 32)) out.small++;
  }
  for (const el of document.querySelectorAll('[data-reveal],[data-split],.reveal,.fade-in,[class*="animate"]')) { const s = getComputedStyle(el); if (visible(el) && (parseFloat(s.opacity) < 0.05)) out.hidden++; }
  const blocks = [...document.querySelectorAll('header, main > *, body > section, body > div > section, section, footer')].filter((el) => !el.parentElement.closest('section'));
  const seen = new Set();
  for (const el of blocks) {
    const r = el.getBoundingClientRect(); if (r.height < 60 || seen.has(el)) continue; seen.add(el);
    const h = el.querySelector('h1,h2,h3'); const id = el.id || (el.tagName === 'HEADER' ? 'header' : el.tagName === 'FOOTER' ? 'footer' : '') || (h ? h.innerText.trim().replace(/\s+/g, ' ').slice(0, 40) : el.tagName.toLowerCase());
    out.sections.push({ id, top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) });
  }
  out.sections.sort((a, b) => a.top - b.top);
  return out;
}
/* eslint-enable no-undef */

async function shootDevice(b, url, device, deadline) {
  const page = await b.newPage();
  try {
    const D = DEVICES[device];
    await page.setViewport(D);
    if (device === 'phone') await page.setUserAgent(PHONE_UA);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: Math.max(8000, Math.min(30000, deadline - Date.now() - 20000)) });
    // Scroll through once so lazy images load and anything that reveals on scroll is shown.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
      await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 2500); })));
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
    });
    await new Promise((r) => setTimeout(r, 400));
    const facts = await page.evaluate(readPage, device === 'phone');
    const H = Math.min(facts.height, 40000);
    const tileH = Math.max(TILE_MIN, Math.ceil(H / MAX_TILES));
    const tiles = [];
    for (let y = 0; y < H && tiles.length < MAX_TILES; y += tileH) {
      if (Date.now() > deadline - 12000) break;
      const h = Math.min(tileH, H - y); if (h < 40) break;
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y, width: D.width, height: h }, captureBeyondViewport: true });
      const img = await sharp(Buffer.from(png)).resize({ width: OUT_W[device], height: OUT_H[device], fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70, mozjpeg: true }).toBuffer();
      const secs = facts.sections.filter((s) => s.bottom > y + 20 && s.top < y + h - 20).map((s) => s.id);
      tiles.push({ device, y, h, sections: secs, media_type: 'image/jpeg', data: img.toString('base64') });
    }
    return { device, tiles, facts, height: facts.height };
  } finally { try { await page.close(); } catch { /* closed with the browser */ } }
}

// Returns { pages: [{ url, desktop: { tiles, facts }, phone: { tiles, facts } }], error }.
async function shoot(urls, { deadline = Date.now() + 120000 } = {}) {
  if (process.env.FOS_SHOT_MOCK === '1') return mock(urls);
  let b;
  try { b = await browser(); }
  catch (e) { return { pages: [], error: 'the screenshot browser did not start (' + String(e.message || e).slice(0, 120) + ')' }; }
  // The browser stays open for the next page; the caller closes it when the whole check is done.
  const pages = [];
  for (const url of urls) {
    if (Date.now() > deadline - 25000) break;
    const out = { url };
    for (const device of ['desktop', 'phone']) {
      try { out[device] = await shootDevice(b, url, device, deadline); }
      catch (e) { out[device] = { tiles: [], facts: null, error: String(e.message || e).slice(0, 140) }; }
    }
    pages.push(out);
  }
  return { pages, error: pages.length ? null : 'there was no time left to open the pages' };
}

async function mock(urls) {
  const tile = async (w, h, bg) => (await sharp({ create: { width: w, height: h, channels: 3, background: bg } }).jpeg({ quality: 60 }).toBuffer()).toString('base64');
  const pages = [];
  for (const url of urls) {
    const facts = { height: 3200, overflow: [], broken: [], spill: [], tiny: 0, small: 0, hidden: 0, sections: [{ id: 'hero', top: 0, bottom: 900 }, { id: 'offer', top: 900, bottom: 2400 }, { id: 'footer', top: 2400, bottom: 3200 }] };
    pages.push({
      url,
      desktop: { tiles: [{ device: 'desktop', y: 0, h: 1600, sections: ['hero', 'offer'], media_type: 'image/jpeg', data: await tile(256, 320, '#efe9dd') }, { device: 'desktop', y: 1600, h: 1600, sections: ['offer', 'footer'], media_type: 'image/jpeg', data: await tile(256, 320, '#e5ded0') }], facts },
      phone: { tiles: [{ device: 'phone', y: 0, h: 1600, sections: ['hero'], media_type: 'image/jpeg', data: await tile(130, 520, '#efe9dd') }], facts: { ...facts, small: 0 } },
    });
  }
  return { pages, error: null };
}

module.exports = { shoot, close, readPage, DEVICES };
