import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { createErrorGuards } from './middleware/errorHandler.js';

async function main() {
  createErrorGuards();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`SkillBridge API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`Allowed browser origins: ${env.clientOrigins.join(', ')}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start the API:', error.message);
  if (error.cause?.servers) {
    for (const [host, s] of error.cause.servers) {
      console.error(`[Shard ${host}] error:`, s.error?.message || s.error || 'no error');
    }
  }
  process.exit(1);
});


