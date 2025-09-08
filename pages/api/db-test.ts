// pages/api/db-test.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

// Testa conexão e traz 5 linhas cruas de statusinvest_latest.
// Assim não depende de nomes de colunas específicos.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows } = await query(`SELECT * FROM statusinvest_latest LIMIT 5`);
    res.status(200).json({ ok: true, table: "statusinvest_latest", sample: rows });
  } catch (err: any) {
    console.error("DB test error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
