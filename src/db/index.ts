import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";

export type AppDatabase = LibSQLDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var db: AppDatabase | undefined;
  // eslint-disable-next-line no-var
  var client: Client | undefined;
}

const client =
  globalThis.client ??
  createClient({
    url: process.env.DATABASE_URL || "file:gym.db",
  });

// Run SQLite in WAL mode with a busy timeout to prevent lock contention
if (!globalThis.client) {
  client.execute("PRAGMA journal_mode = WAL;").catch((err) => {
    console.error("[DB] Failed to enable WAL mode:", err);
  });
  client.execute("PRAGMA busy_timeout = 5000;").catch((err) => {
    console.error("[DB] Failed to set busy_timeout:", err);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalThis.client = client;
}

export const db: AppDatabase = globalThis.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalThis.db = db;
}
