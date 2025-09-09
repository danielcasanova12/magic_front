import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";
import { getColumns } from "../../lib/sql";

const SCHEMA = process.env.DB_SCHEMA || "public";
const T_RANK = "ranking_magic_checklist";
const T_LATEST = "statusinvest_latest";

interface Row {
  ticker: string;
  price: number | null;
  final_rank: number | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cols = await getColumns(T_LATEST, SCHEMA);
    const candidates = ["price", "preco", "cotacao", "last_price", "current_price"];
    const priceCol = candidates.find((c) => cols.has(c));
    if (!priceCol) {
      return res.status(500).json({ ok: false, error: "coluna de preço não encontrada" });
    }
    const sql = `
      SELECT r."ticker",
             CAST(l."${priceCol}" AS double precision) AS price,
             CAST(r."final_rank" AS double precision) AS final_rank
        FROM "${SCHEMA}"."${T_RANK}" r
        JOIN "${SCHEMA}"."${T_LATEST}" l ON l."ticker" = r."ticker"
       ORDER BY r."final_rank" ASC
       LIMIT 10
    `;
    const { rows } = await query<Row>(sql);
    res.status(200).json({ ok: true, rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    res.status(500).json({ ok: false, error: message });
  }
}
