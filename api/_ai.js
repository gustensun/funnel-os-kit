// Model calls, all through one Perplexity key. The Agent API reaches Claude, GPT, Gemini and Grok and can search the web.
const { bad, COACH } = require('./_lib');

const BASE = () => process.env.PPLX_BASE_URL || 'https://api.perplexity.ai';
// The models the admin can pick from. The first is the default.
const MODELS = [
  { id: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5', note: 'Best coaching answers' },
  { id: 'openai/gpt-6.1-sol', name: 'GPT-6.1 Sol', note: 'Strong and a little cheaper' },
  { id: 'google/gemini-4-carbon', name: 'Gemini 4 Carbon', note: 'Fast, good with long files' },
  { id: 'xai/grok-4.7', name: 'Grok 4.7', note: 'Direct and quick' },
  { id: 'anthropic/claude-sonnet-5-5', name: 'Claude Sonnet 5.5', note: 'Lower cost' },
];
const DEFAULT = MODELS[0].id;
const FAST = 'anthropic/claude-sonnet-5-5'; // short spoken answers
const nameOf = (id) => (MODELS.find((m) => m.id === id) || { name: String(id || '').split('/').pop() }).name;
const valid = (id) => MODELS.some((m) => m.id === id);
// If the chosen model fails before saying anything, the next one answers instead.
const backup = (id) => (id.startsWith('openai/') ? DEFAULT : 'openai/gpt-6.1-sol');

const FIX = { label: 'Open Members and settings', href: '/#admin', admin: true };
function apiError(status, t) {
  if (status === 401 || status === 403) return bad('The Perplexity key behind ' + COACH.ai + ' stopped working. The admin needs to reconnect it in Members and settings. Try again later today.', 503, FIX);
  if (status === 402 || /credit|billing|balance|insufficient|quota/i.test(t)) return bad(COACH.ai + ' is paused for a moment while the AI account is topped up. Try again later today.', 503, FIX);
  if (status === 429 || /rate|overloaded/i.test(t)) return bad(COACH.ai + ' is busy right now. Wait a few seconds and ask again.', 429);
  return bad('The answer did not come through. Ask again, and if it keeps happening, shorten the question or remove large files.', 502);
}

// messages: [{ role, text, images?: [{ media_type, data }] }]
const input = (msgs) => msgs.map((m) => ({ type: 'message', role: m.role, content: m.role === 'assistant' ? [{ type: 'output_text', text: m.text || ' ' }]
  : [...(m.images || []).map((im) => ({ type: 'input_image', image_url: `data:${im.media_type};base64,${im.data}` })), { type: 'input_text', text: m.text || ' ' }] }));

const WEB = { type: 'web_search' };
const textOf = (resp) => (resp && (resp.output_text || (resp.output || []).filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join(''))) || '';
// Web pages the model read, from search result items and link annotations.
function pagesOf(resp, into) {
  for (const o of (resp && resp.output) || []) {
    if (o.type === 'search_results') for (const r of o.results || []) if (r && r.url) into.set(r.url, { title: r.title || r.url, url: r.url, at: r.date || null });
    if (o.type === 'message') for (const c of o.content || []) for (const a of c.annotations || []) if (a && a.url) into.set(a.url, into.get(a.url) || { title: a.title || a.url, url: a.url, at: null });
  }
}

// Extra request fields: how hard the model thinks first, and a JSON schema the answer has to match.
// Thinking uses output tokens, so the allowance grows with it.
const THINK = { minimal: 1000, low: 4000, medium: 10000, high: 24000, xhigh: 32000 };
const room = (max, reasoning) => max + 4000 + (THINK[reasoning] || 0);
function extras({ reasoning, format } = {}) {
  const o = {};
  if (reasoning) o.reasoning = { effort: reasoning };
  if (format && format.schema) o.response_format = { type: 'json_schema', json_schema: { name: format.name, schema: format.schema } };
  return o;
}

// Streams the answer token by token. onText gets each new piece of text.
async function stream(key, model, system, msgs, onText, { max = 2600, web = true, signal, tools, steps, reasoning, format } = {}) {
  let r;
  try {
    r = await fetch(BASE() + '/v1/agent', { method: 'POST', signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ model, instructions: system, input: input(msgs), stream: true, max_output_tokens: room(max, reasoning), ...(tools ? { tools } : web ? { tools: [WEB] } : {}), ...(steps ? { max_steps: steps } : {}), ...extras({ reasoning, format }) }) });
  } catch (x) { if (signal && signal.aborted) throw x; const e = bad(COACH.ai + ' could not reach the AI service. Check your connection and ask again.', 504); e.retryable = true; throw e; }
  if (!r.ok || !r.body) { const t = await r.text().catch(() => ''); const e = apiError(r.status, t); e.status = r.status; e.retryable = r.status >= 500 || r.status === 429 || r.status === 404 || r.status === 400; e.raw = t.slice(0, 300); throw e; }
  const dec = new TextDecoder(); let buf = ''; let full = ''; let stop = null; const pages = new Map();
  const handle = (ev) => {
    if (ev.type === 'response.output_text.delta' && typeof ev.delta === 'string') { full += ev.delta; onText(ev.delta); }
    else if (ev.type === 'response.output_item.done' && ev.item) pagesOf({ output: [ev.item] }, pages);
    else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') {
      pagesOf(ev.response, pages);
      const why = ev.response && ev.response.incomplete_details && ev.response.incomplete_details.reason;
      if (ev.type === 'response.incomplete' || /max_output_tokens|max_tokens/.test(why || '')) stop = 'max_tokens';
      if (!full) { const t = textOf(ev.response); if (t) { full = t; onText(t); } }
    } else if (ev.type === 'response.failed' || ev.type === 'error') {
      const info = JSON.stringify((ev.response && ev.response.error) || ev.error || ev);
      const e = apiError(/auth|api key|unauthor/i.test(info) ? 401 : 500, info); e.retryable = !full; throw e;
    }
  };
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data || data === '[DONE]') continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      handle(ev);
    }
  }
  return { text: full, stop, model, by: nameOf(model), pages: [...pages.values()] };
}

