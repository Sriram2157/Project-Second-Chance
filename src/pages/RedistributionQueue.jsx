import { useMemo, useState } from "react";
import { redistributionQueue, scenarioForDiscount } from "../lib/finance.js";
import { formatCurrency, formatNumber } from "../lib/format.js";
import {
  Badge, DeadlineBadge, Callout, Disclaimer,
} from "../components/ui.jsx";

export default function RedistributionQueue() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let list = redistributionQueue();
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) => r.product.name.toLowerCase().includes(q) || r.product.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [statusFilter, query]);

  const totalUnits = rows.reduce((s, r) => s + r.remainingUnits, 0);
  const totalSalvage = rows.reduce((s, r) => s + r.salvageValue, 0);
  const expiredCount = rows.filter((r) => r.status === "Expired").length;

  const statusTone = (s) =>
    s === "Expired" ? "red" : s === "Action now" ? "red" : s === "Planned" ? "amber" : s === "Not required" ? "neutral" : "green";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Redistribution Queue</h1>
          <p className="page-sub">
            Remaining stock after a 25% markdown window that may be suitable for
            redistribution. Eligibility is a flag, not a completed donation.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><span className="accent-bar" />
          <div className="stat-label">Lines queued</div>
          <div className="stat-value">{formatNumber(rows.length)}</div>
          <div className="stat-foot">Eligible remainder after markdown</div>
        </div>
        <div className="stat"><span className="accent-bar" />
          <div className="stat-label">Units to redistribute</div>
          <div className="stat-value">{formatNumber(totalUnits)}</div>
          <div className="stat-foot">Estimated remainder</div>
        </div>
        <div className="stat"><span className="accent-bar" />
          <div className="stat-label">Illustrative salvage value</div>
          <div className="stat-value">{formatCurrency(totalSalvage)}</div>
          <div className="stat-foot">At assumed per-unit salvage</div>
        </div>
        <div className="stat danger"><span className="accent-bar" />
          <div className="stat-label">Expired</div>
          <div className="stat-value">{formatNumber(expiredCount)}</div>
          <div className="stat-foot">Cannot be redistributed</div>
        </div>
      </div>

      <Callout tone="warning">
        <strong>Food safety first.</strong> A donation or redistribution is only
        recorded once a completed action is logged in this prototype. Expired
        use-by items must never be redistributed for human consumption.
      </Callout>

      <div className="control-row" style={{ marginTop: 20 }}>
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input className="input" placeholder="Search products or IDs…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Action now">Action now</option>
            <option value="Planned">Planned</option>
            <option value="Monitor">Monitor</option>
            <option value="Not required">Not required</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Deadline</th>
              <th className="num">Initial units</th>
              <th className="num">Sold @25%</th>
              <th className="num">Remainder</th>
              <th>Eligibility</th>
              <th>Status</th>
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="faint" style={{ padding: 24, textAlign: "center" }}>
                No lines match this filter. All remainders are cleared by expected demand.
              </td></tr>
            )}
            {rows.map((r) => {
              const m25 = scenarioForDiscount(r.product, 0.25);
              return (
                <tr key={r.product.id}>
                  <td>
                    <div>{r.product.name}</div>
                    <div className="faint mono">{r.product.id} · {r.product.category}</div>
                  </td>
                  <td className="num">
                    <DeadlineBadge days={r.product.daysRemaining} type={r.product.deadlineType} />
                    <div className="faint" style={{ fontSize: 10 }}>{r.product.deadlineType}</div>
                  </td>
                  <td className="num muted">{r.product.units}</td>
                  <td className="num muted">{formatNumber(m25.unitsSold, 1)}</td>
                  <td className="num"><strong>{r.remainingUnits}</strong></td>
                  <td>
                    {r.product.redistributionEligible
                      ? <Badge tone="green" dot>Eligible</Badge>
                      : <Badge tone="neutral" dot>Not eligible</Badge>}
                  </td>
                  <td><Badge tone={statusTone(r.status)} dot>{r.status}</Badge></td>
                  <td className="muted" style={{ maxWidth: 240 }}>{r.nextAction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Disclaimer>
        <strong>Illustrative.</strong> Remainders assume the 25% markdown
        demand model. Salvage value uses the per-unit figures in the sample
        dataset. No donation is implied to have taken place; statuses reflect
        eligibility and recommended timing only.
      </Disclaimer>
    </div>
  );
}
