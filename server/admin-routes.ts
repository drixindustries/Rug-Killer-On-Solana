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
      AND table_name IN ('smart_wallets', 'smart_signals', 'kol_wallets')
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

export default router;
