"use client";
import { useEffect, useState, useMemo, type CSSProperties } from "react";

type ApiResp<T> = {
  ok: boolean;
  rows: T[];
  error?: string;
};

type Stock = { ticker: string };
type PortfolioItem = { ticker: string; quantity: number; price: number };

const PORTFOLIO_KEY = "portfolio_items";

function loadPortfolio(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePortfolio(items: PortfolioItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(items));
}

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #001a00 0%, #000000 100%)",
  color: "#ffffff",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const headingStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  textShadow: "0 0 8px #00ff88",
};

const inputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid #00ff88",
  borderRadius: 8,
  padding: "8px",
  color: "#ffffff",
};

const buttonStyle: CSSProperties = {
  background: "#00ff88",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  color: "#000000",
  cursor: "pointer",
  fontWeight: 600,
};

const tableStyle: CSSProperties = {
  width: "100%",
  marginTop: 16,
  fontSize: 14,
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #00ff88",
  textAlign: "left",
};

const tdStyle: CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #003300",
};

const removeBtn: CSSProperties = {
  color: "#ff4d4d",
  cursor: "pointer",
  background: "none",
  border: "none",
};

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    setPortfolio(loadPortfolio());
    fetch("/api/stocks?pageSize=1000")
      .then((r) => r.json())
      .then((j: ApiResp<Stock>) => {
        if (j.ok) setStocks(j.rows);
      })
      .catch(() => {});
  }, []);

  function addItem() {
    const q = Number(quantity);
    const p = Number(price);
    const t = ticker.trim().toUpperCase();
    if (!t || !Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return;
    setPortfolio((prev) => {
      const idx = prev.findIndex((i) => i.ticker === t);
      let next: PortfolioItem[];
      if (idx >= 0) {
        const existing = prev[idx];
        const totalQty = existing.quantity + q;
        const avgPrice =
          (existing.quantity * existing.price + q * p) / totalQty;
        next = [...prev];
        next[idx] = { ticker: t, quantity: totalQty, price: avgPrice };
      } else {
        next = [...prev, { ticker: t, quantity: q, price: p }];
      }
      savePortfolio(next);
      return next;
    });
    setTicker("");
    setQuantity("");
    setPrice("");
  }

  function removeItem(t: string) {
    setPortfolio((prev) => {
      const next = prev.filter((i) => i.ticker !== t);
      savePortfolio(next);
      return next;
    });
  }

  const total = useMemo(
    () => portfolio.reduce((s, i) => s + i.quantity * i.price, 0),
    [portfolio]
  );

  function fmtMoney(v: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(v);
  }

  return (
    <main style={containerStyle}>
      <h1 style={headingStyle}>Minha carteira</h1>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          list="tickers-list"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker"
          style={inputStyle}
        />
        <datalist id="tickers-list">
          {stocks.map((s) => (
            <option key={s.ticker} value={s.ticker} />
          ))}
        </datalist>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantidade"
          style={{ ...inputStyle, width: 80 }}
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Preço"
          style={{ ...inputStyle, width: 80 }}
        />
        <button onClick={addItem} style={buttonStyle}>
          Adicionar
        </button>
      </div>

      {portfolio.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ticker</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Qtd</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Preço médio</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Valor</th>
              <th style={{ ...thStyle, textAlign: "right" }}>% carteira</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((item) => {
              const value = item.quantity * item.price;
              const pct = total ? (value / total) * 100 : 0;
              return (
                <tr key={item.ticker}>
                  <td style={tdStyle}>{item.ticker}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(item.price)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(value)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{pct.toFixed(2)}%</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button onClick={() => removeItem(item.ticker)} style={removeBtn}>
                      remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 16, fontWeight: 600 }}>
        Total na carteira: {fmtMoney(total)}
      </p>
    </main>
  );
}
