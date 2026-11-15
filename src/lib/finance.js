// Finance and Rescue Score calculation engine for Project Second Chance.
//
// All figures are illustrative. These formulas are a documented hypothesis for
// the prototype, not a validated predictive model.
//
// --- Unit convention -------------------------------------------------------
// The demand model produces a fractional forecast (expected units demanded).
// Operational quantities (units sold, units remaining) are whole numbers:
//   unitsSoldR = Math.round(demanded), capped at starting inventory.
// All financial line items (revenue, cost, contribution) are computed from
// the whole-number unitsSoldR at full precision, then rounded to 2dp for
// display only. We never mix fractional-unit revenue with whole-unit inventory.

import { INVENTORY } from "../data/inventory.js";

// --- Rescue Score weights (transparent, configurable) ---------------------
export const DEFAULT_WEIGHTS = {
  urgency: 0.30,
  quantityAtRisk: 0.20,
  demandGap: 0.20,
  contributionPotential: 0.20,
  redistributionFeasibility: 0.10,
};

// --- Demand model ----------------------------------------------------------
// Markdown-driven demand is modelled with a constant-elasticity curve:
//   q(p) = baselineDemand * (p / normalPrice) ^ elasticity
// capped by available stock and by the time window before the deadline.
// The result is a fractional FORECAST, not an operational quantity.
export function demandAtDiscount(product, { discount, daysWindow, dailyDemand, elasticity } = {}) {
  const priceRatio = 1 - discount;
  const baseDemand = dailyDemand ?? product.baselineDailyDemand;
  const elast = elasticity ?? product.elasticity;
  const window = Math.max(0, daysWindow ?? product.daysRemaining);
  if (window <= 0) return 0;
  const scaled = baseDemand * Math.pow(priceRatio, -elast);
  return scaled * window;
}

// --- Per-scenario economics ------------------------------------------------
// Given a product and a discount, project units sold, revenue, cost of units
// sold, contribution, and remaining inventory over the sales window.
//
// Revenue, cost and contribution are computed from the whole-number
// unitsSoldR (the operational quantity), not the fractional forecast.
export function scenarioForDiscount(product, discount, overrides = {}) {
  const price = product.normalPrice * (1 - discount);
  const demanded = demandAtDiscount(product, { discount, ...overrides });

  // Operational units: round the forecast, then cap at available stock.
  const unitsSoldR = Math.min(product.units, Math.max(0, Math.round(demanded)));

  // Financials from whole-number units, full precision internally.
  const revenue = unitsSoldR * price;
  const costOfUnitsSold = unitsSoldR * product.unitCost;
  const contribution = revenue - costOfUnitsSold;
  const unitsRemaining = Math.max(0, product.units - unitsSoldR);
  const sellThrough = product.units > 0 ? unitsSoldR / product.units : 0;

  return {
    discount,
    price: round(price),
    demandedUnits: round(demanded),
    unitsSold: unitsSoldR,
    revenue: round(revenue),
    costOfUnitsSold: round(costOfUnitsSold),
    contribution: round(contribution),
    unitsRemaining,
    sellThrough: round(sellThrough, 4),
  };
}

// Baseline = current (full-price) trajectory without any active markdown,
// over the remaining sales window. Uses the same demand model at discount=0,
// so baseline and strategy share identical inventory, time horizon, and cost
// definitions. The demand model does NOT model full-price cannibalisation —
// i.e. it does not assume that markdown sales displace sales that would have
// occurred at full price. This limitation is stated on the Impact Report.
export function baselineScenario(product, overrides = {}) {
  return scenarioForDiscount(product, 0, overrides);
}

// --- Rescue Score ----------------------------------------------------------
// Weights are normalised internally so the score is always on a 0-100 scale
// regardless of what the user enters. This means weights need not sum to 1.0,
// but the displayed "Share" column shows the normalised proportion.
export function computeRescueScore(product, weights = DEFAULT_WEIGHTS) {
  const w = normaliseWeights(weights);

  const urgency = clamp(1 - product.daysRemaining / 5, 0, 1);

  const maxUnits = Math.max(...INVENTORY.map((p) => p.units));
  const quantityAtRisk = clamp(product.units / maxUnits, 0, 1);

  const baseDemandUnits = Math.min(
    product.units,
    product.baselineDailyDemand * Math.max(0, product.daysRemaining)
  );
  const demandGap = clamp(1 - baseDemandUnits / product.units, 0, 1);

  const m25 = scenarioForDiscount(product, 0.25);
  const maxContribution = Math.max(
    ...INVENTORY.map((p) => scenarioForDiscount(p, 0.25).contribution)
  );
  const contributionPotential = clamp(
    maxContribution > 0 ? m25.contribution / maxContribution : 0,
    0, 1
  );

  const maxValue = Math.max(...INVENTORY.map((p) => p.redistributionValue));
  const redistributionFeasibility = product.redistributionEligible
    ? clamp(0.5 + (product.redistributionValue / (maxValue || 1)) * 0.5, 0, 1)
    : 0;

  const raw =
    urgency * w.urgency +
    quantityAtRisk * w.quantityAtRisk +
    demandGap * w.demandGap +
    contributionPotential * w.contributionPotential +
    redistributionFeasibility * w.redistributionFeasibility;

  const score = raw * 100; // weights already normalised to sum=1

  return {
    score: Math.round(score * 10) / 10,
    drivers: {
      urgency: round(urgency, 3),
      quantityAtRisk: round(quantityAtRisk, 3),
      demandGap: round(demandGap, 3),
      contributionPotential: round(contributionPotential, 3),
      redistributionFeasibility: round(redistributionFeasibility, 3),
    },
  };
}

