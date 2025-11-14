// import './tracing'; // Disabled - dd-trace not needed for Railway deployment
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import https from 'https';
import fs from 'fs';

export const app = express();

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

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HTTPS === 'true') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    next();
  });
}

// Lightweight health endpoint for uptime checks and Render health probes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start bots only if credentials are configured
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER_TOKEN') {
    const { startTelegramBot } = await import('./telegram-bot');
    startTelegramBot().catch(err => {
      console.error('Failed to start Telegram bot:', err);
    });
  }
  
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== 'PLACEHOLDER_TOKEN' &&
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'PLACEHOLDER_ID') {
    const { startDiscordBot } = await import('./discord-bot');
    startDiscordBot().catch(err => {
      console.error('Failed to start Discord bot:', err);
    });
  }

  // Start alpha alert service if configured
  if (process.env.ALPHA_ALERTS_ENABLED === 'true') {
    const { getAlphaAlertService } = await import('./alpha-alerts');
    const alphaService = getAlphaAlertService();
    alphaService.start().catch(err => {
      console.error('Failed to start Alpha Alert service:', err);
    });
  }

  // Start analytics worker (always enabled for dashboard)
  const { analyticsWorker } = await import('./workers/analytics-worker');
  analyticsWorker.start();
  
  // Start social worker (always enabled for community features)
  const { socialWorker } = await import('./workers/social-worker');
  socialWorker.start();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Check if SSL certificates are available for HTTPS
  const sslKeyPath = process.env.SSL_KEY_PATH || './ssl/private.key.pem';
  const sslCertPath = process.env.SSL_CERT_PATH || './ssl/domain.cert.pem';
  const sslIntermediatePath = process.env.SSL_INTERMEDIATE_PATH || './ssl/intermediate.cert.pem';
  
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    // HTTPS server with SSL certificates
    const sslOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
      ca: fs.existsSync(sslIntermediatePath) ? fs.readFileSync(sslIntermediatePath) : undefined,
    };
    
    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(443, '0.0.0.0', () => {
      log(`🔒 HTTPS server running on port 443`);
    });
    
    // Also listen on HTTP for redirects
    server.listen({
      port: 80,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`📡 HTTP server running on port 80 (redirecting to HTTPS)`);
    });
  } else {
    // HTTP only (development or non-SSL environments)
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  }
})();
