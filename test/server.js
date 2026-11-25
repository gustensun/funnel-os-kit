// Local test server: the real API handlers, a tiny stand-in for the database REST layer on the local Postgres,
// a fake sign-in, and stand-ins for Perplexity, WhatsApp, ElevenLabs, GitHub and Vercel. Test only, never deployed.
const http = require('http'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { Pool } = require('pg');
const PORT = +process.env.PORT || 5055;
const ROOT = path.join(__dirname, '..');
const ENC = crypto.randomBytes(32).toString('base64');
Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${PORT}/sb`, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_localtest', GAI_ENC_KEY: ENC, COACH_NAME: 'Jamie Park', COACH_BIO: 'a funnel builder and marketing coach', APP_URL: 'https://funnels.example.com', PPLX_BASE_URL: `http://127.0.0.1:${PORT}/mock`, WA_GRAPH_URL: `http://127.0.0.1:${PORT}/mock-graph`, ELEVEN_BASE_URL: `http://127.0.0.1:${PORT}/mock-xi`, WA_CFG_TTL: '0',
  FOS_VERCEL_API: `http://127.0.0.1:${PORT}/mock-vercel`, FOS_GITHUB_API: `http://127.0.0.1:${PORT}/mock-gh`, FOS_OPENROUTER_API: `http://127.0.0.1:${PORT}/mock-or`, FOS_SHOT_API: `http://127.0.0.1:${PORT}/mock-shot`, FOS_IMAGE_MODELS: 'test/image' });
process.env.FOS_BG_POLL = process.env.FOS_BG_POLL || '200'; process.env.FOS_SHOT_MOCK = process.env.FOS_SHOT_MOCK || '1';
const FM = require('./fos-mock');
// Uses the PGHOST, PGPORT, PGUSER and PGPASSWORD settings of your shell. Defaults: localhost, 5432, postgres.
const PG = { host: process.env.PGHOST || 'localhost', port: +process.env.PGPORT || 5432, user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD };
const R = `psql -h ${PG.host} -p ${PG.port} -U ${PG.user} -q -v ON_ERROR_STOP=1`;
require('child_process').execSync(`${R} -d postgres -c "drop database if exists funnel_os_test with (force)" -c "create database funnel_os_test" && ${R} -d funnel_os_test -f test/stub.sql && ${R} -d funnel_os_test -f supabase/setup.sql -f supabase/optional/demo-account.sql -f supabase/library.sql`, { cwd: ROOT, stdio: 'ignore' });
const pool = new Pool({ ...PG, database: 'funnel_os_test' });
const handlers = { ask: require('../api/ask.js'), app: require('../api/app.js'), wa: require('../api/wa.js'), funnel: require('../api/funnel.js') };
// What the WhatsApp stand-in was asked to send, for the tests.
const SENT = [];

function seal(plain) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENC, 'base64'), iv); const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]); return 'v1.' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64'); }
const USERS = { 'admin@x.test': '00000000-0000-0000-0000-00000000000a', 'member@x.test': '00000000-0000-0000-0000-00000000000b', 'other@x.test': '00000000-0000-0000-0000-00000000000c' };

