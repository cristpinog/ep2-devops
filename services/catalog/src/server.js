import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const products = [
  { id: 1, name: 'Cuaderno', category: 'papeleria', price: 2500 },
  { id: 2, name: 'Lapiz', category: 'papeleria', price: 500 },
  { id: 3, name: 'Mouse', category: 'tecnologia', price: 12000 },
];

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

export function createApp({ inventoryUrl = process.env.INVENTORY_URL || 'http://inventory:3001' } = {}) {
  return createServer(async (req, res) => {
    try {
      let url;
      try {
        url = new URL(req.url, 'http://localhost');
      } catch {
        sendJson(res, 400, { error: 'URL no valida' });
        return;
      }

      const path = url.pathname;
      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { status: 'ok', service: 'catalogo', version: '1.0.0' });
        return;
      }
      if (req.method === 'GET' && path === '/products') {
        const category = url.searchParams.get('category');
        const body = category === null
          ? products
          : products.filter((item) => item.category === category.trim().toLowerCase());
        sendJson(res, 200, body);
        return;
      }

      const availabilityMatch = path.match(/^\/products\/([1-9]\d*)\/availability$/);
      if (req.method === 'GET' && availabilityMatch) {
        const id = Number(availabilityMatch[1]);
        const product = products.find((item) => item.id === id);
        if (!product) {
          sendJson(res, 404, { error: 'Producto no encontrado' });
          return;
        }
        try {
          const response = await fetch(`${inventoryUrl}/inventory/${id}`, {
            signal: AbortSignal.timeout(1500),
          });
          if (!response.ok) throw new Error(`Inventario respondio ${response.status}`);
          sendJson(res, 200, { product, inventory: await response.json() });
        } catch {
          sendJson(res, 503, { error: 'Inventario no disponible' });
        }
        return;
      }

      if (req.method === 'GET' && /^\/products\/[1-9]\d*$/.test(path)) {
        const id = Number(path.split('/')[2]);
        const product = products.find((item) => item.id === id);
        sendJson(res, product ? 200 : 404, product ?? { error: 'Producto no encontrado' });
        return;
      }
      sendJson(res, 404, { error: 'Ruta no encontrada' });
    } catch {
      sendJson(res, 500, { error: 'Error interno' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`Catalogo disponible en http://0.0.0.0:${port}`);
  });
}
