import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../lib/db";
import { getColumns } from "../../lib/sql";

const SCHEMA = process.env.DB_SCHEMA || "public";
const LATEST = "statusinvest_latest";
const CHECK = "ranking_magic_checklist";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getTicker(req, res);
  if (req.method === "PATCH") return patchTicker(req, res);
  res.setHeader("Allow", "GET,PATCH");
  res.status(405).json({ ok: false, error: "Method not allowed" });
}

async function getTicker(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ticker = String(req.query.ticker ?? "").trim();
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker é obrigatório" });

    const cols = await getColumns(LATEST, SCHEMA);
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
      cols.has("market_cap") ? `l."market_cap"` : (cols.has("marketcap") ? `l."marketcap" AS market_cap` : `NULL AS market_cap`),
      `c."notes"`,
      `(c."ticker" IS NOT NULL) AS in_checklist`
    ].join(", ");

    const { rows } = await query(
      `
        SELECT ${selectCols}
          FROM "${SCHEMA}"."${LATEST}" l
          LEFT JOIN "${SCHEMA}"."${CHECK}" c ON c."ticker" = l."ticker"
         WHERE l."ticker" = $1
         LIMIT 1
      `,
      [ticker]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: "ticker não encontrado" });
    res.status(200).json({ ok: true, data: rows[0] });
  } catch (err: any) {
    console.error("ticker GET error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

async function patchTicker(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { ticker, in_checklist, notes } = req.body || {};
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker é obrigatório" });

    // se in_checklist === true => UPSERT na checklist
    // se in_checklist === false => DELETE da checklist
    // se notes veio sozinho, faz upsert com notes (mantém presença)
    if (in_checklist === true || typeof notes === "string") {
      await query(
        `
          INSERT INTO "${SCHEMA}"."${CHECK}" ("ticker","notes")
               VALUES ($1, COALESCE($2, ''))
          ON CONFLICT ("ticker") DO UPDATE
                SET "notes" = COALESCE(EXCLUDED."notes", "${CHECK}"."notes")
        `,
        [ticker, typeof notes === "string" ? notes : null]
      );
    }

    if (in_checklist === false) {
      await query(
        `DELETE FROM "${SCHEMA}"."${CHECK}" WHERE "ticker" = $1`,
        [ticker]
      );
    }

    // retorna o estado atualizado
    req.query.ticker = ticker;
    return getTicker(req, res);
  } catch (err: any) {
    console.error("ticker PATCH error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
