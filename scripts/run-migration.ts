/**
 * Manual Database Migration Runner
 * Run this to create missing tables in Railway PostgreSQL
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔄 Connecting to database...');
    
    // Read and run the smart_wallets migration
    const migrationPath = path.join(process.cwd(), 'migrations', '20251121_create_smart_wallets_and_signals.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔄 Running smart_wallets migration...');
    await pool.query(migrationSQL);
    console.log('✅ smart_wallets and smart_signals tables created');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('smart_wallets', 'smart_signals')
    `);
    
    console.log('✅ Verified tables:', result.rows.map(r => r.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
