# Project memory

## Product intent & audience

- Decision-support tool for grocery store teams managing near-expiry inventory ("Project Second Chance").
- Five pages: Overview dashboard, Rescue Radar, Markdown Simulator, Redistribution Queue, Impact Report.
- Goal: reduce waste via markdown strategies, redistribution/donation routing, and impact forecasting.

## Brand personality & voice

- Clean British business-tool aesthetic; professional, practical, data-literate tone.
- Includes persistent disclaimers: all data is illustrative; food-safety deadlines always override recommendations.

## Visual design & UX direction

- Light/dark mode supported.
- Dashboard pattern: at-risk stock stats, priority products ranked by Rescue Score, contribution chart.
- Rescue Radar: searchable/filterable inventory table with configurable scoring weights and expandable recommendation rows.
- Markdown Simulator: product picker, demand adjustment, strategy comparison with live chart and metrics table.
- Redistribution Queue: post-markdown remaining stock eligible for donation, with status indicators.
- Impact Report: baseline vs strategy comparison with conservative/central/optimistic demand bands, operating costs, per-product breakdown.
- Components include charts, tables, expandable rows, status indicators, pickers.

## Decisions, constraints & rationale

- Framework: vite-react.
- Utility modules: `format.js` for shared formatters (e.g. `formatCurrency`, `formatDays`); `finance.js` for financial calculations; UI helpers in `ui.jsx`.
- A syntax error (extra closing brace in MarkdownSimulator, `fmt={formatCurrency}}`) was fixed to restore the build.
- Build verified passing after fix.

## Open questions & assumptions

- No `.bolt/prompt` exists yet; all context is inferred from project files and this turn.
- Assumes a Rescue Score algorithm with user-configurable weights; exact default weights and formula not yet documented.
- Demand bands (conservative/central/optimistic) in Impact Report need confirmation on source methodology.
- No backend or persistence layer mentioned; app appears to use illustrative/in-memory data.