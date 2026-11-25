// Stand-ins for Funnel OS: the AI writing JSON and HTML, the Decisions API, Vercel, GitHub, OpenRouter and screenshots.
// Test only, never deployed.
const LOG = { vercel: [], github: [], images: 0, decisions: 0, agent: [] };

const page = (title, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="A plan for runners with knee pain."><style>${Array.from({ length: 60 }, (_, i) => `.s${i}{padding:${i}px;margin:${i}px 0;color:#16140f}`).join('')}body{font-family:Inter,sans-serif;margin:0}.hero{padding:80px 24px}@media (max-width:700px){.hero{padding:40px 16px}}</style></head><body><header><a href="{{page:index}}">Northside Physio</a></header><main><section class="hero" data-reveal="up"><h1 data-split>Run without knee pain in six weeks</h1><p>${extra || 'A six week plan for runners.'}</p><a class="btn" href="{{checkout}}">Join the program</a> <a href="{{page:thank-you}}">See what happens next</a></section><section data-stagger="80"><h2>What is included</h2><ul><li>Weekly sessions</li><li>Strength plan</li></ul><img src="{{asset:IMG}}" alt="Product"></section></main><footer><p>Northside Physio</p></footer><script src="{{kit}}" defer></script></body></html>`;

// Pages the fix pass has rewritten, so the screenshot review of a fixed page comes back clean.
const FIXED = new Set();
const CHIEF = { scores: [{ path: 'index', id: 'hero', score: 6, why: 'The promise has no time frame' }, { path: 'thank-you', id: 'next', score: 8, why: 'Clear next step' }],
  headlines: ['1. Run 10k without knee pain in *six weeks*', 'Your knees can handle the long run again', 'Six weeks from sore knees to *pain-free* 10k runs', 'The knee plan built for runners over 30', 'Stop resting your knee and start *rebuilding* it', 'Pain-free running in six weeks, or your money back', 'Get back to your long runs without the knee ache'],
  rewrites: [{ path: 'index', why: 'Named the outcome and the time frame', section: { id: 'hero', p: 'Promise', eyebrow: '', headline: 'Run 10k without *knee pain* in six weeks', sub: 'A six week plan for runners 30 to 55', body: ['Short'], bullets: [], items: [], cta: 'Join Knee Reset', note: '' } },
    { path: 'index', why: 'A section that does not exist', section: { id: 'nope', headline: 'x' } }],
  summary: 'Sharpened the hero promise with a time frame.' };

// What kind of Funnel OS request this is and the text the AI should answer with, or null when it is not one.
function reply(b) {
  const last = b.input[b.input.length - 1]; const q = (last.content.find((c) => c.type === 'input_text') || {}).text || '';
  const first = (b.input[0].content.find((c) => c.type === 'input_text') || {}).text || q;
  const img = (first.match(/\{\{asset:(img-[a-z0-9]+\.(?:png|jpg|webp))\}\}/) || [])[1];
  const H = (t, x) => page(t, x).replace('{{asset:IMG}}', img ? '{{asset:' + img + '}}' : 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
  const has = (s) => first.includes(s);
  let out = null; let kind = null;
  const k = (name, text) => { kind = name; out = text; };
  if (has('Sort these links')) {
    // The gallery shows the product; any other site is about them.
    const links = [...first.matchAll(/^LINK (\d+): (\S+)/gm)].map((m) => ({ n: +m[1], url: m[2] }));
    k('links', JSON.stringify({ links: links.map((l) => (/mock-gallery/.test(l.url) ? { n: l.n, use: 'product', keep: [1, 2, 3, 4, 5, 6, 7, 8], why: 'Shows the templates' } : { n: l.n, use: 'about', keep: [], why: 'Their own site' })) }));
  } else if (has('Research this market')) k('research', JSON.stringify({ summary: 'Runners with knee pain try rest and generic plans first.', audience: { who: 'Runners 30 to 55', pains: ['Knee hurts after 5k'], desires: ['Run a half marathon'], objections: ['I tried physio before'], words: ['runner\'s knee'] }, competitors: [{ name: 'KneeFix', offer: 'Video course', price: '$199', angle: 'Home exercises', url: 'https://example.com/kneefix' }], price_range: '$150 to $600', angles: ['Run again in six weeks'], gaps: ['1:1 calls'], about: { bio: '', credentials: [], proof: [], numbers: [] }, sources: [{ title: 'Runner forum', url: 'https://example.com/forum' }] }));
  else if (has('Turn what they sell into the final offer')) k('offer', '```json\n' + JSON.stringify({ name: 'Knee Reset', one_liner: 'Six weeks to pain-free runs', promise: 'Run 10k without knee pain in six weeks', audience: 'Runners 30 to 55', transformation: { before: 'Resting a sore knee and skipping runs', after: 'Running 10k again without pain' }, timeline: { first_win: 'A pain-free 20 minute run in week two', result: '10k in six weeks' }, mechanism: { name: 'The Reset Method', steps: [{ name: 'Calm', what: 'Settle the pain' }, { name: 'Build', what: 'Strength' }, { name: 'Return', what: 'Back to running' }] }, price: { amount: 497, currency: 'USD', compare_at: null, note: '', plans: [{ label: '3 payments', amount: 179, every: 'month' }] }, stack: [{ name: 'Weekly sessions', what: 'Six live sessions', value: 600 }], bonuses: [], guarantee: { name: 'Run-again guarantee', days: 30, terms: 'Full refund' }, cta: 'Join Knee Reset', urgency: '', lead_magnet: '', bump: { name: 'Taping guide', price: 19, what: 'How to tape the knee for long runs' }, upsells: [], changes: 'Named the method.' }) + '\n```');
  else if (has('Write the copy for every page')) k('copy', JSON.stringify({ meta: { site_title: 'Knee Reset', description: 'Six weeks to pain-free runs' }, pages: [{ path: 'index', name: 'Sales page', title: 'Knee Reset', description: 'x', sections: [{ id: 'hero', p: 'Promise', headline: 'Run without *knee pain*', sub: 'Six weeks', body: ['Short'], bullets: [], items: [], cta: 'Join', note: '' }] }, { path: 'thank-you', name: 'Thank you', sections: [{ id: 'next', p: 'Next steps', headline: 'You are in', body: ['Check your email'] }] }] }));
  else if (has('THE COPY TO REVIEW, EVERY PAGE OF THE FUNNEL')) k('chief', JSON.stringify(CHIEF));
  else if (has('HEADLINE CANDIDATES')) k('judge', JSON.stringify({ headline: { pick: 3, why: 'Names the result and the time it takes' }, sections: [{ key: 'index#hero', keep: 'after', why: 'The promise is clearer' }] }));
  else if (has('Plan the wireframe')) k('wireframe', JSON.stringify({ pages: [{ path: 'index', sections: [{ id: 'hero', p: 'Promise', layout: 'split image right', visual: 'photo', motion: 'reveal', why: 'clear' }] }, { path: 'thank-you', sections: [{ id: 'next', p: 'Next', layout: 'centered stack', visual: 'none', motion: 'none', why: '' }] }], options: [{ n: 1, name: 'Close to the template', idea: 'Calm clinic look.' }, { n: 2, name: 'Editorial', idea: 'Big serif type.' }] }));
  else if (has('Build the brand kit')) k('brand', JSON.stringify({ name: 'Northside Physio', logo_text: 'Northside', palette: { bg: '#f7f5f0', surface: '#ffffff', ink: '#16140f', muted: '#5d5a52', line: '#e5e0d6', accent: '#2f6b4f', accent_ink: '#ffffff', deep: '#14231c', deep_ink: '#f3efe6' }, fonts: { display: 'Fraunces', body: 'Inter' }, radius: 12, voice: 'Calm and direct', art_direction: 'Soft daylight', prompts: { hero: 'A runner on a trail at dawn', feature: 'Strength exercise', detail: 'Running shoes' } }));
  else if (has('Build this page now')) k('build', H('Knee Reset', 'Main page ' + (first.match(/DESIGN OPTION (\d)/) || [])[1] + (has('REFERENCE FROM THE TEMPLATE LIBRARY') ? ' libref' : has('TEMPLATE REFERENCE') ? ' tplref' : '')));
  else if (has('Build each of these pages now')) { const paths = (first.match(/Build each of these pages now: ([a-z0-9, -]+)\./) || [])[1].split(', '); k('build', paths.map((p) => `<!-- FILE: ${p} -->\n` + H('Knee Reset ' + p, 'Page ' + p)).join('\n')); }
  else if (has('Review these screenshots')) {
    const path = (first.match(/^PAGE: ([a-z0-9-]+) \(/m) || [])[1];
    const bad = path === 'thank-you' && !FIXED.has(path);
    k('look', JSON.stringify(bad
      ? { problems: [{ page: path, device: 'phone', section: 'next', severity: 'high', issue: 'The next-step button runs off the right edge', fix: 'Let the button wrap and fill the width on the phone' }, { page: path, device: 'desktop', section: 'footer', severity: 'low', issue: 'Footer links sit close together', fix: 'Add 8px between the links' }], design: { score: 7, weakest: 'footer', direction: 'More space between footer links' } }
      : { problems: [], design: { score: 8, weakest: 'none', direction: 'Keep it as it is' } }));
  } else if (has('QUALITY CHECK FOUND')) { const path = (first.match(/THE CURRENT PAGE \(([a-z0-9-]+),/) || [])[1]; if (path) FIXED.add(path); k('fix', H('Knee Reset', 'Fixed page')); }
  else if (has("THE OWNER'S CHANGE REQUEST")) k('revise', H('Knee Reset', 'Changed: ' + (first.match(/CHANGE REQUEST:\n([^\n]+)/) || [])[1]));
  else if (has('Rewrite this into a sharper')) k('rewrite', 'Offer name\nKnee Reset\n\nWho it is for\nRunners 30 to 55 with knee pain\n\nWhat is included\n1. Six weekly sessions\n2. Strength plan\n\nPrice and payment options\n497 dollars [confirm the payment plan]');
  if (out == null) return null;
  // The latest prompt of each kind, so tests can check what the AI was told.
  LOG.prompts = LOG.prompts || {};
  if (['links', 'brand', 'copy', 'wireframe'].includes(kind)) LOG.prompts[kind] = first.slice(0, 60000);
  if (kind === 'build') LOG.prompts.build = ((LOG.prompts.build || '') + '\n' + first.slice(0, 60000)).slice(-400000);
  const images = b.input.reduce((a, m) => a + (m.content || []).filter((c) => c.type === 'input_image').length, 0);
  const cont = b.input.length >= 3 && b.input[b.input.length - 2].role === 'assistant';
  LOG.agent.push({ kind, bg: !!b.background, think: (b.reasoning || {}).effort || null, schema: ((b.response_format || {}).json_schema || {}).name || null, images, model: b.model, cont });
  return { kind, text: out };
}
const agentText = (b) => { const r = reply(b); return r ? r.text : null; };

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

// Repositories an AI Studio project syncs with, kept like real git: blobs, trees, commits and a branch head.
const crypto = require('crypto');
const sha1 = (x) => crypto.createHash('sha1').update(x).digest('hex');
const blobSha = (buf) => sha1(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf]));
const STUDIO = {};
const TSPKG = JSON.stringify({ name: 'studio', private: true, type: 'module', dependencies: { '@tanstack/react-router': '^1.130.0', '@tanstack/react-start': '^1.130.0', react: '^19.1.0', 'react-dom': '^19.1.0' }, devDependencies: { vite: '^8.1.0', '@tailwindcss/vite': '^4.1.0' } }, null, 2);
const TS = { 'package.json': TSPKG, 'src/routes/__root.tsx': 'export const Route = {};\n', 'src/routes/index.tsx': 'export const Route = { home: true };\n', 'src/styles.css': '@import "tailwindcss";\n@source "../src";\n', 'AGENTS.md': '# Project notes\n\nKeep components small.\n', 'src/components/hero.tsx': 'export const Hero = () => null;\n' };
function addCommit(R, map, parents, msg) {
  const t = 't' + sha1(JSON.stringify([...map])); R.trees.set(t, map);
  const c = sha1(t + parents.join() + msg + (R.n++)); R.commits.set(c, { tree: t, parents, message: msg }); R.head = c; return c;
}
function makeRepo(full, files, extra) {
  const R = { full, blobs: new Map(), trees: new Map(), commits: new Map(), head: null, n: 0, pushes: 0, ...(extra || {}) };
  if (files) {
    const map = new Map();
    for (const [path, c] of Object.entries(files)) { const buf = Buffer.from(c); const sha = blobSha(buf); R.blobs.set(sha, buf); map.set(path, sha); }
    addCommit(R, map, [], 'Initial commit from AI Studio');
  }
  STUDIO[full] = R;
}
function resetStudio() {
  Object.keys(STUDIO).forEach((k) => delete STUDIO[k]);
  makeRepo('me/studio', TS);
  makeRepo('me/clash', { ...TS, 'src/routes/thank-you.tsx': 'export const Route = {};\n' });
  makeRepo('me/twohomes', { ...TS, 'src/routes/(site)/index.tsx': 'export const Route = {};\n' });
  makeRepo('me/vite', { 'package.json': JSON.stringify({ dependencies: { react: '^19.1.0' }, devDependencies: { vite: '^8.1.0' } }), 'src/App.tsx': 'export default () => null;\n' });
  makeRepo('me/empty', null);
  makeRepo('me/locked', TS, { locked: true });
  makeRepo('me/guarded', TS, { guarded: true });
  makeRepo('me/busy', TS, { busy: 1 });
  makeRepo('me/old', TS, { archived: true });
}
resetStudio();
function studioState(full) {
  const R = STUDIO[full]; if (!R || !R.head) return { head: null, files: {}, pushes: R ? R.pushes : 0 };
  const map = R.trees.get(R.commits.get(R.head).tree);
  return { head: R.head, pushes: R.pushes, message: R.commits.get(R.head).message, files: Object.fromEntries([...map].map(([path, sha]) => [path, R.blobs.get(sha).toString('utf8')])) };
}
// Answers for a studio repository, or false when the path is not one.
function studio(req, res, p, b, tok) {
  const m = p.match(/^\/repos\/([^/]+\/[^/]+?)(\/.*)?$/); const R = m && STUDIO[m[1]]; if (!R) return false;
  const rest = m[2] || ''; const write = req.method !== 'GET';
  if (/readonly/.test(tok) && write) return json(res, 403, { message: 'Resource not accessible by personal access token' });
  if (rest === '') return json(res, 200, { full_name: R.full, html_url: 'https://github.com/' + R.full, default_branch: 'main', archived: !!R.archived, permissions: { admin: false, push: !R.locked, pull: true } });
  let x;
  if (rest === '/git/ref/heads/main') return R.head ? json(res, 200, { ref: 'refs/heads/main', object: { sha: R.head, type: 'commit' } }) : json(res, 409, { message: 'Git Repository is empty.' });
  if ((x = rest.match(/^\/git\/commits\/([a-f0-9]+)$/))) { const c = R.commits.get(x[1]); return c ? json(res, 200, { sha: x[1], tree: { sha: c.tree }, parents: c.parents.map((s) => ({ sha: s })) }) : json(res, 404, { message: 'Not Found' }); }
  if ((x = rest.match(/^\/git\/trees\/(t[a-f0-9]+)\?recursive=1$/) || (rest.startsWith('/git/trees/t') && [0, rest.slice(11).split('?')[0]]))) {
    const map = R.trees.get(x[1]); if (!map) return json(res, 404, { message: 'Not Found' });
    const dirs = new Set(); [...map.keys()].forEach((path) => path.split('/').slice(0, -1).forEach((_, i, a) => dirs.add(a.slice(0, i + 1).join('/'))));
    return json(res, 200, { sha: x[1], truncated: false, tree: [...[...dirs].map((d) => ({ path: d, mode: '040000', type: 'tree', sha: 'd' + sha1(d) })), ...[...map].map(([path, sha]) => ({ path, mode: '100644', type: 'blob', sha }))] });
  }
  if ((x = rest.match(/^\/git\/blobs\/([a-f0-9]+)$/))) { const buf = R.blobs.get(x[1]); return buf ? json(res, 200, { sha: x[1], content: buf.toString('base64'), encoding: 'base64' }) : json(res, 404, { message: 'Not Found' }); }
  if (rest === '/git/blobs' && req.method === 'POST') { const buf = Buffer.from(b.content || '', b.encoding === 'base64' ? 'base64' : 'utf8'); const sha = blobSha(buf); R.blobs.set(sha, buf); return json(res, 201, { sha }); }
  if (rest === '/git/trees' && req.method === 'POST') {
    const map = new Map(R.trees.get(b.base_tree) || []);
    for (const e of b.tree || []) { if (e.sha === null) map.delete(e.path); else if (R.blobs.has(e.sha)) map.set(e.path, e.sha); else return json(res, 422, { message: 'Invalid tree info' }); }
    const t = 't' + sha1(JSON.stringify([...map])); R.trees.set(t, map); return json(res, 201, { sha: t });
  }
  if (rest === '/git/commits' && req.method === 'POST') { const c = sha1(b.tree + (b.parents || []).join() + b.message + (R.n++)); R.commits.set(c, { tree: b.tree, parents: b.parents || [], message: b.message }); return json(res, 201, { sha: c }); }
  if (rest === '/git/refs/heads/main' && req.method === 'PATCH') {
    if (R.guarded) return json(res, 422, { message: 'Protected branch update failed for refs/heads/main.' });
    const c = R.commits.get(b.sha); if (!c) return json(res, 422, { message: 'Object does not exist' });
    if (R.busy > 0) {
      // AI Studio pushes a change of its own right before ours lands.
      R.busy--; const map = new Map(R.trees.get(R.commits.get(R.head).tree)); const buf = Buffer.from('export const About = () => null;\n'); const sha = blobSha(buf); R.blobs.set(sha, buf); map.set('src/components/about.tsx', sha);
      addCommit(R, map, [R.head], 'Edit from AI Studio');
      return json(res, 422, { message: 'Update is not a fast forward' });
    }
    if (c.parents[0] !== R.head && !b.force) return json(res, 422, { message: 'Update is not a fast forward' });
    R.head = b.sha; R.pushes++; return json(res, 200, { ref: 'refs/heads/main', object: { sha: b.sha } });
  }
  if ((x = rest.match(/^\/contents\/(.+)$/)) && req.method === 'PUT') {
    if (R.head) return json(res, 422, { message: 'Invalid request. "sha" wasn\'t supplied.' });
    const buf = Buffer.from(b.content || '', 'base64'); const sha = blobSha(buf); R.blobs.set(sha, buf);
    const c = addCommit(R, new Map([[decodeURIComponent(x[1]), sha]]), [], b.message); R.pushes++;
    return json(res, 201, { content: { path: x[1], sha }, commit: { sha: c } });
  }
  return json(res, 404, { message: 'Not Found' });
}

function github(req, res, u, b) {
  const p = u.pathname.replace('/mock-gh', '');
  const tok = (req.headers.authorization || '').slice(7);
  if (tok === 'bad-gh' || /expired/.test(tok)) return json(res, 401, { message: 'Bad credentials' });
  LOG.github.push(req.method + ' ' + p);
  if (STUDIO[(p.match(/^\/repos\/([^/]+\/[^/]+)/) || [])[1]]) return studio(req, res, p + (u.search || ''), b, tok);
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

// A brand site with its own programs: colors and fonts in its stylesheet, product cards that are not the offer.
async function brandSite(req, res, u) {
  if (u.pathname.endsWith('/site.css')) {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    return res.end("@font-face{font-family:'Bricolage Grotesque';src:url(b.woff2) format('woff2')}:root{--ink:#0a1207;--paper:#f4f6ef;--brand:#c6f24e;--navy:#0f1a0b;--font-weight-bold:700;--display:\"Bricolage Grotesque\",system-ui,sans-serif}body{background:var(--paper);color:var(--ink);font-family:'Instrument Sans',sans-serif}h1{font-family:var(--display)}.btn{background:#c6f24e}");
  }
  const m = u.pathname.match(/\/p(\d+)\.png$/); if (m) return gallery(req, res, { pathname: '/mock-gallery/p' + m[1] + '.png' });
  const names = ['Mock Coaching Program', 'Mock AI Agents', 'Mock Vault', 'Mock Live Calls', 'Mock Snapshot', 'Mock Fastlane'];
  const cards = names.map((n, i) => `<li class="card"><img src="p${i}.png" width="800" height="1000" alt="${n}"><h3>${n}</h3><p class="label">Program</p></li>`).join('');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!doctype html><html><head><title>Mock Academy | Build a business with AI</title><link rel="stylesheet" href="site.css"><meta name="description" content="Programs, agents and coaching."></head><body><h1>Build your business with AI.</h1><ul>${cards}</ul></body></html>`);
}

module.exports = { LOG, FIXED, reply, agentText, decisions, vercel, github, openrouter, shot, gallery, brandSite, studioState, resetStudio };
