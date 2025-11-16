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
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
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

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist', 'public');
    
    if (!fs.existsSync(distPath)) {
      console.error(`❌ Build directory not found: ${distPath}`);
      console.error('Run "npm run build" first!');
      process.exit(1);
    }

    // Serve static assets
    app.use(express.static(distPath));

    // SPA fallback - serve index.html for all non-API routes
    app.use('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    console.log('✅ Serving static files from dist/public');
  } else {
    // Development mode - use Vite dev server
    try {
      // Dynamic import with template to prevent esbuild bundling
      const viteDevPath = './vite.dev.js';
      const { setupVite } = await import(viteDevPath);
      await setupVite(app, server);
    } catch (error: any) {
      console.error('❌ Failed to load Vite dev server (this is normal in production):', error.message);
      console.log('ℹ️ Running in production mode without Vite');
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
    const { startTelegramBot } = await import('./telegram-bot.ts');
    startTelegramBot().catch(err => {
      console.error('❌ Telegram bot failed:', err);
    });
  }

  // Discord bot
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== 'PLACEHOLDER_TOKEN' &&
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'PLACEHOLDER_ID') {
    const { startDiscordBot } = await import('./discord-bot.ts');
    startDiscordBot().catch(err => {
      console.error('❌ Discord bot failed:', err);
    });
  }

  // Alpha alerts
  if (process.env.ALPHA_ALERTS_ENABLED === 'true') {
    const { getAlphaAlertService } = await import('./alpha-alerts.ts');
    const alphaService = getAlphaAlertService();
    alphaService.start().catch(err => {
      console.error('❌ Alpha alerts failed:', err);
    });

    const { initializeWalletDiscovery } = await import('./wallet-scheduler.ts');
    initializeWalletDiscovery();
  }

  // Workers
  const { analyticsWorker } = await import('./workers/analytics-worker.ts');
  analyticsWorker.start();

  const { socialWorker } = await import('./workers/social-worker.ts');
  socialWorker.start();
}
