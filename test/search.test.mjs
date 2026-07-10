import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, searchModels, resolveBoutiques, mapsUrl, telHref, formatPhone } from '../web/search.js';

const models = [
  { ref:'1619105', title:'Blusa Hojas C.Volante', boutiques:[{cod:'07838',colors:['Bruma']},{cod:'00529',colors:['Bruma']}] },
  { ref:'1406009', title:'Trenka Luxury', boutiques:[{cod:'07838',colors:['Marfil']}] },
];
const boutiques = {
  '07838': { name:'ROSA Y AZUL', address:'AV. ARCADIO 98', city:'BURELA', province:'Lugo', phone:'982580569' },
  '00529': { name:'LA TRIBU', address:'C/ REAL 1', city:'AVILÉS', province:'Asturias', phone:'985500000' },
};

test('normalize quita acentos y baja a minúsculas', () => {
  assert.equal(normalize('AVILÉS'), 'aviles');
});

test('searchModels busca por título (sin acentos) y por referencia', () => {
  assert.equal(searchModels(models, 'blusa').length, 1);
  assert.equal(searchModels(models, '1406').length, 1);
  assert.equal(searchModels(models, '').length, 2);
  assert.equal(searchModels(models, 'zzz').length, 0);
});

test('resolveBoutiques resuelve contacto y filtra por provincia', () => {
  const all = resolveBoutiques(models[0], boutiques, '');
  assert.equal(all.length, 2);
  assert.equal(all[0].province, 'Asturias'); // orden por provincia
  const lugo = resolveBoutiques(models[0], boutiques, 'Lugo');
  assert.equal(lugo.length, 1);
  assert.equal(lugo[0].name, 'ROSA Y AZUL');
});

test('mapsUrl / telHref / formatPhone', () => {
  assert.ok(mapsUrl('ROSA Y AZUL', 'BURELA').includes('ROSA%20Y%20AZUL%20BURELA'));
  assert.equal(telHref('982 58 05 69'), 'tel:982580569');
  assert.equal(formatPhone('982580569'), '982 58 05 69');
});
