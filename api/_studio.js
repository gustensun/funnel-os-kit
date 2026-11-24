// Funnel OS to HighLevel AI Studio. An approved funnel becomes real pages in the TanStack Start project that
// AI Studio keeps in sync with GitHub, so the owner can keep editing it in AI Studio. AI Studio pulls the commit itself.
// An empty repository gets the plain HTML site instead.
'use strict';
const crypto = require('crypto');
const { parse } = require('node-html-parser');
const he = require('he');
const { bad, clip, rpc } = require('./_lib');
const F = require('./_fos');
let BABEL = null; const babel = () => BABEL || (BABEL = require('@babel/parser'));

const GIT_SYNC_HELP = 'https://help.gohighlevel.com/support/solutions/articles/155000009214-how-to-use-git-sync-in-ai-studio';
const TOKEN_RE = /^(gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255})$/;

/* ---------- repository link ---------- */
function repoOf(input) {
  let s = String(input || '').trim().replace(/^git@github\.com:/i, '').replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  const m = s.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/);
  if (!m || m[2] === '.' || m[2] === '..') throw bad('Paste the GitHub repository link, like https://github.com/your-name/your-project. In AI Studio it is under Git Sync.', 400, { label: 'How Git Sync works', href: GIT_SYNC_HELP });
  return m[1] + '/' + m[2];
}
// A fine-grained token page with the name, the owner and Contents write filled in. Used once, never stored.
function tokenLink(owner) {
  const q = new URLSearchParams({ name: 'Funnel OS push', description: 'Pushes an approved funnel to the AI Studio repository', expires_in: '7', contents: 'write' });
  if (owner) q.set('target_name', owner);
  return 'https://github.com/settings/personal-access-tokens/new?' + q.toString();
}

/* ---------- HTML to JSX ---------- */
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
// Block-level tags: whitespace between two of them, or at the start or end of one, never shows.
const BLOCKS = new Set('address article aside blockquote body details dialog dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr li main nav ol p pre section table ul summary menu search caption thead tbody tfoot tr td th colgroup col optgroup option legend br html head'.split(' '));
// Parents where text nodes made of whitespace mean nothing, and React warns about them.
const NO_TEXT = new Set('table thead tbody tfoot tr colgroup select optgroup datalist picture video audio ul ol dl menu head html'.split(' '));
const SVG_TEXT = new Set(['text', 'tspan', 'textpath', 'title', 'desc']);
const SVG_TAG = Object.fromEntries('altGlyph altGlyphDef altGlyphItem animateColor animateMotion animateTransform clipPath feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence foreignObject glyphRef linearGradient radialGradient textPath'.split(' ').map((t) => [t.toLowerCase(), t]));
const ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength', srcset: 'srcSet', autoplay: 'autoPlay', playsinline: 'playsInline', crossorigin: 'crossOrigin', autocomplete: 'autoComplete', autofocus: 'autoFocus', autocapitalize: 'autoCapitalize', autocorrect: 'autoCorrect', contenteditable: 'contentEditable', spellcheck: 'spellCheck', colspan: 'colSpan', rowspan: 'rowSpan', enctype: 'encType', novalidate: 'noValidate', allowfullscreen: 'allowFullScreen', referrerpolicy: 'referrerPolicy', datetime: 'dateTime', hreflang: 'hrefLang', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', fetchpriority: 'fetchPriority', frameborder: 'frameBorder', cellpadding: 'cellPadding', cellspacing: 'cellSpacing', charset: 'charSet', 'http-equiv': 'httpEquiv', 'accept-charset': 'acceptCharset', accesskey: 'accessKey', formaction: 'formAction', formenctype: 'formEncType', formmethod: 'formMethod', formnovalidate: 'formNoValidate', formtarget: 'formTarget', usemap: 'useMap', itemprop: 'itemProp', itemscope: 'itemScope', itemtype: 'itemType', itemid: 'itemID', itemref: 'itemRef', popovertarget: 'popoverTarget', popovertargetaction: 'popoverTargetAction', srcdoc: 'srcDoc', srclang: 'srcLang', imagesrcset: 'imageSrcSet', imagesizes: 'imageSizes', controlslist: 'controlsList', nomodule: 'noModule', marginwidth: 'marginWidth', marginheight: 'marginHeight', disablepictureinpicture: 'disablePictureInPicture', disableremoteplayback: 'disableRemotePlayback', 'xlink:actuate': 'xlinkActuate', 'xlink:arcrole': 'xlinkArcrole', 'xlink:role': 'xlinkRole', 'xlink:show': 'xlinkShow', 'xlink:title': 'xlinkTitle', 'xlink:type': 'xlinkType', 'xml:base': 'xmlBase', 'xml:lang': 'xmlLang', 'xml:space': 'xmlSpace', 'xmlns:xlink': 'xmlnsXlink' };
// SVG attributes written in lowercase or with hyphens, in the spelling React expects.
'attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan'.split(' ').forEach((a) => { ATTR[a.toLowerCase()] = a; });
'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering transform-origin underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode x-height'.split(' ').forEach((a) => { ATTR[a] = a.replace(/-([a-z])/g, (m, c) => c.toUpperCase()); });
const BOOL = new Set(['allowFullScreen', 'async', 'autoFocus', 'autoPlay', 'controls', 'default', 'defer', 'disabled', 'formNoValidate', 'hidden', 'inert', 'itemScope', 'loop', 'multiple', 'muted', 'noModule', 'noValidate', 'open', 'playsInline', 'readOnly', 'required', 'reversed', 'disablePictureInPicture', 'disableRemotePlayback']);
const NUM = new Set(['tabIndex', 'colSpan', 'rowSpan', 'maxLength', 'minLength', 'rows', 'cols', 'size', 'span', 'start']);
// Names React and its types know as they are. Anything else without a hyphen goes in through a spread, so the types stay clean.
const KNOWN = new Set(('abbr accept action allow alt as capture challenge cite color content coords data dir download draggable form headers height high href icon id integrity is kind label lang list low manifest max media method min name nonce optimum pattern placeholder poster preload property radiogroup rel role sandbox scope scrolling seamless shape sizes slot src step style summary target title translate type value width wmode wrap about datatype inlist prefix resource rev typeof vocab popover loading decoding ' +
  'clip cursor cx cy d direction display divisor dur dx dy elevation end exponent fill filter format from fr fx fy g1 g2 hanging ideographic in in2 intercept k k1 k2 k3 k4 kerning local mask mathematical mode offset opacity operator order orient orientation origin overflow points r radius result restart rotate rx ry scale seed slope spacing speed stemh stemv string stroke to transform u1 u2 unicode values version visibility widths x x1 x2 y y1 y2 z xmlns focusable').split(' '));
