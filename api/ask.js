// Ask the AI coach. Streams newline-delimited JSON: meta (sources), delta (text), done (saved thread), error (what to do).
// voice: true returns one short spoken answer as plain JSON and saves nothing.
const { bad, clip, rpc, jwtOf, body, send, fail, COACH } = require('./_lib');
const { owner } = require('./_owner');
const AI = require('./_ai');
const P = require('./_prompt');
const G = require('../js/coach-guard.js');
const { byId } = require('../js/channels.js');

const IMG = /^image\/(png|jpe?g|webp|gif)$/;

function readFiles(files) {
  const images = []; const texts = []; const meta = [];
  for (const f of (Array.isArray(files) ? files : []).slice(0, 4)) {
    const name = clip(f && f.name, 120) || 'file';
    if (f && f.data && IMG.test(f.type || '')) {
      if (images.length >= 3) continue;
      if (String(f.data).length > 3_000_000) throw bad(name + ' is too large. Use a screenshot under 2 MB, or crop it, and attach it again.', 413);
      images.push({ media_type: f.type === 'image/jpg' ? 'image/jpeg' : f.type, data: String(f.data) }); meta.push({ name, kind: 'image' });
    } else if (f && typeof f.text === 'string' && f.text.trim()) {
      texts.push({ name, text: f.text.slice(0, 24000) }); meta.push({ name, kind: 'text' });
    }
  }
  return { images, texts, meta };
}

// The owner's Perplexity key and the model the admin picked.
async function keys(jwt) {
  const p = await owner('perplexity', jwt);
  if (!p || !p.key) throw bad(COACH.ai + ' has no AI connected yet. The admin adds the Perplexity key in Members and settings, so try again a little later.', 503, { label: 'Add the Perplexity key', href: '/#admin', admin: true });
  const m = p.meta && p.meta.model;
  return { key: p.key, model: AI.valid(m) ? m : AI.DEFAULT };
}

// Access first, then the library: the library is only read for approved members.
async function gate(jwt, log = 'ask') { await rpc(jwt, 'gai_check', { p_log: log }); return rpc(jwt, 'gai_me'); }

