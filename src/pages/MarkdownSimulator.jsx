import { useMemo, useState } from "react";
import { INVENTORY } from "../data/inventory.js";
import {
  scenarioForDiscount, baselineScenario,
} from "../lib/finance.js";
import {
  formatCurrency, formatNumber, formatPercent,
} from "../lib/format.js";
import {
  Badge, DeadlineBadge, Callout, Disclaimer, Meter,
} from "../components/ui.jsx";
import { BarChart } from "../components/BarChart.jsx";
import { CHART } from "../lib/chartTheme.js";

const DISCOUNTS = [
  { key: 0.10, label: "10% markdown" },
  { key: 0.25, label: "25% markdown" },
  { key: 0.40, label: "40% markdown" },
];

export default function MarkdownSimulator() {
  const [productId, setProductId] = useState(INVENTORY[0].id);
  const [demandFactor, setDemandFactor] = useState(1.0);
  const [customDiscount, setCustomDiscount] = useState(0.25);
  const [useCustom, setUseCustom] = useState(false);

  const product = INVENTORY.find((p) => p.id === productId);
  const dailyDemand = product.baselineDailyDemand * demandFactor;

  const overrides = { dailyDemand };

  const baseline = useMemo(
    () => baselineScenario(product, overrides),
    [product, dailyDemand]
  );

  const scenarios = DISCOUNTS.map((d) => ({
    label: d.label,
    discount: d.key,
    ...scenarioForDiscount(product, d.key, overrides),
  }));

  const selected = useCustom
    ? { label: `${(customDiscount * 100).toFixed(0)}% markdown`, discount: customDiscount, ...scenarioForDiscount(product, customDiscount, overrides) }
    : scenarios.reduce((best, s) => (s.contribution > best.contribution ? s : best), scenarios[0]);

  const chartData = [
    { name: "Baseline", contribution: baseline.contribution, revenue: baseline.revenue },
    ...scenarios.map((s) => ({
      name: `${(s.discount * 100).toFixed(0)}%`,
      contribution: s.contribution,
      revenue: s.revenue,
    })),
  ];

  const expired = product.daysRemaining <= 0;
  const safeToSell = !expired;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Markdown Simulator</h1>
          <p className="page-sub">
            Pick a product, adjust demand assumptions, and compare markdown
            strategies against a consistent baseline. A higher discount is not
            automatically better.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Controls + selection */}
        <div className="stack">
          <div className="card">
            <div className="card-title">Product & demand</div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Product</label>
              <select
                className="select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                style={{ width: "100%" }}
              >
                {INVENTORY.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name} ({p.daysRemaining.toFixed(1)}d)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span className="muted">Demand multiplier</span>
              <strong>{demandFactor.toFixed(2)}×</strong>
            </div>
            <input
              type="range"
              min="0.25" max="2" step="0.05"
              value={demandFactor}
              onChange={(e) => setDemandFactor(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
              Scales full-price daily demand ({product.baselineDailyDemand} u/day).
              Elasticity {product.elasticity} drives the markdown response.
            </div>

            <div className="control-row" style={{ marginTop: 16, marginBottom: 0 }}>
              <div className="field">
                <label>Custom discount</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="range" min="0" max="0.6" step="0.05"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Number(e.target.value))}
                    style={{ width: 140, accentColor: "var(--accent)" }}
                  />
                  <span style={{ fontWeight: 600, width: 44 }}>
                    {(customDiscount * 100).toFixed(0)}%
                  </span>
                  <button
                    className={`btn ${useCustom ? "primary" : "ghost"}`}
                    onClick={() => setUseCustom((v) => !v)}
                  >
                    {useCustom ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Product snapshot</div>
            <div className="stack-sm" style={{ fontSize: 13 }}>
              <Row label="Category" value={product.category} />
              <Row label="Units at risk" value={formatNumber(product.units)} />
              <Row label="Normal price" value={formatCurrency(product.normalPrice)} />
              <Row label="Unit cost" value={formatCurrency(product.unitCost)} />
              <Row label="Deadline" value={<DeadlineBadge days={product.daysRemaining} type={product.deadlineType} />} />
              <Row label="Deadline type" value={product.deadlineType} />
              <Row label="Baseline daily demand" value={`${dailyDemand.toFixed(1)} u/day`} />
              <Row label="Redistribution eligible" value={product.redistributionEligible ? "Yes" : "No"} />
            </div>
            {expired && (
              <div style={{ marginTop: 12 }}>
                <Callout tone="danger">
                  <strong>Expired.</strong> This product has passed its{" "}
                  {product.deadlineType} deadline and cannot be sold. Sale figures
                  below are shown for reference only.
                </Callout>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="stack">
          <div className="card">
            <div className="card-title">Strategy comparison</div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="num">Baseline</th>
                    {scenarios.map((s) => (
                      <th key={s.discount} className="num">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Metric label="Selling price" fmt={formatCurrency}
                    baseline={product.normalPrice}
                    values={scenarios.map((s) => s.price)} />
                  <Metric label="Expected demand (forecast)" fmt={(v) => formatNumber(v, 1)}
                    baseline={baseline.demandedUnits}
                    values={scenarios.map((s) => s.demandedUnits)} />
                  <Metric label="Units sold (rounded)" fmt={(v) => formatNumber(v, 0)}
                    baseline={baseline.unitsSold}
                    values={scenarios.map((s) => s.unitsSold)} />
                  <Metric label="Revenue" fmt={formatCurrency}
                    baseline={baseline.revenue}
                    values={scenarios.map((s) => s.revenue)} />
                  <Metric label="Cost of units sold" fmt={formatCurrency}
                    baseline={baseline.costOfUnitsSold}
                    values={scenarios.map((s) => s.costOfUnitsSold)} />
                  <Metric label="Contribution" fmt={formatCurrency} bold
                    baseline={baseline.contribution}
                    values={scenarios.map((s) => s.contribution)} />
                  <Metric label="Units remaining" fmt={formatNumber}
                    baseline={baseline.unitsRemaining}
                    values={scenarios.map((s) => s.unitsRemaining)} />
                  <Metric label="Sell-through" fmt={formatPercent}
                    baseline={baseline.sellThrough}
                    values={scenarios.map((s) => s.sellThrough)} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Contribution vs revenue by strategy</div>
            <BarChart
              data={chartData}
              series={[
                { key: "revenue", name: "Revenue", color: CHART.navy400 },
                { key: "contribution", name: "Contribution", color: CHART.accent },
              ]}
              height={240}
              formatValue={(v) => formatCurrency(v)}
              formatAxis={(v) => `£${Math.round(v)}`}
            />
          </div>

          <div className="card">
            <div className="card-title">
              Selected strategy: {selected.label}
            </div>
            <div className="grid-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <Mini label="Incremental contribution" value={formatCurrency(selected.contribution - baseline.contribution)}
                tone={selected.contribution - baseline.contribution >= 0 ? "accent" : "danger"} />
              <Mini label="Extra units sold" value={formatNumber(Math.max(0, selected.unitsSold - baseline.unitsSold), 1)} />
              <Mini label="Units left to clear" value={formatNumber(selected.unitsRemaining)} tone={selected.unitsRemaining > 0 ? "warning" : "accent"} />
            </div>
            {safeToSell ? (
              <Callout>
                <strong>Like-for-like note.</strong> Baseline is the current
                full-price trajectory using the same demand model, inventory and
                time window. Demand is a fractional forecast; units sold are
                rounded to whole numbers before financial calculations. The
                model does not account for full-price cannibalisation — markdown
                sales are assumed to be additional, not displacing full-price
                sales. This may overstate incremental contribution.
              </Callout>
            ) : (
              <Callout tone="danger">
                Product is past its deadline — no sale is permitted. Route
                remaining units to redistribution or disposal.
              </Callout>
            )}
          </div>
        </div>
      </div>

      <Disclaimer>
        <strong>Illustrative.</strong> Demand is modelled with a
        constant-elasticity curve over the remaining sales window and is capped
        by stock. The demand figure is a fractional forecast; units sold are
        rounded to the nearest whole unit before calculating revenue, cost and
        contribution. Revenue is units sold × selling price; contribution is
        revenue minus the acquisition cost of units sold. Figures do not include
        operating or implementation costs (covered on the Impact Report). All
        demand estimates and weights are illustrative, unvalidated assumptions.
      </Disclaimer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Metric({ label, fmt, baseline, values, bold }) {
  return (
    <tr>
      <td className={bold ? "" : "muted"} style={{ fontWeight: bold ? 600 : 400 }}>{label}</td>
      <td className="num muted">{fmt(baseline)}</td>
      {values.map((v, i) => (
        <td key={i} className="num" style={{ fontWeight: bold ? 600 : 400 }}>
          {fmt(v)}
        </td>
      ))}
    </tr>
  );
}

function Mini({ label, value, tone = "accent" }) {
  return (
    <div className="stat" style={{ padding: 16 }}>
      <span className="accent-bar" style={{ background: tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--accent)" }} />
      <div className="stat-label" style={{ fontSize: 11 }}>{label}</div>
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
    </div>
  );
}
