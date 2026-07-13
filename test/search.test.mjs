import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, searchModels, resolveBoutiques, mapsUrl, telHref, formatPhone } from '../web/search.js';

const models = [
  { ref:'1619105', title:'Blusa Hojas C.Volante', boutiques:[
    { cod:'07838', colors:['Bruma'], sizes:['1m','3m','6m'] },
    { cod:'00529', colors:['Bruma'], sizes:['12m'] },
  ] },
  { ref:'1406009', title:'Trenka Luxury', boutiques:[{ cod:'07838', colors:['Marfil'], sizes:['3M'] }] },
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

test('resolveBoutiques resuelve contacto, tallas y filtra por provincia', () => {
  const all = resolveBoutiques(models[0], boutiques, '');
  assert.equal(all.length, 2);
  assert.equal(all[0].province, 'Asturias'); // orden por provincia
  assert.deepEqual(all[1].sizes, ['1m','3m','6m']); // tallas de la boutique presentes
  const lugo = resolveBoutiques(models[0], boutiques, 'Lugo');
  assert.equal(lugo.length, 1);
  assert.equal(lugo[0].name, 'ROSA Y AZUL');
});

test('resolveBoutiques filtra por talla', () => {
  const t12 = resolveBoutiques(models[0], boutiques, '', '12m');
  assert.equal(t12.length, 1);
  assert.equal(t12[0].name, 'LA TRIBU');
  const t3 = resolveBoutiques(models[0], boutiques, '', '3m');
  assert.equal(t3.length, 1);
  assert.equal(t3[0].name, 'ROSA Y AZUL');
  // provincia + talla combinadas: 12m solo en Asturias
  assert.equal(resolveBoutiques(models[0], boutiques, 'Lugo', '12m').length, 0);
});

test('mapsUrl / telHref / formatPhone', () => {
  // dirección de envío completa: nombre, calle, CP ciudad
  const u = mapsUrl({ name:'ROSA Y AZUL', address:'AV. ARCADIO PARDIÑAS 98', postal:'27880', city:'BURELA' });
  assert.ok(u.includes(encodeURIComponent('ROSA Y AZUL, AV. ARCADIO PARDIÑAS 98, 27880 BURELA')));
  // sin dirección → cae a nombre + ciudad
  assert.ok(mapsUrl({ name:'X', city:'LUGO' }).includes(encodeURIComponent('X, LUGO')));
  assert.equal(telHref('982 58 05 69'), 'tel:982580569');
  assert.equal(formatPhone('982580569'), '982 58 05 69');
});
