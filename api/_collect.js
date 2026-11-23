// Reads the pages the member points at and keeps what is real on them: the product names, categories,
// counts and preview images. A template gallery, a product grid or a course page gives the build real
// screenshots and names to sell with, so it never has to draw stand-in boxes.
const sharp = require('sharp');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 FunnelOS';
const SHOT = () => process.env.FOS_SHOT_API || 'https://api.microlink.io';
const MAX_SITES = 3;
const MAX_ITEMS = 400;

const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i')); return m ? (m[1] != null ? m[1] : m[2]) : ''; };
const abs = (u, base) => { try { return new URL(u, base).href; } catch { return ''; } };

async function get(url, ms = 9000, binary = false) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA, Accept: binary ? 'image/avif,image/webp,image/png,image/jpeg,*/*' : 'text/html,*/*' }, redirect: 'follow' });
    if (!r.ok) return null;
    if (binary) { const len = +(r.headers.get('content-length') || 0); if (len > 4_000_000) return null; const b = Buffer.from(await r.arrayBuffer()); return b.length > 4_000_000 ? null : { buf: b, type: r.headers.get('content-type') || '' }; }
    return { html: (await r.text()).slice(0, 1_500_000), url: r.url || url };
  } catch { return null; } finally { clearTimeout(t); }
}

