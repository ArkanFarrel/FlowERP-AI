// Standard Exchange Rates (Base USD = 1.0)
const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  IDR: 16000,
  EUR: 0.92,
  SGD: 1.35,
};

export function getSelectedCurrency(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("currency") || "USD";
  }
  return "USD";
}

export function getCurrencySymbol(): string {
  const currency = getSelectedCurrency();
  switch (currency) {
    case "IDR":
      return "Rp ";
    case "EUR":
      return "€";
    case "SGD":
      return "S$ ";
    case "USD":
    default:
      return "$";
  }
}

export function getExchangeRate(currency?: string): number {
  const target = currency || getSelectedCurrency();
  if (typeof window !== "undefined") {
    const cachedRates = localStorage.getItem("exchange_rates");
    if (cachedRates) {
      try {
        const parsed = JSON.parse(cachedRates);
        if (parsed && parsed[target]) {
          return parsed[target];
        }
      } catch {
        // fallback
      }
    }
  }
  return DEFAULT_RATES[target] || 1.0;
}

/**
 * Automatically converts base USD values to the active target currency based on exchange rates.
 */
export function formatPrice(amountInUSD: number | string): string {
  const currency = getSelectedCurrency();
  const symbol = getCurrencySymbol();
  const numStr = String(amountInUSD || 0).replace(/[^0-9.-]+/g, "");
  const baseValue = Number(numStr) || 0;

  // Convert base USD amount to target currency using live rate
  const rate = getExchangeRate(currency);
  const convertedValue = Math.round(baseValue * rate);

  if (currency === "IDR") {
    return `Rp ${convertedValue.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
  }

  return `${symbol}${convertedValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

/**
 * Fetch live real-time exchange rates from public API (USD base) and cache locally.
 */
export async function syncLiveExchangeRates() {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data && data.result === "success" && data.rates) {
      const liveRates = {
        USD: 1.0,
        IDR: Math.round(data.rates.IDR || 16000),
        EUR: data.rates.EUR || 0.92,
        SGD: data.rates.SGD || 1.35,
      };
      localStorage.setItem("exchange_rates", JSON.stringify(liveRates));
      window.dispatchEvent(new Event("currency_change"));
    }
  } catch (err) {
    console.warn("Using fallback exchange rates:", err);
  }
}
