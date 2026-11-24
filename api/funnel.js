// Funnel OS endpoint. The browser starts a build and polls; the server works in runs of up to five minutes,
// and each run hands over to the next one until the funnel reaches its live preview links.
const { bad, clip, rpc, seal, open, jwtOf, body, send, fail, crypto } = require('./_lib');
const F = require('./_fos');
const LIB = require('./_library');
const AI = require('./_ai');
const S = require('./_studio');
const he = require('he');
let waitUntil = null; try { ({ waitUntil } = require('@vercel/functions')); } catch { /* local test */ }

const MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
const FONT = { 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf' };
const FONT_FILE = /^font-[a-f0-9]{10}\.(woff2|woff|ttf|otf)$/;
const ROLES = ['logo', 'me', 'product', 'other'];
const origin = (req) => { const h = req.headers['x-forwarded-host'] || req.headers.host || ''; return (/^(localhost|127\.)/.test(h) ? 'http://' : 'https://') + h; };
const uuid = (v) => { if (!/^[0-9a-f-]{36}$/i.test(String(v || ''))) throw bad('That funnel was not found. Open it again from the Funnel OS list.', 400, { label: 'Open Funnel OS', href: '/#/funnels' }); return v; };

// Keeps a build moving: run now, then hand over to a fresh run while there is work left.
function kick(req, jwt, id) {
  const go = async () => {
    const r = await F.run(jwt, id);
    if (r && r.more && process.env.VERCEL) {
      await fetch(origin(req) + '/api/funnel', { method: 'POST', headers: { Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', id }) }).catch(() => {});
    } else if (r && r.more && !process.env.FOS_NO_LOOP) return go();
    return r;
  };
  const p = go().catch((e) => console.error('[funnel-os]', e && e.stack || e));
  if (waitUntil && process.env.VERCEL) waitUntil(p);
  return p;
}

// The pieces the quiz and the brand kit share, cleaned the same way.
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : null);
const fam = (v) => clip(String(v || '').replace(/["'\\<>;{}]/g, ''), 40);
function cleanLook(q) {
  const palette = q.palette && typeof q.palette === 'object' ? { bg: hex(q.palette.bg), ink: hex(q.palette.ink), accent: hex(q.palette.accent), deep: hex(q.palette.deep), name: clip(q.palette.name, 40) } : (q.palette === 'site' ? 'site' : null);
  let fonts = q.fonts && q.fonts.display && q.fonts.body ? { display: fam(q.fonts.display), body: fam(q.fonts.body) } : null;
  if (fonts && q.fonts.files && typeof q.fonts.files === 'object') {
    const files = {}; ['display', 'body'].forEach((k) => { if (FONT_FILE.test(q.fonts.files[k] || '')) files[k] = q.fonts.files[k]; });
    if (Object.keys(files).length) fonts.files = files;
  }
  return { palette, fonts };
}
const cleanUrls = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map((u) => String(u).trim()).filter((u) => /^https?:\/\/[^\s]+\.[^\s]+$/.test(u)).slice(0, 5);
const cleanDocs = (v) => (Array.isArray(v) ? v : []).filter((d) => d && d.text).slice(0, 5).map((d) => ({ name: clip(d.name, 80) || 'Document', text: String(d.text).slice(0, 20000) }));
const cleanImages = (v) => (Array.isArray(v) ? v : []).filter((x) => x && /^[a-z0-9][a-z0-9._-]{2,80}$/.test(x.name || '') && x.name !== F.KIT_FILE).slice(0, 12).map((x) => ({ name: x.name, role: ROLES.includes(x.role) ? x.role : 'other', label: clip(x.label, 120) || '' }));
const cleanLink = (v) => (/^https?:\/\/\S+$/.test(String(v || '').trim()) ? String(v).trim() : '');
const PROOF_MODES = ['real', 'placeholder', 'none'];

function cleanQuiz(b) {
  const q = b.quiz || {};
  const type = F.TYPES[q.type] ? q.type : null;
  if (!type) throw bad('Pick a funnel type first.', 400);
  const offer = String(q.offer || '').trim();
  if (offer.length < 40) throw bad('Describe what you sell in a few more sentences: what it is, who it is for, the result, the price and what is included. The more specific, the better the funnel.', 400);
  const start = ['template', 'library', 'scratch'].includes(q.start) ? q.start : (q.template ? 'template' : 'library');
  const t = start === 'template' && q.template ? F.tplById(q.template) : null;
  if (start === 'template' && !t) throw bad('Pick the template to build from, or choose Best match or From scratch in the template step.', 400);
  const { palette, fonts } = cleanLook(q);
  return {
    type, start, template: t ? t.id : null, brand: clip(q.brand, 80) || '', tagline: clip(q.tagline, 160) || '', owner: clip(q.owner, 200) || '',
    offer: offer.slice(0, 8000), offer_name: clip(q.offer_name, 80) || '', price: clip(q.price, 80) || '', offer_id: /^[a-f0-9]{8}$/.test(q.offer_id || '') ? q.offer_id : '',
    audience: clip(q.audience, 1000) || '', voice: clip(q.voice, 600) || '', avoid: clip(q.avoid, 600) || '', proof: String(q.proof || '').slice(0, 5000), checkout_url: cleanLink(q.checkout_url),
    palette, fonts, vibe: clip(q.vibe, 400) || '', images: cleanImages(q.images), urls: cleanUrls(q.urls), docs: cleanDocs(q.docs), notes: String(q.notes || '').slice(0, 8000),
    options: Math.max(1, Math.min(3, +q.options || 1)), ai_images: q.ai_images !== false, github_user: clip(q.github_user, 40) || '',
    improve_offer: q.improve_offer !== false, proof_mode: PROOF_MODES.includes(q.proof_mode) ? q.proof_mode : 'auto',
  };
}

/* ---------- the brand kit: what every build starts from, saved once ---------- */
// Stored as a private file of the owner (role ai), so it needs no new tables. It never ships with a page.
function cleanKit(k, keepTime) {
  k = k && typeof k === 'object' ? k : {};
  const { palette, fonts } = cleanLook(k);
  const offers = (Array.isArray(k.offers) ? k.offers : []).filter((o) => o && (String(o.name || '').trim() || String(o.offer || '').trim())).slice(0, 8)
    .map((o) => ({ id: /^[a-f0-9]{8}$/.test(o.id || '') ? o.id : crypto.randomBytes(4).toString('hex'), name: clip(o.name, 80) || '', price: clip(o.price, 80) || '', offer: String(o.offer || '').slice(0, 8000), checkout_url: cleanLink(o.checkout_url) }));
  return {
    v: 1, brand: clip(k.brand, 80) || '', tagline: clip(k.tagline, 160) || '', owner: clip(k.owner, 200) || '', audience: clip(k.audience, 1000) || '',
    voice: clip(k.voice, 600) || '', avoid: clip(k.avoid, 600) || '', urls: cleanUrls(k.urls), palette, fonts, vibe: clip(k.vibe, 400) || '', images: cleanImages(k.images),
    proof_mode: PROOF_MODES.includes(k.proof_mode) ? k.proof_mode : 'auto', proof: String(k.proof || '').slice(0, 5000), docs: cleanDocs(k.docs), notes: String(k.notes || '').slice(0, 8000),
    offers, main_offer: offers.some((o) => o.id === k.main_offer) ? k.main_offer : ((offers[0] || {}).id || ''),
    updated_at: keepTime && k.updated_at ? clip(k.updated_at, 40) : new Date().toISOString(),
  };
}
const kitData = (k) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><metadata>${F.esc(JSON.stringify(k))}</metadata></svg>`, 'utf8').toString('base64');
function kitOf(rows) {
  const a = (rows || []).find((x) => x.name === F.KIT_FILE); if (!a) return null;
  try { const m = Buffer.from(a.data, 'base64').toString('utf8').match(/<metadata>([\s\S]*)<\/metadata>/); return m ? cleanKit(JSON.parse(he.decode(m[1])), true) : null; } catch { return null; }
}
const readKit = async (jwt) => kitOf(await rpc(jwt, 'gai_assets_get', { p_names: [F.KIT_FILE] }));
async function saveKit(jwt, k) {
  try { await rpc(jwt, 'gai_asset_put', { p_name: F.KIT_FILE, p_mime: 'image/svg+xml', p_role: 'ai', p_label: 'Brand kit', p_data: kitData(k) }); }
  catch (e) {
    if (/demo account/i.test(e.message)) throw bad('The demo account can look around, but it cannot save a brand kit. Create your own account to save yours.', 403, { label: 'Create your account', href: '/#/join' });
    if (/admin only/i.test(e.message)) throw bad('Funnel OS is open to the admin only right now, so the brand kit cannot be saved yet. It opens for members soon.', 403);
    throw e;
  }
  return k;
}
// The quiz answers of a new funnel, written back into the brand kit: brand fields, look, proof, and the offer.
async function syncKit(jwt, q) {
  const cur = (await readKit(jwt)) || cleanKit({});
  const has = (v) => v != null && v !== '' && !(Array.isArray(v) && !v.length);
  const next = { ...cur };
  ['brand', 'tagline', 'owner', 'audience', 'voice', 'avoid', 'vibe', 'proof', 'palette', 'fonts', 'urls', 'images', 'docs'].forEach((k) => { if (has(q[k])) next[k] = q[k]; });
  if (PROOF_MODES.includes(q.proof_mode)) next.proof_mode = q.proof_mode;
  const offers = cur.offers.map((o) => ({ ...o }));
  let o = offers.find((x) => x.id === q.offer_id);
  const name = q.offer_name || (o && o.name) || clip(String(q.offer || '').split(/[.\n]/)[0], 60) || 'My offer';
  const fields = { name, price: q.price || (o && o.price) || '', offer: q.offer, checkout_url: q.checkout_url || (o && o.checkout_url) || '' };
  if (o) Object.assign(o, fields);
  else if (offers.length < 8) { o = { id: crypto.randomBytes(4).toString('hex'), ...fields }; offers.push(o); }
  next.offers = offers; if (o) next.main_offer = o.id;
  return saveKit(jwt, cleanKit(next));
}

const A = {
  status: async (jwt) => ({ ...(await rpc(jwt, 'gai_funnel_status')), types: Object.entries(F.TYPES).map(([id, t]) => ({ id, name: t.name, goal: t.goal })), fonts: { display: F.DISPLAY, body: F.BODY } }),
  list: async (jwt) => (await rpc(jwt, 'gai_funnels_list')).map((f) => ({ ...f, type_name: (F.TYPES[f.funnel_type] || {}).name || '' })),
  get: async (jwt, b) => { const f = await rpc(jwt, 'gai_funnel_get', { p_id: uuid(b.id) }); return { ...f, type_name: (F.TYPES[f.funnel_type] || {}).name || '', pages: F.pagesOf(f) }; },
  create: async (jwt, b, req) => {
    const q = cleanQuiz(b);
    const st = await rpc(jwt, 'gai_funnel_status');
    if (!st.ai) throw bad('Funnel OS has no AI connected yet. The admin adds the Perplexity key in Members and settings. Try again later today.', 503, { label: 'Add the Perplexity key', href: '/#admin', admin: true });
    const title = `${q.brand || 'Untitled'}: ${F.TYPES[q.type].name}`;
    const f = await rpc(jwt, 'gai_funnel_create', { p_title: title, p_type: q.type, p_quiz: q });
    kick(req, jwt, f.id);
    // The funnel matters more than the kit: a kit that does not save never stops the build.
    if (b.kit_sync) { try { f.kit = await syncKit(jwt, q); } catch (e) { f.kit_error = e.message; } }
    return f;
  },
  run: async (jwt, b, req) => { const id = uuid(b.id); kick(req, jwt, id); return { started: true }; },
  retry: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status !== 'failed' && f.status !== 'paused') return f;
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { status: f.step === 'publish' ? 'running' : 'running', error: null, work: {} }, p_release: true });
    kick(req, jwt, id); return g;
  },
  // Builds it again with the current engine: keeps the quiz and the research, redoes everything after.
  rebuild: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then build it again.', 409);
    const keepSteps = (f.steps || []).filter((x) => x.id === 'research');
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { status: 'running', step: f.research ? 'collect' : 'research', steps: keepSteps, visuals: {}, options: [], revisions: [], error: null, work: {} }, p_release: true });
    kick(req, jwt, id); return g;
  },
  // One more design option on the same copy, offer and graphics. Only the new option is built and checked.
  more: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then add another option.', 409);
    if (f.status === 'live') throw bad('This funnel is already live. Press Build it again at the bottom to explore new designs, or ask for changes to the live option.', 409);
    const have = (f.options || []).length;
    if (!f.wireframe || !have) throw bad('The first options are not built yet. Wait for the build to finish, then add another.', 409);
    if (have >= F.MAX_OPTS) throw bad(`This funnel already has ${have} options, the most it can hold. Ask for changes to the one you like best instead.`, 400);
    const idea = clip(String(b.idea || '').replace(/\s+/g, ' ').trim(), 600);
    const wfo = ((f.wireframe || {}).options || []).slice(0, have);
    const used = new Set(wfo.map((o) => o.id));
    let opt;
    if (idea) {
      const nm = idea.split(' ').slice(0, 4).join(' ').replace(/[.,;:!?]+$/, '');
      opt = { id: 'custom-' + (have + 1), name: nm.charAt(0).toUpperCase() + nm.slice(1), idea: `The owner asked for: ${idea}. Keep the same copy, offer and brand kit, and make it clearly different from the earlier options.` };
    } else {
      const pool = F.DIRECTIONS.filter((x) => x.id !== 'template');
      const d = pool.find((x) => !used.has(x.id)) || pool[have % pool.length];
      opt = { ...d, idea: d.idea + ' Make it clearly different from the earlier options.' };
    }
    const n = have + 1; const pages = F.pagesOf(f).map((p) => p.path);
    const built = {}; for (let i = 1; i < n; i++) built[i] = pages.slice();
    const refs = ((f.wireframe || {}).refs || []).filter((r) => r.n < n);
    const lt = F.startOf(f) === 'scratch' ? null : LIB.pick(f, idea ? 'custom' : opt.id, refs.map((r) => r.id)); if (lt) refs.push({ n, ...LIB.card(lt) });
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: {
      quiz: { ...(f.quiz || {}), options: n }, wireframe: { ...f.wireframe, options: [...wfo, { ...opt, n }], refs },
      status: 'running', step: 'build', error: null, work: { built, only: [n], after_preview: 'qa' },
    }, p_release: true });
    kick(req, jwt, id); return g;
  },
  // Sets the checkout or booking link after the build. Every buy button points at it on the next publish.
  checkout: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then add the link.', 409);
    const url = String(b.url || '').trim();
    if (url && !/^https:\/\/[^\s]+\.[^\s]+$/.test(url)) throw bad('Paste the full checkout link, starting with https://. Copy it from your checkout page in your payment or funnel tool.', 400);
    const quiz = { ...(f.quiz || {}), checkout_url: url };
    const live = f.deploy && f.deploy.stage === 'live' && f.picked;
    const st = await rpc(jwt, 'gai_funnel_status');
    if (!st.host && !live) return rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { quiz }, p_release: false });
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { quiz, status: 'running', step: live ? 'publish' : 'preview', error: null, work: { ...(f.work || {}), after_preview: 'done' } }, p_release: false });
    kick(req, jwt, id); return g;
  },
  // What is left before the funnel can take real traffic, each with where to fix it.
  launch: async (jwt, b) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || f.picked || 1));
    const files = await rpc(jwt, 'gai_funnel_files_get', { p_id: id, p_opt: opt });
    return F.launchCheck(f, files);
  },
  // Rewrites what they sell into a sharper offer stack. Plain numbered text so it pastes anywhere.
  upload: async (jwt, b) => {
    const mime = String(b.mime || '');
    if (FONT[mime]) {
      const data = String(b.data || '');
      if (!data || data.length > 3_900_000) throw bad('That font file is too large. Use the WOFF2 version, or one under 2.5 MB.', 413);
      const name = `font-${crypto.randomBytes(5).toString('hex')}.${FONT[mime]}`;
      return rpc(jwt, 'gai_asset_put', { p_name: name, p_mime: mime, p_role: 'font', p_label: clip(String(b.label || '').replace(/["'\\<>;{}]/g, ''), 60) || 'My font', p_data: data });
    }
    const ext = MIME[mime];
    if (!ext) throw bad('Use a PNG, JPG, WebP or SVG image, or a WOFF2, WOFF, TTF or OTF font.', 400);
    const data = String(b.data || '');
    if (!data || data.length > 3_900_000) throw bad('That image is too large. Use one under 2.5 MB, or a screenshot of it.', 413);
    if (mime === 'image/svg+xml' && /<script|on[a-z]+=/i.test(Buffer.from(data, 'base64').toString('utf8'))) throw bad('That SVG has scripts in it. Export it again as a plain SVG or a PNG.', 400);
    const name = `img-${crypto.randomBytes(5).toString('hex')}.${ext}`;
    return rpc(jwt, 'gai_asset_put', { p_name: name, p_mime: mime, p_role: ROLES.includes(b.role) ? b.role : 'other', p_label: clip(b.label, 120) || '', p_data: data });
  },
  assets: (jwt) => rpc(jwt, 'gai_assets_list'),
  'asset-data': (jwt, b) => rpc(jwt, 'gai_assets_get', { p_names: (Array.isArray(b.names) ? b.names : []).slice(0, 20).map(String) }),
  'asset-delete': (jwt, b) => rpc(jwt, 'gai_asset_delete', { p_name: String(b.name || '') }),
  // One option's pages plus the images they use, so the browser can show it even before it is on Vercel.
  files: async (jwt, b) => {
    const id = uuid(b.id); const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || 1));
    const files = await rpc(jwt, 'gai_funnel_files_get', { p_id: id, p_opt: opt });
    const used = new Set(); files.forEach((x) => (x.content.match(/\{\{asset:([a-z0-9._-]+)\}\}/gi) || []).forEach((m) => used.add(m.slice(8, -2))));
    used.delete(F.KIT_FILE);
    const assets = used.size ? await rpc(jwt, 'gai_assets_get', { p_names: [...used] }) : [];
    return { files, assets: assets.map((a) => ({ name: a.name, mime: a.mime, data: a.data })), kit: F.MOTION };
  },
  revise: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then ask for the change.', 409);
    const request = String(b.request || '').trim();
    if (request.length < 6) throw bad('Describe the change you want, for example: make the hero darker and move the guarantee above the FAQ.', 400);
    const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || 1)); const pages = F.pagesOf(f).map((p) => p.path);
    const page = pages.includes(b.page) ? b.page : 'index';
    const revs = (f.revisions || []).concat([{ id: crypto.randomBytes(4).toString('hex'), opt, page, request: request.slice(0, 3000), state: 'queued', at: new Date().toISOString() }]).slice(-40);
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { revisions: revs, status: 'running', step: 'revise', error: null }, p_release: false });
    kick(req, jwt, id); return g;
  },
  approve: async (jwt, b, req) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then approve.', 409);
    const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || 1));
    if (!(f.options || []).some((o) => o.n === opt)) throw bad('That option does not exist. Pick one of the options shown.', 400);
    const quiz = { ...(f.quiz || {}) }; if (b.github_user != null) quiz.github_user = clip(b.github_user, 40) || '';
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { picked: opt, quiz, status: 'running', step: 'publish', error: null }, p_release: false });
    kick(req, jwt, id); return g;
  },
  // The brand kit: read by everyone (the demo sees an empty one), saved by members.
  context: async (jwt) => ({ kit: await readKit(jwt) }),
  'context-save': async (jwt, b) => ({ kit: await saveKit(jwt, cleanKit(b.kit)) }),
  // Pushes one option into the GitHub repository an AI Studio project syncs with. A pasted token is used once and never saved.
  'repo-push': async (jwt, b) => {
    const id = uuid(b.id); const st = await rpc(jwt, 'gai_funnel_status');
    if (st.demo) throw bad('The demo account can look around, but it cannot push to GitHub. Create your own account to send a funnel to AI Studio.', 403, { label: 'Create your account', href: '/#/join' });
    const f = await rpc(jwt, 'gai_funnel_get', { p_id: id });
    if (f.status === 'running') throw bad('This funnel is still working. Wait for it to finish, then push it.', 409);
    const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || f.picked || 1));
    if (!(f.options || []).some((o) => o.n === opt)) throw bad('That option does not exist. Pick one of the options shown.', 400);
    const repo = S.repoOf(b.repo); const owner = repo.split('/')[0];
    let token = String(b.token || '').trim().replace(/^Bearer\s+/i, '');
    if (token && !S.TOKEN_RE.test(token)) throw bad('That does not look like a GitHub token. Copy the whole token, it starts with github_pat_ or ghp_.', 400, { label: 'Create a GitHub token', href: S.tokenLink(owner) });
    const own = !token && st.admin;
    if (own) { try { const k = await rpc(jwt, 'gai_funnel_keys'); token = k && k.github ? open(k.github) : ''; } catch { token = ''; } }
    if (!token) throw bad(st.admin ? 'GitHub is not connected yet. Paste a GitHub token, or add one in Members and settings.' : 'Paste a GitHub token so Funnel OS can push to your repository. It is used once and never saved.', 400, st.admin ? { label: 'Open Members and settings', href: '/#admin', admin: true } : { label: 'Create a GitHub token', href: S.tokenLink(owner) });
    const out = await S.push({ jwt, f, opt, repo, token, admin: own });
    const studio = { ...out, option: opt };
    const g = await rpc(jwt, 'gai_funnel_save', { p_id: id, p_patch: { repo: { ...(f.repo || {}), studio } }, p_release: false });
    return { studio, funnel: { ...g, type_name: (F.TYPES[g.funnel_type] || {}).name || '', pages: F.pagesOf(g) } };
  },
  // Back to review after going live, to make more changes.
  reopen: async (jwt, b) => rpc(jwt, 'gai_funnel_save', { p_id: uuid(b.id), p_patch: { status: 'review', step: 'done' }, p_release: false }),
  delete: (jwt, b) => rpc(jwt, 'gai_funnel_delete', { p_id: uuid(b.id) }),
  zip: async (jwt, b) => {
    const id = uuid(b.id); const f = await rpc(jwt, 'gai_funnel_get', { p_id: id }); const opt = Math.max(1, Math.min(F.MAX_OPTS, +b.opt || f.picked || 1));
    const files = await F.filesFor({ jwt, f }, [opt], true);
    files.push({ path: 'README.md', content: Buffer.from(F.readme(f, f.deploy && f.deploy.stage === 'live' ? f.deploy.url : ''), 'utf8') });
    return { name: `${F.slug((f.brand || {}).name || f.title)}-option-${opt}.zip`, data: F.zip(files).toString('base64') };
  },

  // ---------- admin: the keys Funnel OS runs on ----------
  'admin-fos': async (jwt) => {
    const [k, s] = await Promise.all([rpc(jwt, 'gai_admin_keys'), rpc(jwt, 'gai_admin_settings')]);
    let team = null; try { const c = await rpc(jwt, 'gai_admin_key_get', { p_provider: 'vercel' }); if (c) team = JSON.parse(open(c)).team || null; } catch { team = null; }
    const has = (p) => (k && k[p] ? k[p].last4 || 'set' : null);
    const access = Array.isArray(s) ? ((s.find((x) => x.key === 'fos_access') || {}).value || '') : ((s && s.fos_access) || '');
    return { perplexity: has('perplexity'), openrouter: has('openrouter'), github: has('github'), vercel: has('vercel'), vercel_team: team, access };
  },
  'admin-fos-save': async (jwt, b) => {
    await rpc(jwt, 'gai_admin_keys'); // admin only
    const set = (p, v, last4) => rpc(jwt, 'gai_admin_key_set', { p_provider: p, p_ciphertext: v ? seal(v) : '', p_last4: last4 || '' });
    const out = {};
    if (b.provider === 'github') {
      const t = String(b.token || '').trim();
      if (t) {
        let me; try { me = await F.jf('GitHub', (process.env.FOS_GITHUB_API || 'https://api.github.com') + '/user', { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'User-Agent': 'FunnelOS' } }); }
        catch (e) { throw bad('GitHub did not accept this token. Create a fine-grained token with Administration and Contents set to read and write, then paste it again.', 400, { label: 'Create a GitHub token', href: 'https://github.com/settings/personal-access-tokens/new' }); }
        out.login = me && me.login;
      }
      await set('github', t, t.slice(-4));
    } else if (b.provider === 'vercel') {
      const t = String(b.token || '').trim(); const team = String(b.team || '').trim();
      if (team && !/^(team_[A-Za-z0-9]{6,40}|[a-z0-9-]{2,60})$/.test(team)) throw bad('That team ID does not look right. Copy it from Vercel, Team settings, General, Team ID. Leave it empty for a personal account.', 400, { label: 'Open Vercel team settings', href: 'https://vercel.com/teams' });
      if (t) {
        const base = process.env.FOS_VERCEL_API || 'https://api.vercel.com';
        try { await F.jf('Vercel', base + (team ? '/v2/teams/' + encodeURIComponent(team) : '/v2/user'), { headers: { Authorization: 'Bearer ' + t } }); }
        catch (e) { throw bad(team ? 'Vercel did not accept this token for that team. Create a token scoped to the team, and check the team ID.' : 'Vercel did not accept this token. Create a new token and paste it again.', 400, { label: 'Create a Vercel token', href: 'https://vercel.com/account/settings/tokens' }); }
      }
      await set('vercel', t ? JSON.stringify({ token: t, team: team || null }) : '', t.slice(-4));
    } else if (b.provider === 'openrouter') {
      const t = String(b.token || '').trim();
      if (t) {
        try { await F.jf('OpenRouter', (process.env.FOS_OPENROUTER_API || 'https://openrouter.ai/api/v1') + '/key', { headers: { Authorization: 'Bearer ' + t } }); }
        catch (e) { throw bad('OpenRouter did not accept this key. Create a new key and paste it again.', 400, { label: 'Create an OpenRouter key', href: 'https://openrouter.ai/settings/keys' }); }
      }
      await set('openrouter', t, t.slice(-4));
    } else if (b.provider === 'access') {
      await rpc(jwt, 'gai_admin_setting_set', { p_key: 'fos_access', p_value: b.value === 'admin' ? 'admin' : '' });
    } else throw bad('Unknown setting', 400);
    return { ...(await A['admin-fos'](jwt)), ...out };
  },
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') throw bad('Use POST', 405);
    const jwt = jwtOf(req); const b = await body(req);
    const fn = A[b.action]; if (!fn) throw bad('Unknown action', 400);
    send(res, 200, { data: await fn(jwt, b, req) });
  } catch (e) { fail(res, e); }
};
module.exports.kick = kick;
