// Builds supabase/library.sql from the library folder. Every Markdown file in library/docs becomes a source the
// coach answers from, and library/playbook.json becomes the core answers.
//   node scripts/build-library.js
// Then run supabase/library.sql in the Supabase SQL editor. It replaces what this script loaded before and leaves
// anything else in the library tables alone. CUSTOMIZE.md explains the file format.
//
// Every text goes through the privacy guard in js/coach-guard.js first. Sentences that look like personal or
// financial details are left out and listed below, so read the output before you load the file.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const Guard = require(path.join(ROOT, 'js/coach-guard.js'));
const DOCS = path.join(ROOT, 'library/docs');
const PLAYBOOK = path.join(ROOT, 'library/playbook.json');
const OUT = path.join(ROOT, 'supabase/library.sql');
// Rows this script owns start with these ids, so a rebuild can replace exactly them.
const SRC_ID = '57a7e000-0000-4000-8000-';
const PLAY_ID = '57a7e001-0000-4000-8000-';
const CHUNK_BASE = 5717000000000;
const KINDS = { doc: 'Framework', recording: 'Coaching call', youtube: 'Video' };
const SIZE = 1400;

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const lit = (v) => (v == null ? 'null' : "'" + String(v).replace(/'/g, "''") + "'");
const arr = (a) => (a.length ? 'array[' + a.map(lit).join(', ') + ']::text[]' : "'{}'::text[]");
const problems = [];
const removedAll = [];

function readDoc(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const meta = {}; let body = raw;
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = raw.slice(fm[0].length);
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^"(.*)"$/, '$1');
    }
  }
  const h1 = body.match(/^#\s+(.+)\n/);
  if (h1) { meta.title = meta.title || h1[1].trim(); body = body.slice(h1[0].length); }
  const name = path.basename(file);
  if (!meta.title) problems.push(`${name}: add a title line at the top, like "title: My framework" inside the --- block.`);
  meta.kind = (meta.kind || 'doc').toLowerCase();
  if (!KINDS[meta.kind]) problems.push(`${name}: kind must be doc, recording or youtube (it says "${meta.kind}").`);
  if (meta.url && !/^https:\/\/\S+$/.test(meta.url)) problems.push(`${name}: url must start with https://.`);
  if (meta.added && Number.isNaN(Date.parse(meta.added))) problems.push(`${name}: added must be a date like 2026-01-31.`);
  return { name, meta, body: body.trim() };
}

const note = (where, removed) => removed.forEach((r) => removedAll.push(`${where}: left out (${r.why}): ${String(r.text).slice(0, 140)}`));

