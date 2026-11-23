// Studies every template in api/_templates.json and writes api/_tpl_lib.json: for each template and page,
// the page structure (tags, classes, motion hooks, a few words of each heading), the section order with roles,
// the design tokens and the key CSS rules, plus traits used to match templates to a funnel and a design option.
// It also copies the list to js/fos-templates.js for the browser.
// Run: npm run templates   (about a minute; re-run when templates are added or changed)
const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

const ROOT = path.join(__dirname, '..');
const TPL = require(path.join(ROOT, 'api/_templates.json'));
const OUT = path.join(ROOT, 'api/_tpl_lib.json');

// The template picker in the browser reads the same list from js/fos-templates.js. Keep the two in step.
fs.writeFileSync(path.join(ROOT, 'js/fos-templates.js'), '// The funnel template library Funnel OS designs from. Written by scripts/learn-templates.js from api/_templates.json.\n'
  + 'window.FOS_TEMPLATES = ' + JSON.stringify(TPL) + ';\n');

const ROLES = [
  ['hero', /\b(hero|top|intro|masthead|above)\b/],
  ['proof-bar', /\b(logos?|press|as-seen|trust|marquee|ticker|band|strip)\b/],
  ['problem', /\b(pains?|problem|struggle|why-not|before|cost)\b/],
  ['promise', /\b(promise|solution|outcome|result|care|what-changes|transform)\b/],
  ['method', /\b(process|steps?|how|method|framework|system|first-visit|journey|path|plan)\b/],
  ['inside', /\b(inside|features?|included|modules?|curriculum|contents?|stack|deliverables?|whats?-in|library|templates?|gallery|catalog|work|portfolio|cases?)\b/],
  ['stats', /\b(stats?|numbers?|metrics|counter)\b/],
  ['proof', /\b(reviews?|testimonials?|patients|clients|stories|wall|love|results|proof|wins)\b/],
  ['about', /\b(about|story|founder|meet|team|bio|host|author|who)\b/],
  ['compare', /\b(compare|comparison|vs|versus|alternatives?)\b/],
  ['offer', /\b(offer|pricing|price|plans?|bill|value|investment|tiers?|buy|order)\b/],
  ['bonus', /\b(bonus(es)?|extras?|gifts?)\b/],
  ['guarantee', /\b(guarantee|risk|refund)\b/],
  ['faq', /\b(faq|questions|objections)\b/],
  ['video', /\b(vsl|video|watch|webinar)\b/],
  ['form', /\b(apply|application|form|optin|signup|register|book|booking|calendar|schedule|contact|visit)\b/],
  ['cta', /\b(cta|final|close|last|start|join|get)\b/],
];
const TEXT = [
  ['faq', /\b(questions|faq|asked|before you (buy|book|join))\b/i],
  ['guarantee', /\b(guarantee|risk-free|refund|money back)\b/i],
  ['bonus', /\bbonus(es)?\b/i],
  ['offer', /(\$\s?\d|\bprice\b|\bpricing\b|\bplans?\b|everything you get|get (it|the|instant)|investment|today only|\bjoin\b)/i],
  ['inside', /\b(inside|included|what you get|what's in|modules?|curriculum|the templates|the library|features?)\b/i],
  ['method', /\b(how it works|steps?|process|method|framework|in \d+ (steps|days|weeks))\b/i],
  ['proof', /\b(say|reviews?|testimonials?|loved by|results|stories|wins|students|clients)\b/i],
  ['about', /\b(meet|about|who (i|we) am|hi, i|my story|founder|behind)\b/i],
  ['compare', /\b(vs\.?|versus|compare|instead of|alternatives?)\b/i],
  ['problem', /\b(tired|struggl|problem|stuck|why most|the hard way|cost of|frustrat)/i],
  ['form', /\b(apply|book a|schedule|register|sign up|claim your)\b/i],
];
const semantic = (cls) => cls.split(/\s+/).filter((c) => c && !/[:/\[\]]|^-?(m|p|mx|my|px|py|mt|mb|pt|pb|w|h|max|min|gap|grid|flex|text|bg|border|rounded|shadow|font|leading|tracking|items|justify|relative|absolute|fixed|sticky|top|left|right|bottom|inset|z|overflow|hidden|block|inline|col|row|space|opacity|transition|duration|ease|group|pointer|isolate|order|self|place|content|object|aspect|ring|backdrop|blur|from|to|via|sr|scroll|snap|cursor|select|origin|transform|translate|scale|rotate|animate|container|mx-auto)(-|$)/.test(c)).join(' ');
const roleOf2 = (id, cls, h) => { const a = roleOf(`${id || ''} ${semantic(cls || '')}`); if (a !== 'section') return a; for (const [r, re] of TEXT) if (re.test(h || '')) return r; return 'section'; };
const roleOf = (s) => { const k = String(s || '').toLowerCase().replace(/_/g, '-'); for (const [r, re] of ROLES) if (re.test(k)) return r; return 'section'; };
const words = (s, n) => { const w = String(s || '').replace(/\s+/g, ' ').trim().split(' '); return w.slice(0, n).join(' ') + (w.length > n ? '...' : ''); };
const SERIF = /serif|fraunces|playfair|cormorant|garamond|newsreader|lora|instrument serif|dm serif|libre baskerville|crimson|eb garamond|spectral|source serif|young serif|gloock|bodoni|canela|tiempos|editorial/i;

async function get(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) return null; return await r.text(); } catch { return null; } finally { clearTimeout(t); }
}

