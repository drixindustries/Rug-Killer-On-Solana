import { db } from './server/db.js';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Running user_access_control migration...');
  
  try {
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '20251130_add_user_access_control.sql'),
      'utf-8'
    );
    
    console.log('📄 Executing SQL migration...');
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully');
    console.log('✅ user_access_control table created');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
