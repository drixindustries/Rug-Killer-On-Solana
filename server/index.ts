/**
 * Server entry point
 * Production-ready, no Vite dependencies
 */
const bootstrap = async () => {
  const mod = await import('./app.ts');
  await mod.startServer();
};

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
