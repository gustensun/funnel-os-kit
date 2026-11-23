// Funnel OS: the agentic funnel builder.
// Quiz -> research -> real product images -> offer -> copy (17P) -> wireframe -> brand -> graphics -> build 1 to 3 options -> live previews -> AI QA -> review.
// The member approves one option after seeing it live. Then it is published to Vercel and pushed to GitHub.
// Every step saves as it goes, so a long build carries on across function runs.
const { bad, clip, open, rpc, crypto } = require('./_lib');
// OpenRouter shows this address next to the image requests in its activity log.
const REFERER = String(process.env.APP_URL || '').trim() || 'https://github.com/gustensun/funnel-os-kit';
const AI = require('./_ai');
const TPL = require('./_templates.json');
const MOTION = require('./_motion');
const COLLECT = require('./_collect');
let GFX = null; const gfx = () => GFX || (GFX = require('./_gfx'));
const LIBR = require('./_library');

const PPLX = () => process.env.PPLX_BASE_URL || 'https://api.perplexity.ai';
const VERCEL = () => process.env.FOS_VERCEL_API || 'https://api.vercel.com';
const GH = () => process.env.FOS_GITHUB_API || 'https://api.github.com';
const OR = () => process.env.FOS_OPENROUTER_API || 'https://openrouter.ai/api/v1';
const SHOT = () => process.env.FOS_SHOT_API || 'https://api.microlink.io';
const BUILDER = process.env.FOS_BUILDER || 'anthropic/claude-opus-5-5';
const ADMIN_FIX = (label) => ({ label: label || 'Open Members and settings', href: '/#admin', admin: true });

/* ---------- catalog ---------- */
const TYPES = {
  'website-lead': { name: 'Lead funnel', goal: 'turn visitors into leads with a free resource, a quote request or a booked call', pages: [['index', 'Opt-in page'], ['thank-you', 'Thank you']] },
  website: { name: 'Website', goal: 'present the business, build trust and get visitors to book or buy', pages: [['index', 'Home'], ['services', 'Services'], ['book', 'Book a call']] },
  'sales-page': { name: 'Sales page', goal: 'sell the offer directly on one long page', pages: [['index', 'Sales page'], ['thank-you', 'Thank you']] },
  'vsl-application': { name: 'VSL application funnel', goal: 'get qualified people to watch the video, apply and book a call for a high-ticket offer', pages: [['index', 'Landing page'], ['vsl', 'VSL'], ['apply', 'Application'], ['book', 'Book a call'], ['thank-you', 'Thank you']] },
  'automated-cart': { name: 'Automated cart funnel', goal: 'sell the offer with an order page, an upsell and a thank you page', pages: [['index', 'Sales page'], ['order', 'Order page'], ['upsell', 'Upsell'], ['thank-you', 'Thank you']] },
  ecom: { name: 'Ecom product funnel', goal: 'sell a physical or digital product with a product page and order flow', pages: [['index', 'Product page'], ['order', 'Order page'], ['upsell', 'Upsell'], ['thank-you', 'Thank you']] },
  'webinar-cart': { name: 'Webinar funnel', goal: 'register people for a webinar, get them to show up, then sell the offer', pages: [['index', 'Registration'], ['thank-you', 'Confirmation'], ['webinar', 'Webinar room'], ['replay', 'Replay and offer']] },
  challenge: { name: 'Challenge funnel', goal: 'sign people up for a multi-day challenge, upsell a VIP seat and sell the core offer at the end', pages: [['index', 'Registration'], ['vip', 'VIP upgrade'], ['thank-you', 'Thank you']] },
  'low-ticket': { name: 'Low-ticket funnel', goal: 'sell a low-priced front-end offer with an order bump and upsells that lead to the core offer', pages: [['index', 'Sales page'], ['order', 'Order page'], ['upsell', 'Upsell'], ['upsell-2', 'Downsell'], ['thank-you', 'Thank you']] },
};
const P17 = ['Promotional bar', 'Promise', 'Problem and pain points', 'Proof of results', 'Personal epiphany', 'Process to solution', 'Positioning of the offer', 'Product breakdown', 'Proof of recommendations', 'Project spotlight', 'Perfect persona', 'Price anchor', 'Pricing tables', 'Product bonuses', 'Pushback reflex', 'Priority', 'P.S. and final call'];
const PAGE_GUIDE = {
  'thank-you': 'Thank you page: confirm what happened, say exactly what happens next in 2 or 3 numbered steps, set expectations (email, access, call), and give one useful next action. Short.',
  order: 'Order page: a tight offer summary, what is included as a short list, the price and payment options, the guarantee, a slot for the checkout form (the owner connects checkout later), and an order bump card. Short and focused, no navigation away.',
  checkout: 'Checkout page: offer summary, price, guarantee, a checkout form slot (connected later) and trust notes. Short.',
  upsell: 'One-time offer page: congratulate them, show one complementary offer that makes the first purchase work faster, the price, a short value stack, a yes button and a no thanks link to the next page.',
  'upsell-2': 'Downsell page: a lighter or cheaper version of the upsell, framed as an easier yes, with a yes button and a no thanks link to the next page.',
  vsl: 'VSL page: a headline that frames the video, a 16:9 video slot (the owner adds the video later), short copy under the video, proof, and a button to apply or book.',
  apply: 'Application page: who this is for and not for, what happens after applying, and an application form slot with 5 to 7 qualifying questions (connected later).',
  book: 'Booking page: confirm they qualified, what the call covers, who they will talk to, and a calendar slot (connected later).',
  webinar: 'Webinar room page: the video slot, the offer under the video, and a short agenda. Keep it calm and clear.',
  replay: 'Replay page: the replay video slot, a deadline note if real, the full offer with value stack and a buy button, and FAQ.',
  vip: 'VIP upgrade page: what VIP adds over the free seat, the price, a short value stack and a yes button, plus a no thanks link.',
  services: 'Services page: each service as a section with outcome, who it is for, what is included and a call to action.',
  pricing: 'Pricing page: 2 or 3 tiers with who each is for, what is included, the price and one button each, plus FAQ.',
};
const DIRECTIONS = [
  { id: 'template', name: 'True to the template', idea: 'Follow the chosen template closely: its layout system, section patterns, spacing rhythm, navigation and footer. It is the reference this member picked, so the result should feel like that template rebuilt for this brand.' },
  { id: 'editorial', name: 'Editorial', idea: 'An editorial take: large confident type, generous whitespace, asymmetric two-column layouts, thin rules, pull quotes and image crops with real art direction. Calm motion. Different hero composition from the template.' },
  { id: 'bold', name: 'Bold and visual', idea: 'A bold take: a deep color hero, bento grids, oversized numbers, strong contrast blocks, visual charts and diagrams drawn in SVG, and a little more motion. Different hero composition from the template.' },
  { id: 'product', name: 'Product first', idea: 'Lead with the product itself: a large showcase of the real product images in the first screen, a scrolling gallery, close-up crops and short captions. Copy is tight and sits beside the visuals. Different hero composition from the earlier options.' },
  { id: 'minimal', name: 'Quiet and minimal', idea: 'A quiet, minimal take: one column, lots of air, small precise type for labels, a single accent color used sparingly, hairline dividers and very little motion. Different hero composition from the earlier options.' },
  { id: 'story', name: 'Story led', idea: 'A story-led take: the page reads top to bottom like a short essay with a strong opening line, full-width image bands between chapters, numbered steps and a sticky progress cue. Different hero composition from the earlier options.' },
];
const MAX_OPTS = 6;
// How option 1 starts: a template the member picked, the closest template in the library, or no template at all.
const startOf = (f) => { const q = (f && f.quiz) || {}; return ['template', 'library', 'scratch'].includes(q.start) ? q.start : (q.template ? 'template' : 'library'); };
const FIRST = {
  library: { id: 'template', name: 'Closest template', idea: 'Follow the closest template from the library: its layout system, section patterns, spacing rhythm, navigation and footer, rebuilt for this brand.' },
  scratch: { id: 'scratch', name: 'Designed from scratch', idea: 'An original design made only from this brand kit, the copy and the design rules. No template: compose the hero, the section rhythm and the components fresh for this business and its buyers.' },
};
const dirsFor = (f) => { const m = startOf(f); return m === 'template' ? DIRECTIONS : [FIRST[m], ...DIRECTIONS.slice(1)]; };
const DISPLAY = ['Instrument Serif', 'Fraunces', 'Playfair Display', 'DM Serif Display', 'Cormorant Garamond', 'Newsreader', 'Bricolage Grotesque', 'Space Grotesk', 'Syne', 'Unbounded', 'Archivo', 'Manrope', 'Inter Tight', 'Sora', 'Outfit', 'Plus Jakarta Sans', 'Bebas Neue', 'Anton', 'Oswald', 'Geist'];
const BODY = ['Inter', 'Hanken Grotesk', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Source Sans 3', 'Work Sans', 'Figtree', 'Onest', 'Instrument Sans', 'IBM Plex Sans', 'Geist', 'Lora', 'Source Serif 4'];
const HEX = /^#[0-9a-f]{6}$/i;

const tplById = (id) => TPL.find((t) => t.id === id) || null;
const slug = (s) => String(s || 'funnel').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'funnel';
const now = () => new Date().toISOString();
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pagesOf(f) {
  const t = tplById((f.quiz || {}).template);
  const list = t && t.pages.length > 1 ? t.pages.map((p) => [p.path, p.name]) : (TYPES[f.funnel_type] || TYPES['sales-page']).pages;
  const seen = new Set();
  return list.filter(([p]) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(p) && !seen.has(p) && seen.add(p)).slice(0, 6).map(([path, name]) => ({ path, name }));
}

/* ---------- keys ---------- */
async function keys(jwt) {
  const k = await rpc(jwt, 'gai_funnel_keys');
  const o = (p) => { try { return k && k[p] ? open(k[p]) : null; } catch { return null; } };
  const ai = o('perplexity');
  if (!ai) throw bad('Funnel OS has no AI connected yet. The admin adds the Perplexity key in Members and settings. Try again later today.', 503, ADMIN_FIX('Add the Perplexity key'));
  let vercel = null; try { const v = o('vercel'); vercel = v ? JSON.parse(v) : null; } catch { vercel = null; }
  return { ai, model: AI.valid(k.model) ? k.model : AI.DEFAULT, openrouter: o('openrouter'), github: o('github'), vercel };
}

/* ---------- HTTP ---------- */
async function jf(label, url, opt = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opt.timeout || 60000);
  let r;
  try { r = await fetch(url, { ...opt, signal: ctl.signal }); }
  catch (e) { clearTimeout(t); throw bad(label + ' could not be reached. It retries on the next run.', 502); }
  clearTimeout(t);
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch { j = txt; }
  if (!r.ok) {
    const m = (j && (j.error && (j.error.message || j.error) || j.message)) || String(txt).slice(0, 200) || r.status;
    const e = bad(label + ': ' + clip(typeof m === 'string' ? m : JSON.stringify(m), 220), r.status === 401 || r.status === 403 ? 409 : 502); e.status = r.status; throw e;
  }
  return j;
}

/* ---------- the AI ---------- */
const HOUSE = 'House rules for every word you write: plain, specific language in the business owner\'s voice. No em dashes, no exclamation points, no emojis, no hype words (revolutionary, game-changing, unlock, skyrocket, supercharge), and no formulaic contrast lines like "it is not X, it is Y". Never invent testimonials, client names, logos, statistics, results or awards. Use only facts given or found in cited research. Never mention the coach or platform that built this, or any other business than the one in the brief.';
const SYS = 'You are Funnel OS, a senior funnel strategist, direct-response copywriter and conversion designer. You build complete funnels for the business owner in the brief. ' + HOUSE;
const CONTINUE = 'You ran out of time in the middle. Continue from the exact character where the text above stops. Do not repeat anything, do not start over, and do not add commentary or code fences. Output only the rest.';

function parseJSON(t) {
  let s = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = s.indexOf('{'); const z = s.lastIndexOf('}');
  if (a < 0 || z < a) throw bad('The AI answer was not in the expected format. It retries on the next run.', 502);
  s = s.slice(a, z + 1);
  try { return JSON.parse(s); } catch { /* light repair below */ }
  try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u0019]+/g, ' ')); }
  catch { throw bad('The AI answer was cut off or malformed. It retries on the next run.', 502); }
}

