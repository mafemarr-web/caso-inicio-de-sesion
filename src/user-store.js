const fs = require('node:fs/promises');
const path = require('node:path');

function createUserStore(filePath) {
  let writeQueue = Promise.resolve();

  async function readUsers() {
    try {
      const contents = await fs.readFile(filePath, 'utf8');
      const users = JSON.parse(contents);
      if (!Array.isArray(users)) {
        throw new Error('El archivo de usuarios debe contener una lista.');
      }
      return users;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async function saveUsers(users) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(users, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    await fs.rename(temporaryPath, filePath);
  }

  return {
    async findByUsername(username) {
      const users = await readUsers();
      return users.find((user) => user.username === username) || null;
    },

    async create(user) {
      // Serializa registros para evitar que dos peticiones creen el mismo usuario.
      const operation = writeQueue.then(async () => {
        const users = await readUsers();
        if (users.some((existingUser) => existingUser.username === user.username)) {
          return false;
        }
        users.push(user);
        await saveUsers(users);
        return true;
      });

      writeQueue = operation.catch(() => {});
      return operation;
    },
  };
}

module.exports = { createUserStore };
