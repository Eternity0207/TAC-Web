import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Client } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing env: SUPABASE_URL");
  }

  const dbUrl = supabaseUrl.trim();
  if (!/^postgres(?:ql)?:\/\//i.test(dbUrl)) {
    throw new Error(
      "SUPABASE_URL is currently the HTTPS API URL, not a Postgres connection string. To apply backend/db/schema.sql you must run it against the Supabase database connection string (or create the table in Supabase SQL editor).",
    );
  }

  const schemaPath = path.resolve(__dirname, "../db/schema.sql");
  if (!fs.existsSync(schemaPath)) throw new Error(`schema file not found: ${schemaPath}`);

  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    console.log("Applying schema from", schemaPath);
    await client.query(sql);
    console.log("Schema applied successfully");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("applySchema failed:", err.message || err);
  process.exit(1);
});
