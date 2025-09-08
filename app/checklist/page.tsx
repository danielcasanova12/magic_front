"use client";

import { useEffect, useMemo, useState } from "react";
import { PortfolioAsset, loadPortfolio } from "../../lib/portfolio";
import Link from 'next/link';

type Row = {
  ticker: string;
  company_name?: string | null;
  earning_yield?: number | string | null;
  roic_pct?: number | string | null;
  final_rank?: number | string | null;
  [key: string]: any; // Allow other properties
};

type ApiResp<T> = {
  ok: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  rows: T[];
  error?: string;
};

type StockPrice = {
  ticker: string;
  price: number;
};

// ===== utils =====
function n(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function fmtPct(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return `${(x * 100).toFixed(2)}%`;
}
function fmtMoney(v: unknown) {
  const x = n(v);
  if (x === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(x);
}
async function fetchJsonSafe<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} — Body: ${body}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        // To prevent throwing on simple text responses, let's be more specific
        // or decide what to do. For now, we assume JSON is expected.
        console.warn(`Expected JSON response but got ${ct}`);
    }
    return res.json();
}

async function fetchPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const data = await fetchJsonSafe<ApiResp<StockPrice>>(`/api/stocks?tickers=${tickers.join(",")}`);
    if (data.ok && Array.isArray(data.rows)) {
      return data.rows.reduce((acc: Record<string, number>, stock: StockPrice) => {
        acc[stock.ticker.toUpperCase()] = stock.price;
        return acc;
      }, {});
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return {};
  }
}

export default function ChecklistPage() {
  // Tabela principal
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<string>("final_rank");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  // Análise da carteira
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [top10, setTop10] = useState<Row[]>([]);

  // Carregar dados iniciais (carteira, top 10, tabela principal)
  useEffect(() => {
    const userPortfolio = loadPortfolio();
    setPortfolio(userPortfolio);

    const tickers = userPortfolio.map(a => a.ticker);
    if (tickers.length > 0) {
      fetchPrices(tickers).then(setPrices);
    }

    // Fetch top 10
    fetchJsonSafe<ApiResp<Row>>(`/api/checklist?sort=final_rank&pageSize=10`).then(data => {
        if(data.ok) setTop10(data.rows);
    });

    // Fetch tabela principal
    fetchJsonSafe<ApiResp<Row>>(`/api/checklist?sort=final_rank&pageSize=30`).then(data => {
        if(data.ok) setRows(data.rows);
        setLoading(false);
    });
  }, []);

  // Análise e recomendações
  const analysis = useMemo(() => {
    const portfolioTickers = new Set(portfolio.map(a => a.ticker.toUpperCase()));
    const top10Tickers = new Set(top10.map(t => t.ticker.toUpperCase()));

    const totalValue = portfolio.reduce((acc, asset) => {
      const price = prices[asset.ticker.toUpperCase()] || 0;
      return acc + (asset.quantity * price);
    }, 0);

    const targetValuePerAsset = totalValue > 0 ? totalValue * 0.10 : 0;

    const ownInTop10 = portfolio.filter(a => top10Tickers.has(a.ticker.toUpperCase()));
    const ownNotInTop10 = portfolio.filter(a => !top10Tickers.has(a.ticker.toUpperCase()));
    const missingTop10 = top10.filter(t => !portfolioTickers.has(t.ticker.toUpperCase()));

    return { totalValue, targetValuePerAsset, ownInTop10, ownNotInTop10, missingTop10 };
  }, [portfolio, prices, top10]);


  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Análise de Carteira (Magic Formula)</h1>
        <Link href="/" className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Gerenciar Carteira
        </Link>
      </header>

      {/* Seção de Análise */}
      <section className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-bold mb-4">Recomendações</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ações a Manter/Ajustar */}
          <div>
            <h3 className="font-bold text-lg text-green-700">Manter / Ajustar (no Top 10)</h3>
            <p className="text-sm text-gray-600 mb-2">Valor alvo por ativo: {fmtMoney(analysis.targetValuePerAsset)}</p>
            <ul className="list-disc pl-5">
              {analysis.ownInTop10.map(a => <li key={a.ticker}>{a.ticker}</li>)}
            </ul>
            {analysis.ownInTop10.length === 0 && <p className="text-gray-500">Nenhuma.</p>}
          </div>
          {/* Ações a Comprar */}
          <div>
            <h3 className="font-bold text-lg text-blue-700">Comprar (no Top 10)</h3>
             <ul className="list-disc pl-5">
              {analysis.missingTop10.map(a => <li key={a.ticker}>{a.ticker} (Rank: {a.final_rank})</li>)}
            </ul>
            {analysis.missingTop10.length === 0 && <p className="text-gray-500">Nenhuma.</p>}
          </div>
          {/* Ações a Vender */}
          <div>
            <h3 className="font-bold text-lg text-red-700">Vender (fora do Top 10)</h3>
             <ul className="list-disc pl-5">
              {analysis.ownNotInTop10.map(a => <li key={a.ticker}>{a.ticker}</li>)}
            </ul>
            {analysis.ownNotInTop10.length === 0 && <p className="text-gray-500">Nenhuma.</p>}
          </div>
        </div>
      </section>

      {/* Tabela de Referência */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Ranking Completo (Referência)</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b">
                        <th className="p-2">Rank</th>
                        <th className="p-2">Ticker</th>
                        <th className="p-2">Empresa</th>
                        <th className="p-2">Earning Yield</th>
                        <th className="p-2">ROIC</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && <tr><td colSpan={5} className="text-center p-4">Carregando...</td></tr>}
                    {rows.map(row => (
                        <tr key={row.ticker} className="border-b">
                            <td className="p-2 font-bold">{row.final_rank}</td>
                            <td className="p-2">{row.ticker}</td>
                            <td className="p-2">{row.company_name}</td>
                            <td className="p-2">{fmtPct(row.earning_yield)}</td>
                            <td className="p-2">{fmtPct(row.roic_pct)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>
    </main>
  );
}
