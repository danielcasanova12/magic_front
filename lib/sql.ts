import { query } from "./db";

const CACHE: Record<string, Set<string>> = {};

/** Retorna set de colunas existentes para uma tabela (cacheado) */
export async function getColumns(table: string, schema = process.env.DB_SCHEMA || "public") {
  const key = `${schema}.${table}`;
  if (CACHE[key]) return CACHE[key];
  const { rows } = await query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2`,
    [schema, table]
  );
  const set = new Set(rows.map(r => r.column_name));
  CACHE[key] = set;
  return set;
}

/** Retorna pageSize (1..200), page (>=1) e offset seguro */
export function getPaging(req: any) {
  const page = Math.max(1, parseInt(String(req.query?.page ?? "1"), 10) || 1);
  const pageSizeEnv = parseInt(String(process.env.PAGE_SIZE ?? "30"), 10) || 30;
  const requested = parseInt(String(req.query?.pageSize ?? pageSizeEnv), 10) || pageSizeEnv;
  const pageSize = Math.min(Math.max(1, requested), 200);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/** Constrói ORDER BY seguro com whitelist e suporte a prefixo '-' */
export function buildOrderBy(sortParam: string | undefined, allowed: string[], tableAlias?: string) {
  if (!sortParam) return `ORDER BY ${tableAlias ? tableAlias + "." : ""}ticker`;
  const desc = sortParam.startsWith("-");
  const col = desc ? sortParam.slice(1) : sortParam;
  if (!allowed.includes(col)) return `ORDER BY ${tableAlias ? tableAlias + "." : ""}ticker`;
  const qualified = `${tableAlias ? tableAlias + "." : ""}"${col}"`;
  return `ORDER BY ${qualified} ${desc ? "DESC" : "ASC"}`;
}

/** Monta filtro WHERE básico (q/sector/mins) respeitando colunas disponíveis */
export function buildFilters(params: {
  q?: string;
  sector?: string;
  min_liquidity?: number;
  min_mcap?: number;
}, cols: Set<string>, alias = "") {
  const where: string[] = [];
  const values: any[] = [];
  const a = alias ? alias + "." : "";

  if (params.q) {
    const hasTicker = cols.has("ticker");
    const hasName = cols.has("company_name") || cols.has("nome_empresa");
    if (hasTicker && hasName) {
      values.push(`%${params.q}%`, `%${params.q}%`);
      const nameCol = cols.has("company_name") ? "company_name" : "nome_empresa";
      where.push(`(${a}"ticker" ILIKE $${values.length - 1} OR ${a}"${nameCol}" ILIKE $${values.length})`);
    } else if (hasTicker) {
      values.push(`%${params.q}%`);
      where.push(`${a}"ticker" ILIKE $${values.length}`);
    }
  }

  if (params.sector && (cols.has("sector") || cols.has("setor"))) {
    const sectorCol = cols.has("sector") ? "sector" : "setor";
    values.push(params.sector);
    where.push(`${a}"${sectorCol}" = $${values.length}`);
  }

  if (typeof params.min_liquidity === "number" && cols.has("liquidity")) {
    values.push(params.min_liquidity);
    where.push(`${a}"liquidity" >= $${values.length}`);
  }

  if (typeof params.min_mcap === "number" && (cols.has("market_cap") || cols.has("marketcap"))) {
    const mcapCol = cols.has("market_cap") ? "market_cap" : "marketcap";
    values.push(params.min_mcap);
    where.push(`${a}"${mcapCol}" >= $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return { whereSql, values };
}

/** Retorna colunas numéricas “comuns” existentes para ordenação/filtros */
export function commonNumericCols(cols: Set<string>) {
  const candidates = ["earning_yield", "roic_pct", "i10_score", "liquidity", "market_cap", "marketcap"];
  return candidates.filter(c => cols.has(c));
}

/** Retorna colunas permitidas para ORDER BY (ticker + numéricas comuns) */
export function allowedSortCols(cols: Set<string>) {
  return ["ticker", ...commonNumericCols(cols)];
}