// A compact outline of the page: structure, classes, motion hooks and a few words of headings and buttons.
function skeleton(root, maxLines) {
  const lines = [];
  const label = (el) => {
    const tag = el.rawTagName.toLowerCase();
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 3);
    const data = Object.keys(el.attributes).filter((a) => a.startsWith('data-') && !/^data-(slot|v|id|i)$/.test(a)).slice(0, 2);
    const id = el.getAttribute('id');
    let s = tag + (id && /^(section|header|footer|main|nav)$/.test(tag) ? '#' + id : '') + (cls.length ? '.' + cls.join('.') : '') + (data.length ? '[' + data.join(' ') + ']' : '');
    if (tag === 'img') s += ` ${el.getAttribute('width') || '?'}x${el.getAttribute('height') || '?'}`;
    if (/^(h1|h2|h3|button|summary|label)$/.test(tag) || (tag === 'a' && /btn|button|cta/.test(el.getAttribute('class') || '')) || (tag === 'p' && /lead|eyebrow|kicker|sub/.test(el.getAttribute('class') || ''))) s += ` "${words(el.text, tag === 'h1' ? 10 : 6)}"`;
    return s;
  };
  const walk = (el, depth) => {
    if (lines.length >= maxLines) return;
    const kids = el.childNodes.filter((c) => c.nodeType === 1 && !/^(script|style|noscript|template|link|meta)$/i.test(c.rawTagName));
    const uniq = [...new Set(kids.map((k) => label(k).replace(/ ".*"$/, '')))];
    if (kids.length > 6 && uniq.length <= 2) { lines.push(' '.repeat(depth) + uniq.join(' + ') + ` repeating x${kids.length}`); return; }
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i]; const l = label(k);
      let n = 1; while (i + n < kids.length && label(kids[i + n]).replace(/ ".*"$/, '') === l.replace(/ ".*"$/, '')) n++;
      lines.push(' '.repeat(depth) + l + (n > 1 ? ` x${n}` : ''));
      const tag = k.rawTagName.toLowerCase();
      if (tag !== 'svg' && tag !== 'picture' && !/^(h[1-6]|p|button|a|li|summary|img|input|select|textarea|label|span|b|em|strong|small|i)$/.test(tag) && depth < 7) walk(k, depth + 1);
      else if ((tag === 'li' || tag === 'a') && depth < 7 && k.childNodes.some((c) => c.nodeType === 1 && /^(div|img|h3|h4|figure|span)$/i.test(c.rawTagName))) walk(k, depth + 1);
      i += n - 1;
      if (lines.length >= maxLines) { lines.push(' '.repeat(depth) + '...'); return; }
    }
  };
  walk(root, 0);
  return lines.join('\n');
}

