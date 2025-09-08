// scripts/db-check.js
/* eslint-disable @typescript-eslint/no-require-imports */
// scripts/db-check.js
require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL não definida no .env");
    process.exit(1);
  }

  const useSSL =
    process.env.PGSSLMODE === "require" ||
    /sslmode=require/.test(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Testa conexão básica
    const ping = await pool.query("SELECT 1 as ok");
    if (ping.rows?.[0]?.ok !== 1) {
      throw new Error("Ping ao banco falhou");
    }

    // Testa leitura da tabela
    const test = await pool.query(
      `SELECT ticker FROM statusinvest_latest LIMIT 1`
    );

    console.log("✅ Conexão OK. Exemplo:", test.rows?.[0] ?? null);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error("❌ Erro ao conectar/consultar:", e.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

main();
