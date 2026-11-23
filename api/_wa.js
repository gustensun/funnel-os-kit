// WhatsApp Cloud API and ElevenLabs helpers. Files starting with an underscore are not endpoints.
const { bad, hmac } = require('./_lib');

const GRAPH = () => process.env.WA_GRAPH_URL || 'https://graph.facebook.com/v27.0';
const XI = () => process.env.ELEVEN_BASE_URL || 'https://api.elevenlabs.io';
const TTS_MODEL = 'eleven_multilingual_v2';
const STT_MODEL = 'scribe_v3';

// The webhook proves itself to the database with this token. Only the server can derive it.
const serverToken = () => hmac('funnel-os-whatsapp-server');
// What the admin pastes into Meta as the webhook verify token.
const verifyToken = () => hmac('funnel-os-whatsapp-verify').slice(0, 32);

const ADMIN = { label: 'Open Members and settings', href: '/#/admin', admin: true };

// Meta's errors, turned into what to do next.
function metaError(status, j) {
  const e = (j && j.error) || {}; const code = e.code; const m = String(e.message || '');
  if (code === 190 || status === 401) return bad('Meta did not accept the WhatsApp access token. It may have expired. Create a permanent token for a system user in Meta Business settings and paste it again.', 400, { label: 'Open system users', href: 'https://business.facebook.com/settings/system-users' });
  if (code === 100 && /phone|does not exist|Unsupported get request|Object with ID/i.test(m)) return bad('Meta could not find that phone number ID. Copy the Phone number ID (not the phone number) from WhatsApp, API Setup in your Meta app.', 400, { label: 'Open Meta apps', href: 'https://developers.facebook.com/apps' });
  if (code === 10 || code === 200 || /permission/i.test(m)) return bad('The access token is missing a permission. Give the system user whatsapp_business_messaging and whatsapp_business_management, then create a new token.', 400, { label: 'Open system users', href: 'https://business.facebook.com/settings/system-users' });
  if (code === 131030) return bad('This number is not on the test recipient list. In API Setup, add it under "To", or move to your own business number.', 400, { label: 'Open Meta apps', href: 'https://developers.facebook.com/apps' });
  if (code === 131047) return bad('More than 24 hours passed since the member last wrote, so WhatsApp only allows template messages.', 400);
  if (code === 131056 || code === 4 || code === 80007 || status === 429) return bad('WhatsApp is rate limiting this number. Wait a minute and try again.', 429);
  const x = bad('WhatsApp said: ' + (m || 'request failed (' + status + ')') + '. Check the WhatsApp settings in Members and settings.', 502, ADMIN); x.meta = code; return x;
}

async function graph(token, path, { method = 'GET', json, form } = {}) {
  let r;
  try {
    r = await fetch(GRAPH() + path, { method, headers: { Authorization: 'Bearer ' + token, ...(json ? { 'Content-Type': 'application/json' } : {}) },
      body: json ? JSON.stringify(json) : form });
  } catch { throw bad('WhatsApp could not be reached. Try again in a minute.', 504); }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = null; }
  if (!r.ok) throw metaError(r.status, j);
  return j || {};
}

// The number behind a phone number ID, to check the token and ID together.
const phoneInfo = (token, phoneId) => graph(token, '/' + phoneId + '?fields=display_phone_number,verified_name,quality_rating');
// Sends this app's webhooks for the WhatsApp Business Account.
const subscribe = (token, wabaId) => graph(token, '/' + wabaId + '/subscribed_apps', { method: 'POST' });

