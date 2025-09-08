// pages/api/db-test.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { rows } = await query(`SELECT * FROM statusinvest_latest LIMIT 5`);
    res.status(200).json({ ok: true, sample: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("DB test error:", err);
    res.status(500).json({ ok: false, error: message });
  }
}