const EVENTS = {};
'Click DoubleClick:dblclick MouseDown MouseUp MouseOver MouseOut MouseEnter MouseLeave MouseMove ContextMenu KeyDown KeyUp KeyPress Focus Blur Focus:focusin Blur:focusout Change Input Submit Reset Invalid Scroll Wheel Load Error Toggle Play Pause Ended TimeUpdate LoadedData LoadedMetadata CanPlay VolumeChange TouchStart TouchEnd TouchMove TouchCancel PointerDown PointerUp PointerMove PointerEnter PointerLeave PointerOver PointerOut PointerCancel DragStart Drag DragEnd DragEnter DragLeave DragOver Drop Copy Cut Paste Select AnimationStart AnimationEnd AnimationIteration TransitionEnd BeforeInput CompositionStart CompositionEnd CompositionUpdate Abort'
  .split(' ').forEach((x) => { const [r, n] = x.split(':'); EVENTS['on' + (n || r.toLowerCase())] = 'on' + r; });

const J = (v) => JSON.stringify(v);
const jsxText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;').replace(/\u00a0/g, '&nbsp;');
const attrStr = (v) => (/["\\\n\r\t&]|[\u0000-\u001f]/.test(v) ? `{${J(v)}}` : `"${v}"`);
const handler = (code) => `{(event) => { if (new Function("event", ${J(code)}).call(event.currentTarget, event) === false) event.preventDefault(); }}`;

// node-html-parser tree to a small tree of our own: { t: 'el', tag, attrs: [[name, value|null]], kids } and { t: 'text', v }.
function vtree(node) {
  const out = [];
  for (const c of node.childNodes || []) {
    if (c.nodeType === 3) { const prev = out[out.length - 1]; const v = he.decode(c.rawText || ''); if (prev && prev.t === 'text') prev.v += v; else out.push({ t: 'text', v }); continue; }
    if (c.nodeType !== 1 || !c.rawTagName) continue;
    const tag = c.rawTagName; const lc = tag.toLowerCase();
    const attrs = Object.entries(c.rawAttributes || {}).map(([k, v]) => [k, v == null ? null : he.decode(String(v), { isAttributeValue: true })]);
    if (lc === 'script' || lc === 'style') out.push({ t: 'el', tag: lc, attrs, text: (c.childNodes || []).map((x) => x.rawText || '').join('') });
    else if (lc === 'textarea') out.push({ t: 'el', tag: lc, attrs, text: he.decode((c.childNodes || []).map((x) => x.rawText || '').join('')) });
    else if (lc === 'template') out.push({ t: 'el', tag: lc, attrs, html: c.innerHTML });
    else out.push({ t: 'el', tag, attrs, kids: vtree(c) });
  }
  return out;
}
const lcOf = (n) => (n && n.t === 'el' ? n.tag.toLowerCase() : '');
const textOf = (n) => (n.t === 'text' ? n.v : (n.kids || []).map(textOf).join(''));

function styleObj(css) {
  const parts = []; let cur = ''; let depth = 0; let q = '';
  for (const ch of String(css).replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (q) { cur += ch; if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && !depth) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  const m = new Map();
  for (const d of parts) {
    const i = d.indexOf(':'); if (i < 1) continue;
    const raw = d.slice(0, i).trim(); const val = d.slice(i + 1).trim().replace(/\s*!important\s*$/i, '');
    if (!val || !/^-{0,2}[a-zA-Z][a-zA-Z0-9-]*$/.test(raw)) continue;
    let key;
    if (raw.startsWith('--')) key = J(raw);
    else {
      const p = raw.toLowerCase();
      key = (p.startsWith('-ms-') ? p.slice(1) : p.replace(/^-/, '')).replace(/-([a-z])/g, (x, c) => c.toUpperCase());
      if (/^-(webkit|moz|o)-/.test(p)) key = key[0].toUpperCase() + key.slice(1);
    }
    m.delete(key); m.set(key, J(val));
  }
  return [...m].map(([k, v]) => `${k}: ${v}`);
}

// Attributes of one element, as JSX.
function attrsJsx(n, lc, ctx) {
  const out = []; const spread = []; let click = null; let jsHref = null;
  const type = String((n.attrs.find(([k]) => k.toLowerCase() === 'type') || [])[1] || '').toLowerCase();
  for (const [name, val] of n.attrs) {
    const ln = name.toLowerCase();
    if (!/^[a-zA-Z_][-a-zA-Z0-9_:]*$/.test(name)) continue;
    if (ln.includes(':') && !ATTR[ln] && ln !== 'xlink:href') continue;
    const v = val == null ? '' : val;
    if (ln === 'style') { const s = styleObj(v); if (s.length) { ctx.st.styled = true; out.push(`style={{ ${s.join(', ')} } as CSSProperties}`); } continue; }
    if (/^on[a-z]+$/.test(ln)) { const ev = EVENTS[ln]; if (!ev || !v.trim()) continue; if (ev === 'onClick') click = v; else out.push(`${ev}=${handler(v)}`); continue; }
    if ((ln === 'href' || ln === 'xlink:href') && /^\s*javascript:/i.test(v)) { let code = v.replace(/^\s*javascript:/i, ''); try { code = decodeURIComponent(code); } catch { /* keep it as written */ } jsHref = code; out.push('href="#"'); continue; }
    if (ln === 'xlink:href') { if (!n.attrs.some(([k]) => k.toLowerCase() === 'href')) out.push(`href=${attrStr(v)}`); continue; }
    if (ln === 'selected' && lc === 'option') continue;
    if (ln === 'value' && lc === 'textarea') continue;
    if (ln === 'checked' && lc === 'input') { out.push('defaultChecked'); continue; }
    if (ln === 'value' && lc === 'input' && !/^(button|checkbox|image|hidden|radio|reset|submit)$/.test(type)) { out.push(`defaultValue=${attrStr(v)}`); continue; }
    if (ln.startsWith('data-') || ln.startsWith('aria-')) { out.push(`${ln}=${attrStr(v)}`); continue; }
    const key = ATTR[ln] || (ATTR[name] ? ATTR[name] : null) || (ln.includes('-') ? ln : ctx.svg && /[A-Z]/.test(name) ? name : ln);
    if (key === 'className') { const c = v.replace(/\s+/g, ' ').trim(); if (c) out.push(`className=${attrStr(c)}`); continue; }
    if (BOOL.has(key)) { out.push(key); continue; }
    if (NUM.has(key) && /^-?\d+$/.test(v.trim())) { out.push(`${key}={${+v.trim()}}`); continue; }
    if (key === 'contentEditable' && !v) { out.push('contentEditable="true"'); continue; }
    if (!ATTR[ln] && !key.includes('-') && !KNOWN.has(key) && !(ctx.svg && /[A-Z]/.test(key))) { spread.push(`${J(key)}: ${J(v)}`); continue; }
    out.push(`${key}=${attrStr(v)}`);
  }
  if (click != null || jsHref != null) {
    const parts = [];
    if (click != null) parts.push(`if (new Function("event", ${J(click)}).call(event.currentTarget, event) === false) event.preventDefault();`);
    if (jsHref != null) { parts.push('event.preventDefault();'); if (!/^\s*(void\s*\(?\s*0\s*\)?\s*;?|;|)\s*$/.test(jsHref)) parts.push(`new Function("event", ${J(jsHref)}).call(event.currentTarget, event);`); }
    out.push(`onClick={(event) => { ${parts.join(' ')} }}`);
  }
  if (spread.length) out.push(`{...{ ${spread.join(', ')} }}`);
  return out;
}

// One element as JSX. depth is the indent level.
function el(n, ctx, depth) {
  const lc = n.tag.toLowerCase();
  const svg = ctx.svg || lc === 'svg';
  const tag = svg ? (SVG_TAG[lc] || (lc === 'svg' ? 'svg' : n.tag)) : lc;
  const c2 = { ...ctx, svg: svg && lc !== 'foreignobject', pre: ctx.pre || lc === 'pre' };
  const a = attrsJsx(n, lc, { ...ctx, svg });
  if (lc === 'textarea') { const t = String(n.text || '').replace(/^\n/, ''); if (t) a.push(`defaultValue={${J(t)}}`); }
  if (lc === 'template') a.push(`dangerouslySetInnerHTML={{ __html: ${J(n.html || '')} }}`);
  let kids = n.kids || [];
  if (lc === 'select') {
    const sel = []; const walk = (list) => list.forEach((k) => { if (lcOf(k) === 'option' && k.attrs.some(([x]) => x.toLowerCase() === 'selected')) { const vv = k.attrs.find(([x]) => x.toLowerCase() === 'value'); sel.push(vv ? (vv[1] == null ? '' : vv[1]) : textOf(k).replace(/\s+/g, ' ').trim()); } else if (lcOf(k) === 'optgroup') walk(k.kids || []); });
    walk(kids);
    const multi = n.attrs.some(([x]) => x.toLowerCase() === 'multiple');
    if (sel.length) a.push(`defaultValue={${J(multi ? sel : sel[sel.length - 1])}}`);
  }
  if (lc === 'table') {
    const out = []; let run = null;
    for (const k of kids) {
      if (lcOf(k) === 'tr') { if (!run) { run = { t: 'el', tag: 'tbody', attrs: [], kids: [] }; out.push(run); } run.kids.push(k); continue; }
      if (k.t === 'text' && !k.v.trim() && run) continue;
      run = null; out.push(k);
    }
    kids = out;
  }
  if (c2.pre && lc === 'pre' && kids[0] && kids[0].t === 'text') kids = [{ t: 'text', v: kids[0].v.replace(/^\r?\n/, '') }, ...kids.slice(1)];
  const open = `<${tag}${a.length ? ' ' + a.join(' ') : ''}`;
  if (VOID.has(lc) || lc === 'textarea' || lc === 'template') return open + ' />';
  const inner = children(kids, lc, c2, depth);
  return inner == null ? open + ' />' : open + '>' + inner + `</${tag}>`;
}

// Children: inline on one line when there is text, one per line when there are only elements.
function children(list, parentLc, ctx, depth) {
  const nodes = list.filter((k) => !(k.t === 'el' && dropped(k, ctx)));
  // Merge text that sat around a dropped node.
  const merged = []; nodes.forEach((k) => { const p = merged[merged.length - 1]; if (k.t === 'text' && p && p.t === 'text') merged[merged.length - 1] = { t: 'text', v: p.v + k.v }; else merged.push(k); });
  const toks = [];
  merged.forEach((k, i) => {
    if (k.t === 'text') {
      if (ctx.pre) { if (k.v) toks.push({ k: 'raw', s: `{${J(k.v)}}` }); return; }
      const s = k.v.replace(/[ \t\n\r\f]+/g, ' ');
      if (!s) return;
      if (s === ' ') {
        if (NO_TEXT.has(parentLc) || (ctx.svg && !SVG_TEXT.has(parentLc))) return;
        const prev = merged[i - 1]; const next = merged[i + 1];
        if ((!prev || !next) && (BLOCKS.has(parentLc) || !parentLc)) return;
        // A space next to a block element starts or ends a line, where the browser drops it anyway.
        if (BLOCKS.has(lcOf(prev)) || BLOCKS.has(lcOf(next))) return;
        toks.push({ k: 'space' }); return;
      }
      if (NO_TEXT.has(parentLc) && !s.trim()) return;
      toks.push({ k: 'text', s });
      return;
    }
    toks.push({ k: 'el', s: k.special ? k.special : el(k, ctx, depth + 1) });
  });
  if (!toks.length) return null;
  if (ctx.pre || toks.some((t) => t.k === 'text' || t.k === 'raw')) {
    return toks.map((t) => (t.k === 'text' ? jsxText(t.s) : t.k === 'space' ? ' ' : t.s)).join('');
  }
  const pad = '  '.repeat(depth + 1);
  return '\n' + toks.map((t) => pad + (t.k === 'space' ? '{" "}' : t.s)).join('\n') + '\n' + '  '.repeat(depth);
}

// Nodes that do not render in the page body: they go to the CSS file, the script list, or nowhere.
function dropped(k, ctx) {
  const lc = lcOf(k);
  if (lc === 'script') {
    const type = String((k.attrs.find(([x]) => x.toLowerCase() === 'type') || [])[1] || '').toLowerCase().trim();
    if (type === 'application/ld+json') { k.special = `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${J(k.text || '')} }} />`; return false; }
    if (type && !/^(text\/javascript|application\/javascript|module|text\/ecmascript)$/.test(type)) return true;
    const src = (k.attrs.find(([x]) => x.toLowerCase() === 'src') || [])[1];
    if (src) ctx.st.scripts.push({ src, ...(type === 'module' ? { module: true } : {}) });
    else if ((k.text || '').trim()) ctx.st.scripts.push({ code: k.text, ...(type === 'module' ? { module: true } : {}) });
    return true;
  }
  if (lc === 'style') { ctx.st.css.push(k.text || ''); return true; }
  if (lc === 'noscript' || lc === 'link' || lc === 'meta' || lc === 'base') return true;
  if (lc === 'title' && !ctx.svg) return true;
  return false;
}

/* ---------- CSS: selectors for html and body still match when the page lives inside the app ---------- */
function splitTop(s, sep) {
  const out = []; let cur = ''; let depth = 0; let q = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === '\\') { cur += s[++i] || ''; } else if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === sep && !depth) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
function rewriteSelector(sel) {
  // Compounds and the combinators between them, at the top level only.
  const parts = []; let cur = ''; let comb = ''; let depth = 0; let q = '';
  const s = sel.trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === '\\') cur += s[++i] || ''; else if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '\\') { cur += ch + (s[++i] || ''); continue; }
    if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (!depth && /[\s>+~]/.test(ch)) {
      if (cur) { parts.push({ c: cur, comb: '' }); cur = ''; }
      comb += ch; continue;
    }
    if (comb) { if (parts.length) parts[parts.length - 1].comb = comb.trim() || ' '; comb = ''; }
    cur += ch;
  }
  if (cur) parts.push({ c: cur, comb: '' });
  if (!parts.some((p) => /^(body|html|:root)\b/i.test(p.c))) return sel;
  let out = '';
  parts.forEach((p, i) => {
    let c = p.c; let comb = p.comb;
    const m = c.match(/^(body|html|:root)((?:\.[A-Za-z0-9_-]+|\[[^\]]+\])+)$/i);
    const tag = (c.match(/^(body|html|:root)/i) || [])[1];
    if (m) c = m[1].toLowerCase() === 'body' ? `:is(${c}, body:where(:has(.fos-root${m[2]})))` : `:is(${c}, html:where(:has(.fos-root${m[2]})))`;
    if (tag && tag.toLowerCase() === 'body' && comb === '>' && /^(body)((?:\.[A-Za-z0-9_-]+|\[[^\]]+\])*)$/i.test(p.c)) comb = ' :where(.fos-root) >';
    out += c + (i < parts.length - 1 ? (comb === ' ' ? ' ' : ` ${comb.trim()} `) : '');
  });
  return out;
}
const GROUP_AT = /^@(-[a-z]+-)?(media|supports|layer|container|document|scope|starting-style)\b/i;
// Rewrites style rule selectors, also inside @media and friends. Leaves @keyframes, @font-face and the rest alone.
function rewriteCss(css) {
  const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const imports = [];
  function list(s) {
    let out = ''; let i = 0;
    while (i < s.length) {
      // Read a prelude up to { or ; at depth zero.
      let j = i; let q = ''; let depth = 0;
      while (j < s.length) {
        const ch = s[j];
        if (q) { if (ch === '\\') j++; else if (ch === q) q = ''; j++; continue; }
        if (ch === '"' || ch === "'") { q = ch; j++; continue; }
        if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--;
        if (!depth && (ch === '{' || ch === ';' || ch === '}')) break;
        j++;
      }
      const prelude = s.slice(i, j).trim();
      if (j >= s.length) { if (prelude) out += prelude; break; }
      if (s[j] === ';' || s[j] === '}') {
        if (/^@import\b/i.test(prelude)) imports.push(prelude + ';');
        else if (prelude && !/^@charset\b/i.test(prelude)) out += prelude + ';\n';
        i = j + 1; continue;
      }
      // Find the matching close brace.
      let k = j + 1; let d = 1; q = '';
      while (k < s.length && d) {
        const ch = s[k];
        if (q) { if (ch === '\\') k++; else if (ch === q) q = ''; k++; continue; }
        if (ch === '"' || ch === "'") { q = ch; k++; continue; }
        if (ch === '{') d++; else if (ch === '}') d--;
        k++;
      }
      const body = s.slice(j + 1, k - 1);
      if (prelude.startsWith('@')) out += GROUP_AT.test(prelude) ? `${prelude} {\n${list(body)}}\n` : `${prelude} {${body}}\n`;
      else out += splitTop(prelude, ',').map((x) => rewriteSelector(x)).join(', ') + ` {${body}}\n`;
      i = k;
    }
    return out;
  }
  const rules = list(src);
  return { imports, rules };
}

