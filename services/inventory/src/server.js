import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const initialInventory = [
  { productId: 1, stock: 12 },
  { productId: 2, stock: 0 },
  { productId: 3, stock: 5 },
];

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function view(item) {
  return { ...item, available: item.stock > 0 };
}

async function readJson(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 1024) throw new Error('Cuerpo demasiado grande');
  }
  return JSON.parse(data || '{}');
}

export function createApp() {
  const inventory = initialInventory.map((item) => ({ ...item }));
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;

      if (req.method === 'GET' && path === '/health') {
        sendJson(res, 200, { status: 'ok', service: 'inventario', version: '1.0.0' });
        return;
      }
      if (req.method === 'GET' && path === '/inventory') {
        const available = url.searchParams.get('available');
        const items = available === null
          ? inventory
          : inventory.filter((item) => (item.stock > 0) === (available.toLowerCase() === 'true'));
        sendJson(res, 200, items.map(view));
        return;
      }

      const itemMatch = path.match(/^\/inventory\/([1-9]\d*)$/);
      if (req.method === 'GET' && itemMatch) {
        const item = inventory.find(({ productId }) => productId === Number(itemMatch[1]));
        sendJson(res, item ? 200 : 404, item ? view(item) : { error: 'Inventario no encontrado' });
        return;
      }

      const reserveMatch = path.match(/^\/inventory\/([1-9]\d*)\/reserve$/);
      if (req.method === 'POST' && reserveMatch) {
        const item = inventory.find(({ productId }) => productId === Number(reserveMatch[1]));
        if (!item) {
          sendJson(res, 404, { error: 'Inventario no encontrado' });
          return;
        }
        let body;
        try {
          body = await readJson(req);
        } catch {
          sendJson(res, 400, { error: 'JSON no valido' });
          return;
        }
        if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
          sendJson(res, 400, { error: 'Cantidad no valida' });
          return;
        }
        if (body.quantity > item.stock) {
          sendJson(res, 409, { error: 'Stock insuficiente', availableStock: item.stock });
          return;
        }
        item.stock -= body.quantity;
        sendJson(res, 200, view(item));
        return;
      }

      sendJson(res, 404, { error: 'Ruta no encontrada' });
    } catch {
      sendJson(res, 400, { error: 'Solicitud no valida' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`Inventario disponible en http://0.0.0.0:${port}`);
  });
}
