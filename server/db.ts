// Try to load .env if it exists (local dev), but don't fail if it doesn't (Railway)
try {
  await import('dotenv/config');
} catch {
  // Railway injects env vars directly - no dotenv needed
}

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./shared/schema.ts";

// Railway provides DATABASE_URL automatically when PostgreSQL is attached
const DATABASE_URL = process.env.DATABASE_URL;
const FORCE_IN_MEMORY = process.env.FORCE_IN_MEMORY_DB === 'true';

console.log('🔧 DB Config - DATABASE_URL present:', !!DATABASE_URL);
console.log('🔧 DB Config - FORCE_IN_MEMORY_DB:', process.env.FORCE_IN_MEMORY_DB);

let db: any;
let pool: any = null;

if (!DATABASE_URL || FORCE_IN_MEMORY) {
  console.warn('⚠️ Starting in IN-MEMORY MODE (no persistence). Database features disabled.');
  db = createInMemoryDbStub();
  pool = null;
} else {
  try {
    console.log('✅ Connecting to PostgreSQL...');
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL pool:', err);
    console.warn('⚠️ Falling back to in-memory stub DB.');
    db = createInMemoryDbStub();
    pool = null;
  }
}

function createInMemoryDbStub() {
  // Chainable stub for all drizzle methods - returns empty results to prevent crashes
  const chainable: any = () => chainable;
  chainable.select = chainable;
  chainable.from = chainable;
  chainable.insert = chainable;
  chainable.update = chainable;
  chainable.delete = chainable;
  chainable.where = chainable;
  chainable.limit = chainable;
  chainable.offset = chainable;
  chainable.orderBy = chainable;
  chainable.values = chainable;
  chainable.set = chainable;
  chainable.returning = () => [];
  chainable.then = () => Promise.resolve([]);
  
  return new Proxy({}, {
    get: () => chainable
  });
}

export { db, pool };
  