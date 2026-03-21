import { useState, useEffect } from "react";

// ══════════════════════════════════════════
// Design tokens
// ══════════════════════════════════════════
const W = {
  bg: "#F5F5F0", surface: "#FFFFFF", surfaceAlt: "#EEEEE8",
  border: "#D1D1C7", borderLight: "#E5E5DC",
  text: "#2C2C2C", textMuted: "#8A8A7A", textLight: "#B0B0A0",
  accent: "#3D6B8E", accentLight: "#E8F0F6", accentDark: "#2A4D66",
  highlight: "#E9A84C", highlightLight: "#FFF5E0",
  success: "#5B9A6B", successLight: "#E8F5EC",
  danger: "#C25E5E", dangerLight: "#FCEAEA",
  purple: "#7B6BA0", purpleLight: "#F0ECF5",
};

const font = "'DM Sans', sans-serif";

// ══════════════════════════════════════════
// Shared project data
// ══════════════════════════════════════════
const PROJECTS = [
  { id: 1, name: "Fraud Detection v2", dept: "Risk", status: "Go-Live", statusColor: W.success, value: "$3.4M", valNum: 3400000, tools: ["Claude", "Replit"], goLive: "Feb 28", progress: 1.0, owner: "MR" },
  { id: 2, name: "Supply Chain Optimizer", dept: "Operations", status: "Approved", statusColor: W.success, value: "$2.1M", valNum: 2100000, tools: ["Copilot", "Power Automate"], goLive: "Apr 15", progress: 0.35, owner: "TK" },
  { id: 3, name: "Predictive Maintenance", dept: "Manufacturing", status: "At Risk", statusColor: W.danger, value: "$1.8M", valNum: 1800000, tools: ["ChatGPT", "Replit"], goLive: "May 1", progress: 0.55, owner: "AJ" },
  { id: 4, name: "InvoiceAI Automation", dept: "Finance", status: "In Progress", statusColor: W.accent, value: "$1.2M", valNum: 1200000, tools: ["Claude", "Replit"], goLive: "Mar 8", progress: 0.72, owner: "JD" },
  { id: 5, name: "Sales Lead Scoring", dept: "Sales", status: "In Progress", statusColor: W.accent, value: "$900K", valNum: 900000, tools: ["Claude", "Cursor"], goLive: "Apr 30", progress: 0.48, owner: "LW" },
  { id: 6, name: "Customer Churn Predictor", dept: "Marketing", status: "UAT", statusColor: W.highlight, value: "$800K", valNum: 800000, tools: ["ChatGPT", "Lovable"], goLive: "Mar 22", progress: 0.85, owner: "NK" },
  { id: 7, name: "Demand Forecasting", dept: "Supply Chain", status: "At Risk", statusColor: W.danger, value: "$600K", valNum: 600000, tools: ["Copilot"], goLive: "Jun 1", progress: 0.25, owner: "PB" },
  { id: 8, name: "HR Resume Screener", dept: "HR", status: "Under Review", statusColor: W.purple, value: "$350K", valNum: 350000, tools: ["Claude", "Figma AI"], goLive: "May 15", progress: 0.15, owner: "SK" },
  { id: 9, name: "Doc Summarizer", dept: "Legal", status: "Submitted", statusColor: W.textMuted, value: "$200K", valNum: 200000, tools: ["Claude"], goLive: "—", progress: 0.05, owner: "RH" },
  { id: 10, name: "Chatbot Refresh", dept: "CX", status: "At Risk", statusColor: W.danger, value: "$150K", valNum: 150000, tools: ["Lovable", "Claude"], goLive: "Jun 15", progress: 0.40, owner: "EM" },
];

const STATUSES = ["Submitted", "Under Review", "Approved", "In Progress", "UAT", "Go-Live", "At Risk"];
const DEPARTMENTS = [...new Set(PROJECTS.map(p => p.dept))];

// ══════════════════════════════════════════
// Shared UI primitives
// ══════════════════════════════════════════
const Badge = ({ text, color, bg, small }) => (
  <span style={{
    display: "inline-block", padding: small ? "2px 8px" : "3px 10px",
    borderRadius: 12, fontSize: small ? 9 : 10, fontWeight: 600,
    color, background: bg, whiteSpace: "nowrap",
  }}>{text}</span>
);

