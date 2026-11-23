// Public settings for the browser, served as /config.js (see the rewrite in vercel.json).
// Only safe values go here: the Supabase address, the publishable key and the coach's name. Never a secret.
const { SUPABASE_URL, SUPABASE_KEY, SETUP_GUIDE, COACH, dbProblem } = require('./_lib');

module.exports = (req, res) => {
  const why = dbProblem();
  const cfg = why ? { error: why } : { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY };
  cfg.guide = SETUP_GUIDE;
  cfg.coach = { name: COACH.name, first: COACH.first, ai: COACH.ai };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('window.APP_CONFIG = ' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ';\n');
};
