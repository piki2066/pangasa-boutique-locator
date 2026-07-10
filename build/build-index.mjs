import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSession, query } from './simss.mjs';
import { mintToken, fetchCatalogMap } from './shopify.mjs';
import { buildIndex } from './transform.mjs';

const AV = ['COD_SERIE_MODELO','NUM_COLOR','DESC_COLOR','COD_CLIENTE','NOMBRE_CLIENTE','NOMBRE_COMERCIAL_CLIENTE','DIRECCION','LOCALIDAD','DESC_PROVINCIA','TELEFONO_CLIENTE'];

async function main() {
  const seasonId = Number(process.env.SIMSS_SEASON_ID || 15);
  const user = process.env.SIMSS_USER;
  const pass = process.env.SIMSS_PASS;
  if (!user || !pass) throw new Error('Faltan SIMSS_USER/SIMSS_PASS');

  const sid = await startSession(user, pass);
  const rows = await query(user, sid, 'EComPrendasServidas', { ID_TEMPORADA_ALBARAN: seasonId }, AV, {});
  console.error(`SIMSS: ${rows.length} líneas servidas (temporada ${seasonId})`);

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

  const index = buildIndex(rows, catalogMap, new Set(), new Date().toISOString());
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'data.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(index));
  console.error(`OK → ${index.meta.modelCount} modelos, ${index.meta.boutiqueCount} boutiques → web/data.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
