import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

function createClient() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. See .env.example for required configuration.",
    );
  }

  const sql = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(sql, { schema });
}

// Lazy singleton — only created on first access.
let _db: ReturnType<typeof createClient> | undefined;

export function getDb() {
  if (!_db) {
    _db = createClient();
  }
  return _db;
}

export type Database = ReturnType<typeof createClient>;
