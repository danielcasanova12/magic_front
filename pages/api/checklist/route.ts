export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { query } from "@/lib/db";

const SCHEMA = process.env.DB_SCHEMA || "public";
const T_RANK = "ranking_magic_checklist";
const T_LATEST = "statusinvest_latest";

type ChecklistRow = {
  ticker: string;
  earning_yield: number | null;
  roic_pct: number | null;
  i10_score: number | null;
  MF_rank: number | null;
  final_rank: number | null;
  liquidity: number | null;
  market_cap: number | null;
  company_name: string | null;
  sector: string | null;
  notes: string | null;
};

type CountRow = { total: number };

const ALLOWED_SORT = [
  "ticker","earning_yield","roic_pct","i10_score","MF_rank","final_rank","liquidity","market_cap"
];
const PHYS_MAP: Record<string,string> = { MF_rank: "mf_rank" };

function buildOrderBy(sortParam: string | null) {
  const fallback = "final_rank";
  const input = sortParam ?? fallback;
  const desc = input.startsWith("-");
  const logical = desc ? input.slice(1) : input;
  const col = ALLOWED_SORT.includes(logical) ? logical : fallback;
  const phys = PHYS_MAP[col] ?? col;
  return `ORDER BY r."${phys}" ${desc ? "DESC" : "ASC"}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const sector = url.searchParams.get("sector")?.trim() ?? "";
    const sort = url.searchParams.get("sort");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSizeReq = parseInt(url.searchParams.get("pageSize") ?? "30", 10) || 30;
    const pageSize = Math.min(Math.max(1, pageSizeReq), 200);
    const offset = (page - 1) * pageSize;

    const values: string[] = [];
    const where: string[] = [];

    if (q) {
      values.push(`%${q}%`, `%${q}%`);
      where.push(`(l."ticker" ILIKE $${values.length-1} OR l."company_name" ILIKE $${values.length})`);
    }
    if (sector) {
      values.push(sector);
      where.push(`l."sector" = $${values.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderBy = buildOrderBy(sort);

    const mainSql = `
      SELECT
        r."ticker",
        CAST(r."earning_yield" AS double precision) AS earning_yield,
        CAST(r."roic_pct"      AS double precision) AS roic_pct,
        CAST(r."i10_score"     AS double precision) AS i10_score,
        CAST(r."mf_rank"       AS double precision) AS "MF_rank",
        CAST(r."final_rank"    AS double precision) AS final_rank,
        CAST(r."liquidity"     AS double precision) AS liquidity,
        CAST(r."market_cap"    AS double precision) AS market_cap,
        l."company_name",
        l."sector",
        NULL::text AS notes
      FROM "${SCHEMA}"."${T_RANK}" r
      LEFT JOIN "${SCHEMA}"."${T_LATEST}" l ON l."ticker" = r."ticker"
      ${whereSql}
      ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM "${SCHEMA}"."${T_RANK}" r
      LEFT JOIN "${SCHEMA}"."${T_LATEST}" l ON l."ticker" = r."ticker"
      ${whereSql}
    `;

    const [list, count] = await Promise.all([
      query<ChecklistRow>(mainSql, [...values, String(pageSize), String(offset)]),
      query<CountRow>(countSql, values),
    ]);

    return Response.json({
      ok: true,
      page,
      pageSize,
      total: count.rows[0]?.total ?? 0,
      rows: list.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("checklist error:", err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
