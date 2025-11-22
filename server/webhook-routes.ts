/**
 * Webhook Routes
 * Handle incoming webhooks from Helius and other providers
 */

import { Router, Request, Response } from 'express';
import { heliusWebhook } from './services/helius-webhook.ts';
import { pumpFunWebhook } from './services/pumpfun-webhook.ts';
import { createHmac, timingSafeEqual } from 'node:crypto';

type RequestWithRawBody = Request & { rawBody?: unknown };

function getRawBody(req: Request): unknown {
  return (req as RequestWithRawBody).rawBody;
}

function toBuffer(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  try {
    return Buffer.from(JSON.stringify(data));
  } catch (error) {
    console.warn('[Webhook] Failed to serialise request body for signature verification:', error);
    return null;
  }
}

function decodeSignature(signature: string): Buffer | null {
  const trimmed = signature.trim();
  if (!trimmed) return null;
  try {
    return Buffer.from(trimmed, 'base64');
  } catch (_) {
    // fall through
  }
  const hexMatch = /^[0-9a-fA-F]+$/.test(trimmed);
  if (hexMatch && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, 'hex');
  }
  return null;
}

function verifySignature({
  rawBody,
  signature,
  secret,
  provider,
}: {
  rawBody: unknown;
  signature: string | undefined;
  secret: string;
  provider: 'helius';
}): boolean {
  if (!signature) {
    console.warn(`[Webhook] Missing signature header for ${provider} webhook`);
    return false;
  }

  const bodyBuffer = toBuffer(rawBody);
  if (!bodyBuffer) {
    console.warn(`[Webhook] Missing raw body for ${provider} signature verification`);
    return false;
  }

  const provided = decodeSignature(signature);
  if (!provided) {
    console.warn(`[Webhook] Unable to decode ${provider} signature header`);
    return false;
  }

  const expected = createHmac('sha256', secret).update(bodyBuffer).digest();

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

const router = Router();

/**
 * Helius Webhook Endpoint
 * POST /api/webhooks/helius
 */
router.post('/helius', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Helius webhook');

    const payload = req.body;

    // Validate webhook signature if secret is configured
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-helius-signature'] as string;
      const isValid = verifySignature({
        rawBody: getRawBody(req),
        signature,
        secret: webhookSecret,
        provider: 'helius',
      });

      if (!isValid) {
        console.warn('[Webhook] Rejected Helius webhook - invalid signature');
        return res.status(401).json({ error: 'Invalid Helius signature' });
      }
    }

    // Respond immediately to prevent timeout
    res.status(200).json({ success: true, received: Array.isArray(payload) ? payload.length : 1 });
    
    // Process the webhook payload asynchronously (fire-and-forget)
    heliusWebhook.processWebhook(payload).catch(err => {
      console.error('[Webhook] Helius processing error:', err);
    });
  } catch (error: any) {
    console.error('[Webhook] Helius webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pump.fun Webhook Endpoint (if they add HTTP webhooks in future)
 * POST /api/webhooks/pumpfun
 */
router.post('/pumpfun', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Pump.fun webhook');
    
    const payload = req.body;
    
    // Emit event to pump.fun service
    pumpFunWebhook.emit('webhook_received', payload);
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Pump.fun webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generic Webhook Health Check
 * GET /api/webhooks/health
 */
router.get('/health', (req: Request, res: Response) => {
  const status = {
    helius: heliusWebhook.getStatus(),
    timestamp: Date.now(),
  };
  
  res.json(status);
});

/**
 * Webhook Test Endpoint (development only)
 * POST /api/webhooks/test
 */
router.post('/test', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint disabled in production' });
  }

  try {
    console.log('[Webhook] Test webhook received:', req.body);
    res.json({ success: true, received: req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
