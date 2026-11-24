// Funnel OS: the funnel builder is home. The AI coach (chat channels, voice, library) comes with it as a bonus.
(() => {
  // Public settings from /config.js (api/config.js): your Supabase project and the coach's name.
  const CFG = window.APP_CONFIG || {};
  const COACH = (CFG.coach && CFG.coach.ai) || 'AI Coach';
  const COACH_FIRST = (CFG.coach && CFG.coach.first) || '';
  const GUIDE = CFG.guide || 'https://github.com/gustensun/funnel-os-kit/blob/main/SETUP.md';
  const { byId } = window.GaiChannels;
  const esc = window.MD.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- icons ----------
  const P = {
    plus: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M12 19V5M5 12l7-7 7 7"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
    clip: '<path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', micoff: '<path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M19 11a7 7 0 0 1-1.1 3.7M5 11a7 7 0 0 0 11.4 5.4M12 18v3"/>',
    wave: '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check: '<path d="M5 12l5 5 9-10"/>', speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', corner: '<path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', play: '<path d="M7 4v16l13-8z"/>', file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-3v10l-4-3"/>', call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    chat: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"/>', funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>', dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const kindIcon = (k) => ({ Video: 'video', 'Coaching call': 'call', Framework: 'file', Web: 'globe' }[k] || 'book');

  function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }

  // ---------- auth ----------
  const auth = window.GAI_AUTH || (CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  let session = null;
  async function jwt() { const { data } = await auth.auth.getSession(); session = data.session; return session && session.access_token; }

  // Every error explains what to do and links there when it can.
  function errBox(e, retry) {
    const fix = e && e.fix && (!e.fix.admin || (S.me && S.me.admin)) ? e.fix : null;
    return `<div class="err" role="alert"><p>${esc((e && e.message) || 'Something went wrong. Try again.')}</p><div class="btns">${retry ? '<button class="btn sm" data-retry>Try again</button>' : ''}${fix && fix.href ? `<a class="btn sm" href="${esc(fix.href)}"${/^https?:/.test(fix.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(fix.label || 'Open')}</a>` : ''}</div></div>`;
  }
  async function api(path, payload) {
    const t = await jwt();
    if (!t) { const e = new Error('Your sign-in expired. Sign in again to keep going.'); e.code = 401; throw e; }
    let r;
    try { r = await fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(payload || {}) }); }
    catch { const e = new Error('You look offline. Check your connection, then try again.'); e.code = 0; throw e; }
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) { const e = new Error((j && j.error) || (r.status === 404 ? 'This part of Funnel OS is not running yet. Refresh the page in a minute.' : 'Something went wrong on our side. Try again in a moment.')); e.code = r.status; e.fix = j && j.fix; e.setup = j && j.setup; throw e; }
    return j.data;
  }
  const call = (action, b) => api('app', { action, ...(b || {}) });

  // ---------- state ----------
  const S = { me: null, channel: store.get('gai-channel') || 'general', threads: [], thread: null, turns: [], busy: null, gen: 0, files: [], lib: null, navOpen: false, menuOpen: false };

  // ---------- routing ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'admin') return { view: 'admin' };
    if (a === 'funnels') return { view: 'funnels', id: b || '' };
    if (a === 'kit') return { view: 'kit', tab: b || 'brand' };
    if (a === 'join') return { view: 'join' };
    if (a === 't' && b) return { view: 'thread', id: b };
    if (a === 'c' && b) return { view: 'channel', channel: byId(b).id };
    return { view: 'funnels', id: '' };
  }
  const go = (h) => { if (location.hash !== h) location.hash = h; else onRoute(); };

  // ---------- auth screens ----------
  // The optional demo account (supabase/optional/demo-account.sql). Its password is public on purpose.
  const DEMO = { email: 'demo@example.com', password: 'funnel-os-demo' };
  // Calls that work before sign-in: create an account, open a password link, find the help link.
  async function pub(action, b) {
    let r; try { r = await fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(b || {}) }) }); }
    catch { throw new Error('You look offline. Check your connection, then try again.'); }
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) {
      const e = new Error((j && j.error) || 'The server did not answer. Try again in a moment. If it keeps happening, the admin can follow the setup guide to check the hosting settings.');
      e.fix = (j && j.fix) || (j ? null : { label: 'Open the setup guide', href: GUIDE }); throw e;
    }
    return j.data;
  }
  async function demoIn(btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Opening the demo'; }
    const info = await pubInfo();
    const { error } = await auth.auth.signInWithPassword({ email: typeof info.demo === 'string' ? info.demo : DEMO.email, password: DEMO.password });
    if (error) return authScreen('signin', 'The demo is not switched on for this app. Sign in or create an account instead.', true);
    history.replaceState(null, '', '/'); boot();
  }
  // What the sign-in page needs before anyone signs in: the help link, the demo switch and whether an admin exists yet.
  async function pubInfo() {
    if (!pubInfo.v) { try { pubInfo.v = (await pub('public')) || {}; } catch { return {}; } }
    return pubInfo.v;
  }
  async function authScreen(mode = 'signin', msg, bad, extra = {}) {
    const info = mode === 'set' ? {} : await pubInfo();
    const chips = ['Market research', 'Offer stack', 'Sales copy', 'Design options', 'Graphics', 'Live previews', COACH + ' bonus'].map((c) => `<span class="chip">${esc(c)}</span>`).join('');
    const titles = { signin: ['Sign in', info.setup ? 'New install: create the first account. It becomes the admin.' : 'Welcome back.'], signup: ['Create your account', info.setup ? 'You are the first to sign up, so this account becomes the admin.' : 'The admin approves every new member by hand.'], forgot: ['Forgot your password', 'The admin sends you a link to choose a new one.'],
      set: [extra.purpose === 'setup' ? 'Set up your admin account' : 'Choose a new password', extra.email ? 'For ' + extra.email : ''] };
    const [h, sub] = titles[mode];
    const demoBtn = info.demo && (mode === 'signin' || mode === 'signup') ? `<div class="or"><span>or</span></div><button class="btn demo-btn" type="button" data-demo>${ic('spark')}Try the demo, no account needed</button>` : '';
    const fields = mode === 'forgot' ? `<p class="hint">Passwords are reset by the admin, so there is no email to wait for. Message them with the email you signed up with and they will send you a one-time link.</p>
        ${extra.help ? `<a class="btn primary" href="${esc(extra.help)}" target="_blank" rel="noopener">${ic('ext')}Message the admin</a>` : '<p class="hint">Message the admin where you found this app, for example in your community.</p>'}`
      : `${mode === 'signup' ? '<label class="field"><span>Your name</span><input class="input" name="name" autocomplete="name" required></label>' : ''}
        ${mode === 'signin' || mode === 'signup' ? '<label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="email" required></label>' : ''}
        <label class="field"><span>${mode === 'set' ? 'New password' : 'Password'}</span><input class="input" type="password" name="password" minlength="8" autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" required>${mode !== 'signin' ? '<small>At least 8 characters.</small>' : ''}</label>
        <button class="btn primary" type="submit">${{ signin: 'Sign in', signup: 'Create account', set: 'Save and sign in' }[mode]}</button>`;
    app.innerHTML = `<div class="auth">
      <div class="auth-side"><span class="wordmark"><span class="mk"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.2 2 4.5 13.4h6.1L9.8 22l8.7-11.4h-6.1z"/></svg></span>Funnel <span class="ai">OS</span></span>
        <div><h1><span class="nw">Ready-to-launch</span> funnels, built for you.</h1><p>Answer a short quiz. Funnel OS researches your market, sharpens your offer, writes the copy, designs the pages and makes the graphics, then gives you live previews to compare. ${esc(COACH)} comes with it as a bonus, for any question along the way.</p><div class="auth-chans">${chips}</div></div>
        <span class="foot" style="font-size:13px">For approved members</span></div>
      <div class="auth-form"><form novalidate>
        <h2>${esc(h)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
        ${msg ? `<div class="form-msg${bad ? ' bad' : ''}" role="${bad ? 'alert' : 'status'}">${msg}</div>` : ''}
        ${fields}
        <div class="auth-alt">${mode === 'signin' ? '<button type="button" data-m="signup">Create an account</button><button type="button" data-m="forgot">Forgot password</button>' : mode === 'set' ? '' : '<button type="button" data-m="signin">I already have an account</button>'}</div>
        ${demoBtn}
      </form></div></div>`;
    $$('[data-m]').forEach((b) => b.onclick = async () => { if (b.dataset.m === 'forgot') { let help = null; try { help = (await pub('public')).help_url; } catch { /* show without link */ } return authScreen('forgot', null, false, { help }); } authScreen(b.dataset.m); });
    const d = $('[data-demo]'); if (d) d.onclick = () => demoIn(d);
    const f = $('form');
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      if (mode === 'forgot') return;
      const fd = Object.fromEntries(new FormData(f)); const btn = $('button[type=submit]', f);
      if (fd.email !== undefined && !/^\S+@\S+\.\S+$/.test(fd.email)) return authScreen(mode, 'Enter your email address, like name@example.com.', true, extra);
      if (mode === 'signup' && !String(fd.name || '').trim()) return authScreen(mode, 'Add your name so the admin knows who you are.', true, extra);
      if (fd.password !== undefined && fd.password.length < (mode === 'signin' ? 1 : 8)) return authScreen(mode, mode === 'signin' ? 'Enter your password.' : 'Use at least 8 characters for your password.', true, extra);
      btn.disabled = true; btn.textContent = 'One moment';
      try {
        if (mode === 'signin') {
          const { error } = await auth.auth.signInWithPassword({ email: fd.email.trim(), password: fd.password });
          if (error) throw error; return boot();
        }
        if (mode === 'signup') {
          await pub('signup', { email: fd.email.trim(), password: fd.password, name: fd.name.trim() }); pubInfo.v = null;
          const { error } = await auth.auth.signInWithPassword({ email: fd.email.trim(), password: fd.password });
          if (error) return authScreen('signin', 'Your account is ready. Sign in to continue.');
          return boot();
        }
        if (mode === 'set') {
          const r = await pub('set-password', { code: extra.code, password: fd.password });
          const { error } = await auth.auth.signInWithPassword({ email: r.email, password: fd.password });
          history.replaceState(null, '', '/');
          if (error) return authScreen('signin', 'Password saved. Sign in with it now.');
          return boot();
        }
      } catch (e) {
        const m = String(e.message || e);
        const nice = /invalid login/i.test(m) ? 'That email and password do not match. Try again, or <button type="button" data-m2="forgot">get a reset link</button>.'
          : /already has an account|already registered|already exists/i.test(m) ? 'That email already has an account. <button type="button" data-m2="signin">Sign in instead</button>.'
          : /rate|too many/i.test(m) ? 'Too many tries in a short time. Wait a minute, then try again.'
          : esc(m.replace(/\.$/, '')) + '.';
        const fx = e.fix && e.fix.href && !e.fix.admin ? ` <a href="${esc(e.fix.href)}"${/^https?:/.test(e.fix.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(e.fix.label || 'Open the setup guide')}</a>` : '';
        authScreen(mode, nice + fx, true, extra);
        $$('[data-m2]').forEach((b) => b.onclick = () => (b.dataset.m2 === 'forgot' ? $('[data-m="forgot"]').click() : authScreen(b.dataset.m2)));
        const em = $('input[name=email]'); if (em && fd.email) em.value = fd.email;
        const nm = $('input[name=name]'); if (nm && fd.name) nm.value = fd.name;
      }
    };
    const first = $('input', f); if (first && matchMedia('(min-width: 861px)').matches) first.focus();
  }
  // A one-time password link from the admin: #set/<code>
  async function setScreen(code) {
    let r = null; try { r = await pub('code', { code }); } catch { /* handled below */ }
    if (!r || !r.ok) { history.replaceState(null, '', '/'); return authScreen('signin', 'This password link was already used or has expired. Ask the admin for a new one.', true); }
    return authScreen('set', null, false, { code, email: r.email, purpose: r.purpose });
  }

  function gate(kind, e) {
    const help = S.me && S.me.help_url;
    const body = {
      pending: ['You are on the list', 'The admin approves every member by hand. You can close this page. Once you are in, the app opens right here.', `<ol class="steps"><li><b>1</b> Account created for ${esc((S.me && S.me.email) || 'you')}</li><li><b>2</b> Waiting for the admin to approve you</li><li><b>3</b> Build your first funnel</li></ol>`],
      revoked: ['Your access is paused', 'Your Funnel OS access is not active right now. If you think that is a mistake, message the admin and they will sort it out.', ''],
      setup: ['Almost ready', 'Funnel OS is waiting for its database. If you run this app, open the Supabase SQL Editor, run supabase/setup.sql (step 2 of the setup guide), then refresh this page.', ''],
      config: ['Finish the setup', CFG.error || 'The app settings did not load. Funnel OS needs to run on Vercel with its api folder, and SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY set in the project settings. Add them, redeploy, then refresh this page.', ''],
      error: ['Funnel OS did not load', (e && e.message) || 'Something went wrong while loading.', ''],
    }[kind];
    app.innerHTML = `<div class="gate-wrap"><div class="gate"><span class="wordmark"><span class="mk"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.2 2 4.5 13.4h6.1L9.8 22l8.7-11.4h-6.1z"/></svg></span>Funnel <span class="ai">OS</span></span><h2>${body[0]}</h2><p class="sub">${esc(body[1])}</p>${body[2]}
      <div style="display:flex;gap:8px;flex-wrap:wrap">${kind === 'pending' ? '<button class="btn primary" data-check>Check again</button>' : kind === 'error' || kind === 'setup' || kind === 'config' ? '<button class="btn primary" data-check>Try again</button>' : ''}${kind === 'setup' || kind === 'config' ? `<a class="btn" href="${esc(GUIDE)}" target="_blank" rel="noopener">${ic('ext')}Open the setup guide</a>` : ''}${help ? `<a class="btn" href="${esc(help)}" target="_blank" rel="noopener">Message the admin</a>` : ''}${kind === 'config' ? '' : '<button class="btn ghost" data-out>Sign out</button>'}</div></div></div>`;
    const c = $('[data-check]'); if (c) c.onclick = () => (kind === 'config' ? location.reload() : boot());
    const o = $('[data-out]'); if (o) o.onclick = signOut;
  }
  async function signOut() { stopVoice(); await auth.auth.signOut(); S.me = null; S.threads = []; S.turns = []; S.thread = null; history.replaceState(null, '', '/'); authScreen('signin'); }

  // ---------- boot ----------
  async function boot() {
    if (!auth) return !window.APP_CONFIG || CFG.error || !CFG.supabaseUrl ? gate('config') : gate('error', { message: 'The sign-in service did not load. Refresh the page, and if it keeps happening, turn off any content blocker for this site.' });
    const sm = location.hash.match(/^#set\/([a-f0-9]{20,80})$/); if (sm) return setScreen(sm[1]);
    if (location.hash === '#demo') { const t0 = await jwt(); if (!t0) { if ((await pubInfo()).demo) return demoIn(); history.replaceState(null, '', '/'); } }
    const t = await jwt();
    if (!t) return authScreen(location.hash === '#signup' || location.hash === '#/join' ? 'signup' : 'signin');
    try { S.me = await call('me'); }
    catch (e) { if (e.code === 401) return authScreen('signin', 'Your sign-in expired. Sign in again.', true); return gate(e.setup ? 'setup' : 'error', e); }
    if (S.me.status === 'pending') { clearTimeout(boot.poll); boot.poll = setTimeout(() => S.me && S.me.status === 'pending' && boot(), 60000); return gate('pending'); }
    if (S.me.status !== 'approved') return gate('revoked');
    shell();
    loadThreads();
    const wantWa = location.hash === '#whatsapp';
    if (wantWa) history.replaceState(null, '', '#/c/' + S.channel);
    onRoute();
    call('wa-me').then((w) => { S.wa = w; if (wantWa) waSheet(); }).catch(() => { if (wantWa) waSheet(); });
    if (!S.me.about || !Object.keys(S.me.about).length) { if (!store.get('gai-about-seen')) { store.set('gai-about-seen', '1'); setTimeout(() => aboutSheet(true), 400); } }
  }

  // ---------- shell ----------
  function shell() {
    const name = (S.me.name || S.me.email || 'You').trim();
    app.innerHTML = `<div class="shell">
      <aside class="side" aria-label="Menu">
        <div class="side-top"><a href="#/funnels" class="wordmark" style="text-decoration:none" aria-label="Funnel OS home"><span class="mk"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.2 2 4.5 13.4h6.1L9.8 22l8.7-11.4h-6.1z"/></svg></span>Funnel <span class="ai">OS</span></a><button class="icon-btn" data-theme-toggle aria-label="Switch light and dark">${ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button></div>
        <div class="side-new"><a class="btn" href="#/funnels/new" data-newf>${ic('plus')}New funnel</a></div>
        <div class="side-scroll">
          <nav class="side-tools"><a class="nav-row" href="#/funnels" data-fos-nav><span class="glyph">${ic('funnel')}</span><span class="t">My funnels</span></a></nav>
          <div class="side-label">Brand kit</div>
          <p class="side-note">Funnel OS uses it in every build, so you never start over.</p>
          <nav class="side-tools" id="kitnav" aria-label="Brand kit">${((window.FunnelOS && window.FunnelOS.tabs) || []).map(([k, l], i) => `<a class="nav-row" href="#/kit/${k}" data-kit="${k}"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(l)}</span></a>`).join('')}</nav>
          <div class="side-label side-bonus"><span>${esc(COACH)}</span><span class="bonus">Bonus</span></div>
          <p class="side-note">Ask ${esc(COACH)} when you need clarity on your offer, copy or next step.</p>
          <nav class="side-tools"><button class="nav-row" data-new><span class="glyph">${ic('plus')}</span><span class="t">New chat with ${esc(COACH)}</span></button></nav>
          <div class="side-label" id="recent-label">Recent chats</div>
          <div id="threads"></div>
        </div>
        <div class="side-foot">
          ${S.me.admin ? `<a class="nav-row admin-row" href="#/admin" data-admin-nav>${ic('shield')}<span class="t">Members and settings</span><span class="count" id="pend-count" hidden></span></a>` : ''}
          ${S.me.demo ? `<div class="demo-note"><b>Demo account</b><span>Look around and ask anything. Chats you start here clear after 30 minutes.</span><button class="btn sm primary" data-join>Create your account</button></div>` : ''}
          <button class="me-row" data-me aria-haspopup="menu" aria-expanded="false"><span class="avatar">${esc(name.slice(0, 1).toUpperCase())}</span><span class="nm">${esc(name)}</span></button>
        </div>
      </aside>
      <main class="main" id="main"></main>
    </div>`;
    $('[data-new]').onclick = () => { S.navOpen = false; $('.shell').classList.remove('nav-open'); S.channel = 'general'; store.set('gai-channel', 'general'); newChat(); };
    $('[data-newf]').onclick = () => { S.navOpen = false; $('.shell').classList.remove('nav-open'); };
    const jn = $('[data-join]'); if (jn) jn.onclick = async () => { await auth.auth.signOut(); S.me = null; authScreen('signup'); };
    pendingCount();
    const an = $('[data-admin-nav]'); if (an) an.onclick = () => { S.navOpen = false; $('.shell').classList.remove('nav-open'); };
    $('[data-theme-toggle]').onclick = (e) => { const d = document.documentElement; d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('gai-theme', d.dataset.theme); e.currentTarget.innerHTML = ic(d.dataset.theme === 'dark' ? 'sun' : 'moon'); };
    $('[data-me]').onclick = (e) => { e.stopPropagation(); toggleMenu(); };
    $('#kitnav').onclick = (e) => { if (e.target.closest('a')) { S.navOpen = false; $('.shell').classList.remove('nav-open'); } };
    const fnav = $('[data-fos-nav]'); if (fnav) fnav.onclick = () => { S.navOpen = false; $('.shell').classList.remove('nav-open'); };
    document.addEventListener('click', (e) => { if (S.menuOpen && !e.target.closest('.menu')) toggleMenu(false); if (S.navOpen && !e.target.closest('.side') && !e.target.closest('.menu-btn')) { S.navOpen = false; $('.shell') && $('.shell').classList.remove('nav-open'); } });
    // Escape closes the phone menu and gives focus back to its button.
    if (!S.escNav) { S.escNav = true; document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !S.navOpen) return; S.navOpen = false; const sh = $('.shell'); if (sh) sh.classList.remove('nav-open'); const mb = $('[data-nav]'); if (mb) { mb.setAttribute('aria-expanded', 'false'); mb.focus(); } }); }
  }
  function toggleMenu(force) {
    S.menuOpen = force === undefined ? !S.menuOpen : force;
    const foot = $('.side-foot'); const old = $('.menu', foot); if (old) old.remove();
    $('[data-me]').setAttribute('aria-expanded', String(S.menuOpen));
    if (!S.menuOpen) return;
    foot.insertAdjacentHTML('afterbegin', `<div class="menu" role="menu">
      <button role="menuitem" data-a="about">${ic('user')}My business</button>
      <button role="menuitem" data-a="library">${ic('book')}Library</button>
      ${S.wa && S.wa.enabled && !S.me.demo ? `<button role="menuitem" data-a="wa">${ic('chat')}${S.wa.linked ? 'WhatsApp' : 'Connect WhatsApp'}</button>` : ''}
      ${S.me.admin ? `<a role="menuitem" href="#/admin" data-a="admin">${ic('shield')}Members and settings</a>` : ''}
      <hr><button role="menuitem" data-a="out">${ic('out')}Sign out</button></div>`);
    $('.menu', foot).onclick = (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return; toggleMenu(false); $('.shell').classList.remove('nav-open');
      if (a.dataset.a === 'about') aboutSheet(); if (a.dataset.a === 'library') librarySheet(); if (a.dataset.a === 'wa') waSheet(); if (a.dataset.a === 'out') signOut();
    };
  }
  function markNav() {
    const r = route();
    $$('#kitnav .nav-row').forEach((a) => { const on = r.view === 'kit' && a.dataset.kit === r.tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $$('#threads .nav-row').forEach((a) => a.classList.toggle('on', S.thread && a.dataset.id === S.thread));
    const nw = $('[data-new]'); if (nw) nw.classList.toggle('on', r.view === 'channel' && !S.thread);
    const an = $('[data-admin-nav]'); if (an) an.classList.toggle('on', r.view === 'admin');
    const fn = $('[data-fos-nav]'); if (fn) fn.classList.toggle('on', r.view === 'funnels');
  }
  // What Funnel OS borrows from the shell.
  const fosHelpers = () => ({ api, esc, ic, topbar, bindTop, errBox, toast, shrink, b64, sheet, closeSheet, me: S.me, ask: askCoach, coach: COACH });
  // Opens a fresh coach chat in the Funnels channel, with an optional question ready to send.
  function askCoach(text) { if (S.busy) S.busy.abort(); S.busy = null; S.gen++; S.thread = null; S.turns = []; S.files = []; S.draft = text || ''; S.channel = 'funnels'; store.set('gai-channel', 'funnels'); go('#/c/funnels'); }
  // Waiting members badge for the admin, refreshed on load and after decisions.
  async function pendingCount() {
    const el = $('#pend-count'); if (!el || !S.me || !S.me.admin) return;
    try { const n = (await call('admin-members')).filter((m) => m.status === 'pending' && !m.demo).length; el.hidden = !n; el.textContent = n; el.setAttribute('aria-label', n + ' waiting for approval'); } catch { /* badge is optional */ }
  }

  async function loadThreads() {
    try { S.threads = await call('threads'); } catch (e) { S.threads = []; $('#threads').innerHTML = `<div class="side-empty">Chats did not load. <button class="link" data-reload style="text-decoration:underline">Retry</button></div>`; const r = $('[data-reload]'); if (r) r.onclick = loadThreads; return; }
    renderThreads();
  }
  function renderThreads() {
    const box = $('#threads'); if (!box) return;
    const list = S.threads.slice(0, 40);
    box.innerHTML = list.length ? list.map((t) => `<div class="nav-row thread-row" data-id="${t.id}"><a class="t" href="#/t/${t.id}" style="text-decoration:none;color:inherit">${esc(t.title)}</a><button class="del" data-del="${t.id}" aria-label="Delete chat">${ic('trash')}</button></div>`).join('')
      : `<div class="side-empty">No chats yet. Ask ${esc(COACH_FIRST || 'the coach')} anything about your offer, copy or next step.</div>`;
    box.onclick = async (e) => {
      const d = e.target.closest('[data-del]');
      if (d) {
        e.preventDefault(); const row = d.closest('.thread-row');
        if (row.dataset.confirm) return;
        row.dataset.confirm = '1'; const keep = row.innerHTML;
        row.innerHTML = '<span class="t">Delete?</span><button class="btn sm danger" data-yes>Delete</button><button class="btn sm ghost" data-no>Keep</button>';
        $('[data-no]', row).onclick = (ev) => { ev.stopPropagation(); row.innerHTML = keep; delete row.dataset.confirm; };
        $('[data-yes]', row).onclick = async (ev) => {
          ev.stopPropagation();
          try { await call('thread-delete', { id: d.dataset.del }); S.threads = S.threads.filter((t) => t.id !== d.dataset.del); renderThreads(); if (S.thread === d.dataset.del) newChat(); toast('Chat deleted'); }
          catch (er) { toast(er.message); row.innerHTML = keep; delete row.dataset.confirm; }
        };
        return;
      }
      if (e.target.closest('a')) { S.navOpen = false; $('.shell').classList.remove('nav-open'); }
    };
    markNav();
  }

  // ---------- main views ----------
  function onRoute() {
    if (!S.me || S.me.status !== 'approved' || !$('#main')) return;
    const r = route();
    if (window.FunnelOS && r.view !== 'funnels' && r.view !== 'kit') window.FunnelOS.stop();
    if (r.view === 'join') { if (S.me.demo) { auth.auth.signOut().then(() => { S.me = null; history.replaceState(null, '', '/'); authScreen('signup'); }); return; } return go('#/funnels'); }
    if (r.view === 'admin') { if (!S.me.admin) return go('#/c/' + S.channel); S.thread = null; markNav(); return adminView(); }
    if (r.view === 'funnels') { S.thread = null; markNav(); return window.FunnelOS.mount($('#main'), fosHelpers(), r.id); }
    if (r.view === 'kit') { S.thread = null; markNav(); return window.FunnelOS.kit($('#main'), fosHelpers(), r.tab); }
    if (r.view === 'thread') return openThread(r.id);
    if (S.channel !== r.channel || S.thread || !S.turns.length) {
      if (S.busy) S.busy.abort(); // the answer still finishes and saves on the server
      S.gen++; S.channel = r.channel; store.set('gai-channel', S.channel); S.thread = null; S.turns = [];
    }
    renderThreads(); chatView();
  }
  function newChat() { if (S.busy) S.busy.abort(); S.busy = null; S.gen++; S.thread = null; S.turns = []; S.files = []; go('#/c/' + S.channel); chatView(); renderThreads(); }

  function topbar(title, sub, right = '') {
    return `<header class="top"><button class="icon-btn menu-btn" data-nav aria-label="Open menu" aria-expanded="false">${ic('menu')}</button><h1>${esc(title)}</h1><span class="sub">${esc(sub || '')}</span>${right}</header>`;
  }
  function bindTop() {
    const n = $('[data-nav]'); if (n) n.onclick = (e) => { e.stopPropagation(); S.navOpen = !S.navOpen; $('.shell').classList.toggle('nav-open', S.navOpen); n.setAttribute('aria-expanded', String(S.navOpen)); };
    const v = $('[data-voice]'); if (v) v.onclick = () => startVoice();
  }

  function chatView() {
    const ch = byId(S.channel);
    const main = $('#main');
    main.innerHTML = topbar(ch.name, ch.blurb, `<button class="btn sm" data-voice aria-label="Talk to ${esc(COACH)}">${ic('wave')}Talk</button>`) +
      `<div class="scroll" id="scroll"><div class="col" id="col"></div></div>
       <div class="composer-wrap"><div class="col">${composerHTML()}<div class="hint">${esc(COACH)} can make mistakes. Check what matters before you act on it.</div></div></div>`;
    bindTop(); bindComposer(); renderTurns(); markNav();
    if (S.draft) { const ta = $('#q'); if (ta) { ta.value = S.draft; composer.sync(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } S.draft = ''; }
  }

  function helloHTML() {
    const ch = byId(S.channel); const first = String(S.me.name || '').split(' ')[0];
    const head = ch.id === 'general' ? (first ? `What are we working on, ${esc(first)}?` : 'What are we working on?') : `${esc(ch.name)}: what do you need help with?`;
    return `<div class="hello"><h2>${head}</h2><p class="lead">${esc(S.me.welcome || (ch.id === 'general' ? 'Ask me anything about building your business. I answer from my coaching calls, videos and frameworks.' : ch.blurb + ' Ask me anything, share your page or copy for a review, or press Talk to think it through out loud.'))}</p>
      <div class="starters">${ch.starters.map((s, i) => `<button class="starter" data-ask="${esc(s)}"><span class="num">0${i + 1}</span>${esc(s)}${ic('arrow')}</button>`).join('')}</div></div>`;
  }

  function composerHTML() {
    return `<div class="composer" id="composer">
      <div class="files" id="files"></div>
      <label class="sr" for="q">Your question</label>
      <textarea id="q" rows="1" placeholder="${S.turns.length ? 'Ask a follow-up' : 'Ask ' + esc(COACH_FIRST || 'the coach') + ' anything'}"></textarea>
      <div class="row">
        <button class="icon-btn" data-attach aria-label="Attach a screenshot or file" title="Attach a screenshot, copy or page">${ic('clip')}</button>
        <input type="file" id="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.html,.htm,.csv,.json" hidden>
        <span class="grow"></span>
        <button class="icon-btn" data-voice2 aria-label="Talk instead">${ic('mic')}</button>
        <button class="send" id="send" aria-label="Send" disabled>${ic('send')}</button>
      </div></div>`;
  }

  function bindComposer() {
    const ta = $('#q'); const send = $('#send'); const comp = $('#composer');
    const sync = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; send.disabled = !S.busy && !ta.value.trim() && !S.files.length; send.classList.toggle('stop', !!S.busy); send.innerHTML = ic(S.busy ? 'stop' : 'send'); send.setAttribute('aria-label', S.busy ? 'Stop' : 'Send'); };
    ta.oninput = sync;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!S.busy) submit(); } };
    send.onclick = () => { if (S.busy) { S.busy.abort(); return; } submit(); };
    $('[data-attach]').onclick = () => $('#file').click();
    $('#file').onchange = (e) => { addFiles([...e.target.files]); e.target.value = ''; };
    $('[data-voice2]').onclick = () => startVoice();
    ta.onpaste = (e) => { const fs = [...(e.clipboardData && e.clipboardData.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } };
    comp.ondragover = (e) => { e.preventDefault(); comp.classList.add('drag'); };
    comp.ondragleave = () => comp.classList.remove('drag');
    comp.ondrop = (e) => { e.preventDefault(); comp.classList.remove('drag'); addFiles([...e.dataTransfer.files]); };
    renderFiles(); sync();
    composer.sync = sync;
    if (matchMedia('(min-width: 861px)').matches) ta.focus();
  }
  const composer = {};

  // Screenshots are resized in the browser so big retina captures still fit.
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const max = 1800; const s = Math.min(1, max / Math.max(img.width, img.height));
      if (s === 1 && file.size < 1_500_000 && /png|jpe?g|webp/.test(file.type)) return { type: file.type, data: await b64(file), thumb: url };
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.86).split(',')[1], thumb: url };
    } catch { URL.revokeObjectURL(url); throw new Error(file.name + ' could not be read as an image. Take a new screenshot and attach that.'); }
  }
  const b64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('That file could not be read.')); r.readAsDataURL(f); });
  async function addFiles(list) {
    for (const f of list) {
      if (S.files.length >= 4) { toast('Up to 4 files per message.'); break; }
      try {
        if (/^image\//.test(f.type)) { if (S.files.filter((x) => x.data).length >= 3) { toast('Up to 3 screenshots per message.'); continue; } const im = await shrink(f); S.files.push({ name: f.name || 'Screenshot', ...im }); }
        else if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) toast('PDFs are not supported yet. Paste the text, or attach screenshots of the pages.', 4200);
        else if (/\.(docx?|pages|key|pptx?)$/i.test(f.name)) toast('Word and slide files are not supported yet. Paste the text, or attach a screenshot.', 4200);
        else if (f.size > 400_000) toast(f.name + ' is too long. Paste the part you want reviewed.', 3600);
        else { const text = await f.text(); S.files.push({ name: f.name, text: text.slice(0, 24000) }); }
      } catch (e) { toast(e.message, 4000); }
    }
    renderFiles(); composer.sync && composer.sync();
  }
  function renderFiles() {
    const box = $('#files'); if (!box) return;
    box.innerHTML = S.files.map((f, i) => `<span class="file">${f.thumb ? `<img src="${f.thumb}" alt="">` : ic('file')}<span>${esc(f.name)}</span><button data-rm="${i}" aria-label="Remove ${esc(f.name)}">${ic('x')}</button></span>`).join('');
    box.style.display = S.files.length ? '' : 'none';
    box.onclick = (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; S.files.splice(+b.dataset.rm, 1); renderFiles(); composer.sync && composer.sync(); };
  }

  // ---------- turns ----------
  function renderTurns() {
    const col = $('#col'); if (!col) return;
    const sc = $('#scroll'); if (sc) sc.classList.toggle('is-hello', !S.turns.length);
    if (!S.turns.length) { col.innerHTML = helloHTML(); bindTurns(col); return; }
    col.innerHTML = `<div class="thread">${S.turns.map((t, i) => turnHTML(t, i)).join('')}</div>`;
    bindTurns(col);
  }
  // Sources sit behind a small button under each reply, like a chat in Perplexity. Citations open them.
  function srcList(t) {
    // Web pages first, then the library sources the answer cites, so nothing it relied on hides at the end.
    const all = t.sources || []; const rank = (s) => (s.kind === 'web' ? 0 : s.cited ? 1 : 2);
    return all.map((s, i) => [s, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  }
  function srcPill(t) {
    const list = srcList(t); if (!list.length) return '';
    const kinds = [...new Set(list.map((s) => kindIcon(s.label)))].slice(0, 3);
    return `<button class="src-pill${t.showSrc ? ' on' : ''}" data-srcs="${t.key}" aria-expanded="${!!t.showSrc}"><span class="stack">${kinds.map((k) => `<i>${ic(k)}</i>`).join('')}</span>${list.length} source${list.length === 1 ? '' : 's'}</button>`;
  }
  function sourcesHTML(t) {
    if (!t.showSrc) return ''; const list = srcList(t); if (!list.length) return '';
    return `<div class="sources">${list.map((s) => {
      const inner = `<span class="k"><span class="n">${s.n}</span>${ic(kindIcon(s.label))}${esc(s.label)}${s.at ? ' · ' + esc(s.at) : ''}</span><span class="tt">${esc(s.title)}</span>`;
      return s.url ? `<a class="src" id="src-${t.key}-${s.n}" href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="src" id="src-${t.key}-${s.n}">${inner}</div>`;
    }).join('')}</div>`;
  }
  function turnHTML(t, i) {
    const cites = new Set(); // No sources or citation numbers in chat replies.
    const body = t.error ? errBox(t.error, true)
      : !t.answer && t.state === 'wait' ? `<div class="thinking"><span class="shine">Thinking</span></div>`
      : `<div class="answer" id="ans-${t.key}">${window.MD.render(t.answer, { cites })}${t.state === 'stream' && !reduced() ? '<span class="caret"></span>' : ''}</div>`;
    const done = t.state === 'done';
    const q = t.q || (t.files && t.files.length ? 'Review this' : '');
    return `<section class="turn" data-i="${i}">
      <div class="me">
        ${t.files && t.files.length ? `<div class="q-files">${t.files.map((f) => `<span class="file">${ic(f.kind === 'whatsapp' ? 'chat' : 'file')}<span>${esc(f.name)}</span></span>`).join('')}</div>` : ''}
        ${q ? `<h2 class="q">${esc(q)}</h2>` : ''}
      </div>
      <div class="bot">
        ${body}
        ${done && !t.error ? `<div class="actions"><button class="icon-btn" data-copy="${i}" aria-label="Copy answer" title="Copy">${ic('copy')}</button><button class="icon-btn" data-listen="${i}" aria-label="Listen to this answer" title="Listen">${ic('speaker')}</button>${t.by ? `<span class="by">${esc(t.by)}</span>` : ''}</div>` : ''}
        ${done && t.related && t.related.length && i === S.turns.length - 1 ? `<div class="related">${t.related.map((r) => `<button data-ask="${esc(r)}">${ic('corner')}<span>${esc(r)}</span></button>`).join('')}</div>` : ''}
      </div>
    </section>`;
  }
  function bindTurns(col) {
    col.onclick = (e) => {
      const a = e.target.closest('[data-ask]'); if (a) { ask(a.dataset.ask); return; }
      const c = e.target.closest('.cite'); if (c) { const sec = c.closest('.turn'); const t = S.turns[+sec.dataset.i]; const n = +c.dataset.n; const s = (t.sources || []).find((x) => x.n === n);
        if (!t.showSrc) { t.showSrc = true; updateTurn(+sec.dataset.i); }
        const el = $('#src-' + t.key + '-' + n);
        if (s && s.url && e.metaKey) { window.open(s.url, '_blank', 'noopener'); return; }
        if (el) { el.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); }
        return; }
      const m = e.target.closest('[data-srcs]'); if (m) { const i = S.turns.findIndex((x) => x.key === m.dataset.srcs); S.turns[i].showSrc = !S.turns[i].showSrc; updateTurn(i); return; }
      const cp = e.target.closest('[data-copy]'); if (cp) { const t = S.turns[+cp.dataset.copy]; navigator.clipboard.writeText(t.answer.replace(/\s?\[\d+\]/g, '')).then(() => { cp.innerHTML = ic('check'); toast('Copied'); setTimeout(() => { cp.innerHTML = ic('copy'); }, 1500); }, () => toast('Copy did not work in this browser. Select the text instead.')); return; }
      const l = e.target.closest('[data-listen]'); if (l) { listen(S.turns[+l.dataset.listen], l); return; }
      const r = e.target.closest('[data-retry]'); if (r) { const sec = r.closest('.turn'); const t = S.turns[+sec.dataset.i]; S.turns.splice(+sec.dataset.i, 1); S.files = t.rawFiles || []; renderTurns(); ask(t.q); }
    };
  }
  function updateTurn(i) {
    const sec = $(`.turn[data-i="${i}"]`); if (!sec) return renderTurns();
    const html = turnHTML(S.turns[i], i); const tmp = document.createElement('div'); tmp.innerHTML = html; sec.replaceWith(tmp.firstElementChild);
  }
  // Keep the newest text in view while it streams, unless the member scrolled up to read.
  function follow(force) { const sc = $('#scroll'); if (!sc) return; const near = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160; if (force || near) sc.scrollTop = sc.scrollHeight; }

  function submit() { const ta = $('#q'); const q = ta.value.trim(); if (!q && !S.files.length) return; ask(q); }

  async function ask(q) {
    if (S.busy) return;
    q = String(q || '').trim(); if (!q && !S.files.length) return;
    const files = S.files; S.files = [];
    const t = { key: Math.random().toString(36).slice(2, 8), q, files: files.map((f) => ({ name: f.name, kind: f.data ? 'image' : 'text', thumb: f.thumb })), rawFiles: files, answer: '', sources: [], related: [], state: 'wait' };
    S.turns.push(t);
    const ta = $('#q'); if (ta) { ta.value = ''; ta.placeholder = 'Ask a follow-up'; }
    renderFiles(); renderTurns(); follow(true);
    const ctl = new AbortController(); S.busy = ctl; composer.sync && composer.sync();
    const g = S.gen; const live = () => S.gen === g;
    const i = S.turns.length - 1;
    let pending = false; const paint = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; const el = $('#ans-' + t.key); if (el && t.state === 'stream') { el.innerHTML = window.MD.render(t.answer, { cites: new Set(t.sources.map((s) => s.n)) }) + (reduced() ? '' : '<span class="caret"></span>'); } else updateTurn(i); follow(); }); };
    try {
      const token = await jwt(); if (!token) throw Object.assign(new Error('Your sign-in expired. Sign in again to keep going.'), { fix: { label: 'Sign in', href: '/' } });
      const r = await fetch('/api/ask', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ q, channel: S.channel, thread_id: S.thread, files: files.map((f) => (f.data ? { name: f.name, type: f.type, data: f.data } : { name: f.name, text: f.text })) }) });
      if (!r.ok || !r.body) { let j = null; try { j = await r.json(); } catch { /* not json */ } throw Object.assign(new Error((j && j.error) || (r.status === 413 ? 'Those files are too large together. Attach fewer or smaller screenshots.' : 'The answer did not come through. Try again.')), { fix: j && j.fix }); }
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); let n;
        while ((n = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1); if (!line) continue;
          let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (!live()) continue;
          if (ev.type === 'meta') { t.sources = ev.sources || []; t.by = ev.by; updateTurn(i); follow(); }
          else if (ev.type === 'delta') { if (t.state === 'wait') { t.state = 'stream'; updateTurn(i); } t.answer += ev.text; paint(); }
          else if (ev.type === 'done') {
            if (ev.answer) t.answer = ev.answer; t.sources = ev.sources || t.sources; t.related = ev.related || []; t.by = ev.by || t.by; t.state = 'done';
            if (ev.thread_id && ev.thread_id !== S.thread) {
              S.thread = ev.thread_id; history.replaceState(null, '', '#/t/' + ev.thread_id);
              if (!S.threads.find((x) => x.id === ev.thread_id)) S.threads.unshift({ id: ev.thread_id, title: (q || 'Shared a file').slice(0, 120), channel: S.channel, updated_at: new Date().toISOString() });
              renderThreads();
            } else { const th = S.threads.find((x) => x.id === S.thread); if (th) { S.threads = [th, ...S.threads.filter((x) => x !== th)]; renderThreads(); } }
          } else if (ev.type === 'error') { throw Object.assign(new Error(ev.error), { fix: ev.fix, setup: ev.setup }); }
        }
      }
      if (t.state !== 'done') { if (t.answer) { t.state = 'done'; } else throw new Error('The answer stopped before it finished. Ask again.'); }
    } catch (e) {
      if (e.name === 'AbortError') { t.state = 'done'; setTimeout(loadThreads, 2500); if (live()) { if (!t.answer) S.turns.splice(i, 1); else t.answer += '\n\nStopped.'; } }
      else { t.state = 'done'; t.error = { message: e.message || 'The answer did not come through. Try again.', fix: e.fix }; if (e.setup && S.me.admin) t.error.message = 'One database step is left. Apply the setup scripts in the supabase folder, then refresh.'; }
    } finally {
      if (S.busy === ctl) S.busy = null;
      if (live()) { renderTurns(); composer.sync && composer.sync(); follow(); }
    }
  }

  async function openThread(id) {
    if (S.thread === id && S.turns.length) { if (!$('#col')) chatView(); renderThreads(); return; }
    if (S.busy) S.busy.abort();
    S.gen++; S.thread = id;
    const known = S.threads.find((t) => t.id === id); if (known) { S.channel = known.channel || 'general'; store.set('gai-channel', S.channel); }
    S.turns = []; chatView(); renderThreads();
    $('#col').innerHTML = '<div class="thread"><div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Opening chat</div></div>';
    try {
      const th = await call('thread', { id });
      if (S.thread !== id) return;
      S.channel = th.channel || 'general'; store.set('gai-channel', S.channel);
      const turns = []; let cur = null;
      for (const m of th.messages) {
        if (m.role === 'user') { cur = { key: Math.random().toString(36).slice(2, 8), q: m.body.startsWith('(shared ') ? '' : m.body, files: m.files || [], answer: '', sources: [], related: [], state: 'done' }; turns.push(cur); }
        else if (cur) { cur.answer = m.body; cur.sources = m.sources || []; cur.related = m.related || []; }
      }
      S.turns = turns; chatView(); renderThreads(); follow(true);
    } catch (e) {
      $('#col').innerHTML = `<div class="thread">${errBox({ message: e.code === 404 || /deleted|another account/i.test(e.message) ? 'This chat was deleted, or it belongs to another account.' : e.message, fix: { label: 'Start a new chat', href: '#/c/' + S.channel } })}</div>`;
    }
  }

  // ---------- speech, all in the browser ----------
  // The most natural voice this device has for the member's language.
  function bestVoice() {
    if (!('speechSynthesis' in window)) return null;
    const all = speechSynthesis.getVoices(); if (!all.length) return null;
    const lang = (navigator.language || 'en-US').slice(0, 2).toLowerCase();
    const mine = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang)); const pool = mine.length ? mine : all.filter((v) => /^en/i.test(v.lang));
    const score = (v) => (/natural|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google|microsoft|siri|samantha|daniel|alex/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
    return pool.sort((x, y) => score(y) - score(x))[0] || null;
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
  // Speaks text in sentence-sized pieces, since some browsers stop long utterances early.
  function say(text, isOn = () => true) {
    if (!('speechSynthesis' in window)) return Promise.reject(Object.assign(new Error('no speech'), { code: 'nospeech' }));
    const parts = String(text).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*\s*/g) || [String(text)];
    const v = bestVoice();
    return parts.reduce((p, part) => p.then(() => (isOn() ? new Promise((ok) => {
      const u = new SpeechSynthesisUtterance(part.trim()); if (v) { u.voice = v; u.lang = v.lang; } u.rate = 1.02; u.onend = ok; u.onerror = ok; speechSynthesis.speak(u);
    }) : null)), Promise.resolve());
  }

  // ---------- listen to an answer ----------
  let listening = null;
  async function listen(t, btn) {
    if (listening) { listening.stop = true; speechSynthesis.cancel(); const was = listening.btn; listening = null; was.innerHTML = ic('speaker'); if (was === btn) return; }
    if (!('speechSynthesis' in window)) return toast('This browser cannot read answers aloud. Try Chrome, Edge or Safari.');
    const text = t.answer.replace(/\s?\[\d+\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*_>`]/g, '').slice(0, 3000);
    const me = listening = { btn, stop: false }; btn.innerHTML = ic('stop');
    await say(text, () => !me.stop).catch(() => {});
    if (listening === me) { listening = null; btn.innerHTML = ic('speaker'); }
  }

  // ---------- voice call (status and controls only, never a transcript) ----------
  const V = { on: false, mode: null, raf: 0, rec: null, muted: false, state: '' };
  function voiceUI(state, note) {
    V.state = state;
    const words = { connecting: 'Connecting', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking', paused: 'Microphone off' };
    let el = $('.voice');
    if (!el) {
      document.body.insertAdjacentHTML('beforeend', `<div class="voice" role="dialog" aria-modal="true" aria-label="Voice call with ${esc(COACH)}">
        <div class="who"><span class="wordmark"><span class="mk"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.2 2 4.5 13.4h6.1L9.8 22l8.7-11.4h-6.1z"/></svg></span>${COACH_FIRST ? esc(COACH_FIRST) + ' <span class="ai">AI</span>' : 'AI <span class="ai">Coach</span>'}</span><p>${esc(byId(S.channel).name)}</p></div>
        <div class="orb" id="orb"></div><div class="state" id="vstate" aria-live="polite"></div>
        <div class="controls"><button class="round" data-vmic aria-label="Turn microphone off">${ic('mic')}</button><button class="round end" data-vend aria-label="End call">${ic('x')}</button></div>
        <div class="note" id="vnote"></div></div>`);
      el = $('.voice');
      $('[data-vend]').onclick = stopVoice;
      $('[data-vmic]').onclick = (e) => { V.muted = !V.muted; const b = e.currentTarget; b.classList.toggle('on', V.muted); b.innerHTML = ic(V.muted ? 'micoff' : 'mic'); b.setAttribute('aria-label', V.muted ? 'Turn microphone on' : 'Turn microphone off');
        if (V.muted && V.rec) { try { V.rec.abort(); } catch { /* idle */ } } else if (!V.muted) fbListen(); voiceUI(V.muted ? 'paused' : 'listening'); };
      document.addEventListener('keydown', escVoice);
    }
    $('#vstate').textContent = words[state] || '';
    $('#orb').className = 'orb ' + state;
    if (note !== undefined) $('#vnote').textContent = note;
  }
  const escVoice = (e) => { if (e.key === 'Escape') stopVoice(); };
  function levelLoop() { const o = $('#orb'); if (!o || !V.on) return; const lv = V.state === 'speaking' ? 0.35 + Math.random() * 0.25 : 0; o.style.setProperty('--lv', reduced() ? 0 : lv.toFixed(3)); V.raf = requestAnimationFrame(levelLoop); }

  async function askVoice(question) {
    const r = await api('ask', { q: question, channel: S.channel, voice: true });
    return r && r.answer ? r.answer : '';
  }
  // Voice runs on the browser's own speech: it listens, the coach answers, the browser reads the answer out.
  async function startVoice() {
    if (V.on) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    V.on = true; V.muted = false; voiceUI('connecting', '');
    levelLoop();
    if (!SR || !('speechSynthesis' in window)) { voiceUI('paused', 'Voice needs Chrome, Edge or Safari on this device. You can still type your question.'); return; }
    V.mode = 'fb';
    await fbSpeak('Hey, good to hear from you. What are we working on today?');
    if (V.on) fbListen();
  }
  function fbListen() {
    if (!V.on || V.mode !== 'fb' || V.muted) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const rec = V.rec = new SR();
    rec.lang = navigator.language || 'en-US'; rec.interimResults = false; rec.continuous = false;
    let heard = '';
    rec.onresult = (e) => { heard = [...e.results].map((r) => r[0].transcript).join(' '); };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { V.muted = true; voiceUI('paused', 'Allow microphone access for this site in your browser settings, then press Talk again.'); } };
    rec.onend = async () => {
      if (!V.on || V.rec !== rec) return;
      if (!heard.trim()) return setTimeout(fbListen, 200);
      voiceUI('thinking');
      try { const a = await askVoice(heard); if (V.on) await fbSpeak(a); }
      catch (e) { if (V.on) await fbSpeak('Sorry, that did not come through. Ask me again.'); }
      if (V.on) { voiceUI(V.muted ? 'paused' : 'listening'); fbListen(); }
    };
    try { rec.start(); voiceUI('listening'); } catch { /* already listening */ }
  }
  async function fbSpeak(text) {
    if (!text || !V.on) return;
    voiceUI('speaking');
    await say(text, () => V.on).catch(() => {});
  }
  function stopVoice() {
    if (!V.on) return; V.on = false; cancelAnimationFrame(V.raf);
    if (V.rec) { try { V.rec.abort(); } catch { /* idle */ } V.rec = null; }
    if (V.audio) { V.audio.pause(); V.audio = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    V.mode = null; const el = $('.voice'); if (el) el.remove(); document.removeEventListener('keydown', escVoice);
  }

  // ---------- sheets ----------
  function sheet(title, body, foot) {
    closeSheet();
    document.body.insertAdjacentHTML('beforeend', `<div class="scrim" data-close></div><aside class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</aside>`);
    $$('[data-close]').forEach((b) => b.onclick = closeSheet);
    document.addEventListener('keydown', escSheet);
    return $('.sheet');
  }
  const escSheet = (e) => { if (e.key === 'Escape') closeSheet(); };
  function closeSheet() { $$('.scrim, .sheet').forEach((x) => x.remove()); document.removeEventListener('keydown', escSheet); }

  function aboutSheet(first) {
    const a = (S.me && S.me.about) || {};
    const F = [['business', 'What is your business?', 'One or two lines. What you do and for whom.', 'I help busy dentists get more patients with funnels'],
      ['offer', 'What do you sell, or plan to sell?', 'Name, price and format if you have them.', 'Done-for-you funnels, 2,500 per build'],
      ['audience', 'Who is it for?', '', 'Dental clinics with 2 to 5 chairs'],
      ['stage', 'Where are you right now?', '', 'Just starting, no clients yet'],
      ['goal', 'What is your goal for the next 90 days?', '', 'Land 3 paying clients'],
      ['stuck', 'Where are you stuck?', '', 'I do not know how to find clients']];
    const el = sheet('My business', `${first ? '<p class="muted" style="margin:0 0 18px">Tell me about your business once, and every answer is tailored to it. Skip anything you are not sure about.</p>' : `<p class="muted" style="margin:0 0 18px">${esc(COACH)} uses this to tailor every answer. Only you can see it.</p>`}
      <form id="about">${F.map(([k, l, h, ph]) => `<label class="field"><span>${l}</span>${k === 'business' || k === 'stuck' ? `<textarea class="textarea" name="${k}" maxlength="600" placeholder="${esc(ph)}">${esc(a[k] || '')}</textarea>` : `<input class="input" name="${k}" maxlength="600" placeholder="${esc(ph)}" value="${esc(a[k] || '')}">`}${h ? `<small>${h}</small>` : ''}</label>`).join('')}</form>`,
      `<button class="btn ghost" data-close>${first ? 'Skip for now' : 'Cancel'}</button><button class="btn primary" data-save>Save</button>`);
    $$('[data-close]', el.parentElement).forEach((b) => b.onclick = closeSheet);
    $('[data-save]').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Saving';
      const about = Object.fromEntries([...new FormData($('#about'))].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
      try { S.me.about = await call('about', { about }); closeSheet(); toast('Saved. Answers will use this from now on.'); }
      catch (er) { b.disabled = false; b.textContent = 'Save'; toast(er.message, 4000); }
    };
  }

  async function librarySheet() {
    const el = sheet('Library', '<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Loading the library</div>');
    const body = $('.sheet-body', el);
    try { S.lib = S.lib || await call('library'); }
    catch (e) { body.innerHTML = errBox(e, true); const r = $('[data-retry]', body); if (r) r.onclick = () => { S.lib = null; librarySheet(); }; return; }
    const kinds = [['all', 'All'], ['recording', 'Coaching calls'], ['youtube', 'Videos'], ['doc', 'Frameworks'], ['plays', 'Core answers']];
    let kind = 'all'; let q = '';
    const items = () => {
      if (kind === 'plays') return S.lib.plays.filter((p) => !q || (p.question + ' ' + p.topic).toLowerCase().includes(q)).map((p) => ({ title: p.question, meta: p.topic, ask: p.question }));
      return S.lib.sources.filter((s) => (kind === 'all' || s.kind === kind) && (!q || (s.title + ' ' + (s.preview || '')).toLowerCase().includes(q)))
        .map((s) => ({ title: s.title, meta: { recording: 'Coaching call', youtube: 'Video', doc: 'Framework' }[s.kind] + (s.published_at ? ' · added ' + new Date(s.published_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''), pv: s.preview, url: s.url, kind: s.kind, ask: `What are the key lessons from "${s.title}" and how do I apply them?` }));
    };
    body.innerHTML = `<p class="muted" style="margin:0 0 14px">Everything ${esc(COACH)} answers from: ${S.lib.sources.length} calls, videos and frameworks, plus ${S.lib.plays.length} core answers.</p>
      <div class="search">${ic('search')}<input class="input" type="search" placeholder="Search the library" aria-label="Search the library"></div>
      <div class="tabs" role="tablist">${kinds.map(([k, l]) => `<button class="tab${k === 'all' ? ' on' : ''}" role="tab" data-k="${k}">${l}</button>`).join('')}</div><div id="lib"></div>`;
    const paint = () => {
      const list = items();
      $('#lib').innerHTML = list.length ? list.map((x, i) => `<div class="lib-item"><span class="tt">${esc(x.title)}</span><span class="meta">${esc(x.meta)}</span>${x.pv ? `<span class="pv">${esc(x.pv)}</span>` : ''}<span class="go" style="display:flex;gap:4px">${x.url ? `<a class="icon-btn" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="${x.kind === 'doc' ? 'Open ' + esc(x.title) : 'Watch ' + esc(x.title)}">${ic(x.kind === 'doc' ? 'ext' : 'play')}</a>` : ''}<button class="btn sm" data-li="${i}">Ask about this</button></span></div>`).join('')
        : `<p class="muted">Nothing matches${q ? ' "' + esc(q) + '"' : ''}. Try another word${kind !== 'all' ? ', or look in All' : ''}.</p>`;
      $('#lib').onclick = (e) => { const b = e.target.closest('[data-li]'); if (!b) return; const it = list[+b.dataset.li]; closeSheet(); if (route().view !== 'channel' || S.thread) { S.thread = null; S.turns = []; go('#/c/' + S.channel); } const ta = $('#q'); if (ta) { ta.value = it.ask; composer.sync(); ta.focus(); } };
    };
    $('input[type=search]', body).oninput = (e) => { q = e.target.value.trim().toLowerCase(); paint(); };
    $('.tabs', body).onclick = (e) => { const t = e.target.closest('[data-k]'); if (!t) return; kind = t.dataset.k; $$('.tab', body).forEach((x) => x.classList.toggle('on', x === t)); paint(); };
    paint();
  }

  // ---------- admin ----------
  async function adminView() {
    const main = $('#main');
    main.innerHTML = topbar('Members and settings', 'Approve members and connect the AI') + '<div class="scroll"><div class="col admin" id="adm"><div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Loading</div></div></div>';
    bindTop();
    const box = $('#adm');
    let members, cfg;
    try { [members, cfg] = await Promise.all([call('admin-members'), call('admin-settings')]); }
    catch (e) { box.innerHTML = errBox(e, true); $('[data-retry]', box).onclick = adminView; return; }
    const st = cfg.settings || {};
    const real = members.filter((m) => !m.demo);
    const by = (s) => real.filter((m) => m.status === s);
    const sum = (k) => real.reduce((a, m) => a + (+m[k] || 0), 0);
    const ago = (d) => { if (!d) return 'never'; const s = (Date.now() - new Date(d)) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
    const pl = (n, w) => `${+n || 0} ${w}${+n === 1 ? '' : 's'}`;
    const row = (m) => `<div class="member" data-u="${m.user_id}"><div class="who"><b>${esc(m.name || m.email)}</b><span>${esc(m.email)}${m.confirmed ? '' : ' · email not confirmed'} · ${m.status === 'pending' ? 'requested' : 'joined'} ${ago(m.requested_at)}</span></div>
      <div class="use">${m.status === 'approved' ? `${pl(m.asks_30d, 'question')} · ${pl(m.talks_30d, 'spoken question')}${m.last_sign_in ? `<br>last seen ${ago(m.last_sign_in)}` : ''}` : `<span class="pill ${m.status === 'pending' ? 'wait' : 'no'}">${m.status === 'pending' ? 'Waiting' : 'Paused'}</span>`}</div>
      <div class="btns">${m.demo ? '<span class="pill">Demo</span>' : m.admin ? '<span class="pill ok">Admin</span>' : m.status === 'approved' ? '<button class="btn sm ghost" data-reset>Password link</button><button class="btn sm" data-set="revoked">Pause</button>' : `<button class="btn sm primary" data-set="approved">Approve</button>${m.status === 'pending' ? '<button class="btn sm ghost" data-set="revoked">Decline</button>' : ''}`}</div></div>`;
    const dot = (ok) => `<span class="dot ${ok ? 'ok' : 'no'}"></span>`;
    box.innerHTML = `<h2>Members and settings</h2><p class="lead">Only you see this page. Activity shows counts only, never what members ask.</p>
      <div class="stats"><div class="stat"><b>${by('approved').length}</b><span>Active members</span></div><div class="stat"><b>${by('pending').length}</b><span>Waiting for you</span></div><div class="stat"><b>${sum('asks_30d')}</b><span>Questions, 30 days</span></div><div class="stat"><b>${sum('talks_30d')}</b><span>Spoken questions, 30 days</span></div></div>
      <h3>Waiting for approval</h3><div id="pend">${by('pending').map(row).join('') || '<p class="muted">Nobody is waiting. New sign-ups show up here.</p>'}</div>
      <h3>Members</h3><div id="act">${[...by('approved'), ...by('revoked'), ...members.filter((m) => m.demo)].map(row).join('') || '<p class="muted">No members yet.</p>'}</div>
      <h3 id="keys">What powers Funnel OS</h3>
      <div class="setting keys"><div class="l"><b>Perplexity key</b><span>The one key Funnel OS and ${esc(COACH)} run on. Through it, the AI can use Claude, GPT, Gemini or Grok and search the web. It is checked, sealed on the server and never shown again. Members never see it.</span></div><div class="r" style="flex-direction:column;align-items:stretch;gap:12px">
        <div class="keyrow" data-k="perplexity"><span class="status-line">${dot(cfg.ai.perplexity)}<b>Perplexity</b> ${cfg.ai.perplexity ? 'added, ending ' + esc(cfg.ai.perplexity) : 'not added yet, so members cannot get answers'}</span><div class="r"><input class="input" type="password" autocomplete="off" spellcheck="false" placeholder="pplx-..." aria-label="Perplexity API key"><button class="btn sm${cfg.ai.perplexity ? '' : ' primary'}" data-key="save">Save</button>${cfg.ai.perplexity ? '<button class="btn sm ghost" data-key="remove">Remove</button>' : ''}</div></div>
        <span class="muted">Create a key under API keys in the <a href="https://console.perplexity.ai" target="_blank" rel="noopener">Perplexity API console</a>, add credit under <a href="https://console.perplexity.ai/project/billing" target="_blank" rel="noopener">Billing</a> and turn on auto reload so answers never stop.</span></div></div>
      <div class="setting"><div class="l"><b>Model</b><span>Which AI writes the answers. If it fails, another model answers instead so members are never stuck.</span></div><div class="r"><select class="input" id="s-model" aria-label="Model">${cfg.models.map((m) => `<option value="${esc(m.id)}"${m.id === cfg.model ? ' selected' : ''}>${esc(m.name)}, ${esc(m.note.toLowerCase())}</option>`).join('')}</select></div></div>
      <div class="setting"><div class="l"><b>Calls on the site</b><span>Talk mode uses the speech built into each member's browser, so it needs no extra account.</span></div><div class="r"><span class="muted">Works in Chrome, Edge and Safari.</span></div></div>
      ${waAdmin(cfg, st, dot, ago)}
      <div class="setting"><div class="l"><b>Library</b><span>What ${esc(COACH)} answers from.</span></div><div class="r"><span class="muted">It lives in your database. Add your own frameworks and answers with the library files in the code (CUSTOMIZE.md has the steps). Members can browse it under Library.</span></div></div>
      <div class="setting"><div class="l"><b>Help link</b><span>Where waiting or paused members can message you. A community post, chat or email link works.</span></div><div class="r"><input class="input" id="s-help" type="url" placeholder="https://..." value="${esc(st.help_url || '')}"><button class="btn sm" data-save="help_url">Save</button></div></div>
      <div class="setting"><div class="l"><b>Welcome line</b><span>Shown under the greeting on every new chat. Leave empty for the default.</span></div><div class="r"><input class="input" id="s-welcome" maxlength="240" placeholder="Ask me anything about building your business." value="${esc(st.welcome || '')}"><button class="btn sm" data-save="welcome">Save</button></div></div>`;
    box.onclick = async (e) => {
      const rs = e.target.closest('[data-reset]');
      if (rs) { const m = members.find((x) => x.user_id === rs.closest('[data-u]').dataset.u); rs.disabled = true;
        try { const { url } = await call('admin-reset', { user_id: m.user_id }); resetSheet(m, url); } catch (er) { toast(er.message, 4000); } rs.disabled = false; return; }
      const b = e.target.closest('[data-set]');
      if (b) { const u = b.closest('[data-u]').dataset.u; b.disabled = true; try { await call('admin-set', { user_id: u, status: b.dataset.set }); toast(b.dataset.set === 'approved' ? 'Approved. They can sign in now.' : 'Access paused.'); adminView(); pendingCount(); } catch (er) { b.disabled = false; toast(er.message, 4000); } return; }
      const s = e.target.closest('[data-save]');
      if (s) { const k = s.dataset.save; const v = $('#s-' + (k === 'help_url' ? 'help' : 'welcome')).value.trim();
        if (k === 'help_url' && v && !/^https:\/\//.test(v)) return toast('Use a full link that starts with https://');
        s.disabled = true; try { await call('admin-setting', { key: k, value: v }); if (k === 'welcome') S.me.welcome = v; toast('Saved'); } catch (er) { toast(er.message, 4000); } s.disabled = false; return; }
      const kb = e.target.closest('[data-key]');
      if (kb) { const row = kb.closest('[data-k]'); const inp = $('input', row); const rm = kb.dataset.key === 'remove'; const v = rm ? '' : inp.value.trim();
        if (!rm && !v) { inp.focus(); return toast('Paste the key first.'); }
        kb.disabled = true; try { await call('admin-key', { key: v }); inp.value = ''; toast(rm ? 'Key removed' : 'Key checked and saved'); adminView(); }
        catch (er) { kb.disabled = false; let m = $('.key-err', row); if (!m) { m = document.createElement('p'); m.className = 'key-err'; row.appendChild(m); }
          m.innerHTML = esc(er.message) + (er.fix && er.fix.href ? ` <a href="${esc(er.fix.href)}" target="_blank" rel="noopener">${esc(er.fix.label || 'Open')}</a>` : ''); } return; }
    };
    $('#s-model').onchange = async (e) => { const sel = e.target; sel.disabled = true;
      try { await call('admin-setting', { key: 'model', value: sel.value }); toast('Answers now use ' + sel.options[sel.selectedIndex].text.split(',')[0]); } catch (er) { toast(er.message, 4000); }
      sel.disabled = false; };
    bindWaAdmin(cfg, st);
    if (window.FunnelOS) window.FunnelOS.admin(box, fosHelpers());
  }
  // ---------- WhatsApp ----------
  // Admin: WhatsApp number, webhook details and the cloned voice.
  function waAdmin(cfg, st, dot, ago) {
    const on = !!(cfg.ai.whatsapp && st.wa_phone_id);
    const linked = +(cfg.wa && cfg.wa.linked) || 0;
    const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    const field = (name, label, ph, val, hint, pw) => `<label class="field"><span>${label}</span><input class="input" name="${name}" ${pw ? 'type="password" autocomplete="off"' : 'inputmode="numeric"'} spellcheck="false" placeholder="${esc(ph)}" value="${esc(val || '')}">${hint ? `<small>${hint}</small>` : ''}</label>`;
    const copy = (label, val) => `<div class="field"><span>${label}</span><div class="copy-row"><input class="input" readonly value="${esc(val || '')}" aria-label="${label}"><button class="btn sm" type="button" data-copy="${esc(val || '')}">Copy</button></div></div>`;
    const voiceOn = !!cfg.ai.elevenlabs;
    return `<h3 id="wa">WhatsApp and your voice</h3>
      <div class="setting keys"><div class="l"><b>WhatsApp</b><span>Members text or send a voice note to your WhatsApp Business number and ${esc(COACH)} answers, in text or in the voice you pick. Each member connects their own number from their menu, and only approved members get answers.</span></div><div class="r" style="flex-direction:column;align-items:stretch;gap:14px">
        <span class="status-line">${dot(on)}<b>WhatsApp</b> ${on ? `connected to ${esc(st.wa_name || 'your number')}${st.wa_number ? ' +' + esc(st.wa_number) : ''} · ${linked} member${linked === 1 ? '' : 's'} linked · last message ${ago(cfg.wa && cfg.wa.last_in)}` : 'not connected yet'}</span>
        ${on ? '' : `<ol class="wa-steps">
          <li>Create a Business app in ${ext('https://developers.facebook.com/apps', 'Meta for Developers')} and add WhatsApp to it.</li>
          <li>Add a phone number that is not used in the WhatsApp app, and verify your business in ${ext('https://business.facebook.com/settings/security', 'Business settings')}.</li>
          <li>Under ${ext('https://business.facebook.com/settings/system-users', 'System users')}, create a permanent token with whatsapp_business_messaging and whatsapp_business_management.</li>
          <li>Paste the details below and press Save and check.</li>
          <li>In your app, open WhatsApp, Configuration. Paste the callback URL and verify token from here, then subscribe to messages.</li></ol>`}
        <form id="wa-form" style="display:grid;gap:12px" autocomplete="off">
          ${field('phone_id', 'Phone number ID', '1234567890', st.wa_phone_id, 'WhatsApp, API Setup in your Meta app.')}
          ${field('waba_id', 'WhatsApp Business Account ID', '1234567890', st.wa_waba_id, 'Same page. Lets Funnel OS subscribe to your messages for you.')}
          ${field('token', 'Permanent access token', on ? 'Saved. Paste a new one to replace it.' : 'EAAG...', '', 'Sealed on the server and never shown again.', true)}
          ${field('secret', 'App secret', cfg.ai.whatsapp_secret ? 'Saved, ending ' + cfg.ai.whatsapp_secret : '32 letters and numbers', '', 'App settings, Basic. Proves messages really come from WhatsApp.', true)}
          <div class="keyrow" style="border:0;padding:0"><div class="r"><button class="btn sm primary" type="submit">Save and check</button>${on ? '<button class="btn sm ghost" type="button" data-wa="remove">Disconnect</button>' : ''}</div></div>
        </form>
        ${copy('Callback URL', cfg.wa && cfg.wa.webhook)}
        ${copy('Verify token', cfg.wa && cfg.wa.verify)}
      </div></div>
      <div class="setting keys"><div class="l"><b>Your voice</b><span>Voice notes on WhatsApp are spoken in your cloned voice through ElevenLabs. Without it, members get text replies.</span></div><div class="r" style="flex-direction:column;align-items:stretch;gap:12px">
        <div class="keyrow" data-xi-row><span class="status-line">${dot(voiceOn)}<b>ElevenLabs</b> ${voiceOn ? 'added, ending ' + esc(cfg.ai.elevenlabs) : 'not added yet'}</span><div class="r"><input class="input" type="password" autocomplete="off" spellcheck="false" placeholder="sk_..." aria-label="ElevenLabs API key"><button class="btn sm" data-xi="save">${voiceOn ? 'Replace' : 'Check and save'}</button>${voiceOn ? '<button class="btn sm ghost" data-xi="remove">Remove</button>' : ''}</div></div>
        <span class="muted">Create a key under ${ext('https://elevenlabs.io/app/settings/api-keys', 'API keys')} in ElevenLabs. Clone your voice under ${ext('https://elevenlabs.io/app/voice-lab', 'Voices')} with Instant Voice Clone and one to two minutes of clean audio of you talking.</span>
        ${voiceOn ? `<label class="field" style="margin:0"><span>Voice</span><div class="copy-row"><select class="input" id="s-voice" aria-label="Voice"><option value="">Loading your voices</option></select><button class="btn sm" type="button" data-xi="play">Play a sample</button></div></label>` : ''}
        <label class="field" style="margin:0"><span>When a member sends a voice note</span><select class="input" id="s-wavoice" aria-label="Voice reply style">
          <option value=""${!st.wa_voice ? ' selected' : ''}>Reply with a voice note and the text</option>
          <option value="voice"${st.wa_voice === 'voice' ? ' selected' : ''}>Reply with a voice note only</option>
          <option value="off"${st.wa_voice === 'off' ? ' selected' : ''}>Reply in text only</option></select><small>Members can also ask for a voice note in a text message.</small></label>
      </div></div>`;
  }

  function bindWaAdmin(cfg, st) {
    const box = $('#adm'); if (!box) return;
    const showErr = (at, er) => { let m = $('.key-err', at); if (!m) { m = document.createElement('p'); m.className = 'key-err'; at.appendChild(m); }
      m.innerHTML = esc(er.message) + (er.fix && er.fix.href ? ` <a href="${esc(er.fix.href)}" target="_blank" rel="noopener">${esc(er.fix.label || 'Open')}</a>` : ''); };
    const form = $('#wa-form');
    form.onsubmit = async (e) => { e.preventDefault(); const b = $('[type=submit]', form); b.disabled = true; b.textContent = 'Checking';
      const d = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
      try { const r = await call('admin-wa-save', d); toast(`WhatsApp connected to ${r.name || 'your number'}${r.number ? ' ' + r.number : ''}${r.subscribed === false ? '. Subscribe to messages in WhatsApp, Configuration.' : ''}`, 4200); adminView(); }
      catch (er) { b.disabled = false; b.textContent = 'Save and check'; showErr(form, er); } };
    box.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); toast('Copied'); } catch { c.previousElementSibling.select(); toast('Press Ctrl+C or Cmd+C to copy'); } return; }
      const w = e.target.closest('[data-wa=remove]');
      if (w) { if (!confirm('Disconnect WhatsApp? Members stop getting answers there until you connect it again.')) return; w.disabled = true;
        try { await call('admin-wa-remove'); toast('WhatsApp disconnected'); adminView(); } catch (er) { w.disabled = false; toast(er.message, 4000); } return; }
      const x = e.target.closest('[data-xi]'); if (!x) return;
      if (x.dataset.xi === 'play') { const id = $('#s-voice').value; if (!id) return toast('Pick a voice first.'); x.disabled = true; x.textContent = 'Making a sample';
        try { const { audio } = await call('admin-voice-test', { voice_id: id }); const a = new Audio(audio); a.play().catch(() => toast('Press play again, your browser blocked the sound.')); }
        catch (er) { toast(er.message, 4000); } x.disabled = false; x.textContent = 'Play a sample'; return; }
      const row = x.closest('[data-xi-row]'); const inp = $('input', row); const rm = x.dataset.xi === 'remove'; const v = rm ? '' : inp.value.trim();
      if (!rm && !v) { inp.focus(); return toast('Paste the key first.'); }
      x.disabled = true;
      try { await call('admin-xi-key', { key: v }); toast(rm ? 'ElevenLabs key removed' : 'Key checked and saved. Now pick your voice.'); adminView(); }
      catch (er) { x.disabled = false; showErr(row, er); }
    });
    const save = async (key, value) => call('admin-setting', { key, value });
    $('#s-wavoice').onchange = async (e) => { try { await save('wa_voice', e.target.value); toast('Saved'); } catch (er) { toast(er.message, 4000); } };
    const sel = $('#s-voice'); if (!sel) return;
    call('admin-voices').then(({ voices }) => {
      if (!voices.length) { sel.innerHTML = '<option value="">No voices yet. Clone yours in ElevenLabs first.</option>'; return; }
      const kind = { cloned: 'your clone', professional: 'professional clone', generated: 'designed', premade: 'stock' };
      sel.innerHTML = (st.voice_id ? '' : '<option value="">Pick a voice</option>') + voices.map((v) => `<option value="${esc(v.id)}"${v.id === st.voice_id ? ' selected' : ''}>${esc(v.name)}, ${kind[v.kind] || esc(v.kind)}</option>`).join('');
    }).catch((er) => { sel.innerHTML = '<option value="">Could not load voices</option>'; showErr(sel.closest('.r'), er); });
    sel.onchange = async () => { const o = sel.options[sel.selectedIndex];
      try { await save('voice_id', sel.value); await save('voice_name', sel.value ? o.text.split(',')[0] : ''); toast(sel.value ? 'Voice notes now use ' + o.text.split(',')[0] : 'Voice removed'); } catch (er) { toast(er.message, 4000); } };
  }

  async function waSheet() {
    const el = sheet('WhatsApp', '<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Loading</div>');
    const body = $('.sheet-body', el);
    try { S.wa = await call('wa-me'); }
    catch (e) { body.innerHTML = errBox(e, true); const r = $('[data-retry]', body); if (r) r.onclick = waSheet; return; }
    const w = S.wa; const num = w.number ? '+' + w.number : '';
    const chat = (text) => 'https://wa.me/' + w.number + (text ? '?text=' + encodeURIComponent(text) : '');
    clearInterval(waSheet.poll);
    if (!w.enabled) { body.innerHTML = `<p class="muted" style="margin:0">WhatsApp is not switched on yet. Once it is, you can text ${esc(COACH)} or send it voice notes from your phone.</p>`; return; }
    if (w.demo) { body.innerHTML = `<p class="muted" style="margin:0 0 14px">The demo account cannot connect WhatsApp. Create your own account to chat with ${esc(COACH)} from your phone.</p>`; return; }
    const perks = `<ul class="wa-perks"><li>Text a question and get an answer in a few seconds.</li>${w.voice ? '<li>Send a voice note and get a voice note back.</li>' : '<li>Send a voice note and get the answer as text.</li>'}<li>Your WhatsApp chats show up here under Recent, so you can pick them up on the site.</li></ul>`;
    if (w.linked) {
      body.innerHTML = `<div class="wa-linked"><span class="dot ok"></span><div><b>Connected to ${esc(w.linked)}</b><span>Message ${esc(w.name || COACH)} at ${esc(num)} any time.</span></div></div>${perks}
        <div class="btns" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><a class="btn primary" href="${esc(chat())}" target="_blank" rel="noopener">${ic('chat')}Open the chat</a><button class="btn ghost" data-unlink>Disconnect this number</button></div>`;
      $('[data-unlink]', body).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { await call('wa-unlink'); toast('Disconnected. That number can no longer reach your account.'); waSheet(); } catch (er) { b.disabled = false; toast(er.message, 4000); } };
      return;
    }
    body.innerHTML = `<p class="muted" style="margin:0 0 14px">Chat with ${esc(COACH)} from your phone. Connect your number once with a code.</p>${perks}
      <ol class="wa-steps"><li><b>Get your code.</b> It works once and lasts 30 minutes.</li><li><b>Send it on WhatsApp.</b> The button opens a chat with the code typed in. Press send.</li><li><b>Ask anything.</b> You will get a reply that you are connected.</li></ol>
      <div id="wa-code"><button class="btn primary" data-code>Get my code</button></div>`;
    const showCode = async (b) => {
      if (b) b.disabled = true;
      try {
        const { code } = await call('wa-code');
        $('#wa-code').innerHTML = `<div class="wa-code" aria-label="Your code">${esc(code.slice(0, 3))} ${esc(code.slice(3))}</div>
          <div class="btns" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="${esc(chat('Connect ' + code))}" target="_blank" rel="noopener">${ic('chat')}Send it on WhatsApp</a><button class="btn ghost" data-code>New code</button></div>
          <p class="muted" style="margin:12px 0 0;font-size:13px">On a computer? Text <b>Connect ${esc(code)}</b> to ${esc(num)} from your phone. This page updates once you are connected.</p>`;
        $('[data-code]', body).onclick = (e) => showCode(e.currentTarget);
        let n = 0; clearInterval(waSheet.poll);
        waSheet.poll = setInterval(async () => { if (!document.body.contains(body) || ++n > 450) return clearInterval(waSheet.poll); try { const x = await call('wa-me'); if (x.linked) { clearInterval(waSheet.poll); S.wa = x; toast('WhatsApp connected'); waSheet(); } } catch { /* try again */ } }, 4000);
      } catch (er) { if (b) b.disabled = false; $('#wa-code').insertAdjacentHTML('beforeend', errBox(er)); }
    };
    $('[data-code]', body).onclick = (e) => showCode(e.currentTarget);
  }

  function resetSheet(m, url) {
    const el = sheet('Password link for ' + (m.name || m.email), `<p class="muted" style="margin:0 0 12px">Send this link to ${esc(m.email)}. It lets them choose a new password once and stops working after 7 days.</p>
      <div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="Password link"><button class="btn sm primary" data-copy>${ic('copy')}Copy</button></div>`);
    $('[data-copy]', el).onclick = async () => { try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { $('input', el).select(); toast('Select the link and copy it'); } };
  }
  // ---------- start ----------
  window.addEventListener('hashchange', onRoute);
  if (auth && auth.auth.onAuthStateChange) auth.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && S.me) { S.me = null; authScreen('signin'); } });
  boot();
})();