// Undoes the app's global base styles (Tailwind preflight and the like) inside the page, so it looks like it did on its own.
// Images, SVG and tables keep their size and color attributes, so they only get the properties the base styles change.
const RESET = `/* Funnel OS: this page brings its own styles. These first rules undo the app's global base styles for it. */
:where(html, body) { all: revert; }
:where(.fos-root *:not(img, picture, video, audio, canvas, iframe, embed, object, svg, svg *, table, caption, colgroup, col, thead, tbody, tfoot, tr, th, td)),
:where(.fos-root *)::before, :where(.fos-root *)::after, :where(.fos-root *)::placeholder, :where(.fos-root *)::marker, :where(.fos-root *)::file-selector-button, :where(.fos-root *)::backdrop { all: revert; }
:where(.fos-root) :where(img, picture, video, audio, canvas, iframe, embed, object, svg, table, caption, colgroup, col, thead, tbody, tfoot, tr, th, td) { box-sizing: revert; margin: revert; padding: revert; border-style: revert; border-width: revert; border-color: revert; outline: revert; }
:where(.fos-root) :where(img, video, canvas, iframe, embed, object, svg, audio) { display: revert; vertical-align: revert; max-width: revert; }
:where(.fos-root) :where(table) { text-indent: revert; border-collapse: revert; }
@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
  .fos-root.fos-pre :is([data-reveal], [data-split], [data-stagger] > *) { opacity: 0; animation: fos-show 0s 3s forwards; }
}
@keyframes fos-show { to { opacity: 1; } }
/* The page's own styles. */
`;

