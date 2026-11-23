// WhatsApp webhook. Members text or send a voice note; the AI coach answers by text, or by voice note in the ElevenLabs voice the admin picked.
// GET: Meta checks the webhook with the verify token. POST: Meta delivers messages, signed with the app secret.
const { rpc, open, crypto, send, origin, COACH } = require('./_lib');
const W = require('./_wa');
const AI = require('./_ai');
const P = require('./_prompt');
const G = require('../js/coach-guard.js');

let waitUntil = null; try { ({ waitUntil } = require('@vercel/functions')); } catch { /* local test */ }

// The keys and settings, opened on the server. Cached briefly so a burst of messages does one lookup.
let CFG = null;
async function config() {
  if (CFG && Date.now() - CFG.at < Number(process.env.WA_CFG_TTL || 15000)) return CFG.v;
  const j = await rpc(null, 'gai_wa_config', { p_token: W.serverToken() });
  const k = {}; for (const [p, c] of Object.entries((j && j.keys) || {})) { try { k[p] = open(c); } catch { /* sealed with an older server key */ } }
  const s = (j && j.settings) || {};
  const v = { token: k.whatsapp, secret: k.whatsapp_secret, pplx: k.perplexity, xi: k.elevenlabs, phoneId: s.wa_phone_id, voiceId: s.voice_id, voiceMode: s.wa_voice || '', model: AI.valid(s.model) ? s.model : AI.DEFAULT, help: s.help_url || '' };
  CFG = { at: Date.now(), v }; return v;
}

