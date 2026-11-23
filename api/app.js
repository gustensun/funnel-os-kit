// Everything except answers and voice: who am I, my business, conversations, the library and the admin screen.
const { bad, clip, rpc, seal, open, jwtOf, body, send, fail, crypto, origin } = require('./_lib');
const W = require('./_wa');
const { forget } = require('./_owner');

const AI = require('./_ai');

const A = {
  me: (jwt) => rpc(jwt, 'gai_me'),
  about: (jwt, b) => rpc(jwt, 'gai_about_set', { p_about: b.about || {} }),
  threads: (jwt) => rpc(jwt, 'gai_threads_list'),
  thread: (jwt, b) => rpc(jwt, 'gai_thread_get', { p_id: b.id }),
  'thread-delete': (jwt, b) => rpc(jwt, 'gai_thread_delete', { p_id: b.id }),
  library: (jwt) => rpc(jwt, 'gai_vault'),
  'admin-members': (jwt) => rpc(jwt, 'gai_admin_members'),
  // A one-time link the admin sends to a member who forgot their password.
  'admin-reset': async (jwt, b, req) => { const code = await rpc(jwt, 'gai_admin_reset_link', { p_user: b.user_id }); return { url: origin(req) + '/#set/' + code }; },
  'admin-set': (jwt, b) => rpc(jwt, 'gai_admin_set', { p_user: b.user_id, p_status: b.status }),
  'admin-settings': async (jwt, b, req) => {
    // What powers the app, by last four characters only. The key never leaves the server.
    const [settings, k] = await Promise.all([rpc(jwt, 'gai_admin_settings'), rpc(jwt, 'gai_admin_keys')]);
    const model = AI.valid(settings && settings.model) ? settings.model : AI.DEFAULT;
    const has = (p) => (k && k[p] ? k[p].last4 || 'set' : null);
    const wa = await rpc(jwt, 'gai_admin_wa');
    let verify = null; try { verify = W.verifyToken(); } catch { /* server key missing: shown as an error on save */ }
    return { settings, ai: { perplexity: has('perplexity'), elevenlabs: has('elevenlabs'), whatsapp: has('whatsapp'), whatsapp_secret: has('whatsapp_secret') }, model, models: AI.MODELS,
      wa: { ...wa, verify, webhook: origin(req) + '/api/wa' } };
  },
  // WhatsApp: check the token and phone number ID with Meta, subscribe the account to this app, then seal and save.
  'admin-wa-save': async (jwt, b) => {
    const phoneId = String(b.phone_id || '').replace(/\D/g, ''); const waba = String(b.waba_id || '').replace(/\D/g, '');
    if (!phoneId) throw bad('Paste the Phone number ID from WhatsApp, API Setup in your Meta app.', 400, { label: 'Open Meta apps', href: 'https://developers.facebook.com/apps' });
    let token = String(b.token || '').trim(); const secret = String(b.secret || '').trim();
    if (!token) { const c = await rpc(jwt, 'gai_admin_key_get', { p_provider: 'whatsapp' }); if (c) token = open(c); }
    if (!token) throw bad('Paste the permanent access token first.', 400, { label: 'Open system users', href: 'https://business.facebook.com/settings/system-users' });
    if (secret && !/^[a-f0-9]{32}$/i.test(secret)) throw bad('That does not look like an app secret. Copy it from App settings, Basic in your Meta app, under App secret.', 400, { label: 'Open Meta apps', href: 'https://developers.facebook.com/apps' });
    if (!secret && !(await rpc(jwt, 'gai_admin_keys')).whatsapp_secret) throw bad('Paste the Meta app secret too. It proves messages really come from WhatsApp.', 400, { label: 'Open Meta apps', href: 'https://developers.facebook.com/apps' });
    const info = await W.phoneInfo(token, phoneId);
    let subscribed = null;
    if (waba) { try { await W.subscribe(token, waba); subscribed = true; } catch (e) { throw bad('The number checked out, but the WhatsApp Business Account ID did not. Copy it from WhatsApp, API Setup in your Meta app, or leave it empty. ' + e.message, 400, e.fix); } }
    await rpc(jwt, 'gai_admin_key_set', { p_provider: 'whatsapp', p_ciphertext: seal(token), p_last4: token.slice(-4) });
    if (secret) await rpc(jwt, 'gai_admin_key_set', { p_provider: 'whatsapp_secret', p_ciphertext: seal(secret), p_last4: secret.slice(-4) });
    const set = (k, v) => rpc(jwt, 'gai_admin_setting_set', { p_key: k, p_value: v || '' });
    await set('wa_phone_id', phoneId); await set('wa_waba_id', waba);
    await set('wa_number', String(info.display_phone_number || '').replace(/\D/g, '')); await set('wa_name', clip(info.verified_name, 120));
    await rpc(jwt, 'gai_admin_wa_server', { p_hash: crypto.createHash('sha256').update(W.serverToken()).digest('hex') });
    return { number: info.display_phone_number || null, name: info.verified_name || null, subscribed };
  },
  'admin-wa-remove': async (jwt) => {
    for (const p of ['whatsapp', 'whatsapp_secret']) await rpc(jwt, 'gai_admin_key_set', { p_provider: p, p_ciphertext: '' });
    for (const k of ['wa_phone_id', 'wa_waba_id', 'wa_number', 'wa_name']) await rpc(jwt, 'gai_admin_setting_set', { p_key: k, p_value: '' });
    return true;
  },
  // ElevenLabs: check the key by listing the account's voices, then seal and save. An empty key removes it.
  'admin-xi-key': async (jwt, b) => {
    const k = String(b.key || '').trim();
    await rpc(jwt, 'gai_admin_keys');
    const list = k ? await W.voices(k) : [];
    await rpc(jwt, 'gai_admin_key_set', { p_provider: 'elevenlabs', p_ciphertext: k ? seal(k) : '', p_last4: k ? k.slice(-4) : '' });
    return { voices: list };
  },
  'admin-voices': async (jwt) => { const c = await rpc(jwt, 'gai_admin_key_get', { p_provider: 'elevenlabs' }); if (!c) throw bad('Add the ElevenLabs key first.', 400); return { voices: await W.voices(open(c)) }; },
  // A short sample in the chosen voice, so the admin hears it before members do.
  'admin-voice-test': async (jwt, b) => {
    const c = await rpc(jwt, 'gai_admin_key_get', { p_provider: 'elevenlabs' }); if (!c) throw bad('Add the ElevenLabs key first.', 400);
    if (!/^[A-Za-z0-9]{6,40}$/.test(String(b.voice_id || ''))) throw bad('Pick a voice first.', 400);
    const mp3 = await W.speak(open(c), b.voice_id, clip(b.text, 300) || 'Hey, it is me. Send me a voice note any time you get stuck, and I will walk you through the next step.', false);
    return { audio: 'data:audio/mpeg;base64,' + mp3.toString('base64') };
  },
  // Members: connect a WhatsApp number with a one-time code.
  'wa-me': (jwt) => rpc(jwt, 'gai_wa_me'),
  'wa-code': (jwt) => rpc(jwt, 'gai_wa_code'),
  'wa-unlink': (jwt) => rpc(jwt, 'gai_wa_unlink'),
  // Save, check and seal the Perplexity key. An empty key removes it.
  'admin-key': async (jwt, b) => {
    const k = String(b.key || '').trim();
    await rpc(jwt, 'gai_admin_keys');
    if (k) await AI.check(k);
    const r = await rpc(jwt, 'gai_admin_key_set', { p_provider: 'perplexity', p_ciphertext: k ? seal(k) : '', p_last4: k ? k.slice(-4) : '' });
    forget(); return r;
  },
  'admin-setting': async (jwt, b) => {
    if (b.key === 'model' && !AI.valid(b.value)) throw bad('Pick one of the listed models.', 400);
    const r = await rpc(jwt, 'gai_admin_setting_set', { p_key: b.key, p_value: clip(b.value, 600) || '' }); forget(); return r;
  },
};

// Before sign-in: create an account, open a password link, and the help link for people without access.
const OPEN = {
  signup: (b) => rpc(null, 'gai_signup', { p_email: clip(b.email, 200) || '', p_password: String(b.password || ''), p_name: clip(b.name, 80) || '' }),
  code: (b) => rpc(null, 'gai_code_check', { p_code: String(b.code || '').slice(0, 80) }),
  'set-password': (b) => rpc(null, 'gai_set_password', { p_code: String(b.code || '').slice(0, 80), p_password: String(b.password || '') }),
  public: () => rpc(null, 'gai_public'),
};

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') throw bad('Use POST', 405);
    const b = await body(req);
    if (OPEN[b.action]) return send(res, 200, { data: await OPEN[b.action](b) });
    const jwt = jwtOf(req);
    const fn = A[b.action]; if (!fn) throw bad('Unknown action', 400);
    send(res, 200, { data: await fn(jwt, b, req) });
  } catch (e) { fail(res, e); }
};
