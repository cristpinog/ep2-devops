import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

async function withApp(t) {
  const server = createApp();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('GET /health confirma disponibilidad', async (t) => {
  const response = await fetch(`${await withApp(t)}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'inventario', version: '1.0.0' });
});

test('GET /inventory devuelve existencias y disponibilidad', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const items = await response.json();
  assert.equal(items.length, 3);
  assert.deepEqual(items.map(({ available }) => available), [true, false, true]);
});

test('GET /inventory?available=true filtra productos con stock', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory?available=true`);
  assert.deepEqual((await response.json()).map(({ productId }) => productId), [1, 3]);
});

test('GET /inventory/2 devuelve un producto sin stock', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory/2`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { productId: 2, stock: 0, available: false });
});

test('GET /inventory/999 devuelve 404', async (t) => {
  assert.equal((await fetch(`${await withApp(t)}/inventory/999`)).status, 404);
});

test('POST /inventory/1/reserve descuenta stock', async (t) => {
  const base = await withApp(t);
  const response = await fetch(`${base}/inventory/1/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 2 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { productId: 1, stock: 10, available: true });
  assert.equal((await (await fetch(`${base}/inventory/1`)).json()).stock, 10);
});

test('Reserva rechaza cantidad invalida', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory/1/reserve`, {
    method: 'POST', body: JSON.stringify({ quantity: 0 }),
  });
  assert.equal(response.status, 400);
});

test('Reserva rechaza JSON malformado', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory/1/reserve`, { method: 'POST', body: '{' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'JSON no valido' });
});

test('Reserva bloquea cuando el stock es insuficiente', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory/3/reserve`, {
    method: 'POST', body: JSON.stringify({ quantity: 6 }),
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'Stock insuficiente', availableStock: 5 });
});

test('Reserva devuelve 404 para producto inexistente', async (t) => {
  const response = await fetch(`${await withApp(t)}/inventory/999/reserve`, {
    method: 'POST', body: JSON.stringify({ quantity: 1 }),
  });
  assert.equal(response.status, 404);
});

test('Una ruta inexistente devuelve 404', async (t) => {
  assert.equal((await fetch(`${await withApp(t)}/inexistente`)).status, 404);
});
