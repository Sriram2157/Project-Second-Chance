import { formatDays } from "../lib/format.js";

const ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  radar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 12l7-5" />
      <path d="M12 2v4M12 12h-7" opacity="0.5" />
    </svg>
  ),
  markdown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V7l5 6 5-6v10" />
      <path d="M16 17l3-4 3 4V7" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4M20 12H4M20 17H4" />
      <circle cx="20" cy="7" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="17" r="1.5" fill="currentColor" />
    </svg>
  ),
  impact: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M6 21V10M12 21V4M18 21v-7" />
    </svg>
  ),
};

export function NavIcon({ name }) {
  return ICONS[name] || null;
}

export function Badge({ tone = "neutral", dot = false, children }) {
  return (
    <span className={`badge ${tone}${dot ? " dot" : ""}`}>
      {children}
    </span>
  );
}

export function ScorePill({ score }) {
  const tone = score >= 70 ? "high" : score >= 45 ? "mid" : "low";
  return <span className={`score ${tone}`}>{score.toFixed(1)}</span>;
}

export function DeadlineBadge({ days, type }) {
  if (days <= 0) return <Badge tone="red" dot>Expired</Badge>;
  if (days <= 1.5) return <Badge tone="red" dot>{formatDays(days)}</Badge>;
  if (days <= 3) return <Badge tone="amber" dot>{formatDays(days)}</Badge>;
  return <Badge tone="green" dot>{formatDays(days)}</Badge>;
}

export function Meter({ value, max = 1, tone = "accent" }) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    tone === "warning" ? "var(--warning)"
    : tone === "danger" ? "var(--danger)"
    : "var(--accent)";
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemax="100">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Callout({ tone = "accent", children }) {
  return <div className={`callout ${tone === "accent" ? "" : tone}`}>{children}</div>;
}

export function Disclaimer({ children }) {
  return <p className="disclaimer">{children}</p>;
}

export function StatCard({ label, value, foot, tone = "accent" }) {
  return (
    <div className={`stat ${tone === "accent" ? "" : tone}`}>
      <span className="accent-bar" />
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}
