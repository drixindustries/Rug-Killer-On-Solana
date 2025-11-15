import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rugkiller';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set, using default:', DATABASE_URL);
}

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });
