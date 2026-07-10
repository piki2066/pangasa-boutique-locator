// Geocodificación de direcciones vía Nominatim (OpenStreetMap), sin API key.
// Política Nominatim: 1 req/seg, User-Agent identificable. El llamador cachea
// y espacia las llamadas (sleep) para respetarla.

const UA = 'pangasa-boutique-locator/1.0 (https://github.com/piki2066/pangasa-boutique-locator)';

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Clave de caché estable e insensible a mayúsculas/espacios.
export function geoKey({ address, city, province }) {
  return [address, city, province].map((s) => (s || '').trim().toLowerCase()).join('|');
}

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const d = await r.json();
  if (!Array.isArray(d) || d.length === 0) return null;
  const lat = Number(d[0].lat);
  const lng = Number(d[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// Intenta dirección completa; si falla, cae a nivel ciudad. Devuelve
// { lat, lng, precision:'address'|'city' } o { lat:null, lng:null, precision:'none' }.
export async function geocodeBoutique(b) {
  const full = [b.address, b.city, b.province, 'España'].filter(Boolean).join(', ');
  if (full) {
    const hit = await nominatim(full);
    if (hit) return { ...hit, precision: 'address' };
  }
  const cityQ = [b.city, b.province, 'España'].filter(Boolean).join(', ');
  if (cityQ) {
    await sleep(1100);
    const hit = await nominatim(cityQ);
    if (hit) return { ...hit, precision: 'city' };
  }
  return { lat: null, lng: null, precision: 'none' };
}
