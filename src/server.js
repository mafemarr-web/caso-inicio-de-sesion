const http = require('node:http');
const path = require('node:path');
const { AuthError, createAuthService } = require('./auth-service');
const { createUserStore } = require('./user-store');

const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new AuthError('El contenido de la solicitud supera el limite permitido.', 413);
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AuthError('El cuerpo debe ser un JSON valido.', 400);
  }
}

function createApp({ userStore } = {}) {
  const store = userStore || createUserStore(
    process.env.DATA_FILE || path.join(process.cwd(), 'data', 'usuarios.json'),
  );
  const authService = createAuthService(store);

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(response, 200, { estado: 'disponible' });
      }

      if (
        request.method === 'POST'
        && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')
      ) {
        const body = await readJsonBody(request);
        const result = url.pathname.endsWith('/register')
          ? await authService.register(body)
          : await authService.login(body);
        return sendJson(response, url.pathname.endsWith('/register') ? 201 : 200, result);
      }

      return sendJson(response, 404, { mensaje: 'Ruta no encontrada.' });
    } catch (error) {
      if (error instanceof AuthError) {
        return sendJson(response, error.statusCode, { mensaje: error.message });
      }

      // Los errores inesperados quedan registrados sin exponer detalles al cliente.
      console.error('Error interno del servicio:', error);
      return sendJson(response, 500, { mensaje: 'Ocurrio un error interno del servicio.' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createApp();

  server.listen(port, () => {
    console.log(`API de autenticacion disponible en http://localhost:${port}`);
  });
}

module.exports = { createApp };