async function seed() {
  await pool.query(`with d as (select id from auth.users where email = 'demo@example.com'),
    t as (insert into public.gai_threads (user_id, title, channel, pinned, updated_at) select id, 'What should my first low-ticket offer be?', 'offers', true, now() - interval '1 day' from d returning id, user_id)
    insert into public.gai_messages (thread_id, user_id, role, body, sources) select id, user_id, r, b, '[]' from t, (values ('user', 'What should my first low-ticket offer be?'), ('assistant', 'Start with the one result your clients ask about first. **Next step: list the three questions clients ask most.**')) v(r, b)`);
  await pool.query(`insert into private.gai_keys (provider, ciphertext, last4) values ('perplexity', $1, 'pkey')`, [seal('test-pplx-key')]);
  await pool.query(`update private.gai_config set value = 'admin@x.test' where key = 'admin_email'`);
  await pool.query(`update auth.users set raw_user_meta_data = jsonb_build_object('full_name', case email when 'admin@x.test' then 'Jamie Park' when 'member@x.test' then 'Maria Lind' else 'Alex Rivera' end) where email in ('admin@x.test', 'member@x.test', 'other@x.test')`);
  const lib = [
    ['recording', 'Coaching call: fixing a sales page that does not convert', null, [[312, 'When a sales page does not convert, check the first screen before anything else. The headline has to name the outcome and the person it is for. Most pages I review talk about the product before the reader knows it is for them.'], [1490, 'Proof goes right after the promise. One specific result from a real student beats ten generic testimonials. Put the proof where the doubt shows up.']]],
    ['youtube', 'How to build your first funnel in a weekend', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', [[95, 'Your first funnel is three pages: an opt-in, a sales page and a thank you page. Do not build upsells until the front end converts. One offer, one traffic source, one funnel.'], [640, 'Write the sales page in the order of the 17Ps: promise, problem, picture, proof, product, price and the rest. You fill in the sections, the structure does the selling.']]],
    ['doc', 'The 17Ps of funnel sections', null, [[null, 'The 17Ps is the order of sections on a long sales page. It starts with the promise and the problem, moves to the picture of life after, proof, the product, the price and the guarantee, and closes with the push and the postscript.']]],
    ['doc', 'Offer stack framework', null, [[null, 'Stack the offer with bonuses that remove the next obstacle the buyer will hit. Every bonus should answer a reason they might not buy. Number the stack and give each item a plain name and an outcome.']]],
    ['recording', 'Coaching call: pricing your first offer', null, [[220, 'Price from the outcome, not from your hours. Ask what the result is worth to the buyer in the next twelve months, then price at a fraction of that so the decision is easy.']]],
    ['youtube', 'Getting your first three clients without ads', 'https://www.youtube.com/watch?v=abc123', [[45, 'Your first clients come from conversations, not content. Make a list of thirty people who already know you, send a personal message, and offer to build something for them first.']]],
    ['doc', 'DM closing: Connect, Collect, Close', null, [[null, 'Every DM conversation has three stages. Connect: start a real conversation about them. Collect: ask about where they are and where they want to be. Close: offer the next step only when the gap is clear.']]],
    ['recording', 'Coaching call: AI agents for lead follow up', null, [[600, 'Start with the task you repeat every day that follows the same steps. Lead follow up is the classic one. Write the steps down first, then hand them to an agent.']]],
  ];
  await pool.query('create sequence if not exists cid');
  for (const [kind, title, url, chunks] of lib) {
    const { rows } = await pool.query(`insert into public.gai_lib_sources (id, kind, title, url, chars, published_at) values (gen_random_uuid(),$1,$2,$3,$4,now()) returning id`, [kind, title, url, chunks.reduce((a, c) => a + c[1].length, 0)]);
    let i = 0; for (const [at, body] of chunks) await pool.query(`insert into public.gai_lib_chunks (id, source_id, idx, at_s, body) values (nextval('cid'),$1,$2,$3,$4)`, [rows[0].id, i++, at, body]);
  }
  await pool.query(`insert into public.gai_lib_playbook (id, topic, question, keywords, answer, sources) values (gen_random_uuid(), 'Funnels','Which funnel should I build first?','first funnel start','Build one simple sales funnel for one offer: opt-in, sales page, thank you page.','{"The 17Ps of funnel sections"}'),(gen_random_uuid(), 'Clients','How do I get my first clients?','first clients outreach','Start with warm conversations. Thirty personal messages to people who know you.','{"DM closing: Connect, Collect, Close"}')`);
}

const ARGT = new Map();
async function argTypes(fn) {
  if (ARGT.has(fn)) return ARGT.get(fn);
  const { rows } = await pool.query(`select a.n, format_type(a.t, null) as t from pg_proc p, unnest(p.proargnames, p.proargtypes::oid[]) as a(n, t) where p.proname = $1 and p.pronamespace = 'public'::regnamespace`, [fn]).catch(() => ({ rows: [] }));
  const m = {}; rows.forEach((r) => { m[r.n] = r.t; }); ARGT.set(fn, m); return m;
}
// PostgREST stand-in: rpc calls run as the signed-in user (Bearer uid:<uuid>) or anon.
async function rest(req, res, fn, body) {
  const auth = req.headers.authorization || ''; const uid = auth.startsWith('Bearer uid:') ? auth.slice(11) : null;
  const args = Object.entries(body || {});
  // Like PostgREST, send a list of strings as text[] or as json, whichever the function's parameter is.
  const types = await argTypes(fn);
  const vals = args.map(([k, v]) => (v === null || v === undefined ? null : Array.isArray(v) && v.every((x) => typeof x === 'string') && !/json/.test(types[k] || '') ? '{' + v.map((x) => JSON.stringify(x)).join(',') + '}' : typeof v === 'object' ? JSON.stringify(v) : String(v)));
  const sql = `select to_jsonb(public.${fn.replace(/[^a-z_]/g, '')}(${args.map(([k], i) => `${k.replace(/[^a-z0-9_]/g, '')} => $${i + 1}`).join(', ')})) as r`;
  const c = await pool.connect();
  try {
    await c.query('begin'); await c.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
    await c.query(`select set_config('test.uid', $1, true)`, [uid || '']);
    const { rows } = await c.query(sql, vals); await c.query('commit');
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(rows[0].r));
  } catch (e) {
    await c.query('rollback').catch(() => {});
    res.writeHead(e.code === '42501' ? 403 : e.code === '42883' ? 404 : 400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: e.code === '42883' ? 'Could not find the function' : e.message, code: e.code }));
  } finally { c.release(); }
}