async function rawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  const parts = []; for await (const c of req) parts.push(c);
  return Buffer.concat(parts).toString('utf8');
}
function signed(raw, header, secret) {
  if (!secret || !header || !header.startsWith('sha256=')) return false;
  const want = Buffer.from(crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')); const got = Buffer.from(header.slice(7));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

const WA_TEXT = 'This conversation is on WhatsApp. Write it like a WhatsApp message from a coach: short paragraphs, plain words, *single asterisks* around the few words that matter most, numbered steps only when order matters. No headings, no tables, no citation numbers. When you use a fact from the web, write the site name and the full link in plain text. At most about 220 words unless they ask for a full draft like a script or a sales page. End with one concrete next step.';
const WA_VOICE = 'Your reply becomes a voice note on WhatsApp, spoken in ' + COACH.whose + ' voice. Speak, do not write: four to seven natural spoken sentences, about 70 to 130 words, the way you would answer a member\'s voice note. No lists, no markdown, no links, no numbers in brackets, no follow-up questions section. Say numbers and prices the way people say them out loud.';
const WANTS_VOICE = /\b(voice ?note|voice message|audio message|send (me )?(a |an )?(voice|audio)|reply (in|with) (a )?voice|say it out loud)\b/i;

function systemFor(voice, lib, inn) {
  const base = P.SYSTEM.split('\n\n');
  const rules = [...base.slice(0, 7), base[8]].join('\n\n');
  const { lines } = P.sourcesFor(lib.plays, lib.passages);
  return rules + '\n\n' + (voice ? WA_VOICE : WA_TEXT) + '\n\n' + P.contextBlock({ channel: 'general', plays: lib.plays, lines, about: inn.about, name: inn.name });
}

async function answer(c, inn, q) {
  const tok = W.serverToken();
  const prior = (inn.history || []).filter((m) => m.role === 'user').slice(-1).map((m) => m.body).join(' ').slice(0, 300);
  const lib = await rpc(null, 'gai_wa_lookup', { p_token: tok, p_user: inn.user_id, p_q: (q + ' ' + (q.length < 60 ? prior : '')).slice(0, 500), p_limit: 8 });
  const pick = { plays: ((lib && lib.plays) || []).slice(0, 2), passages: P.pick((lib && lib.passages) || [], 7, 2) };
  return { pick, run: async (voice) => {
    const system = systemFor(voice, pick, inn);
    const msgs = (inn.history || []).map((m) => ({ role: m.role, text: String(m.body).slice(0, 3000) }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    msgs.push({ role: 'user', text: q });
    const max = voice ? 700 : 1400;
    let r;
    try { r = await AI.stream(c.pplx, c.model, system, msgs, () => {}, { max }); }
    catch (e) { if (!e.retryable) throw e; r = await AI.stream(c.pplx, AI.backup(c.model), system, msgs, () => {}, { max }); }
    return r;
  } };
}

// Library sources the answer drew on, plus any web pages, so the chat in the app shows them too.
function sourcesOf(pick, r, text) {
  const { list } = P.sourcesFor(pick.plays, pick.passages);
  const out = list.map((s) => ({ ...s, cited: false }));
  for (const pg of (r.pages || []).filter((x) => text.includes(x.url)).slice(0, 6)) {
    let host = ''; try { host = new URL(pg.url).hostname.replace(/^www\./, ''); } catch { continue; }
    out.push({ n: out.length + 1, kind: 'web', label: 'Web', title: String(pg.title || host).slice(0, 160), url: pg.url, at: host, id: null, cited: true });
  }
  return out;
}

async function handle(c, m) {
  const to = m.from; const tok = W.serverToken();
  const text = m.type === 'text' ? (m.text && m.text.body) || '' : m.type === 'button' ? (m.button && m.button.text) || '' : m.type === 'interactive' ? ((m.interactive && (m.interactive.button_reply || m.interactive.list_reply)) || {}).title || '' : '';
  const inn = await rpc(null, 'gai_wa_in', { p_token: tok, p_msg_id: m.id, p_phone: to, p_text: text || null });
  if (!inn || inn.dup) return;
  const say = (body) => W.sendText(c, to, body);
  const help = c.help ? '\n\nQuestions about access: ' + c.help : '';
  // The app's address, from the webhook request (or APP_URL), so every reply links back to the right place.
  const site = c.site; const where = site.replace(/^https?:\/\//, ''); const connect = site + '/#whatsapp';

  if (inn.status === 'none') return say('Hi, this is ' + COACH.ai + '. To chat here, connect your number first: sign in at ' + where + ', open your menu, choose Connect WhatsApp and send the code you get to this chat.\n\n' + connect);
  if (inn.status === 'bad_code') return say('That code did not work. Codes last 30 minutes and work once. Get a new one here and send it to this chat:\n\n' + connect);
  if (inn.status === 'locked') return say('Too many wrong codes from this number. Wait an hour, then get a new code here:\n\n' + connect);
  if (inn.status === 'pending') return say('Your Funnel OS access is still waiting for approval. You can chat here as soon as you are approved.' + help);
  if (inn.status !== 'approved') return say('Your Funnel OS access is paused right now.' + help);
  const voiceOn = !!(c.xi && c.voiceId && c.voiceMode !== 'off');
  const first = inn.name ? ' ' + String(inn.name).split(' ')[0] : '';
  if (inn.linked_now) return say(`You are connected${first}. Ask me anything about your business right here. Type it or send a voice note${voiceOn ? ', and I will answer voice notes with a voice note' : ''}.`);

  const isAudio = m.type === 'audio' && m.audio && m.audio.id;
  if (!isAudio && !text.trim()) return say('I can read text and voice notes here. For screenshots and files, open a chat on ' + where + ' and attach them there.\n\n' + site);
  if (!c.pplx) return say(COACH.ai + ' is paused for a moment while it is being set up. Try again a little later today.');

  W.seen(c, m.id);
  let q = text.trim().slice(0, 4000);
  if (isAudio) {
    if (!c.xi) return say('Voice notes are not switched on yet. Type your question and I will answer right away.');
    const a = await W.download(c, m.audio.id);
    q = (await W.transcribe(c.xi, a.buf, a.mime)).slice(0, 4000);
    if (!q) return say('I could not make out that voice note. Try again a little closer to the mic, or type it.');
  }
  const voice = voiceOn && (isAudio || WANTS_VOICE.test(q));

  const why = G.blocked(q);
  if (why) {
    await say(G.REFUSAL[why]);
    await rpc(null, 'gai_wa_save', { p_token: tok, p_user: inn.user_id, p_question: q, p_answer: G.REFUSAL[why], p_kind: isAudio ? 'voice' : 'text', p_sources: [] });
    return;
  }

  const A = await answer(c, inn, q);
  const r = await A.run(voice);
  let out = G.cleanAnswer(P.splitRelated(r.text).answer).text || 'I could not put a good answer together for that one. Ask it another way, or add a little more detail.';
  if (voice) {
    let sent = false;
    try {
      const audio = await W.speak(c.xi, c.voiceId, W.toSpeech(out));
      const id = await W.upload(c, audio, 'audio/ogg', 'reply.ogg');
      await W.sendVoice(c, to, id); sent = true;
    } catch (e) { console.error('[funnel-os wa voice]', e && e.message); }
    if (!sent || c.voiceMode !== 'voice') for (const part of W.chunks(W.toWa(out))) await say(part);
  } else {
    for (const part of W.chunks(W.toWa(out))) await say(part);
  }
  await rpc(null, 'gai_wa_save', { p_token: tok, p_user: inn.user_id, p_question: q, p_answer: out, p_kind: isAudio ? 'voice' : 'text', p_sources: sourcesOf(A.pick, r, out) });
}

async function handleSafe(c, m) {
  try { await handle(c, m); }
  catch (e) {
    console.error('[funnel-os wa]', e && (e.stack || e.message));
    const msg = e.code === 429 ? 'Lots of questions at once right now. Wait a few seconds and send it again.'
      : e.code === 503 && /paused|topped up|reconnect/i.test(e.message) ? e.message
      : 'That one did not come through on my side. Send it again in a minute, or ask in the app.\n\n' + c.site;
    if (c.token && c.phoneId && m.from) await W.sendText(c, m.from, msg).catch(() => {});
  }
}

module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET') {
    let ok = false; try { ok = u.searchParams.get('hub.mode') === 'subscribe' && u.searchParams.get('hub.verify_token') === W.verifyToken(); } catch { ok = false; }
    res.statusCode = ok ? 200 : 403; res.setHeader('Content-Type', 'text/plain'); return res.end(ok ? String(u.searchParams.get('hub.challenge') || '') : 'Verify token does not match. Copy it again from Members and settings in Funnel OS.');
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  const raw = await rawBody(req);
  let c;
  try { c = { ...(await config()), site: origin(req) }; } catch (e) { console.error('[funnel-os wa] not set up', e && e.message); return send(res, 200, { ok: false }); }
  if (!signed(raw, req.headers['x-hub-signature-256'], c.secret)) { CFG = null; return send(res, 401, { error: 'Signature does not match. Paste the Meta app secret again in Members and settings.' }); }
  let b = {}; try { b = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'Bad JSON' }); }
  const msgs = [];
  for (const e of b.entry || []) for (const ch of e.changes || []) {
    const v = ch.value || {};
    if (c.phoneId && v.metadata && v.metadata.phone_number_id && String(v.metadata.phone_number_id) !== String(c.phoneId)) continue;
    for (const m of v.messages || []) if (m && m.from && m.id) msgs.push(m);
  }
  const work = Promise.all(msgs.slice(0, 10).map((m) => handleSafe(c, m)));
  if (waitUntil && process.env.VERCEL) { waitUntil(work); return send(res, 200, { ok: true }); }
  await work; return send(res, 200, { ok: true });
};
module.exports.config = { maxDuration: 300 };
