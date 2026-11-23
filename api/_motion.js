// The motion kit every Funnel OS page loads as /fos-motion.js. No dependencies, about 4 KB.
// Pages stay fully visible without JavaScript: elements only hide after this script adds the fos-js class.
// Quick, natural motion. Nothing floaty, no scroll hijacking, and prefers-reduced-motion turns it all off.
module.exports = String.raw`/* Funnel OS motion kit */
(function () {
  var d = document, root = d.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = [
    'html.fos-js [data-reveal]{opacity:0;transition:opacity .6s cubic-bezier(.2,.7,.2,1),transform .6s cubic-bezier(.2,.7,.2,1),clip-path .7s cubic-bezier(.2,.7,.2,1),filter .6s ease;will-change:opacity,transform}',
    'html.fos-js [data-reveal="up"]{transform:translateY(22px)}',
    'html.fos-js [data-reveal="down"]{transform:translateY(-18px)}',
    'html.fos-js [data-reveal="left"]{transform:translateX(-28px)}',
    'html.fos-js [data-reveal="right"]{transform:translateX(28px)}',
    'html.fos-js [data-reveal="scale"]{transform:scale(.96)}',
    'html.fos-js [data-reveal="blur"]{filter:blur(8px)}',
    'html.fos-js [data-reveal="mask"]{clip-path:inset(0 0 100% 0);opacity:1}',
    'html.fos-js [data-reveal].is-in{opacity:1;transform:none;filter:none;clip-path:inset(0 0 0 0)}',
    'html.fos-js [data-split] .fos-w{display:inline-block;overflow:hidden;vertical-align:top}',
    'html.fos-js [data-split] .fos-w>span{display:inline-block;transform:translateY(105%);transition:transform .7s cubic-bezier(.2,.7,.2,1)}',
    'html.fos-js [data-split].is-in .fos-w>span{transform:none}',
    '.fos-progress{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);z-index:9999;background:var(--accent,currentColor);pointer-events:none}',
    '[data-marquee]{overflow:hidden;white-space:nowrap}',
    '[data-marquee]>.fos-track{display:inline-flex;gap:inherit;animation:fos-marq var(--marquee-speed,32s) linear infinite}',
    '[data-marquee]:hover>.fos-track{animation-play-state:paused}',
    '@keyframes fos-marq{to{transform:translateX(-50%)}}',
    '[data-tilt]{transition:transform .25s ease;transform-style:preserve-3d}',
    'html.fos-js [data-draw] path,html.fos-js [data-draw] line,html.fos-js [data-draw] polyline,html.fos-js [data-draw] circle{stroke-dasharray:var(--len,1000);stroke-dashoffset:var(--len,1000);transition:stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)}',
    'html.fos-js [data-draw].is-in path,html.fos-js [data-draw].is-in line,html.fos-js [data-draw].is-in polyline,html.fos-js [data-draw].is-in circle{stroke-dashoffset:0}',
    'html.fos-js [data-bar]{transform:scaleY(0);transform-origin:50% 100%;transition:transform .9s cubic-bezier(.2,.7,.2,1)}',
    'html.fos-js [data-bar-x]{transform:scaleX(0);transform-origin:0 50%;transition:transform .9s cubic-bezier(.2,.7,.2,1)}',
    'html.fos-js .is-in [data-bar],html.fos-js .is-in [data-bar-x],html.fos-js [data-bar].is-in,html.fos-js [data-bar-x].is-in{transform:none}',
    '[data-sticky-steps] [data-step]{opacity:.35;transition:opacity .35s ease}',
    '[data-sticky-steps] [data-step].is-active{opacity:1}',
    '@media (prefers-reduced-motion: reduce){html.fos-js [data-reveal],html.fos-js [data-split] .fos-w>span,html.fos-js [data-bar],html.fos-js [data-bar-x]{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;transition:none!important}[data-marquee]>.fos-track{animation:none}}'
  ].join('');
  var st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);
  if (!still) root.classList.add('fos-js');

  function ready(fn) { if (d.readyState !== 'loading') fn(); else d.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    // Split headline words so they rise in one by one.
    [].forEach.call(d.querySelectorAll('[data-split]'), function (el) {
      if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
      var i = 0;
      (function walk(node) {
        [].slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = d.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (w) {
              if (!w) return;
              if (/^\s+$/.test(w)) { frag.appendChild(d.createTextNode(w)); return; }
              var o = d.createElement('span'); o.className = 'fos-w'; var s = d.createElement('span'); s.textContent = w;
              s.style.transitionDelay = (i++ * 45) + 'ms'; o.appendChild(s); frag.appendChild(o);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && !/^(svg|img|br)$/i.test(n.tagName)) walk(n);
        });
      })(el);
    });
    // Stagger: children of [data-stagger] reveal one after another.
    [].forEach.call(d.querySelectorAll('[data-stagger]'), function (g) {
      var step = +g.dataset.stagger || 80;
      [].forEach.call(g.children, function (c, i) { if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', g.dataset.staggerType || 'up'); c.style.transitionDelay = (i * step) + 'ms'; });
    });
    [].forEach.call(d.querySelectorAll('[data-draw]'), function (svg) {
      [].forEach.call(svg.querySelectorAll('path,line,polyline,circle'), function (p) { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) {} });
    });
    [].forEach.call(d.querySelectorAll('[data-marquee]'), function (m) {
      if (m.querySelector('.fos-track')) return;
      var t = d.createElement('div'); t.className = 'fos-track'; while (m.firstChild) t.appendChild(m.firstChild);
      t.innerHTML += t.innerHTML; m.appendChild(t);
    });

    var watch = '[data-reveal],[data-split],[data-draw],[data-count],[data-bar],[data-bar-x],[data-chart]';
    function count(el) {
      if (el.dataset.counted) return; el.dataset.counted = '1';
      var to = parseFloat(el.dataset.count), dec = (String(el.dataset.count).split('.')[1] || '').length;
      var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      if (isNaN(to)) return;
      if (still) { el.textContent = pre + to.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; return; }
      var t0 = null, dur = +el.dataset.duration || 1400;
      function f(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + (to * k).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(f); }
      requestAnimationFrame(f);
    }
    function show(el) { el.classList.add('is-in'); if (el.hasAttribute('data-count')) count(el); [].forEach.call(el.querySelectorAll('[data-count]'), count); }
    var els = d.querySelectorAll(watch);
    if (still || !('IntersectionObserver' in window)) { [].forEach.call(els, show); }
    else {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      [].forEach.call(els, function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) requestAnimationFrame(function () { show(el); }); else io.observe(el); });
    }

    // Scroll progress bar, parallax and sticky step highlights share one passive scroll listener.
    var bar = null; if (d.querySelector('[data-progress]') || root.hasAttribute('data-progress')) { bar = d.createElement('div'); bar.className = 'fos-progress'; d.body.appendChild(bar); }
    var par = still ? [] : [].slice.call(d.querySelectorAll('[data-parallax]'));
    var steps = [].slice.call(d.querySelectorAll('[data-sticky-steps] [data-step]'));
    var nav = d.querySelector('[data-nav-shrink]');
    var ticking = false;
    function frame() {
      ticking = false; var y = scrollY, h = innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / Math.max(1, d.documentElement.scrollHeight - h)) + ')';
      par.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > h) return; var k = parseFloat(el.dataset.parallax) || 0.12; el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - h / 2) * -k).toFixed(1) + 'px,0)'; });
      if (steps.length) { var best = null, bd = 1e9; steps.forEach(function (s) { var r = s.getBoundingClientRect(); var dd = Math.abs(r.top + r.height / 2 - h * 0.45); if (dd < bd) { bd = dd; best = s; } }); steps.forEach(function (s) { s.classList.toggle('is-active', s === best); }); }
      if (nav) nav.classList.toggle('is-scrolled', y > 24);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();

    // Gentle tilt on cards that ask for it, desktop pointers only.
    if (!still && window.matchMedia('(hover: hover)').matches) {
      [].forEach.call(d.querySelectorAll('[data-tilt]'), function (c) {
        c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; c.style.transform = 'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg)'; });
        c.addEventListener('pointerleave', function () { c.style.transform = ''; });
      });
    }
    // FAQ accordions built with details elements close the others in the same group.
    [].forEach.call(d.querySelectorAll('[data-accordion]'), function (g) {
      g.addEventListener('toggle', function (e) { if (!e.target.open) return; [].forEach.call(g.querySelectorAll('details[open]'), function (x) { if (x !== e.target) x.open = false; }); }, true);
    });
    // Forms and checkout are connected by the owner later. Until then, a click explains that instead of failing silently.
    [].forEach.call(d.querySelectorAll('form[data-fos-form]'), function (f) {
      f.addEventListener('submit', function (e) { if (f.getAttribute('action') && f.getAttribute('action') !== '#') return; e.preventDefault(); var n = f.querySelector('[data-fos-note]'); if (n) { n.hidden = false; n.textContent = n.textContent || 'This form is a preview. It goes live once the form is connected.'; } });
    });
  });
})();
`;