// Perplexity Agent API stand-in: streams an answer that cites the first two library passages, plus a web link when asked about pricing.
async function mockAgent(req, res, b) {
  if (req.headers.authorization === 'Bearer bad-key') { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":{"message":"Invalid API key"}}'); }
  if (b.background) return bgStart(res, b);
  if (!b.stream) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK', annotations: [] }] }] })); }
  if (process.env.MOCK_FAIL_MODEL && b.model === process.env.MOCK_FAIL_MODEL) { res.writeHead(500); return res.end('{"error":{"message":"overloaded"}}'); }
  const fos = FM.agentText(b);
  if (fos != null) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const ev = (o) => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`);
    for (const p of fos.match(/[\s\S]{1,400}/g)) ev({ type: 'response.output_text.delta', delta: p });
    ev({ type: 'response.completed', response: { status: 'completed', model: b.model, output: [] } }); return res.end();
  }
  const sys = b.instructions || ''; const nums = [...new Set((sys.match(/^\[(\d+)\]/gm) || []).map((x) => x.slice(1, -1)))];
  const last = b.input[b.input.length - 1]; const q = (last.content.find((c) => c.type === 'input_text') || {}).text || '';
  const c1 = nums[0] ? ` [${nums[0]}]` : ''; const c2 = nums[1] ? ` [${nums[1]}]` : c1;
  const web = /pric/i.test(q) && (b.tools || []).some((t) => t.type === 'web_search');
  const text = (web ? 'HighLevel starts at $97 a month on the Starter plan ([HighLevel](https://www.gohighlevel.com/pricing)).\n\n' : '') + `Start with the first screen of your page. The headline has to name the outcome and who it is for, before you talk about the product${c1}.\n\n## What to fix first\n\n1. **Headline:** say the result in plain words, for example "Get 10 new patients a month without ads".\n2. **Proof:** put one specific student result right under the promise${c2}.\n3. **Structure:** follow the section order so nothing important is missing${c1}.\n\nYou asked: "${String(q).slice(0, 80)}". Keep the page to one offer and one call to action.\n\n**Next step: rewrite your headline tonight and send me the before and after.**\n%%RELATED%%\nHow do I write a headline that converts?\nWhat proof should I use if I have no students yet?\nHow long should my sales page be?`;
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  const ev = (o) => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`);
  ev({ type: 'response.created', response: { status: 'in_progress' } });
  if (web) ev({ type: 'response.output_item.done', item: { type: 'search_results', queries: ['highlevel pricing'], results: [{ title: 'Pricing | HighLevel', url: 'https://www.gohighlevel.com/pricing', date: '2026-11-01' }, { title: 'Unused page', url: 'https://example.com/x' }] } });
  for (const p of text.match(/[\s\S]{1,14}/g)) { ev({ type: 'response.output_text.delta', delta: p }); await new Promise((r) => setTimeout(r, +process.env.MOCK_DELAY || 12)); }
  ev({ type: 'response.completed', response: { status: 'completed', model: b.model, output: [] } }); res.end();
}

// Background jobs. The first copy job stops at its length limit halfway, so the next job continues it; the
// first copy review job fails, so the backup model takes over; the judge's JSON schema is refused once per
// funnel, so it runs again without it.
const JOBS = new Map(); let JN = 0; const ONCE = { copy: true, chief: true };
function bgStart(res, b) {
  const J = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  const schema = ((b.response_format || {}).json_schema || {}).name;
  if (schema === 'fosjudge') { FM.LOG.agent.push({ kind: 'judge', bg: true, schema, rejected: true, model: b.model }); return J(400, { error: { message: 'response_format json_schema is not supported for this model' } }); }
  const r = FM.reply(b) || { kind: 'other', text: 'OK' };
  const cont = b.input.length >= 3 && b.input[b.input.length - 2].role === 'assistant';
  let text = r.text; let final = 'completed';
  if (cont) { const d = (b.input[b.input.length - 2].content[0] || {}).text || ''; text = text.startsWith(d) ? text.slice(d.length) : text; }
  else if (r.kind === 'copy' && ONCE.copy) { ONCE.copy = false; final = 'incomplete'; text = text.slice(0, Math.floor(text.length / 2)); }
  else if (r.kind === 'chief' && ONCE.chief) { ONCE.chief = false; final = 'failed'; }
  const id = 'bg_' + (++JN);
  JOBS.set(id, { polls: 0, final, text, model: b.model, kind: r.kind });
  J(200, { id, status: 'queued', model: b.model, output: [] });
}
function mockJob(req, res, u) {
  const J = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  const [id, act] = u.pathname.replace('/mock/v1/agent/', '').split('/');
  const j = JOBS.get(id); if (!j) return J(404, { error: { message: 'Response not found' } });
  if (act === 'cancel') { j.final = 'cancelled'; j.polls = 9; FM.LOG.cancelled = (FM.LOG.cancelled || 0) + 1; return J(200, { id, status: 'cancelled' }); }
  j.polls++;
  if (j.polls < 2) return J(200, { id, status: 'in_progress', model: j.model, output: [] });
  if (j.final === 'failed') return J(200, { id, status: 'failed', model: j.model, error: { code: 'server_error', message: 'The model is overloaded' }, output: [] });
  J(200, { id, status: j.final, model: j.model, incomplete_details: j.final === 'incomplete' ? { reason: 'max_output_tokens' } : null, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: j.text, annotations: [] }] }] });
}

// WhatsApp Cloud API stand-in.
function mockGraph(req, res, u, raw) {
  const j = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  const tok = (req.headers.authorization || '').slice(7);
  if (tok === 'bad-wa') return j(401, { error: { message: 'Invalid OAuth access token', code: 190 } });
  const parts = u.pathname.replace('/mock-graph/', '').split('/');
  if (parts[0] === 'file') { res.writeHead(200, { 'Content-Type': 'audio/ogg' }); return res.end(Buffer.concat([Buffer.from('OggS'), Buffer.alloc(200)])); }
  if (req.method === 'GET' && parts.length === 1 && parts[0].startsWith('media')) return j(200, { url: `http://127.0.0.1:${PORT}/mock-graph/file/voice.ogg`, mime_type: 'audio/ogg; codecs=opus', file_size: 204 });
  if (req.method === 'GET' && parts.length === 1) return parts[0] === '999' ? j(400, { error: { message: 'Unsupported get request. Object with ID 999 does not exist', code: 100 } }) : j(200, { display_phone_number: '+44 7700 900999', verified_name: 'Funnel OS Test', id: parts[0] });
  if (parts[1] === 'subscribed_apps') return j(200, { success: true });
  if (parts[1] === 'media') { SENT.push({ upload: raw.length, ogg: raw.includes('OggS') }); return j(200, { id: 'up' + SENT.length }); }
  if (parts[1] === 'messages') { const b = JSON.parse(raw || '{}'); if (b.status !== 'read') SENT.push(b); return j(200, { messages: [{ id: 'wamid.' + SENT.length }] }); }
  return j(404, { error: { message: 'unknown', code: 100 } });
}
// ElevenLabs stand-in.
function mockXi(req, res, u) {
  if (req.headers['xi-api-key'] === 'bad-xi') { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"detail":{"status":"invalid_api_key"}}'); }
  if (u.pathname.endsWith('/v1/voices')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ voices: [{ voice_id: 'Premade1', name: 'Rachel', category: 'premade' }, { voice_id: 'CustomVoice1', name: 'Coach voice', category: 'cloned' }] })); }
  if (u.pathname.includes('/v1/text-to-speech/')) { const ogg = /opus/.test(u.search); res.writeHead(200, { 'Content-Type': ogg ? 'audio/ogg' : 'audio/mpeg' }); return res.end(Buffer.concat([Buffer.from(ogg ? 'OggS' : 'ID3'), Buffer.alloc(300)])); }
  if (u.pathname.endsWith('/v1/speech-to-text')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ text: 'How do I price my first offer?' })); }
  res.writeHead(404); res.end('{}');
}

