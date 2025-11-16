/**
 * Production-ready Express server
 * Clean separation between development (Vite) and production (static files)
 */
import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes.ts";
import path from "path";
import fs from "fs";

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
  // Telegram bot
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER_TOKEN') {
    try {
      const { startTelegramBot } = await import('./telegram-bot.ts');
      startTelegramBot().catch(err => {
        console.error('❌ Telegram bot failed:', err);
      });
    } catch (err) {
      console.error('❌ Failed to load Telegram bot:', err);
    }
  }

  // Discord bot
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== 'PLACEHOLDER_TOKEN' &&
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'PLACEHOLDER_ID') {
    try {
      const { startDiscordBot } = await import('./discord-bot.ts');
      startDiscordBot().catch(err => {
        console.error('❌ Discord bot failed:', err);
      });
    } catch (err) {
      console.error('❌ Failed to load Discord bot:', err);
    }
  }

  // Alpha alerts
  if (process.env.ALPHA_ALERTS_ENABLED === 'true') {
    try {
      const { getAlphaAlertService } = await import('./alpha-alerts.ts');
      const alphaService = getAlphaAlertService();
      alphaService.start().catch(err => {
        console.error('❌ Alpha alerts failed:', err);
      });

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
