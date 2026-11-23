// Funnel OS: coach privacy guard. Shared by the server (answers and the WhatsApp line) and the browser.
// The coach is the person whose teaching fills the library. COACH_NAME in Vercel (for example "Avery Cole")
// sets who that is, so the guard also recognises questions that use that name. Without it the coach is "AI Coach".
// Three layers, all deterministic so they cannot be talked out of their rules:
//   1. cleanText / cleanRecording run when the admin publishes a source. Personal and financial details are
//      removed before anything reaches the shared Coach library, so the Coach never sees them.
//   2. blocked() refuses questions about the coach's money, private life or the guardrails before any model runs.
//   3. cleanAnswer() removes any sentence in a finished answer that still looks like a personal or financial claim.
(function (root) {
  const rxEsc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const COACH_NAME = String((typeof process !== 'undefined' && process.env && process.env.COACH_NAME) || (root && root.APP_CONFIG && root.APP_CONFIG.coach && root.APP_CONFIG.coach.name) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const NAME_WORDS = COACH_NAME.toLowerCase().split(' ').filter((w) => w.length > 1 && /^[\p{L}'’-]+$/u.test(w));
  // The coach's names as a regex alternation: full name, each part, and their possessives. Empty when no name is set.
  const NAMES = NAME_WORDS.length ? [NAME_WORDS.join('\\s+')].concat(NAME_WORDS).map((w) => (w.includes('\\s+') ? w : rxEsc(w)) + "(?:'?s)?").join('|') : '';
  const OR_NAMES = NAMES ? '|' + NAMES : '';
  const coachLabel = () => (COACH_NAME ? COACH_NAME.split(' ')[0] + ' AI' : 'AI Coach');
  const FIRST = new RegExp("\\b(i|i'm|i've|i'd|i'll|im|ive|me|my|mine|myself|we|we've|we're|our|ours|us" + OR_NAMES + ")\\b", 'i');
  // Money amounts: $27, €1,200, 3M, 10k, 2 million. Audience counts (views, subscribers) are not money.
  const MONEY = /(?:[$€£]\s?\d[\d,.]*\s?(?:k|m|mm|b|million|billion|thousand)?\b|\b\d[\d,.]*\s?(?:k|m|mm|million|billion|thousand)\b(?!\s*(?:views?|subs|subscribers?|followers?|members?|students?|people|funnels?|clients?|customers?|downloads?|impressions?|likes?|users?|leads?|emails?|contacts?|words?|minutes?|hours?|videos?))|\b\d[\d,.]*\s?(?:dollars|euros?|usd|eur|bucks)\b)/i;
  const EARN = /\b(revenue|revenues|profit|profits|profitable|income|earn|earns|earned|earning|earnings|made|make|makes|making|generated|generate|generating|sales|sold|net|mrr|arr|per month|a month|\/mo|monthly|per year|a year|yearly|annual|payout|payouts|paid out|commission|commissions|cashed|banked|turnover|gross|grossed|margin|margins|launch(?:ed)? did|in the bank)\b/i;
  const FIGURE = /\b(?:\d|six|seven|eight|nine)[- ]?figures?\b/i;
  // Product names such as "the 6 Figure Launch Blueprint" talk about a program, not about money, so they are swapped
  // for the word "program" before the money checks run.
  const PROGRAM = /\b(?:\d|six|seven|eight)[- ]?figure (?:[\w'’]+ ){0,3}?(?:blueprint|template|program|programme|course|academy|accelerator|masterclass|challenge|bootcamp|formula|system|method|playbook|mastermind|kit|workshop|framework|flywheel|funnels?)\b/gi;
  const FINANCE = /\b(revenue|profit|profits|income|net worth|salary|mrr|arr|payouts?|commissions?|bank account|bank balance|taxes|tax return|accounting|accountant|bookkeeping|bookkeeper|expenses|my margins?|our margins?|turnover|balance sheet|p&l|stripe balance|cash flow|cashflow|my debt|our debt)\b/i;
  const MINE_FIN = new RegExp('\\b(?:my|our|his|her' + OR_NAMES + ')\\s+(?:own\\s+|\\w+\\s+){0,2}(?:revenue|revenues|profits?|income|net worth|salary|mrr|arr|payouts?|commissions?|bank account|bank balance|taxes|tax return|accounting|accountant|bookkeeping|expenses|margins?|turnover|cash ?flow|debt|p&l|finances)\\b', 'i');
  const PERSONAL = /\b(wife|husband|girlfriend|boyfriend|fiancee?|partner's|spouse|married|divorce|divorced|kids?|children|child|son|daughter|baby|pregnan\w*|my family|our family|my parents|my mom|my mother|my dad|my father|my brother|my sister|my grandma|my grandpa|my home|my house|my apartment|my address|i live in|we live in|moved to|hospital|diagnos\w*|therapy|therapist|medication|my health|illness|surgery|religion|my church|passport|social security|personal number|birthday|years old|family man|family dinner|vacation|villa|holiday|honeymoon)\b/i;
  const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
  const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}\b/g;
  const SENSITIVE_Q = new RegExp(String.raw`\b(?:your|you|you've|you're)\b.{0,60}\b(?:revenue|income|profits?|earn|earnings|make per|making per|salary|net worth|sales numbers|bank|taxes|accounting|expenses|money goals?|financial goals?|family|wife|husband|girlfriend|boyfriend|spouse|kids|children|married|grow up|address|hometown|age|birthday|born|health|religion|phone number)\b|\b(?:where|which (?:city|town|country))\b.{0,30}\b(?:you${OR_NAMES})\b.{0,10}\blive\b`, 'i');

  const sentences = (s) => String(s || '').replace(/\r/g, '').split(/(?<=[.!?])\s+(?=[A-Z0-9"'“$€£(\[-])|\n+/).map((x) => x.trim()).filter(Boolean);

  // Why a sentence cannot go into the shared library, or null when it can.
  function sensitive(s) {
    const t = String(s || '');
    const plain = t.replace(PROGRAM, 'program').replace(/\bprofit maximi[sz]\w*/gi, 'program');
    if (MONEY.test(plain) && EARN.test(plain) && FIRST.test(plain)) return 'money';
    if (MINE_FIN.test(plain)) return 'finance';
    if (FIRST.test(plain) && FIGURE.test(plain)) return 'money';
    if (FIGURE.test(plain) && /\b(check|checks|paycheck|income|payouts?|revenue|profits?|sold|selling|launch|per year|a year|per month|a month|months?)\b/i.test(plain)) return 'money';
    if (/\b(christian\w*|church|religio\w*|politic\w*|agenda|left[- ]wing|right[- ]wing|vaccin\w*|elections?)\b/i.test(plain)) return 'beliefs';
    if (FIRST.test(plain) && MONEY.test(plain) && new RegExp('\\b(i|we|my|our' + OR_NAMES + ')\\b[^.]{0,40}\\b(got|hit|crossed|reached|did|closed|cleared|brought in|pulled|took home|charged)\\b', 'i').test(plain)) return 'money';
    if (PERSONAL.test(plain) && (FIRST.test(plain) || new RegExp('\\b(his|he|her|she' + OR_NAMES + ')\\b', 'i').test(plain))) return 'personal';
    // Slide bios are short lines without a subject: "Two kids and a dog", "Based in Lisbon, 34 years old".
    if (plain.length < 80 && (PERSONAL.test(plain) || /\b\d+\s+(kids|children|sons?|daughters?)\b/i.test(plain))) return 'personal';
    return null;
  }
  const scrubContacts = (s) => String(s || '').replace(EMAIL, '[email removed]').replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 8 ? '[number removed]' : m));

  // Clean a document. Question and answer documents (like a brand questionnaire) drop the whole answer
  // when the question itself is about money or private life.
  function cleanText(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const kept = []; const removed = []; let skipping = 0;
    // Slide stats put the number and its label on separate lines ("$1M+" then "In my own product sales").
    const STAT = /^[~+]?[$€£]\s?\d[\d.,]*\s?(k|m|b|million|billion)?\+?$/i;
    const EARN = /\b(sales|revenue|income|profit|earn(ed|ings)?|made|generated|commissions?|payouts?|sold)\b/i;
    const drop = new Set();
    lines.forEach((l, i) => { if (!STAT.test(l.trim())) return; let j = i + 1; while (j < lines.length && !lines[j].trim()) j++; if (j < lines.length && EARN.test(lines[j]) && lines[j].trim().length < 120) { drop.add(i); drop.add(j); } });
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (drop.has(i)) { removed.push({ text: raw.trim(), why: 'income or sales claim' }); continue; }
      const line = raw.trim(); const bare = line.replace(/^[-*•\d.)\s]+/, '');
      if (/\?\s*$/.test(bare) && bare.length < 220) { skipping = SENSITIVE_Q.test(bare) ? 8 : 0; if (skipping) { removed.push({ text: bare, why: 'private question' }); continue; } }
      else if (skipping && bare) { skipping--; removed.push({ text: bare, why: 'private answer' }); continue; }
      if (!bare) { skipping = 0; kept.push(''); continue; }
      const keepParts = [];
      for (const s of sentences(line)) { const why = sensitive(s); if (why) removed.push({ text: s, why }); else keepParts.push(s); }
      if (keepParts.length) kept.push(scrubContacts(keepParts.join(' ')));
    }
    return { text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), removed };
  }

  // Coaching calls: keep only the coach's own lines. Members' words never leave the call, and their names
  // are replaced when the coach says them.
  function cleanRecording(chunks, coachName = COACH_NAME, knownNames) {
    const coach = String(coachName).toLowerCase(); const names = new Set();
    const rows = (chunks || []).map((c) => String(c.body || '').split('\n').map((l) => { const m = l.match(/^([^:]{2,60}):\s+(.*)$/); return m ? { who: m[1].trim(), text: m[2] } : { who: null, text: l }; }));
    rows.flat().forEach((l) => { if (l.who && l.who.toLowerCase() !== coach) l.who.split(/\s+/).filter((w) => w.length > 2 && /^[A-ZÅÄÖ]/.test(w)).forEach((w) => names.add(w)); });
    const nameRx = names.size ? new RegExp('\\b(' + [...names].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g') : null;
    const callNames = memberNames(rows.map((r) => r.map((l) => l.text).join(' ')));
    let removed = 0; let members = 0;
    const out = (chunks || []).map((c, i) => {
      const mine = rows[i].filter((l) => { const ok = !l.who || l.who.toLowerCase() === coach; if (!ok) members++; return ok; }).map((l) => l.text).join(' ');
      const named = replaceNames(hideNames(nameRx ? mine.replace(nameRx, 'a member') : mine), knownNames || callNames);
      const r = cleanText(named); removed += r.removed.length;
      return { at_s: c.at_s == null ? null : c.at_s, text: r.text, removed: r.removed };
    }).filter((c) => c.text.length > 40);
    return { chunks: out, removed, member_lines: members, names_hidden: names.size };
  }

  // Live calls name members out loud when reading the chat. Greeting roll calls are dropped and a named
  // question becomes "a member".
  const CAP = "[A-Z][a-zà-öø-ÿ'’-]+(?:\\s[A-Z][a-zà-öø-ÿ'’-]+)?";
  const NOT_NAME_BASE = /^(I|I'm|I've|So|And|But|Okay|OK|Yes|Yeah|No|The|This|That|What|When|Where|How|Why|If|Now|Then|Right|Good|Great|Awesome|Cool|Nice|Thanks|Thank|Well|Like|Just|Also|AI|Claude|ChatGPT|GPT|Gemini|Lovable|HighLevel|High|Level|Perplexity|YouTube|Google|Facebook|Instagram|Zoom|Funnels|Founders?|Jesus|God|Policy|Stripe|Canva|Notion|Slack|Apify|Vercel|GitHub|Supabase|Grok|Manus|Gamma|Replit|Figma|Dribbble|Kajabi|ClickFunnels|Shopify|Wix|Webflow|Framer|Sure|Absolutely|Exactly|Perfect|Amazing|Wow|Oh|Hmm|Alright|Let|Let's|Here|There|Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Everyone|Everybody|Guys|Someone|Somebody|English|America|US|UK|Europe|Mac|Windows|Apple|Microsoft|OpenAI|Anthropic|Codex|Cursor|Warp|ElevenLabs|Higgsfield|Midjourney|Opus|Sonnet|Haiku|Asana|Pinterest|Namecheap|Anyway|I'll|WhatsApp|OpenRouter|Telegram|TikTok|LinkedIn|Twitter|Threads|Substack|Beehiiv|Calendly|Typeform|Zapier|Make|Airtable|Loom|Descript|CapCut|Premiere|Photoshop|Illustrator)$/;
  const COACH_WORDS = new Set(NAME_WORDS);
  const NOT_NAME = { test: (w) => NOT_NAME_BASE.test(w) || COACH_WORDS.has(String(w || '').toLowerCase()) || (!!COACH_NAME && String(w || '').toLowerCase() === COACH_NAME.toLowerCase()) };
  function hideNames(text) {
    let t = String(text || '');
    t = t.split(/(?<=[.!?])\s+/).filter((x) => !/^(?:what'?s up|hey|hi|hello|welcome|good (?:morning|evening|afternoon)|shout ?out(?: to)?|thanks?(?: you)?(?: so much)?(?: for joining)?)\b[^.!?]{0,15}(?:,|\s)\s*[A-Z][^.!?]*(?:,\s*[A-Z][^,.!?]*){1,}/i.test(x)).join(' ');
    const ci = (ws) => ws.map((w) => '[' + w[0].toUpperCase() + w[0] + ']' + w.slice(1)).join('|');
    const keep = (m, n) => NOT_NAME.test(n.split(' ')[0]) || NOT_NAME.test(n);
    t = t.replace(new RegExp('\\b(' + CAP + ')(?=\\s+(?:asks?|asked|is asking|was asking|says|said|mentioned|wrote|writes|commented|shared|posted|just said|in the chat)\\b)', 'g'), (m) => (keep(m, m) ? m : 'a member'));
    t = t.replace(new RegExp('\\b((?:' + ci(['question', 'comment', 'message', 'shout out', 'shoutout', 'thanks', 'thank you', 'hey', 'hi', 'yeah', 'yes', 'great question', 'good question', 'awesome', 'so', 'okay', 'welcome', 'congrats', 'congratulations']) + ')\\s*,?\\s+(?:from\\s+|to\\s+)?)(' + CAP + ')(?=[,.!?])', 'g'), (m, a, n) => (keep(m, n) ? m : a + 'a member'));
    t = t.replace(new RegExp('(^|[.!?]\\s+)(' + CAP + '),(?=\\s+(?:you|your|I|I\'m|I\'ll|we|that|this|great|good|so|yes|yeah|exactly|totally|absolutely|thanks|thank)\\b)', 'g'), (m, a, n) => (keep(m, n) ? m : a + 'A member,'));
    return t;
  }

  // Names of people the coach addresses on calls. A word counts as a name when it is used to greet or answer
  // someone, or sits in a roll call, and never appears in lowercase anywhere else in the calls.
  const PUBLIC = /^(Hormozi|Hermosi|Ramosi|Brunson|Fladlin|Alvins|Altman|Musk|Jobs|Gates|Bezos|Zuckerberg|Kennedy|Garyvee|Vaynerchuk|Walker|Cardone|Robbins|Ferriss|Hoffman|Godin|Sinek|Schwartz|Halbert|Ogilvy|Hopkins|Cialdini|Kern|Dan|Koe|Bilyeu|Hamilton)$/;
  function memberNames(texts) {
    const all = (texts || []).join('\n'); const lower = new Set((all.match(/\b[a-zà-öø-ÿ][a-zà-öø-ÿ'’-]+\b/g) || []));
    const cand = new Map(); const add = (w) => { w = String(w || '').trim(); if (!w || w.length < 3 || NOT_NAME.test(w) || lower.has(w.toLowerCase()) || /^[A-Z0-9]+s?$/.test(w) || /[a-z][A-Z]/.test(w)) return; cand.set(w, (cand.get(w) || 0) + 1); };
    const W = "[A-Z][A-Za-zà-öø-ÿ'’-]+";
    for (const seg of all.split(/[.!?…]+|\n/)) {
      const parts = seg.split(',').map((x) => x.trim()).filter(Boolean);
      const caps = parts.filter((x) => new RegExp('^' + W + '(?:\\s' + W + ')?$').test(x));
      if (caps.length >= 3) caps.forEach((x) => x.split(/\s/).forEach(add));
    }
    const ctx = [
      new RegExp("\\b(?:[Ww]hat'?s up|[Ww]elcome|[Tt]hanks|[Tt]hank you|[Hh]ey|[Hh]i|[Hh]ello|[Hh]owdy|[Ss]ame|[Ww]ell|[Oo]h|[Yy]eah|[Yy]es|[Oo]kay|[Ss]o|[Gg]reat tip|[Gg]ood tip|[Gg]ood question|[Gg]reat question|[Cc]ongrats|[Ss]hout ?out to|[Aa]ppreciate you|to)\\s*,?\\s+(" + W + ")(?=\\s*[,.!?…])", 'g'),
      new RegExp("(" + W + ")(?=\\s+(?:says|said|asks|asked|had asked|is asking|was asking|wants|wrote|mentioned|commented|approval)\\b)", 'g'),
      new RegExp("(?:^|[.!?…]\\s+)(" + W + "),\\s+(?:you|your|please|let me|if you|I|I'm|I'd|I would|message me|come|so)\\b", 'g'),
      new RegExp(",\\s+(" + W + ")[.?!]", 'g'),
    ];
    for (const rx of ctx) { let m; while ((m = rx.exec(all))) add(m[1]); }
    return new Set([...cand.keys()]);
  }
  function replaceNames(text, names) {
    if (!names || !names.size) return text;
    const rx = new RegExp("\\b(" + [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ")(\\s+[A-Z][A-Za-z'’-]+)?\\b", 'g');
    return String(text).replace(rx, (m, n, sur) => (sur && (PUBLIC.test(sur.trim()) || COACH_WORDS.has(sur.trim().toLowerCase())) ? m : 'a member'))
      .replace(/a member(?:[,\s]+a member)+/g, 'a few members');
  }

  // Split cleaned text into library passages of roughly even size, on paragraph or sentence edges.
  function chunk(text, size = 1400) {
    const paras = String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean); const out = []; let cur = '';
    const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
    for (const p of paras) {
      if (p.length > size) { push(); let buf = ''; for (const s0 of sentences(p)) for (const s of (s0.match(new RegExp('[\\s\\S]{1,' + size + '}(?=\\s|$)|[\\s\\S]{1,' + size + '}', 'g')) || [])) { if ((buf + ' ' + s).length > size && buf) { out.push(buf.trim()); buf = ''; } buf += ' ' + s; } if (buf.trim()) out.push(buf.trim()); continue; }
      if ((cur + '\n\n' + p).length > size) push();
      cur += (cur ? '\n\n' : '') + p;
    }
    push(); return out;
  }

  // Questions the Coach answers with a fixed refusal, without asking any model.
  const ABOUT = '(?:' + (NAMES ? NAMES + '|' : '') + 'the coach|the coach\'?s|coach\'?s|you|your|yours|yourself|u|ur|he|his|him|she|her|hers)';
  const BLOCK = [
    ['finance', new RegExp('\\b' + ABOUT + '\\s+(?:own\\s+|real\\s+|actual\\s+|current\\s+|total\\s+|monthly\\s+|yearly\\s+|annual\\s+|business\\s+|company\\s+)*(?:revenue|revenues|income|profits?|earnings|net\\s*worth|salary|mrr|arr|turnover|margins?|bank|finances|financials|accounting|books|taxes|expenses|payouts?|commissions?|stripe|numbers|money|cash|wealth|sales(?!\\s*(?:page|pages|copy|letter|letters|funnel|funnels|call|calls|script|scripts|video|videos|process|framework|frameworks|sequence|sequences|email|emails|skills?|training|strategy|system|method|approach|tips?)))\\b', 'i')],
    ['finance', new RegExp('\\b(?:how much|what)\\s+(?:money\\s+)?(?:do|did|does|have|has|are|is|will|would)\\s+' + ABOUT + '\\s+(?:\\w+\\s+){0,2}(?:make|made|makes|making|earn|earned|earning|earns|bring in|brought in|generate|generated|net|clear|cleared|take home|bank|sell|sold|pull in|gross|grossed)\\b', 'i')],
    ['finance', new RegExp('\\b' + ABOUT + '\\s+(?:\\w+\\s+){0,3}(?:make|made|makes|earn|earned|earns|generate|generated|grossed|cleared)\\s+(?:per|a|each|every|in a|last)\\s+(?:month|year|week|day|launch)\\b', 'i')],
    ['finance', new RegExp('\\b(?:his|her|the coach\'?s' + OR_NAMES + ')\\b[^?.]{0,60}\\b(?:revenue|income|profit|earnings|net worth|sales|mrr|arr|salary|bank|accounting|taxes|money)\\b', 'i')],
    ['finance', /\b(?:how (?:rich|wealthy)|net worth)\b/i],
    ['personal', new RegExp('\\b' + ABOUT + '\\s+(?:own\\s+)?(?:wife|husband|girlfriend|boyfriend|partner|spouse|fianc[eé]e?|kids?|children|son|daughter|family|parents|mom|mother|dad|father|brother|sister|relatives|home\\s*address|address|house|apartment|hometown|location|age|birthday|birth\\s*date|health|religion|politics|phone|phone\\s*number|email|personal\\s*life|private\\s*life|relationship|love\\s*life|dating\\s*life|passport|schedule|whereabouts)\\b', 'i')],
    ['personal', new RegExp('\\b(?:where|which\\s+(?:city|town|country))\\s+(?:do|does|did)\\s+' + ABOUT + '\\s+(?:live|stay|reside|grow up)\\b', 'i')],
    ['personal', new RegExp('\\b(?:is|are)\\s+' + ABOUT + '\\s+(?:married|single|dating|divorced|religious|sick|ill)\\b', 'i')],
    ['personal', new RegExp('\\bhow old\\s+(?:is|are)\\s+' + ABOUT + '\\b', 'i')],
    ['personal', new RegExp('\\b(?:does|do)\\s+' + ABOUT + '\\s+have\\s+(?:a\\s+)?(?:wife|girlfriend|boyfriend|kids|children|family|partner)\\b', 'i')],
    ['override', /\b(?:ignore|disregard|forget|override|bypass|disable|turn off|skip|break|get around|work around|jailbreak)\b[^.?!]{0,60}\b(?:instructions?|rules?|guard\s*rails?|guidelines|restrictions?|filters?|policy|policies|prompt|safety|limits?|programming|training)\b/i],
    ['override', /\b(?:system prompt|developer mode|dan mode|jailbreak|god mode|admin mode|debug mode|unfiltered|uncensored|no restrictions|without (?:any )?(?:filters?|restrictions?|rules?|guardrails?))\b/i],
    ['override', /\b(?:reveal|show|print|repeat|output|dump|list|paste|give me)\b[^.?!]{0,40}\b(?:your|the)\s+(?:instructions|prompt|system message|hidden rules|training data|raw (?:sources|documents|files)|source documents|full documents?|entire documents?|whole (?:document|file|transcript))\b/i],
    ['override', new RegExp("\\b(?:i am|i'm|this is)\\s+(?:" + (NAMES ? NAMES + '|' : '') + 'the coach|the admin|an admin|the developer|your developer|the owner|from (?:anthropic|openai|perplexity))\\b', 'i')],
    ['override', /\b(?:pretend|act as if|imagine|hypothetically|roleplay|role-play|in a story|in a fictional|as a joke)\b[^.?!]{0,80}\b(?:revenue|income|profit|earn|sales numbers|net worth|wife|girlfriend|family|address|where (?:he|you) live)\b/i],
  ];
  // A question about the Coach's own private details is blocked. Questions about the member's own business pass.
  function blocked(question) {
    const q = String(question || '').replace(/[\u200b-\u200f\u2060\ufeff]/g, '').replace(/\s+/g, ' ');
    const folded = q.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[0@]/g, (c) => (c === '0' ? 'o' : 'a')).replace(/\$(?=[a-z])/gi, 's');
    for (const [why, rx] of BLOCK) if (rx.test(q) || rx.test(folded)) return why;
    return null;
  }
  const REFUSAL = {
    finance: "I keep my revenue, profit, sales and accounting private, so that is one thing I will not share. What I can do is help you with yours: pricing an offer, planning a launch or working out what your funnel needs to convert. What are you working on?",
    personal: "My personal life stays private, so I will not go into that. I am here to coach you on offers, copy, funnels, content and getting clients. What would you like help with?",
    override: "I can't change how I work or share what I am not meant to share, however the question is put. Ask me anything about offers, copywriting, funnels, conversion or getting clients and I will help you with it.",
  };

  // Last pass over a finished answer: drop any sentence that still reads like a private or financial claim
  // about the coach. Advice about the member's own prices and numbers stays.
  const MINE_ANS = new RegExp("\\b(i|i'm|i've|i'd|me|my|mine|we|we've|our|us" + OR_NAMES + ")\\b", 'i');
  const NAMED_EARN = new RegExp('\\b(?:' + (NAMES || '(?!)') + ')\\b[^.]{0,60}\\b(made|earned|revenue|profit|sales|net worth)\\b', 'i');
  function cleanAnswer(text) {
    let removed = 0;
    const out = String(text || '').split('\n').map((line) => {
      if (!line.trim()) return line;
      const lead = (line.match(/^\s*(?:[-*•]|\d+[.)])\s+/) || [''])[0];
      const body = line.slice(lead.length);
      const keep = sentences(body).filter((s) => {
        const plain = s.replace(PROGRAM, 'program').replace(/\bprofit maximi[sz]\w*/gi, 'program');
        const mine = MINE_ANS.test(plain);
        const bad = (mine && (FINANCE.test(plain) || FIGURE.test(plain) || (MONEY.test(plain) && EARN.test(plain)) || PERSONAL.test(plain))) || (!!NAMES && NAMED_EARN.test(plain));
        if (bad) removed++; return !bad;
      });
      return keep.length ? lead + keep.join(' ') : null;
    }).filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { text: out, removed };
  }

  const API = { memberNames, replaceNames, hideNames, cleanText, cleanRecording, chunk, blocked, REFUSAL, cleanAnswer, sensitive, coachName: COACH_NAME, coachLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.CoachGuard = API;
})(typeof window !== 'undefined' ? window : null);