const send = (c, to, payload) => graph(c.token, '/' + c.phoneId + '/messages', { method: 'POST', json: { messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload } });
const sendText = (c, to, body) => send(c, to, { type: 'text', text: { body: body.slice(0, 4096), preview_url: /https?:\/\//.test(body) } });
const sendVoice = (c, to, mediaId) => send(c, to, { type: 'audio', audio: { id: mediaId, voice: true } });
// Blue ticks plus "typing..." while the answer is written. Best effort.
const seen = (c, msgId) => graph(c.token, '/' + c.phoneId + '/messages', { method: 'POST', json: { messaging_product: 'whatsapp', status: 'read', message_id: msgId, typing_indicator: { type: 'text' } } }).catch(() => null);

async function upload(c, buf, mime, name) {
  const f = new FormData();
  f.append('messaging_product', 'whatsapp'); f.append('type', mime);
  f.append('file', new Blob([buf], { type: mime }), name);
  const j = await graph(c.token, '/' + c.phoneId + '/media', { method: 'POST', form: f });
  if (!j.id) throw bad('WhatsApp did not accept the voice note upload.', 502);
  return j.id;
}

async function download(c, mediaId) {
  const m = await graph(c.token, '/' + mediaId);
  if (!m.url) throw bad('WhatsApp did not share the voice note.', 502);
  if (m.file_size && m.file_size > 16 * 1024 * 1024) throw bad('That voice note is too long.', 413);
  let r; try { r = await fetch(m.url, { headers: { Authorization: 'Bearer ' + c.token } }); } catch { throw bad('The voice note could not be downloaded.', 504); }
  if (!r.ok) throw bad('The voice note could not be downloaded.', 502);
  return { buf: Buffer.from(await r.arrayBuffer()), mime: (m.mime_type || 'audio/ogg').split(';')[0] };
}

// ---------- ElevenLabs ----------
function xiError(status, t) {
  const KEYS = { label: 'Open ElevenLabs API keys', href: 'https://elevenlabs.io/app/settings/api-keys' };
  if (status === 401 && /missing_permissions|permission/i.test(t)) return bad('This ElevenLabs key is missing a permission. Create a key with Text to Speech, Speech to Text and Voices read access, then paste it again.', 400, KEYS);
  if (status === 401 || status === 403) return bad('ElevenLabs did not accept this key. Copy a fresh key from your ElevenLabs API keys and paste it again.', 400, KEYS);
  if (status === 402 || /quota|credits|exceeded/i.test(t)) return bad('The ElevenLabs account is out of credits. Upgrade or top up the plan, then try again.', 402, { label: 'Open ElevenLabs billing', href: 'https://elevenlabs.io/app/subscription' });
  if (status === 404 || /voice_not_found/i.test(t)) return bad('That voice was not found in the ElevenLabs account. Pick your voice again in Members and settings.', 404, ADMIN);
  if (status === 429) return bad('ElevenLabs is busy right now. Wait a few seconds and try again.', 429);
  return bad('ElevenLabs did not respond as expected (' + status + '). Try again in a minute.', 502);
}
async function xi(key, path, opt = {}) {
  let r;
  try { r = await fetch(XI() + path, { ...opt, headers: { 'xi-api-key': key, ...(opt.headers || {}) } }); }
  catch { throw bad('ElevenLabs could not be reached. Try again in a minute.', 504); }
  if (!r.ok) { const t = await r.text().catch(() => ''); throw xiError(r.status, t); }
  return r;
}

// Voices in the account, cloned voices first.
async function voices(key) {
  const j = await (await xi(key, '/v1/voices')).json();
  const rank = { cloned: 0, professional: 1, generated: 2 };
  return (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, kind: v.category || 'premade', preview: v.preview_url || null }))
    .sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.name.localeCompare(b.name));
}

// Speech in the cloned voice. ogg = an Ogg Opus voice note for WhatsApp, otherwise mp3 for the browser.
async function speak(key, voiceId, text, ogg = true) {
  const fmt = ogg ? 'opus_48000_64' : 'mp3_44100_128';
  const r = await xi(key, '/v1/text-to-speech/' + encodeURIComponent(voiceId) + '?output_format=' + fmt, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: ogg ? 'audio/ogg' : 'audio/mpeg' },
    body: JSON.stringify({ text: text.slice(0, 2500), model_id: TTS_MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true } }) });
  const buf = Buffer.from(await r.arrayBuffer());
  if (ogg && buf.subarray(0, 4).toString('latin1') !== 'OggS') throw bad('ElevenLabs returned audio WhatsApp cannot play as a voice note.', 502);
  return buf;
}

async function transcribe(key, buf, mime) {
  const f = new FormData();
  f.append('model_id', STT_MODEL); f.append('tag_audio_events', 'false'); f.append('timestamps_granularity', 'none');
  f.append('file', new Blob([buf], { type: mime || 'audio/ogg' }), 'voice.ogg');
  const j = await (await xi(key, '/v1/speech-to-text', { method: 'POST', body: f })).json();
  return String((j && j.text) || '').trim();
}

// ---------- formatting ----------
// Markdown from the model to WhatsApp's own formatting.
function toWa(md) {
  return String(md || '')
    .replace(/\s?\[\d+\](?!\()/g, '')
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
    .replace(/__([^_\n]+)__/g, '_$1_')
    .replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, '$1: $2')
    .replace(/^\s*[-*•]\s+/gm, '- ')
    .replace(/`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}
// Plain words for the voice: no markdown, no links, no citation numbers.
function toSpeech(md) {
  return String(md || '')
    .replace(/\s?\[\d+\](?!\()/g, '')
    .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
}
// WhatsApp caps a text at 4096 characters. Split on paragraphs.
function chunks(text, max = 3900) {
  const out = []; let cur = '';
  for (const p of String(text).split('\n\n')) {
    if ((cur + '\n\n' + p).length > max && cur) { out.push(cur); cur = p; } else cur = cur ? cur + '\n\n' + p : p;
    while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur) out.push(cur);
  return out;
}

module.exports = { GRAPH, serverToken, verifyToken, phoneInfo, subscribe, sendText, sendVoice, seen, upload, download, voices, speak, transcribe, toWa, toSpeech, chunks, metaError };
