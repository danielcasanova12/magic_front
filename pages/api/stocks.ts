import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";
import { getColumns, getPaging, buildFilters, buildOrderBy, allowedSortCols } from "../../lib/sql";

const SCHEMA = process.env.DB_SCHEMA || "public";
const TABLE = "statusinvest_latest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cols = await getColumns(TABLE, SCHEMA);
    const { page, pageSize, offset } = getPaging(req);

    const q = String(req.query.q ?? "").trim() || undefined;
    const sector = String(req.query.sector ?? "").trim() || undefined;
    const min_liquidity = req.query.min_liquidity ? Number(req.query.min_liquidity) : undefined;
    const min_mcap = req.query.min_mcap ? Number(req.query.min_mcap) : undefined;
    const sort = String(req.query.sort ?? "");

    const { whereSql, values } = buildFilters({ q, sector, min_liquidity, min_mcap }, cols, "l");
    const orderBy = buildOrderBy(sort || undefined, allowedSortCols(cols), "l");

    // selecionar colunas: sempre inclui ticker e tenta mapear nome/sector
    const nameCol = cols.has("company_name") ? "company_name" : (cols.has("nome_empresa") ? "nome_empresa" : null);
    const sectorCol = cols.has("sector") ? "sector" : (cols.has("setor") ? "setor" : null);

    const selectCols = [
      `l."ticker"`,
      nameCol ? `l."${nameCol}" AS company_name` : `NULL AS company_name`,
      sectorCol ? `l."${sectorCol}" AS sector` : `NULL AS sector`,
      cols.has("earning_yield") ? `l."earning_yield"` : `NULL AS earning_yield`,
      cols.has("roic_pct") ? `l."roic_pct"` : `NULL AS roic_pct`,
      cols.has("i10_score") ? `l."i10_score"` : `NULL AS i10_score`,
      cols.has("liquidity") ? `l."liquidity"` : `NULL AS liquidity`,
      cols.has("market_cap") ? `l."market_cap"` : (cols.has("marketcap") ? `l."marketcap" AS market_cap` : `NULL AS market_cap`)
    ].join(", ");

    const sql = `
      SELECT ${selectCols}
        FROM "${SCHEMA}"."${TABLE}" l
        ${whereSql}
        ${orderBy}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const countSql = `
      SELECT COUNT(*)::int AS total
        FROM "${SCHEMA}"."${TABLE}" l
        ${whereSql}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(sql, [...values, pageSize, offset]),
      query(countSql, values)
    ]);

    res.status(200).json({
      ok: true,
      page, pageSize,
      total: countRows[0]?.total ?? 0,
      rows
    });
  } catch (err: any) {
    console.error("stocks error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
