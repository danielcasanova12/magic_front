"use client";
import { useState, useEffect, useMemo } from "react";
import { PortfolioAsset, loadPortfolio, savePortfolio } from "../lib/portfolio";
import Link from 'next/link';

type StockPrice = {
  ticker: string;
  price: number;
};

async function fetchPrices(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const res = await fetch(`/api/stocks?tickers=${tickers.join(",")}`);
    const data = await res.json();
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function HomePage() {
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [newAsset, setNewAsset] = useState({ ticker: "", quantity: "", avgPrice: "" });

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

  useEffect(() => {
    const tickers = portfolio.map((a) => a.ticker);
    if (tickers.length > 0) {
      fetchPrices(tickers).then(setPrices);
    }
  }, [portfolio]);

  const handleSavePortfolio = (newPortfolio: PortfolioAsset[]) => {
    setPortfolio(newPortfolio);
    savePortfolio(newPortfolio);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = newAsset.ticker.toUpperCase().trim();
    const quantity = parseInt(newAsset.quantity, 10);
    const avgPrice = parseFloat(newAsset.avgPrice);

    if (ticker && !isNaN(quantity) && !isNaN(avgPrice) && quantity > 0 && avgPrice > 0) {
      const updatedPortfolio = [...portfolio, { ticker, quantity, avgPrice }];
      handleSavePortfolio(updatedPortfolio);
      setNewAsset({ ticker: "", quantity: "", avgPrice: "" });
    }
  };

  const handleRemoveAsset = (ticker: string) => {
    const updatedPortfolio = portfolio.filter((a) => a.ticker !== ticker);
    handleSavePortfolio(updatedPortfolio);
  };

  const { totalValue, portfolioWithData } = useMemo(() => {
    let totalValue = 0;
    const portfolioWithData = portfolio.map((asset) => {
      const currentPrice = prices[asset.ticker.toUpperCase()] || 0;
      const currentValue = currentPrice * asset.quantity;
      totalValue += currentValue;
      return {
        ...asset,
        currentPrice,
        currentValue,
      };
    });
    return { totalValue, portfolioWithData };
  }, [portfolio, prices]);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Minha Carteira</h1>
        <Link href="/checklist" className="px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Analisar Carteira
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna da Carteira */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-2">Ativos</h2>
            <div className="text-3xl font-bold mb-4">{formatMoney(totalValue)}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Ticker</th>
                    <th className="p-2">Quantidade</th>
                    <th className="p-2">Preço Médio</th>
                    <th className="p-2">Preço Atual</th>
                    <th className="p-2">Valor Total</th>
                    <th className="p-2">% Carteira</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioWithData.map((asset) => (
                    <tr key={asset.ticker} className="border-b">
                      <td className="p-2 font-bold">{asset.ticker}</td>
                      <td className="p-2">{asset.quantity}</td>
                      <td className="p-2">{formatMoney(asset.avgPrice)}</td>
                      <td className="p-2">{formatMoney(asset.currentPrice)}</td>
                      <td className="p-2">{formatMoney(asset.currentValue)}</td>
                      <td className="p-2">
                        {totalValue > 0 ? ((asset.currentValue / totalValue) * 100).toFixed(2) : "0.00"}%
                      </td>
                      <td className="p-2">
                        <button onClick={() => handleRemoveAsset(asset.ticker)} className="text-red-500 hover:text-red-700">Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna de Adicionar Ativo */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Adicionar Ativo</h2>
            <form onSubmit={handleAddAsset}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2" htmlFor="ticker">Ticker</label>
                <input
                  id="ticker"
                  type="text"
                  value={newAsset.ticker}
                  onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="EX: PETR4"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2" htmlFor="quantity">Quantidade</label>
                <input
                  id="quantity"
                  type="number"
                  value={newAsset.quantity}
                  onChange={(e) => setNewAsset({ ...newAsset, quantity: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="100"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2" htmlFor="avgPrice">Preço Médio (R$)</label>
                <input
                  id="avgPrice"
                  type="number"
                  step="0.01"
                  value={newAsset.avgPrice}
                  onChange={(e) => setNewAsset({ ...newAsset, avgPrice: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="25.50"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600">
                Adicionar
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
