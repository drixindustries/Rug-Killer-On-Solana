// Try to load .env if it exists (local dev), but don't fail if it doesn't (Railway)
// Moved to synchronous import to avoid top-level await issues in esbuild
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from "../shared/schema.ts";
import * as fs from 'fs';
import * as path from 'path';

// Drizzle regression guard: some index() definitions are receiving base PgColumn instances
// lacking the internal defaultConfig expected by the index builder (which JSON.parse's it).
// This causes: SyntaxError: "undefined" is not valid JSON during drizzle() init.
// We defensively attach a defaultConfig to any column missing it before creating the db.
function ensureDrizzleIndexDefaults(root: any) {
  const DRIZZLE_COLUMNS = Symbol.for("drizzle:Columns");
  for (const value of Object.values(root)) {
    if (!value || typeof value !== "object") continue;
    const cols = (value as any)[DRIZZLE_COLUMNS];
    if (!cols || typeof cols !== "object") continue;
    for (const col of Object.values(cols)) {
      if (col && typeof col === "object" && !("defaultConfig" in col)) {
        (col as any).defaultConfig = { order: "asc", nulls: "last", opClass: undefined };
      }
    }
  }
}
ensureDrizzleIndexDefaults(schema);

// Railway provides DATABASE_URL automatically when PostgreSQL is attached
const DATABASE_URL = process.env.DATABASE_URL;
const FORCE_IN_MEMORY = ((process.env.FORCE_IN_MEMORY_DB || '').trim().toLowerCase()) === 'true';

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
    
    // Run migrations on startup
    await runMigrations(db);
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
  chainable.onConflictDoUpdate = chainable;
  chainable.onConflictDoNothing = chainable;
  chainable.for = chainable; // e.g., SELECT ... FOR UPDATE
  chainable.returning = () => [];
  chainable.then = () => Promise.resolve([]);
  chainable.transaction = async (cb: any) => {
    // Provide the same chainable as a faux transaction object
    return await cb(chainable);
  };
  
  return new Proxy({}, {
    get: () => chainable
  });
}

async function runMigrations(database: any) {
  try {
    console.log('📦 Running database migrations...');
    
    // In Docker, migrations are at /app/migrations, but CWD might be /app/server
    // Try both locations to handle both local dev and Docker
    let migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(process.cwd(), '..', 'migrations');
    }
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️  No migrations directory found, skipping migrations');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    if (files.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`  ⚙️  Applying migration: ${file}`);
      await database.execute(sql.raw(sqlContent));
    }
    
    console.log('✅ Database migrations complete');
  } catch (error: any) {
    // Migration might fail if tables already exist - that's okay
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Migration tables already exist, skipping');
    } else {
      console.error('⚠️  Migration error (non-fatal):', error.message);
    }
  }
}

export { db, pool };
  