// Finished graphics for a funnel, drawn in code from the brand kit and real product shots:
// a hero stack of browser windows, a tilted wall of shots, a cover for every stack item and bonus,
// a social share image and the favicons. Text is set in the brand fonts as vector outlines.
const sharp = require('sharp');
const opentype = require('opentype.js');

const FONTS = new Map();
async function font(family, weight) {
  const key = family + ':' + weight; if (FONTS.has(key)) return FONTS.get(key);
  const p = (async () => {
    const base = process.env.FOS_GFONTS || 'https://fonts.googleapis.com';
    for (const w of [weight, 400, null]) {
      try {
        const q = encodeURIComponent(family).replace(/%20/g, '+') + (w ? ':wght@' + w : '');
        const css = await (await fetch(`${base}/css2?family=${q}`)).text();
        const u = (css.match(/url\((https:[^)]+\.(?:ttf|otf))\)/) || [])[1]; if (!u) continue;
        const buf = await (await fetch(u)).arrayBuffer();
        return opentype.parse(buf);
      } catch { /* next weight */ }
    }
    return null;
  })();
  FONTS.set(key, p); const f = await p; if (!f) FONTS.delete(key); return f;
}
async function fonts(brand) {
  const fo = (brand && brand.fonts) || {};
  const display = (await font(fo.display || 'Instrument Serif', 600)) || (await font('Inter', 700));
  const body = (await font(fo.body || 'Inter', 500)) || (await font('Inter', 500)) || display;
  return { display, body };
}

// Lines that fit `max` pixels wide at `size`, at most `lines` of them, the last one shortened if needed.
function wrap(f, text, size, max, lines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean); const out = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (f.getAdvanceWidth(t, size) <= max || !cur) cur = t; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur);
  if (out.length > lines) { const keep = out.slice(0, lines); let last = keep[lines - 1] + ' ' + out.slice(lines).join(' '); while (f.getAdvanceWidth(last + '...', size) > max && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' ')); keep[lines - 1] = last.replace(/[,.;:]$/, '') + '...'; return keep; }
  return out;
}
// Shrinks the size until the text fits in `lines`.
function fit(f, text, size, max, lines, min) {
  for (let s = size; s >= (min || size * 0.6); s -= 2) { const l = wrap(f, text, s, max, 99); if (l.length <= lines) return { size: s, lines: l }; }
  const s = min || Math.round(size * 0.6); return { size: s, lines: wrap(f, text, s, max, lines) };
}
function textPath(f, lines, x, y, size, lh, fill, opacity = 1, track = 0) {
  if (!f) return '';
  return lines.map((l, i) => {
    let d = '';
    if (track) { let cx = x; for (const ch of l) { d += f.getPath(ch, cx, y + i * lh, size).toPathData(2); cx += f.getAdvanceWidth(ch, size) + track; } } else d = f.getPath(l, x, y + i * lh, size).toPathData(2);
    return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }).join('');
}
const hex = (h, a) => { const n = parseInt(String(h).slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const lum = (h) => { const n = parseInt(String(h).slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

// One browser window around a shot: a slim bar with three dots, rounded corners, a soft shadow.
async function windowed(shot, w, h, P) {
  const bar = Math.round(w * 0.045); const r = Math.round(w * 0.022); const pad = Math.round(w * 0.09);
  const img = await sharp(shot).resize(w, h - bar, { fit: 'cover', position: 'top' }).toBuffer();
  const dot = (i) => `<circle cx="${bar * 0.62 + i * bar * 0.52}" cy="${bar / 2}" r="${bar * 0.15}" fill="${hex(P.ink, 0.18)}"/>`;
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="${P.surface}"/>${[0, 1, 2].map(dot).join('')}<rect x="${w * 0.3}" y="${bar * 0.26}" width="${w * 0.4}" height="${bar * 0.48}" rx="${bar * 0.24}" fill="${hex(P.ink, 0.06)}"/></svg>`);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  const win = await sharp(frame).composite([{ input: img, top: bar, left: 0 }, { input: mask, blend: 'dest-in' }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="${hex(P.ink, 0.1)}"/></svg>`) }]).png().toBuffer();
  const W = w + pad * 2; const H = h + pad * 2;
  const shadow = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${pad + w * 0.04}" y="${pad + h * 0.05}" width="${w * 0.92}" height="${h * 0.95}" rx="${r}" fill="rgba(10,12,10,.30)"/></svg>`)).blur(pad * 0.42).png().toBuffer();
  const out = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: shadow }, { input: win, top: pad, left: pad }]).png().toBuffer();
  return { buf: out, pad, W, H };
}
const blank = (w, h, bg) => sharp({ create: { width: w, height: h, channels: 4, background: bg || { r: 0, g: 0, b: 0, alpha: 0 } } });
const rgb = (h) => { const n = parseInt(String(h).slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 }; };

