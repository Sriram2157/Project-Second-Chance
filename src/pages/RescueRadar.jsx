import { useMemo, useState } from "react";
import { INVENTORY } from "../data/inventory.js";
import {
  computeRescueScore, recommendAction, scenarioForDiscount, DEFAULT_WEIGHTS,
  getNormalisedWeights,
} from "../lib/finance.js";
import { formatCurrency } from "../lib/format.js";
import {
  DeadlineBadge, ScorePill, Meter, Disclaimer, Callout, Badge,
} from "../components/ui.jsx";

const CATEGORIES = ["All", ...Array.from(new Set(INVENTORY.map((p) => p.category)))];

export default function RescueRadar() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [deadline, setDeadline] = useState("All");
  const [sort, setSort] = useState({ key: "score", dir: "desc" });
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    let list = INVENTORY.map((p) => {
      const score = computeRescueScore(p, weights);
      const rec = recommendAction(p);
      return { product: p, ...score, rec };
    });
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.product.name.toLowerCase().includes(q) ||
          r.product.category.toLowerCase().includes(q) ||
          r.product.id.toLowerCase().includes(q)
      );
    }
    if (category !== "All") list = list.filter((r) => r.product.category === category);
    if (deadline === "critical") list = list.filter((r) => r.product.daysRemaining <= 1.5);
    else if (deadline === "soon") list = list.filter((r) => r.product.daysRemaining <= 3);
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "score") return (a.score - b.score) * dir;
      if (sort.key === "days") return (a.product.daysRemaining - b.product.daysRemaining) * dir;
      if (sort.key === "units") return (a.product.units - b.product.units) * dir;
      return 0;
    });
    return list;
  }, [query, category, deadline, sort, weights]);

  const setSortKey = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const normalised = getNormalisedWeights(weights);
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightSumValid = Math.abs(weightSum - 1.0) < 0.001;

  const weightRows = [
    ["urgency", "Urgency (time remaining)"],
    ["quantityAtRisk", "Quantity at risk"],
    ["demandGap", "Demand gap"],
    ["contributionPotential", "Contribution potential"],
    ["redistributionFeasibility", "Redistribution feasibility"],
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Rescue Radar</h1>
          <p className="page-sub">
            Search and filter at-risk inventory. Each line carries a transparent
            Rescue Score and a recommended action with an explanation. Click a
            row for the full recommendation detail.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">Rescue Score weights (illustrative)</div>
          <div className="weight-row" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
            <strong style={{ fontSize: 12 }}>Factor</strong>
            <strong className="num" style={{ fontSize: 12 }}>Weight</strong>
            <strong className="num" style={{ fontSize: 12 }}>Share</strong>
          </div>
          {weightRows.map(([key, label]) => (
            <div className="weight-row" key={key}>
              <label>{label}</label>
              <input
                className="input num"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={weights[key]}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(1, Number(e.target.value) || 0));
                  setWeights((w) => ({ ...w, [key]: v }));
                }}
                style={{ minWidth: 70, textAlign: "right" }}
              />
              <Meter value={normalised[key]} max={1} />
            </div>
          ))}
          <div className="disclaimer">
            Weights sum to {weightSum.toFixed(2)}.
            {!weightSumValid && " Scores use normalised weights so they remain on a 0–100 scale regardless of the raw sum."}
            {" "}All factors must be non-negative. The score is a normalised 0–100 aid, not a validated prediction.
          </div>
        </div>
        <div className="card">
          <div className="card-title">What the score considers</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li><strong>Urgency</strong> — fewer days remaining scores higher.</li>
            <li><strong>Quantity at risk</strong> — larger stock lines score higher.</li>
            <li><strong>Demand gap</strong> — stock unlikely to sell at full price scores higher.</li>
            <li><strong>Contribution potential</strong> — recoverable margin at 25% markdown.</li>
            <li><strong>Redistribution feasibility</strong> — eligibility and salvage value.</li>
          </ul>
          <Callout tone="warning">
            <strong>Food-safety rule.</strong> A score never overrides a use-by
            deadline. Expired use-by items are flagged for removal regardless of
            score. Best-before is a quality limit, not a safety limit, and is
            treated separately.
          </Callout>
        </div>
      </div>

      <div className="control-row">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="input"
            placeholder="Search products, categories, IDs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Deadline</label>
          <select className="select" value={deadline} onChange={(e) => setDeadline(e.target.value)}>
            <option value="All">All</option>
            <option value="critical">Critical (≤ 1.5d)</option>
            <option value="soon">Soon (≤ 3d)</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num" onClick={() => setSortKey("units")} style={{ cursor: "pointer" }}>Units</th>
              <th className="num" onClick={() => setSortKey("days")} style={{ cursor: "pointer" }}>Deadline</th>
              <th className="num">Sell-through @25%</th>
              <th className="num" onClick={() => setSortKey("score")} style={{ cursor: "pointer" }}>Score</th>
              <th>Action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="faint" style={{ padding: 24, textAlign: "center" }}>
                No products match these filters.
              </td></tr>
            )}
            {rows.map((r) => {
              const m25 = scenarioForDiscount(r.product, 0.25);
              const sellThrough = m25.sellThrough;
              const isOpen = expanded === r.product.id;
              return (
                <>
                  <tr
                    key={r.product.id}
                    onClick={() => setExpanded(isOpen ? null : r.product.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div>{r.product.name}</div>
                      <div className="faint mono">{r.product.id}</div>
                    </td>
                    <td className="num">{r.product.units}</td>
                    <td className="num">
                      <DeadlineBadge days={r.product.daysRemaining} type={r.product.deadlineType} />
                      <div className="faint" style={{ fontSize: 10, marginTop: 2 }}>
                        {r.product.deadlineType}
                      </div>
                    </td>
                    <td className="num">
                      <div>{Math.round(sellThrough * 100)}%</div>
                      <div style={{ marginTop: 4 }}>
                        <Meter value={sellThrough} />
                      </div>
                    </td>
                    <td className="num">
                      <ScorePill score={r.score} />
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.rec.action}</div>
                      {r.rec.safeToSell ? null : (
                        <Badge tone="red" dot>Unsafe</Badge>
                      )}
                    </td>
                    <td className="num faint" style={{ fontSize: 11 }}>
                      {isOpen ? "▲" : "▼"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${r.product.id}-detail`} style={{ background: "var(--surface)" }}>
                      <td colSpan={7} style={{ padding: "16px 24px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: 13 }}>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Why</div>
                            <div>{r.rec.reason}</div>
                          </div>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Trade-off</div>
                            <div>{r.rec.tradeOff}</div>
                          </div>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Deadline</div>
                            <div>{r.product.deadlineType} — {r.rec.daysRemaining.toFixed(1)} days remaining</div>
                          </div>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Unsold stock</div>
                            <div>{r.rec.remainderAction}</div>
                          </div>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Redistribution eligibility</div>
                            <div>
                              {r.product.redistributionEligible ? (
                                r.rec.eligibilityConfirmed
                                  ? <Badge tone="green" dot>Confirmed eligible</Badge>
                                  : <Badge tone="amber" dot>Flagged — needs confirmation</Badge>
                              ) : (
                                <Badge tone="neutral" dot>Not eligible</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Price / Cost</div>
                            <div>{formatCurrency(r.product.normalPrice)} / {formatCurrency(r.product.unitCost)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Disclaimer>
        <strong>Illustrative.</strong> Sell-through uses the prototype demand
        model (constant-elasticity) and is not a validated forecast. Score
        factors and the recommended action explanation are visible in every
        row — click to expand the full detail. All scores, demand estimates
        and weights are illustrative, unvalidated assumptions.
      </Disclaimer>
    </div>
  );
}