function cssFacts(css) {
  const c = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const faces = [...new Set([...c.matchAll(/@font-face\s*{[^}]*font-family:\s*['"]?([^;'"]+)/g)].map((m) => m[1].trim()))];
  const families = [...new Set([...c.matchAll(/font-family:\s*([^;}]+)/g)].map((m) => m[1].split(',')[0].replace(/['"]/g, '').trim()).filter((x) => !/^var\(|inherit|system-ui|sans-serif|serif|monospace/.test(x)))];
  const root = (c.match(/:root\s*{([^}]*)}/) || [])[1] || '';
  const vars = [...root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/gi)].map((m) => [m[1], m[2].trim()]).filter(([, v]) => v.length < 90).slice(0, 40);
  const count = (re) => (c.match(re) || []).length;
  const radius = {}; for (const m of c.matchAll(/border-radius:\s*([^;}]+)/g)) radius[m[1].trim()] = (radius[m[1].trim()] || 0) + 1;
  const grids = {}; for (const m of c.matchAll(/grid-template-columns:\s*([^;}]+)/g)) grids[m[1].trim()] = (grids[m[1].trim()] || 0) + 1;
  const maxw = (c.match(/\.(wrap|container|shell|inner)[^{]*{[^}]*max-width:\s*([^;}]+)/) || [])[2] || null;
  const h1 = (c.match(/(^|[},\s])(h1|\.h1|\.display|\.hero h1)[^{]*{[^}]*font-size:\s*([^;}]+)/) || [])[3] || null;
  // Key rules, minified: tokens, base, container, headings, buttons and hero.
  const rules = [];
  for (const m of c.matchAll(/([^{}@]+){([^{}]*)}/g)) {
    const sel = m[1].trim();
    if (/^(:root|html|body|\.wrap|\.container|\.shell|h1|h2|\.h1|\.h2|\.eyebrow|\.lead|\.btn[^ ]*|\.button[^ ]*|\.hero[^ ]*|\.card|\.sec|section)(\s*,|\s*$|:)/.test(sel)) rules.push(sel.replace(/\s+/g, ' ') + '{' + m[2].replace(/\s+/g, ' ').trim() + '}');
  }
  return {
    fonts: (faces.length ? faces : families).slice(0, 4), vars,
    radius: Object.entries(radius).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]),
    grids: Object.entries(grids).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]),
    maxw, h1, keyframes: count(/@keyframes/g), reduced: /prefers-reduced-motion/.test(c), sticky: /position:\s*sticky/.test(c),
    areas: /grid-template-areas|grid-(column|row):\s*span/.test(c), clamp: count(/clamp\(/g), container: /@container/.test(c),
    css: rules.join('\n').slice(0, 6000), bytes: c.length,
  };
}
const lum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]; };

