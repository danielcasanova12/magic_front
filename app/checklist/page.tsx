"use client";

import { useEffect, useMemo, useState } from "react";

const OWNED_KEY = "ranking_magic_owned_tickers";

type Row = {
  ticker: string;
  company_name?: string | null;
  sector?: string | null;
  earning_yield?: number | string | null;
  roic_pct?: number | string | null;
  i10_score?: number | string | null;
  liquidity?: number | string | null;
  market_cap?: number | string | null;
  notes?: string | null;
  final_rank?: number | string | null;
};

type ApiResp<T> = {
  ok: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  rows: T[];
  error?: string;
};

type RankRow = { ticker: string; final_rank: number | null };

// ===== utils =====
function n(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function fmtPctFromUnit(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return `${(x * 100).toFixed(2)}%`;
}
function fmtPct(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return `${x.toFixed(2)}%`;
}
function fmtNum(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(x);
}
function fmtMoney(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(x);
}
function shorten(s: string, max = 200) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
async function fetchJsonSafe<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} — Body: ${shorten(body)}`);
  }
  return res.json() as Promise<T>;
}

// ===== localStorage carteira =====
function loadOwned(): Set<string> {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map((t) => String(t).toUpperCase()));
    return new Set();
  } catch {
    return new Set();
  }
}
function saveOwned(set: Set<string>) {
  localStorage.setItem(OWNED_KEY, JSON.stringify(Array.from(set)));
}

export default function ChecklistPage() {
  // filtros/estado tabela
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [sort, setSort] = useState<string>("final_rank");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // carteira (lista, input, ranks)
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [ownedInput, setOwnedInput] = useState("");
  const [ownedRanks, setOwnedRanks] = useState<Map<string, number | null>>(new Map());

  // ping API/banco
  const [dbInfo, setDbInfo] = useState<string | null>(null);

  // top/final rank rule: verde se < 20, vermelho caso contrário
  function rankColor(finalRank: number | null | undefined) {
    if (finalRank != null && finalRank < 20) return "#0b7a0b"; // verde
    return "#b31313"; // vermelho
  }

  // carregar carteira inicial
  useEffect(() => {
    setOwned(loadOwned());
  }, []);

  // montar querystring principal
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (sector) sp.set("sector", sector);
    if (sort) sp.set("sort", sort);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, sector, sort, page, pageSize]);

  // carregar tabela
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJsonSafe<ApiResp<Row>>(`/api/checklist?${qs}`);
      if (!data.ok) throw new Error(data.error || "Erro na API");
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Erro ao carregar");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  // ping de diagnóstico (opcional)
  useEffect(() => {
    (async () => {
      try {
        const info = await fetchJsonSafe<{ ok: boolean }>(`/api/db-test`);
        setDbInfo(info?.ok ? "API/DB: OK" : "API/DB: erro");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setDbInfo(`API/DB: ${msg}`);
      }
    })();
  }, []);

  // atualizar ranks da carteira (bulk)
  async function refreshOwnedRanks(currentOwned: Set<string>) {
    const list = Array.from(currentOwned);
    if (list.length === 0) {
      setOwnedRanks(new Map());
      return;
    }
    try {
      const data = await fetchJsonSafe<ApiResp<RankRow>>(`/api/ranks?tickers=${encodeURIComponent(list.join(","))}`);
      if (data.ok) {
        const m = new Map<string, number | null>();
        for (const r of data.rows) {
          m.set(r.ticker.toUpperCase(), r.final_rank);
        }
        setOwnedRanks(m);
      }
    } catch {
      // ignora erro de ranks, UI continua
    }
  }

  // sempre que a carteira mudar, salva e atualiza ranks
  useEffect(() => {
    saveOwned(owned);
    refreshOwnedRanks(owned);
  }, [owned]);

  // adicionar/remover individual (botão + na tabela)
  function toggleOwned(ticker: string) {
    setOwned((prev) => {
      const next = new Set(prev);
      const t = ticker.toUpperCase();
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  // adicionar via input
  function addOwnedFromInput() {
    const tokens = ownedInput
      .split(/[\s,;\n\r\t]+/g)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tokens.length === 0) return;
    setOwned((prev) => {
      const next = new Set(prev);
      tokens.forEach((t) => next.add(t));
      return next;
    });
    setOwnedInput("");
  }

  // remover da carteira via painel
  function removeOwned(t: string) {
    setOwned((prev) => {
      const next = new Set(prev);
      next.delete(t);
      return next;
    });
  }

  // sort helpers
  function toggleSort(col: string) {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.replace("-", "") !== col) return col; // asc
      return prev.startsWith("-") ? col : `-${col}`;
    });
  }
  function sortIndicator(col: string) {
    const active = sort.replace("-", "") === col;
    if (!active) return "";
    return sort.startsWith("-") ? " ↓" : " ↑";
  }

  // estilo da célula de ação + (pinta o botão conforme regra)
  function addBtnStyle(ticker: string, rowFinalRank?: number | string | null): React.CSSProperties {
    const t = ticker.toUpperCase();
    const isOwned = owned.has(t);
    const fr = rowFinalRank != null ? n(rowFinalRank) : ownedRanks.get(t) ?? null;
    const color = rankColor(fr ?? null);
    return {
      ...btn,
      padding: "4px 8px",
      fontWeight: 700,
      borderColor: isOwned ? color : "#ccc",
      color: isOwned ? color : "#333",
    };
  }

  return (
    <main style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ranking Magic — Checklist</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        <strong>Minha carteira</strong>: vermelho se <code>final_rank &lt; 20</code>, verde caso contrário.
      </p>

      {/* aviso de API/DB */}
      {dbInfo && (
        <div style={{ marginBottom: 8, fontSize: 12, color: dbInfo.includes("OK") ? "#0b7a0b" : "crimson" }}>
          {dbInfo}
        </div>
      )}

      {/* layout em 2 colunas: tabela (flex 3) | carteira (flex 1) */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
        {/* COLUNA ESQUERDA — Tabela */}
        <section>
          {/* Toolbar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px 140px 1fr",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Buscar por TICKER / Nome"
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
            />
            <input
              value={sector}
              onChange={(e) => {
                setPage(1);
                setSector(e.target.value);
              }}
              placeholder="Setor (opcional)"
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
            />
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              title="Itens por página"
            >
              {[10, 20, 30, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}/página
                </option>
              ))}
            </select>

            <div style={{ justifySelf: "end", color: "#555" }}>
              {loading ? "Carregando..." : `Mostrando ${rows.length} de ${total}`}
            </div>
          </div>

          {/* Tabela */}
          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f7f7f7" }}>
                <tr>
                  <th style={th}>#</th>
                  <Th label="" />
                  <Th label={"Ticker" + sortIndicator("ticker")} onClick={() => toggleSort("ticker")} />
                  <Th label="Empresa" />
                  <Th label="Setor" />
                  <Th
                    label={"Earning Yield" + sortIndicator("earning_yield")}
                    onClick={() => toggleSort("earning_yield")}
                  />
                  <Th label={"ROIC %" + sortIndicator("roic_pct")} onClick={() => toggleSort("roic_pct")} />
                  <Th label={"I10" + sortIndicator("i10_score")} onClick={() => toggleSort("i10_score")} />
                  <Th label={"Liquidez" + sortIndicator("liquidity")} onClick={() => toggleSort("liquidity")} />
                  <Th label={"Market Cap" + sortIndicator("market_cap")} onClick={() => toggleSort("market_cap")} />
                  <Th label={"Final Rank" + sortIndicator("final_rank")} onClick={() => toggleSort("final_rank")} />
                  <Th label={"Notas"} />
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ padding: 16, textAlign: "center", color: "#666" }}>
                      Nenhum resultado.
                    </td>
                  </tr>
                )}

                {rows.map((r, idx) => {
                  const rowNumber = (page - 1) * pageSize + (idx + 1);
                  const t = r.ticker.toUpperCase();
                  const fr = r.final_rank != null ? n(r.final_rank) : ownedRanks.get(t) ?? null;
                  const color = rankColor(fr);

                  return (
                    <tr key={r.ticker} style={{ borderTop: "1px solid #eee" }}>
                      <td style={td}>{rowNumber}</td>
                      <td style={{ ...td, width: 44 }}>
                        <button
                          onClick={() => toggleOwned(r.ticker)}
                          style={addBtnStyle(r.ticker, r.final_rank)}
                          title="Adicionar/remover da carteira"
                        >
                          {owned.has(t) ? "✓" : "+"}
                        </button>
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        <span style={{ color }}>{r.ticker}</span>
                      </td>
                      <td style={td}>{r.company_name ?? "—"}</td>
                      <td style={td}>{r.sector ?? "—"}</td>
                      <td style={td}>{fmtPctFromUnit(r.earning_yield)}</td>
                      <td style={td}>{fmtPct(r.roic_pct)}</td>
                      <td style={td}>{r.i10_score ?? "—"}</td>
                      <td style={td}>{fmtNum(r.liquidity)}</td>
                      <td style={td}>{fmtMoney(r.market_cap)}</td>
                      <td style={td}>{fr ?? "—"}</td>
                      <td
                        style={{
                          ...td,
                          maxWidth: 280,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.notes ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <button onClick={() => setPage(1)} disabled={page <= 1} style={btn}>
              «
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={btn}>
              Anterior
            </button>
            <span style={{ padding: "4px 8px" }}>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btn}>
              Próxima
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} style={btn}>
              »
            </button>
          </div>
        </section>

        {/* COLUNA DIREITA — Minha carteira */}
        <aside>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <h2 style={{ margin: 0, marginBottom: 8, fontSize: 18 }}>Minha carteira</h2>

            {/* input para digitar e adicionar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={ownedInput}
                onChange={(e) => setOwnedInput(e.target.value)}
                placeholder="Ex.: ITSA4, PETR4"
                style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              />
              <button onClick={addOwnedFromInput} style={btn}>
                Adicionar
              </button>
            </div>

            {/* contador */}
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>{owned.size} tickers</div>

            {/* lista */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 480, overflowY: "auto" }}>
              {Array.from(owned)
                .sort()
                .map((t) => {
                  const fr = ownedRanks.get(t) ?? null;
                  const color = rankColor(fr);
                  return (
                    <li
                      key={t}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 0",
                        borderBottom: "1px solid #f1f1f1",
                      }}
                    >
                      <span style={{ fontWeight: 700, color, minWidth: 64 }}>{t}</span>
                      <span style={{ fontSize: 12, color: "#555" }}>rank: {fr == null ? "—" : fr}</span>
                      <div style={{ marginLeft: "auto" }}>
                        <button onClick={() => removeOwned(t)} style={{ ...btn, padding: "4px 8px", borderColor: "#e88" }}>
                          remover
                        </button>
                      </div>
                    </li>
                  );
                })}
              {owned.size === 0 && (
                <li style={{ color: "#666", fontSize: 13 }}>Nenhum ticker. Use o campo acima ou o “+” na tabela.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {error && <div style={{ marginTop: 8, color: "crimson" }}>Erro: {error}</div>}
    </main>
  );
}

function Th({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      style={{ ...th, cursor: onClick ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}
      title={onClick ? "Clique para ordenar" : undefined}
    >
      {label}
    </th>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e5e5",
  fontWeight: 600,
  fontSize: 13,
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  verticalAlign: "top",
};
const btn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};
