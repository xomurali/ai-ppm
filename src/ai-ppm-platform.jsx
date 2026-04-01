import React, { useState, useEffect, useRef } from "react";

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

const STATUS_META = {
  "Submitted": { color: W.textMuted },
  "Under Review": { color: W.purple },
  "Approved": { color: W.success },
  "In Progress": { color: W.accent },
  "UAT": { color: W.highlight },
  "Go-Live": { color: "#4A9068" },
  "At Risk": { color: W.danger },
};
const ALL_STATUSES = Object.keys(STATUS_META);
const ALL_TOOLS = ["Claude", "Replit", "Copilot", "Lovable", "Figma AI", "Cursor", "ChatGPT", "Power Automate", "Other"];
const ALL_DEPTS = ["Finance", "Operations", "Manufacturing", "Sales", "Marketing", "HR", "Legal", "CX", "Risk", "Supply Chain", "Engineering", "IT"];
const IMPACT_TIERS = [
  { label: "<$100K", sub: "Quick win", valNum: 75000, valStr: "$75K" },
  { label: "$100K-500K", sub: "Meaningful", valNum: 300000, valStr: "$300K" },
  { label: "$500K-2M", sub: "Transformative", valNum: 1200000, valStr: "$1.2M" },
  { label: ">$2M", sub: "Strategic", valNum: 3000000, valStr: "$3M" },
];

const STRATEGIC_CATEGORIES = [
  { key: "Defend", label: "Defend", desc: "Internal efficiency, cost savings, competitive parity", color: "#2E75B6", light: "#D5E8F0" },
  { key: "Extend", label: "Extend", desc: "Revenue growth, competitive advantage, market expansion", color: "#5B9A6B", light: "#E8F5EC" },
  { key: "Upend",  label: "Upend",  desc: "New markets, new products, game-changing innovation", color: "#7B6BA0", light: "#F0ECF5" },
];

function formatVal(n) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}
function getStatusColor(status) {
  return (STATUS_META[status] || {}).color || W.textMuted;
}
function loadProjects() {
  try { var d = localStorage.getItem("ai-ppm-projects"); return d ? JSON.parse(d) : []; } catch(e) { return []; }
}
function saveProjects(projects) {
  // Strip base64 file data before saving to localStorage to avoid QuotaExceededError
  // File content lives on the server — only metadata is needed locally
  try {
    var slim = projects.map(function(p) {
      return { ...p, files: (p.files || []).map(function(f) { return { name: f.name, size: f.size, type: f.type, uploadedAt: f.uploadedAt, storedAs: f.storedAs }; }) };
    });
    localStorage.setItem("ai-ppm-projects", JSON.stringify(slim));
  } catch(e) {
    // If still too large, save without files at all
    try {
      var noFiles = projects.map(function(p) { return { ...p, files: [] }; });
      localStorage.setItem("ai-ppm-projects", JSON.stringify(noFiles));
    } catch(e2) { /* silent — server is source of truth anyway */ }
  }
}

// ── Auth helpers ──
function getApiBase() {
  // First check if user manually configured a different backend
  try { var s = localStorage.getItem("ai-ppm-api-base"); if (s) return s; } catch(e) {}
  // Auto-detect: API is served from same origin via Nginx proxy
  return window.location.origin;
}
function getToken() { return localStorage.getItem("ai-ppm-token") || ""; }
function setToken(t) { if (t) localStorage.setItem("ai-ppm-token", t); else localStorage.removeItem("ai-ppm-token"); }

async function apiFetch(path, opts = {}) {
  var base = getApiBase();
  var headers = { "Content-Type": "application/json", ...opts.headers };
  var token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  var res;
  try {
    res = await fetch(base + path, { ...opts, headers: headers });
  } catch(e) {
    throw new Error("Unable to connect to the server. Please check your internet connection and try again.");
  }
  if (res.status === 401) {
    setToken("");
    window.location.reload();
    throw new Error("Your session has expired. Please sign in again.");
  }
  var text = await res.text();
  var data;
  try {
    data = JSON.parse(text);
  } catch(e) {
    // Server returned HTML instead of JSON — likely a proxy/routing issue
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("The server is not responding correctly. This usually means HTTPS is not fully configured. Try using http:// instead, or contact your administrator.");
    }
    throw new Error("Received an unexpected response from the server. Please try again.");
  }
  if (!res.ok) {
    var msg = data.error || "Something went wrong. Please try again.";
    if (res.status === 403) msg = data.error || "You don\u2019t have permission to perform this action.";
    if (res.status === 404) msg = data.error || "The requested resource was not found.";
    if (res.status === 409) msg = data.error || "This item already exists.";
    if (res.status >= 500) msg = "The server encountered an error. Please try again or contact your administrator.";
    throw new Error(msg);
  }
  return data;
}

// LLM Settings
function loadLLMSettings() {
  try { var d = localStorage.getItem("ai-ppm-llm"); return d ? JSON.parse(d) : { provider: "anthropic", apiKey: "", model: "" }; } catch(e) { return { provider: "anthropic", apiKey: "", model: "" }; }
}
function saveLLMSettings(s) { localStorage.setItem("ai-ppm-llm", JSON.stringify(s)); }

var LLM_MODELS = {
  anthropic: [{ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" }, { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" }],
  openai: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4o-mini", name: "GPT-4o Mini" }],
};

var INTAKE_SYSTEM_PROMPT = "You are an AI project intake assistant for a corporate AI portfolio management tool. Your job is to help users register new AI projects by collecting information through natural conversation:\n1. Project name\n2. Problem it solves (pain point + how AI helps)\n3. Department that owns it\n4. Tools/platforms involved (e.g. Claude, Replit, Copilot, Lovable, Figma AI, Cursor, ChatGPT, Power Automate)\n5. Expected impact tier: <$100K (Quick win), $100K-500K (Meaningful), $500K-2M (Transformative), >$2M (Strategic)\n6. Who benefits — internal users, external customers, or both?\n7. The ONE metric this will change and how you'll measure success\n\nBe conversational, warm, and brief. Ask one question at a time. Do NOT ask the user about strategic category — classify it yourself based on the conversation: Defend = internal efficiency/cost savings/competitive parity. Extend = revenue growth/competitive advantage/market expansion. Upend = new markets/new products/game-changing innovation.\n\nAfter you have all the information, output EXACTLY this JSON block and nothing else:\n```json\n{\"complete\":true,\"name\":\"...\",\"problem\":\"...\",\"dept\":\"...\",\"tools\":[\"...\"],\"impact\":\"<$100K|$100K-500K|$500K-2M|>$2M\",\"beneficiaries\":\"Internal users|External customers|Both\",\"successMetric\":\"...\",\"successMeasure\":\"...\",\"strategicCategory\":\"Defend|Extend|Upend\"}\n```\nDo not output the JSON until you have all fields confirmed. Keep responses under 2 sentences.";

async function callLLM(messages, settings) {
  var model = settings.model || LLM_MODELS[settings.provider || "anthropic"][0].id;
  var provider = settings.provider || "anthropic";

  // Try server-side proxy first (uses ANTHROPIC_API_KEY / OPENAI_API_KEY env vars)
  try {
    var proxyRes = await apiFetch("/api/llm/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text })),
        model: model,
        provider: provider,
        system: INTAKE_SYSTEM_PROMPT
      })
    });
    return proxyRes.text;
  } catch(proxyErr) {
    // If proxy fails due to missing server key, fall back to browser key
    if (proxyErr.message && proxyErr.message.includes("ANTHROPIC_API_KEY")) {
      if (!settings.apiKey) throw new Error("No API key configured. Add ANTHROPIC_API_KEY to the server environment, or go to Settings to add a browser API key.");
    } else if (proxyErr.message && (proxyErr.message.includes("401") || proxyErr.message.includes("session"))) {
      throw proxyErr; // Auth error — don't fall through
    }
    // Fall back to direct browser call if we have a browser key
    if (!settings.apiKey) throw new Error("No API key configured. Add ANTHROPIC_API_KEY to the server environment, or go to Settings to add a browser API key.");
  }

  // Browser fallback
  if (provider === "anthropic") {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: model, max_tokens: 1024, system: INTAKE_SYSTEM_PROMPT, messages: messages.map(m => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text })) })
    });
    if (!res.ok) {
      var err = await res.json().catch(() => ({}));
      var msg = err.error?.message || "Anthropic API error: " + res.status;
      var e = new Error(msg);
      e.isOverloaded = (res.status === 529 || msg.toLowerCase().includes("overload"));
      throw e;
    }
    var data = await res.json();
    return data.content[0].text;
  } else {
    var res2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + settings.apiKey },
      body: JSON.stringify({ model: model, max_tokens: 1024, messages: [{ role: "system", content: INTAKE_SYSTEM_PROMPT }].concat(messages.map(m => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text }))) })
    });
    if (!res2.ok) { var err2 = await res2.json().catch(() => ({})); throw new Error(err2.error?.message || "OpenAI API error: " + res2.status); }
    var data2 = await res2.json();
    return data2.choices[0].message.content;
  }
}

function parseCompletion(text) {
  try {
    var match = text.match(/```json\s*([\s\S]*?)```/);
    if (match) {
      var obj = JSON.parse(match[1]);
      if (obj.complete) {
        var impactMap = { "<$100K": IMPACT_TIERS[0], "$100K-500K": IMPACT_TIERS[1], "$500K-2M": IMPACT_TIERS[2], ">$2M": IMPACT_TIERS[3] };
        return { name: obj.name, problem: obj.problem, dept: obj.dept, tools: obj.tools || [], impact: impactMap[obj.impact] || IMPACT_TIERS[1], beneficiaries: obj.beneficiaries || "", successMetric: obj.successMetric || "", successMeasure: obj.successMeasure || "", strategicCategory: obj.strategicCategory || "" };
      }
    }
  } catch(e) {}
  return null;
}

var DOC_EXTRACT_PROMPT = "You are a document parser for an AI project portfolio management tool. Extract the following fields from the uploaded document text. If a field is not found, make your best guess or leave it as empty string.\n\nAlso classify the strategic category: Defend = internal efficiency/cost savings/competitive parity. Extend = revenue growth/competitive advantage/market expansion. Upend = new markets/new products/game-changing innovation.\n\nRespond ONLY with this JSON, no other text:\n```json\n{\"name\":\"project name\",\"problem\":\"what problem it solves\",\"dept\":\"department name\",\"tools\":[\"tool1\",\"tool2\"],\"impact\":\"<$100K|$100K-500K|$500K-2M|>$2M\",\"beneficiaries\":\"Internal users|External customers|Both\",\"peopleImpacted\":\"\",\"successMetric\":\"\",\"successMeasure\":\"\",\"strategicCategory\":\"Defend|Extend|Upend\"}\n```";

async function extractFromDocument(text, settings) {
  var model = (settings && settings.model) || LLM_MODELS[(settings && settings.provider) || "anthropic"][0].id;
  var provider = (settings && settings.provider) || "anthropic";

  // Try server proxy first
  try {
    var proxyRes = await apiFetch("/api/llm/extract", {
      method: "POST",
      body: JSON.stringify({ text: "Extract project details from this document:\n\n" + text.slice(0, 8000), model: model, provider: provider, systemPrompt: DOC_EXTRACT_PROMPT })
    });
    return parseDocExtraction(proxyRes.text);
  } catch(proxyErr) {
    if (proxyErr.message && (proxyErr.message.includes("401") || proxyErr.message.includes("session"))) throw proxyErr;
    // Fall back to browser key if server has no key configured
    if (!settings || !settings.apiKey) return null;
  }

  // Browser fallback
  if (provider === "anthropic") {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: model, max_tokens: 1024, system: DOC_EXTRACT_PROMPT, messages: [{ role: "user", content: "Extract project details from this document:\n\n" + text.slice(0, 8000) }] })
    });
    if (!res.ok) throw new Error("API error: " + res.status);
    var data = await res.json();
    return parseDocExtraction(data.content[0].text);
  } else {
    var res2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + settings.apiKey },
      body: JSON.stringify({ model: model, max_tokens: 1024, messages: [{ role: "system", content: DOC_EXTRACT_PROMPT }, { role: "user", content: "Extract project details from this document:\n\n" + text.slice(0, 8000) }] })
    });
    if (!res2.ok) throw new Error("API error: " + res2.status);
    var data2 = await res2.json();
    return parseDocExtraction(data2.choices[0].message.content);
  }
}

function parseDocExtraction(text) {
  try {
    var match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (match) {
      var obj = JSON.parse(match[1]);
      var impactMap = { "<$100K": 0, "$100K-500K": 1, "$500K-2M": 2, ">$2M": 3 };
      return { name: obj.name || "", problem: obj.problem || "", dept: obj.dept || "Finance", tools: obj.tools || [], impact: impactMap[obj.impact] != null ? impactMap[obj.impact] : 1, beneficiaries: obj.beneficiaries || "", peopleImpacted: obj.peopleImpacted || "", successMetric: obj.successMetric || "", successMeasure: obj.successMeasure || "", strategicCategory: obj.strategicCategory || "" };
    }
  } catch(e) {}
  return null;
}

// Shared UI
const Badge = ({ text, color, bg, small }) => (
  <span style={{ display: "inline-block", padding: small ? "2px 8px" : "3px 10px", borderRadius: 12, fontSize: small ? 9 : 10, fontWeight: 600, color, background: bg, whiteSpace: "nowrap" }}>{text}</span>
);
const ProgressBar = ({ pct, color, h = 6 }) => (
  <div style={{ width: "100%", height: h, background: W.surfaceAlt, borderRadius: h }}>
    <div style={{ width: Math.min((pct||0)*100,100)+"%", height: "100%", background: color||W.accent, borderRadius: h, transition: "width 0.6s ease" }} />
  </div>
);
const KpiCard = ({ label, value, sub, color, subColor }) => (
  <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: W.textMuted, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: color||W.accent, letterSpacing: "-0.03em" }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: subColor||W.textMuted, marginTop: 4 }}>{sub}</div>}
  </div>
);
const EmptyState = ({ icon, title, sub, action, onAction }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: W.textMuted, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 11, color: W.textLight, marginBottom: 16 }}>{sub}</div>
    {action && <button onClick={onAction} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>{action}</button>}
  </div>
);

// Error boundary to catch crashes in child components
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error("ErrorBoundary caught:", err); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: "16px 20px", background: "#FCEAEA", border: "1px solid #C25E5E30", borderRadius: 10, color: "#C25E5E", fontSize: 12 }}>
        {this.props.fallback || "Something went wrong. Please refresh the page."}
      </div>
    );
    return this.props.children;
  }
}
const ToolChip = ({ name, selected, onClick }) => (
  <span onClick={onClick} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 16, cursor: "pointer", background: selected ? W.accentLight : "transparent", color: selected ? W.accent : W.textMuted, border: "1px solid "+(selected ? W.accent : W.borderLight), fontWeight: selected ? 600 : 400, transition: "all 0.15s", userSelect: "none" }}>{name}</span>
);

