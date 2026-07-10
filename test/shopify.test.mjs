import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogProducts } from '../build/shopify.mjs';

test('mapea ref (tag) → título/handle/imagen', () => {
  const products = [
    { title:'Blusa Hojas', handle:'blusa-hojas', tags:['OI26','1619105','blusas'], featuredImage:{ url:'https://img/a.jpg' } },
    { title:'Trenka Luxury', handle:'trenka', tags:['1406009'], featuredImage:null },
    { title:'Sin ref servida', handle:'x', tags:['9999999'], featuredImage:{ url:'https://img/z.jpg' } },
  ];
  const refs = new Set(['1619105', '1406009']);
  const map = parseCatalogProducts(products, refs);
  assert.equal(map.size, 2);
  assert.deepEqual(map.get('1619105'), { title:'Blusa Hojas', handle:'blusa-hojas', image:'https://img/a.jpg' });
  assert.equal(map.get('1406009').image, null);
  assert.ok(!map.has('9999999'));
});

test('acepta tags como string separada por comas', () => {
  const products = [{ title:'X', handle:'x', tags:'1619105, otro', featuredImage:null }];
  const map = parseCatalogProducts(products, new Set(['1619105']));
  assert.equal(map.get('1619105').title, 'X');
});