const pascal = (s) => { const w = String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(''); return /^[A-Z]/.test(w) ? (/Page$/.test(w) ? w : w + 'Page') : 'FunnelPage'; };
const routeOf = (p) => (p === 'index' ? '/' : '/' + p);
const sha8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

// One built page (placeholders already resolved) to a TanStack Start route file and its CSS.
function pageToRoute(html, { path, name, ogBase }) {
  const root = parse(String(html), { comment: false, blockTextElements: { script: true, style: true, textarea: true, noscript: true } });
  const htmlEl = root.querySelector('html'); const head = root.querySelector('head'); const body = root.querySelector('body');
  const st = { scripts: [], css: [], styled: false }; const ctx = { st, svg: false, pre: false };
  const attrMap = (e) => { const o = {}; if (e) Object.entries(e.rawAttributes || {}).forEach(([k, v]) => { if (/^[a-zA-Z_][-a-zA-Z0-9_]*$/.test(k)) o[k.toLowerCase()] = v == null ? '' : he.decode(String(v), { isAttributeValue: true }); }); return o; };
  const hA = attrMap(htmlEl); const bA = attrMap(body);
  // Head: title, meta, links. Styles and scripts in the head join the page's CSS and script list.
  const meta = []; const links = []; let title = '';
  const headNodes = head ? vtree(head) : [];
  // The share image only works with a full address, which only the live Vercel site has.
  const keepImg = !!ogBase && headNodes.some((k) => lcOf(k) === 'meta' && k.attrs.some(([x, y]) => x.toLowerCase() === 'property' && y === 'og:image') && k.attrs.some(([x, y]) => x.toLowerCase() === 'content' && String(y || '').startsWith(ogBase + '/')));
  headNodes.forEach((k) => {
    if (k.t !== 'el') return;
    const lc = lcOf(k); const a = Object.fromEntries(k.attrs.map(([x, y]) => [x.toLowerCase(), y == null ? '' : y]));
    if (lc === 'title') title = textOf(k).replace(/\s+/g, ' ').trim();
    else if (lc === 'meta') {
      if (a.charset || /viewport/i.test(a.name || '') || a['http-equiv']) return;
      const key = a.property ? 'property' : a.name ? 'name' : null; if (!key || a.content == null) return;
      const id = a[key];
      if (/^og:url$/i.test(id)) return;
      if (/^(og:image|twitter:image)/i.test(id) && !keepImg) return;
      meta.push({ [key]: id, content: a.content });
    } else if (lc === 'link') {
      if (!a.href || !a.rel) return;
      const o = { rel: a.rel, href: a.href.replace(/^\/assets\//, '/funnel/') };
      if (a.type) o.type = a.type; if (a.sizes) o.sizes = a.sizes; if (a.as) o.as = a.as; if (a.media) o.media = a.media;
      if (a.crossorigin != null) o.crossOrigin = a.crossorigin || 'anonymous';
      links.push(o);
    } else if (lc === 'style') st.css.push(k.text || '');
    else if (lc === 'script') dropped(k, ctx);
  });
  const headScripts = st.scripts.splice(0);
  // Body: JSX inside a wrapper that carries the html and body classes, so their selectors match on the first paint.
  const bodyNodes = body ? vtree(body) : vtree(root);
  const inner = children(bodyNodes, 'body', ctx, 2);
  const scripts = headScripts.concat(st.scripts);
  const cls = ['fos-root', 'fos-pre', ...String(hA.class || '').split(/\s+/), ...String(bA.class || '').split(/\s+/)].filter((x, i, l) => x && /^[A-Za-z0-9_-]+$/.test(x) && l.indexOf(x) === i);
  const mirror = {}; [hA, bA].forEach((o) => Object.entries(o).forEach(([k, v]) => { if (k.startsWith('data-')) mirror[k] = v; }));
  const { imports, rules } = rewriteCss(st.css.join('\n'));
  const css = imports.join('\n') + (imports.length ? '\n' : '') + RESET + rules;
  const cssHref = `/funnel/${path}.css?v=${sha8(css)}`;
  links.push({ rel: 'stylesheet', href: cssHref });
  const page = { id: path, html: hA, body: bA, scripts };
  const comp = pascal(name);
  const wrapAttrs = [`className=${attrStr(cls.join(' '))}`, `data-fos-page=${attrStr(path)}`, ...Object.entries(mirror).map(([k, v]) => `${k}=${attrStr(v)}`), 'style={{ display: "contents" }}'];
  const tsx = (jsx, extra) => `import { createFileRoute } from "@tanstack/react-router";
${st.styled && !extra ? 'import type { CSSProperties } from "react";\n' : ''}import { useFunnelPage, type FunnelPage } from "../funnel/use-funnel-page";

// ${name}, built with Funnel OS. Edit the text and markup below like any other page.
// Its styles are in public/funnel/${path}.css and its images in public/funnel. Keep the fos-root wrapper and useFunnelPage.

const PAGE: FunnelPage = ${J(page)};

export const Route = createFileRoute(${J(routeOf(path))})({
  head: () => ({
    meta: ${J([...(title ? [{ title }] : []), ...meta])},
    links: ${J(links)},
  }),
  component: ${comp},
});

function ${comp}() {
  useFunnelPage(PAGE);
  return (
    <div ${[...wrapAttrs, ...(extra ? [extra] : [])].join(' ')}${jsx == null ? ' />' : `>${jsx}</div>`}
  );
}
`;
  const ok = (code) => { babel().parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }); return code; };
  let out; let fallback = false;
  try { out = ok(tsx(inner)); }
  catch (e) {
    // Something in the markup did not convert cleanly. Keep the page exactly as built, as one block of HTML.
    fallback = true;
    const raw = body ? body.innerHTML.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, '') : '';
    out = ok(tsx(null, `dangerouslySetInnerHTML={{ __html: ${J(raw)} }}`));
  }
  return { tsx: out, css, title, fallback, scripts: scripts.length };
}

