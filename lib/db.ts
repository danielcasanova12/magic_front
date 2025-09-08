// lib/db.ts

import { Pool } from "pg";

declare global {
  // Evita recriar o pool no hot reload do Next (apenas em dev)
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida no .env");
  }

  // Habilita SSL se PGSSLMODE=require (ou se a URL já tiver sslmode=require)
  const useSSL =
    process.env.PGSSLMODE === "require" ||
    /sslmode=require/.test(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return pool;
}

export const pg =
  global.__pgPool ?? (global.__pgPool = makePool());

export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pg.query<T>(text, params);
  const duration = Date.now() - start;
  // Log simples (apenas em dev)
  if (process.env.NODE_ENV !== "production") {
    console.log(`🗃️  SQL ${duration}ms | ${text} | ${params ?? []}`);
  }
  return res;
}
