# Project Second Chance

A competition prototype: a decision-support tool for grocery store teams
managing near-expiry inventory. It compares urgency, estimated demand,
markdown options, contribution margin and redistribution opportunities — and
helps teams decide what to discount, by how much, and what to route to
redistribution before the deadline.

> **Positioning.** This is a hypothesis-driven prototype motivated by Tesco
> PLC's documented food-surplus challenge. It does **not** claim Tesco lacks
> existing markdown, forecasting or redistribution capabilities. Everything in
> the app is illustrative and would need validation against real workflows.
> Verified company evidence is kept separate from prototype assumptions.

## Run it

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
```

No paid APIs, AI services, database, backend or sign-up are required. All data
is local and synthetic.

## Pages

1. **Overview** — operations dashboard: at-risk product count, units at risk,
   illustrative recoverable value, strategy contribution, items needing
   immediate review, and a ranked priority preview.
2. **Rescue Radar** — searchable, filterable inventory table with Rescue Score,
   deadline status, sell-through and a recommended action + explanation. Rescue
   Score weights are visible and adjustable.
3. **Markdown Simulator** — pick a product, adjust demand assumptions, and
   compare 10% / 25% / 40% markdowns against a consistent baseline. All
   dependent figures recalculate live.
4. **Redistribution Queue** — remaining stock after markdown, with deadline
   status, eligibility and next action. Never overrides food-safety deadlines;
   never implies a donation has occurred.
5. **Impact Report** — baseline vs selected strategy across the portfolio with
   conservative / central / optimistic demand bands, operating costs, disposal
   savings, salvage value and incremental benefit.

## Rescue Score

A transparent, configurable weighted blend of normalised drivers:

| Driver | Default weight | Meaning |
|---|---|---|
| Urgency | 0.30 | Fewer days remaining → higher urgency |
| Quantity at risk | 0.20 | Larger stock lines → higher exposure |
| Demand gap | 0.20 | Stock unlikely to sell at full price |
| Contribution potential | 0.20 | Recoverable margin at 25% markdown |
| Redistribution feasibility | 0.10 | Eligibility + salvage value |

Weights are normalised against their sum and scaled to 0–100. The score is a
decision-support aid, **not a validated prediction**.

## Financial model (documented)

All figures are illustrative.

### Demand

Constant-elasticity curve over the remaining sales window:

```
q(p) = baselineDailyDemand × (p / normalPrice) ^ (−elasticity) × daysRemaining
units sold = min(units in stock, q(p))
```

The sales window is the time remaining until the deadline. **No sales are
modelled after the deadline** — food-safety limits are enforced and never
overridden.

### Per-scenario economics

```
selling price      = normalPrice × (1 − discount)
revenue            = units sold × selling price
cost of units sold = units sold × unit cost
contribution       = revenue − cost of units sold
units remaining    = initial units − units sold
sell-through       = units sold / initial units
```

Baseline = the full-price (0% markdown) trajectory over the same window.

### Impact Report (portfolio)

For each product:

```
incremental contribution = strategy contribution − baseline contribution
disposal savings         = extra units sold × £0.08   (optional)
salvage value             = remaining units × per-unit salvage   (eligible lines only)
operating cost            = relabelling + redistribution handling
incremental benefit       = incremental contribution
                           + disposal savings
                           + salvage value
                           − operating cost
```

Totals are summed across products. Scenario bands scale `baselineDailyDemand`
by 0.75× / 1.0× / 1.25×.

## Assumptions & simplifications

- All stock, costs, demand and salvage values are synthetic.
- Demand is modelled with a constant-elasticity curve — a simplification, not a
  validated forecast.
- Full-price sales displaced by markdowns are not assumed unless baseline
  demand would have cleared stock; the incremental calc compares like-for-like.
- Disposal savings apply only to extra units the strategy sells that the
  baseline would have wasted.
- Salvage value applies only to redistribution-eligible remainders, and only
  when the salvage toggle is on.
- Operating costs model relabelling effort (growing with discount depth) plus a
  per-unit redistribution handling charge.
- No benefit is double-counted: contribution already nets the cost of units
  sold, and operating costs are subtracted once.
- Revenue is never labelled as profit.

## Food-safety constraints

- Use-by deadlines are treated as hard safety limits. Products past a use-by
  date are flagged for removal and never recommended for sale or human
  redistribution.
- Best-before dates are quality limits and allow redistribution.
- A donation is only recorded as complete if an action is logged; the queue
  never implies a donation has occurred.

## Verified vs illustrative

- **Verified (external):** Tesco PLC has publicly documented a food-surplus
  challenge and existing waste-reduction commitments.
- **Illustrative (this prototype):** all inventory, prices, costs, demand,
  scores, financial outcomes and projected impact. Nothing here is a proven
  commercial result, internal dataset, user interview or Tesco-specific figure.

## Limitations

- No real inventory feed, store-specific data, or integration with existing
  markdown / ordering systems.
- Demand model is a single elasticity per product; real demand has stockouts,
  day-of-week effects, substitutions and cannibalisation.
- Operating costs are rough proxies, not a calibrated cost model.
- The prototype would need validation against real store workflows before any
  commercial claim.

## Deployment

Build with `npm run build` and serve the `dist/` folder from any static host
(Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, GitHub Pages, etc.). No
server runtime is required.
