"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

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
  const [amount, setAmount] = useState("");

  useEffect(() => {
    fetch("/api/buy")
      .then((r) => r.json())
      .then((j: ApiResp<BuyRow>) => {
        if (j.ok) setRows(j.rows);
      })
      .catch(() => {});
  }, []);

  const plan = useMemo(() => {
    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0 || rows.length === 0)
      return { items: [] as { ticker: string; price: number; qty: number; cost: number }[], leftover: 0 };
    const per = total / 10;
    let leftover = total;
    const items = rows.map((r) => {
      const price = r.price ?? 0;
      const qty = price > 0 ? Math.floor(per / price) : 0;
      const cost = qty * price;
      leftover -= cost;
      return { ticker: r.ticker, price, qty, cost };
    });
    if (items[0]) {
      const first = items[0];
      const extra = first.price > 0 ? Math.floor(leftover / first.price) : 0;
      first.qty += extra;
      first.cost += extra * first.price;
      leftover -= extra * first.price;
    }
    return { items, leftover };
  }, [amount, rows]);

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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor para investir"
          style={inputStyle}
        />
      </div>

      {plan.items.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ticker</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Preço</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Qtd</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => (
              <tr key={item.ticker}>
                <td style={tdStyle}>{item.ticker}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(item.price)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{item.qty}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtMoney(item.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {plan.items.length > 0 && (
        <p style={{ marginTop: 16, fontWeight: 600 }}>
          Sobra: {fmtMoney(plan.leftover)}
        </p>
      )}
    </main>
  );
}
