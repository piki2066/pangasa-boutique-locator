import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnarToRows } from '../build/simss.mjs';

test('columnarToRows convierte vectores paralelos en filas', () => {
  const data = { A: [1, 2, 3], B: ['x', 'y', 'z'] };
  assert.deepEqual(columnarToRows(data), [
    { A: 1, B: 'x' }, { A: 2, B: 'y' }, { A: 3, B: 'z' },
  ]);
});

test('columnarToRows devuelve [] con data vacía', () => {
  assert.deepEqual(columnarToRows({}), []);
  assert.deepEqual(columnarToRows(null), []);
});
