#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://wdssjefofxjifltsuidb.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkc3NqZWZvZnhqaWZsdHN1aWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI4NzMyNywiZXhwIjoyMDk2ODYzMzI3fQ._bjBFZYGWljTOBcOm2QtXiTvcQMrHTQQiRSaXnI1qBU";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: "public",
  },
});

async function runMigration() {
  console.log("Attempting to apply migration via Supabase...");

  // Try to test the connection by querying a simple table
  const { data, error } = await supabase.from("audit_fees").select("id").limit(1);

  if (error) {
    console.error("Connection test failed:", error.message);
    console.log("\nTrying direct PostgreSQL connection instead...");
    return runDirectMigration();
  }

  console.log("Connected to Supabase successfully");
  console.log("\nNote: Supabase JS client does not support raw SQL execution.");
  console.log("The columns need to be created via the SQL Editor or direct connection.");
  console.log("\nSQL to run in Supabase Dashboard SQL Editor:");
  console.log("---------------------------------------");
  console.log("ALTER TABLE IF EXISTS public.audit_fees");
  console.log("ADD COLUMN IF NOT EXISTS source_address varchar;");
  console.log("");
  console.log("CREATE INDEX IF NOT EXISTS idx_audit_fees_source_address");
  console.log("ON public.audit_fees (source_address);");
  console.log("---------------------------------------");
}

async function runDirectMigration() {
  // Try direct postgres connection
  const pg = require("pg");
  const pool = new pg.Pool({
    user: "postgres",
    password: "7mCAAczHws3Ak8Yb",
    host: "db.wdssjefofxjifltsuidb.supabase.co",
    port: 5432,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log("Running migration 1: Adding source_address column...");
    await client.query(
      "ALTER TABLE IF EXISTS public.audit_fees ADD COLUMN IF NOT EXISTS source_address varchar;"
    );
    console.log("✓ Migration 1 applied");

    console.log("Running migration 2: Creating index...");
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_audit_fees_source_address ON public.audit_fees (source_address);"
    );
    console.log("✓ Migration 2 applied");

    console.log("\n✅ SUCCESS: All migrations applied!");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
