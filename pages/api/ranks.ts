// pages/api/ranks.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

const SCHEMA = process.env.DB_SCHEMA || "public";
const TABLE = "ranking_magic_checklist";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = String(req.query.tickers ?? "").trim();
    if (!raw) {
      return res.status(400).json({ ok: false, error: "tickers é obrigatório (CSV)" });
    }
    // normaliza: separa por vírgula/espacos/quebras de linha
    const arr = raw
      .split(/[\s,;]+/g)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    // dedup + limita para evitar SQL enorme
    const uniq = Array.from(new Set(arr)).slice(0, 500);
    const params = uniq.map((_, i) => `$${i + 1}`).join(",");

    const sql = `
      SELECT "ticker", CAST("final_rank" AS double precision) AS final_rank
      FROM "${SCHEMA}"."${TABLE}"
      WHERE "ticker" IN (${params})
    `;
    const { rows } = await query(sql, uniq);

    // devolve também tickers não encontrados com final_rank = null (pra sabermos pintar verde)
    const map = new Map<string, number | null>(rows.map((r: any) => [String(r.ticker).toUpperCase(), r.final_rank]));
    const filled = uniq.map((t) => ({ ticker: t, final_rank: map.has(t) ? map.get(t) : null }));

    res.status(200).json({ ok: true, rows: filled });
  } catch (err: any) {
    console.error("ranks error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