// Tool selector with "Other" support
const ToolSelector = ({ tools, onChange }) => {
  const [otherText, setOtherText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const standardTools = ALL_TOOLS.filter(t => t !== "Other");
  const customTools = tools.filter(t => !standardTools.includes(t));

  const toggleTool = (t) => {
    onChange(tools.includes(t) ? tools.filter(x => x !== t) : [...tools, t]);
  };
  const addCustom = () => {
    var raw = otherText.trim();
    if (!raw) return;
    // Split by comma, semicolon, or "and"
    var items = raw.split(/[,;]+|\band\b/i).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    var newTools = [...tools];
    items.forEach(function(item) {
      if (!newTools.includes(item)) newTools.push(item);
    });
    onChange(newTools);
    setOtherText("");
  };
  const removeCustom = (t) => onChange(tools.filter(x => x !== t));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {standardTools.map(t => (
          <ToolChip key={t} name={t} selected={tools.includes(t)} onClick={() => toggleTool(t)} />
        ))}
        {customTools.map(t => (
          <span key={t} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 16, background: W.purpleLight, color: W.purple, border: "1px solid "+W.purple, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {t}
            <span onClick={() => removeCustom(t)} style={{ cursor: "pointer", fontSize: 9, opacity: 0.7 }}>{"\u2715"}</span>
          </span>
        ))}
        <span onClick={() => setShowOtherInput(!showOtherInput)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 16, cursor: "pointer", background: showOtherInput ? W.purpleLight : "transparent", color: showOtherInput ? W.purple : W.textMuted, border: "1px solid "+(showOtherInput ? W.purple : W.borderLight), fontWeight: showOtherInput ? 600 : 400, transition: "all 0.15s", userSelect: "none" }}>+ Other</span>
      </div>
      {showOtherInput && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
          <input value={otherText} onChange={e => setOtherText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} placeholder='e.g. "GitHub, Jira" or "Tableau"' style={{ border: "1px solid "+W.border, borderRadius: 6, padding: "6px 10px", fontSize: 11, fontFamily: font, color: W.text, outline: "none", background: "#fff", flex: 1, minWidth: 160 }} autoFocus />
          <button onClick={addCustom} disabled={!otherText.trim()} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: otherText.trim() ? W.accent : W.surfaceAlt, color: otherText.trim() ? "#fff" : W.textLight, fontSize: 10, fontWeight: 600, cursor: otherText.trim() ? "pointer" : "default", fontFamily: font }}>Add</button>
        </div>
      )}
    </div>
  );
};

// Sidebar
const SidebarNav = ({ active, onNav }) => {
  var items = [{ key: "home", icon: "\u229E", label: "Home" }, { key: "submit", icon: "\u2295", label: "Submit" }, { key: "portfolio", icon: "\u25A4", label: "Portfolio" }, { key: "settings", icon: "\u2699", label: "Settings" }];
  return (
    <div style={{ width: 60, minWidth: 60, height: "100vh", background: W.accentDark, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", position: "sticky", top: 0 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: W.highlight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 20, cursor: "pointer" }} onClick={() => onNav("home")}>Ai</div>
      {items.map((it) => (
        <div key={it.key} onClick={() => onNav(it.key)} title={it.label} style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: active === it.key ? "#fff" : "rgba(255,255,255,0.5)", background: active === it.key ? "rgba(255,255,255,0.15)" : "transparent", transition: "all 0.15s" }}>{it.icon}</div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ width: 32, height: 32, borderRadius: 32, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>JD</div>
    </div>
  );
};
const TopBar = ({ title, subtitle, children }) => (
  <div style={{ height: 56, background: W.surface, borderBottom: "1px solid "+W.borderLight, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: W.text, letterSpacing: "-0.02em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: W.textMuted, marginTop: -1 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
  </div>
);

// Right Panel for submission
const RightPanel = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ background: W.highlightLight, border: "1px solid "+W.highlight+"30", borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: W.highlight, marginBottom: 8 }}>What happens next?</div>
      <div style={{ borderTop: "1px solid "+W.highlight+"20", paddingTop: 8 }}>
        {["You submit \u2192 project enters review queue", "Reviewer scores for fit & feasibility", "If approved, you add team & timeline details", "Project shows up in portfolio dashboard"].map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 10, color: W.text, lineHeight: 1.4 }}>
            <span style={{ color: W.highlight, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Chat Intake - LLM-powered with fallback
const ChatIntake = ({ onSubmit, onNav, llmSettings, user }) => {
  const [messages, setMessages] = useState([{ from: "ai", text: "Hey! Let's get your AI project registered. What are you calling it?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ name: "", problem: "", dept: "", tools: [], impact: null });
  const [selectedTools, setSelectedTools] = useState([]);
  const [completed, setCompleted] = useState(null);
  const [error, setError] = useState("");
  const [lastFailedMessages, setLastFailedMessages] = useState(null);
  const scrollRef = useRef(null);
  const hasKey = llmSettings && llmSettings.apiKey;
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, step, loading]);

  // LLM-powered send
  const sendLLM = async (msgsOverride) => {
    if (!msgsOverride && !input.trim()) return;
    var val = msgsOverride ? null : input.trim();
    var newMsgs = msgsOverride || [...messages, { from: "user", text: val }];
    if (!msgsOverride) {
      setMessages(newMsgs);
      setInput("");
    }
    setLoading(true);
    setError("");
    setLastFailedMessages(null);
    try {
      var reply = await callLLM(newMsgs, llmSettings);
      var parsed = parseCompletion(reply);
      if (parsed) {
        var cleanReply = reply.replace(/```json[\s\S]*?```/, "").trim();
        if (cleanReply) newMsgs = [...newMsgs, { from: "ai", text: cleanReply }];
        setMessages(newMsgs);
        setCompleted(parsed);
      } else {
        setMessages([...newMsgs, { from: "ai", text: reply }]);
      }
    } catch(e) {
      if (e.isOverloaded) {
        setError("overloaded");
        setLastFailedMessages(newMsgs);
        setMessages([...newMsgs, { from: "ai", text: "The AI is busy right now. Hit Retry in a moment — your message is saved." }]);
      } else {
        setError(e.message);
        setLastFailedMessages(newMsgs);
        setMessages([...newMsgs, { from: "ai", text: "Sorry, I hit an error connecting to the AI. You can retry or switch to the Simple Form." }]);
      }
    }
    setLoading(false);
  };

  // Fallback scripted send (no API key)
  const sendScripted = () => {
    if (!input.trim()) return;
    var val = input.trim();
    var newMsgs = [...messages, { from: "user", text: val }];
    setInput("");
    if (step === 0) {
      setFormData(d => ({ ...d, name: val }));
      newMsgs.push({ from: "ai", text: '"' + val + '" \u2014 great name. In a sentence or two, what problem does this solve?' });
      setStep(1);
    } else if (step === 1) {
      setFormData(d => ({ ...d, problem: val }));
      newMsgs.push({ from: "ai", text: "Strong use case. Which team would own this? (e.g. Finance, Sales, HR...)" });
      setStep(2);
    } else if (step === 2) {
      var matched = ALL_DEPTS.find(d => d.toLowerCase() === val.toLowerCase()) || val;
      setFormData(d => ({ ...d, dept: matched }));
      newMsgs.push({ from: "ai", text: "Got it \u2014 " + matched + ". Which tools are you planning to use? Tap all that apply:" });
      setStep(3);
    }
    setMessages(newMsgs);
  };
  const send = hasKey ? () => sendLLM(null) : sendScripted;

  const confirmTools = () => {
    if (selectedTools.length === 0) return;
    setFormData(d => ({ ...d, tools: selectedTools }));
    setMessages(m => [...m, { from: "user", text: selectedTools.join(", ") }, { from: "ai", text: selectedTools.join(" + ") + " \u2014 nice stack. Last question: roughly how big is the expected impact?" }]);
    setStep(4);
  };
  const selectImpact = (tier) => {
    setFormData(d => ({ ...d, impact: tier }));
    setMessages(m => [...m, { from: "user", text: tier.label + " (" + tier.sub + ")" }, { from: "ai", text: "All set! Here's your project summary. Hit Submit when you're ready." }]);
    setStep(5);
  };
  const doSubmit = (data) => {
    var impactMap = { "<$100K": IMPACT_TIERS[0], "$100K-500K": IMPACT_TIERS[1], "$500K-2M": IMPACT_TIERS[2], ">$2M": IMPACT_TIERS[3] };
    var imp = data.impact || impactMap["$100K-500K"];
    onSubmit({ id: Date.now(), name: data.name, problem: data.problem, dept: data.dept, tools: data.tools, status: "Submitted", valNum: imp.valNum, value: imp.valStr, progress: 0, goLive: "\u2014", owner: (user && user.email) || "JD", submittedAt: new Date().toISOString(), beneficiaries: data.beneficiaries || "", successMetric: data.successMetric || "", successMeasure: data.successMeasure || "", strategicCategory: data.strategicCategory || "" });
    onNav("portfolio");
  };

  var showScriptedUI = !hasKey;
  var showInputBar = hasKey ? !completed : step < 3;

  return (
    <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", height: 480 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid "+W.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: W.highlight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>Ai</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: W.text }}>Project Intake Assistant</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {hasKey ? (
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: W.successLight, color: W.success, fontWeight: 600 }}>{llmSettings.provider === "anthropic" ? "Claude" : "GPT"} connected</span>
          ) : (
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: W.highlightLight, color: W.highlight, fontWeight: 600 }}>Guided mode</span>
          )}
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}>
        {!hasKey && <div style={{ padding: "8px 12px", borderRadius: 8, background: W.highlightLight, color: W.highlight, fontSize: 10, marginBottom: 12, lineHeight: 1.5 }}>Running in guided mode (no API key). Go to Settings to connect Claude or GPT for a fully conversational experience.</div>}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "80%", padding: "9px 14px", borderRadius: 12, background: m.from === "user" ? W.accent : W.surfaceAlt, color: m.from === "user" ? "#fff" : W.text, fontSize: 12, lineHeight: 1.55, borderBottomRightRadius: m.from === "user" ? 3 : 12, borderBottomLeftRadius: m.from === "ai" ? 3 : 12 }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div style={{ padding: "9px 14px", borderRadius: 12, background: W.surfaceAlt, color: W.textMuted, fontSize: 12, borderBottomLeftRadius: 3 }}>Thinking...</div>
          </div>
        )}
        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: W.dangerLight, border: "1px solid "+W.danger+"30", color: W.danger, fontSize: 10, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1 }}>
              {error === "overloaded" ? "The AI API is temporarily overloaded." : error}
            </span>
            {lastFailedMessages && (
              <button onClick={() => { setError(""); setMessages(lastFailedMessages.slice(0, -1)); sendLLM(lastFailedMessages); }} disabled={loading} style={{ padding: "3px 12px", borderRadius: 5, border: "none", background: W.danger, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>
                {loading ? "Retrying..." : "↺ Retry"}
              </button>
            )}
          </div>
        )}
        {/* Scripted tool selector (fallback) */}
        {showScriptedUI && step === 3 && (
          <div style={{ marginTop: 6 }}>
            <ToolSelector tools={selectedTools} onChange={setSelectedTools} />
            <div style={{ marginTop: 8 }}>
              <button onClick={confirmTools} disabled={selectedTools.length===0} style={{ padding: "6px 16px", borderRadius: 16, border: "none", background: selectedTools.length>0 ? W.accent : W.surfaceAlt, color: selectedTools.length>0 ? "#fff" : W.textLight, fontSize: 11, fontWeight: 600, cursor: selectedTools.length>0 ? "pointer" : "default", fontFamily: font }}>Confirm tools {"\u2192"}</button>
            </div>
          </div>
        )}
        {showScriptedUI && step === 4 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {IMPACT_TIERS.map((tier, i) => (
              <div key={i} onClick={() => selectImpact(tier)} style={{ padding: "8px 16px", borderRadius: 20, cursor: "pointer", border: "1.5px solid "+W.border, background: "#fff", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{tier.label}</div>
                <div style={{ fontSize: 9, color: W.textMuted }}>{tier.sub}</div>
              </div>
            ))}
          </div>
        )}
        {/* Scripted summary */}
        {showScriptedUI && step === 5 && (
          <div style={{ marginTop: 10, padding: 14, background: W.successLight, borderRadius: 10, border: "1px solid "+W.success+"30" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.success, marginBottom: 8 }}>Project summary</div>
            {[["Name", formData.name], ["Problem", formData.problem], ["Department", formData.dept], ["Tools", formData.tools.join(", ")], ["Impact", formData.impact.label+" ("+formData.impact.valStr+")"]].map(function(kv) { return (
              <div key={kv[0]} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: W.success, fontWeight: 600, width: 70, flexShrink: 0 }}>{kv[0]}</span>
                <span style={{ fontSize: 10, color: W.text }}>{kv[1]}</span>
              </div>
            ); })}
            <button onClick={() => doSubmit(formData)} style={{ marginTop: 10, padding: "8px 24px", borderRadius: 6, border: "none", background: W.success, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, width: "100%" }}>Submit Project \u2192</button>
          </div>
        )}
        {/* LLM-completed summary */}
        {completed && (
          <div style={{ marginTop: 10, padding: 14, background: W.successLight, borderRadius: 10, border: "1px solid "+W.success+"30" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.success, marginBottom: 8 }}>Project extracted from conversation</div>
            {[["Name", completed.name], ["Problem", completed.problem], ["Department", completed.dept], ["Tools", (completed.tools||[]).join(", ")], ["Impact", completed.impact ? completed.impact.label+" ("+completed.impact.valStr+")" : ""]].map(function(kv) { return (
              <div key={kv[0]} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: W.success, fontWeight: 600, width: 70, flexShrink: 0 }}>{kv[0]}</span>
                <span style={{ fontSize: 10, color: W.text }}>{kv[1]}</span>
              </div>
            ); })}
            <button onClick={() => doSubmit(completed)} style={{ marginTop: 10, padding: "8px 24px", borderRadius: 6, border: "none", background: W.success, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, width: "100%" }}>Submit Project \u2192</button>
          </div>
        )}
      </div>
      {showInputBar && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid "+W.borderLight, display: "flex", gap: 8, alignItems: "center" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter" && !loading) send(); }} placeholder={loading ? "Waiting for response..." : "Type your answer..."} disabled={loading} style={{ flex: 1, border: "1px solid "+W.border, borderRadius: 20, padding: "8px 16px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: loading ? W.surfaceAlt : "#fff" }} />
          <div onClick={() => { if (!loading) send(); }} style={{ width: 32, height: 32, borderRadius: 16, background: input.trim() && !loading ? W.accent : W.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 14, color: input.trim() && !loading ? "#fff" : W.textLight, transition: "all 0.15s" }}>{"\u2191"}</div>
        </div>
      )}
    </div>
  );
};

