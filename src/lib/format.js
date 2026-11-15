// Formatting helpers shared across the app.

export function formatCurrency(value, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const { compact = false, decimals } = opts;
  const num = Number(value);
  if (decimals !== undefined) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? "compact" : "standard",
    }).format(num);
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  }).format(num);
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

export function formatPercent(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(Number(value) * 100).toFixed(decimals)}%`;
}

export function formatDays(days) {
  if (days <= 0) return "Expired";
  if (days < 1) return `${Math.round(days * 24)}h`;
  const d = Math.round(days);
  return d === 1 ? "1 day" : `${d} days`;
}
