import { BarChart } from "../components/BarChart.jsx";
import { overviewStats, scenarioForDiscount } from "../lib/finance.js";
import { formatCurrency, formatNumber } from "../lib/format.js";
import { StatCard, DeadlineBadge, ScorePill, Disclaimer, Callout } from "../components/ui.jsx";
import { CHART } from "../lib/chartTheme.js";

export default function Overview({ onNavigate }) {
  const stats = overviewStats();
  const top = stats.ranked.slice(0, 6);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Operations Overview</h1>
          <p className="page-sub">
            A live snapshot of near-expiry stock, the recoverable value under a
            25% markdown strategy, and which lines need attention first.
          </p>
        </div>
        <button className="btn primary" onClick={() => onNavigate("radar")}>
          Review at-risk stock →
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          label="At-risk products"
          value={formatNumber(stats.atRisk)}
          foot="Lines flagged for review"
        />
        <StatCard
          label="Units at risk"
          value={formatNumber(stats.unitsAtRisk)}
          foot="Approaching their deadline"
        />
        <StatCard
          label="Baseline contribution"
          value={formatCurrency(stats.baselineContribution)}
          foot="Full-price demand forecast"
        />
        <StatCard
          label="Strategy contribution @ 25%"
          value={formatCurrency(stats.strategyContribution)}
          foot="Uniform 25% markdown"
        />
        <StatCard
          label="Incremental contribution"
          value={formatCurrency(stats.incrementalContribution)}
          foot="Strategy minus baseline"
          tone="accent"
        />
        <StatCard
          label="Need immediate review"
          value={formatNumber(stats.immediateReview)}
          foot="≤ 1.5 days remaining"
          tone="danger"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Priority preview — highest Rescue Score</div>
          <div className="table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Days left</th>
                  <th className="num">Units</th>
                  <th className="num">Score</th>
                </tr>
              </thead>
              <tbody>
                {top.map((row) => (
                  <tr
                    key={row.product.id}
                    onClick={() => onNavigate("markdown")}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div>{row.product.name}</div>
                      <div className="faint" style={{ fontSize: 11 }}>
                        {row.product.category}
                      </div>
                    </td>
                    <td className="num"><DeadlineBadge days={row.product.daysRemaining} /></td>
                    <td className="num">{row.product.units}</td>
                    <td className="num"><ScorePill score={row.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Contribution by priority line @ 25%</div>
          <BarChart
            data={top.map((r) => ({
              name: r.product.name.split(" ").slice(0, 2).join(" "),
              contribution: Math.round(scenarioForDiscount(r.product, 0.25).contribution),
            }))}
            series={[{ key: "contribution", name: "Contribution", color: CHART.accent }]}
            height={260}
            formatValue={(v) => formatCurrency(v)}
            formatAxis={(v) => `£${Math.round(v)}`}
          />
        </div>
      </div>

      <div className="stack" style={{ marginTop: 24 }}>
        <Callout>
          <strong>How to read this.</strong> Values are illustrative and derived
          from the prototype&apos;s documented demand model. The contribution figures
          assume a 25% markdown applied across all lines — the Markdown Simulator
          lets you test other discounts per product.
        </Callout>
        <Disclaimer>
          <strong>Illustrative only.</strong> Stock, costs and demand are
          synthetic. The Rescue Score is a transparent weighted aid, not a
          validated prediction. Food-safety deadlines are enforced and never
          overridden by a recommended action.
        </Disclaimer>
      </div>
    </div>
  );
}
