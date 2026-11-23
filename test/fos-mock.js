// Stand-ins for Funnel OS: the AI writing JSON and HTML, the Decisions API, Vercel, GitHub, OpenRouter and screenshots.
// Test only, never deployed.
const LOG = { vercel: [], github: [], images: 0, decisions: 0, agent: [] };

const page = (title, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="A plan for runners with knee pain."><style>${Array.from({ length: 60 }, (_, i) => `.s${i}{padding:${i}px;margin:${i}px 0;color:#16140f}`).join('')}body{font-family:Inter,sans-serif;margin:0}.hero{padding:80px 24px}@media (max-width:700px){.hero{padding:40px 16px}}</style></head><body><header><a href="{{page:index}}">Northside Physio</a></header><main><section class="hero" data-reveal="up"><h1 data-split>Run without knee pain in six weeks</h1><p>${extra || 'A six week plan for runners.'}</p><a class="btn" href="{{checkout}}">Join the program</a> <a href="{{page:thank-you}}">See what happens next</a></section><section data-stagger="80"><h2>What is included</h2><ul><li>Weekly sessions</li><li>Strength plan</li></ul><img src="{{asset:IMG}}" alt="Product"></section></main><footer><p>Northside Physio</p></footer><script src="{{kit}}" defer></script></body></html>`;

// Returns the text the AI should answer with, or null when the request is not from Funnel OS.
function agentText(b) {
  const last = b.input[b.input.length - 1]; const q = (last.content.find((c) => c.type === 'input_text') || {}).text || '';
  const first = (b.input[0].content.find((c) => c.type === 'input_text') || {}).text || q;
  const img = (first.match(/\{\{asset:(img-[a-z0-9]+\.(?:png|jpg|webp))\}\}/) || [])[1];
  const H = (t, x) => page(t, x).replace('{{asset:IMG}}', img ? '{{asset:' + img + '}}' : 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
  const has = (s) => first.includes(s);
  let out = null;
  if (has('Research this market')) out = JSON.stringify({ summary: 'Runners with knee pain try rest and generic plans first.', audience: { who: 'Runners 30 to 55', pains: ['Knee hurts after 5k'], desires: ['Run a half marathon'], objections: ['I tried physio before'], words: ['runner\'s knee'] }, competitors: [{ name: 'KneeFix', offer: 'Video course', price: '$199', angle: 'Home exercises', url: 'https://example.com/kneefix' }], price_range: '$150 to $600', angles: ['Run again in six weeks'], gaps: ['1:1 calls'], about: { bio: '', credentials: [], proof: [], numbers: [] }, sources: [{ title: 'Runner forum', url: 'https://example.com/forum' }] });
  else if (has('Turn what they sell into the final offer')) out = '```json\n' + JSON.stringify({ name: 'Knee Reset', one_liner: 'Six weeks to pain-free runs', promise: 'Run 10k without knee pain in six weeks', audience: 'Runners 30 to 55', mechanism: { name: 'The Reset Method', steps: [{ name: 'Calm', what: 'Settle the pain' }, { name: 'Build', what: 'Strength' }, { name: 'Return', what: 'Back to running' }] }, price: { amount: 497, currency: 'USD', compare_at: null, note: '', plans: [{ label: '3 payments', amount: 179, every: 'month' }] }, stack: [{ name: 'Weekly sessions', what: 'Six live sessions', value: 600 }], bonuses: [], guarantee: { name: 'Run-again guarantee', days: 30, terms: 'Full refund' }, cta: 'Join Knee Reset', urgency: '', lead_magnet: '', upsells: [], changes: 'Named the method.' }) + '\n```';
  else if (has('Write the copy for every page')) out = JSON.stringify({ meta: { site_title: 'Knee Reset', description: 'Six weeks to pain-free runs' }, pages: [{ path: 'index', name: 'Sales page', title: 'Knee Reset', description: 'x', sections: [{ id: 'hero', p: 'Promise', headline: 'Run without *knee pain*', sub: 'Six weeks', body: ['Short'], bullets: [], items: [], cta: 'Join', note: '' }] }, { path: 'thank-you', name: 'Thank you', sections: [{ id: 'next', p: 'Next steps', headline: 'You are in', body: ['Check your email'] }] }] });
  else if (has('Plan the wireframe')) out = JSON.stringify({ pages: [{ path: 'index', sections: [{ id: 'hero', p: 'Promise', layout: 'split image right', visual: 'photo', motion: 'reveal', why: 'clear' }] }, { path: 'thank-you', sections: [{ id: 'next', p: 'Next', layout: 'centered stack', visual: 'none', motion: 'none', why: '' }] }], options: [{ n: 1, name: 'Close to the template', idea: 'Calm clinic look.' }, { n: 2, name: 'Editorial', idea: 'Big serif type.' }] });
  else if (has('Build the brand kit')) out = JSON.stringify({ name: 'Northside Physio', logo_text: 'Northside', palette: { bg: '#f7f5f0', surface: '#ffffff', ink: '#16140f', muted: '#5d5a52', line: '#e5e0d6', accent: '#2f6b4f', accent_ink: '#ffffff', deep: '#14231c', deep_ink: '#f3efe6' }, fonts: { display: 'Fraunces', body: 'Inter' }, radius: 12, voice: 'Calm and direct', art_direction: 'Soft daylight', prompts: { hero: 'A runner on a trail at dawn', feature: 'Strength exercise', detail: 'Running shoes' } });
  else if (has('Build this page now')) out = H('Knee Reset', 'Main page ' + (first.match(/DESIGN OPTION (\d)/) || [])[1] + (has('REFERENCE FROM THE TEMPLATE LIBRARY') ? ' libref' : has('TEMPLATE REFERENCE') ? ' tplref' : ''));
  else if (has('Build each of these pages now')) { const paths = (first.match(/Build each of these pages now: ([a-z0-9, -]+)\./) || [])[1].split(', '); out = paths.map((p) => `<!-- FILE: ${p} -->\n` + H('Knee Reset ' + p, 'Page ' + p)).join('\n'); }
  else if (has('QUALITY CHECK FOUND')) out = H('Knee Reset', 'Fixed page');
  else if (has("THE OWNER'S CHANGE REQUEST")) out = H('Knee Reset', 'Changed: ' + (first.match(/CHANGE REQUEST:\n([^\n]+)/) || [])[1]);
  else if (has('Rewrite this into a sharper')) out = 'Offer name\nKnee Reset\n\nWho it is for\nRunners 30 to 55 with knee pain\n\nWhat is included\n1. Six weekly sessions\n2. Strength plan\n\nPrice and payment options\n497 dollars [confirm the payment plan]';
  if (out != null) LOG.agent.push(first.slice(0, 60));
  return out;
}

function json(res, code, o) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); }

function decisions(req, res, b) {
  LOG.decisions++;
  const answers = {};
  for (const [k, q] of Object.entries(b.questions || {})) answers[k] = q.type === 'score' ? { score: 2.4 } : { noul: k === 'invented' ? 0.1 : 0.2 };
  json(res, 200, { answers });
}

function vercel(req, res, u, b) {
  const p = u.pathname.replace('/mock-vercel', '');
  const tok = (req.headers.authorization || '').slice(7);
  if (tok === 'bad-vercel') return json(res, 403, { error: { message: 'Not authorized' } });
  if (p === '/v2/user' || p.startsWith('/v2/teams/')) return json(res, 200, { user: { username: 'tester' } });
  if (p === '/v2/files') { LOG.vercel.push({ file: req.headers['x-vercel-digest'] }); return json(res, 200, {}); }
  if (p === '/v13/deployments' && req.method === 'POST') { LOG.vercel.push({ deploy: b.name, files: b.files.map((x) => x.file), target: b.target }); LOG.lastName = b.name; return json(res, 200, { id: 'dpl_' + LOG.vercel.length, readyState: 'READY', url: b.name + '-abc.vercel.app', projectId: 'prj_' + b.name, alias: [b.name + '.vercel.app'] }); }
  if (p.startsWith('/v13/deployments/')) return json(res, 200, { readyState: 'READY', url: LOG.lastName + '-abc.vercel.app', projectId: 'prj_' + LOG.lastName });
  if (p.startsWith('/v9/projects/') && p.endsWith('/domains')) return json(res, 200, { domains: [{ name: p.split('/')[3].replace('prj_', '') + '.vercel.app' }] });
  if (p.startsWith('/v9/projects/')) return json(res, 200, {});
  json(res, 404, { error: { message: 'unknown ' + p } });
}

function github(req, res, u, b) {
  const p = u.pathname.replace('/mock-gh', '');
  const tok = (req.headers.authorization || '').slice(7);
  if (tok === 'bad-gh') return json(res, 401, { message: 'Bad credentials' });
  LOG.github.push(req.method + ' ' + p);
  if (p === '/user') return json(res, 200, { login: 'tester' });
  if (p === '/user/repos') return json(res, 201, { full_name: 'tester/' + b.name, html_url: 'https://github.com/tester/' + b.name, default_branch: 'main', private: b.private });
  if (/\/git\/ref\/heads\//.test(p)) return json(res, 200, { object: { sha: 'c0' } });
  if (/\/git\/commits\/c0$/.test(p)) return json(res, 200, { sha: 'c0', tree: { sha: 't0' } });
  if (/\/git\/blobs$/.test(p)) return json(res, 201, { sha: 'b' + LOG.github.length });
  if (/\/git\/trees$/.test(p)) return json(res, 201, { sha: 't1' });
  if (/\/git\/commits$/.test(p)) return json(res, 201, { sha: 'c1' });
  if (/\/git\/refs\/heads\//.test(p)) return json(res, 200, { object: { sha: 'c1' } });
  if (/\/collaborators\//.test(p)) return json(res, 201, { id: 1 });
  json(res, 404, { message: 'Not Found' });
}

// A 1x1 PNG for AI images and screenshots.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function openrouter(req, res, u) {
  if (u.pathname.endsWith('/key')) return (req.headers.authorization || '').endsWith('bad-or') ? json(res, 401, { error: { message: 'No auth' } }) : json(res, 200, { data: { label: 'x' } });
  LOG.images++; json(res, 200, { data: [{ b64_json: PNG, media_type: 'image/png' }] });
}
function shot(req, res, u, port) {
  if (u.pathname.endsWith('/img.png')) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(Buffer.from(PNG, 'base64')); }
  json(res, 200, { data: { screenshot: { url: `http://127.0.0.1:${port}/mock-shot/img.png` } } });
}

