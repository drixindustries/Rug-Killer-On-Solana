/**
 * Production-ready Express server
 * Clean separation between development (Vite) and production (static files)
 */
import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes.ts";
import path from "path";
import fs from "fs";
import { storage } from './storage.ts';

export const app = express();

// Session middleware for wallet authentication
const SESSION_SECRET = process.env.SESSION_SECRET || 'railway-fallback-secret-' + Date.now();
console.log('🔑 Using session secret:', SESSION_SECRET.substring(0, 10) + '...');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Allow cookies in same-site navigation
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
}));

// Request body parsing
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    if (reqPath.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`${req.method} ${reqPath} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

export async function startServer() {
  // Register API routes
  const server = await registerRoutes(app);

  // Serve static files in production (if available)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist', 'public');
    
    if (fs.existsSync(distPath)) {
      // Serve static assets
      app.use(express.static(distPath));

      // SPA fallback - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        // Don't serve SPA for API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
      
      console.log('✅ Serving static files from dist/public');
    } else {
      console.log('ℹ️ No frontend build found - running API-only mode');
      console.log('ℹ️ This is normal for Railway backend deployment');
      
      // Simple root endpoint for API-only mode
      app.get('/', (_req, res) => {
        res.json({
          message: 'Rug Killer API Server',
          status: 'online',
          endpoints: {
            health: '/api/health',
            docs: 'https://github.com/drixindustries/Rug-Killer-On-Solana'
          }
        });
      });
    }
  } else {
    // Development mode - use Vite dev server
    try {
      // Dynamic import with template to prevent esbuild bundling
      const viteDevPath = './vite.dev.js';
      const { setupVite } = await import(viteDevPath);
      await setupVite(app, server);
    } catch (error: any) {
      console.warn('⚠️  Failed to load Vite dev server:', error.message);
      console.log('ℹ️ Running in API-only mode');
      
      // Simple root endpoint for API-only mode
      app.get('/', (_req, res) => {
        res.json({
          message: 'Rug Killer API Server',
          status: 'online',
          mode: 'development',
          endpoints: {
            health: '/api/health',
            docs: 'https://github.com/drixindustries/Rug-Killer-On-Solana'
          }
        });
      });
    }
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Error:', err);
    res.status(status).json({ message });
  });

  // Start services
  await startServices();

  // Listen on port
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 http://localhost:${port}`);
  });

  return server;
}

async function startServices() {
  // Telegram bot (optional)
  if (
    (process.env.TELEGRAM_ENABLED || '').toLowerCase() === 'true' &&
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER_TOKEN'
  ) {
    try {
      // Use webhook mode if URL is configured (for Railway)
      if (process.env.TELEGRAM_WEBHOOK_URL) {
        console.log('🔗 Starting Telegram bot in webhook mode');
        const { startTelegramBotWebhook } = await import('./telegram-bot.ts');
        await startTelegramBotWebhook(process.env.TELEGRAM_WEBHOOK_URL);
      } else {
        // Use polling mode (for local development)
        console.log('📡 Starting Telegram bot in polling mode');
        const { startTelegramBot } = await import('./telegram-bot.ts');
        startTelegramBot().catch((err: any) => {
          console.warn('⚠️ Telegram bot unavailable (silenced):', err?.message || String(err));
        });
      }
    } catch (err: any) {
      console.warn('⚠️ Telegram bot not loaded (silenced):', err?.message || String(err));
    }
  } else {
    console.log('ℹ️ Telegram bot disabled (set TELEGRAM_ENABLED=true to enable)');
  }

  // Discord bot (optional)
  const rawToken = process.env.DISCORD_BOT_TOKEN;
  const trimmedToken = rawToken?.trim();
  console.log('🔍 Discord check - DISCORD_ENABLED:', process.env.DISCORD_ENABLED);
  console.log('🔍 Discord check - RAW BOT_TOKEN length:', rawToken?.length || 0);
  console.log('🔍 Discord check - TRIMMED BOT_TOKEN length:', trimmedToken?.length || 0);
  console.log('🔍 Discord check - BOT_TOKEN has quotes?:', rawToken?.startsWith('"') || rawToken?.startsWith("'"));
  console.log('🔍 Discord check - BOT_TOKEN has spaces?:', rawToken !== trimmedToken);
  console.log('🔍 Discord check - BOT_TOKEN first 10 chars:', trimmedToken?.substring(0, 10) || 'NONE');
  console.log('🔍 Discord check - CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
  
  // Clean the token - remove quotes and trim spaces
  const cleanToken = trimmedToken?.replace(/^["']|["']$/g, '');
  
  if (
    (process.env.DISCORD_ENABLED || '').toLowerCase() === 'true' &&
    cleanToken && cleanToken.length > 10 &&
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'PLACEHOLDER_ID'
  ) {
    try {
      const { startDiscordBot } = await import('./discord-bot.ts');
      startDiscordBot().catch((err: any) => {
        console.warn('⚠️ Discord bot unavailable (silenced):', err?.message || String(err));
      });
    } catch (err: any) {
      console.warn('⚠️ Discord bot not loaded (silenced):', err?.message || String(err));
    }
  } else {
    console.log('ℹ️ Discord bot disabled (set DISCORD_ENABLED=true to enable)');
  }

  // Alpha alerts
  if (process.env.ALPHA_ALERTS_ENABLED === 'true') {
    try {
      const { getAlphaAlertService } = await import('./alpha-alerts.ts');
      const alphaService = getAlphaAlertService();
      alphaService.start().catch(err => {
        console.error('❌ Alpha alerts failed:', err);
      });

      // Note: Alpha alert callbacks are now registered in discord-bot.ts and telegram-bot.ts
      // Each bot handles its own platform's alert delivery when it's ready
      console.log('✅ Alpha alerts service started - callbacks handled by individual bots');

      const { initializeWalletDiscovery } = await import('./wallet-scheduler.ts');
      initializeWalletDiscovery();
    } catch (err) {
      console.error('❌ Failed to load Alpha alerts:', err);
    }
  }

  // Workers - optional, gracefully handle failures
  try {
    const { analyticsWorker } = await import('./workers/analytics-worker.ts');
    analyticsWorker.start();
  } catch (err: any) {
    console.warn('⚠️ Analytics worker not available:', err.message);
  }

  try {
    const { socialWorker } = await import('./workers/social-worker.ts');
    socialWorker.start();
  } catch (err: any) {
    console.warn('⚠️ Social worker not available:', err.message);
  }
}
