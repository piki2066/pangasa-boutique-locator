import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, buildTallajeMap } from '../build/transform.mjs';

// Cantidades por posición: TALLA1=1m, TALLA2=3m, TALLA3=6m, TALLA5=12m (según el tallaje).
const rows = [
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'AV. ARCADIO PARDIÑAS 98', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569', TALLA1:'1', TALLA2:'1' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Cereza', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'AV. ARCADIO PARDIÑAS 98', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569', TALLA3:'2' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'00529', NOMBRE_CLIENTE:'AVGF SL', NOMBRE_COMERCIAL_CLIENTE:'LA TRIBU', DIRECCION:'C/ REAL 1', LOCALIDAD:'AVILÉS', DESC_PROVINCIA:'Asturias', TELEFONO_CLIENTE:'985500000', TALLA5:'1' },
  // basura a excluir:
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'00135', NOMBRE_CLIENTE:'CONSUMIDOR FINAL', NOMBRE_COMERCIAL_CLIENTE:'', DIRECCION:'', LOCALIDAD:'', DESC_PROVINCIA:'Granada', TELEFONO_CLIENTE:'', TALLA1:'9' },
  { COD_SERIE_MODELO:'1000', DESC_COLOR:'Azul', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'x', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569', TALLA1:'1' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'CONCEPTO', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'x', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569', TALLA1:'1' },
];

const tallajeMap = new Map([['1619105', ['1m','3m','6m','9m','12m','18m','24m']]]);

test('excluye consumidor final, modelo 1000 y color CONCEPTO', () => {
  const idx = buildIndex(rows, new Map());
  assert.equal(idx.models.length, 1);
  assert.equal(idx.meta.boutiqueCount, 2);
  assert.ok(!idx.boutiques['00135']);
});

test('agrupa colores por modelo y por boutique', () => {
  const idx = buildIndex(rows, new Map());
  const m = idx.models[0];
  assert.equal(m.ref, '1619105');
  assert.deepEqual(m.colors, ['Bruma', 'Cereza']);
  const rosa = m.boutiques.find(b => b.cod === '07838');
  assert.deepEqual(rosa.colors, ['Bruma', 'Cereza']);
});

test('usa el catálogo para título/foto/handle, con fallback', () => {
  const cat = new Map([['1619105', { title:'Blusa Hojas', handle:'blusa-hojas', image:'https://img/x.jpg' }]]);
  const idx = buildIndex(rows, cat);
  assert.equal(idx.models[0].title, 'Blusa Hojas');
  assert.equal(idx.models[0].image, 'https://img/x.jpg');
  const idx2 = buildIndex(rows, new Map());
  assert.equal(idx2.models[0].title, 'Ref. 1619105');
  assert.equal(idx2.models[0].image, null);
});

test('provincias ordenadas y boutique con datos de contacto', () => {
  const idx = buildIndex(rows, new Map());
  assert.deepEqual(idx.provinces, ['Asturias', 'Lugo']);
  assert.equal(idx.boutiques['07838'].name, 'ROSA Y AZUL');
  assert.equal(idx.boutiques['07838'].phone, '982580569');
  assert.equal(idx.boutiques['07838'].city, 'BURELA');
});

test('buildTallajeMap mapea posición a etiqueta desde TALLAJE_n', () => {
  const map = buildTallajeMap([
    { COD_SERIE_MODELO:'1619105', TALLAJE_1:'1m', TALLAJE_2:'3m', TALLAJE_3:'6m', TALLAJE_7:'24m' },
    { COD_SERIE_MODELO:'1412007', TALLAJE_1:'U' },
  ]);
  assert.equal(map.get('1619105')[0], '1m');
  assert.equal(map.get('1619105')[6], '24m');
  assert.equal(map.get('1619105')[3], null); // TALLAJE_4 vacío
  assert.deepEqual(map.get('1412007')[0], 'U');
});

test('etiqueta las tallas servidas por modelo y por boutique con el tallaje', () => {
  const idx = buildIndex(rows, new Map(), new Set(), '', tallajeMap);
  const m = idx.models[0];
  // posiciones servidas: 1,2 (07838 Bruma) + 3 (07838 Cereza) + 5 (00529) → 1m,3m,6m,12m
  assert.deepEqual(m.sizes, ['1m', '3m', '6m', '12m']);
  const rosa = m.boutiques.find(b => b.cod === '07838');
  assert.deepEqual(rosa.sizes, ['1m', '3m', '6m']);
  const tribu = m.boutiques.find(b => b.cod === '00529');
  assert.deepEqual(tribu.sizes, ['12m']);
});

test('sin tallajeMap las tallas quedan vacías (sin romper)', () => {
  const idx = buildIndex(rows, new Map());
  assert.deepEqual(idx.models[0].sizes, []);
  assert.deepEqual(idx.models[0].boutiques[0].sizes, []);
});
