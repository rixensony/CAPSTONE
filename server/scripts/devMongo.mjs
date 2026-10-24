/**
 * Optional helper for development: boots an in-memory MongoDB on port 27017
 * so the API can run without installing a local database. The data it serves
 * lives in RAM only — restart from `npm run seed` each session, or point
 * MONGODB_URI at your own mongod/Atlas for durable data.
 *
 *   npm run dev:mongo
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.argv[2] || 27017);

let stopping = false;
async function stopRuntime(mongod, signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n[dev-mongo] ${signal} — shutting down the in-memory database.`);
  try {
    await mongod.stop();
  } finally {
    process.exit(0);
  }
}

const mongod = await MongoMemoryServer.create({
  instance: { port, ip: '127.0.0.1', dbName: 'skillbridge' },
});

console.log(`[dev-mongo] in-memory MongoDB ready on port ${port}`);
console.log(`[dev-mongo] connection string: ${mongod.getUri()}`);
console.log('[dev-mongo] press Ctrl+C to stop. Data is NOT persisted across restarts.');

process.on('SIGINT', () => stopRuntime(mongod, 'SIGINT'));
process.on('SIGTERM', () => stopRuntime(mongod, 'SIGTERM'));
setInterval(() => undefined, 60_000); // keep the event loop alive
