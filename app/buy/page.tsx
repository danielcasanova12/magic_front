"use client";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

interface BuyRow {
  ticker: string;
  price: number | null;
  final_rank: number | null;
}

interface ApiResp<T> {
  ok: boolean;
  rows: T[];
  error?: string;
}

interface PortfolioItem {
  ticker: string;
  quantity: number;
  price: number;
}

interface CartItem {
  ticker: string;
  price: number;
  qty: number;
}

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
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "4px 8px",
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

export default function BuyPage() {
  const [rows, setRows] = useState<BuyRow[]>([]);
  const [inputAmount, setInputAmount] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

  async function handleLoad() {
    const money = Number(inputAmount);
    if (!Number.isFinite(money) || money <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buy");
      const j: ApiResp<BuyRow> = await res.json();
      if (!j.ok) throw new Error(j.error || "erro desconhecido");
      setRows(j.rows);
      setAmount(money);
    } catch (err) {
      setError("Não foi possível carregar os dados");
    } finally {
      setLoading(false);
    }
  }

  function toggleCart(row: BuyRow) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.ticker === row.ticker);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { ticker: row.ticker, price: row.price ?? 0, qty: 0 }];
    });
  }

  function updateQty(ticker: string, qty: number) {
    if (!Number.isFinite(qty) || qty < 0) qty = 0;
    setCart((prev) =>
      prev.map((i) => (i.ticker === ticker ? { ...i, qty } : i))
    );
  }

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );

  const portfolioTotal = useMemo(
    () => portfolio.reduce((s, i) => s + i.price * i.quantity, 0),
    [portfolio]
  );

  const combinedTotal = portfolioTotal + cartTotal;

  function fmtMoney(v: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(v);
  }

  return (
    <main style={containerStyle}>
      <h1 style={headingStyle}>Sugestão de compra</h1>
      <div style={{ marginTop: 16 }}>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="Valor para investir"
          style={inputStyle}
        />
        <button
          type="button"
          style={{ ...buttonStyle, marginLeft: 8, opacity: loading ? 0.6 : 1 }}
          onClick={handleLoad}
          disabled={loading}
        >
          {loading ? "Carregando..." : "Buscar"}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: 12, color: "#ff5555" }}>{error}</p>
      )}

      {rows.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ticker</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Preço</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const inCart = cart.some((c) => c.ticker === r.ticker);
              return (
                <tr key={r.ticker}>
                  <td style={tdStyle}>{r.ticker}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {fmtMoney(r.price ?? 0)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button style={buttonStyle} onClick={() => toggleCart(r)}>
                      {inCart ? "Remover" : "Adicionar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {cart.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ ...headingStyle, fontSize: 24 }}>Carrinho</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Ticker</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Preço</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qtd</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% carrinho</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% carteira</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => {
                const cost = item.price * item.qty;
                const cartPct = cartTotal ? (cost / cartTotal) * 100 : 0;
                const existing = portfolio.find((p) => p.ticker === item.ticker);
                const existingValue = existing
                  ? existing.price * existing.quantity
                  : 0;
                const portfolioPct = combinedTotal
                  ? ((existingValue + cost) / combinedTotal) * 100
                  : 0;
                return (
                  <tr key={item.ticker}>
                    <td style={tdStyle}>{item.ticker}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {fmtMoney(item.price)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={(e) =>
                          updateQty(item.ticker, Number(e.target.value))
                        }
                        style={{ ...inputStyle, width: 60 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {cartPct.toFixed(2)}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {portfolioPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ marginTop: 12 }}>
            Total carrinho: {fmtMoney(cartTotal)}
            {amount != null && ` / Disponível: ${fmtMoney(amount)}`}
          </p>
        </div>
      )}
    </main>
  );
}

