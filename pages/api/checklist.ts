import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

const SCHEMA = process.env.DB_SCHEMA || "public";
const TABLE = "ranking_magic_checklist";

/**
 * GET /api/checklist
 * Query params:
 *  - q: busca por ticker (opcional)
 *  - sort: coluna para ordenar (default: final_rank). Use prefixo "-" para DESC (ex: -earning_yield)
 *  - page, pageSize (default: 1, 30)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeEnv = parseInt(String(process.env.PAGE_SIZE ?? "30"), 10) || 30;
    const pageSize = Math.min(Math.max(1, parseInt(String(req.query.pageSize ?? pageSizeEnv), 10) || pageSizeEnv), 200);
    const offset = (page - 1) * pageSize;

    const q = String(req.query.q ?? "").trim();
    const sortParam = String(req.query.sort ?? "final_rank"); // padrão

    // whitelist de colunas permitidas para ORDER BY
    const allowed = [
      "ticker",
      "earning_yield",
      "roic_pct",
      "i10_score",
      "mf_rank",
      "final_rank",
      "liquidity",
      "market_cap",
    ];

    const desc = sortParam.startsWith("-");
    const col = desc ? sortParam.slice(1) : sortParam;
    const sortCol = allowed.includes(col) ? col : "final_rank";
    const orderBy = `ORDER BY "${sortCol}" ${desc ? "DESC" : "ASC"}`;

    // filtros (apenas por ticker, opcional)
    const where: string[] = [];
    const values: any[] = [];
    if (q) {
      values.push(`%${q}%`);
      where.push(`"ticker" ILIKE $${values.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // consulta principal (somente as colunas pedidas)
    const sql = `
    SELECT
        "ticker",
        CAST("earning_yield" AS double precision)   AS earning_yield,
        CAST("roic_pct"      AS double precision)   AS roic_pct,
        CAST("i10_score"     AS double precision)   AS i10_score,
        CAST("mf_rank"       AS double precision)   AS "MF_rank",
        CAST("final_rank"    AS double precision)   AS final_rank,
        CAST("liquidity"     AS double precision)   AS liquidity,
        CAST("market_cap"    AS double precision)   AS market_cap
    FROM "${SCHEMA}"."${TABLE}"
    ${whereSql}
    ${orderBy}
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
    `;


    // total para paginação
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM "${SCHEMA}"."${TABLE}"
      ${whereSql}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(sql, [...values, pageSize, offset]),
      query(countSql, values),
    ]);

    res.status(200).json({
      ok: true,
      page,
      pageSize,
      total: countRows[0]?.total ?? 0,
      rows,
    });
  } catch (err: any) {
    console.error("checklist error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