// The hook every Funnel OS page uses: html and body attributes, the page scripts and the motion kit, once the page is in the browser.
const HOOK = `import { useEffect } from "react";

// Funnel OS pages use this hook. It gives <html> and <body> the page's attributes, runs the page's own scripts in
// order and loads the motion kit (public/funnel/fos-motion.js) for the data-reveal and other data- attributes.
// Keep this file while any page in src/routes imports it.

export type FunnelScript = { code?: string; src?: string; module?: boolean };
export type FunnelPage = { id: string; html?: Record<string, string>; body?: Record<string, string>; scripts?: FunnelScript[] };

const KIT = "/funnel/fos-motion.js";
type Listener = EventListenerOrEventListenerObject | null;

function setAttrs(el: HTMLElement, attrs: Record<string, string> = {}) {
  const undo: Array<() => void> = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "class") {
      const added = value.split(/\\s+/).filter((c) => c && !el.classList.contains(c));
      el.classList.add(...added);
      undo.push(() => el.classList.remove(...added));
      continue;
    }
    const before = el.getAttribute(name);
    el.setAttribute(name, value);
    undo.push(() => (before === null ? el.removeAttribute(name) : el.setAttribute(name, before)));
  }
  return () => undo.forEach((fn) => fn());
}

// Runs the scripts the way the browser would have on a plain page. Listeners for DOMContentLoaded or load that
// were added after those events already fired are called right after the scripts.
function runScripts(scripts: FunnelScript[], again: boolean) {
  const later: Array<() => void> = [];
  const passed = (type: string) => (type === "DOMContentLoaded" && document.readyState !== "loading") || (type === "load" && document.readyState === "complete");
  const shim = (target: Document | Window) => {
    const real = target.addEventListener.bind(target);
    Object.defineProperty(target, "addEventListener", {
      configurable: true,
      writable: true,
      value: (type: string, fn: Listener, opts?: boolean | AddEventListenerOptions) => {
        if (!fn) return;
        if (passed(type)) {
          later.push(() => (typeof fn === "function" ? fn.call(target, new Event(type)) : fn.handleEvent(new Event(type))));
          return;
        }
        real(type, fn, opts);
      },
    });
    return () => Reflect.deleteProperty(target, "addEventListener");
  };
  const onload = window.onload;
  const restore = [shim(document), shim(window)];
  try {
    for (const s of scripts) {
      const el = document.createElement("script");
      if (s.module) el.type = "module";
      if (s.src) {
        el.src = s.src;
        el.async = false;
      } else el.textContent = again && !s.module ? "{\\n" + (s.code || "") + "\\n}" : s.code || "";
      el.setAttribute("data-fos-script", "1");
      document.body.appendChild(el);
    }
  } finally {
    restore.forEach((fn) => fn());
  }
  for (const fn of later) {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  }
  if (window.onload && window.onload !== onload && document.readyState === "complete") {
    try {
      window.onload.call(window, new Event("load"));
    } catch (e) {
      console.error(e);
    }
  }
}

// The motion kit reads the page once when it loads, so a page shown again in the same tab loads it again.
function loadKit(root: HTMLElement) {
  const done = () => root.classList.remove("fos-pre");
  const s = document.createElement("script");
  s.src = document.querySelector("script[data-fos-motion]") ? KIT + "?r=" + Date.now() : KIT;
  s.setAttribute("data-fos-motion", "1");
  s.addEventListener("load", done);
  s.addEventListener("error", done);
  document.body.appendChild(s);
  window.setTimeout(done, 3000);
}

const ran: Record<string, number> = {};

// After a code edit in the editor the page reloads, because the motion kit has changed parts of it, like split headlines.
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeUpdate", () => {
    if (document.querySelector("[data-fos-page]")) window.location.reload();
  });
}

export function useFunnelPage(page: FunnelPage) {
  useEffect(() => {
    const undo = [setAttrs(document.documentElement, page.html), setAttrs(document.body, page.body)];
    const root = document.querySelector<HTMLElement>('[data-fos-page="' + page.id + '"]');
    if (root && !root.hasAttribute("data-fos-ready")) {
      root.setAttribute("data-fos-ready", "1");
      const count = (ran[page.id] ?? 0) + 1;
      ran[page.id] = count;
      runScripts(page.scripts ?? [], count > 1);
      loadKit(root);
    }
    return () => undo.forEach((fn) => fn());
  }, [page]);
}
`;

