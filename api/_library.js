// The template library Funnel OS learned from (scripts/learn-templates.js -> _tpl_lib.json): every template's page
// outlines, section order, design tokens and key CSS. Each design option gets its own reference, matched to the
// funnel and to the option's direction, so every option is built from a real, finished template and not from scratch.
let LIB = null;
const lib = () => LIB || (LIB = require('./_tpl_lib.json'));

const GROUP = { 'sales-page': 'cart', 'automated-cart': 'cart', 'low-ticket': 'cart', 'webinar-cart': 'cart', challenge: 'event', 'vsl-application': 'call', website: 'site', 'website-lead': 'site', ecom: 'shop' };
const CAT_WORDS = {
  'digital-products': /template|course|e-?book|guide|prompt|digital|download|pack|library|toolkit|workbook|bundle|notion|swipe|checklist|masterclass/i,
  coaches: /coach|coaching|mentor|accountab|program|cohort/i,
  consultants: /consult|advis|cfo|fractional|strategy|audit|b2b/i,
  creators: /creator|youtube|newsletter|podcast|community|audience|content/i,
  speakers: /speak|keynote|stage|event|workshop/i,
  authors: /\bbook\b|author|novel|memoir|publish/i,
  saas: /\bapp\b|software|saas|platform|tool|ai\b|dashboard|api|automation/i,
  ecom: /shop|store|product|skincare|apparel|supplement|coffee|candle|ship/i,
  agency: /agency|studio|done.for.you|we build|clients/i,
  'local-business': /clinic|dental|salon|gym|physio|restaurant|plumb|roof|law|realtor|spa|local|city/i,
};
// What each design direction looks for in a reference.
const FIT = {
  template: () => 0,
  editorial: (t) => (t.traits.serif ? 3 : 0) + (t.traits.dark ? -1 : 1),
  bold: (t) => (t.traits.dark ? 3 : 0) + (t.traits.bento ? 2 : 0) + (t.traits.motion >= 2 ? 1 : 0),
  product: (t) => Math.min(3, (t.traits.imgs || 0) / 3) + (t.cat === 'digital-products' || t.cat === 'saas' || t.cat === 'ecom' ? 2 : 0),
  minimal: (t) => (t.traits.dark ? -2 : 1) + (t.traits.sections <= 10 ? 2 : 0) + (t.traits.motion <= 1 ? 1 : 0),
  story: (t) => (t.traits.sections >= 12 ? 2 : 0) + (t.traits.serif ? 1 : 0) + (t.traits.sticky ? 1 : 0),
};

function about(f) {
  const q = f.quiz || {}; const o = f.offer || {};
  return [q.brand, q.tagline, q.offer, q.audience, o.name, o.promise, ...(o.stack || []).map((s) => s.name)].filter(Boolean).join(' ').slice(0, 4000);
}
function score(t, f, text) {
  let s = 0;
  if (t.funnel === f.funnel_type) s += 6; else if (GROUP[t.funnel] && GROUP[t.funnel] === GROUP[f.funnel_type]) s += 3;
  if (CAT_WORDS[t.cat] && CAT_WORDS[t.cat].test(text)) s += 4;
  if ((t.pages || []).some((p) => p.failed)) s -= 3;
  return s;
}
// Picks a reference template for a design option, different from the ones already used.
function pick(f, direction, used = []) {
  const L = lib(); const text = about(f); const usedSet = new Set(used);
  const picked = (f.quiz || {}).template;
  if (direction === 'template' && picked && !usedSet.has(picked)) { const t = L.templates.find((x) => x.id === picked); if (t) return t; }
  const usedFonts = new Set(L.templates.filter((t) => usedSet.has(t.id)).map((t) => t.traits.display));
  const fit = FIT[direction] || ((t) => (t.traits.dark ? 1 : 0) + (t.traits.serif ? 0.5 : 0));
  let best = null; let bs = -1e9;
  for (const t of L.templates) {
    if (usedSet.has(t.id) || t.id === picked && direction !== 'template') continue;
    const s = score(t, f, text) + fit(t) * 1.5 - (usedFonts.has(t.traits.display) ? 2 : 0) + (t.traits.sections >= 8 ? 0.5 : 0);
    if (s > bs || (s === bs && t.id < best.id)) { bs = s; best = t; }
  }
  return best;
}
// The page in the reference that matches a funnel page, by path or by kind.
function pageOf(t, path) {
  const ps = (t.pages || []).filter((p) => !p.failed);
  const kind = (s) => (/thank/.test(s) ? 'thanks' : /order|checkout/.test(s) ? 'order' : /upsell|downsell|oto|vip/.test(s) ? 'upsell' : /vsl|video|watch|replay/.test(s) ? 'video' : /apply|application/.test(s) ? 'apply' : /book|calendar|schedule/.test(s) ? 'book' : /index|landing|home/.test(s) ? 'main' : s);
  return ps.find((p) => p.path === path) || ps.find((p) => kind(p.path) === kind(path)) || null;
}
const card = (t) => ({ id: t.id, name: t.name, live: t.live, label: t.label, cat: t.cat });

