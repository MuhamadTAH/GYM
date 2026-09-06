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

// Ensure SQLite runs in WAL mode to prevent lock contention between concurrent processes
void client.execute("PRAGMA journal_mode = WAL;").catch((err) => {
  console.error("Failed to set SQLite WAL mode:", err);
});

if (process.env.NODE_ENV !== "production") {
  globalThis.client = client;
}

export const db: AppDatabase = globalThis.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalThis.db = db;
}
