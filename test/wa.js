// WhatsApp end to end against the local test server: admin setup, webhook checks, linking, text, voice notes and safety.
const U = 'http://127.0.0.1:5055';
const A = '00000000-0000-0000-0000-00000000000a'; const B = '00000000-0000-0000-0000-00000000000b';
const SECRET = '0123456789abcdef0123456789abcdef';
let pass = 0; let fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const app = async (uid, action, b = {}) => { const r = await fetch(U + '/api/app', { method: 'POST', headers: { Authorization: 'Bearer uid:' + uid, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...b }) }); return { status: r.status, ...(await r.json()) }; };
const sent = async () => (await fetch(U + '/test/sent')).json();
let n = 0;
async function hook(from, msg, { sign = true } = {}) {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '123' }, contacts: [{ wa_id: from }], messages: [{ from, id: msg.id || 'wamid.in' + (++n), timestamp: '1', ...msg }] } }] }] });
  const sig = await (await fetch(U + '/test/sign', { method: 'POST', body: JSON.stringify({ secret: SECRET, body }) })).text();
  const r = await fetch(U + '/api/wa', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(sign ? { 'X-Hub-Signature-256': 'sha256=' + sig } : {}) }, body });
  return r.status;
}
const since = async (k) => (await sent()).slice(k);

