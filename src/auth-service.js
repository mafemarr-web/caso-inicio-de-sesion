const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);

class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

// Convierte errores del dominio en respuestas HTTP claras y controladas.
function invalidRequest(message) {
  throw new AuthError(message, 400);
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function passwordMatches(password, storedHash) {
  const [saltHex, keyHex] = storedHash.split(':');
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');
  const actualKey = await scrypt(password, salt, expectedKey.length);

  return actualKey.length === expectedKey.length && timingSafeEqual(actualKey, expectedKey);
}

function createAuthService(userStore) {
  return {
    async register({ usuario, contrasena } = {}) {
      if (typeof usuario !== 'string' || typeof contrasena !== 'string') {
        invalidRequest('Debe enviar usuario y contrasena como texto.');
      }

      const username = normalizeUsername(usuario);
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
        invalidRequest('El usuario debe tener entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo.');
      }
      if (contrasena.length < 8 || contrasena.length > 128) {
        invalidRequest('La contrasena debe tener entre 8 y 128 caracteres.');
      }

      const user = {
        id: randomBytes(16).toString('hex'),
        username,
        passwordHash: await hashPassword(contrasena),
      };

      const created = await userStore.create(user);
      if (!created) {
        throw new AuthError('El usuario ya está registrado.', 409);
      }

      return { mensaje: 'Registro satisfactorio.' };
    },

    async login({ usuario, contrasena } = {}) {
      if (typeof usuario !== 'string' || typeof contrasena !== 'string') {
        invalidRequest('Debe enviar usuario y contrasena como texto.');
      }

      const username = normalizeUsername(usuario);
      const user = await userStore.findByUsername(username);
      const authenticated = user
        ? await passwordMatches(contrasena, user.passwordHash)
        : false;

      if (!authenticated) {
        throw new AuthError('Error en la autenticacion.', 401);
      }

      return { mensaje: 'Autenticacion satisfactoria.' };
    },
  };
}

module.exports = { AuthError, createAuthService };
