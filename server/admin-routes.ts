/**
 * Database Migration API Endpoint
 * Access via: POST /api/admin/migrate?token=YOUR_TOKEN
 */

import { Router, Request, Response } from 'express';
import { pool } from './db';
import fs from 'fs';
import path from 'path';

const router = Router();

// Simple token auth for admin endpoints
const ADMIN_TOKEN = process.env.DEBUG_ENDPOINTS_TOKEN || 'test-alpha-2025';

router.post('/migrate', async (req: Request, res: Response) => {
  try {
    // Auth check
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Migration] Starting database migration...');

    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Run smart_wallets migration
    // Working directory is /app/server, migrations are in /app/migrations
    const migrationPath = path.join(process.cwd(), '..', 'migrations', '20251121_create_smart_wallets_and_signals.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);
    console.log('[Migration] ✅ Smart wallets tables created');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('smart_wallets', 'smart_signals', 'kol_wallets', 'alpha_alert_targets', 'smart_alert_targets')
    `);

    const tables = result.rows.map(r => r.table_name);

    res.json({
      success: true,
      message: 'Migration completed',
      tables,
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  }
});

// Check database status
router.get('/db-status', async (req: Request, res: Response) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get all tables
    const result = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    res.json({
      success: true,
      tables: result.rows,
      totalTables: result.rows.length,
    });

  } catch (error: any) {
    console.error('[DB Status] Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  }
});

// Generate redemption codes
router.post('/codes/generate', async (req: Request, res: Response) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tier = 'lifetime', maxUses = 1, expiresInDays = null, codePrefix = 'RUG' } = req.body;

    // Generate a random code
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const code = `${codePrefix}-${randomPart}`;

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Insert into database
    const result = await pool.query(`
      INSERT INTO subscription_codes (code, tier, max_uses, is_active, expires_at)
      VALUES ($1, $2, $3, true, $4)
      RETURNING *
    `, [code, tier, maxUses, expiresAt]);

    res.json({
      success: true,
      code: result.rows[0],
      message: `Code ${code} created successfully`
    });

  } catch (error: any) {
    console.error('[Code Generation] Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  }
});

// List all redemption codes
router.get('/codes/list', async (req: Request, res: Response) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(r.id) as redemption_count,
        ARRAY_AGG(r.user_id) FILTER (WHERE r.user_id IS NOT NULL) as redeemed_by
      FROM subscription_codes c
      LEFT JOIN code_redemptions r ON c.id = r.code_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      codes: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('[Code List] Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  }
});

// Deactivate a code
router.post('/codes/deactivate', async (req: Request, res: Response) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await pool.query(`
      UPDATE subscription_codes
      SET is_active = false, updated_at = NOW()
      WHERE code = $1
      RETURNING *
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }

    res.json({
      success: true,
      code: result.rows[0],
      message: `Code ${code} deactivated successfully`
    });

  } catch (error: any) {
    console.error('[Code Deactivate] Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
    });
  }
});

export default router;
