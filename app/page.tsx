"use client";
import { useEffect, useState, useMemo } from "react";

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
    <main className="p-6">
      <h1 className="text-2xl font-bold">Minha carteira</h1>

      <div className="mt-4 flex gap-2">
        <input
          list="tickers-list"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker"
          className="border p-2 rounded"
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
          className="border p-2 rounded w-24"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Preço"
          className="border p-2 rounded w-24"
        />
        <button onClick={addItem} className="border px-3 py-2 rounded">
          Adicionar
        </button>
      </div>

      {portfolio.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Ticker</th>
              <th className="text-right p-2">Qtd</th>
              <th className="text-right p-2">Preço médio</th>
              <th className="text-right p-2">Valor</th>
              <th className="text-right p-2">% carteira</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((item) => {
              const value = item.quantity * item.price;
              const pct = total ? (value / total) * 100 : 0;
              return (
                <tr key={item.ticker}>
                  <td className="p-2">{item.ticker}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right">{fmtMoney(item.price)}</td>
                  <td className="p-2 text-right">{fmtMoney(value)}</td>
                  <td className="p-2 text-right">{pct.toFixed(2)}%</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => removeItem(item.ticker)}
                      className="text-red-600"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="mt-4 font-semibold">
        Total na carteira: {fmtMoney(total)}
      </p>
    </main>
  );
}
