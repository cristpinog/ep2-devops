import { createServer, request } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

async function listen(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function withApp(t, options) {
  return listen(t, createApp(options));
}

test('GET /health confirma disponibilidad y version', async (t) => {
  const response = await fetch(`${await withApp(t)}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'catalogo', version: '1.0.0' });
});

test('GET /products devuelve el catalogo en JSON y cabeceras seguras', async (t) => {
  const response = await fetch(`${await withApp(t)}/products`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const body = await response.json();
  assert.equal(body.length, 3);
  assert.ok(body.every((product) => product.id && product.name && product.price > 0));
});

test('Una ruta inexistente devuelve 404', async (t) => {
  const response = await fetch(`${await withApp(t)}/inexistente`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Ruta no encontrada' });
});

test('GET /products/2 devuelve solo el producto solicitado', async (t) => {
  const response = await fetch(`${await withApp(t)}/products/2`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 2, name: 'Lapiz', category: 'papeleria', price: 500 });
});

test('GET /products/999 devuelve 404 si no existe', async (t) => {
  const response = await fetch(`${await withApp(t)}/products/999`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Producto no encontrado' });
});

test('Filtra productos por categoria', async (t) => {
  const response = await fetch(`${await withApp(t)}/products?category=papeleria`);
  assert.deepEqual((await response.json()).map((product) => product.id), [1, 2]);
});

test('Normaliza mayusculas y espacios del filtro', async (t) => {
  const response = await fetch(`${await withApp(t)}/products?category=%20TECNOLOGIA%20`);
  assert.deepEqual((await response.json()).map((product) => product.id), [3]);
});

test('Una URL malformada devuelve 400 y el servidor sigue disponible', async (t) => {
  const base = await withApp(t);
  const { hostname, port } = new URL(base);
  const result = await new Promise((resolve, reject) => {
    const req = request({ hostname, port, path: '//[', method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(result.status, 400);
  assert.deepEqual(JSON.parse(result.body), { error: 'URL no valida' });
  assert.equal((await fetch(`${base}/health`)).status, 200);
});

test('Consulta disponibilidad al microservicio de inventario', async (t) => {
  const inventory = createServer((req, res) => {
    assert.equal(req.url, '/inventory/2');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ productId: 2, stock: 0, available: false }));
  });
  const inventoryUrl = await listen(t, inventory);
  const catalogUrl = await withApp(t, { inventoryUrl });
  const response = await fetch(`${catalogUrl}/products/2/availability`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.product.id, 2);
  assert.equal(body.inventory.available, false);
});

test('Disponibilidad devuelve 404 para producto inexistente', async (t) => {
  const response = await fetch(`${await withApp(t)}/products/999/availability`);
  assert.equal(response.status, 404);
});

test('Disponibilidad devuelve 503 si inventario no responde', async (t) => {
  const base = await withApp(t, { inventoryUrl: 'http://127.0.0.1:1' });
  const response = await fetch(`${base}/products/1/availability`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Inventario no disponible' });
});
