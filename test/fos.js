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
  r = await fos(B, 'create', { quiz: { ...QUIZ, images: [{ name: img, role: 'product', label: 'Workbook' }] } });
  ok('create', r.data && r.data.id && r.data.status === 'running', r);
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
  ok('steps logged in order', ['research', 'collect', 'offer', 'copy', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'done'].every((s) => f.steps.some((x) => x.id === s && x.state === 'done')), f.steps);
  ok('each option has its own library reference', f.wireframe && (f.wireframe.refs || []).length === 2 && f.wireframe.refs[0].id !== f.wireframe.refs[1].id && f.wireframe.refs.every((r) => r.live && r.name), f.wireframe && f.wireframe.refs);
  ok('wireframe note names the references', (f.steps.find((x) => x.id === 'wireframe') || {}).note.includes('template library'), f.steps.find((x) => x.id === 'wireframe'));
  ok('pages for the type', f.pages.map((p) => p.path).join() === 'index,thank-you', f.pages);
  let L = await (await fetch(U + '/test/fos')).json();
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

  r = await fos(B, 'list'); ok('list', r.data.length === 1 && r.data[0].status === 'live' && r.data[0].type_name === 'Sales page', r.data);
  r = await fos(C, 'list'); ok('others see none', r.data.length === 0, r.data);
  r = await fos(B, 'reopen', { id }); ok('reopen for more changes', r.data.status === 'review', r);
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
    const imgsBefore = (await (await fetch(U + '/test/fos')).json()).images;
    r = await fos(B, 'create', { quiz: { ...QUIZ, brand: 'Template Pack', options: 1, checkout_url: '', urls: [U + '/mock-gallery/'], offer: 'A pack of 8 funnel templates you can launch today. Includes the templates, the prompts and a launch guide. 37 dollars.' } });
    const gid = r.data && r.data.id; ok('gallery build starts', !!gid, r);
    let g = await until(B, gid, ['review', 'failed'], 120);
    ok('gallery build reaches review', g.status === 'review', { s: g.status, e: g.error, st: g.steps });
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