// Form Intake - real inputs
const FormIntake = ({ onSubmit, onNav, user }) => {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [dept, setDept] = useState("");
  const [tools, setTools] = useState([]);
  const [impact, setImpact] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState("");
  const [peopleImpacted, setPeopleImpacted] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [successMeasure, setSuccessMeasure] = useState("");
  const [strategicCategory, setStrategicCategory] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [executiveSponsor, setExecutiveSponsor] = useState("");
  const [submittedByEmail, setSubmittedByEmail] = useState((user && user.email) || "");
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const attachRef = useRef(null);

  const addFile = (file) => {
    var reader = new FileReader();
    reader.onload = (e) => {
      setAttachments(prev => [...prev, { name: file.name, size: file.size, type: file.type, dataUrl: e.target.result, uploadedAt: new Date().toISOString() }]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return setError("Project name is required");
    if (!problem.trim()) return setError("Problem description is required");
    if (!dept) return setError("Please select a department");
    if (tools.length===0) return setError("Select at least one tool");
    if (impact===null) return setError("Select an expected impact tier");
    if (!businessUnit) return setError("Please select a business unit");
    if (!executiveSponsor.trim()) return setError("Executive sponsor is required");
    setError("");
    var tier = IMPACT_TIERS[impact];
    onSubmit({ id: Date.now(), name: name.trim(), problem: problem.trim(), dept: dept, tools: tools, status: "Submitted", valNum: tier.valNum, value: tier.valStr, progress: 0, goLive: "\u2014", owner: "JD", submittedAt: new Date().toISOString(), files: attachments, beneficiaries: beneficiaries, peopleImpacted: peopleImpacted, successMetric: successMetric.trim(), successMeasure: successMeasure.trim(), businessUnit: businessUnit, executiveSponsor: executiveSponsor.trim(), submittedByEmail: submittedByEmail.trim(), strategicCategory: strategicCategory });
    onNav("portfolio");
  };
  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };
  return (
    <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid "+W.borderLight, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>New AI Project</span>
        <span style={{ fontSize: 10, color: W.textMuted }}>5 fields</span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.dangerLight, color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Project name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. InvoiceAI Automation" style={is} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>What problem does this solve? *</label>
          <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the pain point and how AI helps..." rows={3} style={{ ...is, resize: "vertical", lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Department *</label>
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ ...is, cursor: "pointer" }}>
            <option value="">Select department...</option>
            {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Tools / platforms * <span style={{ fontWeight: 400, color: W.textLight }}>(select all that apply)</span></label>
          <ToolSelector tools={tools} onChange={setTools} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Expected impact *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {IMPACT_TIERS.map((v, i) => (
              <div key={i} onClick={() => setImpact(i)} style={{ flex: 1, padding: "8px 6px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: impact===i ? W.successLight : "#fff", border: "1.5px solid "+(impact===i ? W.success : W.borderLight), transition: "all 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: impact===i ? W.success : W.text }}>{v.label}</div>
                <div style={{ fontSize: 9, color: impact===i ? W.success : W.textMuted, marginTop: 2 }}>{v.sub}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Success & Impact section */}
        <div style={{ marginBottom: 14, padding: "12px 14px", background: W.accentLight+"60", borderRadius: 8, border: "1px solid "+W.borderLight }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: W.accent, marginBottom: 10 }}>Success & Impact</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Strategic category</label>
            <div style={{ display: "flex", gap: 6 }}>
              {STRATEGIC_CATEGORIES.map(cat => (
                <div key={cat.key} onClick={() => setStrategicCategory(cat.key)} style={{ flex: 1, padding: "7px 6px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: strategicCategory===cat.key ? cat.light : "#fff", border: "1.5px solid "+(strategicCategory===cat.key ? cat.color : W.borderLight), transition: "all 0.15s" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: strategicCategory===cat.key ? cat.color : W.text }}>{cat.key}</div>
                  <div style={{ fontSize: 8, color: strategicCategory===cat.key ? cat.color : W.textMuted, marginTop: 2, lineHeight: 1.3 }}>{cat.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Who benefits?</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["Internal users","External customers","Both"].map(opt => (
                <div key={opt} onClick={() => setBeneficiaries(opt)} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, textAlign: "center", cursor: "pointer", fontSize: 10, fontWeight: beneficiaries===opt ? 700 : 400, background: beneficiaries===opt ? W.accentLight : "#fff", border: "1.5px solid "+(beneficiaries===opt ? W.accent : W.borderLight), color: beneficiaries===opt ? W.accent : W.text, transition: "all 0.15s" }}>{opt}</div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>People today</label>
              <input value={peopleImpacted} onChange={e => setPeopleImpacted(e.target.value)} placeholder="e.g. 25" style={is} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>What metric will this change?</label>
            <input value={successMetric} onChange={e => setSuccessMetric(e.target.value)} placeholder="e.g. Order conversion rate and design cycle time" style={is} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>How will you measure success?</label>
            <input value={successMeasure} onChange={e => setSuccessMeasure(e.target.value)} placeholder="e.g. Generate high-quality design renderings in minutes vs days" style={is} />
          </div>
        </div>
        {/* Business Unit */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Business Unit *</label>
          <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} style={{ ...is, cursor: "pointer" }}>
            <option value="">Select business unit...</option>
            {["Standex Electronics","Standex Engraving","Standex Engineering Technologies","Standex Scientific","Standex Specialty Solutions"].map(bu => <option key={bu} value={bu}>{bu}</option>)}
          </select>
        </div>
        {/* Executive Sponsor + Submitted by */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Executive Sponsor *</label>
            <input value={executiveSponsor} onChange={e => setExecutiveSponsor(e.target.value)} placeholder="e.g. Jane Smith, VP Finance" style={is} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Submitted by</label>
            <input value={submittedByEmail} onChange={e => setSubmittedByEmail(e.target.value)} placeholder="your.email@company.com" style={is} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Attachments <span style={{ fontWeight: 400, color: W.textLight }}>(optional)</span></label>
          <input ref={attachRef} type="file" multiple style={{ display: "none" }} onChange={e => { Array.from(e.target.files).forEach(addFile); e.target.value = ""; }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {attachments.map((f, i) => (
              <span key={i} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: W.purpleLight, color: W.purple, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {"\uD83D\uDCC4"} {f.name} <span style={{ fontSize: 8, color: W.textMuted }}>({Math.round(f.size/1024)}KB)</span>
                <span onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} style={{ cursor: "pointer", fontSize: 9, opacity: 0.6 }}>{"\u2715"}</span>
              </span>
            ))}
            <button onClick={() => attachRef.current && attachRef.current.click()} style={{ padding: "4px 12px", borderRadius: 6, border: "1px dashed "+W.purple+"60", background: "transparent", fontSize: 10, color: W.purple, cursor: "pointer", fontFamily: font }}>+ Attach file</button>
          </div>
        </div>
        <div style={{ borderTop: "1px solid "+W.borderLight, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: W.textLight }}>Sponsor, cost center & BU added after review</span>
          <button onClick={handleSubmit} style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Submit \u2192</button>
        </div>
      </div>
    </div>
  );
};

// Upload Intake - with real LLM document parsing
const UploadIntake = ({ onSubmit, onNav, llmSettings, user }) => {
  const [phase, setPhase] = useState("idle");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState(null);
  const [extractError, setExtractError] = useState("");
  const [ext, setExt] = useState({ name: "", problem: "", dept: "Finance", tools: ["Claude"], impact: 2 });
  const [businessUnit, setBusinessUnit] = useState("");
  const [executiveSponsor, setExecutiveSponsor] = useState("");
  const [submittedByEmail, setSubmittedByEmail] = useState((user && user.email) || "");
  const [beneficiaries, setBeneficiaries] = useState("");
  const [peopleImpacted, setPeopleImpacted] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [successMeasure, setSuccessMeasure] = useState("");
  const [strategicCategory, setStrategicCategory] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const fileRef = useRef(null);
  const errorRef = useRef(null);

  const readFileAsDataUrl = (file) => new Promise((resolve) => {
    var reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

  const readFileText = (file) => {
    return new Promise(async (resolve) => {
      var ext = file.name.split(".").pop().toLowerCase();

      // Plain text files
      if (["txt","md","csv"].includes(ext)) {
        var reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve("");
        reader.readAsText(file);
        return;
      }

      // DOCX files — use mammoth.js
      if (["docx"].includes(ext)) {
        try {
          var arrayBuf = await file.arrayBuffer();
          // Load mammoth dynamically if not already loaded
          if (!window.mammoth) {
            await new Promise((res, rej) => {
              var s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          var result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuf });
          resolve(result.value.slice(0, 12000));
          return;
        } catch(e) {
          console.error("mammoth parse error:", e);
        }
      }

      // PDF files — use pdf.js
      if (["pdf"].includes(ext)) {
        try {
          var arrayBuf2 = await file.arrayBuffer();
          if (!window.pdfjsLib) {
            await new Promise((res, rej) => {
              var s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          var pdf = await window.pdfjsLib.getDocument({ data: arrayBuf2 }).promise;
          var allText = [];
          for (var i = 1; i <= Math.min(pdf.numPages, 20); i++) {
            var page = await pdf.getPage(i);
            var content = await page.getTextContent();
            allText.push(content.items.map(function(item) { return item.str; }).join(" "));
          }
          resolve(allText.join("\n").slice(0, 12000));
          return;
        } catch(e) {
          console.error("pdf.js parse error:", e);
        }
      }

      // Fallback for other binary formats
      resolve("");
    });
  };

  const handleFile = async (file) => {
    setFileName(file.name);
    setPhase("extracting");
    setExtractError("");

    var dataUrl = await readFileAsDataUrl(file);
    setFileData({ name: file.name, size: file.size, type: file.type, dataUrl: dataUrl });

    // Server proxy handles LLM — always attempt extraction regardless of browser key
    var hasLLM = true;
    var browserKeyAvailable = llmSettings && llmSettings.apiKey;
    var fileText = await readFileText(file);

    // Try LLM extraction first
    if (hasLLM && fileText.length > 50) {
      try {
        var extracted = await extractFromDocument(fileText, llmSettings);
        if (extracted) {
          setExt(extracted);
          setPhase("editing");
          return;
        }
      } catch(e) {
        setExtractError("LLM extraction failed: " + e.message + ". Using smart text parsing instead.");
      }
    }

    // Smart fallback: parse document text heuristically
    var baseName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    if (fileText.length > 50) {
      // Extract meaningful content
      var lines = fileText.split("\n").map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 10; });
      var title = lines[0] || baseName;
      // Find lines that look like a description (longer sentences)
      var descLines = lines.filter(function(l) { return l.length > 40 && l.length < 500; }).slice(0, 5);
      var description = descLines.join(" ").slice(0, 500) || lines.slice(1, 4).join(" ").slice(0, 500);
      // Try to detect department
      var deptMatch = ALL_DEPTS.find(function(d) { return fileText.toLowerCase().indexOf(d.toLowerCase()) !== -1; });
      // Try to detect tools
      var detectedTools = ALL_TOOLS.filter(function(t) { return t !== "Other" && fileText.toLowerCase().indexOf(t.toLowerCase()) !== -1; });
      // Try to detect impact from dollar amounts
      var dollarMatch = fileText.match(/\$[\d,.]+\s*[MmKkBb]/);
      var impactIdx = 1;
      if (dollarMatch) {
        var amt = dollarMatch[0].toLowerCase();
        if (amt.indexOf("b") !== -1 || amt.indexOf("m") !== -1) impactIdx = 3;
        else if (amt.indexOf("k") !== -1) impactIdx = 0;
      }

      setExt({
        name: title.slice(0, 100),
        problem: description || "Extracted from document — review and edit as needed.",
        dept: deptMatch || "Manufacturing",
        tools: detectedTools.length > 0 ? detectedTools : [],
        impact: impactIdx,
      });
      if (!browserKeyAvailable) setExtractError("Using server AI key for extraction. For best results ensure ANTHROPIC_API_KEY is set on the server.");
    } else {
      setExt({
        name: baseName,
        problem: fileText.length > 0 ? fileText.slice(0, 300) : "Could not extract text from this file. Please enter details manually.",
        dept: "Finance",
        tools: [],
        impact: 1,
      });
      if (fileText.length === 0) setExtractError("Could not extract text from this file format. Please fill in the details manually.");
      else if (!browserKeyAvailable) setExtractError("Using server AI key for extraction.");
    }
    setPhase("editing");
  };

  const handleSubmit = () => {
    // Validate required fields and collect errors
    var errors = {};
    if (!ext.name.trim()) errors.name = "Project name is required";
    if (!ext.problem.trim()) errors.problem = "Problem description is required";
    if (!ext.dept) errors.dept = "Please select a department";
    if (!ext.tools || ext.tools.length === 0) errors.tools = "Select at least one tool";
    if (ext.impact === null || ext.impact === undefined) errors.impact = "Select an expected impact tier";
    if (!businessUnit) errors.businessUnit = "Business unit is required";
    if (!executiveSponsor.trim()) errors.executiveSponsor = "Executive sponsor is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      var firstMsg = errors[Object.keys(errors)[0]];
      setSubmitError("Please fill in all required fields before submitting. " + Object.keys(errors).length + " field(s) need attention.");
      // Scroll error into view
      setTimeout(() => { if (errorRef.current) errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
      return;
    }

    setFieldErrors({});
    setSubmitError("");
    var tier = IMPACT_TIERS[ext.impact];
    var files = [];
    if (fileData) files.push({ name: fileData.name, size: fileData.size, type: fileData.type, dataUrl: fileData.dataUrl, uploadedAt: new Date().toISOString() });
    onSubmit({ id: Date.now(), name: ext.name, problem: ext.problem, dept: ext.dept, tools: ext.tools, status: "Submitted", valNum: tier.valNum, value: tier.valStr, progress: 0, goLive: "\u2014", owner: "JD", submittedAt: new Date().toISOString(), files: files, businessUnit: businessUnit, executiveSponsor: executiveSponsor.trim(), submittedByEmail: submittedByEmail.trim(), beneficiaries: beneficiaries, peopleImpacted: peopleImpacted, successMetric: successMetric.trim(), successMeasure: successMeasure.trim(), strategicCategory: ext.strategicCategory || strategicCategory });
    onNav("portfolio");
  };
  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };
  return (
    <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid "+W.borderLight, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Upload & Auto-Extract</span>
        <span style={{ fontSize: 10, color: W.textMuted }}>PDF, DOCX, TXT, PPTX</span>
      </div>
      {phase === "idle" && (
        <div style={{ padding: 20 }}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.doc,.txt,.md" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
          <div onClick={() => fileRef.current && fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }} style={{ border: "2px dashed "+W.purple+"40", borderRadius: 10, background: W.purpleLight+"60", padding: "40px 20px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83D\uDCC4"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: W.purple, marginBottom: 4 }}>Drop your document here or click to browse</div>
            <div style={{ fontSize: 11, color: W.textMuted, lineHeight: 1.5 }}>Business case, project proposal, one-pager, executive summary</div>
            <div style={{ fontSize: 10, color: W.textLight, marginTop: 8 }}>AI will extract project details automatically</div>
          </div>
        </div>
      )}
      {phase === "extracting" && (
        <div style={{ padding: 30, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: W.purpleLight, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>{"\uD83D\uDCC4"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: W.text, marginBottom: 4 }}>{fileName}</div>
          <div style={{ fontSize: 11, color: W.textMuted }}>{llmSettings && llmSettings.apiKey ? "AI is reading and extracting project details..." : "Processing document..."}</div>
        </div>
      )}
      {phase === "editing" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 20, background: W.success, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>{"\u2713"}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: W.success }}>Extracted from {fileName}</span>
          </div>
          {extractError && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.highlightLight, color: W.highlight, fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>{extractError}</div>}

          {/* Validation error banner */}
          {submitError && (
            <div ref={errorRef} style={{ padding: "10px 14px", borderRadius: 6, background: W.dangerLight, border: "1px solid "+W.danger+"40", color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
              <span>{submitError}</span>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.name ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Project name *</label>
            <input value={ext.name} onChange={e => { setExt(d => ({ ...d, name: e.target.value })); setFieldErrors(fe => ({ ...fe, name: "" })); }} style={{ ...is, border: "1px solid "+(fieldErrors.name ? W.danger : W.border) }} />
            {fieldErrors.name && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.name}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.problem ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Problem *</label>
            <textarea value={ext.problem} onChange={e => { setExt(d => ({ ...d, problem: e.target.value })); setFieldErrors(fe => ({ ...fe, problem: "" })); }} rows={3} style={{ ...is, resize: "vertical", lineHeight: 1.5, border: "1px solid "+(fieldErrors.problem ? W.danger : W.border) }} />
            {fieldErrors.problem && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.problem}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.dept ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Department *</label>
            <select value={ext.dept} onChange={e => { setExt(d => ({ ...d, dept: e.target.value })); setFieldErrors(fe => ({ ...fe, dept: "" })); }} style={{ ...is, cursor: "pointer", border: "1px solid "+(fieldErrors.dept ? W.danger : W.border) }}>
              <option value="">Select department...</option>
              {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {fieldErrors.dept && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.dept}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.tools ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Tools *</label>
            <ToolSelector tools={ext.tools} onChange={(t) => { setExt(d => ({ ...d, tools: t })); setFieldErrors(fe => ({ ...fe, tools: "" })); }} />
            {fieldErrors.tools && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.tools}</div>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.impact ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Impact *</label>
            <div style={{ display: "flex", gap: 6 }}>
              {IMPACT_TIERS.map((v, i) => (
                <div key={i} onClick={() => { setExt(d => ({ ...d, impact: i })); setFieldErrors(fe => ({ ...fe, impact: "" })); }} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: ext.impact===i ? W.successLight : "#fff", border: "1.5px solid "+(ext.impact===i ? W.success : fieldErrors.impact ? W.danger : W.borderLight) }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ext.impact===i ? W.success : W.text }}>{v.label}</div>
                  <div style={{ fontSize: 8, color: ext.impact===i ? W.success : W.textMuted }}>{v.sub}</div>
                </div>
              ))}
            </div>
            {fieldErrors.impact && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.impact}</div>}
          </div>

          {/* Business Unit */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.businessUnit ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Business Unit *</label>
            <select value={businessUnit} onChange={e => { setBusinessUnit(e.target.value); setFieldErrors(fe => ({ ...fe, businessUnit: "" })); }} style={{ ...is, cursor: "pointer", border: "1px solid "+(fieldErrors.businessUnit ? W.danger : W.border) }}>
              <option value="">Select business unit...</option>
              {["Standex Electronics","Standex Engraving","Standex Engineering Technologies","Standex Scientific","Standex Specialty Solutions"].map(bu => <option key={bu} value={bu}>{bu}</option>)}
            </select>
            {fieldErrors.businessUnit && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.businessUnit}</div>}
          </div>

          {/* Success & Impact */}
          <div style={{ marginBottom: 10, padding: "10px 12px", background: W.accentLight+"60", borderRadius: 8, border: "1px solid "+W.borderLight }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: W.accent, marginBottom: 8 }}>Success & Impact</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Strategic category</label>
              <div style={{ display: "flex", gap: 5 }}>
                {STRATEGIC_CATEGORIES.map(cat => (
                  <div key={cat.key} onClick={() => setStrategicCategory(cat.key)} style={{ flex: 1, padding: "5px 4px", borderRadius: 5, textAlign: "center", cursor: "pointer", background: (ext.strategicCategory||strategicCategory)===cat.key ? cat.light : "#fff", border: "1.5px solid "+((ext.strategicCategory||strategicCategory)===cat.key ? cat.color : W.borderLight) }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: (ext.strategicCategory||strategicCategory)===cat.key ? cat.color : W.text }}>{cat.key}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Who benefits?</label>
              <div style={{ display: "flex", gap: 5 }}>
                {["Internal users","External customers","Both"].map(opt => (
                  <div key={opt} onClick={() => setBeneficiaries(opt)} style={{ flex: 1, padding: "5px 4px", borderRadius: 5, textAlign: "center", cursor: "pointer", fontSize: 9, fontWeight: beneficiaries===opt ? 700 : 400, background: beneficiaries===opt ? W.accentLight : "#fff", border: "1.5px solid "+(beneficiaries===opt ? W.accent : W.borderLight), color: beneficiaries===opt ? W.accent : W.text }}>{opt}</div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>People today</label>
              <input value={peopleImpacted} onChange={e => setPeopleImpacted(e.target.value)} placeholder="e.g. 25" style={is} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>What metric will this change?</label>
              <input value={successMetric} onChange={e => setSuccessMetric(e.target.value)} placeholder="e.g. Order conversion rate and design cycle time" style={is} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>How will you measure success?</label>
              <input value={successMeasure} onChange={e => setSuccessMeasure(e.target.value)} placeholder="e.g. Generate high-quality renderings in minutes vs days" style={is} />
            </div>
          </div>

          {/* Executive Sponsor */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: fieldErrors.executiveSponsor ? W.danger : W.textMuted, display: "block", marginBottom: 3 }}>Executive Sponsor *</label>
            <input value={executiveSponsor} onChange={e => { setExecutiveSponsor(e.target.value); setFieldErrors(fe => ({ ...fe, executiveSponsor: "" })); }} placeholder="e.g. Jane Smith, VP Finance" style={{ ...is, border: "1px solid "+(fieldErrors.executiveSponsor ? W.danger : W.border) }} />
            {fieldErrors.executiveSponsor && <div style={{ fontSize: 9, color: W.danger, marginTop: 3 }}>{fieldErrors.executiveSponsor}</div>}
          </div>

          {/* Submitted by */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Submitted by</label>
            <input value={submittedByEmail} onChange={e => setSubmittedByEmail(e.target.value)} placeholder="your.email@company.com" style={is} />
          </div>

          <div style={{ borderTop: "1px solid "+W.borderLight, paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setPhase("idle"); setFileName(""); setExtractError(""); setSubmitError(""); setFieldErrors({}); }} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid "+W.border, background: "transparent", fontSize: 11, color: W.text, cursor: "pointer", fontFamily: font }}>Re-upload</button>
            <button onClick={handleSubmit} style={{ padding: "7px 22px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Submit \u2192</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Project Submission Screen
const ProjectSubmission = ({ onNav, onSubmit, llmSettings, user }) => {
  const [mode, setMode] = useState(null);
  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="Submit New AI Project" subtitle="Choose how you'd like to get started">
        {mode && <button onClick={() => setMode(null)} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, color: W.text, cursor: "pointer", fontFamily: font, background: "transparent" }}>{"\u2190"} Change mode</button>}
      </TopBar>
      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {[
            { key: "chat", icon: "\uD83D\uDCAC", title: "Quick Chat", sub: "AI-guided conversation", desc: "Answer a few questions naturally. We'll fill in the details.", color: W.accent, light: W.accentLight },
            { key: "form", icon: "\uD83D\uDCDD", title: "Simple Form", sub: "5 fields, under 2 min", desc: "Know what you need? Fill it in directly \u2014 no fuss.", color: W.accent, light: W.accentLight },
            { key: "upload", icon: "\uD83D\uDCC4", title: "Upload a Doc", sub: "We'll extract everything", desc: "Have a business case, proposal, or one-pager? Drop it here.", color: W.purple, light: W.purpleLight },
          ].map(m => (
            <div key={m.key} onClick={() => setMode(m.key)} style={{ flex: 1, padding: "16px 18px", borderRadius: 10, background: mode===m.key ? m.light : W.surface, border: "1.5px solid "+(mode===m.key ? m.color : W.borderLight), cursor: "pointer", transition: "all 0.2s", opacity: mode && mode!==m.key ? 0.45 : 1, transform: mode && mode!==m.key ? "scale(0.97)" : "scale(1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: mode===m.key ? m.color : m.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: mode===m.key ? "#fff" : m.color }}>{m.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{m.title}</div>
                  <div style={{ fontSize: 10, color: W.textMuted }}>{m.sub}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: W.textMuted, lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
        {mode ? (
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2 }}>
              {mode==="chat" && <ChatIntake onSubmit={onSubmit} onNav={onNav} llmSettings={llmSettings} user={user} />}
              {mode==="form" && <FormIntake onSubmit={onSubmit} onNav={onNav} user={user} />}
              {mode==="upload" && <UploadIntake onSubmit={onSubmit} onNav={onNav} llmSettings={llmSettings} user={user} />}
            </div>
            <div style={{ flex: 1 }}><RightPanel /></div>
          </div>
        ) : (
          <EmptyState icon={"\uD83D\uDC46"} title="Pick an intake method above" sub="All three paths collect the same 5 essentials \u2014 just different vibes" />
        )}
      </div>
    </div>
  );
};

// File uploader for attaching to existing projects
const FileUploader = ({ projectId, onAddFile }) => {
  const ref = useRef(null);
  const handleFile = (file) => {
    var reader = new FileReader();
    reader.onload = (e) => {
      onAddFile({ name: file.name, size: file.size, type: file.type, dataUrl: e.target.result, uploadedAt: new Date().toISOString() });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ marginTop: 6 }}>
      <input ref={ref} type="file" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} />
      <button onClick={(e) => { e.stopPropagation(); ref.current && ref.current.click(); }} style={{ padding: "4px 10px", borderRadius: 5, border: "1px dashed "+W.purple+"60", background: "transparent", fontSize: 10, color: W.purple, cursor: "pointer", fontFamily: font, width: "100%" }}>+ Attach file to project</button>
    </div>
  );
};

// Portfolio Overview
const PortfolioOverview = ({ projects, onNav, onUpdateProject, onDeleteProject, onViewProject }) => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [buFilter, setBuFilter] = useState("All");
  const [stratFilter, setStratFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [hoverRow, setHoverRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  var depts = [...new Set(projects.map(p => p.dept))];
  var businessUnits = [...new Set(projects.map(p => p.businessUnit).filter(Boolean))];
  var filtered = projects
    .filter(p => statusFilter==="All" || p.status===statusFilter)
    .filter(p => deptFilter==="All" || p.dept===deptFilter)
    .filter(p => buFilter==="All" || p.businessUnit===buFilter)
    .filter(p => stratFilter==="All" || p.strategicCategory===stratFilter)
    .sort((a,b) => { if (sortBy==="value") return b.valNum-a.valNum; if (sortBy==="name") return a.name.localeCompare(b.name); return (b.submittedAt||"").localeCompare(a.submittedAt||""); });
  var totalVal = projects.reduce((s,p) => s+p.valNum, 0);
  var atRisk = projects.filter(p => p.status==="At Risk").length;
  var pipeline = ALL_STATUSES.map(s => ({ stage: s, count: projects.filter(p => p.status===s).length, color: STATUS_META[s].color }));
  var toolCounts = {};
  projects.forEach(p => (p.tools||[]).forEach(t => { toolCounts[t]=(toolCounts[t]||0)+1; }));
  var topTools = Object.entries(toolCounts).sort((a,b) => b[1]-a[1]).slice(0,5);

  const exportCSV = () => {
    var headers = ["Project Name","Department","Status","Business Unit","Strategy","Tools","Exec Sponsor","Submitted By","Value","Who Benefits","People Today","Metric","Measure","Submitted Date","Go-Live Date"];
    var rows = filtered.map(p => [
      p.name || "",
      p.dept || "",
      p.status || "",
      p.businessUnit || "",
      p.strategicCategory || "",
      (p.tools || []).join("; "),
      p.executiveSponsor || "",
      p.submittedByEmail || "",
      p.value || formatVal(p.valNum || 0),
      p.beneficiaries || "",
      p.peopleImpacted || "",
      p.successMetric || "",
      p.successMeasure || "",
      p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "",
      p.goLiveDate || "",
    ]);
    var csv = [headers, ...rows].map(row =>
      row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(",")
    ).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ai-portfolio-" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (projects.length===0) return (
    <div style={{ flex: 1, background: W.bg, minHeight: "100vh" }}>
      <TopBar title="Portfolio Overview" subtitle="All your AI initiatives in one place">
        <button onClick={() => onNav("submit")} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>+ New Project</button>
      </TopBar>
      <EmptyState icon={"\uD83D\uDCCB"} title="No projects yet" sub="Submit your first AI project to see it here" action="Submit a Project" onAction={() => onNav("submit")} />
    </div>
  );

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="Portfolio Overview" subtitle={projects.length+" project"+(projects.length!==1?"s":"")+" \u00B7 "+formatVal(totalVal)+" total value"}>
        <button onClick={() => onNav("submit")} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>+ New Project</button>
      </TopBar>
      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Total Portfolio Value" value={formatVal(totalVal)} color={W.accent} />
          <KpiCard label="Active Projects" value={projects.length} color={W.highlight} />
          <KpiCard label="Submitted" value={projects.filter(p => p.status==="Submitted").length} color={W.purple} />
          {atRisk > 0 && <KpiCard label="At Risk" value={atRisk} sub="Need attention" color={W.danger} subColor={W.danger} />}
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 2, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 14 }}>Pipeline funnel</div>
            {pipeline.filter(s => s.count>0).map(s => (
              <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 90, fontSize: 11, color: W.textMuted, flexShrink: 0, textAlign: "right" }}>{s.stage}</div>
                <div style={{ flex: 1, height: 18, background: s.color+"18", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: Math.max((s.count/projects.length)*100,8)+"%", height: "100%", background: s.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: s.color }}>{s.count}</div>
              </div>
            ))}
          </div>
          {topTools.length > 0 && (
            <div style={{ flex: 1, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 12 }}>Top tools</div>
              {topTools.map(function(kv) { return (
                <div key={kv[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: W.text }}>{kv[0]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: W.accent }}>{kv[1]}</span>
                </div>
              ); })}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 16px", background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: W.textMuted }}>Filter</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, fontFamily: font, color: W.text, background: "#fff" }}>
            <option value="All">All statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, fontFamily: font, color: W.text, background: "#fff" }}>
            <option value="All">All departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={buFilter} onChange={e => setBuFilter(e.target.value)} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, fontFamily: font, color: W.text, background: "#fff" }}>
            <option value="All">All business units</option>
            {businessUnits.map(bu => <option key={bu} value={bu}>{bu}</option>)}
          </select>
          <select value={stratFilter} onChange={e => setStratFilter(e.target.value)} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, fontFamily: font, color: W.text, background: "#fff" }}>
            <option value="All">All strategies</option>
            {STRATEGIC_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          {[{k:"newest",l:"Newest"},{k:"value",l:"Value"},{k:"name",l:"Name"}].map(s => (
            <button key={s.k} onClick={() => setSortBy(s.k)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid "+(sortBy===s.k ? W.accent : W.borderLight), background: sortBy===s.k ? W.accentLight : "transparent", color: sortBy===s.k ? W.accent : W.textMuted, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: font }}>{s.l}</button>
          ))}
          <span style={{ fontSize: 10, color: W.textMuted }}>{filtered.length} results</span>
          <button onClick={exportCSV} title="Export filtered results to CSV" style={{ padding: "4px 12px", borderRadius: 5, border: "1px solid "+W.border, background: "#fff", fontSize: 10, fontWeight: 600, color: W.text, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
            {"\u2193"} Export
          </button>
        </div>
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.9fr 0.8fr 0.7fr 1fr 1fr 0.65fr 0.35fr", padding: "10px 20px", background: W.accentDark, gap: 8 }}>
            {["Project","Department","Status","Tools","Strategy","Exec Sponsor","Submitted By","Value",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{h}</div>)}
          </div>
          {filtered.map((p, i) => (
            <div key={p.id}>
              <div onMouseEnter={() => setHoverRow(p.id)} onMouseLeave={() => setHoverRow(null)} onClick={() => setExpandedId(expandedId===p.id ? null : p.id)} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.9fr 0.8fr 0.7fr 1fr 1fr 0.65fr 0.35fr", padding: "12px 20px", gap: 8, alignItems: "center", background: hoverRow===p.id ? W.accentLight+"40" : i%2===0 ? W.surfaceAlt+"50" : "transparent", borderBottom: expandedId===p.id ? "none" : (i<filtered.length-1 ? "1px solid "+W.borderLight : "none"), cursor: "pointer" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span onClick={(e) => { e.stopPropagation(); onViewProject(p.id); }} style={{ fontSize: 12, fontWeight: 600, color: W.accent, cursor: "pointer" }}>{p.name}</span>
                    {(p.files||[]).length > 0 && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: W.purpleLight, color: W.purple, fontWeight: 600 }}>{"\uD83D\uDCC4"} {p.files.length}</span>}
                  </div>
                  <div style={{ fontSize: 9, color: W.textMuted, marginTop: 1 }}>{(p.problem||"").slice(0,60)}{(p.problem||"").length>60 ? "..." : ""}</div>
                </div>
                <div style={{ fontSize: 11, color: W.textMuted }}>{p.dept}</div>
                <div>
                  {editingId===p.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.border, fontSize: 10, fontFamily: font }}>{ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      <button onClick={() => { onUpdateProject({ ...p, status: editStatus }); setEditingId(null); }} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: W.success, color: "#fff", fontSize: 9, cursor: "pointer", fontFamily: font }}>Save</button>
                    </div>
                  ) : (
                    <Badge text={p.status} color={getStatusColor(p.status)} bg={getStatusColor(p.status)+"18"} small />
                  )}
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {(p.tools||[]).slice(0,2).map(t => <span key={t} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: W.accentLight, color: W.accent, fontWeight: 500 }}>{t}</span>)}
                  {(p.tools||[]).length>2 && <span style={{ fontSize: 8, color: W.textMuted }}>+{p.tools.length-2}</span>}
                </div>
                <div>
                  {(() => { var cat = STRATEGIC_CATEGORIES.find(c => c.key === p.strategicCategory); return cat ? <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: cat.light, color: cat.color, fontWeight: 700 }}>{cat.key}</span> : <span style={{ color: W.textLight, fontSize: 9 }}>—</span>; })()}
                </div>
                <div style={{ fontSize: 11, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.executiveSponsor||"—"}>{p.executiveSponsor || <span style={{ color: W.textLight }}>—</span>}</div>
                <div style={{ fontSize: 11, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.submittedByEmail||p.owner||"—"}>{p.submittedByEmail || p.owner || <span style={{ color: W.textLight }}>—</span>}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{p.value || formatVal(p.valNum)}</div>
                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingId(p.id); setEditStatus(p.status); }} title="Edit status" style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.borderLight, background: "transparent", fontSize: 10, cursor: "pointer", color: W.textMuted }}>{"\u270E"}</button>
                  <button onClick={() => { if (confirm('Delete "'+p.name+'"?')) onDeleteProject(p.id); }} title="Delete" style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.borderLight, background: "transparent", fontSize: 10, cursor: "pointer", color: W.danger }}>{"\u2715"}</button>
                </div>
              </div>
              {/* Expanded detail panel */}
              {expandedId===p.id && (
                <div style={{ padding: "0 20px 16px 20px", background: W.accentLight+"20", borderBottom: i<filtered.length-1 ? "1px solid "+W.borderLight : "none" }}>
                  <div style={{ display: "flex", gap: 20 }}>
                    {/* Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, marginBottom: 4 }}>Problem / Description</div>
                      <div style={{ fontSize: 12, color: W.text, lineHeight: 1.6, marginBottom: 12 }}>{p.problem || "No description provided."}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 10, color: W.textMuted }}>
                        <span>Submitted: {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "\u2014"}</span>
                        <span>Owner: {p.owner || "\u2014"}</span>
                        <span>Go-live: {p.goLive || "\u2014"}</span>
                      </div>
                      {(p.businessUnit || p.executiveSponsor || p.submittedByEmail) && (
                        <div style={{ display: "flex", gap: 16, fontSize: 10, color: W.textMuted, marginTop: 6 }}>
                          {p.businessUnit && <span><span style={{ fontWeight: 600 }}>Business Unit:</span> {p.businessUnit}</span>}
                          {p.executiveSponsor && <span><span style={{ fontWeight: 600 }}>Exec Sponsor:</span> {p.executiveSponsor}</span>}
                          {p.submittedByEmail && <span><span style={{ fontWeight: 600 }}>Submitted by:</span> {p.submittedByEmail}</span>}
                        </div>
                      )}
                      {(p.beneficiaries || p.peopleImpacted || p.successMetric || p.successMeasure) && (
                        <div style={{ marginTop: 10, padding: "10px 12px", background: W.accentLight+"40", borderRadius: 8, border: "1px solid "+W.borderLight }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: W.accent, marginBottom: 6 }}>Success & Impact</div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 10, color: W.textMuted }}>
                            {p.beneficiaries && <span><span style={{ fontWeight: 600 }}>Who benefits:</span> {p.beneficiaries}</span>}
                            {p.peopleImpacted && <span><span style={{ fontWeight: 600 }}>People today:</span> {p.peopleImpacted}</span>}
                            {p.successMetric && <span><span style={{ fontWeight: 600 }}>Metric:</span> {p.successMetric}</span>}
                            {p.successMeasure && <span><span style={{ fontWeight: 600 }}>Measure:</span> {p.successMeasure}</span>}
                          </div>
                        </div>
                      )}
                      {(p.tools||[]).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 10, color: W.textMuted, marginRight: 6 }}>Tools:</span>
                          {p.tools.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: W.accentLight, color: W.accent, fontWeight: 500, marginRight: 4 }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    {/* Files */}
                    <div style={{ width: 240, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, marginBottom: 6 }}>Attached files</div>
                      {(p.files||[]).length === 0 ? (
                        <div style={{ fontSize: 10, color: W.textLight, fontStyle: "italic" }}>No files attached</div>
                      ) : (
                        (p.files||[]).map((f, fi) => (
                          <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 16 }}>{"\uD83D\uDCC4"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                              <div style={{ fontSize: 9, color: W.textMuted }}>{Math.round((f.size||0)/1024)}KB {f.uploadedAt ? "\u00B7 "+new Date(f.uploadedAt).toLocaleDateString() : ""}</div>
                            </div>
                            {f.dataUrl && (
                              <a href={f.dataUrl} download={f.name} onClick={e => e.stopPropagation()} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: W.accent, color: "#fff", textDecoration: "none", fontWeight: 600, fontFamily: font, whiteSpace: "nowrap" }}>Download</a>
                            )}
                          </div>
                        ))
                      )}
                      <FileUploader projectId={p.id} onAddFile={(file) => {
                        var updated = { ...p, files: [...(p.files||[]), file] };
                        onUpdateProject(updated);
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Home Dashboard
const HomeDashboard = ({ projects, onNav, onViewProject }) => {
  var totalVal = projects.reduce((s,p) => s+p.valNum, 0);

  // Strategic category breakdown
  var strategyCounts = { Defend: 0, Extend: 0, Upend: 0, Unclassified: 0 };
  var strategyVal = { Defend: 0, Extend: 0, Upend: 0, Unclassified: 0 };
  projects.forEach(p => {
    var k = (p.strategicCategory && ["Defend","Extend","Upend"].includes(p.strategicCategory)) ? p.strategicCategory : "Unclassified";
    strategyCounts[k]++;
    strategyVal[k] += p.valNum || 0;
  });

  // Business unit breakdown
  var buMap = {};
  projects.forEach(p => {
    var bu = p.businessUnit || "Unassigned";
    if (!buMap[bu]) buMap[bu] = { count: 0, val: 0 };
    buMap[bu].count++;
    buMap[bu].val += p.valNum || 0;
  });
  var buEntries = Object.entries(buMap).sort((a,b) => b[1].val - a[1].val);

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="AI Portfolio Home" subtitle="Welcome back">
        <button onClick={() => onNav("submit")} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>+ New Project</button>
      </TopBar>
      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        {/* KPI row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Active Projects" value={projects.length} color={W.accent} />
          <KpiCard label="Portfolio Value" value={totalVal>0 ? formatVal(totalVal) : "$0"} color={W.success} />
          <KpiCard label="Submitted" value={projects.filter(p => p.status==="Submitted").length} color={W.purple} />
          <KpiCard label="At Risk" value={projects.filter(p => p.status==="At Risk").length} color={W.danger} />
        </div>

        {projects.length===0 ? (
          <EmptyState icon={"\uD83D\uDE80"} title="Your AI portfolio is empty" sub="Submit your first project to get started" action="Submit a Project" onAction={() => onNav("submit")} />
        ) : (
          <>
            {/* Strategic Category + BU row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {/* Defend / Extend / Upend */}
              <div style={{ flex: 1, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 14 }}>Strategic breakdown</div>
                {STRATEGIC_CATEGORIES.map(cat => {
                  var count = strategyCounts[cat.key];
                  var val = strategyVal[cat.key];
                  var pct = projects.length > 0 ? Math.round((count/projects.length)*100) : 0;
                  return (
                    <div key={cat.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, padding: "1px 8px", borderRadius: 10, background: cat.light }}>{cat.key}</span>
                          <span style={{ fontSize: 10, color: W.textMuted }}>{cat.desc.split(",")[0]}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: W.text }}>{count}</span>
                          <span style={{ fontSize: 9, color: W.textMuted, marginLeft: 4 }}>{val > 0 ? formatVal(val) : ""}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: cat.light, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: pct+"%", height: "100%", background: cat.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
                {strategyCounts.Unclassified > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: W.textLight, marginTop: 4 }}>
                    <span>Unclassified</span><span>{strategyCounts.Unclassified} project{strategyCounts.Unclassified!==1?"s":""}</span>
                  </div>
                )}
              </div>

              {/* By Business Unit */}
              <div style={{ flex: 1, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 14 }}>By business unit</div>
                {buEntries.map(function([bu, data]) {
                  var pct = totalVal > 0 ? Math.round((data.val/totalVal)*100) : 0;
                  return (
                    <div key={bu} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: W.text, fontWeight: 500 }}>{bu}</span>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: W.accent }}>{data.count}</span>
                          <span style={{ fontSize: 9, color: W.textMuted, marginLeft: 6 }}>{formatVal(data.val)}</span>
                        </div>
                      </div>
                      <div style={{ height: 5, background: W.accentLight, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: pct+"%", height: "100%", background: W.accent, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* By status */}
              <div style={{ width: 200, flexShrink: 0, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 14 }}>By status</div>
                {ALL_STATUSES.map(s => {
                  var count = projects.filter(p => p.status===s).length;
                  if (count===0) return null;
                  return (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: W.text }}>{s}</span>
                      <Badge text={count} color={getStatusColor(s)} bg={getStatusColor(s)+"18"} small />
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid "+W.borderLight }}>
                  <div onClick={() => onNav("submit")} style={{ padding: "7px 12px", borderRadius: 6, background: W.accentLight, border: "1px solid "+W.accent+"30", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: W.accent }}>+ New project</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent projects list */}
            <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Recent projects</div>
                <button onClick={() => onNav("portfolio")} style={{ padding: "4px 12px", borderRadius: 5, border: "1px solid "+W.border, background: "transparent", fontSize: 10, color: W.text, cursor: "pointer", fontFamily: font }}>View all \u2192</button>
              </div>
              {projects.slice(0,8).map((p, i) => {
                var cat = STRATEGIC_CATEGORIES.find(c => c.key === p.strategicCategory);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i<Math.min(projects.length,8)-1 ? "1px solid "+W.borderLight : "none" }}>
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onViewProject(p.id)}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: W.accent }}>{p.name}</div>
                      <div style={{ fontSize: 9, color: W.textMuted }}>{p.dept}{p.businessUnit ? " \u00B7 "+p.businessUnit : ""}</div>
                    </div>
                    {cat && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: cat.light, color: cat.color, fontWeight: 700, flexShrink: 0 }}>{cat.key}</span>}
                    <Badge text={p.status} color={getStatusColor(p.status)} bg={getStatusColor(p.status)+"18"} small />
                    <div style={{ width: 52, textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>{p.value || formatVal(p.valNum)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Project Detail Screen
const ProjectDetail = ({ project, onNav, onUpdateProject, onBack }) => {
  const [p, setP] = useState(project);
  const [tab, setTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [dirty, setDirty] = useState(false);
  const attachRef = useRef(null);

  useEffect(() => { setP(project); }, [project]);

  const update = (field, val) => { setP(prev => ({ ...prev, [field]: val })); setDirty(true); };
  const updateNested = (section, field, val) => { setP(prev => ({ ...prev, [section]: { ...(prev[section]||{}), [field]: val } })); setDirty(true); };
  const save = () => { onUpdateProject(p); setDirty(false); };

  const addComment = () => {
    if (!newComment.trim()) return;
    var comments = [...(p.aiCouncil?.comments || []), { text: newComment.trim(), author: "JD", date: new Date().toISOString() }];
    setP(prev => ({ ...prev, aiCouncil: { ...(prev.aiCouncil||{}), comments: comments } }));
    setNewComment("");
    setDirty(true);
  };

  const addFile = (file) => {
    var reader = new FileReader();
    reader.onload = (e) => {
      var files = [...(p.files||[]), { name: file.name, size: file.size, type: file.type, dataUrl: e.target.result, uploadedAt: new Date().toISOString() }];
      setP(prev => ({ ...prev, files: files }));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };
  var label = { fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 };
  var tabs = ["overview", "approval", "files"];

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title={p.name} subtitle={p.dept + " \u00B7 " + p.status}>
        <button onClick={onBack} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid "+W.border, fontSize: 11, color: W.text, cursor: "pointer", fontFamily: font, background: "transparent" }}>{"\u2190"} Back</button>
        {dirty && <button onClick={save} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: W.success, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Save Changes</button>}
      </TopBar>

      <div style={{ padding: "0 24px", maxWidth: 1100 }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid "+W.borderLight, marginBottom: 20 }}>
          {tabs.map(t => (
            <div key={t} onClick={() => setTab(t)} style={{ padding: "12px 20px", fontSize: 12, fontWeight: tab===t ? 700 : 400, color: tab===t ? W.accent : W.textMuted, borderBottom: tab===t ? "2px solid "+W.accent : "2px solid transparent", cursor: "pointer", textTransform: "capitalize" }}>{t}</div>
          ))}
        </div>

        {/* Overview Tab */}
        {tab==="overview" && (
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 2 }}>
              {/* Status + core info */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 14 }}>Project Details</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Project Name</label>
                  <input value={p.name||""} onChange={e => update("name", e.target.value)} style={is} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Problem / Description</label>
                  <textarea value={p.problem||""} onChange={e => update("problem", e.target.value)} rows={4} style={{ ...is, resize: "vertical", lineHeight: 1.6 }} />
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Department</label>
                    <select value={p.dept||""} onChange={e => update("dept", e.target.value)} style={{ ...is, cursor: "pointer" }}>
                      {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Status</label>
                    <select value={p.status||""} onChange={e => update("status", e.target.value)} style={{ ...is, cursor: "pointer" }}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Tools / Platforms</label>
                  <ToolSelector tools={p.tools||[]} onChange={(t) => { update("tools", t); }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Expected Value</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {IMPACT_TIERS.map((v, i) => (
                      <div key={i} onClick={() => { update("valNum", v.valNum); update("value", v.valStr); }} style={{ flex: 1, padding: "8px 6px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: p.valNum===v.valNum ? W.successLight : "#fff", border: "1.5px solid "+(p.valNum===v.valNum ? W.success : W.borderLight), transition: "all 0.15s" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: p.valNum===v.valNum ? W.success : W.text }}>{v.label}</div>
                        <div style={{ fontSize: 9, color: p.valNum===v.valNum ? W.success : W.textMuted, marginTop: 2 }}>{v.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Go-Live Date</label>
                    <input type="date" value={p.goLiveDate||""} onChange={e => update("goLiveDate", e.target.value)} style={is} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Owner</label>
                    <input value={p.owner||""} onChange={e => update("owner", e.target.value)} style={is} />
                  </div>
                </div>
              </div>

              {/* Business Unit, Exec Sponsor, Submitted by */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 14 }}>Submission Info</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Strategic Category</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {STRATEGIC_CATEGORIES.map(cat => (
                      <div key={cat.key} onClick={() => update("strategicCategory", cat.key)} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, textAlign: "center", cursor: "pointer", background: p.strategicCategory===cat.key ? cat.light : "#fff", border: "2px solid "+(p.strategicCategory===cat.key ? cat.color : W.borderLight), transition: "all 0.15s" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: p.strategicCategory===cat.key ? cat.color : W.text }}>{cat.key}</div>
                        <div style={{ fontSize: 9, color: p.strategicCategory===cat.key ? cat.color : W.textMuted, marginTop: 3, lineHeight: 1.3 }}>{cat.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Business Unit</label>
                  <select value={p.businessUnit||""} onChange={e => update("businessUnit", e.target.value)} style={{ ...is, cursor: "pointer" }}>
                    <option value="">Select business unit...</option>
                    {["Standex Electronics","Standex Engraving","Standex Engineering Technologies","Standex Scientific","Standex Specialty Solutions"].map(bu => <option key={bu} value={bu}>{bu}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Executive Sponsor</label>
                    <input value={p.executiveSponsor||""} onChange={e => update("executiveSponsor", e.target.value)} placeholder="e.g. Jane Smith, VP Finance" style={is} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Submitted by</label>
                    <input value={p.submittedByEmail||""} onChange={e => update("submittedByEmail", e.target.value)} placeholder="your.email@company.com" style={is} />
                  </div>
                </div>
              </div>

              {/* Success & Impact */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 14 }}>Success & Impact</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Who benefits?</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Internal users","External customers","Both"].map(opt => (
                      <div key={opt} onClick={() => update("beneficiaries", opt)} style={{ flex: 1, padding: "8px 6px", borderRadius: 6, textAlign: "center", cursor: "pointer", fontSize: 11, fontWeight: p.beneficiaries===opt ? 700 : 400, background: p.beneficiaries===opt ? W.accentLight : "#fff", border: "1.5px solid "+(p.beneficiaries===opt ? W.accent : W.borderLight), color: p.beneficiaries===opt ? W.accent : W.text, transition: "all 0.15s" }}>{opt}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>People today (number doing this manually)</label>
                  <input value={p.peopleImpacted||""} onChange={e => update("peopleImpacted", e.target.value)} placeholder="e.g. 25" style={is} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={label}>What metric will this change?</label>
                  <input value={p.successMetric||""} onChange={e => update("successMetric", e.target.value)} placeholder="e.g. Order conversion rate and design cycle time" style={is} />
                </div>
                <div>
                  <label style={label}>How will you measure success?</label>
                  <input value={p.successMeasure||""} onChange={e => update("successMeasure", e.target.value)} placeholder="e.g. Generate high-quality renderings in minutes vs days" style={is} />
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ width: 280, flexShrink: 0 }}>
              {/* Status card */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: W.textMuted }}>Status</span>
                  <Badge text={p.status} color={getStatusColor(p.status)} bg={getStatusColor(p.status)+"18"} />
                </div>
                <div style={{ fontSize: 10, color: W.textMuted }}>Submitted: {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "\u2014"}</div>
              </div>

              {/* Quick stats */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, marginBottom: 8 }}>Quick info</div>
                {[
                  ["Value", p.value || formatVal(p.valNum||0)],
                  ["Department", p.dept],
                  ["Business Unit", p.businessUnit || "\u2014"],
                  ["Strategy", p.strategicCategory || "\u2014"],
                  ["Exec Sponsor", p.executiveSponsor || "\u2014"],
                  ["Submitted by", p.submittedByEmail || "\u2014"],
                  ["Files", (p.files||[]).length + " attached"],
                  ["Tools", (p.tools||[]).join(", ") || "None"],
                ].map(function(kv) { return (
                  <div key={kv[0]} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: W.textMuted }}>{kv[0]}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: W.text }}>{kv[1]}</span>
                  </div>
                ); })}
              </div>

              {/* Approval summary */}
              <div style={{ background: (p.deptApproval?.approvedBy ? W.successLight : W.highlightLight), border: "1px solid "+(p.deptApproval?.approvedBy ? W.success : W.highlight)+"30", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: p.deptApproval?.approvedBy ? W.success : W.highlight, marginBottom: 6 }}>{p.deptApproval?.approvedBy ? "Dept. Approved" : "Pending Approval"}</div>
                {p.deptApproval?.approvedBy && <div style={{ fontSize: 10, color: W.text }}>By {p.deptApproval.approvedBy}{p.deptApproval.approvedOn ? " on "+new Date(p.deptApproval.approvedOn).toLocaleDateString() : ""}</div>}
                <div style={{ fontSize: 11, fontWeight: 700, color: p.aiCouncil?.status === "Approved" ? W.success : W.highlight, marginTop: 8 }}>AI Council: {p.aiCouncil?.status || "Pending"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Tab */}
        {tab==="approval" && (
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
              {/* Department Approval */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 14 }}>Department Approval</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Approved By</label>
                    <input value={(p.deptApproval||{}).approvedBy||""} onChange={e => updateNested("deptApproval","approvedBy",e.target.value)} placeholder="Name of approver..." style={is} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Approved On</label>
                    <input type="date" value={(p.deptApproval||{}).approvedOn||""} onChange={e => updateNested("deptApproval","approvedOn",e.target.value)} style={is} />
                  </div>
                </div>
              </div>

              {/* AI Council */}
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: W.text }}>AI Council Review</div>
                  <Badge text={(p.aiCouncil||{}).status || "Pending"} color={getStatusColor((p.aiCouncil||{}).status||"Submitted")} bg={getStatusColor((p.aiCouncil||{}).status||"Submitted")+"18"} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Council Decision</label>
                  <select value={(p.aiCouncil||{}).status||""} onChange={e => updateNested("aiCouncil","status",e.target.value)} style={{ ...is, cursor: "pointer" }}>
                    <option value="">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Approved with Conditions">Approved with Conditions</option>
                    <option value="Deferred">Deferred</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Comments thread */}
                <div style={{ marginBottom: 12 }}>
                  <label style={label}>Council Comments</label>
                  <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 8 }}>
                    {((p.aiCouncil||{}).comments||[]).length === 0 && <div style={{ fontSize: 10, color: W.textLight, fontStyle: "italic", padding: "8px 0" }}>No comments yet</div>}
                    {((p.aiCouncil||{}).comments||[]).map((c, i) => (
                      <div key={i} style={{ padding: "8px 12px", background: i%2===0 ? W.surfaceAlt : W.surface, borderRadius: 6, marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: W.accent }}>{c.author}</span>
                          <span style={{ fontSize: 9, color: W.textLight }}>{c.date ? new Date(c.date).toLocaleDateString() + " " + new Date(c.date).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</span>
                        </div>
                        <div style={{ fontSize: 11, color: W.text, lineHeight: 1.5 }}>{c.text}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a council comment..." rows={2} style={{ ...is, flex: 1, resize: "vertical" }} />
                    <button onClick={addComment} disabled={!newComment.trim()} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: newComment.trim() ? W.accent : W.surfaceAlt, color: newComment.trim() ? "#fff" : W.textLight, fontSize: 11, fontWeight: 600, cursor: newComment.trim() ? "pointer" : "default", fontFamily: font, alignSelf: "flex-end" }}>Post</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {tab==="files" && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.text }}>Attached Files ({(p.files||[]).length})</div>
                <div>
                  <input ref={attachRef} type="file" multiple style={{ display: "none" }} onChange={e => { Array.from(e.target.files).forEach(addFile); e.target.value=""; }} />
                  <button onClick={() => attachRef.current && attachRef.current.click()} style={{ padding: "6px 14px", borderRadius: 6, border: "1px dashed "+W.purple+"60", background: "transparent", fontSize: 11, color: W.purple, cursor: "pointer", fontFamily: font }}>+ Upload file</button>
                </div>
              </div>
              {(p.files||[]).length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDCC1"}</div>
                  <div style={{ fontSize: 12, color: W.textMuted }}>No files attached yet</div>
                  <div style={{ fontSize: 10, color: W.textLight, marginTop: 4 }}>Upload business cases, proposals, or supporting documents</div>
                </div>
              ) : (
                (p.files||[]).map((f, fi) => (
                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: fi%2===0 ? W.surfaceAlt+"50" : "transparent", borderRadius: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 22 }}>{"\uD83D\uDCC4"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: W.textMuted }}>{Math.round((f.size||0)/1024)}KB {f.uploadedAt ? "\u00B7 Uploaded "+new Date(f.uploadedAt).toLocaleDateString() : ""}</div>
                    </div>
                    {f.dataUrl && (
                      <a href={f.dataUrl} download={f.name} style={{ padding: "5px 12px", borderRadius: 5, background: W.accent, color: "#fff", fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: font }}>Download</a>
                    )}
                    <button onClick={() => { var files = (p.files||[]).filter((_,j) => j!==fi); setP(prev => ({...prev, files:files})); setDirty(true); }} style={{ padding: "5px 8px", borderRadius: 5, border: "1px solid "+W.borderLight, background: "transparent", fontSize: 10, cursor: "pointer", color: W.danger }}>{"\u2715"}</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Save reminder */}
        {dirty && (
          <div style={{ position: "fixed", bottom: 20, right: 20, padding: "10px 20px", borderRadius: 8, background: W.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", fontFamily: font, zIndex: 100 }} onClick={save}>
            Save Changes
          </div>
        )}
      </div>
    </div>
  );
};

// Settings Screen
const SettingsScreen = ({ llmSettings, onSave, userRole }) => {
  const [provider, setProvider] = useState(llmSettings.provider || "anthropic");
  const [newKey, setNewKey] = useState("");
  const [model, setModel] = useState(llmSettings.model || "");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [apiBase, setApiBase] = useState(() => getApiBase());
  const [apiSaved, setApiSaved] = useState(false);
  var hasExistingKey = !!(llmSettings.apiKey);

  var models = LLM_MODELS[provider] || [];

  function maskKey(key) {
    if (!key) return "";
    if (key.length <= 8) return "\u2022".repeat(key.length);
    return key.slice(0, 7) + "\u2022".repeat(Math.min(key.length - 11, 20)) + key.slice(-4);
  }

  const handleSave = () => {
    var keyToSave = newKey.trim() || llmSettings.apiKey || "";
    onSave({ provider: provider, apiKey: keyToSave, model: model || models[0]?.id || "" });
    setNewKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    var keyToUse = newKey.trim() || llmSettings.apiKey;
    if (!keyToUse) return setTestResult("Enter an API key first");
    setTesting(true);
    setTestResult("");
    try {
      var testMsg = [{ from: "user", text: "Say hello in one sentence." }];
      var reply = await callLLM(testMsg, { provider: provider, apiKey: keyToUse, model: model || models[0]?.id || "" });
      setTestResult("Connected! Response: " + reply.slice(0, 80) + (reply.length > 80 ? "..." : ""));
    } catch(e) {
      setTestResult("Error: " + e.message);
    }
    setTesting(false);
  };

  const handleClearData = () => {
    if (confirm("This will delete all projects and reset the app. Are you sure?")) {
      localStorage.removeItem("ai-ppm-projects");
      window.location.reload();
    }
  };

  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };

  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="Settings" subtitle="Configure AI provider, API keys, and app preferences" />
      <div style={{ padding: "20px 24px", maxWidth: 700 }}>
        {/* LLM Configuration */}
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>AI Provider</div>
          <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>Connect an LLM to power the Quick Chat intake. Your API key is stored only in your browser.</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Provider</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ key: "anthropic", label: "Anthropic (Claude)" }, { key: "openai", label: "OpenAI (GPT)" }].map(p => (
                <div key={p.key} onClick={() => { setProvider(p.key); setModel(""); }} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  background: provider===p.key ? W.accentLight : W.surface,
                  border: "1.5px solid "+(provider===p.key ? W.accent : W.borderLight),
                  textAlign: "center", transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: provider===p.key ? W.accent : W.text }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>API Key</label>
            {hasExistingKey && !newKey && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, border: "1px solid "+W.borderLight, borderRadius: 6, padding: "9px 12px", fontSize: 12, fontFamily: "monospace", color: W.textMuted, background: W.surfaceAlt, letterSpacing: 1 }}>{maskKey(llmSettings.apiKey)}</div>
                <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: W.successLight, color: W.success, fontWeight: 600 }}>Active</span>
              </div>
            )}
            <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder={hasExistingKey ? "Enter new key to replace existing..." : (provider==="anthropic" ? "sk-ant-..." : "sk-...")} style={is} />
            <div style={{ fontSize: 9, color: W.textLight, marginTop: 4 }}>
              {provider==="anthropic" ? "Get your key at console.anthropic.com" : "Get your key at platform.openai.com/api-keys"}
              {hasExistingKey && " \u00B7 Key is stored securely. Enter a new key above to replace it."}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Model</label>
            <select value={model || models[0]?.id || ""} onChange={e => setModel(e.target.value)} style={{ ...is, cursor: "pointer" }}>
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleSave} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Save Settings</button>
            <button onClick={handleTest} disabled={testing} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid "+W.border, background: "transparent", fontSize: 12, fontWeight: 600, cursor: testing ? "default" : "pointer", fontFamily: font, color: W.text }}>{testing ? "Testing..." : "Test Connection"}</button>
            {saved && <span style={{ fontSize: 11, color: W.success, fontWeight: 600 }}>Saved!</span>}
          </div>
          {testResult && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: testResult.startsWith("Error") ? W.dangerLight : W.successLight, color: testResult.startsWith("Error") ? W.danger : W.success, fontSize: 11, lineHeight: 1.5 }}>{testResult}</div>
          )}
        </div>

        {/* User Management (Admin only) */}
        {userRole === "Admin" && (
          <div style={{ marginBottom: 20 }}>
            <ErrorBoundary fallback="User management failed to load. Check that the backend is running."><UserManagement /></ErrorBoundary>
          </div>
        )}

        {/* Email Configuration (Admin only) */}
        {userRole === "Admin" && (
          <div style={{ marginBottom: 20 }}>
            <ErrorBoundary fallback="Email configuration failed to load."><EmailConfig /></ErrorBoundary>
          </div>
        )}

        {/* App Data */}
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>App Data</div>
          <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>Data is stored on the server at {getApiBase()}. Project data and uploaded files persist across sessions.</div>
          <button onClick={handleClearData} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid "+W.danger, background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, color: W.danger }}>Clear All Data & Reset</button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════
