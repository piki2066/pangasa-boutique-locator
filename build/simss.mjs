const BASE = 'https://pangasa.simss.es/restful';

export function columnarToRows(data) {
  const cols = Object.keys(data || {});
  if (cols.length === 0) return [];
  const n = data[cols[0]].length;
  const rows = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = {};
    for (const c of cols) row[c] = data[c][i];
    rows[i] = row;
  }
  return rows;
}

export async function startSession(user, pass) {
  const url = `${BASE}/startsession?user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const txt = (await (await fetch(url)).text()).trim();
  const sid = Number(txt);
  if (!Number.isInteger(sid)) throw new Error(`SIMSS startsession inesperado: ${txt}`);
  return sid;
}

export async function query(user, sessionid, entity, kv, av, sqltypes = {}) {
  const r = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, sessionid, entity, kv, av, sqltypes, type: null }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error(`SIMSS query code ${j.code}: ${j.message || ''}`);
  return columnarToRows(j.data);
}
