// Funnel OS end to end against the local test server: admin keys, quiz validation, a full build to live previews,
// quality checks, a change request, approval with GitHub, the zip, and isolation between members.
const U = 'http://127.0.0.1:' + (process.env.PORT || 5055);
const A = '00000000-0000-0000-0000-00000000000a'; const B = '00000000-0000-0000-0000-00000000000b'; const C = '00000000-0000-0000-0000-00000000000c';
let pass = 0; let fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };
const call = async (ep, uid, action, b = {}) => { const r = await fetch(U + '/api/' + ep, { method: 'POST', headers: { Authorization: 'Bearer uid:' + uid, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...b }) }); return { status: r.status, ...(await r.json()) }; };
const app = (uid, a, b) => call('app', uid, a, b); const fos = (uid, a, b) => call('funnel', uid, a, b);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(uid, id, want, secs = 90) {
  for (let i = 0; i < secs * 2; i++) { const r = await fos(uid, 'get', { id }); if (r.data && want.includes(r.data.status)) return r.data; await sleep(500); }
  return (await fos(uid, 'get', { id })).data;
}
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const QUIZ = { type: 'sales-page', brand: 'Northside Physio', offer: 'A 6-week online program for runners with knee pain. Weekly video sessions, a strength plan and two 1:1 calls. 497 dollars or 3 payments of 179. 30-day guarantee.', audience: 'Runners 30 to 55', options: 2, palette: { bg: '#faf7ef', ink: '#0b2418', accent: '#668168', deep: '#0b2418', name: 'x' }, fonts: { display: 'Fraunces', body: 'Inter' }, checkout_url: 'https://pay.example.com/knee', github_user: 'member-gh' };