// --- Recommendation --------------------------------------------------------
// Hard safety rules take precedence over the score. Expired products are
// never recommended for markdown. Use-by and best-before are treated
// distinctly: use-by is a safety limit (no sale after deadline); best-before
// is a quality limit (sale is permitted but markdown may be appropriate).
export function recommendAction(product) {
  const baseline = baselineScenario(product);
  const m10 = scenarioForDiscount(product, 0.10);
  const m25 = scenarioForDiscount(product, 0.25);
  const m40 = scenarioForDiscount(product, 0.40);

  const scenarios = [m10, m25, m40];
  const best = scenarios.reduce((a, b) => (b.contribution > a.contribution ? b : a));

  const lowDays = product.daysRemaining <= 1.5;
  const sellThrough = product.units > 0 ? best.unitsSold / product.units : 0;
  const isUseBy = product.deadlineType === "use-by";

  // --- Hard rule: expired ---
  if (product.daysRemaining <= 0) {
    return {
      action: "Remove from sale",
      reason:
        `${product.deadlineType === "use-by" ? "Use-by" : "Best-before"} deadline has passed. ` +
        (isUseBy
          ? "Food-safety rules prohibit further sale; remove from shelf immediately."
          : "Quality may be below standard; remove from regular sale and review."),
      tradeOff: "No revenue recoverable. Cost of disposal or donation may apply.",
      deadlineType: product.deadlineType,
      daysRemaining: product.daysRemaining,
      remainderAction: "Route to authorised disposal or, if best-before and still safe, to redistribution review.",
      eligibilityConfirmed: false,
      safeToSell: false,
    };
  }

  // --- Full-price demand clears stock ---
  if (baseline.unitsRemaining === 0) {
    return {
      action: "Hold at full price",
      reason:
        "Expected full-price demand clears the stock before the deadline; no markdown required.",
      tradeOff: "Maximum contribution per unit. Risk if demand forecast is optimistic.",
      deadlineType: product.deadlineType,
      daysRemaining: product.daysRemaining,
      remainderAction: "No remainder expected. Monitor sell-through daily.",
      eligibilityConfirmed: product.redistributionEligible,
      safeToSell: true,
    };
  }

  // --- Low days + eligible + remainder: markdown then redistribute ---
  if (lowDays && product.redistributionEligible && best.unitsRemaining > 0) {
    return {
      action: `Markdown ${(best.discount * 100).toFixed(0)}% then redistribute remainder`,
      reason:
        `Deadline is imminent (${formatDays(product.daysRemaining)}). A ${(best.discount * 100).toFixed(0)}% markdown ` +
        `maximises contribution while clearing ${formatPct(sellThrough)} of stock; ` +
        `redirect the remainder to redistribution before the deadline.`,
      tradeOff:
        `Lower price on all units reduces per-unit margin by ${(best.discount * 100).toFixed(0)}%. ` +
        `Redistribution salvage is £${product.redistributionValue.toFixed(2)}/unit, not a realised sale.`,
      deadlineType: product.deadlineType,
      daysRemaining: product.daysRemaining,
      remainderAction: `Redistribute ${best.unitsRemaining} remaining units — eligibility flagged, requires confirmation with partner.`,
      eligibilityConfirmed: false,
      safeToSell: true,
    };
  }

  // --- Standard markdown ---
  return {
    action: `Markdown ${(best.discount * 100).toFixed(0)}%`,
    reason:
      `A ${(best.discount * 100).toFixed(0)}% markdown yields the highest contribution ` +
      `(${formatPct(sellThrough)} sell-through) given estimated demand over the remaining ` +
      `${product.daysRemaining.toFixed(1)} days.`,
    tradeOff:
      `Per-unit price reduced by ${(best.discount * 100).toFixed(0)}%. ` +
      (best.unitsRemaining > 0
        ? `${best.unitsRemaining} units may remain unsold at deadline.`
        : "Stock expected to clear before deadline."),
    deadlineType: product.deadlineType,
    daysRemaining: product.daysRemaining,
    remainderAction: best.unitsRemaining > 0
      ? `${best.unitsRemaining} units remain. ${product.redistributionEligible ? "Redistribution eligible — confirm with partner." : "Not eligible for redistribution; plan disposal."}`
      : "No remainder expected.",
    eligibilityConfirmed: product.redistributionEligible,
    safeToSell: true,
  };
}