async function learn(t) {
  const base = t.live.replace(/\/$/, '');
  const pages = []; const cssSeen = new Map(); let cssAll = '';
  for (const p of t.pages || [{ path: 'index', name: 'Main page' }]) {
    const url = base + '/' + (p.path === 'index' ? '' : p.path);
    const html = await get(url); if (!html) { pages.push({ path: p.path, name: p.name, failed: true }); continue; }
    for (const m of html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || []) {
      const h = (m.match(/href=["']([^"']+)["']/) || [])[1]; if (!h || /^https?:/.test(h)) continue;
      const u = new URL(h, url + (p.path === 'index' ? '' : '/')).href; if (cssSeen.has(u)) continue;
      const css = await get(new URL(h, base + '/').href); cssSeen.set(u, true); if (css) cssAll += '\n' + css;
    }
    const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n'); if (inline) cssAll += '\n' + inline;
    const doc = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false } });
    const body = doc.querySelector('body') || doc;
    const secs = body.querySelectorAll('section, header, footer, main > div, [data-section]').filter((el) => {
      const tag = el.rawTagName.toLowerCase(); if (tag === 'header' || tag === 'footer') return el.parentNode === body || (el.parentNode && el.parentNode.rawTagName && el.parentNode.rawTagName.toLowerCase() === 'body');
      if (tag !== 'section' && el.querySelector('section')) return false;
      return tag === 'section' ? !el.parentNode.closest || !el.parentNode.closest('section') : (el.text || '').trim().length > 40;
    });
    let heroSeen = false;
    const sections = secs.map((el) => {
      const tag = el.rawTagName.toLowerCase(); const key = (el.getAttribute('class') || '') + ' ' + (el.getAttribute('id') || '');
      const h = el.querySelector('h1, h2'); const role = tag === 'header' ? 'nav' : tag === 'footer' ? 'footer' : el.querySelector('h1') && !heroSeen && (heroSeen = true) ? 'hero' : roleOf2(el.getAttribute('id'), el.getAttribute('class'), h ? h.text : '');
      const has = [];
      if (el.querySelector('img, picture')) has.push('img'); if (el.querySelector('svg')) has.push('svg'); if (el.querySelector('form, input')) has.push('form');
      if (el.querySelector('details, [aria-expanded]')) has.push('accordion'); if (el.querySelector('video, iframe')) has.push('video'); if (el.querySelector('table')) has.push('table');
      if (el.querySelector('[data-count], [data-counter]')) has.push('counter');
      return { role, cls: key.trim().split(/\s+/).slice(0, 3).join(' '), h: h ? words(h.text, 8) : '', has };
    });
    pages.push({ path: p.path, name: p.name, sections, outline: skeleton(body, p.path === 'index' ? 220 : 120), imgs: body.querySelectorAll('img').length, svgs: body.querySelectorAll('svg').length });
  }
  const css = cssFacts(cssAll);
  const v = Object.fromEntries(css.vars);
  const bodyBg = ((cssAll.match(/(^|})\s*body\s*{([^}]*)}/) || [])[2] || '').match(/background(?:-color)?\s*:\s*([^;}]+)/);
  let bg = bodyBg ? bodyBg[1].trim() : null;
  for (let k = 0; k < 3 && bg && /var\(/.test(bg); k++) bg = v[(bg.match(/var\((--[a-z0-9-]+)/i) || [])[1]] || null;
  if (!bg || !/^#/.test(bg)) { const bgKey = Object.keys(v).find((k) => /^--(bg|paper|base|canvas|surface|cream|ivory|white)$/.test(k)) || Object.keys(v).find((k) => /bg|paper|canvas/.test(k)); bg = bgKey ? v[bgKey] : bg; }
  if (bg && /^#[0-9a-f]{3}$/i.test(bg.trim())) bg = '#' + bg.trim().slice(1).split('').map((x) => x + x).join('');
  const L = lum(bg);
  const display = css.fonts.find((x) => SERIF.test(x)) || css.fonts[0] || '';
  const main = pages.find((p) => p.path === 'index') || pages[0] || {};
  return {
    id: t.id, name: t.name, cat: t.cat, funnel: t.funnel, label: t.label, live: t.live,
    traits: {
      dark: L != null ? L < 0.2 : null, serif: css.fonts.some((x) => SERIF.test(x)), display, fonts: css.fonts,
      bg: bg || null, radius: css.radius[0] || null, motion: (css.keyframes > 2 ? 2 : css.keyframes ? 1 : 0) + (/data-(enter|par|reveal)/.test(main.outline || '') ? 1 : 0),
      bento: css.areas, sticky: css.sticky, sections: (main.sections || []).length, imgs: main.imgs || 0,
    },
    tokens: css.vars, grids: css.grids, maxw: css.maxw, h1: css.h1, css: css.css,
    pages,
  };
}

(async () => {
  const out = []; let i = 0; const t0 = Date.now();
  const worker = async () => { while (i < TPL.length) { const t = TPL[i++]; try { out.push(await learn(t)); } catch (e) { console.error('fail', t.id, e.message); } } };
  await Promise.all(Array.from({ length: 8 }, worker));
  out.sort((a, b) => TPL.findIndex((t) => t.id === a.id) - TPL.findIndex((t) => t.id === b.id));
  // The library-wide playbook: the section order each funnel type uses, so wireframes start from what works.
  const play = {};
  for (const t of out) {
    const m = t.pages.find((p) => p.path === 'index'); if (!m || !m.sections) continue;
    const seq = m.sections.map((s) => s.role).filter((r) => r !== 'nav' && r !== 'footer');
    (play[t.funnel] = play[t.funnel] || []).push({ id: t.id, seq });
  }
  const playbook = {};
  for (const [k, list] of Object.entries(play)) {
    const freq = {}; const pos = {};
    for (const { seq } of list) seq.forEach((r, j) => { if (seq.indexOf(r) !== j) return; freq[r] = (freq[r] || 0) + 1; (pos[r] = pos[r] || []).push(j / Math.max(1, seq.length - 1)); });
    const roles = Object.entries(freq).filter(([r, n]) => r !== 'section' && n / list.length >= 0.25).map(([r, n]) => ({ role: r, share: Math.round(n / list.length * 100), at: pos[r].reduce((a, b) => a + b, 0) / pos[r].length }));
    roles.sort((a, b) => a.at - b.at);
    playbook[k] = { templates: list.length, avg_sections: Math.round(list.reduce((a, b) => a + b.seq.length, 0) / list.length), order: roles.map((r) => `${r.role} (${r.share}%)`) };
  }
  const failed = out.reduce((a, t) => a + t.pages.filter((p) => p.failed).length, 0);
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), count: out.length, playbook, templates: out }));
  console.log(`learned ${out.length}/${TPL.length} templates, ${out.reduce((a, t) => a + t.pages.length, 0)} pages (${failed} failed) in ${Math.round((Date.now() - t0) / 1000)}s, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
})();
