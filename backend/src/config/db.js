const mongoose = require('mongoose');
const { startEmbeddedMongo } = require('./embeddedMongo');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('FATAL: MONGO_URI is missing from environment variables.');
    process.exit(1);
  }

  // Attempt direct connection first (e.g. system MongoDB service or MongoDB Atlas)
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (initialErr) {
    // If local MongoDB is not running on port 27017, start persistent standalone instance
    if (mongoUri.includes('127.0.0.1:27017') || mongoUri.includes('localhost:27017')) {
      console.log('[MongoDB] Local MongoDB on port 27017 not detected. Launching persistent standalone MongoDB instance...');
      try {
        await startEmbeddedMongo(27017, 'mediconnect');
        const conn = await mongoose.connect(mongoUri);
        console.log(`[MongoDB] Embedded Standalone MongoDB online & connected: ${mongoUri}`);
        return conn;
      } catch (embeddedErr) {
        console.error(`[MongoDB] Embedded MongoDB startup failed: ${embeddedErr.message}`);
        process.exit(1);
      }
    } else {
      console.error(`[MongoDB] Connection failed: ${initialErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
