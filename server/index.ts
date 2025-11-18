/**
 * Server entry point
 * Production-ready, no Vite dependencies
 */

// Suppress noisy crypto library warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  // Only show important warnings, filter out known harmless ones
  if (warning.message.includes('bigint: Failed to load bindings')) return;
  if (warning.message.includes('DeprecationWarning')) return;
  console.warn(warning.name, warning.message);
});

console.log('========================================');
console.log('🚀 SERVER STARTING - index.ts loaded');
console.log('Node version:', process.version);
console.log('========================================');

// Try to load .env if it exists (local dev), but don't fail if it doesn't (Railway)
try {
  const dotenv = await import('dotenv');
  const path = await import('path');
  const envPath = path.join(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log('ℹ️  No .env file found (Railway mode)');
  } else {
    console.log('✅ dotenv loaded from:', envPath);
    console.log('✅ Loaded', Object.keys(result.parsed || {}).length, 'environment variables');
  }
} catch (e) {
  console.log('ℹ️  No dotenv (Railway mode)');
}

// Log startup environment. Avoid dumping env keys in production to prevent accidental leakage
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('💾 Database Mode:', process.env.FORCE_IN_MEMORY_DB === 'true' ? 'IN-MEMORY' : 'PostgreSQL');
console.log('🔌 Port:', process.env.PORT || '5000');
if (process.env.NODE_ENV !== 'production') {
  console.log('📋 All ENV vars:', Object.keys(process.env).join(', '));
} else {
  console.log('📋 Env var count:', Object.keys(process.env).length);
}

// Prevent process from exiting on unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise);
  console.error('⚠️  Reason:', reason);
  // Don't exit - log and continue (allows server to stay running with degraded services)
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught Exception:', error);
  // Don't exit - log and continue (allows server to stay running with degraded services)
});

const bootstrap = async () => {
  console.log('🚀 Bootstrapping server...');
  
  try {
    const mod = await import('./app.ts');
    const server = await mod.startServer();
    console.log('✅ Server started successfully');
    
    // Keep the process alive
    setInterval(() => {
      // Heartbeat to prevent exit
    }, 1000);
    
    return server;
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Stack:', err instanceof Error ? err.stack : 'No stack trace');
    throw err;
  }
};

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
