# API de registro e inicio de sesión

Proyecto académico para la evidencia de **Construcción API**. Implementa un servicio web HTTP en Node.js para registrar usuarios y autenticar sus credenciales.

## Diseño

- **Servidor:** Node.js y el módulo HTTP nativo.
- **Rutas:** registro (`POST /api/auth/register`), inicio de sesión (`POST /api/auth/login`) y estado (`GET /api/health`).
- **Datos:** archivo JSON local en `data/usuarios.json`, creado al registrar el primer usuario.
- **Seguridad básica:** las contraseñas nunca se guardan en texto plano; se derivan con `scrypt` y una sal aleatoria. Los errores de autenticación no revelan si el usuario existe.
- **Componentes:** `server.js` recibe y responde solicitudes; `auth-service.js` valida y autentica; `user-store.js` persiste los usuarios.

> El archivo JSON sirve para una práctica local. Para publicar un servicio real, se recomienda usar una base de datos, HTTPS, controles contra intentos repetidos y un mecanismo de sesión o token.

## Requisitos

- Node.js 18 o posterior.
- Git (opcional para ejecutar; necesario para el versionamiento del proyecto).

## Ejecución

Desde esta carpeta:

```powershell
npm start
```

El servicio queda disponible en `http://localhost:3000`. Se puede cambiar el puerto con la variable `PORT` y la ubicación del archivo de datos con `DATA_FILE`.

## Rutas y ejemplos

### Registrar usuario

`POST /api/auth/register`

```json
{
  "usuario": "aprendiz01",
  "contrasena": "ClaveSegura123"
}
```

Respuesta satisfactoria (`201`):

```json
{
  "mensaje": "Registro satisfactorio."
}
```

El usuario debe tener entre 3 y 32 caracteres (letras, números, punto, guion o guion bajo) y la contraseña entre 8 y 128 caracteres. Los usuarios no distinguen mayúsculas de minúsculas. Un usuario ya registrado produce `409`.

### Iniciar sesión

`POST /api/auth/login`

```json
{
  "usuario": "aprendiz01",
  "contrasena": "ClaveSegura123"
}
```

Respuesta satisfactoria (`200`):

```json
{
  "mensaje": "Autenticacion satisfactoria."
}
```

Si las credenciales no coinciden, responde `401`:

```json
{
  "mensaje": "Error en la autenticacion."
}
```

### Consultar estado

`GET /api/health` responde `200` mientras el servicio está disponible.

Todas las solicitudes que envían datos deben usar `Content-Type: application/json`. El cuerpo tiene un límite de 16 KB.

## Pruebas

Ejecuta las pruebas automatizadas con:

```powershell
npm test
```

Las pruebas usan un archivo temporal y no modifican los datos de ejecución.

## Versionamiento con Git

Este proyecto tiene su propio repositorio Git. Para registrar cambios posteriores:

```powershell
git status
git add .
git commit -m "Describe el cambio realizado"
git log --oneline
```