// AUTH SCREENS
// ══════════════════════════════════════════

const LoginScreen = ({ onLogin, apiBase, onSetApiBase }) => {
  const [tab, setTab] = useState("login"); // login | request | setup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  // Request access fields
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqReason, setReqReason] = useState("");
  // Setup account fields
  const [setupToken, setSetupToken] = useState(() => { var p = new URLSearchParams(window.location.search); return p.get("token") || ""; });
  const [setupPw, setSetupPw] = useState("");
  const [setupPw2, setSetupPw2] = useState("");
  // Advanced server config (hidden by default)
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState(apiBase || "");
  const [allowedDomains, setAllowedDomains] = useState([]);

  useEffect(() => { if (setupToken) setTab("setup"); }, []);
  useEffect(() => {
    if (apiBase) {
      fetch(apiBase + "/api/auth/config-public")
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(t => { try { var d = JSON.parse(t); setAllowedDomains(d.allowedDomains || []); } catch(e) {} })
        .catch(() => {});
    }
  }, [apiBase]);

  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "10px 12px", fontSize: 13, fontFamily: font, color: W.text, outline: "none", background: "#fff" };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      var data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email: email, password: password }) });
      setToken(data.token);
      onLogin(data.user);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleRequestAccess = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      var data = await apiFetch("/api/auth/request-access", { method: "POST", body: JSON.stringify({ email: reqEmail, name: reqName, reason: reqReason }) });
      setSuccess(data.message || "Access request submitted!");
      setReqName(""); setReqEmail(""); setReqReason("");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleSetup = async () => {
    setError(""); setLoading(true);
    if (setupPw !== setupPw2) { setError("Passwords do not match"); setLoading(false); return; }
    try {
      var data = await apiFetch("/api/auth/setup-account", { method: "POST", body: JSON.stringify({ token: setupToken, password: setupPw }) });
      setToken(data.token);
      window.history.replaceState({}, "", window.location.pathname);
      onLogin(data.user);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const saveApiBase = () => {
    var url = configUrl.trim().replace(/\/+$/, "");
    localStorage.setItem("ai-ppm-api-base", url);
    onSetApiBase(url);
    setShowConfig(false);
  };

  return (
    <div style={{ fontFamily: font, minHeight: "100vh", background: W.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: 420, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: W.highlight, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Ai</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: W.accentDark }}>AI-PPM Platform</div>
          <div style={{ fontSize: 12, color: W.textMuted }}>AI Project Portfolio Management</div>
        </div>

        {/* API config banner (hidden, only for advanced override) */}
        {showConfig && (
          <div style={{ background: W.highlightLight, border: "1px solid "+W.highlight+"40", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: W.highlight, marginBottom: 4 }}>Advanced: Custom server URL</div>
            <div style={{ fontSize: 10, color: W.textMuted, marginBottom: 8 }}>Only change this if the backend is hosted on a different server.</div>
            <input value={configUrl} onChange={e => setConfigUrl(e.target.value)} placeholder={window.location.origin} style={is} />
            <button onClick={saveApiBase} disabled={!configUrl.trim()} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 6, border: "none", background: configUrl.trim() ? W.accent : W.surfaceAlt, color: configUrl.trim() ? "#fff" : W.textLight, fontSize: 12, fontWeight: 600, cursor: configUrl.trim() ? "pointer" : "default", fontFamily: font, width: "100%" }}>Save & Reconnect</button>
          </div>
        )}

        {/* Main card — always visible */}
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 12, overflow: "hidden" }}>
            {/* Tab bar */}
            {tab !== "setup" && (
              <div style={{ display: "flex", borderBottom: "1px solid "+W.borderLight }}>
                {[{ k: "login", l: "Sign In" }, { k: "request", l: "Request Access" }].map(t => (
                  <div key={t.k} onClick={() => { setTab(t.k); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "12px", textAlign: "center", fontSize: 12, fontWeight: tab===t.k ? 700 : 400, color: tab===t.k ? W.accent : W.textMuted, borderBottom: tab===t.k ? "2px solid "+W.accent : "2px solid transparent", cursor: "pointer" }}>{t.l}</div>
                ))}
              </div>
            )}

            <div style={{ padding: "20px 24px" }}>
              {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.dangerLight, color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
              {success && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.successLight, color: W.success, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{success}</div>}

              {/* Login form */}
              {tab === "login" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} placeholder="you@standex.com" style={is} autoFocus />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} placeholder="Enter your password" style={is} />
                  </div>
                  <button onClick={handleLogin} disabled={loading || !email || !password} style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: !loading && email && password ? W.accent : W.surfaceAlt, color: !loading && email && password ? "#fff" : W.textLight, fontSize: 13, fontWeight: 700, cursor: !loading ? "pointer" : "default", fontFamily: font }}>{loading ? "Signing in..." : "Sign In"}</button>
                </>
              )}

              {/* Request access form */}
              {tab === "request" && (
                <>
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                    Request access with your company email. An administrator will review your request.
                    {allowedDomains.length > 0 && <span style={{ display: "block", marginTop: 4, fontSize: 10, color: W.textLight }}>Allowed domains: {allowedDomains.map(d => "@" + d).join(", ")}</span>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Full name</label>
                    <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="Jane Doe" style={is} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Work email</label>
                    <input value={reqEmail} onChange={e => setReqEmail(e.target.value)} placeholder="you@standex.com" style={is} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Reason (optional)</label>
                    <textarea value={reqReason} onChange={e => setReqReason(e.target.value)} placeholder="Why do you need access?" rows={2} style={{ ...is, resize: "vertical" }} />
                  </div>
                  <button onClick={handleRequestAccess} disabled={loading || !reqName || !reqEmail} style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: !loading && reqName && reqEmail ? W.accent : W.surfaceAlt, color: !loading && reqName && reqEmail ? "#fff" : W.textLight, fontSize: 13, fontWeight: 700, cursor: !loading ? "pointer" : "default", fontFamily: font }}>{loading ? "Submitting..." : "Request Access"}</button>
                </>
              )}

              {/* Setup account (from invite link) */}
              {tab === "setup" && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>Set Up Your Account</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.5 }}>Create a password to activate your account. Must be at least 8 characters with 1 uppercase and 1 number.</div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>New password</label>
                    <input type="password" value={setupPw} onChange={e => setSetupPw(e.target.value)} placeholder="At least 8 characters" style={is} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Confirm password</label>
                    <input type="password" value={setupPw2} onChange={e => setSetupPw2(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSetup(); }} placeholder="Re-enter password" style={is} />
                  </div>
                  <button onClick={handleSetup} disabled={loading || !setupPw || !setupPw2} style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: !loading && setupPw && setupPw2 ? W.success : W.surfaceAlt, color: !loading && setupPw && setupPw2 ? "#fff" : W.textLight, fontSize: 13, fontWeight: 700, cursor: !loading ? "pointer" : "default", fontFamily: font }}>{loading ? "Setting up..." : "Activate Account"}</button>
                </>
              )}
            </div>
          </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div onClick={() => setShowConfig(!showConfig)} style={{ fontSize: 10, color: W.textLight, cursor: "pointer" }}>{showConfig ? "Hide advanced" : "Advanced settings"}</div>
        </div>
      </div>
    </div>
  );
};

