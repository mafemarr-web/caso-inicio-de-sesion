const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/server');
const { createUserStore } = require('../src/user-store');

let server;
let baseUrl;
let temporaryDirectory;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'api-autenticacion-'));
  const store = createUserStore(path.join(temporaryDirectory, 'usuarios.json'));
  server = createApp({ userStore: store });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

async function postJson(route, body) {
  return fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('registra un usuario y permite iniciar sesión con sus credenciales', async () => {
  const registration = await postJson('/api/auth/register', {
    usuario: 'Aprendiz01',
    contrasena: 'ClaveSegura123',
  });
  assert.equal(registration.status, 201);
  assert.deepEqual(await registration.json(), { mensaje: 'Registro satisfactorio.' });

  const secondRegistration = await postJson('/api/auth/register', {
    usuario: 'aprendiz02',
    contrasena: 'OtraClaveSegura123',
  });
  assert.equal(secondRegistration.status, 201);

  const savedUsers = JSON.parse(
    await fs.readFile(path.join(temporaryDirectory, 'usuarios.json'), 'utf8'),
  );
  assert.equal(savedUsers.length, 2);
  assert.notEqual(savedUsers[0].passwordHash, 'ClaveSegura123');

  const login = await postJson('/api/auth/login', {
    usuario: 'aprendiz01',
    contrasena: 'ClaveSegura123',
  });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { mensaje: 'Autenticacion satisfactoria.' });
});

test('rechaza una contraseña incorrecta y un usuario duplicado', async () => {
  const wrongPassword = await postJson('/api/auth/login', {
    usuario: 'aprendiz01',
    contrasena: 'OtraClave123',
  });
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await wrongPassword.json(), { mensaje: 'Error en la autenticacion.' });

  const duplicate = await postJson('/api/auth/register', {
    usuario: 'APRENDIZ01',
    contrasena: 'ClaveSegura123',
  });
  assert.equal(duplicate.status, 409);
});

test('valida campos y JSON mal formado', async () => {
  const invalidFields = await postJson('/api/auth/register', {
    usuario: 'ab',
    contrasena: 'corta',
  });
  assert.equal(invalidFields.status, 400);

  const malformedJson = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformedJson.status, 400);
});