// Three windows, the front one larger, on a transparent background. For the hero.
async function heroStack(shots, P) {
  const W = 1800; const H = 1320; const s = shots.slice(0, 3); while (s.length < 3) s.push(s[0]);
  const back = 640; const front = 780; const ar = 1.25;
  const L = await windowed(s[1], back, Math.round(back * ar), P);
  const R = await windowed(s[2], back, Math.round(back * ar), P);
  const C = await windowed(s[0], front, Math.round(front * ar), P);
  const out = await blank(W, H).composite([
    { input: L.buf, left: 40 - L.pad + 40, top: 190 - L.pad },
    { input: R.buf, left: W - back - 80 - R.pad, top: 140 - R.pad },
    { input: C.buf, left: Math.round((W - front) / 2) - C.pad, top: 40 - C.pad + 20 },
  ]).png().toBuffer();
  const cut = await sharp(out).extract({ left: 0, top: 0, width: W, height: H }).png().toBuffer();
  const tight = await sharp(cut).trim({ threshold: 1 }).png().toBuffer();
  return sharp(tight).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
}

// A tilted grid of many shots on the deep brand color. For a full-bleed band.
async function wall(shots, P) {
  const W = 2400; const H = 1400; const cols = 6; const rows = 4; const cw = 400; const ch = 500; const gap = 44;
  const gw = cols * cw + (cols - 1) * gap; const gh = rows * ch + (rows - 1) * gap;
  const tiles = []; let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const shot = shots[k++ % shots.length];
    const img = await sharp(shot).resize(cw, ch, { fit: 'cover', position: 'top' }).toBuffer();
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><rect width="${cw}" height="${ch}" rx="14" fill="#fff"/></svg>`);
    const t = await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    tiles.push({ input: t, left: c * (cw + gap), top: r * (ch + gap) + (c % 2 ? Math.round(ch * 0.32) : 0) });
  }
  const grid = await blank(gw, gh + Math.round(ch * 0.32)).composite(tiles).png().toBuffer();
  const rot = await sharp(grid).rotate(-9, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const m = await sharp(rot).metadata();
  const crop = await sharp(rot).extract({ left: Math.max(0, Math.round((m.width - W) / 2)), top: Math.max(0, Math.round((m.height - H) / 2)), width: Math.min(W, m.width), height: Math.min(H, m.height) }).toBuffer();
  const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.deep}" stop-opacity=".85"/><stop offset=".22" stop-color="${P.deep}" stop-opacity="0"/><stop offset=".78" stop-color="${P.deep}" stop-opacity="0"/><stop offset="1" stop-color="${P.deep}" stop-opacity=".9"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  return blank(W, H, rgb(P.deep)).composite([{ input: crop, gravity: 'center' }, { input: fade }]).webp({ quality: 84 }).toBuffer();
}

// A product cover for one stack item or bonus, shown as a document with a page behind it.
async function cover(item, kind, F, P, brand, shot) {
  const W = 1000; const H = 1000; const cw = 600; const chh = 760; const x = (W - cw) / 2; const y = (H - chh) / 2 - 10;
  const dark = kind === 'bonus';
  const bg = dark ? P.accent : P.deep; const ink = dark ? P.accent_ink : P.deep_ink;
  const pad = 56; const title = String(item.name || '').replace(/^(free\s+)?bonus(\s*#?\d+)?\s*[:.\-]\s*/i, ''); const t = fit(F.display, title, 64, cw - pad * 2, 4, 40);
  const tag = kind === 'bonus' ? 'Bonus' : 'Included';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${chh}"><rect width="${cw}" height="${chh}" rx="16" fill="${bg}"/>`;
  svg += textPath(F.body, [tag.toUpperCase()], pad, pad + 22, 22, 0, ink, 0.72, 2.4);
  svg += `<rect x="${pad}" y="${pad + 44}" width="44" height="2" fill="${ink}" fill-opacity=".5"/>`;
  svg += textPath(F.display, t.lines, pad, pad + 110 + t.size * 0.8, t.size, t.size * 1.08, ink);
  if (item.what && !shot) { const sub = wrap(F.body, item.what, 22, cw - pad * 2, 3); svg += textPath(F.body, sub, pad, pad + 140 + t.size * (t.lines.length + 0.4) * 1.08, 22, 31, ink, 0.72); }
  svg += `<rect x="${pad}" y="${chh - pad - 34}" width="${cw - pad * 2}" height="1" fill="${ink}" fill-opacity=".25"/>`;
  svg += textPath(F.body, [String(brand.logo_text || brand.name || '').slice(0, 40)], pad, chh - pad, 22, 0, ink, 0.8);
  svg += '</svg>';
  const layers = [];
  if (shot) {
    const sw = cw - pad * 2; const sh = Math.round(chh * 0.34);
    const im = await sharp(shot).resize(sw, sh, { fit: 'cover', position: 'top' }).toBuffer();
    const mk = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="10" fill="#fff"/></svg>`);
    layers.push({ input: await sharp(im).composite([{ input: mk, blend: 'dest-in' }]).png().toBuffer(), left: pad, top: chh - pad - 34 - 28 - sh });
  }
  const face = await sharp(Buffer.from(svg)).composite(layers).png().toBuffer();
  const behind = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${chh}"><rect width="${cw}" height="${chh}" rx="16" fill="${P.surface}" stroke="${hex(P.ink, 0.12)}"/></svg>`);
  const sh = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${x + 20}" y="${y + 40}" width="${cw}" height="${chh}" rx="16" fill="rgba(10,12,10,.28)"/></svg>`)).blur(28).png().toBuffer();
  return blank(W, H).composite([{ input: sh }, { input: await sharp(behind).rotate(4, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: Math.round(x - 14), top: Math.round(y - 22) }, { input: face, left: Math.round(x), top: Math.round(y) }]).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
}

// The link preview for social apps and chat: name, promise and the product.
async function og(F, P, brand, offer, shots) {
  const W = 1200; const H = 630; const pad = 72; const tw = shots.length ? 520 : 1000;
  const name = fit(F.display, offer.name || brand.name || '', 68, tw, 2, 44);
  const line = wrap(F.body, offer.one_liner || offer.promise || brand.tagline || '', 26, tw, name.lines.length > 1 ? 2 : 3);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${P.deep}"/>`;
  svg += textPath(F.body, [String(brand.logo_text || brand.name || '').slice(0, 40)], pad, pad + 20, 24, 0, P.deep_ink, 0.85);
  const ty = 200;
  svg += textPath(F.display, name.lines, pad, ty, name.size, name.size * 1.08, P.deep_ink);
  svg += textPath(F.body, line, pad, ty + name.lines.length * name.size * 1.08 + 30, 26, 36, P.deep_ink, 0.75);
  const price = offer.price && offer.price.amount ? `${offer.price.currency === 'EUR' ? '€' : offer.price.currency === 'GBP' ? '£' : '$'}${offer.price.amount}` : '';
  const py = Math.min(H - pad - 48, ty + name.lines.length * name.size * 1.08 + 30 + line.length * 36 + 8);
  if (price) { const pw = F.body.getAdvanceWidth(price, 26) + 44; svg += `<rect x="${pad}" y="${py}" width="${pw}" height="48" rx="24" fill="${P.accent}"/>` + textPath(F.body, [price], pad + 22, py + 33, 26, 0, P.accent_ink); }
  svg += '</svg>';
  const layers = [];
  if (shots.length) {
    const a = await windowed(shots[0], 420, 525, P); const b = await windowed(shots[1] || shots[0], 380, 475, P);
    layers.push({ input: b.buf, left: W - 300 - b.pad, top: 120 - b.pad }, { input: a.buf, left: W - 560 - a.pad, top: 60 - a.pad });
  }
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const full = await blank(W + 400, H + 400).composite([{ input: base, left: 0, top: 0 }, ...layers]).png().toBuffer();
  return sharp(full).extract({ left: 0, top: 0, width: W, height: H }).jpeg({ quality: 88 }).toBuffer();
}

// Favicons: the first letter of the brand in the display font on the accent color.
async function icon(F, P, brand, size) {
  const ch = String(brand.logo_text || brand.name || 'F').trim().charAt(0).toUpperCase() || 'F';
  const s = 180; const fs = 118; const f = F.display || F.body;
  const w = f ? f.getAdvanceWidth(ch, fs) : 60;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="40" fill="${P.accent}"/>${textPath(f, [ch], (s - w) / 2, s / 2 + fs * 0.35, fs, 0, P.accent_ink)}</svg>`;
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

// Every graphic in one go. `shots` are image buffers of the real product, best first.
async function kit({ brand, offer, shots }) {
  const P = { bg: '#f7f5f0', surface: '#ffffff', ink: '#16140f', muted: '#5d5a52', line: '#e5e0d6', accent: '#2f6b4f', accent_ink: '#ffffff', deep: '#14231c', deep_ink: '#f3efe6', ...((brand && brand.palette) || {}) };
  if (Math.abs(lum(P.accent) - lum(P.accent_ink)) < 0.25) P.accent_ink = lum(P.accent) > 0.4 ? P.ink : '#ffffff';
  const F = await fonts(brand); const o = offer || {}; const out = [];
  if (shots.length >= 1) out.push({ slot: 'hero-stack', kind: 'hero', label: 'Hero graphic: three of the real products in browser windows, transparent background', w: 1800, h: 1320, mime: 'image/webp', buf: await heroStack(shots, P) });
  if (shots.length >= 6) out.push({ slot: 'wall', kind: 'wall', label: 'Wall graphic: a tilted grid of many real products on the deep brand color, for a full-bleed band', w: 2400, h: 1400, mime: 'image/webp', buf: await wall(shots, P) });
  if (F.display && F.body) {
    const items = [...(o.stack || []).slice(0, 6).map((x) => ({ x, k: 'stack' })), ...(o.bonuses || []).slice(0, 4).map((x) => ({ x, k: 'bonus' }))];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; const shot = it.k === 'stack' && i === 0 && shots.length ? shots[0] : null;
      out.push({ slot: `cover-${it.k}-${i}`, kind: 'cover', item: it.x.name, label: `${it.k === 'bonus' ? 'Bonus' : 'Stack item'} cover: ${it.x.name}`, w: 1000, h: 1000, mime: 'image/webp', buf: await cover(it.x, it.k, F, P, brand || {}, shot) });
    }
    out.push({ slot: 'og', kind: 'og', label: 'Social share image', w: 1200, h: 630, mime: 'image/jpeg', buf: await og(F, P, brand || {}, o, shots) });
  }
  out.push({ slot: 'icon-180', kind: 'icon', label: 'Apple touch icon', w: 180, h: 180, mime: 'image/png', buf: await icon(F, P, brand || {}, 180) });
  out.push({ slot: 'icon-64', kind: 'favicon', label: 'Favicon', w: 64, h: 64, mime: 'image/png', buf: await icon(F, P, brand || {}, 64) });
  return out;
}

module.exports = { kit, heroStack, wall, cover, og, icon, fonts, wrap, fit };
