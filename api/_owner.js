// The owner pays for the AI: the app uses the keys the admin adds in Members and settings.
// They are stored sealed in the app's own database and opened only here, on the server.
const { rpc, open } = require('./_lib');

const cache = new Map(); // provider -> { at, v }
const TTL = 5 * 60 * 1000;

// jwt: the signed-in member or admin. The database checks access before handing over the sealed key.
async function owner(provider, jwt) {
  const hit = cache.get(provider); if (hit && Date.now() - hit.at < TTL) return hit.v;
  const row = await rpc(jwt, 'gai_owner_key', { p_provider: provider });
  let v = null;
  if (row && row.ciphertext) v = { key: open(row.ciphertext), meta: row.meta || {}, extra: {} };
  cache.set(provider, { at: Date.now(), v });
  return v;
}
const forget = () => cache.clear();

module.exports = { owner, forget };
