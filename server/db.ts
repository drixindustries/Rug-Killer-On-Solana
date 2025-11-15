import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Railway provides DATABASE_URL automatically when PostgreSQL is attached
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL environment variable is not set!');
  console.error('   Railway should provide this automatically when PostgreSQL is attached.');
  console.error('   Check: Railway Dashboard → Your Service → Variables');
  process.exit(1);
}

console.log('✅ DATABASE_URL found, connecting to PostgreSQL...');

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Railway/Heroku/Render PostgreSQL
  }
});

export const db = drizzle(pool, { schema });
  