// A template gallery like a real one: named cards with categories, links and preview images.
let GAL = null;
async function gallery(req, res, u) {
  const sharp = require('../node_modules/sharp');
  const m = u.pathname.match(/\/p(\d+)\.png$/);
  if (m) {
    GAL = GAL || {};
    if (!GAL[m[1]]) GAL[m[1]] = await sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: 40 + 20 * +m[1], g: 90, b: 160 - 10 * +m[1] } } }).png().toBuffer();
    res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(GAL[m[1]]);
  }
  const cats = ['coaches', 'saas', 'ecom', 'local'];
  const cards = Array.from({ length: 8 }, (_, i) => `<li class="card" data-cat="${cats[i % 4]}" data-live="https://tpl-${i}.example.com"><a class="frame" href="https://tpl-${i}.example.com"><img src="p${i}.png" width="800" height="1000" alt="Preview of the Design ${i} template"></a><div class="meta"><h3>Design ${i}</h3><p class="label">Sales page</p></div></li>`).join('');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><html><head><title>Mock Library: 8 templates</title><meta name="description" content="Eight designs"></head><body><img src="logo.png" alt="logo" width="40" height="40"><h1>8 designs, ready to customize.</h1>${cats.map((c) => `<section class="cat" id="${c}"><h2>${c[0].toUpperCase() + c.slice(1)}</h2></section>`).join('')}<ul>${cards}</ul></body></html>`);
}

module.exports = { LOG, agentText, decisions, vercel, github, openrouter, shot, gallery };