// Change Password (forced on first login)
const ChangePasswordScreen = ({ user, onDone }) => {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "10px 12px", fontSize: 13, fontFamily: font, color: W.text, outline: "none", background: "#fff" };

  const handleChange = async () => {
    setError(""); setLoading(true);
    if (newPw !== newPw2) { setError("Passwords do not match"); setLoading(false); return; }
    try {
      await apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: newPw }) });
      onDone();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: font, minHeight: "100vh", background: W.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 12, padding: "24px 28px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: W.text, marginBottom: 4 }}>Change Your Password</div>
        <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>You must set a new password before continuing. At least 8 characters, 1 uppercase, 1 number.</div>
        {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.dangerLight, color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        {!user.mustChangePassword && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={is} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>New password</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={is} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>Confirm new password</label>
          <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleChange(); }} style={is} />
        </div>
        <button onClick={handleChange} disabled={loading} style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font }}>{loading ? "Saving..." : "Set New Password"}</button>
      </div>
    </div>
  );
};

// Email Configuration (admin panel)
const EmailConfig = () => {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/email-config").then(setCfg).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try { await apiFetch("/api/admin/email-config", { method: "PUT", body: JSON.stringify(cfg) }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch(e) { setError(e.message); }
  };

  const test = async () => {
    if (!testEmail) return;
    setTesting(true); setTestResult("");
    try { var d = await apiFetch("/api/admin/email-test", { method: "POST", body: JSON.stringify({ to: testEmail }) }); setTestResult(d.message || "Sent!"); } catch(e) { setTestResult("Error: " + e.message); }
    setTesting(false);
  };

  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };
  var label = { fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 };

  if (loading) return null;
  if (!cfg) return null;

  return (
    <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>Email Notifications</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>Configure email to send setup links, access request notifications, and approval emails.</div>

      {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.dangerLight, color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

      {/* Enable toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} style={{ width: 40, height: 22, borderRadius: 11, background: cfg.enabled ? W.accent : W.border, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
          <div style={{ position: "absolute", top: 2, left: cfg.enabled ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "all 0.2s" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: cfg.enabled ? W.accent : W.textMuted }}>{cfg.enabled ? "Emails enabled" : "Emails disabled"}</span>
      </div>

      {cfg.enabled && (
        <>
          {/* Provider selection */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Email Provider</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[{ k: "office365", l: "Office 365" }, { k: "smtp", l: "Custom SMTP" }, { k: "sendgrid", l: "SendGrid" }, { k: "azure", l: "Azure Comm." }].map(p => (
                <div key={p.k} onClick={() => setCfg({ ...cfg, provider: p.k })} style={{ flex: 1, padding: "8px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: cfg.provider===p.k ? W.accentLight : W.surface, border: "1.5px solid "+(cfg.provider===p.k ? W.accent : W.borderLight), fontSize: 11, fontWeight: cfg.provider===p.k ? 600 : 400, color: cfg.provider===p.k ? W.accent : W.textMuted }}>{p.l}</div>
              ))}
            </div>
          </div>

          {/* From address */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>From Email</label>
              <input value={cfg.from||""} onChange={e => setCfg({ ...cfg, from: e.target.value })} placeholder="noreply@standex.com" style={is} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>From Name</label>
              <input value={cfg.fromName||""} onChange={e => setCfg({ ...cfg, fromName: e.target.value })} placeholder="AI-PPM Platform" style={is} />
            </div>
          </div>

          {/* App URL */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>App URL (for links in emails)</label>
            <input value={cfg.appUrl||""} onChange={e => setCfg({ ...cfg, appUrl: e.target.value })} placeholder="https://ai-ppm.standex.com" style={is} />
          </div>

          {/* Provider-specific fields */}
          {(cfg.provider === "office365" || cfg.provider === "smtp") && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 2 }}>
                  <label style={label}>{cfg.provider === "office365" ? "SMTP Host (auto-filled)" : "SMTP Host"}</label>
                  <input value={cfg.smtpHost || (cfg.provider === "office365" ? "smtp.office365.com" : "")} onChange={e => setCfg({ ...cfg, smtpHost: e.target.value })} placeholder="smtp.office365.com" style={is} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Port</label>
                  <input value={cfg.smtpPort||587} onChange={e => setCfg({ ...cfg, smtpPort: parseInt(e.target.value)||587 })} style={is} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>SMTP Username</label>
                  <input value={cfg.smtpUser||""} onChange={e => setCfg({ ...cfg, smtpUser: e.target.value })} placeholder="you@standex.com" style={is} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>SMTP Password</label>
                  <input type="password" value={cfg.smtpPass||""} onChange={e => setCfg({ ...cfg, smtpPass: e.target.value })} placeholder={cfg.smtpPass ? "****" : "Enter password"} style={is} />
                </div>
              </div>
            </>
          )}

          {cfg.provider === "sendgrid" && (
            <div style={{ marginBottom: 14 }}>
              <label style={label}>SendGrid API Key</label>
              <input type="password" value={cfg.sendgridApiKey||""} onChange={e => setCfg({ ...cfg, sendgridApiKey: e.target.value })} placeholder="SG.xxxxxx" style={is} />
            </div>
          )}

          {cfg.provider === "azure" && (
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Azure Communication Services Connection String</label>
              <input type="password" value={cfg.azureConnectionString||""} onChange={e => setCfg({ ...cfg, azureConnectionString: e.target.value })} placeholder="endpoint=https://..." style={is} />
              <div style={{ fontSize: 9, color: W.textLight, marginTop: 4 }}>Azure Portal {"\u2192"} Communication Services {"\u2192"} Keys</div>
            </div>
          )}

          {/* Save + Test */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <button onClick={save} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Save Email Settings</button>
            {saved && <span style={{ fontSize: 11, color: W.success, fontWeight: 600 }}>Saved!</span>}
          </div>

          <div style={{ borderTop: "1px solid "+W.borderLight, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, marginBottom: 6 }}>Send test email</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" style={{ ...is, flex: 1 }} />
              <button onClick={test} disabled={testing||!testEmail} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: !testing&&testEmail ? W.accent : W.surfaceAlt, color: !testing&&testEmail ? "#fff" : W.textLight, fontSize: 11, fontWeight: 600, cursor: !testing&&testEmail ? "pointer" : "default", fontFamily: font }}>{testing ? "Sending..." : "Send Test"}</button>
            </div>
            {testResult && <div style={{ marginTop: 6, fontSize: 11, color: testResult.startsWith("Error") ? W.danger : W.success }}>{testResult}</div>}
          </div>
        </>
      )}
    </div>
  );
};

