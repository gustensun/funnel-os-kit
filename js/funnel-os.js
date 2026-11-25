// Funnel OS: a quiz, then the AI researches, writes, designs and builds the funnel,
// puts live previews online, checks them, and waits for the member to approve one option.
(() => {
  const TPL = window.FOS_TEMPLATES || [];
  const GALLERY = 'https://tpl-gallery-library.vercel.app/';
  const DRAFT = 'gai-fos-draft';
  const PRESETS = [
    { name: 'Ivory and forest', bg: '#faf7ef', ink: '#0b2418', accent: '#668168', deep: '#0b2418' },
    { name: 'Paper and ink', bg: '#f6f4ef', ink: '#141414', accent: '#c2410c', deep: '#1c1917' },
    { name: 'Clean blue', bg: '#ffffff', ink: '#0f172a', accent: '#2563eb', deep: '#0b1736' },
    { name: 'Sand and clay', bg: '#f5efe6', ink: '#2a1d14', accent: '#b4532a', deep: '#3a2418' },
    { name: 'Night and lime', bg: '#0d0f0c', ink: '#f4f6ee', accent: '#c6f24e', deep: '#171a14' },
    { name: 'Blush and plum', bg: '#fbf4f2', ink: '#2b1426', accent: '#a23b72', deep: '#3b1835' },
  ];
  const PAIRS = [['Instrument Serif', 'Inter'], ['Fraunces', 'DM Sans'], ['Playfair Display', 'Source Sans 3'], ['Bricolage Grotesque', 'Hanken Grotesk'], ['Space Grotesk', 'Inter'], ['Syne', 'Figtree'], ['Manrope', 'Manrope'], ['Bebas Neue', 'Work Sans'], ['Newsreader', 'Instrument Sans'], ['Sora', 'Onest']];
  const ROLE = { logo: 'Logo', me: 'Me or my team', product: 'Product or mockup', other: 'Other' };
  const STEP_ORDER = ['research', 'collect', 'offer', 'copy', 'chief', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'fix', 'done'];
  const STATUS = { running: ['Working', 'wait'], review: ['Ready for review', 'ok'], live: ['Live', 'ok'], failed: ['Needs attention', 'no'], paused: ['Paused', 'no'] };

  let G = null; // helpers from the app shell
  let poll = null; let kicking = 0;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const call = (action, b) => G.api('funnel', { action, ...(b || {}) });
  const esc = (s) => G.esc(String(s == null ? '' : s));
  const ago = (d) => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
  const stop = () => { clearInterval(poll); poll = null; if (kitTimer) kitFlush(); };
  const thumb = (t) => (/^https:\/\//.test(t) ? t : GALLERY + t); // gallery paths, or a full https address for your own
  const load = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT)) || null; } catch { return null; } };
  const keep = (q) => { try { sessionStorage.setItem(DRAFT, JSON.stringify(q)); } catch { /* full */ } };
  const fresh = () => ({ step: 0, type: '', start: 'library', template: '', brand: '', tagline: '', offer_id: '', offer_name: '', price: '', offer: '', audience: '', owner: '', voice: '', avoid: '', proof: '', checkout_url: '', fonts: null, palette: null, vibe: '', images: [], urls: '', docs: [], notes: '', options: 1, ai_images: true, github_user: '', improve_offer: true, proof_mode: 'auto', kit_sync: true });
  const GIT_SYNC_HELP = 'https://help.gohighlevel.com/support/solutions/articles/155000009214-how-to-use-git-sync-in-ai-studio';
  // A fine-grained token page with the name, the repository owner and Contents write filled in.
  const tokenLink = (owner) => 'https://github.com/settings/personal-access-tokens/new?' + new URLSearchParams({ name: 'Funnel OS push', description: 'Pushes an approved funnel to the AI Studio repository', expires_in: '7', contents: 'write', ...(owner ? { target_name: owner } : {}) }).toString();
  const ownerOf = (v) => { const m = String(v || '').trim().replace(/^git@github\.com:/i, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').match(/^([A-Za-z0-9][A-Za-z0-9-]{0,38})\//); return m ? m[1] : ''; };

  // ---------- brand kit ----------
  // Saved once, used by every new funnel: brand, colors and fonts, images, offers, proof and files.
  const KIT_TABS = [['brand', 'Brand'], ['look', 'Colors and fonts'], ['images', 'Logos and images'], ['offers', 'Offers'], ['proof', 'Proof and files']];
  const hexId = () => [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
  // The kit being edited stays in memory across its tabs, so a save in flight is never undone by a reload.
  let KQ = null; let kitTimer = null; let kitSaving = null; let kitDirty = false; let kitErr = null; let kitDemo = false;
  const kitEdit = (k) => ({ brand: '', tagline: '', owner: '', audience: '', voice: '', avoid: '', vibe: '', proof: '', notes: '', proof_mode: 'auto', palette: null, fonts: null, images: [], docs: [], offers: [], main_offer: '', ...(k || {}), urls: ((k && k.urls) || []).join('\n') });
  const kitOut = (q) => ({ brand: q.brand, tagline: q.tagline, owner: q.owner, audience: q.audience, voice: q.voice, avoid: q.avoid, urls: q.urls, palette: q.palette, fonts: q.fonts, vibe: q.vibe, images: q.images, proof_mode: q.proof_mode, proof: q.proof, docs: q.docs, notes: q.notes, offers: q.offers, main_offer: q.main_offer });
  const offerQuiz = (o) => ({ offer_id: o.id, offer_name: o.name || '', price: o.price || '', offer: o.offer || '', checkout_url: o.checkout_url || '' });
  // The saved kit as quiz answers, with its main offer filled in.
  const kitQuiz = (k) => {
    const q = {};
    ['brand', 'tagline', 'owner', 'audience', 'voice', 'avoid', 'vibe', 'proof', 'notes'].forEach((x) => { if (k[x]) q[x] = k[x]; });
    if (k.proof_mode && k.proof_mode !== 'auto') q.proof_mode = k.proof_mode;
    if (k.palette) q.palette = k.palette;
    if (k.fonts) q.fonts = k.fonts;
    if ((k.images || []).length) q.images = k.images.map((x) => ({ ...x }));
    if ((k.urls || []).length) q.urls = k.urls.join('\n');
    if ((k.docs || []).length) q.docs = k.docs.map((x) => ({ ...x }));
    const o = (k.offers || []).find((x) => x.id === k.main_offer) || (k.offers || [])[0];
    if (o) Object.assign(q, offerQuiz(o));
    return q;
  };
  const kitEmpty = (k) => !k || (!k.brand && !k.offers.length && !k.images.length && !k.palette && !k.fonts && !k.audience && !k.voice);
  function kitStatus() {
    const el = document.getElementById('kit-status'); if (!el) return;
    const [txt, cls] = kitDemo ? ['Not saved in the demo', 'demo'] : kitErr ? ['Not saved', 'no'] : kitSaving || kitTimer ? ['Saving', 'wait'] : KQ && KQ.updated_at ? ['Saved ' + ago(KQ.updated_at), 'ok'] : ['Saves as you type', 'ok'];
    el.className = 'kit-status ' + cls; el.textContent = txt;
    const box = document.getElementById('kit-err'); if (!box) return;
    box.innerHTML = kitErr ? G.errBox(kitErr, true) : '';
    const r = box.querySelector('[data-retry]'); if (r) r.onclick = () => kitFlush();
  }
  function kitSave() { if (kitDemo || !KQ) return; kitDirty = true; clearTimeout(kitTimer); kitTimer = setTimeout(kitFlush, 700); kitStatus(); }
  function kitFlush() {
    clearTimeout(kitTimer); kitTimer = null;
    if (!KQ || kitDemo) return Promise.resolve();
    if (kitSaving) { kitDirty = true; return kitSaving; }
    if (!kitDirty) return Promise.resolve();
    kitDirty = false; kitErr = null; const mine = KQ;
    kitSaving = call('context-save', { kit: kitOut(mine) })
      .then((r) => { if (KQ === mine && r && r.kit) KQ.updated_at = r.kit.updated_at; })
      .catch((e) => { kitErr = e; kitDirty = true; })
      .finally(() => { kitSaving = null; kitStatus(); if (kitDirty && !kitErr) kitFlush(); });
    kitStatus(); return kitSaving;
  }
  // Waits until every change to the kit is saved, or the save failed.
  async function kitSettle() { if (kitTimer) kitFlush(); while (kitSaving) await kitSaving; }
  window.addEventListener('beforeunload', (e) => { if (kitTimer || kitSaving || (kitErr && kitDirty)) { if (kitTimer) kitFlush(); e.preventDefault(); e.returnValue = ''; } });

  // ---------- entry ----------
  async function mount(main, helpers, id) {
    G = helpers; stop();
    if (id === 'new') return editor(main);
    if (id) return detail(main, id);
    return list(main);
  }
  async function kit(main, helpers, tab) {
    G = helpers; stop();
    return editor(main, { kit: true, tab: KIT_TABS.some(([k]) => k === tab) ? tab : 'brand' });
  }

  function frame(main, title, sub, right) {
    const coach = G.esc(G.coach || 'AI Coach');
    right = `<button class="btn sm ghost" data-ask-coach aria-label="Ask ${coach}" title="Opens a chat with ${coach}">${G.ic('spark')}<span class="fos-ask-l">Ask ${coach}</span></button>` + (right || '');
    main.innerHTML = G.topbar(title, sub, right) + '<div class="scroll" id="fos-scroll"><div class="fos" id="fos"><div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Loading</div></div></div>';
    G.bindTop();
    const ag = $('[data-ask-coach]', main); if (ag) ag.onclick = () => G.ask(askText ? askText() : '');
    askText = null; return $('#fos');
  }
  // What the Ask coach button pre-fills, set by the view that is open.
  let askText = null;
  function gate(st) {
    if (st.demo) return `<div class="err" role="alert"><p>The demo account can look around but cannot build funnels. <a href="#/join">Create your own account</a> to build one.</p></div>`;
    if (!st.open) return `<div class="err" role="alert"><p>Funnel OS is opening soon. The admin turns it on for members when it is ready. Until then, <a href="#/c/funnels">ask ${G.esc(G.coach || 'AI Coach')}</a> about your funnel.</p></div>`;
    if (!st.ai) return G.errBox({ message: 'Funnel OS has no AI connected yet. The admin adds it in Members and settings. Try again later today.', fix: { label: 'Add the Perplexity key', href: '#/admin', admin: true } });
    return '';
  }

  // ---------- list ----------
  async function list(main) {
    const box = frame(main, 'My funnels', 'Ready-to-launch funnels, with live previews to compare', '<a class="btn sm primary" href="#/funnels/new">New funnel</a>');
    let st, items;
    try { [st, items] = await Promise.all([call('status'), call('list')]); }
    catch (e) { box.innerHTML = G.errBox(e, true); $('[data-retry]', box).onclick = () => list(main); return; }
    G.fos = st;
    const blocked = gate(st);
    const stage = window.FosStage ? '<div class="fos-stage" data-fos-stage></div>' : '';
    box.innerHTML = `<div class="fos-head"><div><h2>Funnel OS</h2><p class="lead">Answer a short quiz. The AI researches your market, sharpens your offer, writes the copy, plans the wireframe, builds the brand, designs every page and puts live previews online. You pick one, ask for changes, then approve it.</p></div></div>
      ${blocked}
      ${st.admin && !st.host ? `<div class="note">Live preview links need a Vercel token. Until it is added, previews show inside Funnel OS only. <a href="#/admin">Add it under Members and settings</a>.</div>` : ''}
      ${items.length ? `<div class="fos-list">${items.map(card).join('')}</div><h3 class="fos-how">How a build runs</h3>${stage}` : `${stage}<div class="fos-empty"><p>No funnels yet.</p>${blocked ? '' : '<a class="btn primary" href="#/funnels/new">Build your first funnel</a>'}</div>`}`;
    if (window.FosStage) window.FosStage.mount($('[data-fos-stage]', box), { mode: 'demo' });
    if (items.some((f) => f.status === 'running')) poll = setInterval(async () => { if (!document.body.contains(box)) return stop(); try { const n = await call('list'); if (JSON.stringify(n.map((x) => [x.status, x.step])) !== JSON.stringify(items.map((x) => [x.status, x.step]))) { stop(); list(main); } } catch { /* next tick */ } }, 6000);
  }
  function card(f) {
    const [label, cls] = STATUS[f.status] || ['', ''];
    const t = TPL.find((x) => x.id === f.template);
    return `<a class="fos-card" href="#/funnels/${f.id}"><div class="fos-thumb">${t ? `<img src="${esc(thumb(t.thumb))}" alt="" loading="lazy">` : `<span>${esc((f.title || 'F').slice(0, 1))}</span>`}</div>
      <div class="fos-meta"><b>${esc(f.title)}</b><span>${esc(f.type_name || '')}${f.status === 'running' ? ' · ' + esc(stepLabel(f.step)) : ''} · ${ago(f.updated_at)}</span></div><span class="pill ${cls}">${esc(label)}</span></a>`;
  }
  const LABEL = { research: 'Market research', collect: 'Product images', offer: 'Offer', copy: 'Copy', chief: 'Copy review', wireframe: 'Wireframe', brand: 'Branding', graphics: 'Graphics', build: 'Building pages', preview: 'Live previews', qa: 'Quality check', fix: 'Fixes', done: 'Ready for review', revise: 'Making your changes', publish: 'Publishing' };
  const stepLabel = (s) => LABEL[s] || s || '';

  // ---------- quiz ----------
  const STEPS = ['Funnel type', 'Template', 'Your offer', 'Look and feel', 'Images', 'Context', 'Build'];
  // The new funnel quiz, and the brand kit editor, which shares its fields.
  async function editor(main, mode) {
    const KIT = !!(mode && mode.kit);
    const box = KIT ? frame(main, 'Brand kit', 'Used by every new funnel', '<a class="btn sm primary" href="#/funnels/new">New funnel</a>') : frame(main, 'New funnel', 'Funnel OS', '<a class="btn sm ghost" href="#/funnels">Cancel</a>');
    const who = G.me && (G.me.id || G.me.email);
    if (KQ && KQ.who !== who) KQ = null;
    let st; let saved = null;
    try {
      const kitP = KIT && KQ ? Promise.resolve(null) : kitSettle().then(() => call('context')).then((r) => (r && r.kit) || null);
      [st, saved] = await Promise.all([G.fos ? Promise.resolve(G.fos) : call('status'), KIT ? kitP : kitP.catch(() => null)]);
      G.fos = st;
    } catch (e) { box.innerHTML = G.errBox(e, true); $('[data-retry]', box).onclick = () => editor(main, mode); return; }
    if (KIT) {
      if (!st.demo && !st.open) { box.innerHTML = gate(st); return; }
      kitDemo = !!st.demo;
      if (!KQ) { KQ = kitEdit(saved); KQ.who = who; }
    } else {
      const blocked = gate(st);
      if (blocked) { box.innerHTML = blocked + '<p><a class="btn" href="#/funnels">Back to Funnel OS</a></p>'; return; }
      if (kitEmpty(saved)) saved = null;
    }
    const draft = KIT ? null : load();
    const q = KIT ? KQ : { ...fresh(), ...(draft || {}) };
    if (!KIT && !draft && saved) { Object.assign(q, kitQuiz(saved)); q.from_kit = true; }
    let assets = []; call('assets').then((a) => { assets = a || []; if (KIT ? ['look', 'images'].includes(mode.tab) : q.step === 3 || q.step === 4) draw(); }).catch(() => {});
    const save = () => (KIT ? kitSave() : keep(q));
    let role = 'other';
    box.ondragover = (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); };
    box.ondrop = (e) => { if (!e.target.closest('[data-drop]')) e.preventDefault(); };
    // A redraw on the same step keeps the scroll position; a new step starts at the top.
    let drawn = null;
    const draw = () => {
      const key = KIT ? mode.tab : q.step;
      const sc = $('#fos-scroll'); const y = drawn === key && sc ? sc.scrollTop : 0; drawn = key;
      if (KIT) {
        const i = KIT_TABS.findIndex(([k]) => k === mode.tab); const prev = KIT_TABS[i - 1]; const next = KIT_TABS[i + 1];
        box.innerHTML = `${kitDemo ? '<div class="note">The demo account can look around the brand kit, but nothing here is saved. <a href="#/join">Create your own account</a> to save yours.</div>' : ''}
          <div class="kit-head"><p class="lead">Save your brand once. Every new funnel starts from it, and you can still change anything in the quiz.</p><span id="kit-status" class="kit-status" role="status" aria-live="polite"></span></div>
          <nav class="kit-tabs" aria-label="Brand kit sections">${KIT_TABS.map(([k, l], n) => `<a href="#/kit/${k}"${k === mode.tab ? ' class="on" aria-current="page"' : ''}><span>${String(n + 1).padStart(2, '0')}</span>${esc(l)}</a>`).join('')}</nav>
          <div id="kit-err"></div>
          <div class="fos-pane">${({ brand: kBrand, look: stLook, images: stImages, offers: kOffers, proof: kProof })[mode.tab]()}</div>
          <div class="fos-nav">${prev ? `<a class="btn ghost" href="#/kit/${prev[0]}">Back</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/kit/${next[0]}">Next: ${esc(next[1])}</a>` : '<a class="btn primary" href="#/funnels/new">Build a funnel with it</a>'}</div>
          <div id="fos-msg"></div>`;
        bind(); kitStatus(); if (sc) sc.scrollTop = y;
        const tabs = $('.kit-tabs', box); const on = tabs && $('a.on', tabs); if (on && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = on.offsetLeft - tabs.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2;
        return;
      }
      const s = q.step;
      box.innerHTML = `<ol class="fos-steps">${STEPS.map((n, i) => `<li class="${i === s ? 'on' : i < s ? 'done' : ''}"><button data-goto="${i}" ${i > s && !ok(i - 1) ? 'disabled' : ''}><span>${i + 1}</span>${esc(n)}</button></li>`).join('')}</ol>
        <div class="fos-pane">${[stType, stTemplate, stOffer, stLook, stImages, stContext, stBuild][s]()}</div>
        <div class="fos-nav">${s ? '<button class="btn ghost" data-back>Back</button>' : '<span></span>'}${s < STEPS.length - 1 ? `<button class="btn primary" data-next>Continue</button>` : `<button class="btn primary" data-build>Build my funnel</button>`}</div>
        <div id="fos-msg"></div>`;
      bind(); if (sc) sc.scrollTop = y;
    };
    const ok = (i) => !!q.type && (i < 2 || (q.brand.trim() && q.offer.trim().length >= 40));
    const need = () => {
      if (q.step === 0 && !q.type) return 'Pick a funnel type to continue.';
      if (q.step === 1 && (q.start || (q.template ? 'template' : 'library')) === 'template' && !q.template) return 'Pick the template to build from, or choose Best match or Build from scratch.';
      if (q.step === 2 && !q.brand.trim()) return 'Add your brand or business name.';
      if (q.step === 2 && q.offer.trim().length < 40) return 'Describe what you sell in a few more sentences: what it is, who it is for, the result, the price and what is included.';
      if (q.step === 3 && q.palette === 'site' && !q.urls.trim()) return 'To match your website, add its link under Context, or pick colors here.';
      return '';
    };
    const types = st.types || [];
    const stType = () => `<h2>What are you building?</h2><p class="lead">Pick the funnel type. It decides the pages and how the copy is structured.</p>
      <div class="fos-types">${types.map((t) => `<button class="fos-type${q.type === t.id ? ' on' : ''}" data-type="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.goal.charAt(0).toUpperCase() + t.goal.slice(1))}.</span><small>${TPL.filter((x) => x.funnel === t.id).length} templates</small></button>`).join('')}</div>`;
    let showAll = false;
    const stTemplate = () => {
      const pool = showAll ? TPL : TPL.filter((t) => t.funnel === q.type);
      const mode = q.start || (q.template ? 'template' : 'library');
      const modes = [
        ['template', 'Build from a template', 'Pick one of the templates below. Option 1 follows it closely, rewritten for your business.'],
        ['library', 'Best match from the library', `Funnel OS picks the closest of the ${TPL.length} templates for each option, based on your funnel and what you sell.`],
        ['scratch', 'Build from scratch', 'No templates at all. An original design made from your brand kit, your copy and the design rules.'],
      ];
      const sel = mode === 'template' ? TPL.find((t) => t.id === q.template) : null;
      return `<h2>How should it start?</h2><p class="lead">Build from a template you pick, let Funnel OS match one for you, or start from a blank page.</p>
      <div class="fos-start" role="radiogroup" aria-label="Starting point">${modes.map(([id, b, sm]) => `<button role="radio" aria-checked="${mode === id}" class="${mode === id ? 'on' : ''}" data-start="${id}"><b>${b}</b><span>${sm}</span></button>`).join('')}</div>
      ${mode === 'template' ? `<h3 class="fos-h3">${sel ? 'Building from ' + esc(sel.name) : 'Pick a template'}</h3>
      <div class="fos-tpls">${pool.map((t) => `<button class="fos-tpl${q.template === t.id ? ' on' : ''}" data-tpl="${t.id}" aria-pressed="${q.template === t.id}"><div class="im"><img src="${esc(thumb(t.thumb))}" alt="" loading="lazy"></div><b>${esc(t.name)}</b><small>${esc(t.label)} · ${t.pages.length} page${t.pages.length > 1 ? 's' : ''}</small><a href="${esc(t.live)}" target="_blank" rel="noopener" data-stop>Open live</a></button>`).join('')}</div>
      <p><button class="btn sm ghost" data-all>${showAll ? 'Show only ' + esc((types.find((x) => x.id === q.type) || {}).name || 'matching') + ' templates' : 'Show all ' + TPL.length + ' templates'}</button></p>` : ''}`;
    };
    const f = (name, label, ph, hint, area, rows) => `<label class="field"><span>${label}</span>${area ? `<textarea class="textarea" name="${name}" rows="${rows || 4}" placeholder="${esc(ph)}">${esc(q[name])}</textarea>` : `<input class="input" name="${name}" placeholder="${esc(ph)}" value="${esc(q[name])}">`}${hint ? `<small>${hint}</small>` : ''}</label>`;
    const OFFER_PH = 'A 6-week online program for runners with knee pain. Weekly video sessions, a strength plan, two 1:1 calls and a private community. 497 dollars, or 3 payments of 179. 30-day money-back guarantee.';
    const OFFER_TIP = 'Be very specific: what it is, who it is for, the result and how long it takes, the price and payment options, what is included, bonuses and your guarantee. Vague in, vague out.';
    const proofFields = () => `<div class="field"><span>Testimonials and proof</span><div class="fos-seg sm" role="radiogroup" aria-label="Testimonials">${[['auto', 'Read my notes'], ['real', 'Use what I paste'], ['placeholder', 'Placeholders for now'], ['none', 'Leave them out']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${q.proof_mode === k}" class="${q.proof_mode === k ? 'on' : ''}" data-pm="${k}">${l}</button>`).join('')}</div></div>
      ${f('proof', 'Real proof, or what you want', q.proof_mode === 'placeholder' ? 'Optional: any real testimonials you already have. The rest become marked placeholders you swap later.' : 'Paste testimonials with names, results and numbers exactly. Or write things like: use placeholder testimonials for now, I will add them later.', q.proof_mode === 'placeholder' ? 'Placeholders look like [Client name] and [Client quote], so they are easy to find and replace.' : 'The AI never makes up proof. Write in your own words what you want, for example "use placeholder testimonials, I will add real ones later".', true, 4)}`;
    // Where the quiz answers came from, with a way back to the saved kit.
    const kitBar = () => {
      if (st.demo) return '';
      if (saved && q.from_kit) return '<p class="kit-from">Filled in from your brand kit. Changes here apply to this funnel. <a href="#/kit/brand">Edit the brand kit</a></p>';
      if (saved) return '<p class="kit-from">You have a saved brand kit. <button type="button" class="link" data-usekit>Fill in this quiz from it</button></p>';
      return '<p class="kit-from">Save your brand, colors, images and offers once in the <a href="#/kit/brand">brand kit</a>, and every new funnel starts from them.</p>';
    };
    const offerPick = () => (saved && (saved.offers || []).length ? `<div class="field"><span>Which offer is this funnel for?</span><div class="fos-chips" role="radiogroup" aria-label="Saved offers">${saved.offers.map((o) => `<button type="button" class="chip${q.offer_id === o.id ? ' on' : ''}" role="radio" aria-checked="${q.offer_id === o.id}" data-kof="${esc(o.id)}">${esc(o.name || 'Untitled offer')}</button>`).join('')}<button type="button" class="chip${!q.offer_id ? ' on' : ''}" role="radio" aria-checked="${!q.offer_id}" data-kof="">New offer</button></div><small>Saved in your brand kit. <a href="#/kit/offers">Edit offers</a></small></div>` : '');
    const stOffer = () => `<h2>What do you sell?</h2><p class="lead">This is the most important step. The AI builds the whole funnel from it.</p>
      ${kitBar()}
      ${f('brand', 'Brand or business name', 'Northside Physio')}
      ${f('tagline', 'Tagline, if you have one', 'Pain-free in 6 weeks')}
      ${offerPick()}
      <div class="kit-row">${f('offer_name', 'Offer name', 'Knee Reset')}${f('price', 'Price', '497 dollars, or 3 payments of 179')}</div>
      <label class="field"><span>What you sell</span><textarea class="textarea" name="offer" rows="8" placeholder="${esc(OFFER_PH)}">${esc(q.offer)}</textarea>
        <small class="fos-tip">${OFFER_TIP}</small></label>
      <label class="fos-toggle"><input type="checkbox" data-improve ${q.improve_offer !== false ? 'checked' : ''}><span class="sw-t" aria-hidden="true"></span><span><b>Improve my offer stack</b><small>While it builds, the AI sharpens your stack, bonuses and guarantee from the market research. Nothing to wait for here. You see the final offer in the Offer tab and can ask for changes.</small></span></label>
      ${f('audience', 'Who it is for', 'Recreational runners aged 30 to 55 who keep getting knee pain', '', true, 2)}
      ${f('owner', 'Who is behind it', 'Anna Lind, physiotherapist for 12 years', 'Name and one line. Leave empty for a brand without a face.')}
      ${proofFields()}
      ${f('checkout_url', 'Checkout or booking link, optional', 'https://', 'Buttons point here. Forms and checkout are connected by you after approval.')}`;
    // Brand kit tabs. Colors and fonts, and Logos and images, are the quiz steps themselves.
    const kBrand = () => `<h2>Brand</h2><p class="lead">Who you are, who it is for and how you sound.</p>
      ${f('brand', 'Brand or business name', 'Northside Physio')}
      ${f('tagline', 'Tagline, if you have one', 'Pain-free in 6 weeks')}
      ${f('owner', 'Who is behind it', 'Anna Lind, physiotherapist for 12 years', 'Name and one line. Leave empty for a brand without a face.')}
      ${f('audience', 'Who it is for', 'Recreational runners aged 30 to 55 who keep getting knee pain', '', true, 2)}
      ${f('voice', 'Brand voice', 'Warm and plain. Short sentences. Sounds like a coach who has been there.', 'How the copy should sound. The AI writes every page in this voice.', true, 2)}
      ${f('avoid', 'Words and claims to avoid', 'cure, guaranteed results, hustle', 'The AI keeps these out of the copy.', true, 2)}
      ${f('urls', 'Links', 'https://yoursite.com  https://instagram.com/you', 'Your website and social profiles. The AI reads them for facts about you, your colors and your fonts. Up to 5.', true, 2)}`;
    const of = (i, k, label, ph, hint) => { const o = q.offers[i]; return `<label class="field"><span>${label}</span>${k === 'offer' ? `<textarea class="textarea" rows="7" data-of="${k}" data-i="${i}" placeholder="${esc(ph)}">${esc(o[k])}</textarea>` : `<input class="input" data-of="${k}" data-i="${i}" placeholder="${esc(ph)}" value="${esc(o[k])}"${k === 'checkout_url' ? ' type="url" inputmode="url"' : ''}>`}${hint ? `<small${k === 'offer' ? ' class="fos-tip"' : ''}>${hint}</small>` : ''}</label>`; };
    const kOffers = () => {
      const main = q.offers.some((o) => o.id === q.main_offer) ? q.main_offer : (q.offers[0] || {}).id;
      return `<h2>Offers</h2><p class="lead">What you sell, with the price and checkout link. In the quiz you pick one, and it fills in the offer step.</p>
      ${q.offers.map((o, i) => `<section class="kit-offer" aria-label="${esc(o.name || 'Offer ' + (i + 1))}">
        <div class="kit-offer-top"><b data-oname="${i}">${esc(o.name || 'Offer ' + (i + 1))}</b>${q.offers.length > 1 ? `<label class="kit-main"><input type="radio" name="kit-main" data-main="${esc(o.id)}"${o.id === main ? ' checked' : ''}><span>Main offer</span></label>` : '<span class="pill ok">Main offer</span>'}</div>
        <div class="kit-row">${of(i, 'name', 'Offer name', 'Knee Reset')}${of(i, 'price', 'Price', '497 dollars, or 3 payments of 179')}</div>
        ${of(i, 'offer', 'What you sell', OFFER_PH, OFFER_TIP)}
        ${of(i, 'checkout_url', 'Checkout or booking link, optional', 'https://', 'Buttons point here.')}
        <button type="button" class="btn sm ghost" data-odel="${i}">Remove this offer</button></section>`).join('') || '<p class="muted">No offers yet. Add the one you sell most, then any others.</p>'}
      ${q.offers.length < 8 ? `<button type="button" class="btn" data-oadd>${G.ic('plus')}Add ${q.offers.length ? 'another' : 'an'} offer</button>` : '<p class="muted">Eight offers is the limit. Remove one to add another.</p>'}
      <p class="muted kit-foot">The main offer fills in the quiz by default. Building a funnel for a new offer adds it here.</p>`;
    };
    const kProof = () => `<h2>Proof and files</h2><p class="lead">Testimonials, results and the documents the AI reads before it writes.</p>
      ${proofFields()}
      ${docsField()}
      ${f('notes', 'Notes', 'Your style, competitors you like, what has worked before', 'Every new funnel starts with these notes, and you can add to them in the quiz.', true, 5)}`;
    const FONT_CSS = 'https://fonts.googleapis.com/css2?' + [...new Set(PAIRS.flat())].map((n) => 'family=' + n.replace(/ /g, '+') + ':wght@400;600').join('&') + '&display=swap';
    const loadFonts = () => { if (!document.getElementById('fos-gf')) { const l = document.createElement('link'); l.id = 'fos-gf'; l.rel = 'stylesheet'; l.href = FONT_CSS; document.head.appendChild(l); } };
    const myFonts = () => assets.filter((a) => a.role === 'font');
    const ff = (n) => `'${String(n).replace(/'/g, '')}'`;
    const fontCard = (on, attrs, d, b, tag) => `<button type="button" class="fos-font${on ? ' on' : ''}" ${attrs}><span class="fx-h" style="font-family:${ff(d)},serif">${esc(q.brand || 'Your offer')}, made clear</span><span class="fx-b" style="font-family:${ff(b)},sans-serif">Plain words, a clear promise and one next step for the reader.</span><small>${esc(d)}${d === b ? '' : ' + ' + esc(b)}${tag ? ' · ' + tag : ''}</small></button>`;
    const mock = (p) => `<span class="pm" style="background:${p.bg}"><i class="pm-bar" style="background:${p.ink}"></i><i class="pm-l" style="background:${p.ink}"></i><i class="pm-l s" style="background:${p.ink}"></i><i class="pm-btn" style="background:${p.accent}"></i><i class="pm-band" style="background:${p.deep}"><i style="background:${p.accent}"></i></i></span>`;
    const stLook = () => {
      loadFonts(); faces();
      const pmode = !q.palette ? 'ai' : q.palette === 'site' ? 'site' : q.palette.name ? 'preset:' + q.palette.name : 'custom';
      const cp = q.palette && typeof q.palette === 'object' ? q.palette : PRESETS[0];
      const files = (q.fonts && q.fonts.files) || {};
      const mine = myFonts();
      return `<h2>${KIT ? 'Colors and fonts' : 'Look and feel'}</h2><p class="lead">${KIT ? 'Your brand colors and fonts. Leave them on AI pick if you have none yet, and each funnel gets its own.' : 'Leave these on AI pick and the AI chooses from your offer, market and template.'}</p>
      <h3>Fonts</h3><div class="fos-fonts"><button type="button" class="fos-font ai${!q.fonts ? ' on' : ''}" data-font=""><span class="fx-h">AI pick</span><span class="fx-b">Chosen to fit your market, offer and template.</span><small>Recommended</small></button>${PAIRS.map(([d, b], i) => fontCard(q.fonts && !q.fonts.files && q.fonts.display === d && q.fonts.body === b, `data-font="${i}"`, d, b)).join('')}</div>
      <div class="fos-drop sm" data-drop="font" tabindex="0" role="button" aria-label="Add your own font files"><b>Your own fonts</b><span>Drop WOFF2, WOFF, TTF or OTF files here, or <u>choose files</u></span><input type="file" id="fos-fontfile" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" multiple hidden></div>
      <div id="fos-fontmsg"></div>
      ${mine.length ? `<div class="fos-myfonts">${mine.map((a) => `<div class="fos-myfont"><span class="fx-h" style="font-family:${ff('fos-' + a.name)},serif">${esc(a.label || 'My font')}</span><small>${esc(a.name.split('.').pop().toUpperCase())}</small><div class="btns"><button type="button" class="btn sm${files.display === a.name ? ' primary' : ''}" data-myfont="display" data-n="${esc(a.name)}">Headings</button><button type="button" class="btn sm${files.body === a.name ? ' primary' : ''}" data-myfont="body" data-n="${esc(a.name)}">Body text</button><button type="button" class="btn sm ghost" data-adel="${esc(a.name)}">Remove</button></div></div>`).join('')}</div>` : ''}
      <h3>Colors</h3><div class="fos-pals">
        <button type="button" class="fos-palc ai${pmode === 'ai' ? ' on' : ''}" data-pal="ai"><span class="pm ai"><b>AI</b></span><small>AI pick</small></button>
        <button type="button" class="fos-palc ai${pmode === 'site' ? ' on' : ''}" data-pal="site"><span class="pm ai"><b>www</b></span><small>Match my website</small></button>
        ${PRESETS.map((p) => `<button type="button" class="fos-palc${pmode === 'preset:' + p.name ? ' on' : ''}" data-pal="${esc(p.name)}">${mock(p)}<small>${esc(p.name)}</small></button>`).join('')}
        <button type="button" class="fos-palc${pmode === 'custom' ? ' on' : ''}" data-pal="custom">${mock(cp)}<small>Custom</small></button></div>
      ${pmode === 'custom' ? `<div class="fos-colors">${[['bg', 'Background'], ['ink', 'Text'], ['accent', 'Accent'], ['deep', 'Dark bands']].map(([k, l]) => `<label><input type="color" data-col="${k}" value="${esc(cp[k] || '#000000')}"><span>${l}</span><code>${esc(cp[k] || '')}</code></label>`).join('')}</div>` : ''}
      ${pmode === 'site' ? (KIT ? `<p class="muted">${String(q.urls || '').trim() ? 'The AI reads the colors and fonts of the first link in the Brand tab.' : 'Add your website link in the <a href="#/kit/brand">Brand tab</a>. The AI reads its colors and fonts.'}</p>` : '<p class="muted">Add your website link in the Context step. The AI reads its colors and fonts.</p>') : ''}
      ${f('vibe', 'The look you want, in your words', 'Calm and clinical, lots of white space, like a premium clinic', '', true, 2)}`;
    };
    // Uploaded fonts preview in their own face.
    async function faces() {
      for (const a of myFonts()) {
        if (a.face || !window.FontFace) continue; a.face = 1;
        try { let src = a.src; if (!src) { const [d] = await call('asset-data', { names: [a.name] }); src = `data:${d.mime};base64,${d.data}`; } const fc = new FontFace('fos-' + a.name, `url(${src})`); await fc.load(); document.fonts.add(fc); } catch { /* the name still shows */ }
      }
    }
    const stImages = () => {
      const pick = new Set(q.images.map((x) => x.name));
      return `<h2>${KIT ? 'Logos and images' : 'Your images'}</h2><p class="lead">${KIT ? 'Your logo, photos of you or your team, and product shots. The ticked images go into every new funnel, up to 12.' : 'Add your logo, photos of you or your team, and product shots. The AI places them where they fit. Anything missing gets designed or generated.'}</p>
      <div class="fos-up"><label class="fos-role"><span>These images are</span><select class="input" id="fos-role" aria-label="What is in the image">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}"${k === role ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="fos-drop" data-drop="image" tabindex="0" role="button" aria-label="Add images"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg><b>Drop images here</b><span>PNG, JPG, WebP or SVG, up to 8 at a time, or <u>choose files</u></span><input type="file" id="fos-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple hidden></div>
      <div id="fos-upmsg"></div>
      ${assets.some((a) => a.role !== 'ai' && a.role !== 'font') ? `<div class="fos-assets">${assets.filter((a) => a.role !== 'ai' && a.role !== 'font').map((a) => `<label class="fos-asset${pick.has(a.name) ? ' on' : ''}"><input type="checkbox" data-asset="${esc(a.name)}" ${pick.has(a.name) ? 'checked' : ''}><img${a.thumb ? ` src="${esc(a.thumb)}"` : ''} alt="" data-thumb="${esc(a.name)}"><span>${esc(ROLE[a.role] || a.role)}</span><input class="input" data-label="${esc(a.name)}" placeholder="What is it?" value="${esc((q.images.find((x) => x.name === a.name) || {}).label || a.label || '')}"><button class="del" data-adel="${esc(a.name)}" aria-label="Delete image">${G.ic('x')}</button></label>`).join('')}</div>` : '<p class="muted">No images yet.</p>'}`;
    };
    const docsField = () => `<div class="field"><span>Documents and files</span><div class="fos-drop" data-drop="doc" tabindex="0" role="button" aria-label="Add documents"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg><b>Drop documents here</b><span>PDF, Word, text, Markdown, CSV or HTML, up to 5 files, or <u>choose files</u></span><input type="file" id="fos-doc" accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*" multiple hidden></div><small>Course outlines, testimonials, old sales copy, brand guides. The AI reads the text inside.</small><div id="fos-docmsg"></div>
        ${q.docs.length ? `<ul class="fos-docs">${q.docs.map((d, i) => `<li><span>${esc(d.name)}</span><small class="muted">${Math.max(1, Math.round((d.text || '').split(/\s+/).length / 10) * 10)} words</small> <button class="btn sm ghost" data-ddel="${i}">Remove</button></li>`).join('')}</ul>` : ''}</div>`;
    const stContext = () => `<h2>Anything else the AI should know?</h2><p class="lead">All optional. More context means sharper copy.</p>
      ${f('urls', 'Links', 'https://yoursite.com  https://youtube.com/@you', 'Your website, social profiles and pages that show this product, like a template gallery. Images come only from pages that show what this funnel sells. Other sites give facts, colors and fonts. Up to 5.', true, 2)}
      ${docsField()}
      ${f('voice', 'Brand voice', 'Warm and plain. Short sentences. Sounds like a coach who has been there.', 'How the copy should sound.', true, 2)}
      ${f('avoid', 'Words and claims to avoid', 'cure, guaranteed results, hustle', 'The AI keeps these out of the copy.', true, 2)}
      ${f('notes', 'Notes', 'Anything about your style, competitors you like, what has worked before', '', true, 5)}`;
    const stBuild = () => `<h2>Build</h2><p class="lead">How many design options do you want to compare? Each one gets its own live preview.</p>
      <div class="fos-seg" role="radiogroup">${[1, 2, 3].map((n) => `<button role="radio" aria-checked="${q.options === n}" class="${q.options === n ? 'on' : ''}" data-opt="${n}"><b>${n}</b><span>${n === 1 ? 'One option, fastest' : n === 2 ? 'Two directions' : 'Three directions'}</span></button>`).join('')}</div>
      <label class="fos-check"><input type="checkbox" data-aiimg ${q.ai_images ? 'checked' : ''}${st.images ? '' : ' disabled'}><span>Generate images with AI${st.images ? '' : ' (not available yet)'}</span></label>
      ${st.github ? f('github_user', 'GitHub username, optional', 'yourname', 'After you approve, you get invited to a private repository with the code. To send it to an AI Studio project instead, paste its repository when you approve.') : ''}
      ${st.demo ? '' : `<label class="fos-toggle"><input type="checkbox" data-kitsync ${q.kit_sync !== false ? 'checked' : ''}><span class="sw-t" aria-hidden="true"></span><span><b>${saved ? 'Update my brand kit with these answers' : 'Save these answers as my brand kit'}</b><small>${esc(kitDiff())}</small></span></label>`}
      <div class="fos-sum"><b>${esc(q.brand || 'Your brand')}${q.offer_name ? ', ' + esc(q.offer_name) : ''}</b><span>${esc((types.find((x) => x.id === q.type) || {}).name || '')}${(() => { const m = q.start || (q.template ? 'template' : 'library'); return m === 'template' && q.template ? ' · ' + esc((TPL.find((t) => t.id === q.template) || {}).name || '') : m === 'scratch' ? ' · From scratch' : ' · Best match from the library'; })()} · ${q.images.length} image${q.images.length === 1 ? '' : 's'} · ${q.options} option${q.options > 1 ? 's' : ''}</span></div>
      <p class="muted">It takes about 10 to 25 minutes. You can leave this page; it keeps going and the funnel shows up in your list. Forms, checkout, domains, SEO and emails come after approval.</p>`;
    // What building with these answers changes in the saved brand kit.
    const kitDiff = () => {
      if (!saved) return 'Your brand, colors, images and this offer are saved, so the next funnel starts from them. Change them any time under Brand kit.';
      const has = (v) => String(v == null ? '' : v).trim() !== '';
      const same = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);
      const txt = (k) => has(q[k]) && String(q[k]).trim() !== String(saved[k] || '').trim();
      const urls = String(q.urls || '').split(/[\s,]+/).filter((u) => /^https?:\/\/\S+\.\S+$/.test(u)).slice(0, 5);
      const imgs = (a) => (a || []).map((x) => [x.name, x.label || '']);
      const tabs = [];
      if (['brand', 'tagline', 'owner', 'audience', 'voice', 'avoid'].some(txt) || (urls.length && !same(urls, saved.urls))) tabs.push('Brand');
      if ((q.palette && !same(q.palette, saved.palette)) || (q.fonts && !same(q.fonts, saved.fonts)) || txt('vibe')) tabs.push('Colors and fonts');
      if (q.images.length && !same(imgs(q.images), imgs(saved.images))) tabs.push('Logos and images');
      const o = (saved.offers || []).find((x) => x.id === q.offer_id); const full = !o && (saved.offers || []).length >= 8;
      if (!o && !full) tabs.push('Offers, where this offer is added');
      else if (o && ((has(q.offer) && q.offer.trim() !== String(o.offer || '').trim()) || (has(q.offer_name) && q.offer_name.trim() !== o.name) || (has(q.price) && q.price.trim() !== o.price) || (has(q.checkout_url) && q.checkout_url.trim() !== o.checkout_url))) tabs.push('Offers');
      if ((q.proof_mode !== 'auto' && q.proof_mode !== saved.proof_mode) || txt('proof') || (q.docs.length && !same(q.docs.map((d) => d.name), (saved.docs || []).map((d) => d.name)))) tabs.push('Proof and files');
      const note = full ? ' Your kit already has eight offers, so this one is not added.' : '';
      return (tabs.length ? `Updates these brand kit tabs: ${tabs.join('; ')}. The next funnel starts from them.` : 'Your brand kit already matches these answers.') + note;
    };

    const read = () => { $$('[name]', box).forEach((el) => { if (el.name in q && el.type !== 'radio') q[el.name] = el.value; }); $$('[data-label]', box).forEach((el) => { const x = q.images.find((i) => i.name === el.dataset.label); if (x) x.label = el.value; }); $$('[data-of]', box).forEach((el) => { const o = (q.offers || [])[+el.dataset.i]; if (o) o[el.dataset.of] = el.value; }); save(); };
    function bind() {
      box.oninput = (e) => {
        if (e.target.dataset.col) { q.palette = { ...(typeof q.palette === 'object' && q.palette ? q.palette : PRESETS[0]), name: '', [e.target.dataset.col]: e.target.value }; e.target.parentElement.querySelector('code').textContent = e.target.value; }
        if (e.target.dataset.of === 'name') { const b = $(`[data-oname="${e.target.dataset.i}"]`, box); if (b) b.textContent = e.target.value.trim() || 'Offer ' + (+e.target.dataset.i + 1); }
        if (e.target.matches('[data-main]')) return;
        read();
      };
      box.onclick = async (e) => {
        const t = e.target;
        if (t.closest('[data-stop]')) { e.stopPropagation(); return; }
        const gt = t.closest('[data-goto]'); if (gt) { read(); q.step = +gt.dataset.goto; save(); return draw(); }
        if (t.closest('[data-back]')) { read(); q.step--; save(); return draw(); }
        if (t.closest('[data-next]')) { read(); const m = need(); if (m) { $('#fos-msg').innerHTML = `<p class="key-err">${esc(m)}</p>`; return; } q.step++; if (q.step === 1 && q.template && (TPL.find((x) => x.id === q.template) || {}).funnel !== q.type) q.template = ''; save(); return draw(); }
        const ty = t.closest('[data-type]'); if (ty) { q.type = ty.dataset.type; q.template = ''; save(); q.step = 1; return draw(); }
        const sm = t.closest('[data-start]'); if (sm) { q.start = sm.dataset.start; if (q.start !== 'template') q.template = ''; save(); return draw(); }
        const tp = t.closest('[data-tpl]'); if (tp) { q.template = tp.dataset.tpl; q.start = 'template'; save(); return draw(); }
        if (t.closest('[data-all]')) { showAll = !showAll; return draw(); }
        const fo = t.closest('[data-font]'); if (fo) { const p = PAIRS[+fo.dataset.font]; q.fonts = fo.dataset.font === '' ? null : { display: p[0], body: p[1] }; read(); save(); return draw(); }
        const mf = t.closest('[data-myfont]'); if (mf) { read(); const a = assets.find((x) => x.name === mf.dataset.n); if (!a) return; const k = mf.dataset.myfont; const cur = q.fonts || { display: 'Instrument Serif', body: 'Inter' }; const files = { ...(cur.files || {}) };
          if (files[k] === a.name) { delete files[k]; cur[k] = k === 'display' ? 'Instrument Serif' : 'Inter'; } else { files[k] = a.name; cur[k] = a.label || 'My font'; }
          q.fonts = Object.keys(files).length ? { display: cur.display, body: cur.body, files } : (cur.display === 'Instrument Serif' && cur.body === 'Inter' && !q.fonts ? null : { display: cur.display, body: cur.body }); save(); return draw(); }
        const pm = t.closest('[data-pm]'); if (pm) { read(); q.proof_mode = pm.dataset.pm; save(); return draw(); }
        const dz = t.closest('[data-drop]'); if (dz && !t.closest('input')) { const inp = $('input[type=file]', dz); if (inp) inp.click(); return; }
        const pa = t.closest('[data-pal]'); if (pa) { const v = pa.dataset.pal; read(); q.palette = v === 'ai' ? null : v === 'site' ? 'site' : v === 'custom' ? { ...(typeof q.palette === 'object' && q.palette ? q.palette : PRESETS[0]), name: '' } : { ...PRESETS.find((p) => p.name === v) }; save(); return draw(); }
        const op = t.closest('[data-opt]'); if (op) { q.options = +op.dataset.opt; save(); return draw(); }
        if (t.closest('[data-aiimg]')) { q.ai_images = t.checked; save(); return; }
        const as = t.closest('[data-asset]'); if (as) { const n = as.dataset.asset; const a = assets.find((x) => x.name === n); if (as.checked) q.images.push({ name: n, role: a.role, label: a.label || '' }); else q.images = q.images.filter((x) => x.name !== n); save(); as.closest('.fos-asset').classList.toggle('on', as.checked); return; }
        const ad = t.closest('[data-adel]'); if (ad) { e.preventDefault(); const n = ad.dataset.adel; ad.disabled = true; try { await call('asset-delete', { name: n }); assets = assets.filter((x) => x.name !== n); q.images = q.images.filter((x) => x.name !== n); if (q.fonts && q.fonts.files) { const fl = q.fonts.files; ['display', 'body'].forEach((k) => { if (fl[k] === n) { delete fl[k]; q.fonts[k] = k === 'display' ? 'Instrument Serif' : 'Inter'; } }); if (!Object.keys(fl).length) delete q.fonts.files; } save(); draw(); } catch (er) { G.toast(er.message, 4000); ad.disabled = false; } return; }
        const dd = t.closest('[data-ddel]'); if (dd) { q.docs.splice(+dd.dataset.ddel, 1); save(); return draw(); }
        if (t.matches && t.matches('[data-improve]')) { q.improve_offer = t.checked; save(); return; }
        if (t.matches && t.matches('[data-kitsync]')) { q.kit_sync = t.checked; save(); return; }
        if (t.matches && t.matches('[data-main]')) { q.main_offer = t.dataset.main; save(); return; }
        const ko = t.closest('[data-kof]'); if (ko) { read(); const o = ((saved || {}).offers || []).find((x) => x.id === ko.dataset.kof); Object.assign(q, o ? offerQuiz(o) : { offer_id: '', offer_name: '', price: '', offer: '', checkout_url: '' }); save(); draw(); const n = $(o ? '[name="offer"]' : '[name="offer_name"]', box); if (n && !o) n.focus(); return; }
        if (t.closest('[data-usekit]')) { read(); Object.assign(q, kitQuiz(saved)); q.from_kit = true; save(); draw(); G.toast('Filled in from your brand kit'); return; }
        if (t.closest('[data-oadd]')) { read(); q.offers.push({ id: hexId(), name: '', price: '', offer: '', checkout_url: '' }); if (!q.offers.some((o) => o.id === q.main_offer)) q.main_offer = q.offers[0].id; save(); draw(); const n = $$('[data-of="name"]', box).pop(); if (n) { n.focus(); n.scrollIntoView({ block: 'center' }); } return; }
        const od = t.closest('[data-odel]'); if (od) { read(); const i = +od.dataset.odel; const o = q.offers[i]; if (!o) return; if ((o.name || o.offer) && !confirm(`Remove ${o.name ? '"' + o.name + '"' : 'this offer'} from your brand kit? Funnels already built with it stay as they are.`)) return; q.offers.splice(i, 1); if (q.main_offer === o.id) q.main_offer = (q.offers[0] || {}).id || ''; save(); return draw(); }
        if (t.closest('[data-build]')) return build(t.closest('[data-build]'));
      };
      const fi = $('#fos-file'); if (fi) fi.onchange = () => upload([...fi.files]);
      const di = $('#fos-doc'); if (di) di.onchange = () => addDocs([...di.files]);
      const fn = $('#fos-fontfile'); if (fn) fn.onchange = () => addFonts([...fn.files]);
      const rs = $('#fos-role'); if (rs) rs.onchange = () => { role = rs.value; };
      $$('[data-drop]', box).forEach((dz) => {
        dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const inp = $('input[type=file]', dz); if (inp) inp.click(); } };
        dz.ondragenter = dz.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; dz.classList.add('over'); };
        dz.ondragleave = (e) => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('over'); };
        dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const files = [...(e.dataTransfer.files || [])]; if (!files.length) return; read(); const k = dz.dataset.drop; if (k === 'image') upload(files); else if (k === 'doc') addDocs(files); else addFonts(files); };
      });
      thumbs();
    }
    // Thumbnails for saved images load on demand, a few at a time.
    async function thumbs() {
      const need = $$('[data-thumb]', box).filter((im) => !im.getAttribute('src')).map((im) => im.dataset.thumb);
      if (!need.length) return;
      try { const got = await call('asset-data', { names: need }); got.forEach((a) => { const el = $(`[data-thumb="${a.name}"]`, box); const x = assets.find((y) => y.name === a.name); const src = `data:${a.mime};base64,${a.data}`; if (el) el.src = src; if (x) x.thumb = src; }); } catch { /* thumbnails are optional */ }
    }
    async function upload(all) {
      const msg = $('#fos-upmsg');
      const files = all.filter((fl) => /^image\/(png|jpeg|webp|svg\+xml)$/.test(fl.type));
      if (!files.length) { msg.innerHTML = '<p class="key-err">Use PNG, JPG, WebP or SVG images. For PDFs and documents, add them in the Context step.</p>'; return; }
      for (const fl of files.slice(0, 8)) {
        msg.innerHTML = `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Uploading ${esc(fl.name)}</div>`;
        try {
          let mime = fl.type; let data;
          if (mime === 'image/svg+xml') data = await G.b64(fl);
          else { const im = await G.shrink(fl); mime = im.type; data = im.data; if (role === 'logo' && /png|webp/.test(fl.type) && fl.size < 2_000_000) { data = await G.b64(fl); mime = fl.type; } }
          const a = await call('upload', { mime, data, role, label: fl.name.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 80) });
          a.thumb = `data:${mime};base64,${data}`; assets.unshift(a); q.images.push({ name: a.name, role: a.role, label: a.label || '' });
        } catch (er) { msg.innerHTML = G.errBox(er); save(); return draw(); }
      }
      q.images = q.images.slice(0, 12); save(); draw();
    }
    // Fonts: the file goes up as-is; the family name comes from the file name.
    async function addFonts(all) {
      const msg = $('#fos-fontmsg'); const MT = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
      const files = all.filter((fl) => MT[(fl.name.split('.').pop() || '').toLowerCase()]);
      if (!files.length) { msg.innerHTML = '<p class="key-err">Use font files ending in .woff2, .woff, .ttf or .otf. If you only have a font name from Google Fonts, write it in "The look you want".</p>'; return; }
      for (const fl of files.slice(0, 4)) {
        if (fl.size > 2_800_000) { msg.innerHTML = `<p class="key-err">${esc(fl.name)} is too large. Use the WOFF2 version from your font provider, or <a href="https://transfonter.org" target="_blank" rel="noopener">convert it to WOFF2</a>.</p>`; continue; }
        msg.innerHTML = `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Adding ${esc(fl.name)}</div>`;
        try {
          const ext = fl.name.split('.').pop().toLowerCase(); const data = await G.b64(fl);
          const label = fl.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b(regular|book|normal|webfont|variable|vf)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'My font';
          const a = await call('upload', { mime: MT[ext], data, label });
          a.src = `data:${MT[ext]};base64,${data}`; assets.unshift(a); msg.innerHTML = '';
        } catch (er) { msg.innerHTML = G.errBox(er); return; }
      }
      save(); draw();
    }
    // Documents: text is read in the browser. PDFs use pdf.js, Word files are unzipped here.
    async function addDocs(all) {
      const msg = $('#fos-docmsg'); let added = 0;
      for (const fl of all.slice(0, 5)) {
        if (q.docs.length >= 5) { msg.innerHTML = '<p class="key-err">Five documents is the limit. Remove one to add another, or paste the important part into notes.</p>'; break; }
        if (fl.size > 15_000_000) { msg.innerHTML = `<p class="key-err">${esc(fl.name)} is too large. Save the part that matters as a smaller PDF or paste it into notes.</p>`; continue; }
        msg.innerHTML = `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Reading ${esc(fl.name)}</div>`;
        try {
          const text = (await docText(fl)).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
          if (text.length < 20) throw new Error(`No text found in ${fl.name}. If it is a scanned PDF, paste the text into notes instead.`);
          q.docs.push({ name: fl.name, text: text.slice(0, 20000) }); added++; msg.innerHTML = text.length > 20000 ? `<p class="muted">${esc(fl.name)} is long, so the AI reads the first 20,000 characters.</p>` : '';
        } catch (er) { msg.innerHTML = `<p class="key-err">${esc(er.message || 'Could not read ' + fl.name)}</p>`; }
      }
      if (added) { read(); save(); const keepMsg = msg.innerHTML; draw(); const m2 = $('#fos-docmsg'); if (m2) m2.innerHTML = keepMsg; }
    }
    async function docText(fl) {
      const ext = (fl.name.split('.').pop() || '').toLowerCase();
      if (ext === 'pdf' || fl.type === 'application/pdf') return pdfText(fl);
      if (ext === 'docx') return docxText(fl);
      if (ext === 'doc' || ext === 'pages' || ext === 'key' || ext === 'pptx') throw new Error(`${fl.name}: save it as PDF or .docx first, then drop it here.`);
      const raw = await fl.text();
      if (/^html?$/.test(ext)) { const d = new DOMParser().parseFromString(raw, 'text/html'); d.querySelectorAll('script,style,noscript').forEach((x) => x.remove()); return d.body ? d.body.innerText || d.body.textContent : raw; }
      if (/[\u0000-\u0008]/.test(raw.slice(0, 2000))) throw new Error(`${fl.name} is not a text file. Use PDF, Word (.docx), text or Markdown.`);
      return raw;
    }
    let pdfjs = null;
    async function pdfText(fl) {
      if (!pdfjs) {
        try { pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'; }
        catch { throw new Error('The PDF reader did not load. Check your connection and drop the file again.'); }
      }
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await fl.arrayBuffer()) }).promise; const out = [];
      for (let i = 1; i <= Math.min(doc.numPages, 60); i++) { const pg = await doc.getPage(i); const c = await pg.getTextContent(); out.push(c.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('')); if (out.join('').length > 22000) break; }
      return out.join('\n\n');
    }
    async function docxText(fl) {
      const buf = new Uint8Array(await fl.arrayBuffer()); const dv = new DataView(buf.buffer);
      let eo = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
      if (eo < 0) throw new Error(`${fl.name} does not look like a Word file. Save it again as .docx or PDF.`);
      let p = dv.getUint32(eo + 16, true); const n = dv.getUint16(eo + 10, true);
      for (let k = 0; k < n; k++) {
        const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
        if (name !== 'word/document.xml') continue;
        const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); const data = buf.subarray(start, start + csize);
        let xml;
        if (method === 0) xml = new TextDecoder().decode(data);
        else { if (!window.DecompressionStream) throw new Error('This browser cannot open Word files. Save it as PDF and drop that instead.'); xml = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); }
        return xml.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<w:br[^>]*\/>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      }
      throw new Error(`No text found in ${fl.name}. Save it again as .docx or PDF.`);
    }
    async function build(b) {
      read();
      for (let i = 0; i < STEPS.length - 1; i++) { q.step = i; const m = need(); if (m) { save(); draw(); $('#fos-msg').innerHTML = `<p class="key-err">${esc(m)}</p>`; return; } }
      q.step = STEPS.length - 1;
      b.disabled = true; b.textContent = 'Starting';
      const quizOut = { ...q };
      ['step', 'from_kit', 'kit_sync'].forEach((k) => delete quizOut[k]);
      try {
        const f = await call('create', { quiz: quizOut, kit_sync: q.kit_sync !== false && !st.demo });
        KQ = null;
        try { sessionStorage.removeItem(DRAFT); } catch { /* fine */ }
        if (f.kit_error) G.toast('Your funnel is building. The brand kit did not update: ' + f.kit_error + ' Open Brand kit to save it there.', 7000);
        location.hash = '#/funnels/' + f.id;
      } catch (er) { b.disabled = false; b.textContent = 'Build my funnel'; $('#fos-msg').innerHTML = G.errBox(er); }
    }
    draw();
  }

  // ---------- one funnel ----------
  async function detail(main, id) {
    let f; askText = () => (f ? `I am building "${f.title}" in Funnel OS. ` : '');
    const box = frame(main, 'Funnel OS', '', '<a class="btn sm ghost" href="#/funnels">All funnels</a>');
    let view = { opt: 0, tab: 'options', page: 'index' };
    const get = async () => { f = await call('get', { id }); return f; };
    try { await get(); } catch (e) { box.innerHTML = G.errBox(e.code === 400 || /not found/i.test(e.message) ? { message: 'This funnel was deleted, or it belongs to another account.', fix: { label: 'Open Funnel OS', href: '#/funnels' } } : e, true); const r = $('[data-retry]', box); if (r) r.onclick = () => detail(main, id); return; }
    $('.top h1').textContent = f.title;
    let lastKick = 0; let sig = '';
    const tick = async () => {
      if (!document.body.contains(box)) return stop();
      try { await get(); } catch { return; }
      const s = JSON.stringify([f.status, f.step, f.steps, f.options, f.revisions, f.deploy, f.error]);
      if (s !== sig) { sig = s; draw(); }
      if (f.status !== 'running') { stop(); return; }
      // If no run is working on it (the lease ran out), start the next one.
      const idle = !f.busy && Date.now() - new Date(f.updated_at) > 25000;
      if (idle && Date.now() - lastKick > 40000 && !kicking) { lastKick = Date.now(); kicking = 1; call('run', { id }).catch(() => {}).finally(() => { kicking = 0; }); }
    };
    const draw = () => {
      $('.top h1').textContent = f.title;
      const [label, cls] = STATUS[f.status] || ['', ''];
      const opts = f.options || [];
      if (!view.opt && opts.length) view.opt = f.picked || opts[0].n;
      // The build animation shows while the funnel is being built, and stays for the finish if it was on screen.
      box.innerHTML = `<div class="fos-head"><div><h2>${esc(f.title)}</h2><p class="lead"><span class="pill ${cls}">${esc(label)}</span> ${f.status === 'running' ? esc(stepLabel(f.step)) + ' · ' : ''}started ${ago(f.created_at)}</p></div></div>
        ${f.status === 'failed' && f.error ? `<div class="err" role="alert"><p>${esc(f.error.message)}</p><div class="btns"><button class="btn sm primary" data-retry-build>Try again</button>${f.error.fix && f.error.fix.href && (!f.error.fix.admin || (G.me && G.me.admin)) ? `<a class="btn sm" href="${esc(f.error.fix.href)}"${/^https?:/.test(f.error.fix.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(f.error.fix.label || 'Open')}</a>` : ''}</div></div>` : ''}
        ${f.status === 'live' && f.deploy && f.deploy.url ? `<div class="fos-live"><b>Your funnel is live</b><a href="${esc(f.deploy.url)}" target="_blank" rel="noopener">${esc(f.deploy.url.replace('https://', ''))}</a>${f.repo && f.repo.url ? `<span>Code: <a href="${esc(f.repo.url)}" target="_blank" rel="noopener">${esc(f.repo.full_name || 'GitHub')}</a>${f.repo.invited ? ' · invite sent to ' + esc(f.repo.invited) : ''}</span>` : ''}<span class="muted">The checklist below shows anything left to connect.</span><div class="btns"><button class="btn sm" data-reopen>Make more changes</button><button class="btn sm ghost" data-zip>Download files</button></div></div>` : ''}
        ${f.status === 'live' ? `<details class="fos-studio-wrap"${(f.repo || {}).studio ? ' open' : ''}><summary>Send it to HighLevel AI Studio</summary>${studioBox(f.picked || 1, true)}<div class="btns"><button class="btn sm" data-studio-push>Push option ${f.picked || 1} to GitHub</button></div></details>` : ''}
        ${progress()}
        ${opts.length ? options() : ''}
        <div class="fos-tabs" role="tablist">${[['research', 'Research'], ['offer', 'Offer'], ['copy', 'Copy'], ['wireframe', 'Wireframe'], ['brand', 'Brand'], ['graphics', 'Graphics']].filter(([k]) => (k === 'graphics' ? ((f.visuals || {}).images || []).some((x) => x.kind) : f[k])).map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${view.tab === k}" class="${view.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div id="fos-tab">${tab()}</div>
        <p class="fos-foot">${f.status !== 'running' ? '<button class="btn sm ghost" data-rebuild>Build it again</button>' : ''}<button class="btn sm ghost" data-del>Delete funnel</button></p>`;
      bindDetail();
      if (window.FosOrb) window.FosOrb.scan();
    };
    const progress = () => {
      const done = new Map((f.steps || []).map((s) => [s.id, s]));
      const show = STEP_ORDER.filter((s) => (s !== 'fix' || done.has('fix')) && (s !== 'chief' || done.has('chief') || STEP_ORDER.indexOf(f.step) <= STEP_ORDER.indexOf('chief')));
      const extra = ['revise', 'publish'].filter((s) => done.has(s));
      const stOf = (s) => { const x = done.get(s) || {}; return x.state || (STEP_ORDER.indexOf(s) < STEP_ORDER.indexOf(f.step) ? 'done' : 'todo'); };
      if (f.status !== 'running' && f.status !== 'failed' && !extra.some((s) => (done.get(s) || {}).state === 'active')) return `<details class="fos-prog"><summary>How it was built</summary>${rows([...show, ...extra])}</details>`;
      const core = window.FosOrb ? (() => {
        const states = {}; ['research', 'offer', 'copy', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'done'].forEach((s) => { states[s] = stOf(s); });
        if (stOf('collect') === 'active') states.research = 'active';
        if (stOf('fix') === 'active') states.qa = 'active';
        if (stOf('chief') === 'active') states.copy = 'active';
        if (f.status === 'running' && f.step === 'done') states.done = 'active';
        if (extra.some((s) => stOf(s) === 'active')) states.build = 'active';
        const n = Object.values(states).filter((v) => v === 'done').length;
        const live = extra.find((s) => stOf(s) === 'active');
        const label = f.status === 'failed' ? 'Paused, see the note above' : stepLabel(live || f.step) || 'Starting';
        return window.FosOrb.html({ states, status: f.status, label, meta: f.status === 'failed' ? 'Needs attention' : `${n} of 10 done` });
      })() : '';
      return `<div class="fos-prog open">${core}${rows([...show, ...extra])}</div>`;
      function rows(ids) { return `<ol class="fos-steps" style="--rows:${Math.ceil(ids.length / 2)}">${ids.map((s) => { const x = done.get(s) || {}; const st = stOf(s); return `<li class="${st}"><i class="mk" aria-hidden="true"></i><b>${esc(LABEL[s] || s)}</b><span>${x.note ? esc(x.note) : st === 'active' ? 'Working on it' : st === 'done' ? 'Done' : st === 'error' ? 'Stopped here' : ''}</span></li>`; }).join('')}</ol>`; }
    };
    const options = () => {
      const opts = f.options || []; const o = opts.find((x) => x.n === view.opt) || opts[0];
      const pages = (f.pages || []).length ? f.pages : [{ path: 'index', name: 'Main page' }];
      const qa = o.qa || null; const running = f.status === 'running';
      const src = o.url ? o.url.replace(/\/$/, '') + (view.page === 'index' ? '/' : '/' + view.page) : '';
      return `<section class="fos-opts">
        <div class="fos-optbar">${opts.map((x) => `<button class="${x.n === o.n ? 'on' : ''}" data-o="${x.n}"><b>Option ${x.n}</b><span>${esc(x.name || '')}</span>${f.picked === x.n && f.status === 'live' ? '<em>Live</em>' : ''}</button>`).join('')}${!running && f.status !== 'live' && opts.length < 6 ? `<button class="add" data-more aria-expanded="false" aria-controls="fos-more"><b>+ New option</b><span>Another design direction</span></button>` : ''}</div>
        ${!running && f.status !== 'live' && opts.length < 6 ? `<div class="fos-more" id="fos-more" hidden><b>Option ${opts.length + 1}</b><span class="muted">Same copy, offer and graphics in a new design. Describe the look you want, or leave it empty and Funnel OS picks a direction that differs from your current options.</span><textarea class="textarea" id="fos-more-idea" rows="2" maxlength="600" placeholder="Dark background, big product gallery at the top and fewer words"></textarea><div class="btns"><button class="btn sm primary" data-more-go>Build option ${opts.length + 1}</button><button class="btn sm ghost" data-more-x>Cancel</button></div></div>` : ''}
        <div class="fos-pagebar"><select class="input" data-page aria-label="Page">${pages.map((p) => `<option value="${esc(p.path)}"${p.path === view.page ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          <div class="fos-dev"><button data-dev="d" class="on">Desktop</button><button data-dev="m">Phone</button></div>
          ${src ? `<a class="btn sm" href="${esc(src)}" target="_blank" rel="noopener">Open live</a>` : ''}</div>
        <div class="fos-preview" id="fos-prev">${src ? `<iframe src="${esc(src)}" title="Option ${o.n} preview" loading="lazy"></iframe>` : `<iframe id="fos-srcdoc" title="Option ${o.n} preview" sandbox="allow-scripts"></iframe>`}</div>
        ${o.idea ? `<p class="muted fos-idea">${esc(o.idea)}</p>` : ''}
        ${(() => { const r = (((f.wireframe || {}).refs) || []).find((x) => x.n === o.n); return r ? `<p class="muted fos-idea">Built from <a href="${esc(r.live)}" target="_blank" rel="noopener">${esc(r.name)}</a> in your template library (${esc(r.label)}).</p>` : ''; })()}
        ${qa ? `<details class="fos-qa"${qa.passed < qa.total ? ' open' : ''}><summary>Quality check: ${qa.passed} of ${qa.total} passed</summary><ul>${qa.checks.map((c) => `<li class="${c.ok === true ? 'ok' : c.ok === false ? 'no' : 'skip'}">${c.ok === true ? '&#10003;' : c.ok === false ? '!' : '&middot;'} ${esc(c.label)}</li>`).join('')}</ul></details>` : ''}
        ${!running ? '<div class="fos-launch" id="fos-launch"></div>' : ''}
        ${!running && f.status !== 'live' ? `<div class="fos-act">
          <div class="fos-ask"><b>Ask for changes</b><textarea class="textarea" id="fos-req" rows="3" placeholder="Make the hero darker, move the guarantee above the FAQ and use my photo in the about section"></textarea><button class="btn sm" data-revise>Send changes for option ${o.n}, ${esc((pages.find((p) => p.path === view.page) || pages[0]).name)}</button></div>
          <div class="fos-approve"><b>Happy with option ${o.n}?</b><span class="muted">Approving publishes it as your final funnel.</span>
          ${studioBox(o.n)}
          ${G.fos && G.fos.github ? `<label class="field"><span>GitHub username, optional</span><input class="input" id="fos-gh" placeholder="yourname" value="${esc((f.quiz || {}).github_user || '')}" autocomplete="off" spellcheck="false" autocapitalize="off"><small>Without an AI Studio repository, you get invited to a private repository with the code.</small></label>` : ''}
          <div class="btns"><button class="btn sm primary" data-approve>Approve option ${o.n}</button><button class="btn sm ghost" data-zip>Download files</button></div></div></div>` : ''}
        ${(f.revisions || []).length ? `<details class="fos-revs"><summary>Change requests (${f.revisions.length})</summary><ul>${f.revisions.slice().reverse().map((r) => `<li><span class="pill ${r.state === 'done' ? 'ok' : r.state === 'failed' ? 'no' : 'wait'}">${esc(r.state === 'done' ? 'Done' : r.state === 'failed' ? 'Could not apply' : 'Queued')}</span> Option ${r.opt}, ${esc(r.page)}: ${esc(r.request)}${r.note ? `<br><small class="muted">${esc(r.note)}</small>` : ''}</li>`).join('')}</ul></details>` : ''}
      </section>`;
    };
    // The GitHub repository of an AI Studio project. Approving pushes the option to it, and AI Studio pulls it in.
    const studioBox = (n, live) => {
      const s = (f.repo || {}).studio || null; const own = !!(G.me && G.me.admin && G.fos && G.fos.github);
      const repo = s ? s.full_name : '';
      return `<div class="fos-studio">
        <label class="field"><span>GitHub repository from AI Studio${live ? '' : ', optional'}</span><input class="input" id="fos-repo" placeholder="https://github.com/your-name/your-project" value="${esc(repo ? 'https://github.com/' + repo : '')}" autocomplete="off" spellcheck="false" autocapitalize="off">
          <small>To keep editing in HighLevel AI Studio, create a new TanStack Start project there, connect Git Sync and paste its repository here. Funnel OS replaces the home page and adds the other pages, then AI Studio pulls them in. <a href="${GIT_SYNC_HELP}" target="_blank" rel="noopener">How Git Sync works</a></small></label>
        ${own ? '<button type="button" class="link fos-tokshow" data-tokshow aria-expanded="false" aria-controls="fos-tokf">Use a different GitHub token</button>' : ''}
        <label class="field fos-tok" id="fos-tokf"${own ? ' hidden' : ''}><span>GitHub token${live ? '' : ', needed with a repository'}</span><input class="input" id="fos-tok" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_..."><small>Used once for this push and never saved. <a href="${esc(tokenLink(ownerOf(repo)))}" target="_blank" rel="noopener" data-toklink>Create a token</a>, choose Only select repositories, pick this repository and keep Contents on Read and write.</small></label>
        ${s ? `<p class="fos-studio-last">Option ${esc(s.option)} is in <a href="${esc(s.commit ? `https://github.com/${s.full_name}/commit/${s.commit}` : s.url)}" target="_blank" rel="noopener">${esc(s.full_name)}</a>, pushed ${ago(s.at)}. AI Studio pulls new commits in. If the preview there looks old, press Refresh preview.${s.live === false && f.deploy && f.deploy.stage === 'live' ? ' It went up before the funnel was live, so push again to add the share image.' : ''}</p>` : ''}
      </div>`;
    };
    const L = (a) => (a || []).map((x) => `<li>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('');
    // A headline's *accent phrase* shows in italics, the way the page sets it.
    const accent = (h) => esc(h).replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // The copy review: scores, which rewrites were kept and the headline candidates.
    const review = (r) => {
      if (!r || !(r.scores || []).length) return '';
      const low = r.scores.filter((x) => x.score <= 7).sort((a, b) => a.score - b.score).slice(0, 6);
      const kept = (r.rewritten || []).filter((x) => x.kept === 'after').length;
      return `<div class="fos-review"><b>Copy review</b><p>${r.scores.length} sections scored${r.avg ? `, average ${r.avg} of 10` : ''}. ${kept} of ${(r.rewritten || []).length} rewrites kept${r.picked ? ', and a new hero headline' : ''}.${r.summary ? ' ' + esc(r.summary) : ''}</p>${(r.headlines || []).length ? `<details><summary>Hero headline candidates (${r.headlines.length})</summary><ol>${r.headlines.map((h) => `<li${h === r.picked ? ' class="on"' : ''}>${accent(h)}${h === r.picked ? ' <span class="pill ok">Picked</span>' : ''}</li>`).join('')}</ol>${r.why ? `<p class="muted">${esc(r.why)}</p>` : ''}</details>` : ''}${low.length ? `<details><summary>Sections that were rewritten or need a look</summary><ul>${low.map((x) => { const rw = (r.rewritten || []).find((y) => y.path === x.path && y.id === x.id); return `<li><b>${esc(x.path === 'index' ? x.id : x.path + ', ' + x.id)}</b> ${x.score} of 10. ${esc(x.why || '')}${rw ? ` <span class="muted">${rw.kept === 'after' ? 'Rewritten' : 'Rewrite not kept'}${rw.why ? ': ' + esc(rw.why) : ''}</span>` : ''}</li>`; }).join('')}</ul></details>` : ''}</div>`;
    };
    const money = (n, c) => (n ? `${c && c !== 'USD' ? c + ' ' : '$'}${Number(n).toLocaleString('en-US')}` : '');
    const tab = () => {
      const t = view.tab;
      if (t === 'research' && f.research) { const r = f.research; return `<div class="fos-doc">${r.summary ? `<p>${esc(r.summary)}</p>` : ''}${r.audience ? `<h4>Buyer pains</h4><ul>${L(r.audience.pains)}</ul><h4>Objections</h4><ul>${L(r.audience.objections)}</ul><h4>Words they use</h4><p class="muted">${esc((r.audience.words || []).join(' · '))}</p>` : ''}${(r.competitors || []).length ? `<h4>Competitors</h4><ul>${r.competitors.map((c) => `<li><b>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</b>${c.price ? ' · ' + esc(c.price) : ''}${c.angle ? `<br><span class="muted">${esc(c.angle)}</span>` : ''}</li>`).join('')}</ul>` : ''}${(r.angles || []).length ? `<h4>Angles</h4><ol>${L(r.angles)}</ol>` : ''}${(r.gaps || []).length ? `<h4>Gaps to own</h4><ul>${L(r.gaps)}</ul>` : ''}${(r.sources || []).length ? `<h4>Sources</h4><ul class="src">${r.sources.slice(0, 12).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a></li>`).join('')}</ul>` : ''}</div>`; }
      if (t === 'offer' && f.offer) { const o = f.offer; const p = o.price || {}; return `<div class="fos-doc"><h3>${esc(o.name)}</h3><p>${esc(o.promise || o.one_liner || '')}</p>${o.mechanism && (o.mechanism.steps || []).length ? `<h4>${esc(o.mechanism.name || 'The method')}</h4><ol>${o.mechanism.steps.map((s) => `<li><b>${esc(s.name)}</b> ${esc(s.what)}</li>`).join('')}</ol>` : ''}${o.transformation && (o.transformation.before || o.transformation.after) ? `<h4>The change</h4><p>${esc(o.transformation.before || '')}${o.transformation.before && o.transformation.after ? ' &rarr; ' : ''}${esc(o.transformation.after || '')}</p>` : ''}${o.timeline && (o.timeline.first_win || o.timeline.result) ? `<p class="muted">${o.timeline.first_win ? 'First win: ' + esc(o.timeline.first_win) + '. ' : ''}${o.timeline.result ? 'Full result: ' + esc(o.timeline.result) + '.' : ''}</p>` : ''}<h4>What is included</h4><ol>${(o.stack || []).map((s) => `<li><b>${esc(s.name)}</b> ${esc(s.what)}${s.value ? ` <span class="muted">(${money(s.value, p.currency)} value)</span>` : ''}</li>`).join('')}</ol>${(o.bonuses || []).length ? `<h4>Bonuses</h4><ol>${o.bonuses.map((s) => `<li><b>${esc(s.name)}</b> ${esc(s.what)}</li>`).join('')}</ol>` : ''}<h4>Price</h4><p>${money(p.amount, p.currency)}${p.compare_at ? ` <s class="muted">${money(p.compare_at, p.currency)}</s>` : ''}${(p.plans || []).filter((x) => x.amount).map((x) => ` · ${esc(x.label || '')} ${money(x.amount, p.currency)} ${esc(x.every || '')}`).join('')}</p>${o.bump && o.bump.name ? `<h4>Order bump</h4><p><b>${esc(o.bump.name)}</b>${o.bump.price ? ' ' + money(o.bump.price, p.currency) : ''}. ${esc(o.bump.what || '')}</p>` : ''}${(o.upsells || []).length ? `<h4>After the purchase</h4><ol>${o.upsells.map((u) => `<li><b>${esc(u.name)}</b>${u.price ? ' ' + money(u.price, p.currency) : ''} <span class="muted">(${esc(u.page)})</span> ${esc(u.what || '')}</li>`).join('')}</ol>` : ''}${o.guarantee && o.guarantee.name ? `<h4>Guarantee</h4><p>${esc(o.guarantee.name)}${o.guarantee.days ? ', ' + o.guarantee.days + ' days' : ''}. ${esc(o.guarantee.terms || '')}</p>` : ''}${o.changes ? `<p class="muted">What changed: ${esc(o.changes)}</p>` : ''}</div>`; }
      if (t === 'copy' && f.copy) return `<div class="fos-doc">${review(f.copy.review)}${(f.copy.pages || []).map((p) => `<h3>${esc(p.name || p.path)}</h3>${(p.sections || []).map((s) => `<div class="fos-sec"><p class="h">${s.headline ? `<b>${accent(s.headline)}</b>` : ''}<small>${esc(s.p || s.id || '')}</small></p>${s.sub ? `<p>${esc(s.sub)}</p>` : ''}${s.body ? `<p>${esc(Array.isArray(s.body) ? s.body.join(' ') : s.body)}</p>` : ''}${(s.bullets || []).length ? `<ul>${L(s.bullets)}</ul>` : ''}${s.cta ? `<p><span class="pill">${esc(s.cta)}</span></p>` : ''}</div>`).join('')}`).join('')}</div>`;
      if (t === 'wireframe' && f.wireframe) return `<div class="fos-doc">${(f.wireframe.pages || []).map((p) => `<h3>${esc(p.path)}</h3><ol class="fos-wf">${(p.sections || []).map((s) => `<li><b>${esc(s.p || s.id)}</b><span>${esc(s.layout || '')}${s.visual && s.visual !== 'none' ? ' · ' + esc(s.visual) : ''}${s.motion && s.motion !== 'none' ? ' · ' + esc(s.motion) : ''}</span></li>`).join('')}</ol>`).join('')}</div>`;
      if (t === 'brand' && f.brand) { const b = f.brand; const p = b.palette || {}; return `<div class="fos-doc"><div class="fos-pal">${Object.entries(p).map(([k, v]) => `<span><i style="background:${esc(v)}"></i>${esc(k.replace('_', ' '))}<code>${esc(v)}</code></span>`).join('')}</div>${b.fonts ? `<p>Fonts: <b>${esc(b.fonts.display)}</b> for headings, <b>${esc(b.fonts.body)}</b> for text.</p>` : ''}${b.voice ? `<p class="muted">${esc(b.voice)}</p>` : ''}${((f.visuals || {}).images || []).some((x) => x.kind) ? `<p class="muted">The finished graphics and real product images are in the Graphics tab.</p>` : ''}</div>`; }
      if (t === 'graphics') {
        const im = (f.visuals || {}).images || [];
        const gfx = im.filter((x) => ['hero', 'wall', 'cover', 'og', 'icon', 'favicon'].includes(x.kind)); const shots = im.filter((x) => x.kind === 'shot' || x.kind === 'site');
        const card = (x, big) => `<figure class="fos-gfx${big ? ' big' : ''}${x.kind === 'icon' || x.kind === 'favicon' ? ' ic' : ''}"><div class="ph" data-asset="${esc(x.name)}"></div><figcaption>${esc(x.kind === 'shot' || x.kind === 'site' ? x.title || x.label : x.label)}${x.kind === 'shot' && x.label ? `<small>${esc(x.label)}</small>` : ''}</figcaption></figure>`;
        const sites = ((f.visuals || {}).sites || []).filter((x) => x.gallery || x.failed);
        return `<div class="fos-doc">${gfx.length ? `<h4>Graphics drawn for this funnel</h4><p class="muted">Made from your brand kit and the real product. They are in the pages and in the downloaded files.</p><div class="fos-gfxs">${gfx.map((x) => card(x, x.kind === 'hero' || x.kind === 'wall' || x.kind === 'og')).join('')}</div>` : ''}
          ${shots.length ? `<h4>Real images from your links (${shots.length})</h4>${sites.map((x) => x.failed ? `<p class="err-line">Could not open <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a>. Check that it is public, then press Build it again.</p>` : `<p class="muted">${esc(x.count)} items found on <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>.</p>`).join('')}<div class="fos-gfxs shots">${shots.map((x) => card(x)).join('')}</div>` : `<p class="muted">No real product images were found. Add a link to your product or template page in the quiz, or upload screenshots, then press Build it again.</p>`}</div>`;
      }
      return '';
    };
    async function srcdoc() {
      const fr = $('#fos-srcdoc'); if (!fr) return;
      fr.srcdoc = '<p style="font:14px system-ui;color:#777;padding:24px">Loading preview</p>';
      try {
        const r = await call('files', { id, opt: view.opt });
        const page = r.files.find((x) => x.path === view.page) || r.files.find((x) => x.path === 'index');
        if (!page) { fr.srcdoc = '<p style="font:14px system-ui;color:#777;padding:24px">This page is not built yet.</p>'; return; }
        const A = Object.fromEntries(r.assets.map((a) => [a.name, `data:${a.mime};base64,${a.data}`]));
        const kit = 'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(r.kit)));
        const nav = '<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href^=\'#fos:\']");if(a){e.preventDefault();parent.postMessage({fos:a.getAttribute("href").slice(5)},"*")}});<\/script>';
        fr.srcdoc = page.content.replace(/\{\{asset:([a-z0-9._-]+)\}\}/gi, (m, n) => A[n] || '').replace(/\{\{page:([a-z0-9-]+)\}\}/gi, (m, p) => '#fos:' + p).replace(/\{\{kit\}\}/g, kit).replace(/\{\{checkout\}\}/g, (f.quiz || {}).checkout_url || '#offer').replace(/<\/body>/i, nav + '</body>');
      } catch (er) { fr.srcdoc = `<p style="font:14px system-ui;padding:24px">${esc(er.message)}</p>`; }
    }
    const tok = () => { const el = $('#fos-tok', box); return el && !el.closest('[hidden]') ? el.value.trim() : ''; };
    function bindDetail() {
      const ri = $('#fos-repo', box); if (ri) ri.oninput = () => { const a = $('[data-toklink]', box); if (a) a.href = tokenLink(ownerOf(ri.value)); };
      box.onclick = async (e) => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) { view.tab = tb.dataset.tab; $$('[data-tab]', box).forEach((x) => { x.classList.toggle('on', x === tb); x.setAttribute('aria-selected', x === tb); }); $('#fos-tab').innerHTML = tab(); thumbs(); return; }
        const fx = t.closest('[data-fix]'); if (fx) return fixIt(fx.dataset.fix, fx);
        if (t.closest('[data-co-save]')) {
          const inp = $('#fos-co'); const b = t.closest('[data-co-save]'); b.disabled = true;
          try { f = await call('checkout', { id, url: inp.value.trim() }); draw(); start(); G.toast(f.status === 'running' ? 'Saved. Updating the pages with your link' : 'Checkout link saved'); }
          catch (er) { b.disabled = false; const w = $('.fos-co', box); const old = $('.err', w); if (old) old.remove(); w.insertAdjacentHTML('beforeend', G.errBox(er)); }
          return;
        }
        if (t.closest('[data-rebuild]')) {
          if (!confirm('Build this funnel again with the latest Funnel OS? It keeps your answers and the research (made again if it read a site you gave only for its look), then redoes the offer, copy, images, graphics and pages. Your current previews are replaced.')) return;
          t.disabled = true; try { f = await call('rebuild', { id }); view.opt = 0; draw(); start(); } catch (er) { t.disabled = false; G.toast(er.message, 5000); } return;
        }
        if (t.closest('[data-more]') || t.closest('[data-more-x]')) {
          const p = $('#fos-more'); const b = $('[data-more]', box); const open = p.hidden; p.hidden = !open; b.setAttribute('aria-expanded', open); b.classList.toggle('on', open); if (open) $('#fos-more-idea').focus(); return;
        }
        if (t.closest('[data-more-go]')) {
          const b = t.closest('[data-more-go]'); b.disabled = true; const n = (f.options || []).length + 1;
          try { f = await call('more', { id, idea: $('#fos-more-idea').value.trim() }); view.opt = n; view.page = 'index'; draw(); start(); G.toast('Building option ' + n + '. Your other options stay as they are.'); }
          catch (er) { b.disabled = false; const w = $('#fos-more'); const old = $('.err', w); if (old) old.remove(); w.insertAdjacentHTML('beforeend', G.errBox(er)); }
          return;
        }
        const ob = t.closest('[data-o]'); if (ob) { view.opt = +ob.dataset.o; view.page = 'index'; return draw(); }
        const dv = t.closest('[data-dev]'); if (dv) { $$('[data-dev]', box).forEach((x) => x.classList.toggle('on', x === dv)); $('#fos-prev').classList.toggle('phone', dv.dataset.dev === 'm'); return; }
        if (t.closest('[data-retry-build]')) { t.disabled = true; try { f = await call('retry', { id }); draw(); start(); } catch (er) { G.toast(er.message, 4000); t.disabled = false; } return; }
        if (t.closest('[data-revise]')) {
          const req = $('#fos-req').value.trim(); if (req.length < 6) { $('#fos-req').focus(); return G.toast('Describe the change you want first.'); }
          t.disabled = true; try { f = await call('revise', { id, opt: view.opt, page: view.page, request: req }); draw(); start(); G.toast('Working on your changes'); } catch (er) { t.disabled = false; $('.fos-ask', box).insertAdjacentHTML('beforeend', G.errBox(er)); } return;
        }
        if (t.closest('[data-tokshow]')) { const l = $('#fos-tokf', box); l.hidden = !l.hidden; t.closest('[data-tokshow]').setAttribute('aria-expanded', String(!l.hidden)); if (!l.hidden) $('#fos-tok', box).focus(); return; }
        if (t.closest('[data-approve]')) {
          const b = t.closest('[data-approve]'); const w = $('.fos-approve', box); $$('.err', w).forEach((x) => x.remove());
          const gh = $('#fos-gh'); const repo = (($('#fos-repo', box) || {}).value || '').trim(); const label = b.textContent;
          b.disabled = true;
          if (repo) {
            b.textContent = 'Pushing to GitHub';
            try { f = (await call('repo-push', { id, opt: view.opt, repo, token: tok() })).funnel; }
            catch (er) { b.disabled = false; b.textContent = label; w.insertAdjacentHTML('beforeend', G.errBox(er)); return; }
          }
          b.textContent = 'Publishing';
          try { f = await call('approve', { id, opt: view.opt, github_user: gh ? gh.value.trim() : undefined }); draw(); start(); if (repo && f.repo && f.repo.studio) G.toast(`Pushed to ${f.repo.studio.full_name}. AI Studio pulls it in next.`, 5000); }
          catch (er) { b.disabled = false; b.textContent = label; w.insertAdjacentHTML('beforeend', G.errBox(er)); }
          return;
        }
        if (t.closest('[data-studio-push]')) {
          const b = t.closest('[data-studio-push]'); const w = b.closest('.fos-studio-wrap'); $$('.err', w).forEach((x) => x.remove());
          const ri = $('#fos-repo', box); const repo = ri.value.trim(); const label = b.textContent;
          if (!repo) { ri.focus(); w.insertAdjacentHTML('beforeend', G.errBox({ message: 'Paste the GitHub repository of your AI Studio project first. It is under Git Sync in the project.', fix: { label: 'How Git Sync works', href: GIT_SYNC_HELP } })); return; }
          b.disabled = true; b.textContent = 'Pushing';
          try { const r = await call('repo-push', { id, opt: f.picked || view.opt, repo, token: tok() }); f = r.funnel; draw(); G.toast(r.studio.unchanged ? `${r.studio.full_name} already has this version` : `Pushed to ${r.studio.full_name}. AI Studio pulls it in next.`, 5000); }
          catch (er) { b.disabled = false; b.textContent = label; w.insertAdjacentHTML('beforeend', G.errBox(er)); }
          return;
        }
        if (t.closest('[data-reopen]')) { try { f = await call('reopen', { id }); draw(); } catch (er) { G.toast(er.message, 4000); } return; }
        if (t.closest('[data-zip]')) {
          const b = t.closest('[data-zip]'); b.disabled = true; const old = b.textContent; b.textContent = 'Preparing';
          try { const z = await call('zip', { id, opt: view.opt || f.picked || 1 }); const bin = Uint8Array.from(atob(z.data), (c) => c.charCodeAt(0)); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bin], { type: 'application/zip' })); a.download = z.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
          catch (er) { G.toast(er.message, 4000); }
          b.disabled = false; b.textContent = old; return;
        }
        if (t.closest('[data-del]')) { if (!confirm('Delete this funnel? The live preview stays online until you remove it in Vercel.')) return; try { await call('delete', { id }); location.hash = '#/funnels'; } catch (er) { G.toast(er.message, 4000); } }
      };
      const pg = $('[data-page]', box); if (pg) pg.onchange = () => { view.page = pg.value; const o = (f.options || []).find((x) => x.n === view.opt) || {}; if (o.url) { const fr = $('#fos-prev iframe'); fr.src = o.url.replace(/\/$/, '') + (view.page === 'index' ? '/' : '/' + view.page); } else srcdoc(); const rv = $('[data-revise]', box); if (rv) rv.textContent = `Send changes for option ${view.opt}, ${pg.options[pg.selectedIndex].text}`; };
      if ($('#fos-srcdoc')) srcdoc();
      thumbs(); launch();
    }
    // Thumbnails for the Graphics tab, fetched in batches.
    const cache = {};
    async function thumbs() {
      const els = $$('[data-asset]', box).filter((x) => !x.firstChild); if (!els.length) return;
      const need = [...new Set(els.map((x) => x.dataset.asset).filter((n) => !cache[n]))];
      for (let i = 0; i < need.length; i += 20) {
        try { const r = await call('asset-data', { names: need.slice(i, i + 20) }); r.forEach((a) => { cache[a.name] = `data:${a.mime};base64,${a.data}`; }); } catch { /* shown as empty frames */ }
      }
      $$('[data-asset]', box).forEach((x) => { const u = cache[x.dataset.asset]; if (u && !x.firstChild) { const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.src = u; x.appendChild(im); const a = document.createElement('a'); a.href = u; a.download = x.dataset.asset; a.className = 'dl'; a.textContent = 'Download'; x.appendChild(a); } });
    }
    // What is left before launch, each with its fix.
    async function launch() {
      const el = $('#fos-launch'); if (!el) return;
      try {
        const r = await call('launch', { id, opt: view.opt || f.picked || 1 }); if (!document.body.contains(el)) return;
        const co = (f.quiz || {}).checkout_url || '';
        el.innerHTML = `<details class="fos-launch-in"${r.ready ? '' : ' open'}><summary>${r.ready ? 'Ready to launch' : `Before you launch: ${r.items.filter((x) => x.ok === false).length} to do`}</summary><ul>${r.items.map((x) => `<li class="${x.ok === true ? 'ok' : x.ok === false ? 'no' : 'skip'}"><span class="mk" aria-hidden="true">${x.ok === true ? '&#10003;' : x.ok === false ? '!' : '&middot;'}</span><div><b>${esc(x.label)}</b>${x.detail ? `<small>${esc(x.detail)}</small>` : ''}${x.fix ? (x.fix.kind === 'link' ? `<a class="btn sm ghost" href="${esc(x.fix.href)}" target="_blank" rel="noopener">${esc(x.fix.label)}</a>` : `<button class="btn sm ${x.ok === false ? '' : 'ghost'}" data-fix="${esc(x.fix.kind)}">${esc(x.fix.label)}</button>`) : ''}${x.id === 'checkout' ? `<div class="fos-co" hidden><input class="input" id="fos-co" type="url" inputmode="url" placeholder="https://your-checkout-page.com/..." value="${esc(co)}" aria-label="Checkout link"><button class="btn sm primary" data-co-save>Save link</button></div>` : ''}</div></li>`).join('')}</ul></details>`;
      } catch (er) { el.innerHTML = ''; }
    }
    function fixIt(kind, btn) {
      if (kind === 'checkout') { const w = $('.fos-co', box); if (w) { w.hidden = false; $('#fos-co').focus(); } return; }
      if (kind === 'revise') { const r = $('#fos-req'); if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); r.focus(); } else if (f.status === 'live') G.toast('Press Make more changes first, then ask for the change.', 4000); return; }
      if (kind === 'approve') { const a = $('[data-approve]', box); if (a) { a.scrollIntoView({ behavior: 'smooth', block: 'center' }); a.focus(); } return; }
      if (kind === 'zip') { const z = $('[data-zip]', box); if (z) z.click(); return; }
      if (kind === 'rebuild') { const r = $('[data-rebuild]', box); if (r) r.click(); }
    }
    window.onmessage = (e) => { if (e.data && e.data.fos && $('[data-page]', box)) { const pg = $('[data-page]', box); if ([...pg.options].some((o) => o.value === e.data.fos)) { pg.value = e.data.fos; pg.onchange(); } } };
    const start = () => { stop(); if (f.status === 'running') poll = setInterval(tick, 3500); };
    sig = JSON.stringify([f.status, f.step, f.steps, f.options, f.revisions, f.deploy, f.error]);
    draw(); start();
    if (f.status === 'running' && !f.busy && Date.now() - new Date(f.updated_at) > 25000) { lastKick = Date.now(); call('run', { id }).catch(() => {}); }
  }

  // ---------- admin section ----------
  async function admin(box, helpers) {
    G = G || helpers; G = { ...helpers, ...G };
    const host = document.createElement('div'); host.id = 'fos-admin'; box.appendChild(host);
    const render = (k) => {
      const dot = (ok) => `<span class="dot ${ok ? 'ok' : 'no'}"></span>`;
      host.innerHTML = `<h3 id="funnel-os">Funnel OS</h3>
      <div class="setting keys"><div class="l"><b>What Funnel OS runs on</b><span>Members build funnels with your Perplexity key. Vercel puts live preview links online, GitHub holds the code after approval and OpenRouter makes AI images. All are optional except Perplexity; without them the matching step is skipped and explained.</span></div><div class="r" style="flex-direction:column;align-items:stretch;gap:14px">
        <div class="keyrow" data-fk="vercel"><span class="status-line">${dot(k.vercel)}<b>Vercel</b> ${k.vercel ? 'added, ending ' + esc(k.vercel) + (k.vercel_team ? ' · team ' + esc(k.vercel_team) : ' · personal account') : 'not added, so previews show inside Funnel OS only'}</span>
          <div class="r"><input class="input" type="password" autocomplete="off" placeholder="Vercel token" aria-label="Vercel token" data-v="token"><input class="input" placeholder="Team ID, optional" aria-label="Vercel team ID" data-v="team" value="${esc(k.vercel_team || '')}"><button class="btn sm" data-fsave>Check and save</button>${k.vercel ? '<button class="btn sm ghost" data-frm>Remove</button>' : ''}</div>
          <small class="muted">Create a token at <a href="https://vercel.com/account/settings/tokens" target="_blank" rel="noopener">Vercel tokens</a>. For a team, copy the Team ID from team Settings, General.</small></div>
        <div class="keyrow" data-fk="github"><span class="status-line">${dot(k.github)}<b>GitHub</b> ${k.github ? 'added, ending ' + esc(k.github) : 'not added, so approved funnels are not pushed to GitHub'}</span>
          <div class="r"><input class="input" type="password" autocomplete="off" placeholder="github_pat_..." aria-label="GitHub token" data-v="token"><button class="btn sm" data-fsave>Check and save</button>${k.github ? '<button class="btn sm ghost" data-frm>Remove</button>' : ''}</div>
          <small class="muted">Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained token</a> for all repositories with Administration and Contents set to read and write. Repositories are created private on this account and the member is invited.</small></div>
        <div class="keyrow" data-fk="openrouter"><span class="status-line">${dot(k.openrouter)}<b>OpenRouter</b> ${k.openrouter ? 'added, ending ' + esc(k.openrouter) : 'not added, so pages use CSS and SVG art instead of AI images'}</span>
          <div class="r"><input class="input" type="password" autocomplete="off" placeholder="sk-or-..." aria-label="OpenRouter key" data-v="token"><button class="btn sm" data-fsave>Check and save</button>${k.openrouter ? '<button class="btn sm ghost" data-frm>Remove</button>' : ''}</div>
          <small class="muted">Create a key at <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">OpenRouter keys</a> and add credit.</small></div>
      </div></div>
      <div class="setting"><div class="l"><b>Who can build</b><span>Turn it on for everyone when you are ready.</span></div><div class="r"><select class="input" id="fos-access" aria-label="Who can build"><option value="">All approved members</option><option value="admin"${k.access === 'admin' ? ' selected' : ''}>Only me</option></select></div></div>`;
      host.onclick = async (e) => {
        const b = e.target.closest('[data-fsave],[data-frm]'); if (!b) return;
        const row = b.closest('[data-fk]'); const p = row.dataset.fk; const rm = b.hasAttribute('data-frm');
        const token = rm ? '' : $('[data-v="token"]', row).value.trim(); const team = $('[data-v="team"]', row) ? $('[data-v="team"]', row).value.trim() : '';
        if (!rm && !token) { $('[data-v="token"]', row).focus(); return G.toast('Paste the token first.'); }
        b.disabled = true;
        try { const r = await call('admin-fos-save', { provider: p, token, team }); G.toast(rm ? 'Removed' : 'Checked and saved' + (r.login ? ' for ' + r.login : '')); render(r); }
        catch (er) { b.disabled = false; let m = $('.key-err', row); if (!m) { m = document.createElement('p'); m.className = 'key-err'; row.appendChild(m); } m.innerHTML = esc(er.message) + (er.fix && er.fix.href ? ` <a href="${esc(er.fix.href)}" target="_blank" rel="noopener">${esc(er.fix.label || 'Open')}</a>` : ''); }
      };
      $('#fos-access', host).onchange = async (e) => { const s = e.target; s.disabled = true; try { render(await call('admin-fos-save', { provider: 'access', value: s.value })); G.fos = null; G.toast('Saved'); } catch (er) { G.toast(er.message, 4000); s.disabled = false; } };
    };
    try { render(await call('admin-fos')); } catch (e) { host.innerHTML = '<h3>Funnel OS</h3>' + G.errBox(e); }
  }

  window.FunnelOS = { mount, kit, admin, stop, tabs: KIT_TABS };
})();