// --- Scenarios for Impact Report ------------------------------------------
export function impactScenarios(product, discount) {
  const bands = [
    { name: "Conservative", demandFactor: 0.75 },
    { name: "Central", demandFactor: 1.0 },
    { name: "Optimistic", demandFactor: 1.25 },
  ];
  return bands.map((b) => {
    const s = scenarioForDiscount(product, discount, {
      dailyDemand: product.baselineDailyDemand * b.demandFactor,
    });
    return { ...b, ...s };
  });
}

// --- Aggregates for Overview ----------------------------------------------
export function overviewStats(products = INVENTORY) {
  const atRisk = products.length;
  const unitsAtRisk = products.reduce((s, p) => s + p.units, 0);
  const immediateReview = products.filter((p) => p.daysRemaining <= 1.5).length;

  // Total contribution under a uniform 25% markdown strategy (sum of
  // per-product contribution at 25% markdown).
  const strategyContribution = products.reduce(
    (s, p) => s + scenarioForDiscount(p, 0.25).contribution,
    0
  );

  // Total contribution if all stock sold at full price (theoretical maximum,
  // not a forecast — ignores demand constraints).
  const fullPriceValue = products.reduce(
    (s, p) => s + (p.normalPrice - p.unitCost) * p.units,
    0
  );

  // Total contribution at full-price baseline (demand-constrained).
  const baselineContribution = products.reduce(
    (s, p) => s + baselineScenario(p).contribution,
    0
  );

  const scored = products
    .map((p) => ({ product: p, ...computeRescueScore(p) }))
    .sort((a, b) => b.score - a.score);

  return {
    atRisk,
    unitsAtRisk,
    strategyContribution: round(strategyContribution),
    baselineContribution: round(baselineContribution),
    incrementalContribution: round(strategyContribution - baselineContribution),
    fullPriceValue: round(fullPriceValue),
    immediateReview,
    ranked: scored,
  };
}

// --- Redistribution Queue --------------------------------------------------
export function redistributionQueue(products = INVENTORY) {
  return products
    .filter((p) => p.redistributionEligible)
    .map((p) => {
      const m25 = scenarioForDiscount(p, 0.25);
      const remaining = m25.unitsRemaining;
      const expired = p.daysRemaining <= 0;
      const urgent = p.daysRemaining > 0 && p.daysRemaining <= 1.5;
      let status = "Monitor";
      let nextAction = "Review nearer the deadline";
      if (expired) {
        status = "Expired";
        nextAction = p.deadlineType === "use-by"
          ? "Do not redistribute — dispose per food-safety policy"
          : "Quality past best-before; assess for animal feed or disposal";
      } else if (urgent) {
        status = "Action now";
        nextAction = "Initiate redistribution before deadline";
      } else if (remaining > 0) {
        status = "Planned";
        nextAction = "Reserve remainder after markdown window";
      } else {
        status = "Not required";
        nextAction = "Expected demand clears stock";
      }
      return {
        product: p,
        remainingUnits: remaining,
        status,
        nextAction,
        salvageValue: round(remaining * p.redistributionValue),
      };
    })
    .filter((row) => row.remainingUnits > 0 || row.status === "Expired")
    .sort((a, b) => a.product.daysRemaining - b.product.daysRemaining);
}

// --- Helpers ---------------------------------------------------------------
function round(value, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * f) / f;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function formatPct(x) {
  return `${Math.round(x * 100)}%`;
}
function formatDays(days) {
  if (days <= 0) return "expired";
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(1)}d`;
}

// Normalise weights to sum to 1. If all weights are zero, fall back to equal
// weighting so the score is never undefined.
function normaliseWeights(weights) {
  const keys = Object.keys(DEFAULT_WEIGHTS);
  const sum = keys.reduce((s, k) => s + Math.max(0, weights[k] ?? 0), 0);
  if (sum === 0) {
    const equal = 1 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, equal]));
  }
  return Object.fromEntries(keys.map((k) => [k, Math.max(0, weights[k] ?? 0) / sum]));
}

// Export the normaliser for testing and for the UI to display normalised shares.
export function getNormalisedWeights(weights = DEFAULT_WEIGHTS) {
  return normaliseWeights(weights);
}
