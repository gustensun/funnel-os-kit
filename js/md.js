// Small, safe markdown for answers: headings, bold, italic, lists, quotes, code, links and [n] citations.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function inline(s, cites) {
    let t = esc(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, a, u) => `<a href="${u}" target="_blank" rel="noopener">${a}</a>`);
    // Citations: [1] or [1, 2] or [1][2]
    t = t.replace(/\s?\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g, (m, list) => list.split(',').map((n) => n.trim()).filter((n) => !cites || cites.has(+n))
      .map((n) => `<button type="button" class="cite" data-n="${n}" aria-label="Source ${n}">${n}</button>`).join(''));
    return t;
  }
  function render(src, opts = {}) {
    const cites = opts.cites || null;
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = []; let list = null; let para = []; let code = null;
    const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' '), cites) + '</p>'); para = []; } };
    const flushL = () => { if (list) { out.push(`<${list.t}${list.start > 1 ? ` start="${list.start}"` : ''}>` + list.items.map((i) => '<li>' + inline(i, cites) + '</li>').join('') + `</${list.t}>`); list = null; } };
    for (const raw of lines) {
      if (code) { if (/^```/.test(raw)) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null; } else code.push(raw); continue; }
      if (/^```/.test(raw)) { flushP(); flushL(); code = []; continue; }
      const line = raw.trimEnd();
      if (!line.trim()) { flushP(); flushL(); continue; }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); const lv = Math.min(4, m[1].length + 1); out.push(`<h${lv}>` + inline(m[2], cites) + `</h${lv}>`); continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [], start: +m[1] }; } list.items.push(m[2]); continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushP(); flushL(); out.push('<blockquote>' + inline(m[1], cites) + '</blockquote>'); continue; }
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushP(); flushL(); out.push('<hr>'); continue; }
      if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
      flushL(); para.push(line.trim());
    }
    if (code) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
    flushP(); flushL();
    return out.join('');
  }
  window.MD = { render, esc };
})();