// User Management (admin panel inside Settings)
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState("Submitter");
  const [setupLink, setSetupLink] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [config, setConfig] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      var [u, r, c] = await Promise.all([apiFetch("/api/admin/users"), apiFetch("/api/admin/access-requests"), apiFetch("/api/admin/config")]);
      setUsers(u); setRequests(r); setConfig(c);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approveRequest = async (id, role) => {
    try {
      var data = await apiFetch("/api/admin/access-requests/" + id + "/approve", { method: "POST", body: JSON.stringify({ role: role || "Submitter" }) });
      setSetupLink(window.location.origin + data.setupUrl);
      load();
    } catch(e) { setError(e.message); }
  };
  const rejectRequest = async (id) => {
    try { await apiFetch("/api/admin/access-requests/" + id + "/reject", { method: "POST" }); load(); } catch(e) { setError(e.message); }
  };
  const inviteUser = async () => {
    setError("");
    try {
      var data = await apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify({ email: invEmail, name: invName, role: invRole }) });
      setSetupLink(window.location.origin + data.setupUrl);
      setInvEmail(""); setInvName(""); setShowInvite(false); load();
    } catch(e) { setError(e.message); }
  };
  const updateUser = async (id, updates) => {
    try { await apiFetch("/api/admin/users/" + id, { method: "PATCH", body: JSON.stringify(updates) }); load(); } catch(e) { setError(e.message); }
  };
  const deleteUser = async (id, email) => {
    if (!confirm("Remove " + email + "? They will lose access immediately.")) return;
    try { await apiFetch("/api/admin/users/" + id, { method: "DELETE" }); load(); } catch(e) { setError(e.message); }
  };
  const addDomain = async () => {
    if (!domainInput.trim() || !config) return;
    var d = domainInput.trim().toLowerCase().replace(/^@/, "");
    var updated = { allowedDomains: [...config.allowedDomains, d] };
    try { var c = await apiFetch("/api/admin/config", { method: "PUT", body: JSON.stringify(updated) }); setConfig(c); setDomainInput(""); } catch(e) { setError(e.message); }
  };
  const removeDomain = async (d) => {
    if (!config) return;
    var updated = { allowedDomains: config.allowedDomains.filter(x => x !== d) };
    try { var c = await apiFetch("/api/admin/config", { method: "PUT", body: JSON.stringify(updated) }); setConfig(c); } catch(e) { setError(e.message); }
  };

  var is = { width: "100%", border: "1px solid "+W.border, borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: font, color: W.text, outline: "none", background: "#fff" };

  if (loading) return <div style={{ padding: "16px 20px", fontSize: 12, color: W.textMuted }}>Loading users...</div>;
  return (
    <div>
      {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: W.dangerLight, color: W.danger, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
      {setupLink && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: W.successLight, border: "1px solid "+W.success+"30", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: W.success, marginBottom: 4 }}>Share this one-time setup link with the user:</div>
          <div style={{ fontSize: 11, fontFamily: "Courier New", color: W.text, background: "#fff", padding: "8px 10px", borderRadius: 4, wordBreak: "break-all", border: "1px solid "+W.borderLight }}>{setupLink}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(setupLink); }} style={{ padding: "4px 12px", borderRadius: 4, border: "none", background: W.accent, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Copy Link</button>
            <button onClick={() => setSetupLink("")} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid "+W.border, background: "transparent", fontSize: 10, color: W.text, cursor: "pointer", fontFamily: font }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Pending access requests */}
      {requests.filter(r => r.status === "pending").length > 0 && (
        <div style={{ background: W.highlightLight, border: "1px solid "+W.highlight+"30", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: W.highlight, marginBottom: 10 }}>Pending Access Requests ({requests.filter(r => r.status === "pending").length})</div>
          {requests.filter(r => r.status === "pending").map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid "+W.highlight+"20" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{r.name}</div>
                <div style={{ fontSize: 10, color: W.textMuted }}>{r.email}{r.reason ? " \u2014 " + r.reason : ""}</div>
              </div>
              <select defaultValue="Submitter" id={"role-"+r.id} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.border, fontSize: 10, fontFamily: font }}>
                <option value="Submitter">Submitter</option><option value="Reviewer">Reviewer</option><option value="Admin">Admin</option>
              </select>
              <button onClick={() => approveRequest(r.id, document.getElementById("role-"+r.id).value)} style={{ padding: "4px 12px", borderRadius: 4, border: "none", background: W.success, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Approve</button>
              <button onClick={() => rejectRequest(r.id)} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid "+W.danger, background: "transparent", color: W.danger, fontSize: 10, cursor: "pointer", fontFamily: font }}>Reject</button>
            </div>
          ))}
        </div>
      )}

      {/* Allowed domains */}
      {config && (
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 10 }}>Allowed Email Domains</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {config.allowedDomains.map(d => (
              <span key={d} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 12, background: W.accentLight, color: W.accent, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                @{d} <span onClick={() => removeDomain(d)} style={{ cursor: "pointer", fontSize: 9, opacity: 0.6 }}>{"\u2715"}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={domainInput} onChange={e => setDomainInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addDomain(); }} placeholder="Add domain, e.g. standex.com" style={{ ...is, flex: 1 }} />
            <button onClick={addDomain} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Add</button>
          </div>
        </div>
      )}

      {/* User list */}
      <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Users ({users.length})</div>
          <button onClick={() => setShowInvite(!showInvite)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>+ Invite User</button>
        </div>
        {showInvite && (
          <div style={{ padding: "12px 14px", background: W.accentLight, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Full name" style={{ ...is, flex: 1 }} />
              <input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="Email" style={{ ...is, flex: 1 }} />
              <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ ...is, width: 120 }}>
                <option value="Submitter">Submitter</option><option value="Reviewer">Reviewer</option><option value="Admin">Admin</option>
              </select>
            </div>
            <button onClick={inviteUser} disabled={!invName || !invEmail} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: invName && invEmail ? W.success : W.surfaceAlt, color: invName && invEmail ? "#fff" : W.textLight, fontSize: 11, fontWeight: 600, cursor: invName && invEmail ? "pointer" : "default", fontFamily: font }}>Send Invite</button>
          </div>
        )}
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid "+W.borderLight }}>
            <div style={{ width: 32, height: 32, borderRadius: 32, background: W.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: W.accent }}>{(u.name||"?").slice(0,2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: W.text }}>{u.name}</div>
              <div style={{ fontSize: 10, color: W.textMuted }}>{u.email}</div>
            </div>
            <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.border, fontSize: 10, fontFamily: font }}>
              <option value="Submitter">Submitter</option><option value="Reviewer">Reviewer</option><option value="Admin">Admin</option>
            </select>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: u.status === "active" ? W.successLight : W.dangerLight, color: u.status === "active" ? W.success : W.danger, fontWeight: 600 }}>{u.status}</span>
            <div style={{ fontSize: 9, color: W.textLight, width: 60 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</div>
            <button onClick={() => deleteUser(u.id, u.email)} style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid "+W.borderLight, background: "transparent", fontSize: 10, cursor: "pointer", color: W.danger }}>{"\u2715"}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// App Shell
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBase());
  const [screen, setScreen] = useState("home");
  const [detailId, setDetailId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [llmSettings, setLLMSettings] = useState(() => loadLLMSettings());

  // Check existing session on load
  useEffect(() => {
    var token = getToken();
    if (token && apiBase) {
      fetch(apiBase + "/api/auth/me", { headers: { "Authorization": "Bearer " + token } })
        .then(r => {
          if (!r.ok) throw new Error("expired");
          return r.text();
        })
        .then(t => {
          try { var d = JSON.parse(t); setUser(d.user); } catch(e) { setToken(""); }
        })
        .catch(() => { setToken(""); })
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, [apiBase]);

  // Load projects when authenticated
  useEffect(() => {
    if (user && apiBase) {
      apiFetch("/api/projects").then(setProjects).catch(() => setProjects(loadProjects()));
    }
  }, [user, apiBase]);

  // Save projects
  var saveAll = (p) => {
    setProjects(p);
    saveProjects(p);
    if (apiBase) apiFetch("/api/projects", { method: "PUT", body: JSON.stringify(p) }).catch(() => {});
  };
  var addProject = (proj) => { var p = [proj, ...projects]; saveAll(p); };
  var updateProject = (updated) => { var p = projects.map(x => x.id === updated.id ? updated : x); saveAll(p); };
  var deleteProject = (id) => { var p = projects.filter(x => x.id !== id); saveAll(p); };
  var handleSaveLLM = (s) => { setLLMSettings(s); saveLLMSettings(s); };
  var viewProject = (id) => { setDetailId(id); setScreen("detail"); };
  var detailProject = projects.find(p => p.id === detailId) || null;
  var handleLogout = () => { apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {}); setToken(""); setUser(null); };

  // Loading state
  if (!authChecked) return (
    <div style={{ fontFamily: font, minHeight: "100vh", background: W.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 14, color: W.textMuted }}>Loading...</div>
    </div>
  );

  // Not logged in → show login
  if (!user) return <LoginScreen onLogin={setUser} apiBase={apiBase} onSetApiBase={setApiBase} />;

  // Must change password
  if (user.mustChangePassword) return <ChangePasswordScreen user={user} onDone={() => setUser({ ...user, mustChangePassword: false })} />;

  return (
    <div style={{ fontFamily: font, display: "flex", minHeight: "100vh", background: W.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <SidebarNav active={screen==="detail" ? "portfolio" : screen} onNav={(s) => { setScreen(s); setDetailId(null); }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Persistent user bar */}
        <div style={{ height: 36, background: W.surface, borderBottom: "1px solid "+W.borderLight, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: W.textMuted }}>{user.name}</span>
          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: W.accentLight, color: W.accent, fontWeight: 600 }}>{user.role}</span>
          <button onClick={handleLogout} style={{ padding: "3px 10px", borderRadius: 4, border: "1px solid "+W.border, background: "transparent", fontSize: 10, color: W.textMuted, cursor: "pointer", fontFamily: font }}>Logout</button>
        </div>
        {screen==="home" && <HomeDashboard projects={projects} onNav={setScreen} onViewProject={viewProject} />}
        {screen==="submit" && <ProjectSubmission onNav={setScreen} onSubmit={addProject} llmSettings={llmSettings} user={user} />}
        {screen==="portfolio" && <PortfolioOverview projects={projects} onNav={setScreen} onUpdateProject={updateProject} onDeleteProject={deleteProject} onViewProject={viewProject} />}
        {screen==="detail" && detailProject && <ProjectDetail project={detailProject} onNav={setScreen} onUpdateProject={updateProject} onBack={() => setScreen("portfolio")} />}
        {screen==="settings" && <SettingsScreen llmSettings={llmSettings} onSave={handleSaveLLM} userRole={user.role} />}
      </div>
    </div>
  );
}
