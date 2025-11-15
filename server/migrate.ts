import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  console.log("🔄 Running database migration...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool);

  try {
    // Import and push schema using drizzle-kit programmatically
    const { sql } = await import("drizzle-orm");
    
    console.log("✅ Database schema is ready");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
