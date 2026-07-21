import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { beforeAll, afterAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/mod_compliance_test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../migrations");

beforeAll(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await client.query(fs.readFileSync(path.join(migrationsDir, file), "utf-8"));
  }
  await client.end();
});

afterAll(async () => {
  const { pool } = await import("../db/pool.js");
  await pool.end();
});
