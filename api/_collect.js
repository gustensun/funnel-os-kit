// Reads the pages the member points at and keeps what is real on them: the product names, categories,
// counts and preview images. A template gallery, a product grid or a course page gives the build real
// screenshots and names to sell with, so it never has to draw stand-in boxes. A site they point at for
// its look, or one that sells other things, gives colors, fonts and facts only, never images.
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

// Every link read and parsed. A link that does not open is kept as failed, so the member hears about it.
async function read(links) {
  const pages = await Promise.all(links.map((u) => get(u)));
  return links.map((u, i) => (pages[i] ? { ...parse(pages[i].html, pages[i].url), asked: u } : { url: u, asked: u, failed: true, items: [], count: 0, cats: {}, labels: {} }));
}

// Links the member points at for the look only: named in the look field, or written next to words like
// "branding from", "colors", "fonts", "style of" or "looks like".
const LOOK_RE = /\bbrand(ing)?\b|\blook(s|ing)? like\b|\bthe look\b|\blook and feel\b|\bsame look\b|\bstyl(e|ed|ing)\b|\bcolou?rs?\b|\bfonts?\b|\btypography\b|\bdesign(ed)? like\b|\bvibe\b|\baesthetic\b|\binspired by\b|\binspiration\b|\bpalette\b|\bmatch(ing)? (the|my|our|their)\b/i;
const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
// A home page counts when its domain is named; a deeper page only when its own path is named, so a
// product page on the same site as the look stays a product page.
function lookLinks(q, links) {
  const out = new Set();
  const texts = [q.notes, q.offer, q.vibe, ...((q.docs || []).map((d) => d.text))].map((t) => String(t || '').toLowerCase());
  for (const u of links) {
    const h = hostOf(u); if (!h) continue;
    let p = ''; try { p = decodeURI(new URL(u).pathname).replace(/\/+$/, '').toLowerCase(); } catch { p = ''; }
    const n = h + p;
    if (String(q.vibe || '').toLowerCase().includes(n)) { out.add(u); continue; }
    for (const t of texts) {
      for (let i = t.indexOf(n); i !== -1 && !out.has(u); i = t.indexOf(n, i + 1)) {
        if (LOOK_RE.test(t.slice(Math.max(0, i - 80), i + n.length + 50))) out.add(u);
      }
      if (out.has(u)) break;
    }
  }
  return out;
}

// Sites named for the look without https, like "use my branding from yoursite.com" in the look field.
// Any domain in the look field counts; in the notes or offer only next to the same look words.
const DOMAIN_RE = /(^|[^a-z0-9@.\/-])((?:[a-z0-9-]+\.)+(?:com|io|co|ai|app|dev|net|org|me|so|xyz|site|online|store|shop|studio|design|agency|academy|pro|page|tv|fi|se|no|dk|de|nl|fr|es|it|uk|ca|au|us))(?![a-z0-9-])/gi;
function lookDomains(q) {
  const out = [];
  const add = (d) => { d = d.toLowerCase().replace(/^www\./, ''); if (!out.includes(d)) out.push(d); };
  for (const m of String(q.vibe || '').matchAll(DOMAIN_RE)) add(m[2]);
  for (const t of [q.notes, q.offer].map((x) => String(x || ''))) {
    for (const m of t.matchAll(DOMAIN_RE)) { const i = m.index + m[1].length; if (LOOK_RE.test(t.slice(Math.max(0, i - 80), i + m[2].length + 50))) add(m[2]); }
  }
  return out.slice(0, 3).map((d) => 'https://' + d);
}

// Words that say what the offer is, for the fallback check when the AI read is not available.
const STOP = new Set('with your from that this into what will have more best free learn build business online today pack launch page pages site website home your their them they about just like make need want only also every each other which where when there here these those than then very much many most some such using used get gets got course program offer'.split(' '));
const wordsOf = (t) => new Set(String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/s$/, '')));
// The quick read of each link when the AI is not available: look links stay look, a page that names the
// offer is the product, anything else is about them.
function guessUses(q, sites) {
  const look = lookLinks(q, sites.map((s) => s.asked || s.url));
  const want = wordsOf(q.offer_name || String(q.offer || '').slice(0, 200));
  return sites.map((s) => {
    if (s.failed) return { use: 'about', keep: [] };
    if (look.has(s.asked || s.url)) return { use: 'look', keep: [] };
    const inOffer = String(q.offer || '').includes(String(s.asked || s.url).replace(/\/$/, ''));
    const got = wordsOf([s.title, s.h1].join(' ')); let hit = 0; got.forEach((w) => { if (want.has(w)) hit++; });
    const named = want.size && hit >= Math.min(2, want.size);
    return inOffer || named || (s.gallery && hit >= 1 && !q.offer_name) ? { use: 'product', keep: null } : { use: 'about', keep: [] };
  });
}

