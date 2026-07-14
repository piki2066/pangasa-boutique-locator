const EXCLUDE_CLIENTS = new Set(['CONSUMIDOR FINAL']);
const JUNK_MODELS = new Set(['1000']);
const JUNK_COLORS = new Set(['CONCEPTO']);

// Básicos de CONTINUIDAD (Cont.AW, temporada 12): se pueden reservar aunque no haya stock.
export const CONTINUITY_REFS = new Set([
  '1406009', '1406930', '1411930', '1412001', '1412007', '1412540', '1412901', '1412930',
  '1413650', '1414000', '1414001', '1414024', '1414400', '1414409', '1414930', '1415310',
  '1415703', '1425100', '1430004', '1445000', '146000', '146001', '147000', '147001',
  '148000', '148001', '1484000', '1642100',
]);

// EProdModelos expone las etiquetas de talla por posición en TALLAJE_1..TALLAJE_24
// (via /query o findall). Devuelve Map<ref, [label pos1, label pos2, ...]> (null si vacía).
export function buildTallajeMap(rows) {
  const map = new Map();
  for (const r of rows) {
    const ref = String(r.COD_SERIE_MODELO || '').trim();
    if (!ref) continue;
    const labels = [];
    for (let j = 1; j <= 24; j++) {
      const v = (r[`TALLAJE_${j}`] ?? '').toString().trim();
      labels.push(v || null);
    }
    map.set(ref, labels);
  }
  return map;
}

// Posiciones (1..24) con cantidad servida > 0 en una fila de prendas servidas.
function servedPositions(row) {
  const pos = [];
  for (let j = 1; j <= 24; j++) {
    const q = Number(row[`TALLA${j}`]);
    if (Number.isFinite(q) && q > 0) pos.push(j);
  }
  return pos;
}

// Etiquetas de talla, en orden de posición, para un conjunto de posiciones.
function labelSizes(posSet, ladder) {
  return [...posSet].sort((a, b) => a - b).map((p) => ladder[p - 1]).filter(Boolean);
}

export function buildIndex(rows, catalogMap = new Map(), extraExcludeCods = new Set(), generatedAt = '', tallajeMap = new Map()) {
  const boutiques = {};
  const modelMap = new Map(); // ref -> { ref, colors:Set, positions:Set, boutiques:Map<cod,{colors:Set,positions:Set}> }

  for (const r of rows) {
    const legal = (r.NOMBRE_CLIENTE || '').trim();
    if (EXCLUDE_CLIENTS.has(legal.toUpperCase())) continue;
    const cod = (r.COD_CLIENTE || '').trim();
    if (!cod || extraExcludeCods.has(cod)) continue;
    const ref = String(r.COD_SERIE_MODELO || '').trim();
    if (!ref || JUNK_MODELS.has(ref)) continue;
    // Solo referencias de INVIERNO (empiezan por 1); las de verano empiezan por 2.
    if (!ref.startsWith('1')) continue;
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
    if (!m) { m = { ref, family: '', colors: new Set(), positions: new Set(), boutiques: new Map() }; modelMap.set(ref, m); }
    if (!m.family && (r.DESC_FAMILIA || '').trim()) m.family = r.DESC_FAMILIA.trim();
    if (color) m.colors.add(color);
    let bc = m.boutiques.get(cod);
    if (!bc) { bc = { colors: new Set(), positions: new Set() }; m.boutiques.set(cod, bc); }
    if (color) bc.colors.add(color);
    for (const p of servedPositions(r)) { m.positions.add(p); bc.positions.add(p); }
  }

  const esCmp = (a, b) => String(a).localeCompare(String(b), 'es');
  const models = [...modelMap.values()].map((m) => {
    const cat = catalogMap.get(m.ref) || {};
    const ladder = tallajeMap.get(m.ref) || [];
    return {
      ref: m.ref,
      title: cat.title || `Ref. ${m.ref}`,
      handle: cat.handle || null,
      image: cat.image || null,
      family: m.family || 'Otras prendas',
      continuity: CONTINUITY_REFS.has(m.ref),
      colors: [...m.colors].sort(esCmp),
      sizes: labelSizes(m.positions, ladder),
      boutiques: [...m.boutiques.entries()].map(([cod, bc]) => ({
        cod,
        colors: [...bc.colors].sort(esCmp),
        sizes: labelSizes(bc.positions, ladder),
      })),
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
