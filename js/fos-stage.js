// Funnel OS build stage: one wide, always-night band that shows a funnel being built.
// Left: the quiz answers as floating tiles. Middle: the AI core with a progress ring. Right: a browser window
// where the plan, the wireframe, the brand, the graphics and the finished page assemble step by step.
// Two modes. "demo" loops a sample build on the Funnel OS page. "live" follows a real funnel's steps and uses
// its real data (headline, price, colors, preview link) as soon as each step delivers it.
// Canvas for the core and the wires, DOM for everything else. One animation loop, paused when hidden, off
// screen or paused by the user, and a single still frame under reduced motion.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduce = () => !!(mq && mq.matches);
  const STEPS = ['research', 'offer', 'copy', 'wireframe', 'brand', 'graphics', 'build', 'preview', 'qa', 'done'];
  const LAST = STEPS.length - 1;
  const LABEL = { research: 'Market research', offer: 'Offer', copy: 'Copy', wireframe: 'Wireframe', brand: 'Branding', graphics: 'Graphics', build: 'Building pages', preview: 'Live previews', qa: 'Quality check', done: 'Ready for review', fix: 'Fixes', revise: 'Making your changes', publish: 'Publishing' };
  const SHORT = { research: 'Research', offer: 'Offer', copy: 'Copy', wireframe: 'Wireframe', brand: 'Branding', graphics: 'Graphics', build: 'Build', preview: 'Preview', qa: 'Checks', done: 'Review' };
  const WORK = { research: 'Reading competitors and buyer language', offer: 'Sharpening the promise, stack and price', copy: 'Writing every section', wireframe: 'Planning the layout of each section', brand: 'Choosing fonts and colors', graphics: 'Placing your images and drawing the rest', build: 'Coding each page', preview: 'Putting the previews online', qa: 'Checking links, layout and copy', done: 'Pick an option, ask for changes, or approve it', fix: 'Fixing what the check found', revise: 'Applying your change request', publish: 'Publishing your final funnel' };
  // seconds per step in the demo: [working, result on screen]
  const DUR = { research: [1.5, 1.3], offer: [1.0, 1.3], copy: [1.5, 1.0], wireframe: [1.0, 1.5], brand: [1.0, 1.6], graphics: [1.0, 1.4], build: [2.6, 1.0], preview: [1.0, 1.4], qa: [1.5, 1.5], done: [0, 4.5] };
  // which quiz answers feed the core at each step
  const FEED = { research: ['offer', 'context'], offer: ['offer'], copy: ['offer', 'context'], wireframe: ['template'], brand: ['brand', 'template'], graphics: ['images', 'brand'], build: ['template', 'images'], preview: [], qa: [], done: [] };
  const DEMO = {
    brand: 'Northside', headline: 'Run pain-free in six weeks', offer: 'The Knee Reset', price: '$497',
    chips: ['6 competitors', '5 angles', '14 sources'], url: 'northside-physio.vercel.app', qa: '9 of 9 passed', options: 3, serif: true,
    palette: { bg: '#f5efe6', surface: '#fffdf8', ink: '#2a1d14', line: '#e2d8c8', accent: '#b4532a', accent_ink: '#ffffff', deep: '#3a2418', deep_ink: '#f5efe6' },
    notes: { research: '6 competitors, 5 angles, 14 sources', offer: 'The Knee Reset, $497. 5 stack items, 2 bonuses', copy: '2 pages, 16 sections, about 1,900 words', wireframe: '16 sections planned, 3 options', brand: 'Fraunces and DM Sans, accent #B4532A', graphics: '2 of your images, 3 AI images', build: '3 options built, 2 pages each', preview: 'Live on northside-physio.vercel.app', qa: 'All checks done', done: 'Pick an option, ask for changes, or approve it' },
  };
  const TILES = [
    { k: 'offer', n: 'Offer', x: 9, y: 17, i: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.6" cy="8.6" r="1.2"/>' },
    { k: 'template', n: 'Template', x: 20.5, y: 33, i: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>' },
    { k: 'brand', n: 'Brand', x: 8, y: 50, i: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>' },
    { k: 'images', n: 'Images', x: 20.5, y: 67, i: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m21 16-5-5-7 8"/>' },
    { k: 'context', n: 'Context', x: 9.5, y: 84, i: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' },
  ];
  const HEX = /^#[0-9a-f]{6}$/i;
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const BOLT = window.Path2D ? new Path2D('M13.2 2 4.5 13.4h6.1L9.8 22l8.7-11.4h-6.1z') : null;
  const globe = []; { const n = 150, g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i; globe.push([Math.cos(t) * r, y, Math.sin(t) * r]); } }

  const S = { root: null, key: '', mode: 'demo', idx: 0, has: false, target: 0, live: null, data: null, sig: '',
    raf: 0, last: 0, clock: 0, stepAt: 0, hasAt: 0, out: 0, paused: false, visible: true, ro: null, io: null,
    ctx: null, L: null, wires: [], energy: 0.6, spin: 0.4, prog: 0, coreHit: 0, winHit: 0, hitShown: -1, sy: 0, maxY: 0, px: 0, py: 0, tx: 0, ty: 0, el: {} };

  /* ---------- markup ---------- */
  function markup(mode) {
    const bar = (w) => `<i class="p-l pi" style="width:${w}%"></i>`;
    const chk = '<em class="p-chk"><svg viewBox="0 0 12 12"><path d="M2.6 6.3 5 8.6l4.4-5"/></svg></em>';
    const icons = ['<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'];
    return `<canvas class="fs-cv" aria-hidden="true"></canvas>
<p class="sr">${mode === 'demo' ? 'Animation of a Funnel OS build. Your quiz answers go in. The AI does the market research, shapes the offer, writes the copy, plans the wireframe, builds the brand and the graphics, codes the pages, puts live previews online and checks them. It ends with options ready for your review.' : 'Live view of your funnel being built. Each step is also listed below.'}</p>
<div class="fs-scene" aria-hidden="true">
  ${TILES.map((t, i) => `<div class="fs-tile" data-k="${t.k}" style="--x:${t.x}%;--y:${t.y}%;--vx:${12 + i * 19}%"><svg viewBox="0 0 24 24">${t.i}</svg><b>${t.n}</b></div>`).join('')}
  <div class="fs-core"></div>
  <div class="fs-cap"><b><span data-cap></span><span class="dots"><i></i><i></i><i></i></span></b><span data-note></span></div>
  <div class="fs-wrap">
    <div class="fs-ghost g2"><span><i></i><i></i><i></i>Option 3</span></div>
    <div class="fs-ghost g1"><span><i></i><i></i><i></i>Option 2</span></div>
    <div class="fs-win">
      <div class="fs-bar"><i></i><i></i><i></i><div class="fs-url"><em></em><span data-url></span></div><div class="fs-qa"><svg viewBox="0 0 12 12"><path d="M2.6 6.3 5 8.6l4.4-5"/></svg><span data-qa></span></div></div>
      <div class="fs-view">
        <div class="fs-doc">
          <div class="d-card d-research"><small>Research</small><div class="d-sk"><i></i><i style="width:62%"></i></div><div class="d-body d-chips"><span></span><span></span><span></span></div></div>
          <div class="d-card d-offer"><small>Offer</small><div class="d-sk"><i></i><i style="width:48%"></i></div><div class="d-body"><div class="d-row"><b data-offer></b><em data-price></em></div><div class="d-ticks"><span></span><span></span><span></span></div></div></div>
          <div class="d-card d-copy"><small>Copy</small><div class="d-sk"><i></i><i style="width:74%"></i></div><div class="d-body"><b class="d-h"><span data-dh></span><u></u></b><i class="p-l" style="width:78%"></i></div></div>
        </div>
        <div class="fs-page"><div class="fs-scroll">
          <div class="fs-wash"></div><div class="fs-grid"></div>
          <div class="p-nav p-sec" style="--bd:0s"><i class="p-logo pb"></i><b class="p-brand pi" data-brand></b><span class="p-links pi"><i></i><i></i><i></i></span><i class="p-nbtn pb" style="--i:1"></i></div>
          <section class="p-hero p-sec" style="--bd:.1s">${chk}
            <div class="p-copy"><i class="p-eye pb" style="--i:2"></i><b class="p-h pi" data-ph></b>${bar(92)}${bar(70)}<div class="p-cta"><span class="p-btn pb" style="--i:4"><span class="pi">Start today</span></span><i class="p-l pi" style="width:22%"></i></div></div>
            <div class="p-img pb" style="--i:3"><svg class="p-art" viewBox="0 0 120 124" preserveAspectRatio="xMidYMid slice"><rect width="120" height="124" class="a-sky"/><circle cx="82" cy="40" r="17" class="a-sun"/><path d="M0 74q30-20 58-5t62-9v64H0z" class="a-h1"/><path d="M0 96q34-19 70-5t50-6v39H0z" class="a-h2"/><path d="M50 124q9-15 3-24t7-13" class="a-road"/></svg></div>
          </section>
          <section class="p-cards p-sec" style="--bd:.24s">${chk}${icons.map((ic, i) => `<div class="p-card pb" style="--i:${5 + i}"><span class="p-ic"><svg viewBox="0 0 24 24">${ic}</svg></span>${bar(84)}${bar(58)}</div>`).join('')}</section>
          <section class="p-offer p-sec" style="--bd:.38s">${chk}
            <div class="p-stack">${[86, 70, 78, 60].map((w) => `<div class="p-row pi"><em><svg viewBox="0 0 12 12"><path d="M2.6 6.3 5 8.6l4.4-5"/></svg></em><i class="p-l" style="width:${w}%"></i></div>`).join('')}</div>
            <div class="p-price pb" style="--i:8"><i class="p-l pi" style="width:46%"></i><b class="pi" data-pp></b><span class="p-btn pb"><span class="pi">Join now</span></span></div>
          </section>
        </div></div>
        <div class="fs-kit"><i style="--i:0;--c:var(--p-bg)"></i><i style="--i:1;--c:var(--p-ink)"></i><i style="--i:2;--c:var(--p-accent)"></i><i style="--i:3;--c:var(--p-deep)"></i><b>Aa</b></div>
        <div class="fs-sweep"></div><div class="fs-scan"></div>
      </div>
    </div>
  </div>
</div>
<div class="fs-foot">
  <ol class="fs-rail">${STEPS.map((s, i) => `<li data-s="${i}">${mode === 'demo' ? `<button type="button" data-go="${i}" aria-label="Show step ${i + 1} of ${STEPS.length}: ${LABEL[s]}">` : '<span class="fs-seg">'}<span class="t"><i></i></span><b>${SHORT[s]}</b>${mode === 'demo' ? '</button>' : '</span>'}</li>`).join('')}</ol>
  <button type="button" class="fs-pause" data-pause aria-label="Pause animation"><svg viewBox="0 0 16 16" aria-hidden="true"><path class="pa" d="M5 3.5v9M11 3.5v9"/><path class="pl" d="M5.5 3.2v9.6l7-4.8z"/></svg></button>
</div>`;
  }

  /* ---------- lifecycle ---------- */
  function create(mode, key) {
    const r = document.createElement('div');
    r.className = 'fs'; r.dataset.mode = mode; r.setAttribute('role', 'group');
    r.setAttribute('aria-label', mode === 'demo' ? 'How Funnel OS builds a funnel' : 'Your funnel being built');
    r.innerHTML = markup(mode);
    const q = (s) => r.querySelector(s);
    Object.assign(S, { root: r, key, mode, idx: 0, has: false, target: 0, live: null, data: null, sig: '', clock: 0, stepAt: 0, hasAt: 0, out: 0, paused: false, visible: true, prog: 0, sy: 0, coreHit: 0, winHit: 0, hitShown: -1, energy: 0.6, L: null, wires: [] });
    S.el = { cv: q('.fs-cv'), scene: q('.fs-scene'), core: q('.fs-core'), wrap: q('.fs-wrap'), win: q('.fs-win'), view: q('.fs-view'), scroll: q('.fs-scroll'), cap: q('[data-cap]'), note: q('[data-note]'), url: q('[data-url]'), qa: q('[data-qa]'), dh: q('[data-dh]'), ph: q('[data-ph]'),
      offer: q('[data-offer]'), price: q('[data-price]'), pp: q('[data-pp]'), brand: q('[data-brand]'), chips: [...r.querySelectorAll('.d-chips span')], pause: q('[data-pause]'), rail: [...r.querySelectorAll('.fs-rail li')],
      tiles: [...r.querySelectorAll('.fs-tile')].map((el, i) => ({ el, k: el.dataset.k, phase: i * 1.7, hit: 0, shown: -1, x: 0, y: 0, s: 46 })) };
    S.ctx = S.el.cv.getContext('2d');
    r.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]'); if (go) { jump(+go.dataset.go); return; }
      if (e.target.closest('[data-pause]')) { S.paused = !S.paused; paused(); if (!S.paused) start(); }
    });
    r.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const b = r.getBoundingClientRect(); S.tx = ((e.clientX - b.left) / b.width - 0.5) * 2; S.ty = ((e.clientY - b.top) / b.height - 0.5) * 2; });
    r.addEventListener('pointerleave', () => { S.tx = 0; S.ty = 0; });
    if (window.ResizeObserver) { S.ro = new ResizeObserver(() => { layout(); if (!running()) still(); }); S.ro.observe(r); }
    if (window.IntersectionObserver) { S.io = new IntersectionObserver((en) => { S.visible = en[en.length - 1].isIntersecting; if (S.visible) start(); }); S.io.observe(r); }
    fill(mode === 'demo' ? DEMO : {});
  }
  function destroy() {
    cancelAnimationFrame(S.raf); S.raf = 0;
    if (S.ro) S.ro.disconnect(); if (S.io) S.io.disconnect(); S.ro = S.io = null;
    if (S.root) S.root.remove(); S.root = null; S.ctx = null; S.key = ''; S.L = null;
  }
  function paused() {
    const b = S.el.pause; S.root.classList.toggle('is-paused', S.paused);
    b.setAttribute('aria-label', S.paused ? 'Play animation' : 'Pause animation'); b.setAttribute('aria-pressed', String(S.paused));
  }
  const running = () => !!S.raf;
  const frozen = () => reduce() || S.paused;

  function mount(slot, o) {
    if (!slot) return;
    o = o || {}; const mode = o.mode === 'live' ? 'live' : 'demo'; const key = o.key || mode;
    const fresh = !S.root || S.key !== key;
    if (fresh) { destroy(); create(mode, key); }
    if (S.root.parentNode !== slot) slot.appendChild(S.root);
    layout();
    if (mode === 'live') setLive(o.funnel || {}, fresh);
    else if (fresh) { if (reduce()) { S.idx = LAST; S.has = true; } else { S.idx = 0; S.has = false; } paint(true); }
    start(); if (!running()) still();
  }
  const has = (key) => !!(S.root && S.key === key && S.root.isConnected);

  /* ---------- data ---------- */
  function fromFunnel(f) {
    const q = f.quiz || {}; const o = f.offer || {}; const p = o.price || {}; const r = f.research; const b = f.brand || {};
    const n = (a, w) => (Array.isArray(a) && a.length ? a.length + ' ' + w + (a.length > 1 ? 's' : '') : '');
    const secs = ((((f.copy || {}).pages || [])[0] || {}).sections) || [];
    const h = (secs.find((s) => s && s.headline) || {}).headline || o.promise || o.one_liner || '';
    const opts = f.options || [];
    const u = (opts.find((x) => x.url) || {}).url || (f.deploy || {}).url || '';
    const qa = (opts.find((x) => x.qa) || {}).qa;
    const pal = b.palette || (q.palette && typeof q.palette === 'object' ? q.palette : null);
    return {
      brand: clip(b.logo_text || q.brand || f.title || 'Your brand', 18), headline: clip(String(h).replace(/[*_`#]/g, ''), 70) || clip(f.title || '', 70),
      offer: clip(o.name || q.brand || f.title || '', 28),
      price: p.amount ? (p.currency && p.currency !== 'USD' ? p.currency + ' ' : '$') + Number(p.amount).toLocaleString('en-US') : '',
      chips: r ? [n(r.competitors, 'competitor'), n(r.angles, 'angle'), n(r.sources, 'source')].filter(Boolean) : [],
      url: u ? u.replace(/^https?:\/\//, '').replace(/\/$/, '') : '', qa: qa ? qa.passed + ' of ' + qa.total + ' passed' : '',
      options: Math.max(1, Math.min(3, opts.length || +q.options || 1)), palette: pal,
      serif: /serif|fraunces|playfair|newsreader|garamond|cormorant|lora|libre b|merriweather|georgia|bodoni|spectral|crimson/i.test((b.fonts || {}).display || ''),
    };
  }
  function fill(d) {
    const sig = JSON.stringify(d); if (sig === S.sig) return; S.sig = sig; S.data = d;
    const e = S.el; const r = S.root;
    e.brand.textContent = d.brand || 'Your brand';
    e.ph.textContent = d.headline || ''; e.ph.classList.toggle('long', (d.headline || '').length > 34);
    e.offer.textContent = d.offer || 'Your offer'; e.price.textContent = d.price || ''; e.price.hidden = !d.price;
    e.pp.textContent = d.price || ''; e.pp.hidden = !d.price;
    const chips = d.chips && d.chips.length ? d.chips : ['Competitors', 'Angles', 'Sources'];
    e.chips.forEach((c, i) => { c.textContent = chips[i] || ''; c.hidden = !chips[i]; });
    e.qa.textContent = d.qa || 'Checked';
    r.dataset.opts = String(d.options || 1);
    const p = d.palette || {}; const ok = (k, fb) => (HEX.test(p[k] || '') ? p[k] : fb);
    const bg = ok('bg', '#faf7ef'), ink = ok('ink', '#0b2418'), accent = ok('accent', '#668168'), deep = ok('deep', ink);
    const dark = lum(bg) < 0.4;
    const set = (k, v) => r.style.setProperty(k, v);
    set('--p-bg', bg); set('--p-ink', ink); set('--p-accent', accent); set('--p-deep', deep);
    set('--p-surface', ok('surface', dark ? 'rgba(255,255,255,.06)' : '#ffffff')); set('--p-line', ok('line', dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)'));
    set('--p-aink', ok('accent_ink', lum(accent) > 0.6 ? '#111111' : '#ffffff')); set('--p-dink', ok('deep_ink', lum(deep) > 0.6 ? '#111111' : '#ffffff'));
    set('--p-font', d.serif ? 'Georgia, "Times New Roman", serif' : 'var(--font)');
  }
  function setLive(f, fresh) {
    const done = f.status === 'review' || f.status === 'live';
    const k = done ? 'done' : ({ fix: 'qa', revise: 'build', publish: 'preview' }[f.step] || f.step);
    const act = (f.steps || []).find((s) => s.id === f.step) || {};
    S.target = Math.max(0, STEPS.indexOf(k));
    S.live = { label: done ? LABEL.done : LABEL[f.step] || LABEL[k] || 'Working', note: done ? WORK.done : clip(act.note || '', 140) || WORK[f.step] || WORK[k] || '' };
    fill(fromFunnel(f));
    if (fresh || frozen() || !S.visible || document.hidden || S.target < S.idx) { S.idx = S.target; S.has = S.idx === LAST; paint(true); if (!running()) still(); }
    else paint(false);
  }

  /* ---------- state ---------- */
  let FEEDSET = [];
  function paint(instant) {
    const r = S.root; if (!r) return; const e = S.el; const step = STEPS[S.idx];
    if (instant) r.classList.add('fs-instant');
    STEPS.forEach((s, i) => {
      r.classList.toggle('has-' + s, i < S.idx || (i === S.idx && S.has));
      r.classList.toggle('at-' + s, i === S.idx && !S.has);
      r.classList.toggle('is-' + s, i === S.idx);
      const li = e.rail[i]; li.classList.toggle('done', i < S.idx || (i === S.idx && S.idx === LAST)); li.classList.toggle('on', i === S.idx && S.idx < LAST);
      if (i !== S.idx) li.style.removeProperty('--p');
      const b = li.firstElementChild; if (i === S.idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    r.classList.toggle('working', S.idx < LAST && !S.has);
    const here = S.mode === 'live' && S.live && S.idx === S.target;
    e.cap.textContent = here ? S.live.label : LABEL[step];
    e.note.textContent = here ? S.live.note : S.mode === 'demo' ? (S.has ? DEMO.notes[step] : WORK[step]) : WORK[step];
    const d = S.data || {};
    e.url.textContent = S.idx < 3 ? 'Funnel plan' : r.classList.contains('has-preview') ? (d.url || 'Preview inside Funnel OS') : S.idx === 7 ? 'Publishing preview' : 'index.html';
    const ci = STEPS.indexOf('copy');
    if (S.idx > ci || (S.idx === ci && S.has)) e.dh.textContent = d.headline || '';
    else if (S.idx < ci || S.mode === 'live' || frozen()) e.dh.textContent = '';
    S.root.querySelector('.d-h').classList.toggle('typing', S.idx === ci && !S.has);
    FEEDSET = FEED[step] || [];
    e.tiles.forEach((t) => t.el.classList.toggle('on', FEEDSET.includes(t.k) && S.idx < LAST));
    if (instant) { void r.offsetWidth; r.classList.remove('fs-instant'); }
  }
  function begin(i) { S.idx = i; S.has = i === LAST; S.stepAt = S.clock; S.hasAt = S.clock; paint(false); }
  function jump(i) {
    if (S.mode !== 'demo') return;
    S.out = 0; S.root.classList.remove('fs-out'); S.idx = i; S.has = frozen() || i === LAST; S.stepAt = S.clock; S.hasAt = S.clock; paint(true);
    if (!running()) still();
  }
  function advance() {
    const c = S.clock; const step = STEPS[S.idx];
    if (S.mode === 'demo') {
      if (S.out) { if (c - S.out > 0.7) { S.out = 0; S.idx = 0; S.has = false; S.stepAt = c; paint(true); S.root.classList.remove('fs-out'); } return; }
      const [a, b] = DUR[step]; const e = c - S.stepAt;
      if (!S.has && e >= a) { S.has = true; S.hasAt = c; paint(false); }
      else if (S.has && e >= a + b) { if (S.idx === LAST) { S.out = c; S.root.classList.add('fs-out'); } else begin(S.idx + 1); }
      const li = S.el.rail[S.idx]; if (li) li.style.setProperty('--p', Math.min(1, e / (a + b)).toFixed(3));
      if (step === 'copy' && !S.has) { const n = Math.floor(e * 22); const t = DEMO.headline.slice(0, n); if (S.el.dh.textContent !== t) S.el.dh.textContent = t; }
      return;
    }
    // live: walk towards the real step, showing each result for a moment on the way
    if (S.idx < S.target) {
      if (!S.has) { if (c - S.stepAt > 0.35) { S.has = true; S.hasAt = c; paint(false); } }
      else if (c - S.hasAt > 0.9) begin(S.idx + 1);
    }
  }

  /* ---------- layout ---------- */
  function layout() {
    const r = S.root; if (!r || !r.isConnected) return; const e = S.el;
    const w0 = r.clientWidth; if (!w0) return;
    r.classList.toggle('fs-v', w0 < 640); r.classList.toggle('fs-s', w0 < 800);
    const w = r.clientWidth, h = r.clientHeight; const vert = w < 640;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (e.cv.width !== Math.round(w * dpr) || e.cv.height !== Math.round(h * dpr)) { e.cv.width = Math.round(w * dpr); e.cv.height = Math.round(h * dpr); }
    S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const at = (el) => { let x = 0, y = 0, n = el; while (n && n !== r) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
    const cb = at(e.core); const core = { x: cb.x + cb.w / 2, y: cb.y + cb.h / 2, r: cb.w / 2 };
    const wb = at(e.wrap);
    e.wrap.style.setProperty('--u', (wb.w / 100).toFixed(3) + 'px');
    e.tiles.forEach((t) => { const b = at(t.el); t.x = b.x + b.w / 2; t.y = b.y + b.h / 2; t.s = b.w; });
    const wires = [];
    const n = e.tiles.length;
    e.tiles.forEach((t, i) => {
      const k = (i - (n - 1) / 2) / ((n - 1) / 2); // -1..1 across the fan
      if (vert) { const a = -Math.PI / 2 + k * 0.95; const end = [core.x + Math.cos(a) * core.r * 1.5, core.y + Math.sin(a) * core.r * 1.5]; const st = [t.x, t.y + t.s / 2 + 3]; const dy = end[1] - st[1];
        wires.push({ kind: 'in', tile: t, p: [st, [st[0], st[1] + dy * 0.6], [end[0], end[1] - dy * 0.45], end], flow: [], next: 0.2 + i * 0.25 }); }
      else { const a = Math.PI + k * 0.95; const end = [core.x + Math.cos(a) * core.r * 1.5, core.y - Math.sin(a) * core.r * 1.5]; const st = [t.x + t.s / 2 + 3, t.y]; const dx = end[0] - st[0];
        wires.push({ kind: 'in', tile: t, p: [st, [st[0] + dx * 0.55, st[1]], [end[0] - dx * 0.5, end[1]], end], flow: [], next: 0.2 + i * 0.25 }); }
    });
    [-1, 0, 1].forEach((k, i) => {
      if (vert) { const a = Math.PI / 2 + k * 0.5; const st = [core.x + Math.cos(a) * core.r * 1.5, core.y + Math.sin(a) * core.r * 1.5]; const end = [wb.x + wb.w * (0.5 - k * 0.27), wb.y]; const dy = end[1] - st[1];
        wires.push({ kind: 'out', p: [st, [st[0], st[1] + dy * 0.5], [end[0], end[1] - dy * 0.6], end], flow: [], next: 0.3 + i * 0.3 }); }
      else { const a = k * 0.5; const st = [core.x + Math.cos(a) * core.r * 1.5, core.y + Math.sin(a) * core.r * 1.5]; const end = [wb.x, wb.y + wb.h * (0.5 + k * 0.27)]; const dx = end[0] - st[0];
        wires.push({ kind: 'out', p: [st, [st[0] + dx * 0.5, st[1]], [end[0] - dx * 0.6, end[1]], end], flow: [], next: 0.3 + i * 0.3 }); }
    });
    S.wires = wires; S.L = { w, h, core, vert };
    S.maxY = Math.max(0, e.scroll.scrollHeight - e.view.clientHeight);
  }

  /* ---------- loop ---------- */
  function start() {
    if (!S.root || S.raf || frozen() || !S.visible) return;
    S.last = performance.now(); S.raf = requestAnimationFrame(loop);
  }
  function loop(t) {
    S.raf = 0; if (!S.root) return;
    if (!S.root.isConnected) { destroy(); return; }
    if (document.hidden || !S.visible || frozen()) { if (frozen()) still(); return; }
    const dt = Math.min(0.05, (t - S.last) / 1000); S.last = t; S.clock += dt;
    advance(); frame(dt, false);
    S.raf = requestAnimationFrame(loop);
  }
  function still() {
    if (!S.root || !S.root.isConnected) return;
    if (!S.L) layout(); if (!S.L) return;
    frame(0, true);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  if (mq) { const on = () => { if (!S.root) return; if (reduce()) { cancelAnimationFrame(S.raf); S.raf = 0; if (S.mode === 'live') S.idx = S.target; else S.idx = LAST; S.has = S.idx === LAST; S.out = 0; S.root.classList.remove('fs-out'); paint(true); still(); } else start(); }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }

  /* ---------- drawing ---------- */
  const FI = '250,247,239', FG = '185,201,184', FB = '214,236,208';
  const bez = (p, u) => { const v = 1 - u; return [v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0], v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1]]; };

  function frame(dt, frozenFrame) {
    const c = S.ctx, L = S.L; if (!c || !L) return;
    const e = S.el; const t = S.clock; const step = STEPS[S.idx]; const done = S.idx === LAST;
    const work = !done && !frozenFrame;
    S.energy += ((done ? 0.22 : S.has ? 0.6 : 1) - S.energy) * Math.min(1, dt * 2.5 + (frozenFrame ? 1 : 0));
    S.spin += dt * (0.16 + S.energy * 0.5);
    S.px += (S.tx - S.px) * Math.min(1, dt * 3); S.py += (S.ty - S.py) * Math.min(1, dt * 3);
    const goal = done ? 1 : (S.idx + (S.has ? 0.9 : 0.45)) / STEPS.length;
    S.prog += (goal - S.prog) * Math.min(1, dt * 3 + (frozenFrame ? 1 : 0));
    S.coreHit = Math.max(0, S.coreHit - dt * 2.2); S.winHit = Math.max(0, S.winHit - dt * 1.8);
    const rev = step === 'qa';
    c.clearRect(0, 0, L.w, L.h);

    // tiles: gentle bob and a glow when a pulse leaves
    for (const tl of e.tiles) {
      const bob = frozenFrame ? 0 : Math.sin(t * 0.9 + tl.phase) * 3.5;
      tl.bob = bob; tl.hit = Math.max(0, tl.hit - dt * 1.6);
      tl.el.style.transform = `translate3d(${(-S.px * 3).toFixed(2)}px,${(bob - S.py * 2).toFixed(2)}px,0)`;
      const hv = Math.round(tl.hit * 20) / 20; if (hv !== tl.shown) { tl.shown = hv; tl.el.style.setProperty('--hit', hv); }
    }

    // wires and travelling light
    c.lineCap = 'round';
    for (const w of S.wires) {
      const isIn = w.kind === 'in'; const active = isIn ? FEEDSET.includes(w.tile.k) && !done : !done;
      const p = isIn ? [[w.p[0][0] - S.px * 3, w.p[0][1] + w.tile.bob - S.py * 2], [w.p[1][0], w.p[1][1] + (L.vert ? 0 : w.tile.bob)], w.p[2], w.p[3]] : w.p;
      c.strokeStyle = `rgba(${FI},${active ? 0.2 : 0.08})`; c.lineWidth = 1;
      c.beginPath(); c.moveTo(p[0][0], p[0][1]); c.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]); c.stroke();
      if (!frozenFrame) {
        w.next -= dt;
        if (w.next <= 0) { w.flow.push({ u: 0, v: 0.55 + Math.random() * 0.3 }); w.next = active ? (isIn ? 0.5 : 0.42) + Math.random() * 0.5 : 3 + Math.random() * 4; if (isIn) w.tile.hit = 1; }
        w.flow = w.flow.filter((f) => { f.u += dt * f.v; if (f.u >= 1) { if (isIn) S.coreHit = Math.min(1, S.coreHit + 0.5); else if (!rev) S.winHit = Math.min(1, S.winHit + 0.45); else S.coreHit = Math.min(1, S.coreHit + 0.4); return false; } return true; });
      }
      const back = !isIn && rev;
      for (const f of w.flow) {
        const fade = Math.min(1, f.u * 7, (1 - f.u) * 7 + 0.15);
        for (let k = 0; k < 8; k++) {
          const u0 = f.u - 0.17 * (1 - k / 8), u1 = f.u - 0.17 * (1 - (k + 1) / 8); if (u1 <= 0) continue;
          const a = bez(p, back ? 1 - Math.max(0, u0) : Math.max(0, u0)), b = bez(p, back ? 1 - u1 : u1);
          c.strokeStyle = `rgba(${FB},${(((k + 1) / 8) * 0.85 * fade).toFixed(3)})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
        const hd = bez(p, back ? 1 - f.u : f.u); const g = c.createRadialGradient(hd[0], hd[1], 0, hd[0], hd[1], 8);
        g.addColorStop(0, `rgba(${FB},${(0.75 * fade).toFixed(3)})`); g.addColorStop(1, `rgba(${FB},0)`); c.fillStyle = g; c.beginPath(); c.arc(hd[0], hd[1], 8, 0, TAU); c.fill();
        c.fillStyle = `rgba(${FI},${fade.toFixed(3)})`; c.beginPath(); c.arc(hd[0], hd[1], 1.5, 0, TAU); c.fill();
      }
    }
    const hv = Math.round(S.winHit * 20) / 20; if (hv !== S.hitShown) { S.hitShown = hv; e.wrap.style.setProperty('--hit', hv); }

    core(c, L.core, t, done, work);

    // page scroll while the pages are being coded
    let ty = 0;
    if (step === 'build' && !S.has && !frozenFrame && S.maxY) ty = S.mode === 'demo' ? S.maxY * Math.min(1, (S.clock - S.stepAt) / (DUR.build[0] * 0.8)) : S.maxY * (0.5 - 0.5 * Math.cos((S.clock - S.stepAt) * 0.7));
    S.sy += (ty - S.sy) * Math.min(1, dt * 3.2 + (frozenFrame ? 1 : 0));
    const sy = Math.round(S.sy * 2) / 2; if (sy !== S.syShown) { S.syShown = sy; e.scroll.style.transform = `translate3d(0,${-sy}px,0)`; }
  }

  function core(c, k, t, done, work) {
    const cx = k.x, cy = k.y, R = k.r; const E = S.energy; const flash = S.coreHit;
    const halo = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.6);
    halo.addColorStop(0, `rgba(${FG},${(0.17 + E * 0.07 + flash * 0.1).toFixed(3)})`); halo.addColorStop(0.45, `rgba(${FG},0.045)`); halo.addColorStop(1, `rgba(${FG},0)`);
    c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, R * 2.6, 0, TAU); c.fill();

    // outer dashed ring, slowly turning
    c.save(); c.translate(cx, cy);
    c.setLineDash([2, 7]); c.lineDashOffset = -S.spin * 9; c.strokeStyle = `rgba(${FI},0.16)`; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * 1.5, 0, TAU); c.stroke(); c.setLineDash([]);
    // progress ring: one tick per step, the arc is how far the build is
    const rr = R * 1.3; c.strokeStyle = `rgba(${FI},0.1)`; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
    for (let i = 0; i < STEPS.length; i++) { const a = -Math.PI / 2 + (i / STEPS.length) * TAU; const lit = i / STEPS.length <= S.prog; c.strokeStyle = lit ? `rgba(${FB},0.9)` : `rgba(${FI},0.22)`; c.beginPath(); c.moveTo(Math.cos(a) * (rr - 3), Math.sin(a) * (rr - 3)); c.lineTo(Math.cos(a) * (rr + 3), Math.sin(a) * (rr + 3)); c.stroke(); }
    const end = -Math.PI / 2 + S.prog * TAU; c.lineCap = 'round'; c.lineWidth = 2; c.strokeStyle = `rgba(${FB},0.92)`; c.beginPath(); c.arc(0, 0, rr, -Math.PI / 2, end); c.stroke();
    if (!done) { const hx = Math.cos(end) * rr, hy = Math.sin(end) * rr; const g = c.createRadialGradient(hx, hy, 0, hx, hy, 9); g.addColorStop(0, `rgba(${FB},${(0.5 + 0.3 * Math.sin(t * 4)).toFixed(3)})`); g.addColorStop(1, `rgba(${FB},0)`); c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 9, 0, TAU); c.fill(); }
    c.restore();

    // dotted globe
    const yaw = S.spin * 0.55 + S.px * 0.4, pit = -0.34 + S.py * 0.25; const F = R * 3.4;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
    const P = (x, y, z) => { const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; const q = F / (F + z2 * R); return [cx + x1 * R * q, cy + y2 * R * q, z2, q]; };
    for (const g of globe) { const [x, y, z, q] = P(g[0] * 0.98, g[1] * 0.98, g[2] * 0.98); const front = (1 - z) / 2; const s = (0.7 + front * 1.3) * q; c.fillStyle = `rgba(${FI},${(0.05 + Math.pow(front, 1.7) * 0.5).toFixed(3)})`; c.fillRect(x - s / 2, y - s / 2, s, s); }

    // three square frames turning like a gyroscope
    const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let j = 0; j < 3; j++) {
      const a = [0.76, 0.6, 0.44][j]; const ax = S.spin * (0.62 + j * 0.21) + j * 1.3, ay = S.spin * (0.47 - j * 0.13) + j * 2.1, az = S.spin * 0.2 * (j % 2 ? -1 : 1);
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
      const pts = sq.map(([u, v]) => { let x = (u * cz - v * sz) * a, y = (u * sz + v * cz) * a, z = 0; const y1 = y * ca - z * sa, z1 = y * sa + z * ca; const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb; return P(x2, y1, z2); });
      c.strokeStyle = `rgba(${j === 0 ? FB : FI},${(0.5 - j * 0.1 + flash * 0.25).toFixed(3)})`; c.lineWidth = 1.1; c.lineJoin = 'round';
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.stroke();
      for (const p of pts) { const front = (1 - p[2]) / 2; c.fillStyle = `rgba(${FI},${(0.35 + front * 0.6).toFixed(3)})`; c.beginPath(); c.arc(p[0], p[1], 1.2 + front * 0.9, 0, TAU); c.fill(); }
    }

    // the mark in the middle
    const disc = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.62); disc.addColorStop(0, 'rgba(8,21,14,0.92)'); disc.addColorStop(0.7, 'rgba(8,21,14,0.6)'); disc.addColorStop(1, 'rgba(8,21,14,0)');
    c.fillStyle = disc; c.beginPath(); c.arc(cx, cy, R * 0.62, 0, TAU); c.fill();
    if (BOLT) {
      const beat = work ? 0.5 + 0.5 * Math.sin(t * 3.2) : 0.3; const s = (R * 0.74) / 20;
      c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-11.5, -12);
      c.shadowColor = `rgba(${FB},0.9)`; c.shadowBlur = 10 + E * 10 + beat * 6 + flash * 12; c.fillStyle = `rgb(${FI})`; c.fill(BOLT); c.restore();
    }
  }

  window.FosStage = { mount, has };
})();
