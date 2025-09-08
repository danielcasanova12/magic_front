// lib/db.ts
import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  // Em dev, reaproveitamos a Pool para evitar esgotar conexões em hot-reload
  var __pgPool: Pool | undefined;
}

function makePool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida no .env");
  }
  const useSSL =
    process.env.PGSSLMODE === "require" || /sslmode=require/.test(databaseUrl);

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
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<QueryResult<T>> {
  const start = Date.now();

  // Evita `any`: criamos uma assinatura compatível usando unknown
  const pgQuery = pg.query.bind(pg) as unknown as (
    q: string,
    values?: ReadonlyArray<unknown>
  ) => Promise<QueryResult<T>>;

  const res = await pgQuery(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `🗃️  SQL ${duration}ms | ${text} | ${params && params.length ? params.join(",") : ""}`
    );
  }
  return res;
}
