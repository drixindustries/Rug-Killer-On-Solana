/**
 * Server entry point
 * Production-ready, no Vite dependencies
 */

// Prevent process from exiting on unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise);
  console.error('⚠️  Reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught Exception:', error);
  // Don't exit - log and continue
});

process.on('beforeExit', (code) => {
  console.log('⚠️  Process beforeExit event with code:', code);
});

process.on('exit', (code) => {
  console.log('⚠️  Process exit event with code:', code);
});

const bootstrap = async () => {
  console.log('🚀 Bootstrapping server...');
  const mod = await import('./app.ts');
  const server = await mod.startServer();
  console.log('✅ Server started successfully');
  
  // Keep the process alive
  setInterval(() => {
    // Heartbeat to prevent exit
  }, 1000);
  
  return server;
};

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
