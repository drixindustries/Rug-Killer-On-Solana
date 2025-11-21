/**
 * Webhook Routes
 * Handle incoming webhooks from Helius, QuickNode, and other providers
 */

import { Router, Request, Response } from 'express';
import { heliusWebhook } from './services/helius-webhook.ts';
import { quickNodeWebhook } from './services/quicknode-webhook.ts';
import { pumpFunWebhook } from './services/pumpfun-webhook.ts';

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
      // TODO: Implement signature verification
    }

    // Process the webhook payload
    await heliusWebhook.processWebhook(payload);
    
    res.status(200).json({ success: true, processed: Array.isArray(payload) ? payload.length : 1 });
  } catch (error: any) {
    console.error('[Webhook] Helius webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * QuickNode Streams Webhook Endpoint
 * POST /api/webhooks/quicknode
 */
router.post('/quicknode', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received QuickNode stream webhook');
    
    const payload = req.body;
    
    // Validate webhook signature if secret is configured
    const webhookSecret = process.env.QUICKNODE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-qn-signature'] as string;
      // TODO: Implement signature verification
    }

    // Process the stream event
    await quickNodeWebhook.processWebhook(payload);
    
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] QuickNode webhook error:', error);
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
    quicknode: quickNodeWebhook.getStatus(),
    pumpfun: pumpFunWebhook.getStatus(),
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
