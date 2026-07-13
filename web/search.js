export function normalize(s) {
  return (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchModels(models, term) {
  const t = normalize(term).trim();
  if (!t) return models;
  return models.filter((m) => normalize(m.title).includes(t) || normalize(m.ref).includes(t));
}

export function resolveBoutiques(model, boutiquesDict, province, size = '') {
  const esCmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'es');
  const list = model.boutiques
    .map((b) => ({ cod: b.cod, colors: b.colors || [], sizes: b.sizes || [], ...(boutiquesDict[b.cod] || {}) }))
    .filter((b) => b.name);
  const filtered = list
    .filter((b) => !province || b.province === province)
    .filter((b) => !size || b.sizes.includes(size));
  return filtered.sort((a, b) => esCmp(a.province, b.province) || esCmp(a.city, b.city));
}

// "Cómo llegar": nombre + dirección de envío completa (calle, CP, ciudad) para
// que Google Maps lleve al punto exacto donde está el producto.
export function mapsUrl(b) {
  if (typeof b === 'string') b = { name: b, city: arguments[1] }; // compat firma antigua
  const q = [b.name, b.address, [b.postal, b.city].filter(Boolean).join(' ')]
    .map((s) => (s || '').toString().trim()).filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function telHref(phone) {
  return `tel:${(phone || '').replace(/\s+/g, '')}`;
}

export function formatPhone(phone) {
  const d = (phone || '').replace(/\D/g, '');
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : phone;
}