const BEGIN_CSS = '/* FUNNEL-OS:BEGIN pages built with Funnel OS keep their own CSS in public/funnel, so Tailwind skips them */';
const END_CSS = '/* FUNNEL-OS:END */';
function cssBlock(prev, paths) {
  const block = `${BEGIN_CSS}\n${paths.map((p) => `@source not "./routes/${p}.tsx";`).join('\n')}\n${END_CSS}`;
  const s = String(prev || '');
  const a = s.indexOf('/* FUNNEL-OS:BEGIN'); const z = s.indexOf(END_CSS);
  if (a !== -1 && z > a) return s.slice(0, a) + block + s.slice(z + END_CSS.length);
  return s.replace(/\s*$/, '') + '\n\n' + block + '\n';
}
function agentsBlock(prev, pages) {
  const block = `<!-- FUNNEL-OS:BEGIN -->
## Pages built with Funnel OS

${pages.map((p) => `- ${routeOf(p.path)} ${p.name}: src/routes/${p.path}.tsx, styles in public/funnel/${p.path}.css`).join('\n')}

- Edit the text and markup in the route file like any other page.
- Each page keeps its own CSS in public/funnel, with its images and fonts. These pages do not use Tailwind classes or the theme tokens in src/styles.css, so change their look in that CSS file.
- src/styles.css has \`@source not\` lines for these files so Tailwind leaves them alone. Remove a page's line if you rebuild that page with Tailwind classes.
- Keep the \`fos-root\` wrapper, the \`useFunnelPage(PAGE)\` call and src/funnel/use-funnel-page.ts. They set the html and body attributes, run the page scripts and load public/funnel/fos-motion.js, which animates the data-reveal, data-split and other data- attributes.
- Forms, checkout links and anything else still to connect are listed in FUNNEL.md.
<!-- FUNNEL-OS:END -->`;
  const s = String(prev || '');
  const a = s.indexOf('<!-- FUNNEL-OS:BEGIN -->'); const z = s.indexOf('<!-- FUNNEL-OS:END -->');
  if (a !== -1 && z > a) return s.slice(0, a) + block + s.slice(z + '<!-- FUNNEL-OS:END -->'.length);
  return (s ? s.replace(/\s*$/, '') + '\n\n' : '') + block + '\n';
}
function funnelMd(f, pages, kind) {
  const q = f.quiz || {}; const live = f.deploy && f.deploy.stage === 'live' ? f.deploy.url : '';
  const where = kind === 'tanstack'
    ? pages.map((p) => `- ${routeOf(p.path)} ${p.name}: \`src/routes/${p.path}.tsx\`, styles in \`public/funnel/${p.path}.css\``).join('\n') + '\n- `public/funnel/` images, fonts and `fos-motion.js` (scroll and reveal animations)\n- `src/funnel/use-funnel-page.ts` runs each page\'s scripts and loads the animations'
    : pages.map((p) => `- \`${p.path}.html\` ${p.name}`).join('\n') + '\n- `assets/` images\n- `fos-motion.js` scroll and reveal animations, no dependencies';
  return `# ${(f.brand || {}).name || f.title}

${(F.TYPES[f.funnel_type] || {}).name || 'Funnel'} built with Funnel OS.${live ? `\n\nAlso live on ${live}` : ''}

## Pages

${where}

## Still to connect

- Forms: each \`<form data-fos-form>\` needs its action set to your form tool, or connect it in AI Studio.
- Checkout and booking buttons point to ${q.checkout_url || '#offer'}. Change them to your checkout or calendar link.
- Videos: replace each \`data-fos-video\` frame with your video embed.
- Placeholders you asked for: search for \`data-fos-placeholder\` and swap in the real testimonials, logos or other pieces.
`;
}

