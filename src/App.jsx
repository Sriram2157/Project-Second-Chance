import { useEffect, useState } from "react";
import { NavIcon } from "./components/ui.jsx";
import Overview from "./pages/Overview.jsx";
import RescueRadar from "./pages/RescueRadar.jsx";
import MarkdownSimulator from "./pages/MarkdownSimulator.jsx";
import RedistributionQueue from "./pages/RedistributionQueue.jsx";
import ImpactReport from "./pages/ImpactReport.jsx";

const NAV = [
  { key: "overview", label: "Overview" },
  { key: "radar", label: "Rescue Radar" },
  { key: "markdown", label: "Markdown Simulator" },
  { key: "queue", label: "Redistribution Queue" },
  { key: "impact", label: "Impact Report" },
];

function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (key) => { window.location.hash = key; }];
}

function parseHash() {
  const h = window.location.hash.replace(/^#/, "");
  return h === "" ? "overview" : (NAV.some((n) => n.key === h) ? h : "notfound");
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("p2c-theme") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("p2c-theme", theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))];
}

export default function App() {
  const [route, navigate] = useHashRoute();
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">2C</div>
          <div>
            <div className="brand-name">Project Second Chance</div>
            <div className="brand-sub">Near-expiry decision support</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${route === n.key ? "active" : ""}`}
              onClick={() => navigate(n.key)}
            >
              <NavIcon name={n.key} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <strong>Prototype.</strong> Illustrative data only — not a validated
          predictor. Food-safety limits always take precedence.
        </div>

        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>
      </aside>

      <main className="main page-enter" key={route}>
        {route === "overview" && <Overview onNavigate={navigate} />}
        {route === "radar" && <RescueRadar />}
        {route === "markdown" && <MarkdownSimulator />}
        {route === "queue" && <RedistributionQueue />}
        {route === "impact" && <ImpactReport />}
        {route === "notfound" && (
          <div className="error-page">
            <div className="error-tea">☕</div>
            <h1 className="error-title">Oh dear.</h1>
            <p className="error-msg">
              That page seems to have popped out for a spot of tea. Shall we try again?
            </p>
            <div className="error-actions">
              <button className="btn primary" onClick={() => navigate("overview")}>
                Back to Overview
              </button>
              <button className="btn ghost" onClick={() => navigate("radar")}>
                Go to Rescue Radar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