// The look of a site: its color tokens, most used colors and font families, from the HTML and up to four
// of its own stylesheets, since most sites keep their colors and fonts in CSS files.
async function style(url) {
  if (!/^https?:\/\//.test(url || '')) return null;
  const p = await get(url, 8000); if (!p) return null;
  const html = p.html.slice(0, 800000); const base = p.url || url;
  const sheets = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(t)).map((t) => abs(attr(t, 'href'), base)).filter((h) => /^https?:/.test(h) && !/fonts\.googleapis|typekit|font-awesome|fontawesome|bootstrap(\.min)?\.css/i.test(h));
  const css = await Promise.all(sheets.slice(0, 4).map((h) => get(h, 6000).then((r) => (r ? r.html.slice(0, 400000) : ''))));
  const inline = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  const all = [inline, ...css].join('\n'); const every = all + '\n' + html;
  const full = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h.slice(0, 7); };
  const tokens = []; const seenT = new Set();
  for (const m of all.matchAll(/--([a-z][a-z0-9-]{1,40})\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/gi)) {
    const k = m[1].toLowerCase(); if (seenT.has(k) || /^tw-|^(color-)?(black|white)$|shadow|ring/.test(k)) continue; seenT.add(k); tokens.push([k, full(m[2])]);
  }
  const hex = {}; (every.match(/#[0-9a-f]{6}\b/gi) || []).forEach((h) => { h = h.toLowerCase(); hex[h] = (hex[h] || 0) + 1; });
  const GENERIC = /^(inherit|initial|unset|serif|sans-serif|monospace|cursive|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica( neue)?|arial|georgia|menlo|monaco|consolas|courier( new)?|times( new roman)?|noto sans|liberation mono|sfmono-regular|apple color emoji|segoe ui emoji|var\(.*)$/i;
  const fams = new Map(); const addF = (n, w) => { n = String(n || '').trim().replace(/^["']|["']$/g, '').trim(); if (!n || n.length > 40 || !/^[a-z]/i.test(n) || GENERIC.test(n)) return; fams.set(n, (fams.get(n) || 0) + w); };
  for (const m of all.matchAll(/@font-face\s*\{[^}]*?font-family\s*:\s*([^;}]+)/gi)) addF(m[1], 5);
  for (const m of every.matchAll(/fonts\.googleapis\.com\/css2?\?[^"')\s>]+/gi)) for (const f of m[0].matchAll(/family=([^&:"')]+)/g)) addF(decodeURIComponent(f[1]).replace(/\+/g, ' '), 5);
  for (const m of all.matchAll(/--([a-z0-9-]*(?:font|display|serif|sans|heading|body|title)[a-z0-9-]*)\s*:\s*([^;}]+)/gi)) if (!/weight|size|feature|variation|line|leading|tracking|style|smooth|stretch|width|height|space|color|bg|shadow/i.test(m[1])) addF(m[2].split(',')[0], 3);
  for (const m of all.matchAll(/font-family\s*:\s*([^;}]+)/gi)) addF(m[1].split(',')[0], 1);
  return {
    url: base,
    tokens: tokens.slice(0, 16),
    colors: Object.entries(hex).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h]) => h),
    fonts: [...fams.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n),
  };
}

// Downloads the real images from the product links only. `uses` says what each link is for (product,
// about or look) and, for product links, which cards show what this offer's buyer gets. Up to `max`
// images are saved through `save(name, b64, label)`.
async function collect({ q, id, max = 30, save, deadline, sites, uses }) {
  sites = sites || await read(linksOf(q)); uses = uses || guessUses(q, sites);
  const shots = [];
  const prod = sites.map((s, i) => ({ s, u: uses[i] || {} })).filter((x) => !x.s.failed && x.u.use === 'product');
  const per = prod.length ? Math.ceil(max / prod.length) : 0;
  const wanted = [];
  prod.forEach(({ s, u }) => {
    const items = Array.isArray(u.keep) ? s.items.filter((x, i) => u.keep.includes(i + 1)) : s.items;
    (s.gallery ? pick(items, per) : items.slice(0, 6)).forEach((x) => wanted.push({ ...x, site: s.url, kind: 'product' }));
  });
  let n = 0;
  await Promise.all(wanted.slice(0, max).map(async (x, i) => {
    if (deadline && Date.now() > deadline) return;
    const g = await get(x.src, 12000, true); if (!g || !/^image\//.test(g.type)) return;
    let v = null; try { v = await normalize(g.buf); } catch { v = null; } if (!v) return;
    const name = `ref-${id.slice(0, 8)}-${String(i + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6)}.webp`;
    try { await save(name, v.buf.toString('base64'), [x.name, x.label].filter(Boolean).join(' · ') || 'Image from ' + new URL(x.site).host); } catch { return; }
    shots.push({ name, title: x.name, label: x.label, cat: x.cat_name || x.cat, href: x.live || x.href, site: x.site, kind: x.kind, w: v.w, h: v.h, order: i }); n++;
  }));
  // A product page with no usable pictures still shows up as itself: a screenshot of its first screen.
  for (const { s } of prod.filter(({ s: y, u }) => !shots.some((z) => z.site === y.url) && !(Array.isArray(u.keep) && !u.keep.length && y.items.length))) {
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
    sites: sites.map((s, i) => {
      const u = uses[i] || {}; const use = s.failed ? 'about' : u.use || 'about';
      const kept = use === 'product' ? (Array.isArray(u.keep) ? (s.items || []).filter((x, k) => u.keep.includes(k + 1)) : s.items || []) : [];
      const named = kept.filter((x) => x.name); const gal = use === 'product' && !!s.gallery;
      const cats = {}; const labels = {};
      if (gal) named.forEach((x) => { const c = x.cat_name || x.label || x.cat; if (c) cats[c] = (cats[c] || 0) + 1; if (x.label) labels[x.label] = (labels[x.label] || 0) + 1; });
      return { url: s.url, failed: !!s.failed, use, why: u.why || '', title: s.title, h1: s.h1, desc: s.desc, gallery: gal, count: gal ? named.length : 0, cats, labels, headings: use === 'look' ? [] : (s.headings || []).slice(0, 14), names: named.slice(0, 160).map((x) => [x.name, x.label, x.cat_name || x.cat].filter(Boolean).join(' | ')) };
    }),
  };
}

module.exports = { collect, read, parse, pick, linksOf, lookLinks, lookDomains, guessUses, style, normalize, screenshot };
