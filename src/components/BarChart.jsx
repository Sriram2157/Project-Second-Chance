// Lightweight SVG bar chart — replaces Recharts to avoid dev-server
// dependency resolution issues. No external dependencies.

import { useState } from "react";
import { CHART, tooltipStyle } from "../lib/chartTheme.js";

export function BarChart({
  data,
  series,
  height = 240,
  formatValue = (v) => v,
  formatAxis = (v) => v,
}) {
  const [hover, setHover] = useState(null);
  const padding = { top: 16, right: 12, bottom: 28, left: 52 };
  const w = 480;
  const h = height;
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => series.map((s) => d[s.key] ?? 0));
  const maxVal = Math.max(1, ...allValues);
  const niceMax = niceCeil(maxVal);

  const groupCount = data.length;
  const groupWidth = innerW / groupCount;
  const barCount = series.length;
  const barGap = 4;
  const barWidth = Math.max(8, (groupWidth - barGap * (barCount + 1)) / barCount);

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (niceMax * i) / ticks);

  const grid = CHART.grid;
  const textFaint = CHART.textFaint;
  const ttBg = tooltipStyle.background;
  const ttBorder = tooltipStyle.border;
  const ttColor = tooltipStyle.color;

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        style={{ display: "block" }}
      >
        {tickValues.map((tv, i) => {
          const y = padding.top + innerH - (tv / niceMax) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left} y1={y} x2={padding.left + innerW} y2={y}
                stroke={grid} strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8} y={y + 3}
                textAnchor="end" fontSize={11}
                fill={textFaint}
              >
                {formatAxis(tv)}
              </text>
            </g>
          );
        })}

        {data.map((d, gi) => {
          const groupX = padding.left + gi * groupWidth;
          return series.map((s, si) => {
            const val = d[s.key] ?? 0;
            const barH = (val / niceMax) * innerH;
            const x = groupX + barGap + si * (barWidth + barGap);
            const y = padding.top + innerH - barH;
            const isHover = hover && hover.gi === gi && hover.si === si;
            return (
              <g key={`${gi}-${si}`}>
                <rect
                  x={x} y={y} width={barWidth} height={Math.max(0, barH)}
                  rx={0} fill={s.color}
                  opacity={isHover ? 1 : 0.88}
                  onMouseEnter={() => setHover({ gi, si })}
                  onMouseLeave={() => setHover(null)}
                  style={{ transition: "opacity 0.15s" }}
                />
                {isHover && (
                  <g>
                    <rect
                      x={x + barWidth / 2 - 32} y={y - 22}
                      width={64} height={16}
                      fill={ttBg} stroke={ttBorder} strokeWidth={1}
                    />
                    <text
                      x={x + barWidth / 2} y={y - 10}
                      textAnchor="middle" fontSize={11} fontWeight={700}
                      fill={ttColor}
                    >
                      {formatValue(val)}
                    </text>
                  </g>
                )}
              </g>
            );
          });
        })}

        {data.map((d, gi) => {
          const cx = padding.left + gi * groupWidth + groupWidth / 2;
          return (
            <text
              key={gi} x={cx} y={padding.top + innerH + 18}
              textAnchor="middle" fontSize={11} fill={textFaint}
            >
              {d.name}
            </text>
          );
        })}
      </svg>

      {series.length > 1 && (
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4, fontSize: 12 }}>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, color: textFaint }}>
              <span style={{ width: 10, height: 10, borderRadius: 0, background: s.color, display: "inline-block" }} />
              {s.name || s.key}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function niceCeil(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}