// Background jobs: Perplexity keeps writing on its side while each function run checks in, so a long page
// is written in one piece however many runs it takes. start() returns { id, status } and, when the job
// already finished, its text. poll() returns { status, text, stop, pages, error }.
async function call(key, path, method, body, ms = 45000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  let r;
  try { r = await fetch(BASE() + path, { method, signal: ctl.signal, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  catch { clearTimeout(t); const e = bad('Funnel OS could not reach the AI service. It tries again on the next run.', 504); e.retryable = true; e.status = 0; throw e; }
  clearTimeout(t);
  const txt = await r.text().catch(() => '');
  if (!r.ok) { const e = apiError(r.status, txt); e.status = r.status; e.retryable = r.status >= 500 || r.status === 429; e.raw = txt.slice(0, 300); throw e; }
  try { return JSON.parse(txt); } catch { const e = bad('The AI service sent an answer that could not be read. It tries again on the next run.', 502); e.retryable = true; e.status = 0; throw e; }
}
function jobOf(j) {
  const why = j.incomplete_details && j.incomplete_details.reason;
  const pages = new Map(); pagesOf(j, pages);
  const out = { id: j.id, status: j.status || 'queued', text: textOf(j), stop: j.status === 'incomplete' || /max_output_tokens|max_tokens/.test(why || '') ? 'max_tokens' : null, pages: [...pages.values()] };
  if (j.status === 'failed') {
    // Key and credit problems keep their own message and link. Anything else is left to the caller.
    const info = JSON.stringify(j.error || {}).slice(0, 600); out.reason = info;
    if (/auth|api key|unauthor|forbidden/i.test(info)) out.error = apiError(401, info);
    else if (/credit|billing|balance|insufficient|quota/i.test(info)) out.error = apiError(402, info);
  }
  return out;
}
async function start(key, model, system, msgs, { max = 2600, tools, steps, reasoning, format } = {}) {
  const j = await call(key, '/v1/agent', 'POST', { model, instructions: system, input: input(msgs), stream: false, background: true, max_output_tokens: room(max, reasoning), ...(tools ? { tools } : {}), ...(steps ? { max_steps: steps } : {}), ...extras({ reasoning, format }) });
  if (!j || !j.id) { const e = bad('The AI service did not start the job.', 502); e.status = 422; throw e; }
  return jobOf(j);
}
async function poll(key, id) { return jobOf(await call(key, '/v1/agent/' + encodeURIComponent(id), 'GET', null, 30000)); }
async function cancel(key, id) { try { await call(key, '/v1/agent/' + encodeURIComponent(id) + '/cancel', 'POST', {}, 8000); return true; } catch { return false; } }

// One short answer without streaming, used for voice.
async function quick(key, system, msgs, max = 700) {
  let out = '';
  try { return await stream(key, FAST, system, msgs, (t) => { out += t; }, { max, web: false }); }
  catch (e) { if (!e.retryable || out) throw e; }
  return stream(key, 'openai/gpt-6.1-sol', system, msgs, () => {}, { max, web: false });
}

// A tiny call so a typo in the key is caught when it is saved, not when a member asks.
async function check(key) {
  let r;
  try { r = await fetch(BASE() + '/v1/agent', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai/gpt-6-luna', input: 'Reply with OK.', max_output_tokens: 16 }) }); }
  catch { return; } // Unreachable from here: save anyway, the first answer will tell.
  if (r.status === 401 || r.status === 403) throw bad('Perplexity did not accept this key. Copy a fresh key from your Perplexity API settings and paste it again.', 400, { label: 'Get a Perplexity key', href: 'https://console.perplexity.ai' });
  if (r.status === 402) throw bad('This Perplexity key works, but the account has no credit. Add credit in your Perplexity API billing, then save the key again.', 400, { label: 'Open Perplexity billing', href: 'https://console.perplexity.ai/project/billing' });
}

module.exports = { MODELS, DEFAULT, valid, nameOf, backup, stream, quick, check, start, poll, cancel };
