// JSON schemas for the Funnel OS steps that answer in JSON. The AI service checks each answer against its
// schema, so a step gets well-formed JSON in the right shape the first time. Every field is required and
// fields that may be empty are nullable, which keeps the schemas valid for every model.
const str = { type: 'string' };
const num = { type: 'number' };
const arr = (items) => ({ type: 'array', items });
const obj = (props) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });
const nul = (t) => ({ anyOf: [t, { type: 'null' }] });
const strs = arr(str);

const research = obj({
  summary: str,
  audience: obj({ who: str, pains: strs, desires: strs, objections: strs, words: strs }),
  competitors: arr(obj({ name: str, offer: str, price: str, angle: str, url: str })),
  price_range: str,
  angles: strs,
  gaps: strs,
  about: obj({ bio: str, credentials: strs, proof: strs, numbers: strs }),
  sources: arr(obj({ title: str, url: str })),
});

const item = obj({ name: str, what: str, value: num });
const offer = obj({
  name: str, one_liner: str, promise: str, audience: str,
  transformation: obj({ before: str, after: str }),
  timeline: obj({ first_win: str, result: str }),
  mechanism: obj({ name: str, steps: arr(obj({ name: str, what: str })) }),
  price: obj({ amount: num, currency: str, compare_at: nul(num), note: str, plans: arr(obj({ label: str, amount: num, every: str })) }),
  stack: arr(item),
  bonuses: arr(item),
  guarantee: obj({ name: str, days: num, terms: str }),
  cta: str, urgency: str, lead_magnet: str,
  bump: nul(obj({ name: str, price: num, what: str })),
  upsells: arr(obj({ page: str, name: str, price: num, what: str })),
  changes: str,
});

const section = obj({
  id: str, p: str, eyebrow: str, headline: str, sub: str, body: strs, bullets: strs,
  items: arr(obj({ title: str, body: str, meta: str })), cta: str, note: str,
});
const copy = obj({
  meta: obj({ site_title: str, description: str }),
  pages: arr(obj({ path: str, name: str, title: str, description: str, sections: arr(section) })),
});

const chief = obj({
  scores: arr(obj({ path: str, id: str, score: num, why: str })),
  headlines: strs,
  rewrites: arr(obj({ path: str, why: str, section })),
  summary: str,
});

const judge = obj({
  headline: obj({ pick: num, why: str }),
  sections: arr(obj({ key: str, keep: { type: 'string', enum: ['after', 'before'] }, why: str })),
});

const look = obj({
  problems: arr(obj({ page: str, device: { type: 'string', enum: ['desktop', 'phone', 'both'] }, section: str, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, issue: str, fix: str })),
  design: obj({ score: num, weakest: str, direction: str }),
});

const S = (name, schema) => ({ name, schema });
module.exports = {
  research: S('fosresearch', research),
  offer: S('fosoffer', offer),
  copy: S('foscopy', copy),
  chief: S('foschief', chief),
  judge: S('fosjudge', judge),
  look: S('foslook', look),
};
