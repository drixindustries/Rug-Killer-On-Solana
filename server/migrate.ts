import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Read and execute SQL migration files
    const migrationsDir = path.join(__dirname, "..", "migrations");
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`⚙️  Running migration: ${file}`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await pool.query(sqlContent);
      console.log(`✅ Completed: ${file}`);
    }
    
    console.log("✅ All migrations completed successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