const ProgressBar = ({ pct, color, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: W.surfaceAlt, borderRadius: h }}>
    <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: color || W.accent, borderRadius: h, transition: "width 0.6s ease" }} />
  </div>
);

const KpiCard = ({ label, value, sub, color, subColor }) => (
  <div style={{
    background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10,
    padding: "14px 18px", flex: 1, minWidth: 0,
  }}>
    <div style={{ fontSize: 10, color: W.textMuted, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: color || W.accent, letterSpacing: "-0.03em" }}>{value}</div>
    <div style={{ fontSize: 9, color: subColor || W.textMuted, marginTop: 4 }}>{sub}</div>
  </div>
);

// ══════════════════════════════════════════
// Sidebar
// ══════════════════════════════════════════
const SidebarNav = ({ active, onNav }) => {
  const items = [
    { key: "home", icon: "⊞", label: "Home" },
    { key: "submit", icon: "⊕", label: "Submit" },
    { key: "portfolio", icon: "▤", label: "Portfolio" },
    { key: "exec", icon: "◎", label: "Executive", disabled: true },
    { key: "settings", icon: "⚙", label: "Settings", disabled: true },
  ];
  return (
    <div style={{
      width: 60, minWidth: 60, height: "100vh", background: W.accentDark,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "12px 0", position: "sticky", top: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: W.highlight,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 20,
      }}>Ai</div>
      {items.map((it) => (
        <div key={it.key}
          onClick={() => !it.disabled && onNav(it.key)}
          title={it.label}
          style={{
            width: 40, height: 40, borderRadius: 8, marginBottom: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, cursor: it.disabled ? "default" : "pointer",
            color: active === it.key ? "#fff" : it.disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
            background: active === it.key ? "rgba(255,255,255,0.15)" : "transparent",
            transition: "all 0.15s",
          }}
        >{it.icon}</div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{
        width: 32, height: 32, borderRadius: 32, background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)",
      }}>JD</div>
    </div>
  );
};

// ══════════════════════════════════════════
// Top bar
// ══════════════════════════════════════════
const TopBar = ({ title, subtitle, children }) => (
  <div style={{
    height: 56, background: W.surface, borderBottom: `1px solid ${W.borderLight}`,
    padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 10,
  }}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: W.text, letterSpacing: "-0.02em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: W.textMuted, marginTop: -1 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
  </div>
);

// ══════════════════════════════════════════
// SCREEN: Portfolio Overview
// ══════════════════════════════════════════
const PortfolioOverview = ({ onNav }) => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortBy, setSortBy] = useState("value");
  const [hoverRow, setHoverRow] = useState(null);

  const filtered = PROJECTS
    .filter(p => statusFilter === "All" || p.status === statusFilter)
    .filter(p => deptFilter === "All" || p.dept === deptFilter)
    .sort((a, b) => sortBy === "value" ? b.valNum - a.valNum : sortBy === "name" ? a.name.localeCompare(b.name) : a.dept.localeCompare(b.dept));

  const totalVal = PROJECTS.reduce((s, p) => s + p.valNum, 0);
  const realizedVal = 8600000;
  const statusCounts = STATUSES.reduce((acc, s) => { acc[s] = PROJECTS.filter(p => p.status === s).length; return acc; }, {});
  const atRiskCount = PROJECTS.filter(p => p.status === "At Risk").length;

  // Dept breakdown
  const deptGroups = DEPARTMENTS.map(d => ({
    dept: d,
    count: PROJECTS.filter(p => p.dept === d).length,
    value: PROJECTS.filter(p => p.dept === d).reduce((s, p) => s + p.valNum, 0),
  })).sort((a, b) => b.value - a.value);

  // Tool usage
  const toolCounts = {};
  PROJECTS.forEach(p => p.tools.forEach(t => { toolCounts[t] = (toolCounts[t] || 0) + 1; }));
  const topTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="Portfolio Overview" subtitle="Real-time overview of all AI initiatives">
        <Badge text="Live" color={W.success} bg={W.successLight} />
        <button onClick={() => onNav("submit")} style={{
          padding: "7px 16px", borderRadius: 6, border: "none",
          background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: font,
        }}>+ New Project</button>
      </TopBar>

      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        {/* KPI Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Total Portfolio Value" value={`$${(totalVal / 1e6).toFixed(1)}M`} sub="Est. annual impact" color={W.accent} />
          <KpiCard label="Value Realized" value={`$${(realizedVal / 1e6).toFixed(1)}M`} sub={`${Math.round(realizedVal / totalVal * 100)}% of estimate`} color={W.success} subColor={W.success} />
          <KpiCard label="Active Projects" value={PROJECTS.length} sub="↑ 12% from last quarter" color={W.highlight} subColor={W.success} />
          <KpiCard label="At Risk" value={atRiskCount} sub="Need attention" color={W.danger} subColor={W.danger} />
        </div>

        {/* Pipeline + Tool Breakdown row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {/* Pipeline funnel */}
          <div style={{ flex: 2, background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 14 }}>Pipeline funnel</div>
            {[
              { stage: "Submitted", color: W.textMuted },
              { stage: "Under Review", color: W.purple },
              { stage: "Approved", color: W.success },
              { stage: "In Progress", color: W.accent },
              { stage: "UAT", color: W.highlight },
              { stage: "Go-Live", color: "#4A9068" },
              { stage: "At Risk", color: W.danger },
            ].map((s) => {
              const count = PROJECTS.filter(p => p.status === s.stage).length;
              return (
                <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 85, fontSize: 10, color: W.textMuted, flexShrink: 0, textAlign: "right" }}>{s.stage}</div>
                  <div style={{ flex: 1, height: 16, background: s.color + "18", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${(count / PROJECTS.length) * 100}%`, height: "100%", background: s.color, borderRadius: 4, transition: "width 0.5s ease", minWidth: count > 0 ? 8 : 0 }} />
                  </div>
                  <div style={{ width: 20, fontSize: 11, fontWeight: 700, color: s.color }}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Tools & Dept columns */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tool usage */}
            <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 10 }}>Top tools</div>
              {topTools.slice(0, 5).map(([tool, count]) => (
                <div key={tool} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: W.text }}>{tool}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 50, height: 4, background: W.surfaceAlt, borderRadius: 2 }}>
                      <div style={{ width: `${(count / PROJECTS.length) * 100}%`, height: "100%", background: W.accent, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: W.accent, minWidth: 16, textAlign: "right" }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dept breakdown */}
            <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 10 }}>By department</div>
              {deptGroups.slice(0, 5).map((d) => (
                <div key={d.dept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: W.text }}>{d.dept}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, color: W.textMuted }}>{d.count} projects</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: W.success }}>${(d.value / 1e6).toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          padding: "10px 16px", background: W.surface, border: `1px solid ${W.borderLight}`,
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, marginRight: 4 }}>Filters</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
            padding: "5px 8px", borderRadius: 5, border: `1px solid ${W.border}`,
            fontSize: 10, fontFamily: font, color: W.text, background: "#fff",
          }}>
            <option value="All">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{
            padding: "5px 8px", borderRadius: 5, border: `1px solid ${W.border}`,
            fontSize: 10, fontFamily: font, color: W.text, background: "#fff",
          }}>
            <option value="All">All departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: W.textMuted }}>Sort by:</span>
          {[
            { key: "value", label: "Value" },
            { key: "name", label: "Name" },
            { key: "dept", label: "Dept" },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)} style={{
              padding: "4px 10px", borderRadius: 4, border: `1px solid ${sortBy === s.key ? W.accent : W.borderLight}`,
              background: sortBy === s.key ? W.accentLight : "transparent",
              color: sortBy === s.key ? W.accent : W.textMuted,
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: font,
            }}>{s.label}</button>
          ))}
          <span style={{ fontSize: 10, color: W.textMuted, marginLeft: 8 }}>{filtered.length} projects</span>
        </div>

        {/* Project Table */}
        <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.2fr 0.8fr 0.6fr",
            padding: "10px 20px", background: W.accentDark, gap: 8,
          }}>
            {["Project", "Department", "Status", "Progress", "Value", "Tools"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p, i) => (
            <div key={p.id}
              onMouseEnter={() => setHoverRow(p.id)}
              onMouseLeave={() => setHoverRow(null)}
              style={{
                display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.2fr 0.8fr 0.6fr",
                padding: "12px 20px", gap: 8, alignItems: "center",
                background: hoverRow === p.id ? W.accentLight + "40" : i % 2 === 0 ? W.surfaceAlt + "50" : "transparent",
                borderBottom: i < filtered.length - 1 ? `1px solid ${W.borderLight}` : "none",
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{p.name}</div>
                <div style={{ fontSize: 9, color: W.textMuted, marginTop: 1 }}>Owner: {p.owner} · Go-live: {p.goLive}</div>
              </div>
              <div style={{ fontSize: 11, color: W.textMuted }}>{p.dept}</div>
              <div><Badge text={p.status} color={p.statusColor} bg={p.statusColor + "18"} small /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}><ProgressBar pct={p.progress} color={p.statusColor} /></div>
                <span style={{ fontSize: 10, color: W.textMuted, minWidth: 28, textAlign: "right" }}>{Math.round(p.progress * 100)}%</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>{p.value}</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {p.tools.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 8, background: W.accentLight, color: W.accent, fontWeight: 500 }}>{t}</span>
                ))}
                {p.tools.length > 2 && <span style={{ fontSize: 8, color: W.textMuted }}>+{p.tools.length - 2}</span>}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: W.textMuted, fontSize: 12 }}>
              No projects match the current filters
            </div>
          )}
        </div>

        {/* At Risk callout */}
        {atRiskCount > 0 && (
          <div style={{
            marginTop: 16, background: W.dangerLight, border: `1px solid ${W.danger}30`,
            borderRadius: 10, padding: "16px 20px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: W.danger, marginBottom: 10 }}>Projects at risk</div>
            {PROJECTS.filter(p => p.status === "At Risk").map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: W.text }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: W.textMuted, marginLeft: 8 }}>{p.dept}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: W.danger }}>{p.value}</span>
                  <Badge text="Needs attention" color={W.danger} bg={W.danger + "18"} small />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// SCREEN: Home Dashboard
// ══════════════════════════════════════════
const HomeDashboard = ({ onNav }) => {
  const totalVal = PROJECTS.reduce((s, p) => s + p.valNum, 0);
  const upcoming = PROJECTS.filter(p => p.goLive !== "—" && p.status !== "Go-Live").slice(0, 4);
  const recent = PROJECTS.slice(0, 6);

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="AI Portfolio Home" subtitle="Welcome back, Jane">
        <div style={{
          padding: "6px 12px", borderRadius: 6, border: `1px solid ${W.border}`,
          fontSize: 10, color: W.textMuted, background: "#fff", width: 180,
        }}>⌕ Search projects...</div>
        <button onClick={() => onNav("submit")} style={{
          padding: "7px 16px", borderRadius: 6, border: "none",
          background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: font,
        }}>+ New</button>
      </TopBar>

      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Active Projects" value={PROJECTS.length} sub="↑ 12% from last quarter" color={W.accent} subColor={W.success} />
          <KpiCard label="Portfolio Value" value={`$${(totalVal / 1e6).toFixed(1)}M`} sub="Est. annual value" color={W.success} />
          <KpiCard label="Go-Lives This Month" value="3" sub="Next: Mar 8 — InvoiceAI" color={W.highlight} />
          <KpiCard label="Value Realized" value="$8.6M" sub="61% of estimate" color={W.purple} />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {/* Recent projects */}
          <div style={{ flex: 2, background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Recent projects</div>
              <button onClick={() => onNav("portfolio")} style={{
                padding: "4px 12px", borderRadius: 5, border: `1px solid ${W.border}`,
                background: "transparent", fontSize: 10, color: W.text, cursor: "pointer", fontFamily: font,
              }}>View all →</button>
            </div>
            {recent.map((p, i) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < recent.length - 1 ? `1px solid ${W.borderLight}` : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: W.textMuted }}>{p.dept}</div>
                </div>
                <Badge text={p.status} color={p.statusColor} bg={p.statusColor + "18"} small />
                <div style={{ width: 60, textAlign: "right", marginLeft: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.text }}>{p.value}</div>
                  <div style={{ fontSize: 8, color: W.textLight }}>Est. value</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar widgets */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Upcoming go-lives */}
            <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 12 }}>Upcoming go-lives</div>
              {upcoming.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: W.text }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: W.accent }}>{p.goLive}</span>
                </div>
              ))}
            </div>

            {/* Action items */}
            <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 12 }}>My action items</div>
              {[
                { text: "Review: HR Resume Screener", type: "Review", color: W.purple },
                { text: "Update value: Fraud Detection", type: "Measure", color: W.highlight },
                { text: "Approve: Doc Summarizer", type: "Approve", color: W.success },
                { text: "Score: 2 new submissions", type: "Score", color: W.accent },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge text={a.type} color={a.color} bg={a.color + "18"} small />
                  <span style={{ fontSize: 10, color: W.text }}>{a.text}</span>
                </div>
              ))}
            </div>

            {/* Quick submit */}
            <div onClick={() => onNav("submit")} style={{
              background: W.accentLight, border: `1px solid ${W.accent}30`,
              borderRadius: 10, padding: "16px 20px", cursor: "pointer",
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.accent, marginBottom: 4 }}>Submit a new project</div>
              <div style={{ fontSize: 10, color: W.textMuted }}>Chat with AI, fill a form, or upload a doc — takes under 2 min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// SCREEN: Project Submission V2
// ══════════════════════════════════════════
const ProjectSubmission = ({ onNav }) => {
  const [mode, setMode] = useState(null);
  const [chatStep, setChatStep] = useState(0);
  const [uploadState, setUploadState] = useState("idle");

  const resetMode = () => { setMode(null); setChatStep(0); setUploadState("idle"); };

  // ── Intake mode selector ──
  const IntakeSelector = () => (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      {[
        { key: "chat", icon: "💬", title: "Quick Chat", sub: "AI-guided conversation", desc: "Answer a few questions naturally. We'll fill in the details.", color: W.accent, lightColor: W.accentLight },
        { key: "form", icon: "📝", title: "Simple Form", sub: "5 fields, under 2 min", desc: "Know what you need? Fill it in directly — no fuss.", color: W.accent, lightColor: W.accentLight },
        { key: "upload", icon: "📄", title: "Upload a Doc", sub: "We'll extract everything", desc: "Have a business case, proposal, or one-pager? Drop it here.", color: W.purple, lightColor: W.purpleLight },
      ].map(m => (
        <div key={m.key} onClick={() => { setMode(m.key); if (m.key === "upload") setUploadState("idle"); }}
          style={{
            flex: 1, padding: "16px 18px", borderRadius: 10,
            background: mode === m.key ? m.lightColor : W.surface,
            border: `1.5px solid ${mode === m.key ? m.color : W.borderLight}`,
            cursor: "pointer", transition: "all 0.2s",
            opacity: mode && mode !== m.key ? 0.45 : 1,
            transform: mode && mode !== m.key ? "scale(0.97)" : "scale(1)",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: mode === m.key ? m.color : m.lightColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: mode === m.key ? "#fff" : m.color }}>{m.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{m.title}</div>
              <div style={{ fontSize: 10, color: W.textMuted }}>{m.sub}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: W.textMuted, lineHeight: 1.5 }}>{m.desc}</div>
        </div>
      ))}
    </div>
  );

  // ── Chat Mode ──
  const ChatMode = () => {
    const messages = [
      { from: "ai", text: "Hey! Let's get your AI project registered. What are you calling it?" },
      { from: "user", text: "InvoiceAI Automation" },
      { from: "ai", text: "Great name. In a sentence or two — what problem does this solve?" },
      { from: "user", text: "Our AP team spends 45 min per invoice manually. 12% error rate. AI could extract, validate, and route automatically." },
      { from: "ai", text: "That's a strong use case. Which team would own this?" },
      { from: "user", text: "Finance — accounts payable specifically" },
      { from: "ai", text: "Nice. Which tools are you planning to use? Tap all that apply:" },
    ];
    const visible = messages.slice(0, Math.min(chatStep + 3, messages.length));
    const showTools = chatStep >= 4 && chatStep < 6;
    const showImpact = chatStep >= 6;

    return (
      <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", height: 380 }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${W.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: W.highlight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>Ai</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: W.text }}>Project Intake Assistant</span>
          </div>
          <span style={{ fontSize: 9, color: W.textMuted }}>~2 min</span>
        </div>
        <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
          {visible.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "78%", padding: "8px 12px", borderRadius: 10,
                background: m.from === "user" ? W.accent : W.surfaceAlt,
                color: m.from === "user" ? "#fff" : W.text,
                fontSize: 11, lineHeight: 1.55,
                borderBottomRightRadius: m.from === "user" ? 3 : 10,
                borderBottomLeftRadius: m.from === "ai" ? 3 : 10,
              }}>{m.text}</div>
            </div>
          ))}
          {showTools && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[{ n: "Claude", s: true }, { n: "Replit", s: true }, { n: "Copilot", s: false }, { n: "Lovable", s: false }, { n: "Cursor", s: false }, { n: "ChatGPT", s: false }, { n: "Figma AI", s: false }, { n: "Power Automate", s: false }, { n: "Other", s: false }].map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "5px 10px", borderRadius: 14, background: t.s ? W.accentLight : "#fff", color: t.s ? W.accent : W.textMuted, border: `1px solid ${t.s ? W.accent : W.borderLight}`, fontWeight: t.s ? 600 : 400, cursor: "pointer" }}>{t.n}</span>
                ))}
              </div>
              <div onClick={() => setChatStep(6)} style={{ marginTop: 8, display: "inline-block", padding: "5px 14px", borderRadius: 14, background: W.accent, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Confirm tools →</div>
            </div>
          )}
          {chatStep >= 6 && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
              <div style={{ maxWidth: "78%", padding: "8px 12px", borderRadius: 10, background: W.surfaceAlt, color: W.text, fontSize: 11, lineHeight: 1.55, borderBottomLeftRadius: 3 }}>
                Claude + Replit — solid combo. Last question: roughly how big is the impact?
              </div>
            </div>
          )}
          {showImpact && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {[{ label: "Quick win", sub: "<$100K", c: W.textMuted }, { label: "Meaningful", sub: "$100K–500K", c: W.highlight }, { label: "Transformative", sub: "$500K+", c: W.success }].map((opt, i) => (
                <div key={i} onClick={() => setChatStep(7)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${i === 2 && chatStep >= 7 ? W.success : W.border}`, background: i === 2 && chatStep >= 7 ? W.successLight : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: W.text }}>{opt.label}</div>
                  <div style={{ fontSize: 9, color: opt.c }}>{opt.sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${W.borderLight}`, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${W.border}`, borderRadius: 20, padding: "7px 14px", fontSize: 10, color: chatStep >= 7 ? W.text : W.textMuted }}>
            {chatStep >= 7 ? "Looks great — ready to submit!" : "Type your answer..."}
          </div>
          {chatStep < 7 ? (
            <div onClick={() => setChatStep(Math.min(chatStep + 1, 7))} style={{ width: 28, height: 28, borderRadius: 14, background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, color: "#fff" }}>↑</div>
          ) : (
            <div onClick={() => onNav("portfolio")} style={{ padding: "6px 16px", borderRadius: 14, background: W.success, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Submit ✓</div>
          )}
        </div>
      </div>
    );
  };

  // ── Form Mode ──
  const FormMode = () => (
    <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${W.borderLight}`, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: W.text }}>New AI Project</span>
        <span style={{ fontSize: 9, color: W.textMuted }}>5 fields · takes ~90 sec</span>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Project name</label>
          <div style={{ border: `1px solid ${W.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 11, color: W.text, background: "#fff" }}>InvoiceAI Automation</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>What problem does this solve?</label>
          <div style={{ border: `1px solid ${W.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 11, color: W.text, background: "#fff", minHeight: 48, lineHeight: 1.5 }}>Manual invoice processing takes 45 min each with 12% error rate. AI extracts, validates, routes automatically.</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Department</label>
          <div style={{ border: `1px solid ${W.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 11, color: W.text, background: "#fff", display: "flex", justifyContent: "space-between", width: 200 }}>
            <span>Finance</span><span style={{ color: W.textLight }}>▾</span>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Tools / platforms <span style={{ fontWeight: 400, color: W.textLight }}>(select all)</span></label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[{ n: "Claude", s: true }, { n: "Replit", s: true }, { n: "Copilot", s: false }, { n: "Lovable", s: false }, { n: "Figma AI", s: false }, { n: "Cursor", s: false }, { n: "ChatGPT", s: false }, { n: "Power Automate", s: false }, { n: "Other", s: false }].map((t, i) => (
              <span key={i} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 14, background: t.s ? W.accentLight : "transparent", color: t.s ? W.accent : W.textMuted, border: `1px solid ${t.s ? W.accent : W.borderLight}`, fontWeight: t.s ? 600 : 400, cursor: "pointer" }}>{t.n}</span>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Expected impact</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ l: "<$100K", s: "Quick win" }, { l: "$100K–500K", s: "Meaningful" }, { l: "$500K–2M", s: "Transformative", a: true }, { l: ">$2M", s: "Strategic" }].map((v, i) => (
              <div key={i} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, textAlign: "center", background: v.a ? W.successLight : "#fff", border: `1.5px solid ${v.a ? W.success : W.borderLight}`, cursor: "pointer" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: v.a ? W.success : W.text }}>{v.l}</div>
                <div style={{ fontSize: 8, color: v.a ? W.success : W.textMuted, marginTop: 1 }}>{v.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${W.borderLight}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: W.textLight }}>Sponsor, cost center & BU added after review</span>
          <div onClick={() => onNav("portfolio")} style={{ padding: "7px 22px", borderRadius: 6, background: W.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Submit →</div>
        </div>
      </div>
    </div>
  );

  // ── Upload Mode ──
  const UploadMode = () => (
    <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${W.borderLight}`, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: W.text }}>Upload & Auto-Extract</span>
        <span style={{ fontSize: 9, color: W.textMuted }}>PDF, DOCX, PPTX, or email</span>
      </div>
      {uploadState === "idle" && (
        <div style={{ padding: 18 }}>
          <div onClick={() => setUploadState("processing")} style={{ border: `2px dashed ${W.purple}40`, borderRadius: 10, background: W.purpleLight + "60", padding: "36px 20px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: W.purple, marginBottom: 4 }}>Drop your document here or click to browse</div>
            <div style={{ fontSize: 10, color: W.textMuted, lineHeight: 1.5 }}>Business case, project proposal, one-pager, executive summary, email thread…</div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center" }}>
            {["Business_Case.pdf", "AI_Proposal.docx", "Exec_Summary.pptx"].map((f, i) => (
              <span key={i} style={{ fontSize: 9, color: W.textLight, padding: "4px 10px", background: W.surfaceAlt, borderRadius: 10 }}>e.g. {f}</span>
            ))}
          </div>
        </div>
      )}
      {uploadState === "processing" && (
        <div style={{ padding: 18, textAlign: "center" }}>
          <div style={{ margin: "20px 0 12px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: W.purpleLight, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📄</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 4 }}>InvoiceAI_Business_Case.pdf</div>
          <div style={{ fontSize: 10, color: W.textMuted, marginBottom: 16 }}>Extracting project details...</div>
          <div style={{ textAlign: "left", maxWidth: 280, margin: "0 auto" }}>
            {[{ l: "Reading document", done: true }, { l: "Extracting name & description", done: true }, { l: "Identifying value estimates", done: true }, { l: "Detecting team & department", active: true }, { l: "Mapping to intake fields" }].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? W.success : s.active ? W.highlight : W.surfaceAlt, color: s.done || s.active ? "#fff" : W.textLight }}>{s.done ? "✓" : s.active ? "…" : i + 1}</div>
                <span style={{ fontSize: 10, color: s.done ? W.success : s.active ? W.text : W.textLight, fontWeight: s.active ? 600 : 400 }}>{s.l}</span>
              </div>
            ))}
          </div>
          <div onClick={() => setUploadState("done")} style={{ marginTop: 10, padding: "5px 14px", borderRadius: 6, background: W.surfaceAlt, display: "inline-block", fontSize: 10, color: W.accent, cursor: "pointer", fontWeight: 600 }}>▶ Simulate complete</div>
        </div>
      )}
      {uploadState === "done" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 20, background: W.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>✓</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: W.success }}>Extracted from InvoiceAI_Business_Case.pdf</span>
          </div>
          {[
            { l: "Project name", v: "InvoiceAI Automation", c: "high" },
            { l: "Problem", v: "AP team processes 200+ invoices/day manually at 45 min each with 12% error rate", c: "high" },
            { l: "Department", v: "Finance — Accounts Payable", c: "high" },
            { l: "Tools", v: "Claude, Replit", c: "med" },
            { l: "Expected impact", v: "$1.2M annually (cost reduction + error avoidance)", c: "med" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: W.textMuted, fontWeight: 600, marginBottom: 2 }}>{f.l}</div>
                <div style={{ border: `1px solid ${W.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 10, color: W.text, background: "#fff", lineHeight: 1.4 }}>{f.v}</div>
              </div>
              <div style={{ marginTop: 14, fontSize: 8, fontWeight: 600, padding: "3px 7px", borderRadius: 8, background: f.c === "high" ? W.successLight : W.highlightLight, color: f.c === "high" ? W.success : W.highlight }}>{f.c === "high" ? "✓ High" : "~ Med"}</div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${W.borderLight}`, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, color: W.textLight }}>Review extracted fields, then submit</span>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ padding: "6px 14px", borderRadius: 5, border: `1px solid ${W.border}`, fontSize: 10, color: W.text, cursor: "pointer" }}>Edit</div>
              <div onClick={() => onNav("portfolio")} style={{ padding: "6px 18px", borderRadius: 5, background: W.accent, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Submit →</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Right panel ──
  const RightPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: W.highlightLight, border: `1px solid ${W.highlight}30`, borderRadius: 8, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: W.highlight, marginBottom: 8 }}>What happens next?</div>
        <div style={{ borderTop: `1px solid ${W.highlight}20`, paddingTop: 8 }}>
          {["You submit → project enters review queue", "Reviewer scores for fit & feasibility", "If approved, you add team & timeline details", "Project shows up in portfolio dashboard"].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 9, color: W.text, lineHeight: 1.4 }}>
              <span style={{ color: W.highlight, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: W.surface, border: `1px solid ${W.borderLight}`, borderRadius: 8, padding: "12px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, marginBottom: 8 }}>Recently submitted</div>
        {[{ n: "Fraud Detection v2", d: "Risk", t: "2d ago" }, { n: "Doc Summarizer", d: "Legal", t: "5d ago" }, { n: "Sales Lead Scoring", d: "Sales", t: "1w ago" }].map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: W.text }}>{p.n}</div>
              <div style={{ fontSize: 8, color: W.textMuted }}>{p.d}</div>
            </div>
            <span style={{ fontSize: 8, color: W.textLight }}>{p.t}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="Submit New AI Project" subtitle="Choose how you'd like to get started">
        {mode && <button onClick={resetMode} style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${W.border}`, fontSize: 10, color: W.text, cursor: "pointer", fontFamily: font, background: "transparent" }}>← Change mode</button>}
      </TopBar>
      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        <IntakeSelector />
        {mode ? (
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2 }}>
              {mode === "chat" && <ChatMode />}
              {mode === "form" && <FormMode />}
              {mode === "upload" && <UploadMode />}
            </div>
            <div style={{ flex: 1 }}><RightPanel /></div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: W.textMuted }}>Pick an intake method above</div>
            <div style={{ fontSize: 11, color: W.textLight, marginTop: 4 }}>All three paths collect the same 5 essentials — just different vibes</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// App Shell
// ══════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");

  return (
    <div style={{ fontFamily: font, display: "flex", minHeight: "100vh", background: W.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <SidebarNav active={screen} onNav={setScreen} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {screen === "home" && <HomeDashboard onNav={setScreen} />}
        {screen === "submit" && <ProjectSubmission onNav={setScreen} />}
        {screen === "portfolio" && <PortfolioOverview onNav={setScreen} />}
      </div>
    </div>
  );
}
