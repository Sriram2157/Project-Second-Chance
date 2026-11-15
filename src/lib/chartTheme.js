// Concrete color values for chart SVG elements.
// SVG attributes need actual hex values — CSS var() does not resolve.
// These read from CSS variables at runtime via getComputedStyle for
// light/dark theme support.

function readVar(name) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const CHART = {
  get accent() { return readVar("--chart-accent") || "#003b8a"; },
  get navy400() { return readVar("--chart-navy") || "#42578a"; },
  get green() { return readVar("--chart-green") || "#1b5e20"; },
  get warning() { return readVar("--chart-warning") || "#b8860b"; },
  get danger() { return readVar("--chart-danger") || "#b71c1c"; },
  get textFaint() { return readVar("--chart-text-faint") || "#888888"; },
  get grid() { return readVar("--chart-grid") || "rgba(0,0,0,0.08)"; },
};

export const tooltipStyle = {
  get background() { return readVar("--bg") || "#fff"; },
  get border() { return readVar("--border-soft") || "#d0d0d0"; },
  get color() { return readVar("--text") || "#111"; },
};
