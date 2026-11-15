import { useMemo, useState } from "react";
import { INVENTORY } from "../data/inventory.js";
import {
  scenarioForDiscount, baselineScenario, impactScenarios,
} from "../lib/finance.js";
import {
  formatCurrency, formatNumber, formatPercent,
} from "../lib/format.js";
import { Disclaimer, Callout } from "../components/ui.jsx";
import { BarChart } from "../components/BarChart.jsx";
import { CHART } from "../lib/chartTheme.js";

const DISCOUNTS = [0.10, 0.25, 0.40];

// Additional operating & implementation costs (illustrative, per scenario).
// Markdown application cost grows with discount depth (relabelling effort).
// Redistribution handling applies only to units remaining after markdown.
function operatingCosts(unitsRemaining, discount) {
  const labelling = INVENTORY.length * (2 + discount * 20); // £ per line relabel
  const redistributionHandling = unitsRemaining * 0.12;
  return labelling + redistributionHandling;
}

export default function ImpactReport() {
  const [discount, setDiscount] = useState(0.25);
  const [includeDisposalSavings, setIncludeDisposalSavings] = useState(true);
  const [includeSalvage, setIncludeSalvage] = useState(true);

  // Disposal cost per unit assumed avoided (landfill + handling), illustrative.
  const DISPOSAL_COST_PER_UNIT = 0.08;

  const perProduct = useMemo(
    () =>
      INVENTORY.map((p) => {
        const baseline = baselineScenario(p);
        const strat = scenarioForDiscount(p, discount);
        const bands = impactScenarios(p, discount);

        const unitsRemaining = strat.unitsRemaining;
        const operatingCost = operatingCosts(unitsRemaining, discount);

        // Disposal savings: units that would have been wasted at baseline but
        // are now sold. Counted only when the strategy sells more than baseline.
        const extraUnitsSold = Math.max(0, strat.unitsSold - baseline.unitsSold);
        const disposalSavings = includeDisposalSavings ? extraUnitsSold * DISPOSAL_COST_PER_UNIT : 0;

        // Salvage value on remaining units, only if eligible and after markdown.
        const salvage = includeSalvage && p.redistributionEligible
          ? unitsRemaining * p.redistributionValue
          : 0;

        const incrementalContribution = strat.contribution - baseline.contribution;
        const incrementalBenefit =
          incrementalContribution + disposalSavings + salvage - operatingCost;

        return {
          product: p,
          baseline,
          strat,
          bands,
          operatingCost,
          disposalSavings,
          salvage,
          incrementalContribution,
          incrementalBenefit,
        };
      }),
    [discount, includeDisposalSavings, includeSalvage]
  );

  const totals = perProduct.reduce(
    (acc, r) => {
      acc.baselineRevenue += r.baseline.revenue;
      acc.baselineContribution += r.baseline.contribution;
      acc.baselineUnitsSold += r.baseline.unitsSold;
      acc.baselineUnitsRemaining += r.baseline.unitsRemaining;
      acc.strategyRevenue += r.strat.revenue;
      acc.strategyContribution += r.strat.contribution;
      acc.strategyUnitsSold += r.strat.unitsSold;
      acc.strategyUnitsRemaining += r.strat.unitsRemaining;
      acc.operatingCost += r.operatingCost;
      acc.disposalSavings += r.disposalSavings;
      acc.salvage += r.salvage;
      acc.incrementalContribution += r.incrementalContribution;
      acc.incrementalBenefit += r.incrementalBenefit;
      return acc;
    },
    {
      baselineRevenue: 0, baselineContribution: 0, baselineUnitsSold: 0, baselineUnitsRemaining: 0,
      strategyRevenue: 0, strategyContribution: 0, strategyUnitsSold: 0, strategyUnitsRemaining: 0,
      operatingCost: 0, disposalSavings: 0, salvage: 0,
      incrementalContribution: 0, incrementalBenefit: 0,
    }
  );

  // Scenario bands (portfolio-level) — sum central, then ± demand factor.
  const bandData = useMemo(() => {
    const factors = [
      { name: "Conservative", factor: 0.75 },
      { name: "Central", factor: 1.0 },
      { name: "Optimistic", factor: 1.25 },
    ];
    return factors.map((f) => {
      let contribution = 0;
      let unitsSold = 0;
      let unitsRemaining = 0;
      let incrementalBenefit = 0;
      for (const p of INVENTORY) {
        const s = scenarioForDiscount(p, discount, {
          dailyDemand: p.baselineDailyDemand * f.factor,
        });
        const base = baselineScenario(p);
        contribution += s.contribution;
        unitsSold += s.unitsSold;
        unitsRemaining += s.unitsRemaining;
        const opCost = operatingCosts(s.unitsRemaining, discount);
        const extra = Math.max(0, s.unitsSold - base.unitsSold);
        const disposal = includeDisposalSavings ? extra * DISPOSAL_COST_PER_UNIT : 0;
        const salv = includeSalvage && p.redistributionEligible
          ? s.unitsRemaining * p.redistributionValue : 0;
        incrementalBenefit += (s.contribution - base.contribution) + disposal + salv - opCost;
      }
      return {
        name: f.name,
        contribution,
        unitsSold,
        unitsRemaining,
        incrementalBenefit,
      };
    });
  }, [discount, includeDisposalSavings, includeSalvage]);

  const chartData = [
    { name: "Baseline", contribution: totals.baselineContribution, units: totals.baselineUnitsSold },
    { name: "Strategy", contribution: totals.strategyContribution, units: totals.strategyUnitsSold },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Impact Report</h1>
          <p className="page-sub">
            Baseline vs the selected markdown strategy across the whole
            portfolio, with conservative / central / optimistic demand bands and
            the additional costs that reduce net benefit.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="control-row" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Strategy discount</label>
            <div style={{ display: "flex", gap: 8 }}>
              {DISCOUNTS.map((d) => (
                <button
                  key={d}
                  className={`btn ${discount === d ? "primary" : "ghost"}`}
                  onClick={() => setDiscount(d)}
                >
                  {(d * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox" id="disposal"
              checked={includeDisposalSavings}
              onChange={(e) => setIncludeDisposalSavings(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
            />
            <label htmlFor="disposal" style={{ textTransform: "none", fontSize: 13, color: "var(--text)" }}>
              Include disposal savings ({formatCurrency(0.08, { decimals: 2 })}/unit)
            </label>
          </div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox" id="salvage"
              checked={includeSalvage}
              onChange={(e) => setIncludeSalvage(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
            />
            <label htmlFor="salvage" style={{ textTransform: "none", fontSize: 13, color: "var(--text)" }}>
              Include redistribution salvage value
            </label>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Baseline vs strategy (central)</div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="num">Baseline</th>
                  <th className="num">Strategy</th>
                  <th className="num">Incremental</th>
                </tr>
              </thead>
              <tbody>
                <Line label="Revenue" baseline={totals.baselineRevenue} strat={totals.strategyRevenue} />
                <Line label="Contribution" baseline={totals.baselineContribution} strat={totals.strategyContribution} bold />
                <Line label="Units sold" baseline={totals.baselineUnitsSold} strat={totals.strategyUnitsSold} fmt={formatNumber} />
                <Line label="Units remaining" baseline={totals.baselineUnitsRemaining} strat={totals.strategyUnitsRemaining} fmt={formatNumber} />
                <Line label="Avoided disposal cost (illustrative)" baseline={0} strat={totals.disposalSavings} fmt={formatCurrency} />
                <Line label="Redistribution salvage value" baseline={0} strat={totals.salvage} fmt={formatCurrency} />
                <Line label="Operating costs" baseline={0} strat={-totals.operatingCost} fmt={formatCurrency} />
                <Line label="Incremental benefit" baseline={0} strat={totals.incrementalBenefit} fmt={formatCurrency} bold />
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title">Contribution — baseline vs strategy</div>
            <BarChart
              data={chartData}
              series={[{ key: "contribution", name: "Contribution", color: CHART.accent }]}
              height={220}
              formatValue={(v) => formatCurrency(v)}
              formatAxis={(v) => `£${Math.round(v)}`}
            />
          </div>
          <div className="card">
            <div className="card-title">Scenario bands — incremental benefit</div>
            <BarChart
              data={bandData}
              series={[{ key: "incrementalBenefit", name: "Incremental benefit", color: CHART.accent }]}
              height={200}
              formatValue={(v) => formatCurrency(v)}
              formatAxis={(v) => `£${Math.round(v)}`}
            />
            <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
              Demand factors: 0.75× (conservative), 1.0× (central), 1.25× (optimistic).
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Per-product breakdown</div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Base contribution</th>
                <th className="num">Strategy contribution</th>
                <th className="num">Operating cost</th>
                <th className="num">Avoided disposal</th>
                <th className="num">Salvage</th>
                <th className="num">Incremental benefit</th>
              </tr>
            </thead>
            <tbody>
              {perProduct.map((r) => (
                <tr key={r.product.id}>
                  <td>
                    <div>{r.product.name}</div>
                    <div className="faint mono">{r.product.id}</div>
                  </td>
                  <td className="num muted">{formatCurrency(r.baseline.contribution)}</td>
                  <td className="num">{formatCurrency(r.strat.contribution)}</td>
                  <td className="num muted">{formatCurrency(r.operatingCost)}</td>
                  <td className="num muted">{formatCurrency(r.disposalSavings)}</td>
                  <td className="num muted">{formatCurrency(r.salvage)}</td>
                  <td className="num" style={{ fontWeight: 600, color: r.incrementalBenefit >= 0 ? "var(--green)" : "var(--danger)" }}>
                    {formatCurrency(r.incrementalBenefit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        <Callout>
          <strong>Like-for-like logic.</strong> Incremental benefit =
          (strategy contribution − baseline contribution) + illustrative avoided
          disposal cost + redistribution salvage value − additional operating
          costs. Contribution already nets the acquisition cost of units sold,
          so costs are not counted twice. Avoided disposal cost is an
          <em> illustrative estimate</em> of costs that would have been incurred
          for wasted units — it is not a realised cash saving. Salvage value is
          a notional amount per redistributed unit, not a confirmed sale. The
          demand model does not account for full-price cannibalisation: markdown
          sales are assumed to be additional, not displacing full-price sales.
          This may overstate incremental contribution.
        </Callout>
        <Disclaimer>
          <strong>Illustrative.</strong> Revenue is units sold × price;
          contribution is revenue − cost of units sold. Operating costs model
          relabelling effort and redistribution handling. Avoided disposal cost
          is an illustrative estimate of {formatCurrency(DISPOSAL_COST_PER_UNIT, { decimals: 2 })}
          per unit that the baseline would have wasted but the strategy sells —
          it is not a realised saving. Salvage values are the synthetic per-unit
          figures in the sample dataset, not confirmed donations. Scenario bands
          scale demand only. The model does not account for full-price
          cannibalisation. No benefit is double-counted; all figures are
          illustrative and clearly distinguished from verified facts.
        </Disclaimer>
      </div>
    </div>
  );
}

function Line({ label, baseline, strat, fmt = formatCurrency, bold }) {
  const inc = strat - baseline;
  return (
    <tr>
      <td className={bold ? "" : "muted"} style={{ fontWeight: bold ? 600 : 400 }}>{label}</td>
      <td className="num muted">{fmt(baseline)}</td>
      <td className="num" style={{ fontWeight: bold ? 600 : 400 }}>{fmt(strat)}</td>
      <td className="num" style={{ color: inc >= 0 ? "var(--green)" : "var(--danger)", fontWeight: bold ? 600 : 400 }}>
        {inc >= 0 ? "+" : ""}{fmt(inc)}
      </td>
    </tr>
  );
}