// One generation that can run longer than one function run. The text so far is saved in work.drafts[key],
// and the next run asks the model to carry on from the exact character. Returns { text } or { pending: true }.
async function gen(ctx, key, system, user, { max = 8000, model, tools, steps } = {}) {
  const w = ctx.work; w.drafts = w.drafts || {}; w.cont = w.cont || {};
  const d = w.drafts[key] || '';
  const left = ctx.deadline - Date.now() - 6000;
  if (left < 25000) return { pending: true };
  const msgs = [{ role: 'user', text: user }];
  if (d) msgs.push({ role: 'assistant', text: d }, { role: 'user', text: CONTINUE });
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), left);
  let got = ''; let res = null; let err = null;
  const m = model || ctx.K.model;
  try { res = await AI.stream(ctx.K.ai, m, system, msgs, (x) => { got += x; }, { max, web: false, signal: ac.signal, tools, steps }); }
  catch (e) { err = e; }
  finally { clearTimeout(timer); }
  if (err && !ac.signal.aborted && got.length < 400) {
    // Nothing useful came back. A second model gets one try when the first failed fast.
    if (!d && err.retryable && Date.now() < ctx.deadline - 60000 && m !== AI.backup(m)) return gen(ctx, key, system, user, { max, model: AI.backup(m), tools, steps });
    throw err;
  }
  let add = got; if (d) add = add.replace(/^\s*```(?:html|json)?\s*/i, '');
  const full = d + add;
  const finished = res && !err && res.stop !== 'max_tokens';
  if (finished) { delete w.drafts[key]; delete w.cont[key]; return { text: full, pages: res.pages || [] }; }
  w.cont[key] = (w.cont[key] || 0) + 1;
  if (w.cont[key] > 5) { delete w.drafts[key]; delete w.cont[key]; throw bad('The AI kept stopping before it finished. Press Try again to start this step fresh.', 502); }
  w.drafts[key] = full;
  return { pending: true, kb: Math.round(full.length / 1024) };
}
async function genJSON(ctx, key, system, user, opt) {
  const r = await gen(ctx, key, system, user, opt);
  if (r.pending) return r;
  return { json: parseJSON(r.text), pages: r.pages };
}

/* ---------- the brief ---------- */
function brief(f, short) {
  const q = f.quiz || {}; const t = tplById(q.template); const T = TYPES[f.funnel_type] || TYPES['sales-page'];
  const docs = (q.docs || []).map((d) => `--- ${clip(d.name, 80)} ---\n${String(d.text || '').slice(0, short ? 2500 : 9000)}`).join('\n');
  return [
    `BUSINESS: ${q.brand || f.title}${q.tagline ? ' (' + q.tagline + ')' : ''}`,
    `FUNNEL TYPE: ${T.name}. Goal: ${T.goal}.`,
    `PAGES: ${pagesOf(f).map((p) => p.name + ' (' + p.path + ')').join(', ')}`,
    `WHAT THEY SELL, IN THEIR WORDS:\n${String(q.offer || '').slice(0, short ? 2500 : 6000)}`,
    q.audience ? `WHO IT IS FOR: ${clip(q.audience, 800)}` : '',
    q.owner ? `OWNER OR FACE OF THE BRAND: ${clip(q.owner, 300)}` : '',
    proofLine(q),
    laterLine(q),
    q.checkout_url ? `CHECKOUT OR BOOKING LINK: ${q.checkout_url}` : '',
    (q.urls || []).length ? `THEIR LINKS: ${(q.urls || []).join(', ')}` : '',
    q.notes ? `NOTES FROM THEM:\n${String(q.notes).slice(0, short ? 2000 : 6000)}` : '',
    docs ? `THEIR DOCUMENTS:\n${docs}` : '',
    t ? `TEMPLATE THEY PICKED: ${t.name} (${t.label}, ${t.cat})` : '',
    siteFacts(f, short),
    f.research && f.research.about && !short ? `FACTS FOUND ABOUT THEM: ${JSON.stringify(f.research.about).slice(0, 3000)}` : '',
  ].filter(Boolean).join('\n\n');
}
// What their links really contain: names, categories and counts, read straight from the pages.
function siteFacts(f, short) {
  const sites = ((f.visuals || {}).sites || []).filter((x) => !x.failed && (x.gallery || x.title));
  if (!sites.length) return '';
  return 'WHAT THEIR LINKS CONTAIN (read from the pages, use these real names and counts):\n' + sites.map((x) => {
    const cats = Object.entries(x.cats || {}).map(([k, n]) => `${k} ${n}`).join(', ');
    const labels = Object.entries(x.labels || {}).map(([k, n]) => `${k} ${n}`).join(', ');
    return [`- ${x.url}: ${x.title || ''}${x.h1 ? '. Headline: ' + x.h1 : ''}${x.desc ? '. ' + clip(x.desc, 240) : ''}`,
      x.gallery ? `  ${x.count} items shown on the page.${cats ? ' By category: ' + cats + '.' : ''}${labels ? ' By type: ' + labels + '.' : ''}` : '',
      x.gallery && (x.names || []).length ? `  Item names: ${(x.names || []).slice(0, short ? 30 : 90).map((n) => n.split(' | ')[0]).join('; ')}` : ''].filter(Boolean).join('\n');
  }).join('\n');
}
// What the owner wants done about proof and missing pieces, read from their own words.
const PLACEHOLDER_RULE = 'Build each testimonial or result card as a clearly marked fill-in: the quote as a bracketed instruction such as [Client quote: the result they got and how fast], the name as [Client name], the role as [Role, city], an initials circle instead of a photo, and data-fos-placeholder="testimonial" on the card. Never write a real-sounding name, quote, logo or number for these.';
function proofMode(q) {
  if (['real', 'placeholder', 'none'].includes(q.proof_mode)) return q.proof_mode;
  const it = q.intent || {};
  if (['real', 'placeholder', 'none'].includes(it.proof)) return it.proof;
  return q.proof && String(q.proof).trim() ? 'real' : 'none';
}
function proofLine(q) {
  const m = proofMode(q); const real = q.proof && String(q.proof).trim() && !/^(use|add|put|make|leave|skip|no |none|i'?ll|i will|later|placeholder|replacer|dummy|sample)/i.test(String(q.proof).trim()) ? String(q.proof).slice(0, 4000) : '';
  if (m === 'placeholder') return `PROOF: they want placeholder testimonials for now and will swap in real ones later. ${real ? 'Use this real proof first, word for word:\n' + real + '\nThen add' : 'Add'} placeholder proof where proof sections fit. ${PLACEHOLDER_RULE}`;
  if (m === 'none') return 'PROOF: leave testimonial, review and result sections out. Do not invent any proof.';
  return real ? `REAL PROOF THEY GAVE (testimonials, results, numbers; use only these):\n${real}` : 'REAL PROOF: none given. Do not invent any.';
}
function laterLine(q) {
  const it = q.intent || {}; const out = [];
  const later = (it.later || []).filter((x) => x && !/testimonial|review|proof/i.test(x)).slice(0, 8);
  if (later.length) out.push(`THEY WILL ADD THESE LATER: ${later.join('; ')}. Leave a clean, clearly marked slot for each (a bracketed label like [Add your logo] and data-fos-placeholder on the element), never invent it and never drop the section.`);
  const rules = (it.rules || []).filter(Boolean).slice(0, 10);
  if (rules.length) out.push(`THEIR INSTRUCTIONS, FOLLOW EXACTLY:\n${rules.map((r) => '- ' + clip(r, 240)).join('\n')}`);
  return out.join('\n\n');
}
// Quick heuristic used when the AI read is not available.
function guessIntent(q) {
  const t = [q.proof, q.notes, q.offer].join('\n');
  const ph = /(placeholder|replacer|dummy|sample|fake|mock|filler|example)\s*(testimonial|review|proof|quote)|(testimonial|review|proof|quote)s?[^.\n]{0,40}(later|for now|placeholder|replace)|add (the )?(testimonial|review|proof)s? later/i.test(t);
  const none = /(no|skip|without|leave out)\s+(any\s+)?(testimonial|review|proof)s?/i.test(t) && !ph;
  return { proof: ph ? 'placeholder' : none ? 'none' : (q.proof && String(q.proof).trim() ? 'real' : 'none'), later: [], rules: [], by: 'guess' };
}
async function readIntent(ctx) {
  const q = ctx.f.quiz || {};
  if (q.intent) return null;
  const text = [q.proof && 'PROOF FIELD:\n' + String(q.proof).slice(0, 3000), q.notes && 'NOTES:\n' + String(q.notes).slice(0, 3000), 'WHAT THEY SELL:\n' + String(q.offer || '').slice(0, 2500), q.vibe && 'LOOK: ' + clip(q.vibe, 300)].filter(Boolean).join('\n\n');
  let it = null;
  try {
    const r = await genJSON(ctx, 'intent', 'You read what a business owner typed into a funnel builder form and say what they want. Reply with JSON only.', `${text}\n\nDecide:\n- proof: "real" if they gave real testimonials, results or numbers to use; "placeholder" if they ask for placeholder, sample, dummy or "replacer" testimonials, or say they will add testimonials or reviews later; "none" if they want no testimonials or gave nothing.\n- later: things they say they will add or send later (for example video, logo, photos, prices, testimonials).\n- rules: other explicit instructions about the funnel, rewritten as short commands (for example "Do not mention prices", "Use British spelling"). Leave out facts about the offer.\nReturn only JSON: {"proof":"real|placeholder|none","later":[""],"rules":[""]}`, { max: 700 });
    if (r.pending) return null;
    const j = r.json || {};
    if (['real', 'placeholder', 'none'].includes(j.proof)) it = { proof: j.proof, later: (Array.isArray(j.later) ? j.later : []).map((x) => clip(x, 80)).filter(Boolean).slice(0, 8), rules: (Array.isArray(j.rules) ? j.rules : []).map((x) => clip(x, 240)).filter(Boolean).slice(0, 10), by: 'ai' };
  } catch { /* the heuristic below covers it */ }
  if (!it) it = guessIntent(q);
  // A clear request in their words wins over a wrong AI read.
  const g = guessIntent(q); if (g.proof === 'placeholder' && it.proof !== 'placeholder') it.proof = 'placeholder';
  return it;
}

async function coaching(jwt, q) {
  try { const j = await rpc(jwt, 'gai_lookup', { p_q: q.slice(0, 400), p_limit: 6 }); return ((j && j.passages) || []).slice(0, 5).map((p) => '- ' + clip(p.body, 700)).join('\n'); }
  catch { return ''; }
}

/* ---------- steps ---------- */
const ORDER = ['research', 'collect', 'offer', 'copy', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'fix', 'done'];
const LABEL = { research: 'Market research', collect: 'Product images', offer: 'Offer', copy: 'Copy', wireframe: 'Wireframe', brand: 'Branding', graphics: 'Graphics', build: 'Building', preview: 'Live previews', qa: 'Quality check', fix: 'Fixes', done: 'Ready for review', revise: 'Changes', publish: 'Publishing' };

async function stepResearch(ctx) {
  const f = ctx.f;
  if (!(f.quiz || {}).intent) { const it = await readIntent(ctx); if (it) { f.quiz = { ...(f.quiz || {}), intent: it }; ctx.work.intent_patch = true; } }
  const q = f.quiz || {};
  const urls = (q.urls || []).slice(0, 5);
  const want = '{"summary":"3 sentences on the market and where this offer fits","audience":{"who":"","pains":["5 pains in their words"],"desires":["4"],"objections":["5 real buying objections"],"words":["8 phrases buyers actually use"]},"competitors":[{"name":"","offer":"","price":"","angle":"","url":""}],"price_range":"","angles":["5 angles that could lead the page, strongest first"],"gaps":["3 things competitors do not say that this business can"],"about":{"bio":"what their own pages say about them","credentials":[""],"proof":["testimonials or results found on their own pages, quoted exactly, with the name"],"numbers":["real numbers found on their pages"]},"sources":[{"title":"","url":""}]}';
  const user = `${brief(f, true)}\n\nResearch this market with web search.${urls.length ? ` First read their own pages with fetch_url (${urls.join(', ')}) and collect facts about them: bio, credentials, real testimonials and numbers, exactly as written.` : ''} Then find 5 to 8 competing offers with price, angle and URL, the buyer's pains, desires and objections in their own words (reviews, forums, Reddit, YouTube comments), typical prices, and the angles working right now. Return only JSON in this shape: ${want}`;
  const r = await genJSON(ctx, 'research', SYS + ' You research markets for funnels and cite real sources.', user, { max: 5000, tools: [{ type: 'web_search' }, { type: 'fetch_url' }], steps: 10 });
  if (r.pending) return { pending: true, note: 'Still researching' };
  const j = r.json || {};
  const srcs = [...(r.pages || []), ...(Array.isArray(j.sources) ? j.sources : [])].filter((s) => s && /^https?:\/\//.test(s.url || ''));
  const seen = new Set(); j.sources = srcs.filter((s) => (seen.has(s.url) ? false : seen.add(s.url))).slice(0, 14).map((s) => ({ title: clip(s.title, 140) || s.url, url: s.url }));
  const qp = ctx.work.intent_patch ? { quiz: f.quiz } : {}; delete ctx.work.intent_patch;
  return { patch: { research: j, ...qp }, note: `${(j.competitors || []).length} competitors, ${(j.angles || []).length} angles, ${j.sources.length} sources` };
}

// Reads their links for real product images, names and counts. A gallery of templates or products
// becomes real screenshots for the page and the graphics, so nothing is drawn as a stand-in.
async function stepCollect(ctx) {
  const f = ctx.f; const q = f.quiz || {}; const v = { ...(f.visuals || {}) };
  if (!COLLECT.linksOf(q).length) return { note: 'No links given. The page uses your images and drawn art.' };
  const r = await COLLECT.collect({
    q, id: f.id, max: 30, deadline: ctx.deadline,
    save: (name, data, label) => rpc(ctx.jwt, 'gai_asset_put', { p_name: name, p_mime: 'image/webp', p_role: 'ai', p_label: clip(label, 120), p_data: data }),
  });
  v.refs = r.shots; v.sites = r.sites;
  const g = r.sites.filter((x) => x.gallery); const bad = r.sites.filter((x) => x.failed);
  const note = r.shots.length
    ? `${r.shots.length} real images${g.length ? ` from ${g.map((x) => x.count + ' items on ' + new URL(x.url).host).join(', ')}` : ''}`
    : 'No usable images found on your links. The page uses your uploads and drawn art.';
  return { patch: { visuals: v }, note: note + (bad.length ? `. Could not open ${bad.map((x) => x.url).join(', ')}; check the link is public` : '') };
}

const OFFER_SHAPE = '{"name":"","one_liner":"","promise":"","audience":"","mechanism":{"name":"","steps":[{"name":"","what":""}]},"price":{"amount":0,"currency":"USD","compare_at":null,"note":"","plans":[{"label":"","amount":0,"every":""}]},"stack":[{"name":"","what":"","value":0}],"bonuses":[{"name":"","what":"","value":0}],"guarantee":{"name":"","days":0,"terms":""},"cta":"","urgency":"","lead_magnet":"","upsells":[{"page":"upsell","name":"","price":0,"what":""}],"changes":"one sentence on what you sharpened"}';
async function stepOffer(ctx) {
  const f = ctx.f;
  const notes = ctx.work.coach_offer || (ctx.work.coach_offer = await coaching(ctx.jwt, 'offer stack value stack bonuses guarantee price anchor transformation timeline trust'));
  const user = `${brief(f)}\n\nRESEARCH:\n${JSON.stringify(f.research || {}).slice(0, 8000)}\n\n${notes ? 'OFFER FRAMEWORKS FROM THE COACHING LIBRARY (use the thinking, never quote or name the source):\n' + notes + '\n\n' : ''}${(f.quiz || {}).improve_offer === false ? `Turn what they sell into the final offer for this ${(TYPES[f.funnel_type] || {}).name || 'funnel'}, keeping their offer as they wrote it: same name, stack items and bonuses, no new items. Only structure it, fill in short descriptions and fair standalone values, and name the method from what they described.` : `Turn what they sell into the final offer for this ${(TYPES[f.funnel_type] || {}).name || 'funnel'} and improve the offer stack. Use a clear Transformation, a believable Timeline and Trust. Name the method with 3 to 5 steps. Build a value stack where each item answers an objection from the research, with honest standalone values. Bonuses only if they help the buyer act faster.`} Keep their price, payment options, guarantee and every fact exactly as given. If no price is given, choose one inside the research price range and say why in changes. Urgency only if it is real. lead_magnet only for lead, webinar and challenge funnels. upsells only for pages named upsell, upsell-2 or vip in the page list.\nReturn only JSON: ${OFFER_SHAPE}`;
  const r = await genJSON(ctx, 'offer', SYS, user, { max: 4000, model: BUILDER });
  if (r.pending) return { pending: true, note: 'Still shaping the offer' };
  const o = r.json || {}; o.price = o.price || {}; o.price.amount = num(o.price.amount); o.price.compare_at = num(o.price.compare_at);
  o.price.currency = /^[A-Z]{3}$/.test(o.price.currency || '') ? o.price.currency : 'USD';
  o.price.plans = (o.price.plans || []).filter((p) => num(p.amount)).map((p) => ({ ...p, amount: num(p.amount) }));
  o.stack = (o.stack || []).filter((x) => x && x.name).slice(0, 9); o.bonuses = (o.bonuses || []).filter((x) => x && x.name).slice(0, 4);
  return { patch: { offer: o }, note: `${o.name || 'Offer'}${o.price.amount ? ', ' + o.price.currency + ' ' + o.price.amount : ''}. ${o.stack.length} stack items, ${o.bonuses.length} bonuses.` };
}

const SECTION_SHAPE = '{"id":"short-kebab-id","p":"which of the 17P or the page purpose","eyebrow":"","headline":"one *accent phrase* allowed","sub":"","body":["short paragraphs"],"bullets":[""],"items":[{"title":"","body":"","meta":""}],"cta":"","note":""}';
async function stepCopy(ctx) {
  const f = ctx.f; const pages = pagesOf(f); const T = TYPES[f.funnel_type] || TYPES['sales-page'];
  const notes = ctx.work.coach_copy || (ctx.work.coach_copy = await coaching(ctx.jwt, '17Ps sales page sections headline hook proof objections ' + T.name));
  const longMain = ['sales-page', 'automated-cart', 'low-ticket', 'ecom'].includes(f.funnel_type);
  const guide = pages.map((p, i) => {
    if (p.path === 'index') {
      if (longMain) return `- ${p.path} (${p.name}): a full long-form page that follows the 17P order: ${P17.join(', ')}. Skip a P when it does not fit this offer and price point${proofMode(f.quiz || {}) === 'placeholder' ? ' (keep the proof sections, built as marked placeholders)' : ' (for example no proof sections without real proof)'}, rather than padding it.`;
      return `- ${p.path} (${p.name}): the first page of a ${T.name}. Goal: ${T.goal}. Use the 17P sections that fit this page (promise, problem, proof of results, process, perfect persona, pushback reflex, priority), short and focused on one action.`;
    }
    return `- ${p.path} (${p.name}): ${PAGE_GUIDE[p.path] || PAGE_GUIDE[p.path.replace(/-\d+$/, '')] || 'A focused page that moves the visitor to the next step.'}`;
  }).join('\n');
  const user = `${brief(f)}\n\nRESEARCH:\n${JSON.stringify(f.research || {}).slice(0, 7000)}\n\nFINAL OFFER:\n${JSON.stringify(f.offer || {}).slice(0, 6000)}\n\n${notes ? 'COPY FRAMEWORKS FROM THE COACHING LIBRARY (use the thinking, never quote or name the source):\n' + notes + '\n\n' : ''}Write the copy for every page of this funnel:\n${guide}\nRules:\n- The hero headline is the strongest angle from the research, under 12 words, with one phrase wrapped in *asterisks* for the accent color.\n- Mirror the buyer words from the research. Short paragraphs, one idea each. Scannable bullets.\n- Proof only from the PROOF instructions above or facts found about them. Numbers only when real.\n- Forms, checkout, calendars and videos are slots the owner connects later: write the labels and helper text for them, not the integrations.\n- Every page ends with a clear next step.\nReturn only JSON: {"meta":{"site_title":"","description":""},"pages":[{"path":"index","name":"","title":"","description":"","sections":[${SECTION_SHAPE}]}]}`;
  const r = await genJSON(ctx, 'copy', SYS, user, { max: 14000, model: BUILDER });
  if (r.pending) return { pending: true, note: `Still writing the copy (${r.kb || 0} KB so far)` };
  const c = r.json || {}; c.pages = (c.pages || []).filter((p) => p && pages.some((x) => x.path === p.path));
  for (const p of pages) if (!c.pages.some((x) => x.path === p.path)) c.pages.push({ path: p.path, name: p.name, sections: [] });
  const words = JSON.stringify(c.pages).replace(/"[a-z_]+":/g, ' ').split(/\s+/).length;
  return { patch: { copy: c }, note: `${c.pages.length} pages, ${c.pages.reduce((a, p) => a + (p.sections || []).length, 0)} sections, about ${Math.round(words / 50) * 50} words` };
}

async function stepWireframe(ctx) {
  const f = ctx.f; const n = Math.max(1, Math.min(MAX_OPTS, +(f.quiz || {}).options || 1));
  const t = tplById((f.quiz || {}).template);
  const D = dirsFor(f); const scratch = startOf(f) === 'scratch';
  const refs = []; if (!scratch) for (let i = 0; i < n; i++) { const r = LIBR.pick(f, D[i].id, refs.map((x) => x.id)); if (r) refs.push({ n: i + 1, ...LIBR.card(r) }); }
  const outline = (f.copy.pages || []).map((p) => ({ path: p.path, sections: (p.sections || []).map((s) => ({ id: s.id, p: s.p, headline: clip(s.headline, 90), items: (s.items || []).length, bullets: (s.bullets || []).length })) }));
  const user = `FUNNEL: ${(TYPES[f.funnel_type] || {}).name} for ${(f.quiz || {}).brand || f.title}.\nTEMPLATE: ${t ? t.name + ' (' + t.live + ')' : scratch ? 'none, the owner asked for a design from scratch. Do not base it on any template' : 'none picked, so option 1 follows the closest template from the library'}\nCOPY OUTLINE:\n${JSON.stringify(outline).slice(0, 9000)}\n\n${scratch ? '' : LIBR.playbook(f, refs) + '\n\n'}${((f.visuals || {}).refs || []).length ? `REAL IMAGES AVAILABLE: ${((f.visuals || {}).refs || []).length} real product screenshots from their links, plus a finished hero graphic, a wall of products and a cover per stack item. Plan sections that show them (gallery, wall band, media splits); never plan stand-in thumbnails.\n` : ''}Plan the wireframe for every page: for each section pick a layout (for example split image right, centered stack, bento grid, 3-column cards, numbered timeline, sticky steps, comparison table, stat band with counters, testimonial wall, value stack card, pricing table, FAQ accordion, full-bleed deep band, logo marquee), the visual (photo, AI image, inline SVG icon set, SVG chart or diagram, none) and the motion (reveal, stagger, counter, draw, parallax, none). Vary layouts from section to section. Then describe ${n} design option${n > 1 ? 's' : ''}: ${D.slice(0, n).map((d, i) => `option ${i + 1} "${d.name}": ${d.idea}`).join(' ')}\nReturn only JSON: {"pages":[{"path":"index","sections":[{"id":"","p":"","layout":"","visual":"","motion":"","why":"short"}]}],"options":[{"n":1,"name":"","idea":"two sentences on how this option looks"}]}`;
  const r = await genJSON(ctx, 'wireframe', SYS, user, { max: 5000 });
  if (r.pending) return { pending: true, note: 'Still planning the layout' };
  const w = r.json || {}; w.options = (w.options || []).slice(0, n);
  for (let i = 0; i < n; i++) { w.options[i] = { ...D[i], ...(w.options[i] || {}), n: i + 1, id: D[i].id }; if (!w.options[i].name) w.options[i].name = D[i].name; }
  if (scratch) w.options[0].name = FIRST.scratch.name;
  w.refs = refs;
  const sec = (w.pages || []).reduce((a, p) => a + (p.sections || []).length, 0);
  return { patch: { wireframe: w }, note: `${sec} sections planned, ${n} option${n > 1 ? 's' : ''}, ${scratch ? 'designed from scratch, no templates used' : 'built from ' + refs.map((r) => r.name).join(', ') + ' in the template library'}` };
}

async function readSite(url) {
  if (!/^https?:\/\//.test(url || '')) return null;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 FunnelOS' } }); clearTimeout(t);
    const html = (await r.text()).slice(0, 500000);
    const hex = {}; (html.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach((h) => { h = h.toLowerCase(); hex[h] = (hex[h] || 0) + 1; });
    const fonts = new Set(); (html.match(/family=([^&"':]+)/g) || []).forEach((m) => fonts.add(decodeURIComponent(m.slice(7)).replace(/\+/g, ' ')));
    return { url, colors: Object.entries(hex).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h]) => h), fonts: [...fonts].slice(0, 6) };
  } catch { return null; }
}
async function stepBrand(ctx) {
  const f = ctx.f; const q = f.quiz || {};
  const site = q.palette === 'site' || !q.palette ? await readSite((q.urls || [])[0]) : null;
  const fixed = [];
  if (q.palette && typeof q.palette === 'object' && HEX.test(q.palette.bg || '') && HEX.test(q.palette.ink || '') && HEX.test(q.palette.accent || '')) fixed.push(`THEY CHOSE THESE COLORS. Use them exactly: background ${q.palette.bg}, ink ${q.palette.ink}, accent ${q.palette.accent}${HEX.test(q.palette.deep || '') ? ', deep ' + q.palette.deep : ''}. Derive the rest so they sit well together.`);
  if (q.fonts && q.fonts.display && q.fonts.body) fixed.push(`THEY CHOSE THESE FONTS: display ${q.fonts.display}, body ${q.fonts.body}${q.fonts.files ? ' (their own font files)' : ''}. Return exactly these.`);
  const user = `${fixed.join('\n')}\n\n${brief(f, true)}\n\nOFFER: ${JSON.stringify({ name: (f.offer || {}).name, promise: (f.offer || {}).promise })}\n${site ? `THEIR CURRENT SITE (${site.url}): colors ${site.colors.join(', ')}; fonts ${site.fonts.join(', ')}` : ''}\n${q.vibe ? 'THE LOOK THEY WANT: ' + clip(q.vibe, 400) : ''}\n\nBuild the brand kit for this funnel. Restrained and premium: one background, near-black ink, one accent used with care, one deep color for dark bands. Accessible contrast (accent_ink must read on accent). Fonts only from these Google Fonts. Display: ${DISPLAY.join(', ')}. Body: ${BODY.join(', ')}. Then write the art direction and three image prompts in one consistent style that fits the palette: hero (landscape 3:2), feature (square), detail (portrait 2:3). Images contain no text, letters, logos, UI or screens with words, and no faces of real people.\nReturn only JSON: {"name":"","logo_text":"","palette":{"bg":"#","surface":"#","ink":"#","muted":"#","line":"#","accent":"#","accent_ink":"#","deep":"#","deep_ink":"#"},"fonts":{"display":"","body":""},"radius":14,"voice":["4 short voice rules"],"look":"two sentences","art_direction":"","prompts":{"hero":"","feature":"","detail":""}}`;
  const r = await genJSON(ctx, 'brand', SYS, user, { max: 2500 });
  if (r.pending) return { pending: true, note: 'Still on the brand kit' };
  const b = r.json || {};
  const d = { bg: '#f7f5f0', surface: '#ffffff', ink: '#16140f', muted: '#5d5a52', line: '#e5e0d6', accent: '#2f6b4f', accent_ink: '#ffffff', deep: '#14231c', deep_ink: '#f3efe6' };
  const p = b.palette || {}; b.palette = Object.fromEntries(Object.keys(d).map((k) => [k, HEX.test(p[k] || '') ? p[k].toLowerCase() : d[k]]));
  if (q.palette && typeof q.palette === 'object') ['bg', 'ink', 'accent', 'deep'].forEach((k) => { if (HEX.test(q.palette[k] || '')) b.palette[k] = q.palette[k].toLowerCase(); });
  b.fonts = b.fonts || {};
  if (q.fonts && q.fonts.display && q.fonts.body) b.fonts = { display: clip(q.fonts.display, 40), body: clip(q.fonts.body, 40) };
  if (!DISPLAY.includes(b.fonts.display) && !(q.fonts && q.fonts.display === b.fonts.display)) b.fonts.display = 'Instrument Serif';
  if (!BODY.includes(b.fonts.body) && !(q.fonts && q.fonts.body === b.fonts.body)) b.fonts.body = 'Inter';
  if (q.fonts && q.fonts.files) b.fonts.files = q.fonts.files;
  b.radius = Math.max(0, Math.min(28, num(b.radius) || 14)); b.name = clip(b.name, 80) || q.brand || f.title; b.logo_text = clip(b.logo_text, 40) || b.name;
  if (site) b.site = { url: site.url, colors: site.colors.slice(0, 6) };
  return { patch: { brand: b }, note: `${b.fonts.display} and ${b.fonts.body}, accent ${b.palette.accent}` };
}

/* ---------- graphics: their own images first, AI images when OpenRouter is connected ---------- */
const RATIO = { hero: '3:2', feature: '1:1', detail: '2:3' };
async function orImage(key, prompt, ratio) {
  const models = (process.env.FOS_IMAGE_MODELS || 'openai/gpt-image-2,google/gemini-3-pro-image,black-forest-labs/flux-3-image').split(',');
  let last;
  for (const model of models) {
    try {
      const j = await jf('OpenRouter', OR() + '/images', { method: 'POST', timeout: 150000, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': REFERER, 'X-Title': 'Funnel OS' }, body: JSON.stringify({ model, prompt, aspect_ratio: ratio, resolution: '1K', n: 1 }) });
      const d = j && j.data && j.data[0]; let b64 = d && d.b64_json; let mime = (d && d.media_type) || 'image/png';
      if (!b64 && d && d.url && /^data:image\//.test(d.url)) { mime = d.url.slice(5, d.url.indexOf(';')); b64 = d.url.slice(d.url.indexOf(',') + 1); }
      if (b64 && /^image\/(png|jpeg|webp)$/.test(mime)) return { b64, mime, model };
      last = bad('OpenRouter ' + model + ' sent no image', 502);
    } catch (e) { last = e; if (e.status === 402 || e.status === 401 || /credit|insufficient/i.test(e.message || '')) break; }
  }
  throw last || bad('No image model answered', 502);
}
async function stepGraphics(ctx) {
  const f = ctx.f; const q = f.quiz || {}; const v = { ...(f.visuals || {}) }; v.images = v.images || [];
  const own = (q.images || []).filter((x) => x && x.name);
  if (!v.own_done) { own.forEach((x) => { if (!v.images.some((y) => y.name === x.name)) v.images.push({ name: x.name, role: x.role || 'other', label: x.label || '', own: true }); }); v.own_done = true; }
  const refs = v.refs || []; const shots = refs.filter((x) => x.kind !== 'site');
  refs.forEach((x) => { if (!v.images.some((y) => y.name === x.name)) v.images.push({ name: x.name, role: 'ai', kind: x.kind === 'site' ? 'site' : 'shot', title: x.title || '', label: [x.label, x.cat].filter(Boolean).join(', '), href: x.href || '', w: x.w, h: x.h }); });
  // Finished graphics drawn from the brand kit and the real shots: hero, wall, covers, share image, icons.
  const notes = [];
  if (!v.kit_done) {
    if (Date.now() > ctx.deadline - 80000) return { pending: true, patch: { visuals: v }, note: 'Drawing the graphics next' };
    try {
      const pick = shots.slice(0, 24).map((x) => x.name);
      const got = pick.length ? await rpc(ctx.jwt, 'gai_assets_get', { p_names: pick }) : [];
      const by = new Map(got.map((x) => [x.name, Buffer.from(x.data, 'base64')]));
      const bufs = pick.map((n) => by.get(n)).filter(Boolean);
      const kit = await gfx().kit({ brand: f.brand || {}, offer: f.offer || {}, shots: bufs });
      const tag = Date.now().toString(36).slice(-4);
      for (const x of kit) {
        const ext = x.mime === 'image/jpeg' ? 'jpg' : x.mime.split('/')[1];
        const name = `gfx-${f.id.slice(0, 8)}-${x.slot}-${tag}.${ext}`;
        await rpc(ctx.jwt, 'gai_asset_put', { p_name: name, p_mime: x.mime, p_role: 'ai', p_label: clip(x.label, 120), p_data: x.buf.toString('base64') });
        v.images = v.images.filter((y) => y.slot !== x.slot);
        v.images.push({ name, role: 'ai', kind: x.kind, slot: x.slot, item: x.item, label: x.label, w: x.w, h: x.h, auto: ['og', 'icon', 'favicon'].includes(x.kind) || undefined });
      }
      notes.push(`${kit.length} graphics drawn`);
    } catch (e) { notes.push('Some graphics could not be drawn (' + clip(e.message, 100) + '), the page uses the real images instead'); }
    v.kit_done = true;
  }
  // AI art only fills in when there is nothing real to show.
  const want = q.ai_images === false || shots.length >= 3 ? [] : ['hero', 'feature', 'detail'];
  if (want.length && ctx.K.openrouter) {
    const todo = want.filter((slot) => !v.images.some((x) => x.slot === slot) && !(v.failed || []).includes(slot));
    const prompts = ((f.brand || {}).prompts) || {};
    const art = (f.brand || {}).art_direction || '';
    await Promise.all(todo.map(async (slot) => {
      if (Date.now() > ctx.deadline - 160000) return;
      try {
        const r = await orImage(ctx.K.openrouter, `${prompts[slot] || 'An image for the ' + slot + ' of a premium funnel page'}. Art direction: ${art}. No text, letters, logos, UI or faces.`, RATIO[slot]);
        const name = `fos-${f.id.slice(0, 8)}-${slot}-${Date.now().toString(36).slice(-4)}.${r.mime === 'image/jpeg' ? 'jpg' : r.mime.split('/')[1]}`;
        await rpc(ctx.jwt, 'gai_asset_put', { p_name: name, p_mime: r.mime, p_role: 'ai', p_label: slot + ' image', p_data: r.b64 });
        v.images.push({ name, role: 'ai', slot, label: slot + ' image' });
      } catch (e) { v.failed = [...(v.failed || []), slot]; notes.push(slot + ': ' + clip(e.message, 100)); }
    }));
    if (want.some((slot) => !v.images.some((x) => x.slot === slot) && !(v.failed || []).includes(slot))) return { pending: true, patch: { visuals: v }, note: 'Still drawing images' };
  } else if (want.length) notes.push('AI images are off until the owner connects OpenRouter. Pages use your images plus drawn SVG art.');
  const n = v.images.length;
  return { patch: { visuals: v }, note: `${own.length} of your images, ${shots.length} real product images, ${v.images.filter((x) => x.slot && !x.kind).length} AI images. ${notes.join('. ')}${notes.length ? '.' : ''}`.trim(), count: n };
}

/* ---------- build ---------- */
const KIT_DOC = `MOTION KIT. Load it once per page with <script src="{{kit}}" defer></script> right before </body>. It adds the behavior; you only add attributes:
- data-reveal="up|left|right|scale|blur|mask|fade" animates an element in on scroll.
- data-stagger="80" on a parent reveals its children one after another.
- data-split on the hero h1 makes its words rise in. Use it on at most two headlines.
- data-count="1200" with optional data-prefix and data-suffix counts a real number up when seen. Write the final number as the element text too.
- data-parallax="0.08" on an image wrapper for gentle depth. At most two per page.
- data-marquee on a row of words or logos scrolls it slowly. Give it a gap.
- data-draw on an inline SVG draws its lines in. data-bar or data-bar-x on chart bars grows them in.
- data-sticky-steps on a container whose children have data-step highlights the step in view.
- data-tilt on cards adds a slight tilt on desktop hover.
- data-progress on the html element shows a reading progress bar in var(--accent).
- data-nav-shrink on the header adds the class is-scrolled after scrolling; style header.is-scrolled yourself.
- data-accordion on a FAQ wrapper of <details> elements keeps one open at a time.
Do not write scroll listeners or IntersectionObserver code yourself, and never hide content with CSS outside these attributes. Content must be readable if the script never loads.`;
const TASTE = `Design standard (a page that fails one of these is not done):
- Show the real thing. When real product screenshots or finished graphics are given, they carry the page: the hero graphic in the first screen, the wall as a full-bleed band, a different real screenshot in each section that talks about the product, covers next to their stack items. Never draw grey bars, empty boxes, skeleton cards or wireframe thumbnails to stand in for a product when real images exist. A gallery of real screenshots with their real names beats any illustration.
- The first screen says what is sold, who it is for and one hard fact (a count, a price, a timeframe), with one primary button whose label is a verb plus an object, like "Get the templates".
- Typography: display headlines with letter-spacing no tighter than -0.04em, body text 16 to 18px with line-height 1.5 to 1.7 and a measure of 60 to 75 characters. A clear scale with few sizes.
- Structure changes from section to section. Repeating identical cards of icon, heading and two lines is not a layout; use it at most once. Mix a large media split, a dense list, a gallery, a comparison, a quote, a stat line.
- Do not use: small uppercase eyebrow labels above every heading, gradient text, section numbers like 01 and 02 as decoration, frosted glass panels, colored side borders thicker than 1px, hard offset shadows, emoji icons, generic stock-photo looks, centered text everywhere.
- Cards and frames: radius 12 to 16px, 1px borders in the line color or soft long shadows, never both heavy. Images keep their aspect ratio and never stretch.
- One authored motion moment (for example the hero graphic easing in or the wall drifting); everything else reveals quietly or not at all. No bounce.
- Color: the background, near-black ink, one accent used for buttons and key words only, the deep color for one or two dark bands. Text contrast passes AA everywhere, including on images. Style ::selection and :focus-visible in the brand colors.
- Price, what is included, the guarantee and the button are easy to find twice on the page: once in the middle, once at the end.`;
const DESIGNER = `You are a world-class conversion designer and front-end engineer. You hand-build funnel pages as single self-contained HTML files that look like a premium studio made them for this exact brand: a clear typographic system, generous rhythm, strong hierarchy, real art direction, and layouts that change from section to section. They must convert: one offer, one action per page, the price and guarantee easy to find, objections answered.
Technical rules:
- One file per page with inline <style> and no other CSS files. The only external resources allowed are Google Fonts for the two brand fonts (unless custom font files are given) and the motion kit script at {{kit}}.
- Define the brand palette as CSS custom properties on :root (--bg, --surface, --ink, --muted, --line, --accent, --accent-ink, --deep, --deep-ink) and use them.
- Images: only the placeholders given, written exactly like {{asset:file-name.webp}} in src attributes or CSS url(). Give every img width, height, alt and loading="lazy" except the hero image.
- Links to other pages of this funnel: href="{{page:path}}". Buy and book buttons: href="{{checkout}}". Same-page anchors are fine.
- Icons: inline SVG in a consistent line style (24 viewBox, stroke 1.75, round caps). Charts and diagrams: inline SVG, using only real numbers from the facts, or clearly illustrative shapes without numbers.
- Forms (opt-in, application, order, booking): build the real visual form with labels, wrap it in <form data-fos-form action="#">, and add <p data-fos-note hidden></p> inside. Checkout, calendars and videos are slots the owner connects later: design them as polished placeholders (for video a 16:9 poster frame with a play button and data-fos-video; for calendars a calm card with data-fos-calendar) and never write "placeholder" or "coming soon" in visible text. The only bracketed fill-in text allowed is what the PROOF or THEY WILL ADD THESE LATER instructions ask for, marked with data-fos-placeholder.
- Mobile first and flawless from 360px to 1600px. Semantic HTML, one h1, visible focus states, contrast that passes WCAG AA, prefers-reduced-motion respected.
- Light, natural motion only through the motion kit. Nothing floaty.
- Keep every fact, price, name and number exactly as given. Tighten copy if needed, never invent proof, numbers or logos.
- Never use em dashes, exclamation points or emojis in visible text.
- Return only the HTML file, starting with <!doctype html> and ending with </html>. No commentary, no code fences.
${TASTE}`;

// The library reference for an option, picked at the wireframe step (or now, for funnels planned before the library).
function refOf(f, opt) {
  if (startOf(f) === 'scratch') return null;
  const refs = ((f.wireframe || {}).refs || []); const r = refs.find((x) => x.n === opt); if (r) return r;
  const o = ((f.wireframe || {}).options || [])[opt - 1] || DIRECTIONS[opt - 1] || {};
  const t = LIBR.pick(f, o.id || 'template', refs.map((x) => x.id)); return t ? { n: opt, ...LIBR.card(t) } : null;
}
async function tplRef(t, path) {
  if (!t) return '';
  const url = t.live.replace(/\/$/, '') + '/' + (path === 'index' ? '' : path);
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
    let html = await (await fetch(url, { signal: ctl.signal })).text();
    const css = [];
    for (const m of (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || []).slice(0, 3)) {
      const h = (m.match(/href=["']([^"']+)["']/) || [])[1];
      if (!h || /^https?:/.test(h) || /fonts\.css/.test(h)) continue;
      try { css.push(await (await fetch(new URL(h, url).href, { signal: ctl.signal })).text()); } catch { /* the HTML alone still helps */ }
    }
    clearTimeout(tm);
    html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g, 'data:...').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\n\s*\n/g, '\n');
    const c = css.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');
    return `TEMPLATE REFERENCE "${t.name}" (${url}). Use it for the layout system, section patterns, spacing, components and the level of polish. Replace every word, name, image, number and color with this brand's. Template text like [Your City] must never appear.\nHTML:\n${html.slice(0, 26000)}\nCSS:\n${c.slice(0, 20000)}`;
  } catch { return `TEMPLATE: ${t.name}, ${url}. It could not be loaded right now; design in its spirit.`; }
}

function imgList(f) {
  return ((f.visuals || {}).images || []).filter((x) => !x.auto).map((x) => {
    let kind;
    if (x.own) kind = x.role === 'logo' ? 'their logo' : x.role === 'me' ? 'real photo of the owner, never crop the face' : x.role === 'product' ? 'their product photo' : 'their image';
    else if (x.kind === 'shot') kind = `real screenshot of "${x.title}"${x.label ? ' (' + x.label + ')' : ''}, ${x.w}x${x.h}, top of the page. Show it in a simple frame with object-fit: cover and object-position: top`;
    else if (x.kind === 'site') kind = 'image from their own website';
    else if (x.kind === 'hero') kind = `finished hero graphic, ${x.w}x${x.h}, transparent background with its own windows and shadows. Place it large in the first screen with no extra frame, border or shadow`;
    else if (x.kind === 'wall') kind = `finished full-bleed wall of many real products, ${x.w}x${x.h}, on the deep brand color. Use it as a wide band (object-fit: cover) to show the size of the collection`;
    else if (x.kind === 'cover') kind = `finished product cover for "${x.item}", ${x.w}x${x.h} square, transparent background. Show it next to that item in the value stack or bonus section, no extra frame`;
    else kind = 'AI image for the ' + x.slot;
    return { placeholder: `{{asset:${x.name}}}`, kind, note: x.own ? x.label || undefined : undefined, link: x.href || undefined };
  });
}
function pageSpec(f, opt, page) {
  const o = ((f.wireframe || {}).options || [])[opt - 1] || dirsFor(f)[opt - 1] || DIRECTIONS[opt - 1];
  const cp = ((f.copy || {}).pages || []).find((p) => p.path === page.path) || {};
  const wf = ((f.wireframe || {}).pages || []).find((p) => p.path === page.path) || {};
  return `THIS PAGE: ${page.name} (path ${page.path}).\nDESIGN OPTION ${opt}: ${o.name}. ${o.idea}\nWIREFRAME FOR THIS PAGE:\n${JSON.stringify(wf).slice(0, 5000)}\nCOPY FOR THIS PAGE (every section must appear):\n${JSON.stringify(cp).slice(0, 24000)}`;
}
function kitBrief(f) {
  return `Funnel pages you can link to: ${pagesOf(f).map((p) => `${p.name} = {{page:${p.path}}}`).join(', ')}.\nBRAND KIT:\n${JSON.stringify(f.brand || {}).slice(0, 4000)}\nFINAL OFFER:\n${JSON.stringify(f.offer || {}).slice(0, 5000)}\nIMAGES:\n${JSON.stringify(imgList(f))}\nUse their logo in the header if there is one, otherwise a typographic wordmark of "${(f.brand || {}).logo_text || f.title}". With no image for a section, draw the art with CSS and inline SVG.\n${fontFaces(f)}\n${KIT_DOC}`;
}
function fontFaces(f) {
  const fo = (f.brand || {}).fonts || {}; const files = fo.files || {}; const out = [];
  const fmt = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
  for (const k of ['display', 'body']) { const n = files[k]; if (!n) continue; const ext = n.split('.').pop(); out.push(`@font-face { font-family: "${String(fo[k]).replace(/["\\]/g, '')}"; src: url({{asset:${n}}}) format("${fmt[ext] || 'woff2'}"); font-display: swap; }`); }
  return out.length ? `CUSTOM FONTS: they uploaded their own fonts. Put these rules first in the <style> and do not load these families from Google Fonts:\n${[...new Set(out)].join('\n')}\n` : '';
}
const pageBrief = (f, opt, page) => `${brief(f, true)}\n\n${pageSpec(f, opt, page)}\n\n${kitBrief(f)}`;

// Fixes we can make in code, every time, before anything is saved.
function tidy(html) {
  let h = String(html || '');
  const a = h.search(/<!doctype html>/i); const z = h.toLowerCase().lastIndexOf('</html>');
  if (a === -1 || z === -1) throw bad('The page came back incomplete. It is rebuilt on the next run.', 502);
  h = h.slice(a, z + 7);
  h = h.replace(/\s*\u2014\s*/g, ', ').replace(/&mdash;/g, ', ');
  h = h.replace(/<script[^>]+src=["'](?!\{\{kit\}\})[^"']*["'][^>]*>\s*<\/script>/gi, '');
  if (!/<meta[^>]+name=["']viewport/i.test(h)) h = h.replace(/<head([^>]*)>/i, '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (!/<html[^>]+lang=/i.test(h)) h = h.replace(/<html/i, '<html lang="en"');
  if (!/\{\{kit\}\}/.test(h)) h = h.replace(/<\/body>/i, '<script src="{{kit}}" defer></script>\n</body>');
  h = h.replace(/<img(?![^>]*\balt=)([^>]*)>/gi, '<img alt=""$1>');
  if (h.length < 3000) throw bad('The page came back too short. It is rebuilt on the next run.', 502);
  return h;
}

async function stepBuild(ctx) {
  const f = ctx.f; const n = Math.max(1, Math.min(MAX_OPTS, +(f.quiz || {}).options || 1)); const pages = pagesOf(f);
  const t = tplById((f.quiz || {}).template);
  const done = ctx.work.built = ctx.work.built || {};
  const jobs = [];
  for (let opt = 1; opt <= n; opt++) {
    const have = done[opt] || [];
    if (!have.includes('index')) jobs.push({ opt, kind: 'index', pages: [pages.find((p) => p.path === 'index') || pages[0]] });
    else { const rest = pages.filter((p) => !have.includes(p.path)); if (rest.length) jobs.push({ opt, kind: 'rest', pages: rest }); }
  }
  if (!jobs.length) return { note: `${n} option${n > 1 ? 's' : ''}, ${pages.length} page${pages.length > 1 ? 's' : ''} each` };
  const notes = [];
  await Promise.all(jobs.map(async (j) => {
    const key = `build-${j.opt}-${j.kind}`;
    let user;
    if (j.kind === 'index') {
      const ref = refOf(f, j.opt); const fresh = !(ctx.work.drafts || {})[key];
      const full = j.opt === 1 ? (t || (ref && tplById(ref.id))) : null;
      const tref = !fresh ? '' : full ? await tplRef(full, j.pages[0].path) : LIBR.brief(ref, j.pages[0].path, j.opt);
      user = `${pageBrief(f, j.opt, j.pages[0])}\n\n${tref}\n\nBuild this page now.`;
    } else {
      const main = await rpc(ctx.jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: j.opt });
      const idx = (main.find((x) => x.path === 'index') || {}).content || '';
      const style = (idx.match(/<style[\s\S]*?<\/style>/i) || [''])[0].slice(0, 22000);
      const header = (idx.match(/<header[\s\S]*?<\/header>/i) || [''])[0].slice(0, 5000);
      const footer = (idx.match(/<footer[\s\S]*?<\/footer>/i) || [''])[0].slice(0, 4000);
      const ref = refOf(f, j.opt); const refs = (ctx.work.drafts || {})[key] ? '' : j.pages.map((p) => LIBR.brief(ref, p.path, j.opt)).filter(Boolean).join('\n\n');
      user = `${brief(f, true)}\n\n${j.pages.map((p) => pageSpec(f, j.opt, p)).join('\n\n')}\n\n${kitBrief(f)}\n\n${refs ? refs + '\n\n' : ''}THE MAIN PAGE IS BUILT. Reuse its exact design system, header and footer so every page feels like one funnel:\n${style}\n${header}\n${footer}\n\nBuild each of these pages now: ${j.pages.map((p) => p.path).join(', ')}. Output every page as a complete HTML file, one after the other. Put the line <!-- FILE: path --> right before each file's <!doctype html>.`;
    }
    const r = await gen(ctx, key, DESIGNER, user, { max: j.kind === 'index' ? 30000 : 26000, model: BUILDER });
    if (r.pending) { notes.push(`option ${j.opt} ${j.kind === 'index' ? 'main page' : 'other pages'} ${r.kb ? r.kb + ' KB' : 'started'}`); return; }
    if (j.kind === 'index') {
      await rpc(ctx.jwt, 'gai_funnel_file_put', { p_id: f.id, p_opt: j.opt, p_path: j.pages[0].path, p_content: tidy(r.text) });
      done[j.opt] = [...(done[j.opt] || []), j.pages[0].path];
    } else {
      const parts = r.text.split(/<!--\s*FILE:\s*([a-z0-9-]+)\s*-->/i);
      const got = [];
      for (let i = 1; i < parts.length; i += 2) {
        const path = parts[i].toLowerCase(); if (!j.pages.some((p) => p.path === path)) continue;
        try { await rpc(ctx.jwt, 'gai_funnel_file_put', { p_id: f.id, p_opt: j.opt, p_path: path, p_content: tidy(parts[i + 1]) }); got.push(path); } catch { /* rebuilt below */ }
      }
      if (!got.length && j.pages.length === 1) { try { await rpc(ctx.jwt, 'gai_funnel_file_put', { p_id: f.id, p_opt: j.opt, p_path: j.pages[0].path, p_content: tidy(r.text) }); got.push(j.pages[0].path); } catch { /* rebuilt below */ } }
      // Anything missing gets its own pass next time, so a page is never silently dropped.
      done[j.opt] = [...(done[j.opt] || []), ...got];
      ctx.work.rest_tries = (ctx.work.rest_tries || 0) + 1;
      if (ctx.work.rest_tries > 6) for (const p of j.pages) if (!done[j.opt].includes(p.path)) done[j.opt].push(p.path + ':skipped');
    }
  }));
  const left = jobs.length && (() => { for (let opt = 1; opt <= n; opt++) { const h = (done[opt] || []).map((x) => x.split(':')[0]); if (pages.some((p) => !h.includes(p.path))) return true; } return false; })();
  if (left) return { pending: true, note: `Building ${notes.length ? '(' + notes.join(', ') + ')' : 'the next pages'}` };
  const skipped = Object.values(done).flat().filter((x) => /:skipped$/.test(x)).length;
  return { note: `${n} option${n > 1 ? 's' : ''} built, ${pages.length} page${pages.length > 1 ? 's' : ''} each${skipped ? `. ${skipped} page${skipped > 1 ? 's' : ''} could not be built; ask for changes to add them` : ''}` };
}

/* ---------- files: placeholders resolved for where they are going ---------- */
function resolve(html, { pageHref, assetHref, kitHref, checkout }) {
  return String(html)
    .replace(/\{\{asset:([a-z0-9._-]+)\}\}/gi, (m, n) => assetHref(n))
    .replace(/\{\{page:([a-z0-9-]+)\}\}/gi, (m, p) => pageHref(p))
    .replace(/\{\{kit\}\}/g, kitHref)
    .replace(/\{\{checkout\}\}/g, checkout || '#offer');
}
async function filesFor(ctx, opts, final) {
  const f = ctx.f; const all = await rpc(ctx.jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: null });
  const used = new Set(); all.forEach((x) => (x.content.match(/\{\{asset:([a-z0-9._-]+)\}\}/gi) || []).forEach((m) => used.add(m.slice(8, -2))));
  ((f.visuals || {}).images || []).filter((x) => x.auto).forEach((x) => used.add(x.name));
  const assets = used.size ? await rpc(ctx.jwt, 'gai_assets_get', { p_names: [...used] }) : [];
  const out = [];
  const checkout = (f.quiz || {}).checkout_url || '';
  for (const x of all.filter((y) => opts.includes(y.opt))) {
    const base = final ? '' : `/o${x.opt}`;
    const html = launchMeta(resolve(x.content, { pageHref: (p) => (p === 'index' ? base + '/' : `${base}/${p}`), assetHref: (n) => '/assets/' + n, kitHref: '/fos-motion.js', checkout }), f, x.path === 'index' ? (final ? '/' : base + '/') : `${base}/${x.path}`);
    out.push({ path: (final ? '' : `o${x.opt}/`) + `${x.path}.html`, content: Buffer.from(html, 'utf8') });
  }
  for (const a of assets) out.push({ path: 'assets/' + a.name, content: Buffer.from(a.data, 'base64') });
  out.push({ path: 'fos-motion.js', content: Buffer.from(MOTION, 'utf8') });
  out.push({ path: 'vercel.json', content: Buffer.from(JSON.stringify({ cleanUrls: true, headers: [{ source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }] }), 'utf8') });
  if (!final) {
    const os = ((f.wireframe || {}).options || []);
    out.push({ path: 'index.html', content: Buffer.from(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc((f.brand || {}).name || f.title)} previews</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:48px 20px;background:#f6f5f1;color:#16140f}main{max-width:640px;margin:auto}a{display:block;padding:18px 20px;margin:10px 0;background:#fff;border:1px solid #e5e0d6;border-radius:12px;color:inherit;text-decoration:none}a:hover{border-color:#16140f}small{color:#5d5a52}</style></head><body><main><h1>${esc((f.brand || {}).name || f.title)}</h1><p>Preview options</p>${opts.map((o) => `<a href="/o${o}/">Option ${o}: ${esc((os[o - 1] || {}).name || '')}<br><small>${esc(clip((os[o - 1] || {}).idea, 160) || '')}</small></a>`).join('')}</main></body></html>`, 'utf8') });
  }
  return out;
}
// Share image, favicons and social tags on every page, so links look finished when they are posted.
function siteUrl(f) {
  const d = f.deploy || {}; if (d.url) return d.url.replace(/\/$/, '');
  return 'https://' + ('fos-' + slug((f.brand || {}).name || f.title).slice(0, 30) + '-' + f.id.slice(0, 6)) + '.vercel.app';
}
function launchMeta(html, f, path) {
  const imgs = (f.visuals || {}).images || []; const by = (k) => imgs.find((x) => x.kind === k);
  const og = by('og'); const ic = by('favicon'); const ap = by('icon'); const P = ((f.brand || {}).palette) || {};
  const root = siteUrl(f); const tags = [];
  const has = (re) => re.test(html);
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || (f.brand || {}).name || f.title;
  const desc = ((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]) || (f.offer || {}).one_liner || '';
  if (ic && !has(/rel=["'](icon|shortcut icon)["']/i)) tags.push(`<link rel="icon" type="image/png" href="/assets/${ic.name}">`);
  if (ap && !has(/apple-touch-icon/i)) tags.push(`<link rel="apple-touch-icon" href="/assets/${ap.name}">`);
  if (P.bg && !has(/name=["']theme-color/i)) tags.push(`<meta name="theme-color" content="${P.bg}">`);
  if (!has(/property=["']og:title/i)) tags.push(`<meta property="og:title" content="${esc(title)}">`);
  if (desc && !has(/property=["']og:description/i)) tags.push(`<meta property="og:description" content="${esc(desc)}">`);
  if (!has(/property=["']og:type/i)) tags.push('<meta property="og:type" content="website">');
  if (!has(/property=["']og:url/i)) tags.push(`<meta property="og:url" content="${root}${path}">`);
  if (og && !has(/property=["']og:image/i)) tags.push(`<meta property="og:image" content="${root}/assets/${og.name}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', `<meta name="twitter:image" content="${root}/assets/${og.name}">`);
  if (!has(/name=["']twitter:card/i)) tags.push(`<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">`);
  return tags.length ? html.replace(/<\/head>/i, tags.join('\n') + '\n</head>') : html;
}
function launchCheck(f, files) {
  const all = files.map((x) => x.content).join('\n'); const q = f.quiz || {}; const imgs = (f.visuals || {}).images || [];
  const buys = (all.match(/\{\{checkout\}\}/g) || []).length; const forms = (all.match(/data-fos-form/g) || []).length;
  const ph = (all.match(/data-fos-placeholder/g) || []).length; const vids = (all.match(/data-fos-video/g) || []).length; const cal = (all.match(/data-fos-calendar/g) || []).length;
  const d = f.deploy || {}; const live = d.stage === 'live';
  const items = [];
  if (buys) items.push(q.checkout_url ? { id: 'checkout', ok: true, label: `${buys} buy button${buys > 1 ? 's' : ''} go to your checkout`, detail: q.checkout_url, fix: { kind: 'checkout', label: 'Change the link' } } : { id: 'checkout', ok: false, label: `${buys} buy button${buys > 1 ? 's' : ''} have no checkout link yet`, detail: 'Paste the link to your checkout page. Every button updates when you save it.', fix: { kind: 'checkout', label: 'Add the checkout link' } });
  items.push(imgs.some((x) => x.kind === 'og') ? { id: 'share', ok: true, label: 'Share image, favicon and social tags are in place' } : { id: 'share', ok: false, label: 'No share image yet', detail: 'Build it again so Funnel OS draws the share image and favicon.', fix: { kind: 'rebuild', label: 'Build it again' } });
  const shots = imgs.filter((x) => x.kind === 'shot').length;
  if (shots) items.push({ id: 'images', ok: true, label: `${shots} real product images from your link` });
  if (ph) items.push({ id: 'placeholders', ok: false, label: `${ph} marked placeholder${ph > 1 ? 's' : ''} to fill in`, detail: 'These are the pieces you said you would add later, like testimonials. Send them in Ask for changes and they are swapped in.', fix: { kind: 'revise', label: 'Ask for changes' } });
  if (forms) items.push({ id: 'forms', ok: false, label: `${forms} form${forms > 1 ? 's' : ''} to connect`, detail: 'Set each form to send to your email or CRM tool. In the downloaded files, search for data-fos-form and set the action to the form link from your tool.', fix: { kind: 'zip', label: 'Download the files' } });
  if (vids) items.push({ id: 'video', ok: false, label: `${vids} video frame${vids > 1 ? 's' : ''} to fill`, detail: 'Send the video link in Ask for changes and it is embedded.', fix: { kind: 'revise', label: 'Ask for changes' } });
  if (cal) items.push({ id: 'calendar', ok: false, label: 'Booking calendar to connect', detail: 'Send your booking link in Ask for changes and it is embedded.', fix: { kind: 'revise', label: 'Ask for changes' } });
  items.push(live ? { id: 'live', ok: true, label: 'Published', detail: d.url } : { id: 'live', ok: false, label: 'Not published yet', detail: 'Approve the option you want and it goes live on its own link.', fix: { kind: 'approve', label: 'Approve and publish' } });
  if (live && /\.vercel\.app$/.test(String(d.url || ''))) items.push({ id: 'domain', ok: null, label: 'Optional: your own domain', detail: `It runs on ${String(d.url).replace('https://', '')}. Add your domain in Vercel, project ${d.project}, Settings, Domains.`, fix: { kind: 'link', label: 'Open Vercel', href: 'https://vercel.com/dashboard' } });
  return { items, ready: items.every((x) => x.ok !== false) };
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Vercel and GitHub ---------- */
async function deployVercel(V, name, files, prev) {
  const token = V.token; const tq = V.team ? '?teamId=' + encodeURIComponent(V.team) : '';
  const H = { Authorization: 'Bearer ' + token };
  const list = [];
  for (const fl of files) {
    const sha = crypto.createHash('sha1').update(fl.content).digest('hex');
    await jf('Vercel', VERCEL() + '/v2/files' + tq, { method: 'POST', timeout: 60000, headers: { ...H, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha, 'Content-Length': String(fl.content.length) }, body: fl.content });
    list.push({ file: fl.path, sha, size: fl.content.length });
  }
  const d = await jf('Vercel', VERCEL() + '/v13/deployments' + tq + (tq ? '&' : '?') + 'skipAutoDetectionConfirmation=1', { method: 'POST', timeout: 60000, headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, files: list, target: 'production', projectSettings: { framework: null, buildCommand: null, outputDirectory: null, installCommand: null } }) });
  let st = d; for (let i = 0; i < 30 && !/READY|ERROR|CANCELED/.test(st.readyState || ''); i++) { await sleep(2000); st = await jf('Vercel', `${VERCEL()}/v13/deployments/${d.id}${tq}`, { headers: H }).catch(() => st); }
  if (st.readyState === 'ERROR') throw bad('Vercel could not publish the pages: ' + clip(st.errorMessage || 'build error', 160), 502);
  const pid = st.projectId || d.projectId;
  if (!prev || !prev.unprotected) { try { await jf('Vercel', `${VERCEL()}/v9/projects/${pid}${tq}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ ssoProtection: null }) }); } catch { /* the deployment URL still works */ } }
  let host = null;
  try { const dm = await jf('Vercel', `${VERCEL()}/v9/projects/${pid}/domains${tq}`, { headers: H }); const ds = (dm.domains || []).map((x) => x.name); host = ds.find((x) => !/\.vercel\.app$/.test(x)) || ds.find((x) => x === name + '.vercel.app') || ds[0] || null; } catch { /* fall back below */ }
  host = host || (st.alias && st.alias[0]) || st.url || d.url;
  return { project: name, project_id: pid, id: d.id, url: 'https://' + host, deployment_url: 'https://' + (st.url || d.url), unprotected: true, at: now() };
}
const ghH = (t) => ({ Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'FunnelOS' });
async function pushGitHub(token, f, files, prev) {
  let repo = prev && prev.full_name ? await jf('GitHub', GH() + '/repos/' + prev.full_name, { headers: ghH(token) }).catch(() => null) : null;
  if (!repo) {
    const base = 'funnel-' + slug((f.brand || {}).name || f.title);
    for (const name of [base, base + '-' + f.id.slice(0, 6)]) {
      try { repo = await jf('GitHub', GH() + '/user/repos', { method: 'POST', headers: ghH(token), body: JSON.stringify({ name, private: true, auto_init: true, description: `${(f.brand || {}).name || f.title}: ${(TYPES[f.funnel_type] || {}).name || 'funnel'}` }) }); break; }
      catch (e) { if (e.status !== 422) throw e; }
    }
    if (!repo) throw bad('GitHub would not create the repository. Check that the GitHub token can create repositories.', 502, ADMIN_FIX('Check the GitHub token'));
  }
  const full = repo.full_name; const branch = repo.default_branch || 'main';
  let ref = null; for (let i = 0; i < 6 && !ref; i++) { ref = await jf('GitHub', `${GH()}/repos/${full}/git/ref/heads/${branch}`, { headers: ghH(token) }).catch(() => null); if (!ref) await sleep(1500); }
  if (!ref) throw bad('The GitHub repository was not ready yet. Press Try again in a minute.', 502);
  const parent = await jf('GitHub', `${GH()}/repos/${full}/git/commits/${ref.object.sha}`, { headers: ghH(token) });
  const tree = [];
  for (const fl of files) { const bl = await jf('GitHub', `${GH()}/repos/${full}/git/blobs`, { method: 'POST', timeout: 60000, headers: ghH(token), body: JSON.stringify({ content: fl.content.toString('base64'), encoding: 'base64' }) }); tree.push({ path: fl.path, mode: '100644', type: 'blob', sha: bl.sha }); }
  const t = await jf('GitHub', `${GH()}/repos/${full}/git/trees`, { method: 'POST', headers: ghH(token), body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const c = await jf('GitHub', `${GH()}/repos/${full}/git/commits`, { method: 'POST', headers: ghH(token), body: JSON.stringify({ message: `Approved funnel: ${(f.brand || {}).name || f.title}`, tree: t.sha, parents: [parent.sha] }) });
  await jf('GitHub', `${GH()}/repos/${full}/git/refs/heads/${branch}`, { method: 'PATCH', headers: ghH(token), body: JSON.stringify({ sha: c.sha, force: false }) });
  return { full_name: full, url: repo.html_url, branch, commit: c.sha, at: now() };
}
function readme(f, live) {
  return `# ${(f.brand || {}).name || f.title}\n\n${(TYPES[f.funnel_type] || {}).name || 'Funnel'} built with Funnel OS.\n\n- Live: ${live || 'not published yet'}\n\n## Files\n\n${pagesOf(f).map((p) => `- \`${p.path}.html\` ${p.name}`).join('\n')}\n- \`assets/\` images\n- \`fos-motion.js\` scroll and reveal animations, no dependencies\n\n## Still to connect\n\n- Forms: each \`<form data-fos-form>\` needs its action set to your form tool.\n- Checkout and booking buttons point to ${(f.quiz || {}).checkout_url || '#offer'}. Change them to your checkout or calendar link.\n- Videos: replace each \`data-fos-video\` frame with your video embed.\n- Placeholders you asked for: search the files for \`data-fos-placeholder\` and swap in the real testimonials, logos or other pieces.\n`;
}

/* ---------- preview: one Vercel project per funnel, options at /o1, /o2, /o3 ---------- */
async function stepPreview(ctx) {
  const f = ctx.f; const n = Math.max(1, Math.min(MAX_OPTS, +(f.quiz || {}).options || 1));
  const opts = Array.from({ length: n }, (_, i) => i + 1);
  const after = ctx.work.after_preview || 'qa';
  const os = opts.map((o) => ({ ...(((f.options || [])[o - 1]) || {}), n: o, name: (((f.wireframe || {}).options || [])[o - 1] || {}).name || 'Option ' + o, pages: pagesOf(f).map((p) => p.path) }));
  if (!ctx.K.vercel || !ctx.K.vercel.token) {
    return { patch: { options: os.map((o) => ({ ...o, url: null })) }, next: after, note: 'Previews are ready inside Funnel OS. Shareable live links start once the owner connects Vercel.' };
  }
  const files = await filesFor(ctx, opts, false);
  const name = (f.deploy && f.deploy.project) || ('fos-' + slug((f.brand || {}).name || f.title).slice(0, 30) + '-' + f.id.slice(0, 6));
  const d = await deployVercel(ctx.K.vercel, name, files, f.deploy);
  return { patch: { deploy: { ...(f.deploy || {}), ...d, stage: 'preview' }, options: os.map((o) => ({ ...o, url: d.url + '/o' + o.n + '/', at: now() })) }, next: after, note: `Live previews on ${d.url.replace('https://', '')}` };
}

/* ---------- QA: checks in code, then the Decisions API reads the pages and looks at screenshots ---------- */
function staticQA(f, html, path) {
  const issues = []; const text = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const h1 = (html.match(/<h1[\s>]/gi) || []).length; if (h1 !== 1) issues.push(h1 ? `${h1} main headings, should be one` : 'no main heading');
  if (!/<title>[^<]{3,}/i.test(html)) issues.push('missing page title');
  if (!/name=["']description["']/i.test(html)) issues.push('missing meta description');
  const known = new Set([...((f.visuals || {}).images || []).map((x) => x.name), ...Object.values(((f.brand || {}).fonts || {}).files || {})]);
  (html.match(/\{\{asset:([a-z0-9._-]+)\}\}/gi) || []).forEach((m) => { const nm = m.slice(8, -2); if (!known.has(nm)) issues.push('image that does not exist: ' + nm); });
  const pg = new Set(pagesOf(f).map((p) => p.path));
  (html.match(/\{\{page:([a-z0-9-]+)\}\}/gi) || []).forEach((m) => { const p = m.slice(7, -2); if (!pg.has(p)) issues.push('link to a page that does not exist: ' + p); });
  if (/lorem ipsum|\[your [a-z ]+\]|\bTBD\b|\{\{(?!asset:|page:|kit\}\}|checkout\}\})/i.test(html)) issues.push('placeholder text left in');
  if (/!\s/.test(text.replace(/<!--|!important/g, ''))) issues.push('exclamation point in the copy');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) issues.push('emoji in the copy');
  if (path === 'index' && (html.match(/href=["']\{\{(checkout|page:[a-z0-9-]+)\}\}["']/gi) || []).length + (html.match(/<form/gi) || []).length < 2) issues.push('fewer than two calls to action');
  if (!/@media/i.test(html)) issues.push('no responsive styles');
  const imgs = (f.visuals || {}).images || [];
  const shots = imgs.filter((x) => x.kind === 'shot').map((x) => x.name);
  if (path === 'index' && shots.length >= 3) {
    const usedN = shots.filter((n) => html.includes('{{asset:' + n + '}}')).length; const need = Math.min(10, shots.length);
    if (usedN < need) issues.push(`shows only ${usedN} of the ${shots.length} real product screenshots; show at least ${need} (a gallery, the wall band and media splits) instead of drawn stand-ins`);
    const hero = imgs.find((x) => x.kind === 'hero'); if (hero && !html.includes('{{asset:' + hero.name + '}}')) issues.push('the finished hero graphic is not used in the first screen');
    const covers = imgs.filter((x) => x.kind === 'cover'); const cu = covers.filter((x) => html.includes('{{asset:' + x.name + '}}')).length;
    if (covers.length && cu < Math.ceil(covers.length / 2)) issues.push(`uses ${cu} of ${covers.length} product covers; put each cover next to its stack item or bonus`);
  }
  if (/background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/i.test(html)) issues.push('gradient text; use the solid accent color');
  if ((html.match(/class=["'][^"']*\b(skeleton|placeholder-bar|wire|ghost-line)\b/gi) || []).length > 2) issues.push('skeleton or wireframe boxes drawn instead of real images');
  return { words: text.split(' ').length, issues };
}
async function decide(key, state, questions) {
  return jf('Perplexity Decisions', PPLX() + '/v1/decisions', { method: 'POST', timeout: 70000, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'pplx-decider-latest', state, questions }) });
}
async function screenshot(url, w, h) {
  try {
    const j = await jf('Screenshot', `${SHOT()}/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&viewport.width=${w}&viewport.height=${h}&viewport.deviceScaleFactor=1&waitForTimeout=1800`, { timeout: 45000 });
    const u = j && j.data && j.data.screenshot && j.data.screenshot.url; if (!u) return null;
    const r = await fetch(u); if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 6_000_000) return null;
    return `data:${r.headers.get('content-type') || 'image/png'};base64,${buf.toString('base64')}`;
  } catch { return null; }
}
async function stepQA(ctx) {
  const f = ctx.f; const only = ctx.work.only; const opts = (f.options || []).map((o) => o.n).filter((n) => !only || only.includes(n));
  const files = await rpc(ctx.jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: null });
  const pm = proofMode(f.quiz || {});
  const facts = { business: (f.quiz || {}).brand, offer: (f.offer || {}), real_proof: pm === 'none' ? 'none' : (f.quiz || {}).proof || 'none', found_about_them: (f.research || {}).about || {} };
  if (pm === 'placeholder' || ((f.quiz || {}).intent || {}).later?.length) facts.requested_placeholders = 'The owner asked for bracketed fill-in placeholders (for example [Client name], [Client quote: ...], [Add your logo]) that they replace later. These are allowed and are not invented proof or leftovers.';
  const options = (f.options || []).slice();
  const fixes = {};
  await Promise.all(opts.map(async (n) => {
    const mine = files.filter((x) => x.opt === n);
    const checks = []; const pageIssues = {};
    for (const x of mine) { const s = staticQA(f, x.content, x.path); if (s.issues.length) pageIssues[x.path] = s.issues; }
    Object.entries(pageIssues).forEach(([p, is]) => is.forEach((i) => checks.push({ ok: false, label: `${p}: ${i}`, by: 'code' })));
    if (!Object.keys(pageIssues).length) checks.push({ ok: true, label: 'Structure, links, images and house rules', by: 'code' });
    const marks = mine.reduce((a, x) => a + (x.content.match(/data-fos-placeholder/g) || []).length, 0);
    if (marks) checks.push({ ok: true, label: `${marks} marked placeholder${marks > 1 ? 's' : ''} to replace before launch, as you asked`, by: 'code' });
    const main = (mine.find((x) => x.path === 'index') || mine[0] || {}).content || '';
    const text = main.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 40000);
    let ai = null;
    try {
      ai = await decide(ctx.K.ai, { facts, page_text: text }, {
        invented: { type: 'noul', instructions: 'Does page_text contain testimonials, client names, statistics, results, logos or awards that are not supported by facts? Bracketed fill-in placeholders the owner requested do not count.' },
        leftovers: { type: 'noul', instructions: facts.requested_placeholders ? 'Does page_text contain template leftovers from another business, lorem ipsum, or fill-in text other than the bracketed placeholders the owner requested?' : 'Does page_text contain placeholder text, template leftovers from another business, or bracketed fill-in text?' },
        clarity: { type: 'score', instructions: 'How clear is it from the first lines of page_text what is offered, to whom, and what to do next?', criteria: ['Unclear', 'Somewhat clear', 'Clear', 'Very clear'] },
        tone: { type: 'noul', instructions: 'Does page_text use hype words, exclamation marks, or generic AI phrasing such as "unlock", "game-changer" or "it is not X, it is Y"?' },
      });
    } catch (e) { checks.push({ ok: null, label: 'AI copy review skipped: ' + clip(e.message, 120), by: 'decisions' }); }
    const A = (ai && ai.answers) || {};
    const flag = [];
    if (A.invented) { const bad1 = A.invented.noul > 0.6; checks.push({ ok: !bad1, label: bad1 ? 'Copy may include proof that was not given' : 'No invented proof found', p: A.invented.noul, by: 'decisions' }); if (bad1) flag.push('Remove any testimonial, client name, statistic, result or logo that is not in the facts.'); }
    if (A.leftovers) { const b2 = A.leftovers.noul > 0.6; checks.push({ ok: !b2, label: b2 ? 'Template or placeholder text left in' : 'No template leftovers', p: A.leftovers.noul, by: 'decisions' }); if (b2) flag.push('Replace any placeholder or template leftover text with real copy for this business.'); }
    if (A.clarity) { const c = A.clarity.score; checks.push({ ok: c >= 1.6, label: `First-screen clarity ${(c / 3 * 10).toFixed(1)} out of 10`, p: c, by: 'decisions' }); if (c < 1.3) flag.push('Make the hero say plainly what is offered, who it is for and what to do next.'); }
    if (A.tone) { const b3 = A.tone.noul > 0.7; checks.push({ ok: !b3, label: b3 ? 'Some hype or generic phrasing' : 'Plain, specific tone', p: A.tone.noul, by: 'decisions' }); if (b3) flag.push('Rewrite hype or generic phrases in plain, specific language.'); }
    // Screenshots of the live preview, desktop and phone, judged as images.
    const o = options.find((x) => x.n === n) || {};
    if (o.url) {
      const [desk, phone] = await Promise.all([screenshot(o.url, 1280, 800), screenshot(o.url, 390, 844)]);
      if (desk || phone) {
        try {
          const shots = [desk && 'Desktop first screen:', desk && { type: 'image_url', image_url: { url: desk } }, phone && 'Phone first screen:', phone && { type: 'image_url', image_url: { url: phone } }].filter(Boolean);
          const v = await decide(ctx.K.ai, shots, {
            broken: { type: 'noul', instructions: 'Is anything visibly broken: overlapping or cut-off text, text running off screen, unreadable contrast, missing or broken images, or large empty areas?' },
            look: { type: 'score', instructions: 'How professional and premium does this page look?', criteria: ['Broken or amateur', 'Plain', 'Good', 'Premium'] },
          });
          const B = v.answers || {};
          if (B.broken) { const bb = B.broken.noul > 0.6; checks.push({ ok: !bb, label: bb ? 'Screenshot shows a layout problem' : 'Desktop and phone render cleanly', p: B.broken.noul, by: 'screenshot' }); if (bb) flag.push('The first screen has a visible layout problem on desktop or phone (overlap, cut-off text, contrast or empty areas). Fix the hero layout and responsive styles.'); }
          if (B.look) checks.push({ ok: B.look.score >= 1.5, label: `Visual polish ${(B.look.score / 3 * 10).toFixed(1)} out of 10`, p: B.look.score, by: 'screenshot' });
        } catch (e) { checks.push({ ok: null, label: 'Screenshot review skipped: ' + clip(e.message, 120), by: 'screenshot' }); }
      } else checks.push({ ok: null, label: 'Screenshot review skipped: the screenshot service did not answer', by: 'screenshot' });
    }
    const codeFix = Object.entries(pageIssues).filter(([, is]) => is.some((i) => !/meta description|exclamation/.test(i)));
    if (flag.length || (codeFix.length && pageIssues.index)) fixes[n] = { flag, code: pageIssues.index || [] };
    const passed = checks.filter((c) => c.ok === true).length; const total = checks.filter((c) => c.ok !== null).length;
    const i = options.findIndex((x) => x.n === n); options[i] = { ...o, qa: { checks, passed, total, at: now() } };
  }));
  ctx.work.fixes = fixes;
  const need = Object.keys(fixes).length;
  return { patch: { options }, next: need && !ctx.work.fixed ? 'fix' : 'done', note: need && !ctx.work.fixed ? `${need} option${need > 1 ? 's need' : ' needs'} a fix pass` : 'All checks done' };
}
async function stepFix(ctx) {
  const f = ctx.f; const fixes = ctx.work.fixes || {};
  const jobs = Object.entries(fixes);
  const files = await rpc(ctx.jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: null });
  const pend = [];
  await Promise.all(jobs.map(async ([n, fx]) => {
    const cur = (files.find((x) => x.opt === +n && x.path === 'index') || {}).content; if (!cur) { delete fixes[n]; return; }
    const user = `${brief(f, true)}\nFACTS YOU MAY USE: ${JSON.stringify({ offer: f.offer, real_proof: proofMode(f.quiz || {}) === 'none' ? 'none' : (f.quiz || {}).proof || 'none' }).slice(0, 5000)}\nIMAGES: ${JSON.stringify(imgList(f))}\nPAGES: ${pagesOf(f).map((p) => `{{page:${p.path}}}`).join(', ')}\n\nTHE CURRENT PAGE:\n${cur.slice(0, 150000)}\n\nQUALITY CHECK FOUND:\n${[...fx.flag, ...fx.code].map((x) => '- ' + x).join('\n')}\n\nFix exactly these problems and keep everything else as it is. Return the full corrected HTML file.`;
    const r = await gen(ctx, 'fix-' + n, DESIGNER, user, { max: 30000, model: BUILDER });
    if (r.pending) { pend.push(n); return; }
    try { await rpc(ctx.jwt, 'gai_funnel_file_put', { p_id: f.id, p_opt: +n, p_path: 'index', p_content: tidy(r.text) }); } catch { /* keep the page as it was */ }
    delete fixes[n];
  }));
  if (pend.length) return { pending: true, note: 'Fixing option ' + pend.join(' and ') };
  ctx.work.fixed = true; ctx.work.after_preview = 'done';
  return { next: 'preview', note: `Fixed ${jobs.length} option${jobs.length > 1 ? 's' : ''}. Publishing the fixed previews.` };
}

/* ---------- changes after review ---------- */
async function stepRevise(ctx) {
  const f = ctx.f; const revs = (f.revisions || []).slice(); const r = revs.find((x) => x.state === 'queued');
  if (!r) return { next: 'preview' };
  const files = await rpc(ctx.jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: r.opt });
  const cur = (files.find((x) => x.path === r.page) || {}).content;
  const user = `${brief(f, true)}\nBRAND KIT: ${JSON.stringify(f.brand || {}).slice(0, 2500)}\nIMAGES: ${JSON.stringify(imgList(f))}\nPAGES: ${pagesOf(f).map((p) => `${p.name} = {{page:${p.path}}}`).join(', ')}\n\n${KIT_DOC}\n\n${cur ? `THE CURRENT PAGE (${r.page}):\n${cur.slice(0, 150000)}` : `This page (${r.page}) does not exist yet. Build it in the same design system as the rest of the funnel.`}\n\nTHE OWNER'S CHANGE REQUEST:\n${r.request}\n\nApply the request with care and keep everything else as it is. Return the full updated HTML file.`;
  const g = await gen(ctx, 'revise-' + r.id, DESIGNER, user, { max: 30000, model: BUILDER });
  if (g.pending) return { pending: true, note: `Making the change to option ${r.opt} (${g.kb || 0} KB so far)` };
  await rpc(ctx.jwt, 'gai_funnel_file_put', { p_id: f.id, p_opt: r.opt, p_path: r.page, p_content: tidy(g.text) });
  const i = revs.indexOf(r); revs[i] = { ...r, state: 'done', done_at: now() };
  const more = revs.some((x) => x.state === 'queued');
  ctx.work.after_preview = 'done';
  return { patch: { revisions: revs }, next: more ? 'revise' : 'preview', note: `Changed option ${r.opt}, ${r.page}` };
}

/* ---------- approval: publish the chosen option at the root and push the code ---------- */
async function stepPublish(ctx) {
  const f = ctx.f; const n = f.picked || 1; const notes = []; const patch = {};
  const files = await filesFor(ctx, [n], true);
  files.push({ path: 'README.md', content: Buffer.from(readme(f, f.deploy && f.deploy.url), 'utf8') });
  if (ctx.K.vercel && ctx.K.vercel.token) {
    const name = (f.deploy && f.deploy.project) || ('fos-' + slug((f.brand || {}).name || f.title).slice(0, 30) + '-' + f.id.slice(0, 6));
    const d = await deployVercel(ctx.K.vercel, name, files.filter((x) => x.path !== 'README.md'), f.deploy);
    patch.deploy = { ...(f.deploy || {}), ...d, stage: 'live', option: n }; notes.push('Live on ' + d.url.replace('https://', ''));
  } else notes.push('Vercel is not connected yet, so there is no live link. Download the files instead.');
  if (ctx.K.github) {
    try {
      patch.repo = await pushGitHub(ctx.K.github, f, files, f.repo);
      notes.push('Code pushed to GitHub');
      const gu = String((f.quiz || {}).github_user || '').trim();
      if (/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(gu)) {
        try { await jf('GitHub', `${GH()}/repos/${patch.repo.full_name}/collaborators/${gu}`, { method: 'PUT', headers: ghH(ctx.K.github), body: JSON.stringify({ permission: 'push' }) }); patch.repo.invited = gu; notes.push('Invite sent to ' + gu); }
        catch (e) { notes.push('GitHub invite for ' + gu + ' failed: ' + clip(e.message, 100)); }
      }
    } catch (e) { patch.repo = { ...(f.repo || {}), error: clip(e.message, 200), at: now() }; notes.push('GitHub: ' + clip(e.message, 140)); }
  }
  patch.status = 'live';
  return { patch, next: 'live', note: notes.join('. ') };
}

const STEPS = { research: stepResearch, collect: stepCollect, offer: stepOffer, copy: stepCopy, wireframe: stepWireframe, brand: stepBrand, graphics: stepGraphics, build: stepBuild, preview: stepPreview, qa: stepQA, fix: stepFix, revise: stepRevise, publish: stepPublish };
function nextOf(step) { const i = ORDER.indexOf(step); return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] === 'fix' ? 'done' : ORDER[i + 1] : 'done'; }

// One run: claim the funnel, work through steps until time is nearly up, save after each one, release.
async function run(jwt, id, budget = 270000) {
  const t0 = Date.now();
  const row = await rpc(jwt, 'gai_funnel_claim', { p_id: id, p_secs: Math.ceil(budget / 1000) + 25 });
  if (!row) return { busy: true };
  const ctx = { jwt, f: row, work: row.work || {}, deadline: t0 + budget };
  const save = (patch, release) => rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { ...patch, work: ctx.work }, p_release: !!release });
  const log = (step, state, note) => {
    const s = (ctx.f.steps || []).filter((x) => x.id !== step);
    s.push({ id: step, label: LABEL[step] || step, state, note: clip(note, 400) || '', at: now() });
    ctx.f.steps = s; return s;
  };
  try {
    if (ctx.f.status !== 'running') return { idle: true, funnel: await save({}, true) };
    ctx.K = await keys(jwt);
    let guard = 0;
    while (ctx.f.status === 'running' && Date.now() < ctx.deadline - 30000 && guard++ < 14) {
      const step = ctx.f.step; const fn = STEPS[step];
      if (!fn) { ctx.f.status = 'review'; await save({ status: 'review', steps: log('done', 'done', 'Ready for review') }); break; }
      if (!(ctx.f.steps || []).some((x) => x.id === step && x.state === 'active')) await save({ steps: log(step, 'active', '') });
      const r = await fn(ctx);
      const patch = { ...(r.patch || {}) }; Object.assign(ctx.f, patch);
      if (r.pending) { patch.steps = log(step, 'active', r.note); await save(patch); break; }
      patch.steps = log(step, 'done', r.note);
      let next = r.next || nextOf(step);
      if (next === 'done') { patch.status = 'review'; patch.steps = log('done', 'done', 'Pick an option, ask for changes, or approve it to go live'); }
      if (next === 'live') next = 'done';
      patch.step = next; patch.error = null; ctx.f.step = next; if (patch.status) ctx.f.status = patch.status;
      await save(patch);
    }
    ctx.work.runs = (ctx.work.runs || 0) + 1;
    return { funnel: await save({}, true), more: ctx.f.status === 'running' };
  } catch (e) {
    const step = ctx.f.step; const tries = ((ctx.work.tries || {})[step] || 0) + 1;
    ctx.work.tries = { ...(ctx.work.tries || {}), [step]: tries };
    const retry = tries < 3 && e.code !== 409 && e.code !== 503 && e.code !== 403;
    const patch = { steps: log(step, retry ? 'active' : 'error', retry ? 'Hit a snag, trying again: ' + clip(e.message, 200) : e.message) };
    if (!retry) { patch.status = 'failed'; patch.error = { message: e.message, fix: e.fix || null, step, at: now() }; }
    let funnel = null; try { funnel = await save(patch, true); } catch { /* the lease runs out on its own */ }
    return { funnel, more: retry, error: retry ? null : e.message };
  }
}

/* ---------- a zip of one option, no dependencies ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function zip(files) {
  const parts = []; const cen = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.path, 'utf8'); const data = f.content; const crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt32LE(0, 10);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, name, data);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt32LE(0, 12);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(off, 42);
    cen.push(c, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(cen); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}

module.exports = { startOf, dirsFor, refOf, MAX_OPTS, launchCheck, launchMeta, siteFacts, stepCollect, proofMode, guessIntent, fontFaces, TYPES, P17, DIRECTIONS, DISPLAY, BODY, LABEL, ORDER, TPL, tplById, pagesOf, keys, run, gen, genJSON, parseJSON, brief, coaching, filesFor, resolve, staticQA, tidy, zip, readme, deployVercel, pushGitHub, jf, SYS, HOUSE, BUILDER, MOTION, slug };
