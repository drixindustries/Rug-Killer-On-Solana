#!/usr/bin/env node
/**
 * Database Migration Runner
 * Runs pending SQL migrations on startup
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  '20251130_add_user_access_control.sql'
];

async function runMigrations() {
  console.log('🔄 Checking for pending database migrations...');
  
  for (const migration of migrations) {
    try {
      const migrationPath = path.join(__dirname, 'migrations', migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⏭️  Skipping ${migration} (file not found)`);
        continue;
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      console.log(`📄 Running migration: ${migration}`);
      await db.execute(sql.raw(migrationSQL));
      console.log(`✅ Migration completed: ${migration}`);
    } catch (error: any) {
      // If table already exists, that's fine
      if (error.message?.includes('already exists')) {
        console.log(`⏭️  Migration ${migration} already applied`);
        continue;
      }
      console.error(`❌ Migration ${migration} failed:`, error.message);
      throw error;
    }
  }
  
  console.log('✅ All migrations completed');
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { runMigrations };
