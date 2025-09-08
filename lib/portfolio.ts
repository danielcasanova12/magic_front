export type PortfolioAsset = {
  ticker: string;
  quantity: number;
  avgPrice: number;
};

const PORTFOLIO_KEY = "magic_web_portfolio";

export function loadPortfolio(): PortfolioAsset[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      // Basic validation
      return arr.filter(
        (item) =>
          typeof item.ticker === "string" &&
          typeof item.quantity === "number" &&
          typeof item.avgPrice === "number"
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function savePortfolio(portfolio: PortfolioAsset[]) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
}
