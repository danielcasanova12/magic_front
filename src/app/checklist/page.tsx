"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  earning_yield: number | null;
  roic_pct: number | null;
  i10_score: number | null;
  liquidity: number | null;
  market_cap: number | null;
  notes: string | null;
};

type ApiResp = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  rows: Row[];
};

function fmtPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtPctPlain(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}%`;
}

function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
}

function fmtMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export default function ChecklistPage() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [sort, setSort] = useState<string>("-earning_yield"); // prefixo "-" = desc
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // monta querystring
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (sector) sp.set("sector", sector);
    if (sort) sp.set("sort", sort);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [q, sector, sort, page, pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/checklist?${qs}`, { cache: "no-store" });
      const data: ApiResp = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.["error"] || `HTTP ${res.status}`);
      }
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  // carrega sempre que mudar a query
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  function toggleSort(col: string) {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.replace("-", "") !== col) return col; // asc
      // alterna asc <-> desc
      return prev.startsWith("-") ? col : `-${col}`;
    });
  }

  function sortIndicator(col: string) {
    const active = sort.replace("-", "") === col;
    if (!active) return "";
    return sort.startsWith("-") ? " ↓" : " ↑";
  }

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ranking Magic — Checklist</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Ações que passam pelos critérios (tabela <code>ranking_magic_checklist</code>).
      </p>

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
              <Th label="Ticker" onClick={() => toggleSort("ticker")} activeLabel={sortIndicator("ticker")} />
              <Th label="Empresa" />
              <Th label="Setor" />
              <Th label={"Earning Yield" + sortIndicator("earning_yield")} onClick={() => toggleSort("earning_yield")} />
              <Th label={"ROIC %" + sortIndicator("roic_pct")} onClick={() => toggleSort("roic_pct")} />
              <Th label={"I10" + sortIndicator("i10_score")} onClick={() => toggleSort("i10_score")} />
              <Th label={"Liquidez"} />
              <Th label={"Market Cap"} />
              <Th label={"Notas"} />
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 16, textAlign: "center", color: "#666" }}>
                  Nenhum resultado.
                </td>
              </tr>
            )}

            {rows.map((r, idx) => {
              const rowNumber = (page - 1) * pageSize + (idx + 1); // NUMERAÇÃO
              return (
                <tr key={r.ticker} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{rowNumber}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <a href={`/ticker/${encodeURIComponent(r.ticker)}`} style={{ textDecoration: "none" }}>
                      {r.ticker}
                    </a>
                  </td>
                  <td style={td}>{r.company_name ?? "—"}</td>
                  <td style={td}>{r.sector ?? "—"}</td>
                  <td style={td}>{fmtPct(r.earning_yield)}</td>
                  <td style={td}>{fmtPctPlain(r.roic_pct)}</td>
                  <td style={td}>{r.i10_score ?? "—"}</td>
                  <td style={td}>{fmtNum(r.liquidity)}</td>
                  <td style={td}>{fmtMoney(r.market_cap)}</td>
                  <td style={{ ...td, maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

      {error && (
        <div style={{ marginTop: 8, color: "crimson" }}>
          Erro: {error}
        </div>
      )}
    </main>
  );
}

function Th({
  label,
  onClick,
  activeLabel,
}: {
  label: string;
  onClick?: () => void;
  activeLabel?: string;
}) {
  return (
    <th
      onClick={onClick}
      style={{
        ...th,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
      title={onClick ? "Clique para ordenar" : undefined}
    >
      {label}
      {activeLabel ? <span style={{ color: "#444" }}>{activeLabel}</span> : null}
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
