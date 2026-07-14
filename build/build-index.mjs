import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSession, query } from './simss.mjs';
import { mintToken, fetchCatalogMap } from './shopify.mjs';
import { buildIndex, buildTallajeMap } from './transform.mjs';
import { geocodeBoutique, geoKey, sleep } from './geocode.mjs';

// Cantidades servidas por posición de talla (TALLA1..TALLA24).
const TALLA_QTY = Array.from({ length: 24 }, (_, i) => `TALLA${i + 1}`);
const AV = ['COD_SERIE_MODELO','NUM_COLOR','DESC_COLOR','DESC_FAMILIA','COD_CLIENTE','NOMBRE_CLIENTE','NOMBRE_COMERCIAL_CLIENTE','DIRECCION','LOCALIDAD','DESC_PROVINCIA','TELEFONO_CLIENTE', ...TALLA_QTY];

// Etiquetas de talla por posición (TALLAJE_1..TALLAJE_24) de EProdModelos.
const TALLAJE_LABELS = ['COD_SERIE_MODELO', ...Array.from({ length: 24 }, (_, i) => `TALLAJE_${i + 1}`)];

async function main() {
  const seasonId = Number(process.env.SIMSS_SEASON_ID || 15);
  const user = process.env.SIMSS_USER;
  const pass = process.env.SIMSS_PASS;
  if (!user || !pass) throw new Error('Faltan SIMSS_USER/SIMSS_PASS');

  const sid = await startSession(user, pass);
  const rows = await query(user, sid, 'EComPrendasServidas', { ID_TEMPORADA_ALBARAN: seasonId }, AV, {});
  console.error(`SIMSS: ${rows.length} líneas servidas (temporada ${seasonId})`);

  const tallajeRows = await query(user, sid, 'EProdModelos', {}, TALLAJE_LABELS, {});
  const tallajeMap = buildTallajeMap(tallajeRows);
  console.error(`SIMSS: ${tallajeMap.size} modelos con tallaje (etiquetas de talla)`);

  // Dirección de ENVÍO (no la fiscal): punto de envío habitual de cada cliente.
  const envioRows = await query(user, sid, 'EComPuntosEnvioClientes', { PUNTO_HABITUAL: true },
    ['COD_CLIENTE', 'DIRECCION', 'COD_POSTAL', 'LOCALIDAD', 'DESC_PROVINCIA', 'TELEFONO', 'COD_PAIS'], {});
  const envioByCod = new Map();
  for (const e of envioRows) {
    const cod = (e.COD_CLIENTE || '').trim();
    if (cod && !envioByCod.has(cod)) envioByCod.set(cod, e);
  }
  console.error(`SIMSS: ${envioByCod.size} clientes con dirección de envío habitual`);

  const refs = new Set(rows.map((r) => String(r.COD_SERIE_MODELO || '').trim()).filter(Boolean));
  let catalogMap = new Map();
  try {
    const token = await mintToken({
      store: process.env.SHOPIFY_STORE,
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    });
    catalogMap = await fetchCatalogMap({
      store: process.env.SHOPIFY_STORE,
      apiVersion: process.env.SHOPIFY_API_VERSION || '2025-10',
      token,
    }, refs);
    console.error(`Shopify: ${catalogMap.size}/${refs.size} referencias con ficha`);
  } catch (e) {
    console.error('AVISO: catálogo Shopify no disponible, sigo sin fotos:', e.message);
  }

  const index = buildIndex(rows, catalogMap, new Set(), new Date().toISOString(), tallajeMap);

  // Red de seguridad: si SIMSS devuelve algo sospechosamente vacío (caída, cambio de
  // temporada, etc.), abortamos SIN sobrescribir data.json → la web conserva el último
  // dato bueno en vez de quedarse en blanco.
  if (rows.length === 0 || index.models.length < 20 || index.meta.boutiqueCount < 20) {
    throw new Error(`Resultado sospechosamente vacío (${rows.length} líneas, ${index.models.length} modelos, ${index.meta.boutiqueCount} boutiques). NO se sobrescribe data.json.`);
  }

  // Sustituir la dirección FISCAL por la de ENVÍO (punto habitual) en cada boutique.
  let envioApplied = 0;
  for (const cod of Object.keys(index.boutiques)) {
    const e = envioByCod.get(cod);
    if (!e) continue;
    const b = index.boutiques[cod];
    if ((e.DIRECCION || '').trim()) b.address = e.DIRECCION.trim();
    if ((e.LOCALIDAD || '').trim()) b.city = e.LOCALIDAD.trim();
    if ((e.DESC_PROVINCIA || '').trim()) b.province = e.DESC_PROVINCIA.trim();
    if ((e.TELEFONO || '').trim()) b.phone = e.TELEFONO.trim();
    b.postal = (e.COD_POSTAL || '').trim();
    envioApplied += 1;
  }
  console.error(`Envío: dirección de envío aplicada a ${envioApplied}/${index.meta.boutiqueCount} boutiques`);

  // Correcciones manuales (overrides.json) — pisan SIEMPRE lo que venga de SIMSS.
  const ovPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'overrides.json');
  if (existsSync(ovPath)) {
    const ov = JSON.parse(readFileSync(ovPath, 'utf8')).boutiques || {};
    let ovApplied = 0;
    for (const [cod, fields] of Object.entries(ov)) {
      const b = index.boutiques[cod];
      if (!b) continue;
      for (const k of ['name', 'address', 'postal', 'city', 'province', 'phone']) {
        if (fields[k]) b[k] = fields[k];
      }
      ovApplied += 1;
    }
    console.error(`Overrides: ${ovApplied} correcciones manuales aplicadas`);
  }

  index.provinces = [...new Set(Object.values(index.boutiques).map((b) => b.province).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'es'));

  // Geocodificación cache-first: solo se geocodifican boutiques nuevas (respeta
  // el límite de Nominatim con 1.1s entre llamadas). Las coordenadas se guardan
  // en geocache.json y se añaden a cada boutique del data.json.
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const cachePath = join(root, 'geocache.json');
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  const MAX_NEW = Number(process.env.GEOCODE_MAX_NEW || 400);
  let newly = 0;
  for (const cod of Object.keys(index.boutiques)) {
    const b = index.boutiques[cod];
    const key = geoKey(b);
    if (cache[key]) { Object.assign(b, cache[key]); continue; }
    if (newly >= MAX_NEW) continue; // el resto se geocodifica en la próxima ejecución
    const geo = await geocodeBoutique(b);
    cache[key] = geo;
    Object.assign(b, geo);
    newly += 1;
    await sleep(1100);
  }
  writeFileSync(cachePath, JSON.stringify(cache));
  const located = Object.values(index.boutiques).filter((b) => b.lat).length;
  console.error(`Geocode: ${located}/${index.meta.boutiqueCount} boutiques ubicadas (${newly} nuevas esta ejecución)`);

  const out = join(root, 'web', 'data.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(index));
  console.error(`OK → ${index.meta.modelCount} modelos, ${index.meta.boutiqueCount} boutiques → web/data.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
