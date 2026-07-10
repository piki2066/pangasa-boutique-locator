const EXCLUDE_CLIENTS = new Set(['CONSUMIDOR FINAL']);
const JUNK_MODELS = new Set(['1000']);
const JUNK_COLORS = new Set(['CONCEPTO']);

export function buildIndex(rows, catalogMap = new Map(), extraExcludeCods = new Set(), generatedAt = '') {
  const boutiques = {};
  const modelMap = new Map(); // ref -> { ref, colors:Set, boutiques:Map<cod,Set> }

  for (const r of rows) {
    const legal = (r.NOMBRE_CLIENTE || '').trim();
    if (EXCLUDE_CLIENTS.has(legal.toUpperCase())) continue;
    const cod = (r.COD_CLIENTE || '').trim();
    if (!cod || extraExcludeCods.has(cod)) continue;
    const ref = String(r.COD_SERIE_MODELO || '').trim();
    if (!ref || JUNK_MODELS.has(ref)) continue;
    const color = (r.DESC_COLOR || '').trim();
    if (color && JUNK_COLORS.has(color.toUpperCase())) continue;

    if (!boutiques[cod]) {
      boutiques[cod] = {
        name: (r.NOMBRE_COMERCIAL_CLIENTE || legal || '').trim(),
        legalName: legal,
        address: (r.DIRECCION || '').trim(),
        city: (r.LOCALIDAD || '').trim(),
        province: (r.DESC_PROVINCIA || '').trim(),
        phone: (r.TELEFONO_CLIENTE || '').trim(),
      };
    }

    let m = modelMap.get(ref);
    if (!m) { m = { ref, colors: new Set(), boutiques: new Map() }; modelMap.set(ref, m); }
    if (color) m.colors.add(color);
    let bc = m.boutiques.get(cod);
    if (!bc) { bc = new Set(); m.boutiques.set(cod, bc); }
    if (color) bc.add(color);
  }

  const esCmp = (a, b) => String(a).localeCompare(String(b), 'es');
  const models = [...modelMap.values()].map((m) => {
    const cat = catalogMap.get(m.ref) || {};
    return {
      ref: m.ref,
      title: cat.title || `Ref. ${m.ref}`,
      handle: cat.handle || null,
      image: cat.image || null,
      colors: [...m.colors].sort(esCmp),
      boutiques: [...m.boutiques.entries()].map(([cod, colors]) => ({ cod, colors: [...colors].sort(esCmp) })),
    };
  }).sort((a, b) => esCmp(a.title, b.title));

  const provinces = [...new Set(Object.values(boutiques).map((b) => b.province).filter(Boolean))].sort(esCmp);

  return {
    meta: { seasonLabel: 'AW 26/27', generatedAt, modelCount: models.length, boutiqueCount: Object.keys(boutiques).length },
    provinces,
    boutiques,
    models,
  };
}
