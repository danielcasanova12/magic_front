// lib/db.ts
import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function makePool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida no .env");
  }
  const useSSL =
    process.env.PGSSLMODE === "require" ||
    /sslmode=require/.test(databaseUrl);

  return new Pool({
    connectionString: databaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pg = global.__pgPool ?? (global.__pgPool = makePool());

/**
 * Executa uma query fortemente tipada.
 * - T é o tipo de cada linha retornada e DEVE estender QueryResultRow.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pg.query<T>(text, params as unknown[]);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== "production") {
    console.log(`🗃️  SQL ${duration}ms | ${text} | ${Array.isArray(params) ? params : ""}`);
  }
  return res;
}
