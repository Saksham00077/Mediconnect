const path = require('path');
const fs = require('fs');

let embeddedServer = null;

/**
 * Starts a persistent embedded MongoDB standalone instance.
 * Allows zero-setup local demoing if local mongod service is not pre-installed.
 */
const startEmbeddedMongo = async (port = 27017, dbName = 'mediconnect') => {
  if (embeddedServer) return embeddedServer;

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.resolve(__dirname, '../../.mongodb-data');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  embeddedServer = await MongoMemoryServer.create({
    instance: {
      port,
      dbName,
      dbPath,
      storageEngine: 'wiredTiger'
    }
  });

  return embeddedServer;
};

const stopEmbeddedMongo = async () => {
  if (embeddedServer) {
    await embeddedServer.stop();
    embeddedServer = null;
  }
};

module.exports = {
  startEmbeddedMongo,
  stopEmbeddedMongo
};

