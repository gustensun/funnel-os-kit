// Shared server helpers for Funnel OS. Files starting with an underscore are not endpoints.
const crypto = require('crypto');

// Where people go when a setting is missing. Change it if you keep your own copy of the guide.
const SETUP_GUIDE = 'https://github.com/gustensun/funnel-os-kit/blob/main/SETUP.md';

// Your own Supabase project: members, chats, funnels, settings, the coaching library and the owner's sealed keys.
// Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel (SETUP.md, step 4). Never use a secret or service role key here.
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
function secretKey(k) {
  if (/^sb_secret_/i.test(k)) return true;
  const p = k.split('.'); if (p.length !== 3) return false;
  try { return JSON.parse(Buffer.from(p[1], 'base64').toString('utf8')).role === 'service_role'; } catch { return false; }
}
// What is wrong with the database settings, in words the owner can act on. Null when they look right.
function dbProblem() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 'Funnel OS is not connected to its database yet. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your Vercel project settings, then redeploy.';
  if (!/^https?:\/\/\S+$/.test(SUPABASE_URL)) return 'SUPABASE_URL does not look right. Copy the Project URL from Supabase, like https://abcdefgh.supabase.co, paste it in Vercel and redeploy.';
  if (secretKey(SUPABASE_KEY)) return 'SUPABASE_PUBLISHABLE_KEY holds a secret key. Replace it in Vercel with the publishable key from Supabase (it starts with sb_publishable_), then redeploy.';
  return null;
}

// The coach: the person whose teaching fills the library. COACH_NAME in Vercel, for example "Avery Cole",
// shows as "Avery AI" and speaks as Avery. Without it the coach is "AI Coach" and speaks as "the coach".
// who and whose are for sentences: "Avery" and "Avery's", or "the coach" and "the coach's".
const tidy = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const COACH_NAME = tidy(process.env.COACH_NAME, 60);
const COACH_FIRST = COACH_NAME.split(' ')[0];
const COACH = {
  name: COACH_NAME, first: COACH_FIRST, ai: COACH_NAME ? COACH_FIRST + ' AI' : 'AI Coach',
  who: COACH_FIRST || 'the coach', whose: (COACH_FIRST || 'the coach') + "'s", full: COACH_NAME || 'the coach',
  bio: tidy(process.env.COACH_BIO, 200) || 'a funnel builder and marketing educator',
};

// Every error carries what to do next and, when there is one, where to do it.
function bad(m, code = 400, fix) { const e = new Error(m); e.code = code; if (fix) e.fix = fix; return e; }
const clip = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// GAI_ENC_KEY seals the API keys the admin saves. Make it once with: openssl rand -base64 32
function key() {
  const fix = { label: 'Open the setup guide', href: SETUP_GUIDE + '#step-3-make-your-secret-code', admin: true };
  const k = process.env.GAI_ENC_KEY; if (!k) throw bad('Funnel OS is missing its server key. The admin needs to add GAI_ENC_KEY in the Vercel project settings and redeploy.', 500, fix);
  const b = Buffer.from(k, 'base64'); if (b.length !== 32) throw bad('The server key GAI_ENC_KEY is not valid. Make a new one with openssl rand -base64 32, save it in Vercel and redeploy.', 500, fix);
  return b;
}
function seal(plain) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const out = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), out]).toString('base64');
}
function open(sealed) {
  if (!sealed || !String(sealed).startsWith('v1.')) throw bad('Not connected', 409);
  const b = Buffer.from(sealed.slice(3), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

// A fixed secret derived from the server key, for things like the WhatsApp webhook token.
function hmac(label) { return crypto.createHmac('sha256', key()).update(String(label)).digest('hex'); }

async function sb(jwt, path, { method = 'GET', body, base = SUPABASE_URL, apikey = SUPABASE_KEY } = {}) {
  const why = base === SUPABASE_URL && dbProblem();
  if (why) { const e = bad(why, 503, { label: 'Open the setup guide', href: SETUP_GUIDE }); e.setup = true; throw e; }
  let r;
  try { r = await fetch(base + path, { method, headers: { apikey, ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { throw bad('The library could not be reached. Check your connection and try again.', 502); }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) {
    const m = (j && (j.message || j.msg)) || 'Database error';
    const e = bad(m, r.status === 401 || /JWT/i.test(m) ? 401 : /waiting for approval/i.test(m) ? 403 : /not allowed|Only the admin|permission/i.test(m) ? 403 : /PGRST202|Could not find the function/i.test(m) ? 503 : 400);
    if (e.code === 401) { e.message = 'Your sign-in expired. Sign in again to keep going.'; e.fix = { label: 'Sign in', href: '/#signin' }; }
    if (e.code === 503) { e.message = 'Funnel OS is waiting for its database. Run supabase/setup.sql in the Supabase SQL Editor (step 2 of the setup guide), then try again.'; e.fix = { label: 'Open the setup guide', href: SETUP_GUIDE }; e.setup = true; }
    throw e;
  }
  return j;
}
const rpc = (jwt, fn, args) => sb(jwt, '/rest/v1/rpc/' + fn, { method: 'POST', body: args || {} });
function jwtOf(req) { const h = req.headers.authorization || ''; const t = h.startsWith('Bearer ') ? h.slice(7) : ''; if (!t) throw bad('Sign in to use Funnel OS.', 401, { label: 'Sign in', href: '/#signin' }); return t; }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
function send(res, code, obj) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }
function fail(res, e) {
  const code = typeof e.code === 'number' && e.code >= 400 && e.code < 600 ? e.code : 500;
  if (code >= 500 && !e.setup) console.error('[funnel-os]', e && e.stack || e);
  send(res, code, { error: e.message || 'Something went wrong. Try again.', fix: e.fix || null, setup: !!e.setup });
}

// The app's own address, for links it hands out: password links, the WhatsApp webhook and replies.
// APP_URL in Vercel wins when it is set, for example when you use your own domain.
function origin(req) {
  const fixed = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//.test(fixed)) return fixed;
  const h = String((req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim();
  return (/^(localhost|127\.)/.test(h) ? 'http://' : 'https://') + h;
}

module.exports = { SUPABASE_URL, SUPABASE_KEY, SETUP_GUIDE, COACH, dbProblem, origin, bad, clip, open, seal, hmac, sb, rpc, jwtOf, body, send, fail, crypto };