// Everything the TanStack Start project needs for one option of the funnel. pages are that option's stored files.
function studioBuild(f, all, assets) {
  const names = Object.fromEntries(F.pagesOf(f).map((p) => [p.path, p.name]));
  const checkout = (f.quiz || {}).checkout_url || '';
  const live = f.deploy && f.deploy.stage === 'live' && f.deploy.url ? String(f.deploy.url).replace(/\/$/, '') : '';
  const files = []; const pages = []; let fallback = 0;
  const order = F.pagesOf(f).map((p) => p.path);
  const list = all.filter((x) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(x.path)).sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
  for (const x of list) {
    let html = String(x.content).replace(/<script[^>]*src=["']\{\{kit\}\}["'][^>]*>\s*<\/script>/gi, '');
    html = F.resolve(html, { pageHref: (p) => routeOf(p), assetHref: (n) => '/funnel/' + n, kitHref: '/funnel/fos-motion.js', checkout });
    html = F.launchMeta(html, f, routeOf(x.path));
    const r = pageToRoute(html, { path: x.path, name: names[x.path] || x.path, ogBase: live });
    if (r.fallback) fallback++;
    files.push({ path: `src/routes/${x.path}.tsx`, content: Buffer.from(r.tsx, 'utf8') });
    files.push({ path: `public/funnel/${x.path}.css`, content: Buffer.from(r.css, 'utf8') });
    pages.push({ path: x.path, name: names[x.path] || x.path });
  }
  for (const a of assets) files.push({ path: 'public/funnel/' + a.name, content: Buffer.from(a.data, 'base64') });
  files.push({ path: 'public/funnel/fos-motion.js', content: Buffer.from(F.MOTION, 'utf8') });
  files.push({ path: 'src/funnel/use-funnel-page.ts', content: Buffer.from(HOOK, 'utf8') });
  return { files, pages, fallback };
}
async function studioFiles(jwt, f, opt) {
  const all = await rpc(jwt, 'gai_funnel_files_get', { p_id: f.id, p_opt: opt });
  if (!all.length) throw bad('This option has no pages yet. Wait for the build to finish, then push it.', 409);
  const used = new Set(); all.forEach((x) => (x.content.match(/\{\{asset:([a-z0-9._-]+)\}\}/gi) || []).forEach((m) => used.add(m.slice(8, -2))));
  ((f.visuals || {}).images || []).filter((x) => x.auto && ['favicon', 'icon'].includes(x.kind)).forEach((x) => used.add(x.name));
  used.delete(F.KIT_FILE);
  const assets = used.size ? await rpc(jwt, 'gai_assets_get', { p_names: [...used] }) : [];
  return studioBuild(f, all, assets);
}

/* ---------- GitHub ---------- */
const blobSha = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

// Plain words for what went wrong on GitHub, with where to fix it.
function ghError(e, { full, owner, admin, branch }) {
  const fix = admin ? { label: 'Open your GitHub tokens', href: 'https://github.com/settings/personal-access-tokens' } : { label: 'Create a GitHub token', href: tokenLink(owner) };
  const s = e && e.status; const msg = String((e && e.message) || '');
  if (!s) return /could not be reached/i.test(msg) ? bad('GitHub could not be reached. Check that github.com opens for you, then press Push again.', 502, { label: 'Check GitHub status', href: 'https://www.githubstatus.com' }) : e;
  if (s === 401) return bad(admin ? 'GitHub did not accept the connected token. It may have expired. Paste a new token below, or update it in Members and settings.' : 'GitHub did not accept that token. It may have expired or been copied only in part. Create a new one with the link and paste it again.', 400, fix);
  if (s === 404) return bad(admin ? `Your connected GitHub token cannot see ${full}. Give the token access to that repository in GitHub, or paste a different token below.` : `GitHub could not find ${full} with that token. Check the repository link, and that the token's Repository access includes ${full}.`, 400, fix);
  if (s === 403 && /rate limit/i.test(msg)) return bad('GitHub asked Funnel OS to slow down. Wait a minute, then press Push again.', 429, { label: 'Check GitHub status', href: 'https://www.githubstatus.com' });
  if (/protected/i.test(msg) && (s === 403 || s === 422)) return bad(`The ${branch || 'main'} branch of ${full} is protected, so Funnel OS cannot push to it. Turn off the rule for that branch in GitHub, or use a new AI Studio project.`, 400, { label: 'Open branch settings', href: `https://github.com/${full}/settings/branches` });
  if (s === 403) return bad(`The token can see ${full} but cannot write to it. Set Contents to Read and write on the token, then press Push again.`, 400, fix);
  if (s === 409 || s === 422) return bad('AI Studio pushed to the repository at the same moment. Press Push again.', 409);
  return bad('GitHub had a problem: ' + clip(msg.replace(/^GitHub: /, ''), 160) + '. Press Push again in a minute.', 502, { label: 'Check GitHub status', href: 'https://www.githubstatus.com' });
}

// Pushes one option to the repository. Returns what to remember on the funnel.
async function push({ jwt, f, opt, repo, token, admin }) {
  const full = repoOf(repo); const owner = full.split('/')[0];
  const H = F.ghH(token); const api = F.GH() + '/repos/' + full;
  const info = { full, owner, admin };
  const gh = async (path, opt2) => { try { return await F.jf('GitHub', api + path, { headers: H, timeout: 60000, ...(opt2 || {}) }); } catch (e) { throw ghError(e, info); } };
  const r = await gh('');
  info.branch = r.default_branch || 'main';
  if (r.archived) throw bad(`${full} is archived on GitHub, so nothing can be pushed to it. Unarchive it in GitHub, Settings, or use a new AI Studio project.`, 400, { label: 'Open the repository settings', href: `https://github.com/${full}/settings` });
  if (r.permissions && r.permissions.push === false) throw ghError({ status: 403, message: 'no push' }, info);
  const branch = info.branch;
  const prev = (f.repo && f.repo.studio && f.repo.studio.full_name === full) ? f.repo.studio : null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let ref = await F.jf('GitHub', `${api}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: H }).catch((e) => { if (e.status === 404 || e.status === 409) return null; throw ghError(e, info); });
    if (!ref) {
      // An empty repository has no branch yet. The first file makes one.
      await gh('/contents/FUNNEL.md', { method: 'PUT', body: JSON.stringify({ message: 'Start the funnel repository', content: Buffer.from(funnelMd(f, F.pagesOf(f), 'static')).toString('base64') }) }).catch((e) => { if (e.code === 409) return null; throw e; });
      ref = await gh(`/git/ref/heads/${encodeURIComponent(branch)}`);
    }
    const head = ref.object.sha;
    const commit = await gh(`/git/commits/${head}`);
    const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
    const have = new Map((tree.tree || []).filter((x) => x.type === 'blob').map((x) => [x.path, x.sha]));
    const read = async (p) => { const sha = have.get(p); if (!sha) return null; const b = await gh(`/git/blobs/${sha}`); return Buffer.from(b.content || '', 'base64').toString('utf8'); };
    let pkg = null; if (have.has('package.json')) { try { pkg = JSON.parse(await read('package.json')); } catch { pkg = {}; } }
    const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
    let vibe = null; if (have.has('.vibe/project.json')) { try { vibe = JSON.parse(await read('.vibe/project.json')); } catch { vibe = null; } }
    const tanstack = have.has('src/routes/__root.tsx') && (deps['@tanstack/react-start'] || /tanstack/i.test(String((vibe && (vibe.template || vibe.framework)) || '')));
    let files; let kind; let pages;
    if (tanstack) {
      kind = 'tanstack';
      const out = await studioFiles(jwt, f, opt); files = out.files; pages = out.pages;
      // Routes AI Studio already has at the same address would clash. The home page is the one we replace on purpose.
      // A page Funnel OS wrote before, for this funnel or another one, can be replaced. It imports the funnel hook.
      const mine = new Set((prev && prev.files) || []);
      const ours = async (x) => mine.has(x) || /from "\.\.\/funnel\/use-funnel-page"/.test((await read(x)) || '');
      for (const p of pages) {
        if (p.path === 'index') {
          const other = [...have.keys()].find((x) => x !== 'src/routes/index.tsx' && /^src\/routes\/((\([^/]+\)|_[^/]+)\/)*index(\.lazy)?\.(t|j)sx?$/.test(x));
          if (other) throw bad(`This AI Studio project has another home page file, ${other}, so a second one would clash. Use a new AI Studio project for the funnel, or delete that file in AI Studio first.`, 409, { label: 'How Git Sync works', href: GIT_SYNC_HELP });
          continue;
        }
        const re = new RegExp(`^src/routes/((\\([^/]+\\)|_[^/]+)/)*${p.path}((/index|/route|\\.index|\\.lazy)?)\\.(t|j)sx?$`);
        let clash = null;
        for (const x of [...have.keys()].filter((y) => re.test(y))) if (!(x === `src/routes/${p.path}.tsx` && await ours(x))) { clash = x; break; }
        if (clash) throw bad(`This AI Studio project already has a page at ${routeOf(p.path)} (${clash}). Use a new AI Studio project for the funnel, or rename that page in AI Studio first.`, 409, { label: 'How Git Sync works', href: GIT_SYNC_HELP });
      }
      const styles = await read('src/styles.css');
      if (styles != null) files.push({ path: 'src/styles.css', content: Buffer.from(cssBlock(styles, pages.map((p) => p.path)), 'utf8') });
      files.push({ path: 'AGENTS.md', content: Buffer.from(agentsBlock(await read('AGENTS.md'), pages), 'utf8') });
      files.push({ path: 'FUNNEL.md', content: Buffer.from(funnelMd(f, pages, kind), 'utf8') });
    } else if (pkg) {
      const vite = deps.vite || deps.react;
      throw bad(vite ? `${full} is a React (Vite) project. Funnel OS pushes to TanStack Start projects. Create a new AI Studio project, connect Git Sync, and paste that repository here.` : `${full} already holds a different kind of app. Paste the repository of a new AI Studio project, or an empty repository.`, 400, { label: 'How Git Sync works', href: GIT_SYNC_HELP });
    } else {
      kind = 'static'; pages = F.pagesOf(f);
      files = await F.filesFor({ jwt, f }, [opt], true);
      files.push({ path: 'FUNNEL.md', content: Buffer.from(funnelMd(f, pages, kind), 'utf8') });
    }
    // Only what changed goes up. Files we wrote last time that are gone now are removed.
    const changed = files.filter((x) => have.get(x.path) !== blobSha(x.content));
    const now = new Set(files.map((x) => x.path));
    const gone = ((prev && prev.files) || []).filter((p) => !now.has(p) && have.has(p) && !['src/styles.css', 'AGENTS.md'].includes(p));
    const done = { full_name: full, url: r.html_url || `https://github.com/${full}`, branch, kind, files: files.filter((x) => !['src/styles.css', 'AGENTS.md'].includes(x.path)).map((x) => x.path), pages: pages.map((p) => p.path), live: !!(f.deploy && f.deploy.stage === 'live' && f.deploy.url), at: new Date().toISOString() };
    if (!changed.length && !gone.length) return { ...done, commit: head, unchanged: true };
    const entries = await pool(changed, 6, async (x) => {
      const b = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: x.content.toString('base64'), encoding: 'base64' }) });
      return { path: x.path, mode: '100644', type: 'blob', sha: b.sha };
    });
    gone.forEach((p) => entries.push({ path: p, mode: '100644', type: 'blob', sha: null }));
    const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: `Funnel OS: ${(f.brand || {}).name || f.title}, option ${opt}`, tree: t.sha, parents: [head] }) });
    try {
      await F.jf('GitHub', `${api}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', headers: H, body: JSON.stringify({ sha: c.sha, force: false }) });
      return { ...done, commit: c.sha };
    } catch (e) {
      if (e.status === 422 && !/protected/i.test(e.message) && attempt === 0) continue;
      throw ghError(e, info);
    }
  }
  throw bad('AI Studio pushed to the repository at the same moment. Press Push again.', 409);
}

module.exports = { push, pageToRoute, studioBuild, studioFiles, rewriteCss, rewriteSelector, repoOf, tokenLink, TOKEN_RE, HOOK, cssBlock, agentsBlock, GIT_SYNC_HELP };
