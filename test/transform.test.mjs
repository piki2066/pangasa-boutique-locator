import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../build/transform.mjs';

const rows = [
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'AV. ARCADIO PARDIÑAS 98', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Cereza', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'AV. ARCADIO PARDIÑAS 98', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'00529', NOMBRE_CLIENTE:'AVGF SL', NOMBRE_COMERCIAL_CLIENTE:'LA TRIBU', DIRECCION:'C/ REAL 1', LOCALIDAD:'AVILÉS', DESC_PROVINCIA:'Asturias', TELEFONO_CLIENTE:'985500000' },
  // basura a excluir:
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'Bruma', COD_CLIENTE:'00135', NOMBRE_CLIENTE:'CONSUMIDOR FINAL', NOMBRE_COMERCIAL_CLIENTE:'', DIRECCION:'', LOCALIDAD:'', DESC_PROVINCIA:'Granada', TELEFONO_CLIENTE:'' },
  { COD_SERIE_MODELO:'1000', DESC_COLOR:'Azul', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'x', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569' },
  { COD_SERIE_MODELO:'1619105', DESC_COLOR:'CONCEPTO', COD_CLIENTE:'07838', NOMBRE_CLIENTE:'NEIRA BEN PAULA', NOMBRE_COMERCIAL_CLIENTE:'ROSA Y AZUL', DIRECCION:'x', LOCALIDAD:'BURELA', DESC_PROVINCIA:'Lugo', TELEFONO_CLIENTE:'982580569' },
];

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