// For the wireframe: what the library does for this funnel type, and the section order of the chosen references.
function playbook(f, refs) {
  const L = lib(); const p = L.playbook[f.funnel_type];
  const lines = [`TEMPLATE LIBRARY: ${L.count} finished funnel templates were studied.`];
  if (p) lines.push(`Across the ${p.templates} ${f.funnel_type} templates, the main page has about ${p.avg_sections} sections, usually in this order (share of templates that have it): ${p.order.join(' > ')}.`);
  for (const r of refs) {
    const t = L.templates.find((x) => x.id === r.id); const m = t && pageOf(t, 'index'); if (!m) continue;
    lines.push(`Option ${r.n} reference "${t.name}" (${t.label}): ${m.sections.filter((s) => s.role !== 'nav' && s.role !== 'footer').map((s) => s.role + (s.has.length ? '[' + s.has.join(',') + ']' : '')).join(' > ')}`);
  }
  lines.push('Use these as proven structures. Keep every section the copy needs, and give each option the rhythm of its reference.');
  return lines.join('\n');
}
// For building a page: the reference page's structure, the design tokens and key CSS, as craft to learn from.
function brief(ref, path, opt) {
  const L = lib(); const t = L.templates.find((x) => x.id === (ref && ref.id)); if (!t) return '';
  const pg = pageOf(t, path); if (!pg) return '';
  const tr = t.traits;
  return `REFERENCE FROM THE TEMPLATE LIBRARY for option ${opt}: "${t.name}" (${t.label}, ${t.cat}), ${pg.name}.
Learn its craft: the section rhythm, how the hero is composed, the components, the grid choices, spacing, type scale and motion hooks. Do not copy its words, names, colors, images or business. Apply this funnel's brand kit, copy and the option's direction. Where the direction differs from the reference, follow the direction.
TRAITS: ${tr.dark ? 'dark' : 'light'} surface, ${tr.serif ? 'serif display type' : 'sans display type'}, ${tr.sections} sections, radius ${tr.radius || 'mixed'}, ${tr.bento ? 'bento or spanning grids, ' : ''}${tr.sticky ? 'sticky elements, ' : ''}motion level ${tr.motion} of 3${t.h1 ? ', h1 size ' + t.h1 : ''}${t.maxw ? ', container ' + t.maxw : ''}.
GRIDS IT USES: ${(t.grids || []).join(' | ')}
PAGE OUTLINE (tag.class[motion hook] "first words"):
${String(pg.outline || '').slice(0, path === 'index' ? 9000 : 5000)}
KEY CSS (tokens, base, headings, buttons, hero):
${String(t.css || '').slice(0, path === 'index' ? 5000 : 2500)}`;
}

module.exports = { lib, pick, pageOf, playbook, brief, card };