// Every link the member gave: the links field first, then any link inside what they wrote.
function linksOf(q) {
  const out = []; const seen = new Set();
  const add = (u) => { u = String(u || '').replace(/[),.;:]+$/, ''); if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(u)) return; const k = u.replace(/\/$/, ''); if (seen.has(k)) return; seen.add(k); out.push(u); };
  (q.urls || []).forEach(add);
  [q.offer, q.notes, ...((q.docs || []).map((d) => d.text))].forEach((t) => (String(t || '').match(/https?:\/\/[^\s<>"')]+/g) || []).forEach(add));
  return out.slice(0, MAX_SITES);
}

// The page in plain facts plus the repeated cards on it (name, label, category, link, image).
function parse(html, url) {
  const meta = (n) => { const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*>`, 'i')); return m ? clean(attr(m[0], 'content')) : ''; };
  const title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).slice(0, 160);
  const h1 = clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]).slice(0, 200);
  const desc = (meta('description') || meta('og:description')).slice(0, 400);
  const og = abs(meta('og:image'), url);
  // Section ids mapped to their heading, so data-cat="coaches" reads as "Coaches".
  const groups = {};
  for (const m of html.matchAll(/<(?:section|div)[^>]+(?:id|data-group)=["']([a-z0-9_-]{2,60})["'][^>]*>[\s\S]{0,600}?<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi)) { if (!groups[m[1]]) groups[m[1]] = clean(m[2]).slice(0, 60); }
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => clean(m[1])).filter((x) => x && x.length < 80).slice(0, 24);
  const items = []; const seen = new Set();
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (let k = 0; k < imgs.length && items.length < MAX_ITEMS; k++) {
    const tag = imgs[k][0]; const at = imgs[k].index;
    let src = attr(tag, 'src') || attr(tag, 'data-src') || (attr(tag, 'srcset') || attr(tag, 'data-srcset')).split(',').pop().trim().split(/\s+/)[0];
    if (!src || /^data:/i.test(src) || /\.svg(\?|$)/i.test(src)) continue;
    const alt = clean(attr(tag, 'alt'));
    const w = +attr(tag, 'width') || 0; const h = +attr(tag, 'height') || 0;
    if ((w && w < 240) || (h && h < 160)) continue;
    if (/logo|icon|avatar|favicon|sprite|badge|emoji|pixel|tracking/i.test(src + ' ' + attr(tag, 'class') + ' ' + alt)) continue;
    src = abs(src, url); if (!src || seen.has(src)) continue; seen.add(src);
    // The card around the image: the nearest opening li, article or card element before it.
    const before = html.slice(Math.max(0, at - 1800), at);
    const open = Math.max(before.lastIndexOf('<li'), before.lastIndexOf('<article'), before.search(/<[a-z]+[^>]*class=["'][^"']*\b(card|item|tile|product|template)\b[^"']*["'][^>]*>(?![\s\S]*<[a-z]+[^>]*class=["'][^"']*\b(card|item|tile|product|template)\b)/i));
    const head = open >= 0 ? before.slice(open) : '';
    const cardTag = (head.match(/^<[^>]+>/) || [''])[0];
    const aOpen = before.lastIndexOf('<a '); const href = aOpen >= 0 && before.indexOf('</a>', aOpen) === -1 ? abs(attr(before.slice(aOpen).match(/^<a\b[^>]*>/i)[0] || '', 'href'), url) : '';
    const next = k + 1 < imgs.length ? imgs[k + 1].index : html.length;
    const after = html.slice(at, Math.min(next, at + 1800));
    let name = clean((after.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i) || [])[1]);
    let label = clean((after.match(/<[a-z]+[^>]*class=["'][^"']*\b(label|tag|meta|category|type|kind)\b[^"']*["'][^>]*>([\s\S]*?)<\/[a-z]+>/i) || [])[2]) || attr(cardTag, 'data-funnel-label') || attr(cardTag, 'data-label');
    if (!name) name = alt.replace(/^(preview|screenshot|image|picture) of (the )?/i, '').replace(/\s+(template|preview|screenshot)$/i, '');
    if (name && label.startsWith(name)) label = label.slice(name.length).trim();
    const cat = attr(cardTag, 'data-cat') || attr(cardTag, 'data-category') || '';
    items.push({ name: name.slice(0, 80), label: label.slice(0, 60), cat, cat_name: groups[cat] || '', href, live: attr(cardTag, 'data-live') || '', src, alt: alt.slice(0, 140), w, h });
  }
  // A gallery is a run of named cards. Loose images from a normal page are kept apart from it.
  const named = items.filter((x) => x.name);
  const gallery = named.length >= 4;
  const cats = {}; (gallery ? named : []).forEach((x) => { const c = x.cat_name || x.label || x.cat; if (c) cats[c] = (cats[c] || 0) + 1; });
  const labels = {}; (gallery ? named : []).forEach((x) => { if (x.label) labels[x.label] = (labels[x.label] || 0) + 1; });
  return { url, title, h1, desc, og, headings, gallery, items: gallery ? named : items.slice(0, 12), count: gallery ? named.length : 0, cats, labels };
}

// A spread across categories, so 30 shots show the range instead of 30 of the first kind.
function pick(items, n) {
  const by = new Map(); items.forEach((x) => { const k = x.cat || x.label || '_'; if (!by.has(k)) by.set(k, []); by.get(k).push(x); });
  const lanes = [...by.values()]; const out = [];
  for (let i = 0; out.length < n && lanes.some((l) => l.length > i); i++) lanes.forEach((l) => { if (l[i] && out.length < n) out.push(l[i]); });
  return out;
}

// Same size and format for everything: WebP, at most 1200 wide, top of the page kept for tall shots.
async function normalize(buf) {
  const img = sharp(buf, { failOn: 'none' }); const m = await img.metadata();
  if (!m.width || m.width < 240) return null;
  let p = sharp(buf, { failOn: 'none' }).rotate();
  if (m.height > m.width * 2.2) p = p.extract({ left: 0, top: 0, width: m.width, height: Math.round(m.width * 1.6) });
  const out = await p.resize({ width: Math.min(1200, m.width), withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  return { buf: out.data, w: out.info.width, h: out.info.height };
}

async function screenshot(url, w = 1440, h = 900) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 45000);
    const r = await fetch(`${SHOT()}/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&viewport.width=${w}&viewport.height=${h}&viewport.deviceScaleFactor=1&waitForTimeout=1800`, { signal: ctl.signal });
    clearTimeout(t); if (!r.ok) return null;
    const j = await r.json(); const u = j && j.data && j.data.screenshot && j.data.screenshot.url; if (!u) return null;
    const g = await get(u, 20000, true); return g ? g.buf : null;
  } catch { return null; }
}

// Reads every link, keeps up to `max` real images and saves them through `save(name, b64, label)`.
async function collect({ q, id, max = 30, save, deadline }) {
  const links = linksOf(q); const sites = []; const shots = [];
  const pages = await Promise.all(links.map((u) => get(u)));
  for (let i = 0; i < links.length; i++) { const p = pages[i]; if (p) sites.push(parse(p.html, p.url)); else sites.push({ url: links[i], failed: true, items: [], count: 0, cats: {}, labels: {} }); }
  const gal = sites.filter((s) => s.gallery);
  const per = gal.length ? Math.ceil(max / gal.length) : 0;
  const wanted = [];
  gal.forEach((s) => pick(s.items, per).forEach((x) => wanted.push({ ...x, site: s.url, kind: 'product' })));
  // Plain pages: their own pictures (photos, product shots) and one screenshot of the first screen.
  sites.filter((s) => !s.gallery && !s.failed).forEach((s) => { s.items.slice(0, 6).forEach((x) => wanted.push({ ...x, site: s.url, kind: 'site' })); });
  let n = 0;
  await Promise.all(wanted.slice(0, max).map(async (x, i) => {
    if (deadline && Date.now() > deadline) return;
    const g = await get(x.src, 12000, true); if (!g || !/^image\//.test(g.type)) return;
    let v = null; try { v = await normalize(g.buf); } catch { v = null; } if (!v) return;
    const name = `ref-${id.slice(0, 8)}-${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6)}.webp`;
    try { await save(name, v.buf.toString('base64'), [x.name, x.label].filter(Boolean).join(' · ') || 'Image from ' + new URL(x.site).host); } catch { return; }
    shots.push({ name, title: x.name, label: x.label, cat: x.cat_name || x.cat, href: x.live || x.href, site: x.site, kind: x.kind, w: v.w, h: v.h, order: i }); n++;
  }));
  // A site with no usable pictures still shows up as itself: a screenshot of its first screen.
  for (const s of sites.filter((y) => !y.failed && !shots.some((z) => z.site === y.url))) {
    if (deadline && Date.now() > deadline - 50000) break;
    const b = await screenshot(s.url); if (!b) continue;
    let v = null; try { v = await normalize(b); } catch { v = null; } if (!v) continue;
    const name = `ref-${id.slice(0, 8)}-s${sites.indexOf(s)}-${Math.random().toString(36).slice(2, 6)}.webp`;
    try { await save(name, v.buf.toString('base64'), 'Screenshot of ' + new URL(s.url).host); } catch { continue; }
    shots.push({ name, title: s.title || new URL(s.url).host, label: 'Screenshot', site: s.url, kind: 'screenshot', w: v.w, h: v.h, order: 900 });
  }
  shots.sort((a, b) => a.order - b.order);
  return {
    shots,
    sites: sites.map((s) => ({ url: s.url, failed: !!s.failed, title: s.title, h1: s.h1, desc: s.desc, gallery: !!s.gallery, count: s.count, cats: s.cats, labels: s.labels, headings: (s.headings || []).slice(0, 14), names: (s.items || []).filter((x) => x.name).slice(0, 160).map((x) => [x.name, x.label, x.cat_name || x.cat].filter(Boolean).join(' | ')) })),
  };
}

module.exports = { collect, parse, pick, linksOf, normalize, screenshot };