// Frameworks and notes: one passage per ## section, split further when a section is long.
function docChunks(d) {
  const sections = d.body.split(/\n(?=##\s)/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const sec of sections) {
    const head = (sec.match(/^##\s+(.+)/) || [])[1];
    const text = head ? head.trim() + '\n' + sec.replace(/^##\s+.+\n?/, '') : sec;
    const r = Guard.cleanText(text); note(d.name, r.removed);
    Guard.chunk(r.text, SIZE).forEach((c, i) => out.push({ at_s: null, body: i && head ? head.trim() + ' (continued)\n' + c : c }));
  }
  return out;
}

// Transcripts: a line that starts with a time like [12:34] or [1:02:03] starts a new passage at that time.
// Coaching calls can mark speakers as "Name: words"; only the coach's lines are kept (COACH_NAME).
function transcriptChunks(d) {
  const parts = []; let cur = null;
  for (const line of d.body.split('\n')) {
    const m = line.match(/^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s*(.*)$/);
    if (m) { cur = { at_s: (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3], body: m[4] }; parts.push(cur); }
    else if (line.trim()) { if (!cur) { cur = { at_s: null, body: '' }; parts.push(cur); } cur.body += (cur.body ? '\n' : '') + line.trim(); }
  }
  // Merge short pieces so each passage carries a full thought.
  const merged = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.body.length + p.body.length < SIZE * 0.7) last.body += '\n' + p.body; else merged.push({ ...p });
  }
  if (d.meta.kind === 'recording') {
    const r = Guard.cleanRecording(merged.map((c) => ({ at_s: c.at_s, body: c.body })));
    r.chunks.forEach((c) => note(d.name, c.removed));
    if (r.member_lines) removedAll.push(`${d.name}: left out ${r.member_lines} lines spoken by members.`);
    return r.chunks.map((c) => ({ at_s: c.at_s, body: c.text }));
  }
  return merged.map((c) => { const r = Guard.cleanText(c.body); note(d.name, r.removed); return { at_s: c.at_s, body: r.text }; }).filter((c) => c.body.length > 40);
}

const files = fs.existsSync(DOCS) ? fs.readdirSync(DOCS).filter((f) => f.endsWith('.md')).sort() : [];
const docs = files.map((f) => readDoc(path.join(DOCS, f)));
const titles = new Map();
for (const d of docs) {
  const k = String(d.meta.title || '').toLowerCase();
  if (titles.has(k)) problems.push(`${d.name} and ${titles.get(k)} have the same title. Give each file its own title.`);
  titles.set(k, d.name);
  if (d.meta.kind === 'recording' && !Guard.coachName && /^(?:\[[\d:]+\]\s*)?[^:\n[\]]{2,60}:\s/m.test(d.body)) problems.push(`${d.name} is a recording with speaker names, so the script needs to know which speaker is you. Run it with your name as it appears in the transcript, like: COACH_NAME="Avery Cole" npm run library`);
}

let plays = [];
if (fs.existsSync(PLAYBOOK)) {
  try { plays = JSON.parse(fs.readFileSync(PLAYBOOK, 'utf8')); } catch (e) { problems.push(`library/playbook.json is not valid JSON: ${e.message}. Paste it into a JSON checker to find the line.`); }
  if (!Array.isArray(plays)) { problems.push('library/playbook.json must be a list: [ {"question": ..., "answer": ...}, ... ]'); plays = []; }
}
plays.forEach((p, i) => {
  if (!p || !String(p.question || '').trim() || !String(p.answer || '').trim()) problems.push(`library/playbook.json entry ${i + 1} needs a question and an answer.`);
  (p && p.sources || []).forEach((s) => { if (!titles.has(String(s).toLowerCase())) problems.push(`library/playbook.json entry ${i + 1} ("${String(p.question).slice(0, 50)}") names the source "${s}", but no file in library/docs has that title.`); });
});

if (problems.length) {
  console.error('The library has problems to fix first:\n- ' + problems.join('\n- '));
  process.exit(1);
}

const lines = [];
lines.push('-- The coach library. Generated by scripts/build-library.js from library/docs and library/playbook.json.');
lines.push('-- Edit those files and run the script again; edits made here are lost on the next build.');
lines.push('-- Run in the Supabase SQL editor after supabase/setup.sql. Safe to run again: it replaces the rows this');
lines.push('-- script loaded before and leaves anything else in the library tables alone.');
lines.push('');
lines.push('begin;');
lines.push(`delete from public.gai_lib_playbook where id::text like '${PLAY_ID.slice(0, 9)}%';`);
lines.push(`delete from public.gai_lib_sources where id::text like '${SRC_ID.slice(0, 9)}%';`);

let nChunks = 0;
docs.forEach((d, i) => {
  const chunks = d.meta.kind === 'doc' ? docChunks(d) : transcriptChunks(d);
  if (!chunks.length) { removedAll.push(`${d.name}: nothing left to load after the privacy check, so it was skipped.`); return; }
  const id = SRC_ID + hash('source:' + d.meta.title.toLowerCase());
  const chars = chunks.reduce((a, c) => a + c.body.length, 0);
  lines.push('');
  lines.push(`-- ${d.name}`);
  lines.push(`insert into public.gai_lib_sources (id, kind, title, url, chars, published_at) values ('${id}', ${lit(d.meta.kind)}, ${lit(d.meta.title)}, ${lit(d.meta.url || null)}, ${chars}, ${d.meta.added ? lit(d.meta.added) : 'null'});`);
  lines.push('insert into public.gai_lib_chunks (id, source_id, idx, at_s, body) values');
  lines.push(chunks.map((c, j) => `  (${CHUNK_BASE + i * 1000 + j}, '${id}', ${j}, ${c.at_s == null ? 'null' : c.at_s}, ${lit(c.body)})`).join(',\n') + ';');
  nChunks += chunks.length;
});

if (plays.length) {
  lines.push('');
  lines.push('-- library/playbook.json');
  lines.push('insert into public.gai_lib_playbook (id, topic, question, keywords, answer, sources, position) values');
  const rows = plays.map((p, i) => {
    const r = Guard.cleanText(String(p.answer)); note(`playbook entry ${i + 1}`, r.removed);
    const srcs = (p.sources || []).map((s) => docs.find((d) => d.meta.title.toLowerCase() === String(s).toLowerCase()).meta.title);
    return `  ('${PLAY_ID + hash('play:' + String(p.question).toLowerCase())}', ${lit(String(p.topic || '').trim())}, ${lit(String(p.question).trim())}, ${lit(String(p.keywords || '').trim())}, ${lit(r.text)}, ${arr(srcs)}, ${+p.position || i + 1})`;
  });
  lines.push(rows.join(',\n') + ';');
}
lines.push('commit;');
lines.push('');
fs.writeFileSync(OUT, lines.join('\n'));

console.log(`Wrote supabase/library.sql: ${docs.length} sources, ${nChunks} passages, ${plays.length} core answers.`);
if (removedAll.length) console.log('\nThe privacy check changed these. Reword the text if something was left out by mistake:\n- ' + removedAll.join('\n- '));
console.log('\nNext: open the Supabase SQL editor, paste supabase/library.sql and press Run.');