async function lookup(jwt, q, prior, channel) {
  let j = await rpc(jwt, 'gai_lookup', { p_q: (q + ' ' + (prior || '')).slice(0, 500), p_limit: 8 });
  let plays = (j && j.plays) || []; let passages = (j && j.passages) || [];
  // Too little to go on: widen with the channel's own topic words.
  if (!plays.length && passages.length < 2 && channel !== 'general') {
    const k = await rpc(jwt, 'gai_lookup', { p_q: (q + ' ' + byId(channel).hint).slice(0, 500), p_limit: 8 }).catch(() => null);
    if (k && k.passages && k.passages.length > passages.length) { passages = k.passages; plays = k.plays || plays; }
  }
  return { plays: plays.slice(0, 2), passages: P.pick(passages, 7, 2) };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  let jwt, b;
  try { jwt = jwtOf(req); b = await body(req); } catch (e) { return fail(res, e); }
  const q = String(b.q || '').slice(0, 8000).trim();
  const channel = byId(b.channel).id;
  let files;
  try { files = readFiles(b.files); } catch (e) { return fail(res, e); }
  if (!q && !files.meta.length) return fail(res, bad('Type a question or attach a file first.', 400));

  // Voice: one short spoken answer, nothing saved, nothing shown.
  if (b.voice) {
    try {
      const why = G.blocked(q);
      if (why) return send(res, 200, { answer: G.REFUSAL[why] });
      const [me, lib, k] = await Promise.all([gate(jwt, 'talk'), lookup(jwt, q, '', channel), keys(jwt)]);
      const { lines } = P.sourcesFor(lib.plays, lib.passages);
      const sys = P.SYSTEM.split('\n\n').slice(0, 7).join('\n\n') + '\n\nThis answer will be spoken aloud on a call. Two to five plain spoken sentences, no lists, no markdown, no citations, no follow-up questions section.\n\n' + P.contextBlock({ channel, plays: lib.plays, lines, about: me.about, name: me.name });
      const r = await AI.quick(k.key, sys, [{ role: 'user', text: q }], 600);
      const out = G.cleanAnswer(P.splitRelated(r.text).answer.replace(/\[\d+\]/g, '')).text;
      return send(res, 200, { answer: out || 'I could not find a good answer to that one. Ask it another way.' });
    } catch (e) { return fail(res, e); }
  }

  // Streamed answer.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Accel-Buffering', 'no');
  const out = (o) => { try { res.write(JSON.stringify(o) + '\n'); } catch { /* client left */ } };
  let closed = false; req.on && req.on('close', () => { closed = true; });

  try {
    const thread = b.thread_id ? await rpc(jwt, 'gai_thread_get', { p_id: b.thread_id }).catch(() => null) : null;
    const history = ((thread && thread.messages) || []).slice(-8);
    const prior = history.filter((m) => m.role === 'user').slice(-1).map((m) => m.body).join(' ').slice(0, 300);

    const why = G.blocked(q);
    if (why) {
      const answer = G.REFUSAL[why];
      out({ type: 'meta', sources: [], by: null });
      out({ type: 'delta', text: answer });
      const id = await rpc(jwt, 'gai_save_turn', { p_thread: thread ? thread.id : null, p_channel: channel, p_mode: 'ask', p_question: q, p_answer: answer, p_sources: [], p_related: [], p_files: files.meta });
      out({ type: 'done', thread_id: id, related: [], sources: [] });
      return res.end();
    }

    const [me, lib, k] = await Promise.all([gate(jwt), lookup(jwt, q || files.meta.map((f) => f.name).join(' '), q.length < 60 ? prior : '', channel), keys(jwt)]);
    const { list, lines } = P.sourcesFor(lib.plays, lib.passages);
    const ctx = P.contextBlock({ channel, plays: lib.plays, lines, about: me.about, files: files.texts, name: me.name });
    const system = P.SYSTEM + '\n\n' + ctx;
    const msgs = history.map((m) => ({ role: m.role, text: m.role === 'assistant' ? String(m.body).slice(0, 6000) : String(m.body).slice(0, 4000) }));
    // Claude needs the conversation to start with the member.
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    msgs.push({ role: 'user', text: (q || 'Review the attached ' + (files.meta.length > 1 ? 'files' : 'file') + ' and tell me what to fix first.'), images: files.images });

    out({ type: 'meta', sources: list, by: AI.nameOf(k.model) });

    // Hold back the tail of the stream so the follow-up marker never flashes on screen.
    let shown = ''; let raw = ''; let hidden = false;
    const push = (t) => {
      raw += t; if (hidden || closed) return;
      const i = raw.indexOf(P.MARK);
      if (i >= 0) { hidden = true; const rest = raw.slice(shown.length, i); if (rest) out({ type: 'delta', text: rest }); shown = raw.slice(0, i); return; }
      const safe = raw.length - P.MARK.length; if (safe > shown.length) { out({ type: 'delta', text: raw.slice(shown.length, safe) }); shown = raw.slice(0, safe); }
    };
    let r;
    try { r = await AI.stream(k.key, k.model, system, msgs, push, { max: 2600 }); }
    catch (e) {
      if (!(e.retryable && !raw)) throw e;
      const alt = AI.backup(k.model);
      out({ type: 'meta', sources: list, by: AI.nameOf(alt) });
      r = await AI.stream(k.key, alt, system, msgs, push, { max: 2600 });
    }
    if (!hidden && raw.length > shown.length) { const tail = raw.slice(shown.length).split(P.MARK)[0]; if (tail) out({ type: 'delta', text: tail }); }

    const split = P.splitRelated(raw);
    const clean = G.cleanAnswer(split.answer);
    let answer = clean.text || 'I could not put a good answer together for that one. Ask it another way, or add a little more detail.';
    if (r.stop === 'max_tokens') answer += '\n\nThat ran long, so I stopped here. Say "keep going" and I will finish it.';
    const used = new Set((answer.match(/\[(\d+)\]/g) || []).map((m) => +m.slice(1, -1)));
    const sources = list.map((s) => ({ ...s, cited: used.has(s.n) }));
    // Web pages the answer links to, listed after the library sources.
    for (const pg of (r.pages || []).filter((x) => answer.includes(x.url)).slice(0, 6)) {
      let host = ''; try { host = new URL(pg.url).hostname.replace(/^www\./, ''); } catch { continue; }
      sources.push({ n: sources.length + 1, kind: 'web', label: 'Web', title: String(pg.title || host).slice(0, 160), url: pg.url, at: host, id: null, cited: true });
    }
    const id = await rpc(jwt, 'gai_save_turn', { p_thread: thread ? thread.id : null, p_channel: channel, p_mode: 'ask', p_question: q || '(shared ' + files.meta.map((f) => f.name).join(', ') + ')', p_answer: answer, p_sources: sources, p_related: split.related, p_files: files.meta });
    out({ type: 'done', thread_id: id, answer: answer !== split.answer || r.stop === 'max_tokens' ? answer : undefined, related: split.related, sources, by: r.by });
    res.end();
  } catch (e) {
    if (e.code >= 500 && !e.setup) console.error('[funnel-os ask]', e && e.stack || e);
    out({ type: 'error', error: e.message || 'The answer did not come through. Ask again.', fix: e.fix || null, setup: !!e.setup, code: e.code || 500 });
    res.end();
  }
};
module.exports.config = { maxDuration: 300 };