const FAKE_AUTH = `<script>
window.GAI_AUTH = { auth: {
  async getSession() { const u = localStorage.getItem('fake-uid'); return { data: { session: u ? { access_token: 'uid:' + u } : null } }; },
  async signInWithPassword({ email, password }) { const r = await fetch('/test/login', { method: 'POST', body: JSON.stringify({ email, password }) }); const j = await r.json(); if (!j.uid) return { error: { message: 'Invalid login credentials' } }; localStorage.setItem('fake-uid', j.uid); return { data: {} }; },
  async signUp({ email, options }) { const r = await fetch('/test/signup', { method: 'POST', body: JSON.stringify({ email, name: options.data.full_name }) }); const j = await r.json(); return { data: { session: null }, error: j.error ? { message: j.error } : null }; },
  async signOut() { localStorage.removeItem('fake-uid'); }, async resetPasswordForEmail() { return {}; }, async updateUser() { return {}; }, onAuthStateChange() {} } };
</script>`;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const chunks = []; for await (const c of req) chunks.push(c);
  const rawBuf = Buffer.concat(chunks); const raw = rawBuf.toString('latin1').includes('OggS') ? rawBuf.toString('latin1') : rawBuf.toString('utf8'); let b = {}; try { b = raw ? JSON.parse(raw) : {}; } catch { /* not json */ }
  try {
    if (u.pathname.startsWith('/sb/rest/v1/rpc/')) return rest(req, res, u.pathname.split('/').pop(), b);
    if (u.pathname === '/mock/v1/agent') return mockAgent(req, res, b);
    if (u.pathname.startsWith('/mock/v1/agent/')) return mockJob(req, res, u);
    if (u.pathname === '/test/env') { for (const [k, v] of Object.entries(b || {})) process.env[k] = String(v); res.end('{}'); return; }
    if (u.pathname === '/mock/v1/decisions') return FM.decisions(req, res, b);
    if (u.pathname.startsWith('/mock-vercel/')) return FM.vercel(req, res, u, b);
    if (u.pathname.startsWith('/mock-gh/')) return FM.github(req, res, u, b);
    if (u.pathname.startsWith('/mock-or/')) return FM.openrouter(req, res, u);
    if (u.pathname.startsWith('/mock-shot')) return FM.shot(req, res, u, PORT);
    if (u.pathname.startsWith('/mock-gallery')) return FM.gallery(req, res, u);
    if (u.pathname.startsWith('/mock-brand')) return FM.brandSite(req, res, u);
    if (u.pathname === '/test/fos') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(FM.LOG)); }
    if (u.pathname === '/test/studio') { if (req.method === 'POST') FM.resetStudio(); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(FM.studioState(u.searchParams.get('repo') || 'me/studio'))); }
    if (u.pathname.startsWith('/mock-graph/')) return mockGraph(req, res, u, raw);
    if (u.pathname.startsWith('/mock-xi/')) return mockXi(req, res, u);
    if (u.pathname === '/test/sent') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(SENT)); }
    if (u.pathname === '/test/sign') { res.end(crypto.createHmac('sha256', b.secret).update(b.body).digest('hex')); return; }
    if (u.pathname === '/test/login') {
      const { rows } = await pool.query(`select id from auth.users where lower(email) = lower($1) and encrypted_password is not null and encrypted_password = extensions.crypt($2, encrypted_password)`, [b.email || '', b.password || '']);
      res.end(JSON.stringify({ uid: rows[0] ? rows[0].id : b.password === 'password1' ? USERS[b.email] : null })); return;
    }
    if (u.pathname === '/test/signup') {
      const id = crypto.randomUUID(); USERS[b.email] = id;
      await pool.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,jsonb_build_object('full_name', $3::text))`, [id, b.email, b.name]);
      res.end('{}'); return;
    }
    if (u.pathname === '/config.js') return require('../api/config.js')(req, res);
    if (u.pathname.startsWith('/api/')) { const h = handlers[u.pathname.slice(5).replace(/\.js$/, '')]; if (!h) { res.writeHead(404); return res.end('{}'); } req.body = b; req.rawBody = raw; return h(req, res); }
    let f = path.join(ROOT, path.normalize(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, 'index.html');
    let data = fs.readFileSync(f);
    if (f.endsWith('index.html')) data = Buffer.from(String(data).replace(/<script src="\/js\/channels\.js[^"]*">/, (m) => FAKE_AUTH + m));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(data);
  } catch (e) { console.error(e); res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
});
seed().then(() => server.listen(PORT, () => console.log('test server on ' + PORT))).catch((e) => { console.error(e); process.exit(1); });
