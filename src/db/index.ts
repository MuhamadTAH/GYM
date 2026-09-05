import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

declare global {
  // eslint-disable-next-line no-var
  var db: LibSQLDatabase | undefined;
  // eslint-disable-next-line no-var
  var client: Client | undefined;
}

const client =
  globalThis.client ??
  createClient({
    url: process.env.DATABASE_URL || "file:gym.db",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.client = client;
}

export const db = globalThis.db ?? drizzle(client);

if (process.env.NODE_ENV !== "production") {
  globalThis.db = db;
}
