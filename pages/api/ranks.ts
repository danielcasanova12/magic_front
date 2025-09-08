// pages/api/ranks.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

const SCHEMA = process.env.DB_SCHEMA || "public";
const TABLE = "ranking_magic_checklist";

type RankRow = { ticker: string; final_rank: number | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = String(req.query.tickers ?? "").trim();
    if (!raw) return res.status(400).json({ ok: false, error: "tickers é obrigatório (CSV)" });

    const arr = raw
      .split(/[\s,;]+/g)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const uniq = Array.from(new Set(arr)).slice(0, 500);
    const params = uniq.map((_, i) => `$${i + 1}`).join(",");

    const sql = `
      SELECT "ticker", CAST("final_rank" AS double precision) AS final_rank
      FROM "${SCHEMA}"."${TABLE}"
      WHERE "ticker" IN (${params})
    `;

    const { rows } = await query<RankRow>(sql, uniq);

    const map = new Map<string, number | null>(rows.map((r) => [r.ticker.toUpperCase(), r.final_rank]));
    const filled: RankRow[] = uniq.map((t) => ({ ticker: t, final_rank: map.get(t) ?? null }));

    res.status(200).json({ ok: true, rows: filled });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("ranks error:", err);
    res.status(500).json({ ok: false, error: message });
  }
}