(async () => {
  await app(A, 'me'); await app(B, 'me'); await app(C, 'me');
  await app(A, 'admin-set', { user_id: B, status: 'approved' }); await app(A, 'admin-set', { user_id: C, status: 'approved' });

  let r = await fos(B, 'status');
  ok('status for member', r.data && r.data.ai === true && r.data.host === false && r.data.open === true && r.data.types.length === 9, r);
  r = await fos(B, 'admin-fos');
  ok('member cannot read admin keys', r.status >= 400, r);

  // Admin keys, checked against the services.
  r = await fos(A, 'admin-fos-save', { provider: 'vercel', token: 'bad-vercel' });
  ok('bad vercel token explains and links', r.status === 400 && /Vercel did not accept/.test(r.error) && r.fix && /vercel\.com/.test(r.fix.href), r);
  r = await fos(A, 'admin-fos-save', { provider: 'vercel', token: 'good-vercel-token', team: 'team_abcdef123' });
  ok('vercel saved with team', r.data && r.data.vercel === 'oken' && r.data.vercel_team === 'team_abcdef123', r);
  r = await fos(A, 'admin-fos-save', { provider: 'github', token: 'bad-gh' });
  ok('bad github token explains', r.status === 400 && r.fix && /github\.com/.test(r.fix.href), r);
  r = await fos(A, 'admin-fos-save', { provider: 'github', token: 'ghp_good1234' });
  ok('github saved', r.data && r.data.github === '1234' && r.data.login === 'tester', r);
  r = await fos(A, 'admin-fos-save', { provider: 'openrouter', token: 'sk-or-good9' });
  ok('openrouter saved', r.data && r.data.openrouter, r);
  r = await fos(B, 'status');
  ok('member sees host and images', r.data.host && r.data.github && r.data.images, r);

  // Only-me mode blocks members.
  await fos(A, 'admin-fos-save', { provider: 'access', value: 'admin' });
  r = await fos(B, 'status'); ok('closed for members in admin mode', r.data && r.data.open === false, r);
  r = await fos(B, 'create', { quiz: QUIZ }); ok('member cannot build in admin mode', r.status >= 400, r);
  await fos(A, 'admin-fos-save', { provider: 'access', value: '' });

  // Validation tells people what to do.
  r = await fos(B, 'create', { quiz: { ...QUIZ, type: 'nope' } }); ok('needs a type', r.status === 400 && /funnel type/.test(r.error), r);
  r = await fos(B, 'create', { quiz: { ...QUIZ, offer: 'Coaching' } }); ok('needs a specific offer', r.status === 400 && /more sentences/.test(r.error), r);
  r = await fos(B, 'upload', { mime: 'application/pdf', data: 'abc' }); ok('upload type checked', r.status === 400, r);

  r = await fos(B, 'upload', { mime: 'font/woff2', data: 'd09GMgABAAAAAA', label: 'Brand Sans' });
  ok('upload font file', r.data && /^font-[a-f0-9]{10}\.woff2$/.test(r.data.name), r);
  {
    const F = require('../api/_fos.js');
    ok('reads "use replacer testimonials for now"', F.guessIntent({ proof: 'use replacer testimonials for now' }).proof === 'placeholder');
    ok('reads "I\'ll add testimonials later"', F.guessIntent({ notes: "I'll add testimonials later" }).proof === 'placeholder');
    ok('quiz proof choice wins', F.proofMode({ proof_mode: 'none', proof: 'Real quote' }) === 'none' && F.proofMode({ proof: 'Real quote from Ana' }) === 'real');
  }

  r = await fos(B, 'upload', { mime: 'image/png', data: PNG, role: 'product', label: 'Workbook' });
  ok('upload image', r.data && /^img-[a-f0-9]{10}\.png$/.test(r.data.name), r);
  const img = r.data.name;
  r = await fos(B, 'assets'); ok('assets list', r.data && r.data.some((a) => a.name === img && a.role === 'product'), r);
  r = await fos(C, 'asset-data', { names: [img] }); ok('other member cannot read my image', r.data && r.data.length === 0, r);

  // Full build.
  // The brand kit: saved once, read by every build, private to its owner.
  let kitOffer = '';
  {
    const imgName = (await fos(B, 'assets')).data.find((x) => x.role === 'product').name;
    r = await fos(B, 'context'); ok('no brand kit yet', r.data && r.data.kit === null, r);
    r = await fos(B, 'context-save', { kit: { brand: 'Northside Physio', voice: 'Warm, plain and direct', avoid: 'cure, guaranteed results', palette: { bg: '#F7F5F0', ink: '#16140f', accent: '#2f6b4f', deep: '#14231c', name: 'Pine' }, fonts: { display: 'Fraunces', body: 'Inter";}' }, urls: 'https://northside.example.com, not a url', images: [{ name: imgName, role: 'logo', label: 'Logo' }, { name: 'fos-context.svg', role: 'logo' }], offers: [{ name: 'Knee Reset', price: '497 dollars', offer: 'Six weeks of guided strength work for runners with knee pain.', checkout_url: 'javascript:alert(1)' }, { name: '', offer: '' }], main_offer: 'zzz', docs: [{ name: 'Notes', text: 'x'.repeat(30000) }] } });
    const k = r.data && r.data.kit;
    ok('brand kit saved and cleaned', k && k.brand === 'Northside Physio' && k.palette.bg === '#f7f5f0' && k.fonts.body === 'Inter' && k.urls.length === 1 && k.images.length === 1 && k.images[0].role === 'logo' && k.offers.length === 1 && /^[a-f0-9]{8}$/.test(k.offers[0].id) && k.main_offer === k.offers[0].id && k.offers[0].checkout_url === '' && k.docs[0].text.length === 20000, k);
    kitOffer = k ? k.offers[0].id : '';
    r = await fos(B, 'context'); ok('brand kit reads back', r.data.kit && r.data.kit.voice === 'Warm, plain and direct' && r.data.kit.offers[0].id === k.offers[0].id && r.data.kit.updated_at === k.updated_at, r);
    r = await fos(C, 'context'); ok('others cannot see my brand kit', r.data && r.data.kit === null, r);
    r = await fos(B, 'assets'); ok('brand kit is not listed with my images', r.data && !JSON.stringify(r.data).includes('fos-context'), r.data);
    r = await fos(B, 'upload', { mime: 'image/svg+xml', data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), name: 'fos-context.svg' });
    r = await fos(B, 'context'); ok('an upload cannot overwrite the brand kit', r.data.kit && r.data.kit.brand === 'Northside Physio', r);
    const demo = (await (await fetch(U + '/test/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.com', password: 'funnel-os-demo' }) })).json()).uid;
    if (demo) {
      r = await fos(demo, 'context'); ok('demo reads an empty brand kit', r.data && r.data.kit === null, r);
      r = await fos(demo, 'context-save', { kit: { brand: 'Demo' } }); ok('demo cannot save a brand kit, and is told how', r.status === 403 && /Create your own account/.test(r.error) && r.fix && r.fix.href === '/#/join', r);
      r = await fos(demo, 'repo-push', { id: '00000000-0000-0000-0000-000000000001', opt: 1, repo: 'me/studio', token: 'github_pat_' + 'x'.repeat(30) }); ok('demo cannot push to GitHub', r.status === 403 && r.fix && r.fix.href === '/#/join', r);
    } else ok('demo login for tests', false);
    const F = require('../api/_fos.js');
    const txt = F.brief({ title: 'x', funnel_type: 'sales-page', quiz: { type: 'sales-page', brand: 'B', offer: 'O', offer_name: 'Knee Reset', price: '497 dollars', voice: 'Warm, plain and direct', avoid: 'cure' } });
    ok('brief carries the offer, voice and words to avoid', /OFFER: Knee Reset, price 497 dollars/.test(txt) && /BRAND VOICE \(write every line like this\): Warm, plain and direct/.test(txt) && /WORDS AND CLAIMS TO AVOID \(never use these\): cure/.test(txt), txt.slice(0, 600));
  }

  r = await fos(B, 'create', { kit_sync: true, quiz: { ...QUIZ, images: [{ name: img, role: 'product', label: 'Workbook' }], offer_id: kitOffer, offer_name: 'Knee Reset', price: '497 dollars or 3 payments of 179', voice: 'Warm, plain and direct', avoid: 'cure' } });
  ok('create', r.data && r.data.id && r.data.status === 'running', r);
  ok('quiz keeps the offer name, price, voice and words to avoid', r.data && r.data.quiz.offer_name === 'Knee Reset' && r.data.quiz.price === '497 dollars or 3 payments of 179' && r.data.quiz.voice === 'Warm, plain and direct' && r.data.quiz.avoid === 'cure' && r.data.quiz.offer_id === kitOffer, r.data && r.data.quiz);
  ok('quiz answers saved back to the brand kit', r.data && r.data.kit && !r.data.kit_error && r.data.kit.offers.length === 1 && r.data.kit.offers[0].id === kitOffer && r.data.kit.offers[0].offer === QUIZ.offer && r.data.kit.offers[0].price === '497 dollars or 3 payments of 179' && r.data.kit.offers[0].checkout_url === QUIZ.checkout_url && r.data.kit.images.length === 1 && r.data.kit.images[0].name === img && r.data.kit.palette.accent === '#668168' && r.data.kit.voice === 'Warm, plain and direct', r.data && { kit: r.data.kit, e: r.data.kit_error });
  const id = r.data.id;
  r = await fos(C, 'get', { id }); ok('other member cannot open it', r.status >= 400, r);
  let f = await until(B, id, ['review', 'failed'], 120);
  ok('build reaches review', f.status === 'review', { status: f.status, step: f.step, error: f.error, steps: f.steps });
  ok('research, offer, copy, wireframe, brand saved', f.research && f.offer && f.offer.name === 'Knee Reset' && f.copy && f.wireframe && f.brand && f.brand.fonts.display === 'Fraunces', f.brand);
  ok('their colors kept', f.brand && f.brand.palette.accent === '#668168', f.brand && f.brand.palette);
  ok('ai images made', f.visuals && f.visuals.images.filter((x) => x.role === 'ai' && !x.kind).length === 3, f.visuals);
  ok('graphics drawn without product shots (covers, share image, icons)', ['cover', 'og', 'icon', 'favicon'].every((k) => f.visuals.images.some((x) => x.kind === k)) && !f.visuals.images.some((x) => x.kind === 'hero'), f.visuals.images.map((x) => x.kind));
  ok('two options with live urls', f.options.length === 2 && f.options.every((o) => /^https:\/\/fos-northside-physio-[a-f0-9]{6}\.vercel\.app\/o\d\/$/.test(o.url)), f.options);
  ok('qa ran on both', f.options.every((o) => o.qa && o.qa.total >= 5), f.options.map((o) => o.qa));
  ok('steps logged in order', ['research', 'collect', 'offer', 'copy', 'chief', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'fix', 'done'].every((s) => f.steps.some((x) => x.id === s && x.state === 'done')), f.steps);
  ok('each option has its own library reference', f.wireframe && (f.wireframe.refs || []).length === 2 && f.wireframe.refs[0].id !== f.wireframe.refs[1].id && f.wireframe.refs.every((r) => r.live && r.name), f.wireframe && f.wireframe.refs);
  ok('wireframe note names the references', (f.steps.find((x) => x.id === 'wireframe') || {}).note.includes('template library'), f.steps.find((x) => x.id === 'wireframe'));
  ok('pages for the type', f.pages.map((p) => p.path).join() === 'index,thank-you', f.pages);
  let L = await (await fetch(U + '/test/fos')).json();
  {
    // The offer pack, the copy review and the judge.
    const o = f.offer || {};
    ok('offer has the transformation and timeline, and no bump without an order page', o.transformation && o.transformation.after && o.timeline && o.timeline.first_win && o.bump === null, o);
    const rv = (f.copy || {}).review || {};
    ok('copy review saved with scores, headlines and kept rewrites', (rv.scores || []).length === 2 && rv.avg === 7 && (rv.headlines || []).length === 7 && !/^1\./.test(rv.headlines[0]) && (rv.rewritten || []).length === 1 && rv.rewritten[0].kept === 'after' && rv.judged === true && /time frame/.test(rv.summary), rv);
    const hero = ((f.copy.pages.find((p) => p.path === 'index') || {}).sections || []).find((x) => x.id === 'hero') || {};
    ok('picked headline is on the hero, the rest of the rewrite kept', rv.picked === 'Six weeks from sore knees to *pain-free* 10k runs' && hero.headline === rv.picked && hero.cta === 'Join Knee Reset' && hero.p === 'Promise', hero);
    ok('copy review step logged', /2 sections scored, average 7 of 10\. 1 of 1 rewrites kept, new headline picked from 7/.test((f.steps.find((x) => x.id === 'chief') || {}).note), f.steps.find((x) => x.id === 'chief'));
    // How each model call was made.
    const A = L.agent; const by = (k) => A.filter((x) => x.kind === k);
    ok('research asks for its JSON shape', by('research').some((x) => x.schema === 'fosresearch' && !x.bg), by('research'));
    ok('offer thinks hard in the background with its schema', by('offer').length && by('offer').every((x) => x.bg && x.think === 'high' && x.schema === 'fosoffer'), by('offer'));
    ok('copy thinks hard in the background, and a cut-off answer carries on', by('copy').some((x) => x.bg && x.think === 'high' && x.schema === 'foscopy' && !x.cont) && by('copy').some((x) => x.cont && !x.think && !x.schema), by('copy'));
    const ch = by('chief');
    ok('copy review falls back to the second model when the first job fails', ch.length >= 2 && ch[0].think === 'high' && ch[0].schema === 'foschief' && ch.some((x) => x.model !== ch[0].model), ch);
    ok('judge runs without the schema when the model refuses it', by('judge').some((x) => x.rejected) && by('judge').some((x) => !x.rejected && !x.schema), by('judge'));
    ok('pages are built as background jobs', by('build').length >= 4 && by('build').every((x) => x.bg), by('build').length);
    ok('screenshot review sees every tile on desktop and phone', by('look').length >= 4 && by('look').every((x) => x.bg && x.images >= 3 && x.model === 'openai/gpt-6.1-sol' && x.schema === 'foslook' && x.think === 'medium'), by('look'));
    ok('fix pass ran on the flagged page of each option', by('fix').length === 2 && by('fix').every((x) => x.bg), by('fix'));
    const fix = f.steps.find((x) => x.id === 'fix') || {};
    ok('fix step logged', /Fixed 2 pages \(round 1\)/.test(fix.note), fix);
    const t1 = (await fos(B, 'files', { id, opt: 1 })).data.files;
    ok('only the flagged page was rewritten', /Fixed page/.test(t1.find((x) => x.path === 'thank-you').content) && !/Fixed page/.test(t1.find((x) => x.path === 'index').content));
    ok('second check passes after the fix', f.options.every((o) => o.qa.round === 1 && o.qa.checks.every((c) => c.ok !== false) && o.qa.checks.some((c) => /Every section reviewed on desktop and phone/.test(c.label))), f.options.map((o) => o.qa));
    ok('layout facts checked in code', f.options.every((o) => o.qa.checks.some((c) => /No sideways scrolling/.test(c.label))), f.options[0].qa.checks.map((c) => c.label));
    ok('quality check step says all clear', /All clear/.test((f.steps.find((x) => x.id === 'qa') || {}).note), f.steps.find((x) => x.id === 'qa'));
  }
  const dep = L.vercel.find((x) => x.deploy);
  ok('preview deploy has both options, assets and chooser', dep && ['o1/index.html', 'o1/thank-you.html', 'o2/index.html', 'index.html', 'fos-motion.js', 'assets/' + img].every((p) => dep.files.includes(p)), dep);
  ok('decisions api used', L.decisions >= 4, L.decisions);

  { const a = (await fos(B, 'files', { id, opt: 1 })).data.files.find((x) => x.path === 'index').content; const b2 = (await fos(B, 'files', { id, opt: 2 })).data.files.find((x) => x.path === 'index').content;
    ok('option 1 built from the full template, option 2 from its library reference', /Main page 1 tplref/.test(a) && /Main page 2 libref/.test(b2), [a.match(/Main page[^<]*/), b2.match(/Main page[^<]*/)]); }
  r = await fos(B, 'files', { id, opt: 1 });
  ok('files for in-app preview', r.data && r.data.files.length === 2 && r.data.assets.some((a) => a.name === img) && r.data.kit.length > 1000, r.data && r.data.files.map((x) => x.path));
  ok('pages use placeholders', r.data.files[0].content.includes('{{kit}}') && r.data.files[0].content.includes('{{asset:' + img + '}}'), r.data.files[0].content.slice(0, 400));

  // Change request.
  r = await fos(B, 'revise', { id, opt: 2, page: 'index', request: 'Make the hero darker' });
  ok('revise starts', r.data && r.data.status === 'running' && r.data.revisions.length === 1, r);
  f = await until(B, id, ['review', 'failed']);
  ok('revision done', f.status === 'review' && f.revisions[0].state === 'done', { s: f.status, e: f.error, r: f.revisions });
  r = await fos(B, 'files', { id, opt: 2 }); ok('change applied to option 2', /Changed: Make the hero darker/.test(r.data.files.find((x) => x.path === 'index').content));
  r = await fos(B, 'revise', { id, opt: 1, page: 'index', request: 'x' }); ok('short change request explained', r.status === 400, r);

  // One more option on demand: only option 3 is built and checked, the others are untouched.
  const before2 = (await fos(B, 'files', { id, opt: 2 })).data.files.find((x) => x.path === 'index').content;
  const qa1 = JSON.stringify((f.options.find((x) => x.n === 1) || {}).qa || null);
  r = await fos(B, 'more', { id, idea: 'Dark background with a big product gallery at the top' });
  ok('new option starts at build', r.data && r.data.status === 'running' && r.data.step === 'build' && r.data.quiz.options === 3 && r.data.wireframe.options[2].name === 'Dark background with a', r.data && [r.data.status, r.data.step, r.data.quiz && r.data.quiz.options, r.data.wireframe && r.data.wireframe.options.map((o) => o.name)]);
  f = await until(B, id, ['review', 'failed']);
  ok('new option reaches review', f.status === 'review' && f.options.length === 3 && f.options[2].n === 3 && f.options[2].qa, { s: f.status, e: f.error, o: f.options && f.options.map((o) => [o.n, o.name, !!o.qa]) });
  r = await fos(B, 'files', { id, opt: 3 }); ok('option 3 has every page', r.data && r.data.files.length === 2, r.data && r.data.files.map((x) => x.path));
  r = await fos(B, 'files', { id, opt: 2 }); ok('option 2 left as it was', r.data.files.find((x) => x.path === 'index').content === before2);
  ok('option 1 not checked again', JSON.stringify(f.options.find((x) => x.n === 1).qa || null) === qa1);
  r = await fos(B, 'more', { id }); f = await until(B, id, ['review', 'failed']);
  ok('new options get a new library reference', new Set(f.wireframe.refs.map((r) => r.id)).size === 4 && f.wireframe.refs.map((r) => r.n).join() === '1,2,3,4', f.wireframe.refs);
  ok('auto direction picks one not used yet', f.options.length === 4 && f.wireframe.options[3].id === 'bold', [f.status, f.error, f.options.length, f.wireframe.options.map((o) => o.id)]);

  // Approve option 2.
  r = await fos(B, 'approve', { id, opt: 5 }); ok('approve checks the option', r.status === 400, r);
  r = await fos(B, 'approve', { id, opt: 2 });
  f = await until(B, id, ['live', 'failed']);
  ok('live', f.status === 'live' && f.picked === 2 && f.deploy.stage === 'live' && /^https:\/\//.test(f.deploy.url), { s: f.status, e: f.error, d: f.deploy });
  ok('pushed to github and invited', f.repo && f.repo.full_name === 'tester/funnel-northside-physio' && f.repo.invited === 'member-gh', f.repo);
  L = await (await fetch(U + '/test/fos')).json();
  const last = L.vercel.filter((x) => x.deploy).pop();
  ok('final deploy at root', last.files.includes('index.html') && last.files.includes('thank-you.html') && !last.files.some((p) => p.startsWith('o1/')), last);
  ok('github private repo, invite', L.github.includes('POST /user/repos') && L.github.some((x) => /collaborators\/member-gh/.test(x)), L.github);

  r = await fos(B, 'zip', { id });
  const z = Buffer.from(r.data.data, 'base64');
  ok('zip has pages, readme, motion kit', z.readUInt32LE(0) === 0x04034b50 && ['index.html', 'thank-you.html', 'README.md', 'fos-motion.js'].every((n) => z.includes(Buffer.from(n))) && r.data.name === 'northside-physio-option-2.zip', r.data.name);
  ok('zip resolves placeholders', !z.toString('latin1').includes('{{kit}}') && z.toString('latin1').includes('https://pay.example.com/knee'));

  // Push to the GitHub repository of an AI Studio project. Member tokens are used once and never saved.
  {
    await fetch(U + '/test/studio', { method: 'POST' });
    const S = require('../api/_studio.js');
    const TOK = 'github_pat_' + 'A1b2C3d4E5'.repeat(3);
    const st = async (repo) => (await fetch(U + '/test/studio?repo=' + repo)).json();
    const push = (b) => fos(B, 'repo-push', { id, opt: 2, token: TOK, ...b });
    r = await push({ repo: 'https://github.com/me/studio', token: '' });
    ok('member needs a token, the admin token is never used for them', r.status === 400 && /Paste a GitHub token/.test(r.error) && r.fix && /personal-access-tokens\/new/.test(r.fix.href) && /target_name=me/.test(r.fix.href), r);
    r = await push({ repo: 'me/studio', token: 'hunter2' }); ok('token shape checked', r.status === 400 && /does not look like a GitHub token/.test(r.error) && r.fix, r);
    r = await push({ repo: 'not a repo' }); ok('repository link checked', r.status === 400 && /Paste the GitHub repository link/.test(r.error) && r.fix && r.fix.href === S.GIT_SYNC_HELP, r);
    r = await push({ repo: 'me/studio', opt: 9 }); ok('option checked', r.status === 400 && /does not exist/.test(r.error), r);
    r = await push({ repo: 'me/studio', token: 'github_pat_expired' + 'x'.repeat(20) }); ok('expired token explains and links', r.status === 400 && /did not accept that token/.test(r.error) && /personal-access-tokens\/new/.test(r.fix.href), r);
    r = await push({ repo: 'me/missing' }); ok('unknown repository explains', r.status === 400 && /could not find me\/missing/.test(r.error), r);
    r = await push({ repo: 'me/studio', token: 'github_pat_readonly' + 'x'.repeat(20) }); ok('read-only token explains', r.status === 400 && /cannot write/.test(r.error) && /Read and write/.test(r.error), r);
    r = await push({ repo: 'me/locked' }); ok('no write access explains', r.status === 400 && /cannot write/.test(r.error), r);
    r = await push({ repo: 'me/guarded' }); ok('protected branch explains', r.status === 400 && /protected/.test(r.error) && /settings\/branches/.test(r.fix.href), r);
    r = await push({ repo: 'me/old' }); ok('archived repository explains', r.status === 400 && /archived/.test(r.error), r);
    r = await push({ repo: 'me/vite' }); ok('React (Vite) project explains', r.status === 400 && /React \(Vite\)/.test(r.error) && r.fix.href === S.GIT_SYNC_HELP, r);
    r = await push({ repo: 'me/clash' }); ok('page clash explains', r.status === 409 && /already has a page at \/thank-you/.test(r.error), r);
    r = await push({ repo: 'me/twohomes' }); ok('second home page explains', r.status === 409 && /another home page file/.test(r.error), r);
    let untouched = 0; for (const x of ['me/locked', 'me/guarded', 'me/clash', 'me/twohomes', 'me/vite', 'me/old']) if ((await st(x)).pushes === 0) untouched++;
    ok('nothing pushed when something is wrong', untouched === 6);

    r = await push({ repo: 'https://github.com/me/studio.git' });
    ok('pushed to the AI Studio repository', r.data && r.data.studio.full_name === 'me/studio' && r.data.studio.kind === 'tanstack' && r.data.studio.option === 2 && /^[a-f0-9]{40}$/.test(r.data.studio.commit) && r.data.funnel.repo.studio.full_name === 'me/studio' && r.data.funnel.repo.full_name === 'tester/funnel-northside-physio', r);
    const g = await st('me/studio'); const fl = g.files;
    ok('route files, styles, motion kit, hook and notes', ['src/routes/index.tsx', 'src/routes/thank-you.tsx', 'public/funnel/index.css', 'public/funnel/thank-you.css', 'public/funnel/fos-motion.js', 'src/funnel/use-funnel-page.ts', 'FUNNEL.md'].every((p) => fl[p]) && /option 2/.test(g.message), Object.keys(fl));
    ok('AI Studio files kept', fl['src/routes/__root.tsx'] && fl['src/components/hero.tsx'] && /react-start/.test(fl['package.json']), Object.keys(fl));
    ok('styles.css keeps Tailwind and skips the funnel pages', /@import "tailwindcss"/.test(fl['src/styles.css']) && /@source not "\.\/routes\/index\.tsx";/.test(fl['src/styles.css']) && /@source not "\.\/routes\/thank-you\.tsx";/.test(fl['src/styles.css']), fl['src/styles.css']);
    ok('AGENTS.md keeps its notes and explains the pages', /Keep components small/.test(fl['AGENTS.md']) && /Pages built with Funnel OS/.test(fl['AGENTS.md']) && /src\/routes\/thank-you\.tsx/.test(fl['AGENTS.md']), fl['AGENTS.md']);
    const babel = require('@babel/parser'); let parsed = 0;
    for (const p of ['src/routes/index.tsx', 'src/routes/thank-you.tsx', 'src/funnel/use-funnel-page.ts']) { try { babel.parse(fl[p], { sourceType: 'module', plugins: ['typescript', 'jsx'] }); parsed++; } catch (e) { console.log(p, e.message); } }
    ok('route files are valid TSX', parsed === 3);
    ok('home route replaced, pages link by route', /createFileRoute\("\/"\)/.test(fl['src/routes/index.tsx']) && !/home: true/.test(fl['src/routes/index.tsx']) && /createFileRoute\("\/thank-you"\)/.test(fl['src/routes/thank-you.tsx']) && !/href="[a-z-]+\.html"/.test(fl['src/routes/index.tsx'] + fl['src/routes/thank-you.tsx']), fl['src/routes/index.tsx'].slice(0, 1600));
    ok('checkout link and images resolved', fl['src/routes/index.tsx'].includes('https://pay.example.com/knee') && !/\{\{(asset|kit|page):/.test(fl['src/routes/index.tsx']) && Object.keys(fl).some((p) => /^public\/funnel\/img-/.test(p)), Object.keys(fl));
    ok('no token, brand kit or secrets in the repository', !Object.keys(fl).some((p) => p.includes('fos-context')) && !JSON.stringify(fl).includes(TOK) && !JSON.stringify(r.data).includes(TOK), Object.keys(fl));
    const before = g.head;
    r = await push({ repo: 'me/studio' }); ok('pushing again with no changes makes no commit', r.data && r.data.studio.unchanged === true && (await st('me/studio')).head === before, r.data && r.data.studio);
    r = await push({ repo: 'me/studio', opt: 1 });
    const g1 = await st('me/studio');
    ok('another option replaces the pages in a new commit', r.data && r.data.studio.option === 1 && g1.head !== before && /option 1/.test(g1.message) && g1.files['src/routes/__root.tsx'] && g1.files['src/components/hero.tsx'], r.data && r.data.studio);
    r = await push({ repo: 'me/busy' }); const gb = await st('me/busy');
    ok('retries when AI Studio pushed at the same moment, and keeps its change', r.data && r.data.studio.kind === 'tanstack' && gb.files['src/components/about.tsx'] && gb.files['src/routes/thank-you.tsx'], r);
    r = await push({ repo: 'me/empty' }); const ge = await st('me/empty');
    ok('empty repository gets the plain site', r.data && r.data.studio.kind === 'static' && ['FUNNEL.md', 'index.html', 'thank-you.html', 'fos-motion.js'].every((p) => ge.files[p]) && !Object.keys(ge.files).some((p) => p.startsWith('src/')), { r, files: Object.keys(ge.files) });
    r = await fos(B, 'get', { id }); ok('the funnel remembers the repository', r.data.repo && r.data.repo.studio && r.data.repo.studio.full_name === 'me/empty' && !JSON.stringify(r.data.repo).includes(TOK), r.data.repo);
    r = await push({ repo: 'me/studio', opt: 2 }); ok('pushing back to a repository used before replaces its own pages', r.data && r.data.studio.full_name === 'me/studio' && r.data.studio.option === 2, r);
  }

  r = await fos(B, 'list'); ok('list', r.data.length === 1 && r.data[0].status === 'live' && r.data[0].type_name === 'Sales page', r.data);
  r = await fos(C, 'list'); ok('others see none', r.data.length === 0, r.data);
  r = await fos(B, 'reopen', { id }); ok('reopen for more changes', r.data.status === 'review', r);
  {
    const n0 = (await (await fetch(U + '/test/fos')).json()).github.filter((x) => x === 'POST /user/repos').length;
    r = await fos(B, 'approve', { id, opt: 2 }); f = await until(B, id, ['live', 'failed']);
    const pub = (f.steps || []).filter((x) => x.id === 'publish').pop() || {};
    const n1 = (await (await fetch(U + '/test/fos')).json()).github.filter((x) => x === 'POST /user/repos').length;
    ok('approving again points to the AI Studio repository', f.status === 'live' && /Code is in me\/studio/.test(pub.note || '') && n1 === n0 && f.repo.studio.full_name === 'me/studio', { s: f.status, note: pub.note, n0, n1 });
    r = await fos(B, 'reopen', { id });
  }
  r = await fos(C, 'delete', { id }); r = await fos(B, 'get', { id }); ok('others cannot delete', r.data && r.data.id === id, r);
  r = await fos(B, 'delete', { id }); r = await fos(B, 'list'); ok('delete', r.data.length === 0, r);

  // A build from a template gallery link: real images, drawn graphics, launch checklist.
  {
    r = await fos(B, 'create', { quiz: { ...QUIZ, start: 'template', template: '' } }); ok('template start needs a template', r.status === 400 && /Pick the template/.test(r.error), r);
    r = await fos(B, 'create', { quiz: { ...QUIZ, start: 'scratch', options: 2 } });
    ok('scratch start saved without a template', r.data && r.data.quiz.start === 'scratch' && !r.data.quiz.template, r.data && r.data.quiz);
    { const sid = r.data.id; const s2 = await until(B, sid, ['review', 'failed'], 120);
      ok('scratch build uses no templates', s2.status === 'review' && (s2.wireframe.refs || []).length === 0 && s2.wireframe.options[0].name === 'Designed from scratch' && /from scratch/.test((s2.steps.find((x) => x.id === 'wireframe') || {}).note), { s: s2.status, e: s2.error, refs: s2.wireframe && s2.wireframe.refs, o: s2.wireframe && s2.wireframe.options });
      const a = (await fos(B, 'files', { id: sid, opt: 1 })).data.files.find((x) => x.path === 'index').content; const b2 = (await fos(B, 'files', { id: sid, opt: 2 })).data.files.find((x) => x.path === 'index').content;
      ok('scratch pages get no template reference', !/tplref|libref/.test(a + b2), [a.match(/Main page[^<]*/), b2.match(/Main page[^<]*/)]);
      await fos(B, 'delete', { id: sid }); }
    // No browser in the function: the check falls back to first-screen shots from the screenshot service.
    await fetch(U + '/test/env', { method: 'POST', body: JSON.stringify({ FOS_SHOT_MOCK: '', FOS_CHROME: '/nonexistent/chrome' }) });
    const imgsBefore = (await (await fetch(U + '/test/fos')).json()).images;
    r = await fos(B, 'create', { quiz: { ...QUIZ, brand: 'Template Pack', options: 1, checkout_url: '', urls: [U + '/mock-gallery/'], offer: 'A pack of 8 funnel templates you can launch today. Includes the templates, the prompts and a launch guide. 37 dollars.' } });
    const gid = r.data && r.data.id; ok('gallery build starts', !!gid, r);
    let g = await until(B, gid, ['review', 'failed'], 120);
    ok('gallery build reaches review', g.status === 'review', { s: g.status, e: g.error, st: g.steps });
    await fetch(U + '/test/env', { method: 'POST', body: JSON.stringify({ FOS_SHOT_MOCK: '1', FOS_CHROME: '' }) });
    ok('without a browser the check says so and still reviews the first screen', g.options.every((o) => o.qa.checks.some((c) => c.ok === null && /Full-page screenshots skipped \(the screenshot browser did not start/.test(c.label)) && o.qa.checks.some((c) => /first screen renders cleanly/.test(c.label))), g.options.map((o) => o.qa.checks.map((c) => c.label)));
    const col = (g.steps || []).find((x) => x.id === 'collect');
    ok('collect step read the gallery', col && col.state === 'done' && /8 real images/.test(col.note), col);
    const im = (g.visuals || {}).images || [];
    ok('8 real shots kept with names', im.filter((x) => x.kind === 'shot').length === 8 && im.some((x) => x.title === 'Design 3' && /Sales page/.test(x.label)), im.filter((x) => x.kind === 'shot'));
    ok('site facts saved (count, categories)', g.visuals.sites[0].count === 8 && g.visuals.sites[0].cats.Coaches === 2, g.visuals.sites);
    ok('hero, wall, covers, share image and icons drawn', ['hero', 'wall', 'cover', 'og', 'icon', 'favicon'].every((k) => im.some((x) => x.kind === k)), im.map((x) => x.kind));
    const L2 = await (await fetch(U + '/test/fos')).json();
    ok('no AI images when real shots exist', L2.images === imgsBefore, [L2.images, imgsBefore]);
    r = await fos(B, 'assets'); ok('collected images stay out of Your images', r.data && !r.data.some((a) => /^(ref|gfx)-/.test(a.name)), r.data && r.data.map((a) => a.name));
    const dp = L2.vercel.filter((x) => x.deploy).pop();
    const og = im.find((x) => x.kind === 'og');
    ok('preview deploy carries the share image and icons', dp && dp.files.includes('assets/' + og.name) && dp.files.includes('assets/' + im.find((x) => x.kind === 'favicon').name), dp && dp.files);
    const F = require('../api/_fos.js');
    const html = F.launchMeta('<html><head><title>T</title></head><body></body></html>', g, '/');
    ok('share tags injected', /og:image" content="https:\/\/[^"]+\/assets\/gfx-/.test(html) && /twitter:card" content="summary_large_image"/.test(html) && /rel="icon"/.test(html), html);
    r = await fos(B, 'launch', { id: gid, opt: 1 });
    ok('launch checklist flags the missing checkout', r.data && r.data.items.some((x) => x.id === 'live' && x.ok === false) && r.data.ready === false, r.data);
    r = await fos(B, 'checkout', { id: gid, url: 'not a link' }); ok('checkout link checked', r.status === 400 && /https:\/\//.test(r.error), r);
    r = await fos(B, 'checkout', { id: gid, url: 'https://pay.example.com/pack' });
    ok('checkout link saved and pages republish', r.data && r.data.quiz.checkout_url === 'https://pay.example.com/pack' && r.data.status === 'running' && r.data.step === 'preview', r.data && [r.data.status, r.data.step]);
    g = await until(B, gid, ['review', 'failed'], 60); ok('back to review after the link', g.status === 'review', { s: g.status, e: g.error });
    r = await fos(B, 'rebuild', { id: gid });
    ok('build it again keeps research and restarts at collect', r.data && r.data.status === 'running' && r.data.step === 'collect' && r.data.research, r.data && [r.data.status, r.data.step]);
    g = await until(B, gid, ['review', 'failed'], 120); ok('rebuild reaches review', g.status === 'review', { s: g.status, e: g.error, st: g.steps });
    await fos(B, 'delete', { id: gid });
  }

  console.log(`fos: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