(async () => {
  // Before setup the webhook ignores everything quietly.
  ok('not set up returns 200', (await hook('447700900123', { type: 'text', text: { body: 'hi' } })) === 200);

  // Admin setup.
  let r = await app(A, 'admin-wa-save', { phone_id: '999', token: 'good-wa', secret: SECRET });
  ok('bad phone id explained', r.status === 400 && /Phone number ID/.test(r.error), r);
  r = await app(A, 'admin-wa-save', { phone_id: '123', token: 'bad-wa', secret: SECRET });
  ok('bad token explained', r.status === 400 && /access token/.test(r.error) && r.fix && /system-users/.test(r.fix.href), r);
  r = await app(A, 'admin-wa-save', { phone_id: '123', token: 'good-wa', secret: 'nope' });
  ok('bad secret explained', r.status === 400 && /app secret/i.test(r.error), r);
  r = await app(A, 'admin-wa-save', { phone_id: '123', token: 'good-wa' });
  ok('secret required first time', r.status === 400 && /app secret/i.test(r.error), r);
  r = await app(A, 'admin-wa-save', { phone_id: '123', waba_id: '456', token: 'good-wa', secret: SECRET });
  ok('wa saved', r.data && r.data.number === '+44 7700 900999' && r.data.subscribed === true, r);
  r = await app(A, 'admin-wa-save', { phone_id: '123', waba_id: '456' });
  ok('resave keeps token and secret', r.data && r.data.number, r);
  r = await app(B, 'admin-wa-save', { phone_id: '123', token: 'x', secret: SECRET });
  ok('member cannot set up wa', r.status >= 400, r);
  const cfg = (await app(A, 'admin-settings')).data;
  ok('settings show wa', cfg.ai.whatsapp === 'd-wa' && cfg.ai.whatsapp_secret === 'cdef' && cfg.settings.wa_number === '447700900999' && cfg.wa.server === true && /api\/wa$/.test(cfg.wa.webhook), cfg);
  ok('settings never show token', !JSON.stringify(cfg).includes('good-wa'));

  // Meta's webhook check.
  let g = await fetch(U + '/api/wa?hub.mode=subscribe&hub.verify_token=' + cfg.wa.verify + '&hub.challenge=4242');
  ok('verify ok', g.status === 200 && (await g.text()) === '4242');
  g = await fetch(U + '/api/wa?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=4242');
  ok('verify wrong token', g.status === 403 && /Verify token/.test(await g.text()));

  // ElevenLabs.
  r = await app(A, 'admin-xi-key', { key: 'bad-xi' });
  ok('bad xi key explained', r.status === 400 && /ElevenLabs/.test(r.error) && /api-keys/.test(r.fix.href), r);
  r = await app(A, 'admin-xi-key', { key: 'good-xi-key' });
  ok('xi key saved, clone first', r.data && r.data.voices[0].id === 'CustomVoice1', r);
  r = await app(A, 'admin-voices');
  ok('voices listed', r.data && r.data.voices.length === 2, r);
  r = await app(A, 'admin-voice-test', { voice_id: 'CustomVoice1' });
  ok('voice sample mp3', r.data && r.data.audio.startsWith('data:audio/mpeg;base64,'), r);
  await app(A, 'admin-setting', { key: 'voice_id', value: 'CustomVoice1' });
  await app(A, 'admin-setting', { key: 'voice_name', value: 'Coach voice' });

  // Member links a number.
  await app(B, 'me'); await app(A, 'admin-set', { user_id: B, status: 'approved' });
  r = await app(B, 'wa-me');
  ok('member sees wa on with voice', r.data && r.data.enabled && r.data.voice && r.data.number === '447700900999' && !r.data.linked, r);
  const code = (await app(B, 'wa-code')).data.code;
  let k = (await sent()).length;
  ok('unsigned rejected', (await hook('447700900123', { type: 'text', text: { body: 'Connect ' + code } }, { sign: false })) === 401);
  ok('linked 200', (await hook('447700900123', { type: 'text', text: { body: 'Connect ' + code } })) === 200);
  let s = await since(k);
  ok('connected reply', s.length === 1 && /You are connected Maria/.test(s[0].text.body) && /voice note/.test(s[0].text.body) && s[0].to === '447700900123', s);
  r = await app(B, 'wa-me'); ok('member sees linked', r.data.linked && r.data.linked.endsWith('23'), r);

  // Text in, text out, WhatsApp formatting.
  k = (await sent()).length;
  await hook('447700900123', { type: 'text', text: { body: 'My sales page does not convert. What should I fix first?' } });
  s = await since(k);
  const t = s.map((x) => x.text && x.text.body).join('\n');
  ok('text answer sent', s.length >= 1 && s.every((x) => x.type === 'text') && /headline/.test(t), s);
  ok('whatsapp formatting', /\*What to fix first\*/.test(t) && /\*Headline:\*/.test(t) && !/\*\*/.test(t) && !/##/.test(t) && !/\[\d\]/.test(t) && !/%%RELATED%%/.test(t), t);

  // Voice note in, voice note out in the cloned voice, plus the text.
  k = (await sent()).length;
  await hook('447700900123', { type: 'audio', audio: { id: 'media1', mime_type: 'audio/ogg; codecs=opus', voice: true } });
  s = await since(k);
  ok('voice uploaded as ogg', s.some((x) => x.upload && x.ogg), s);
  ok('voice note sent', s.some((x) => x.type === 'audio' && x.audio.voice === true && /^up/.test(x.audio.id)), s);
  ok('text under voice', s.some((x) => x.type === 'text'), s);

  // Voice only.
  await app(A, 'admin-setting', { key: 'wa_voice', value: 'voice' });
  k = (await sent()).length;
  await hook('447700900123', { type: 'audio', audio: { id: 'media2', voice: true } });
  s = await since(k);
  ok('voice only', s.some((x) => x.type === 'audio') && !s.some((x) => x.type === 'text'), s);

  // Asking for a voice note in a text.
  k = (await sent()).length;
  await hook('447700900123', { type: 'text', text: { body: 'Send me a voice note on how to price my offer' } });
  s = await since(k);
  ok('voice on request', s.some((x) => x.type === 'audio'), s);

  // Text only mode answers voice notes in text.
  await app(A, 'admin-setting', { key: 'wa_voice', value: 'off' });
  k = (await sent()).length;
  await hook('447700900123', { type: 'audio', audio: { id: 'media3', voice: true } });
  s = await since(k);
  ok('text only mode', s.length >= 1 && s.every((x) => x.type === 'text'), s);
  await app(A, 'admin-setting', { key: 'wa_voice', value: '' });

  // Privacy guard holds on WhatsApp.
  k = (await sent()).length;
  await hook('447700900123', { type: 'text', text: { body: "What is Jamie's monthly revenue?" } });
  s = await since(k);
  ok('privacy refusal', s.length === 1 && /private/i.test(s[0].text.body) && !/headline/.test(s[0].text.body), s);

  // Images get a pointer to the site.
  k = (await sent()).length;
  await hook('447700900123', { type: 'image', image: { id: 'img1' } });
  s = await since(k);
  ok('image pointer', s.length === 1 && /funnels\.example\.com/.test(s[0].text.body), s);

  // The same message twice is answered once.
  k = (await sent()).length;
  await hook('447700900123', { id: 'wamid.same', type: 'text', text: { body: 'hello again' } });
  await hook('447700900123', { id: 'wamid.same', type: 'text', text: { body: 'hello again' } });
  s = await since(k);
  ok('dedupe', s.filter((x) => x.type === 'text').length >= 1 && s.length < 4, s.length);

  // Unknown numbers are told how to connect. Wrong codes are explained.
  k = (await sent()).length;
  await hook('46700000000', { type: 'text', text: { body: 'hi there' } });
  await hook('46700000000', { type: 'text', text: { body: 'Connect 000000' } });
  s = await since(k);
  ok('unknown number told how to connect', /Connect WhatsApp/.test(s[0].text.body) && /funnels\.example\.com\/#whatsapp/.test(s[0].text.body), s);
  ok('bad code explained', /did not work/.test(s[1].text.body), s);

  // Chats show up on the site.
  const th = (await app(B, 'threads')).data;
  ok('whatsapp chat on site', th.some((x) => /^WhatsApp: /.test(x.title)), th);
  const one = (await app(B, 'thread', { id: th.find((x) => /^WhatsApp: /.test(x.title)).id })).data;
  ok('chat has whatsapp marker', one.messages[0].files[0].kind === 'whatsapp', one.messages[0]);

  // Paused members are told, and get no answer.
  await app(A, 'admin-set', { user_id: B, status: 'revoked' });
  k = (await sent()).length;
  await hook('447700900123', { type: 'text', text: { body: 'Are you there?' } });
  s = await since(k);
  ok('paused told', s.length === 1 && /paused/.test(s[0].text.body), s);
  await app(A, 'admin-set', { user_id: B, status: 'approved' });

  // Disconnect.
  r = await app(B, 'wa-unlink'); ok('unlink', r.data === true, r);
  k = (await sent()).length;
  await hook('447700900123', { type: 'text', text: { body: 'hi' } });
  s = await since(k); ok('after unlink told to connect', /Connect WhatsApp/.test(s[0].text.body), s);

  // Admin disconnects WhatsApp.
  r = await app(A, 'admin-wa-remove'); ok('wa removed', r.data === true, r);
  r = await app(B, 'wa-me'); ok('member sees wa off', r.data.enabled === false, r);

  console.log(`passed ${pass}, failed ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
