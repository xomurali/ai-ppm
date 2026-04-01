import { useState, useEffect, useRef } from "react";

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
  localStorage.setItem("ai-ppm-projects", JSON.stringify(projects));
}

// LLM Settings
function loadLLMSettings() {
  try { var d = localStorage.getItem("ai-ppm-llm"); return d ? JSON.parse(d) : { provider: "anthropic", apiKey: "", model: "" }; } catch(e) { return { provider: "anthropic", apiKey: "", model: "" }; }
}
function saveLLMSettings(s) { localStorage.setItem("ai-ppm-llm", JSON.stringify(s)); }

var LLM_MODELS = {
  anthropic: [{ id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" }, { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" }],
  openai: [{ id: "gpt-4o", name: "GPT-4o" }, { id: "gpt-4o-mini", name: "GPT-4o Mini" }],
};

var INTAKE_SYSTEM_PROMPT = "You are an AI project intake assistant for a corporate AI portfolio management tool. Your job is to help users register new AI projects by collecting 5 pieces of information through natural conversation:\n1. Project name\n2. Problem it solves (pain point + how AI helps)\n3. Department that owns it\n4. Tools/platforms involved (e.g. Claude, Replit, Copilot, Lovable, Figma AI, Cursor, ChatGPT, Power Automate)\n5. Expected impact tier: <$100K (Quick win), $100K-500K (Meaningful), $500K-2M (Transformative), >$2M (Strategic)\n\nBe conversational, warm, and brief. Ask one question at a time. After you have all 5 pieces of information, output EXACTLY this JSON block and nothing else:\n```json\n{\"complete\":true,\"name\":\"...\",\"problem\":\"...\",\"dept\":\"...\",\"tools\":[\"...\"],\"impact\":\"<$100K|$100K-500K|$500K-2M|>$2M\"}\n```\nDo not output the JSON until you have all 5 fields confirmed. Keep responses under 2 sentences.";

async function callLLM(messages, settings) {
  if (!settings.apiKey) throw new Error("No API key configured. Go to Settings to add one.");
  var model = settings.model || LLM_MODELS[settings.provider][0].id;

  if (settings.provider === "anthropic") {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: model, max_tokens: 1024, system: INTAKE_SYSTEM_PROMPT, messages: messages.map(m => ({ role: m.from === "ai" ? "assistant" : "user", content: m.text })) })
    });
    if (!res.ok) { var err = await res.json().catch(() => ({})); throw new Error(err.error?.message || "Anthropic API error: " + res.status); }
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
        return { name: obj.name, problem: obj.problem, dept: obj.dept, tools: obj.tools || [], impact: impactMap[obj.impact] || IMPACT_TIERS[1] };
      }
    }
  } catch(e) {}
  return null;
}

var DOC_EXTRACT_PROMPT = "You are a document parser for an AI project portfolio management tool. Extract the following fields from the uploaded document text. If a field is not found, make your best guess or leave it as empty string.\n\nRespond ONLY with this JSON, no other text:\n```json\n{\"name\":\"project name\",\"problem\":\"what problem it solves\",\"dept\":\"department name\",\"tools\":[\"tool1\",\"tool2\"],\"impact\":\"<$100K|$100K-500K|$500K-2M|>$2M\"}\n```";

async function extractFromDocument(text, settings) {
  if (!settings.apiKey) return null;
  var model = settings.model || LLM_MODELS[settings.provider][0].id;
  var msgs = [{ from: "user", text: "Extract project details from this document:\n\n" + text.slice(0, 8000) }];
  if (settings.provider === "anthropic") {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: model, max_tokens: 1024, system: DOC_EXTRACT_PROMPT, messages: [{ role: "user", content: msgs[0].text }] })
    });
    if (!res.ok) throw new Error("API error: " + res.status);
    var data = await res.json();
    return parseDocExtraction(data.content[0].text);
  } else {
    var res2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + settings.apiKey },
      body: JSON.stringify({ model: model, max_tokens: 1024, messages: [{ role: "system", content: DOC_EXTRACT_PROMPT }, { role: "user", content: msgs[0].text }] })
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
      return { name: obj.name || "", problem: obj.problem || "", dept: obj.dept || "Finance", tools: obj.tools || [], impact: impactMap[obj.impact] != null ? impactMap[obj.impact] : 1 };
    }
  } catch(e) {}
  return null;
}

// Backend API helpers
var API_BASE = "";
function getApiBase() {
  try { var s = localStorage.getItem("ai-ppm-api-base"); return s || ""; } catch(e) { return ""; }
}

async function apiSaveProjects(projects) {
  var base = getApiBase();
  if (!base) { saveProjects(projects); return; }
  try {
    await fetch(base + "/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projects) });
  } catch(e) { saveProjects(projects); }
}

async function apiLoadProjects() {
  var base = getApiBase();
  if (!base) return loadProjects();
  try {
    var res = await fetch(base + "/api/projects");
    if (res.ok) return await res.json();
  } catch(e) {}
  return loadProjects();
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
const ChatIntake = ({ onSubmit, onNav, llmSettings }) => {
  const [messages, setMessages] = useState([{ from: "ai", text: "Hey! Let's get your AI project registered. What are you calling it?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ name: "", problem: "", dept: "", tools: [], impact: null });
  const [selectedTools, setSelectedTools] = useState([]);
  const [completed, setCompleted] = useState(null);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const hasKey = llmSettings && llmSettings.apiKey;
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, step, loading]);

  // LLM-powered send
  const sendLLM = async () => {
    if (!input.trim()) return;
    var val = input.trim();
    var newMsgs = [...messages, { from: "user", text: val }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    setError("");
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
      setError(e.message);
      setMessages([...newMsgs, { from: "ai", text: "Sorry, I hit an error connecting to the AI. You can try again or switch to the Simple Form." }]);
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
  const send = hasKey ? sendLLM : sendScripted;

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
    onSubmit({ id: Date.now(), name: data.name, problem: data.problem, dept: data.dept, tools: data.tools, status: "Submitted", valNum: imp.valNum, value: imp.valStr, progress: 0, goLive: "\u2014", owner: "JD", submittedAt: new Date().toISOString() });
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
        {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: W.dangerLight, color: W.danger, fontSize: 10, marginBottom: 8 }}>{error}</div>}
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
            {[["Name", formData.name], ["Problem", formData.problem], ["Department", formData.dept], ["Tools", formData.tools.join(", ")], ["Impact", formData.impact.label+" ("+formData.impact.valStr+")"]].map(function(pair) { return (
              <div key={pair[0]} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: W.success, fontWeight: 600, width: 70, flexShrink: 0 }}>{pair[0]}</span>
                <span style={{ fontSize: 10, color: W.text }}>{pair[1]}</span>
              </div>
            ); })}
            <button onClick={() => doSubmit(formData)} style={{ marginTop: 10, padding: "8px 24px", borderRadius: 6, border: "none", background: W.success, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font, width: "100%" }}>Submit Project \u2192</button>
          </div>
        )}
        {/* LLM-completed summary */}
        {completed && (
          <div style={{ marginTop: 10, padding: 14, background: W.successLight, borderRadius: 10, border: "1px solid "+W.success+"30" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.success, marginBottom: 8 }}>Project extracted from conversation</div>
            {[["Name", completed.name], ["Problem", completed.problem], ["Department", completed.dept], ["Tools", (completed.tools||[]).join(", ")], ["Impact", completed.impact ? completed.impact.label+" ("+completed.impact.valStr+")" : ""]].map(function(pair) { return (
              <div key={pair[0]} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: W.success, fontWeight: 600, width: 70, flexShrink: 0 }}>{pair[0]}</span>
                <span style={{ fontSize: 10, color: W.text }}>{pair[1]}</span>
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
const FormIntake = ({ onSubmit, onNav }) => {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [dept, setDept] = useState("");
  const [tools, setTools] = useState([]);
  const [impact, setImpact] = useState(null);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const attachRef = useRef(null);
  const toggleTool = (t) => setTools(s => s.includes(t) ? s.filter(x => x!==t) : [...s, t]);

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
    setError("");
    var tier = IMPACT_TIERS[impact];
    onSubmit({ id: Date.now(), name: name.trim(), problem: problem.trim(), dept: dept, tools: tools, status: "Submitted", valNum: tier.valNum, value: tier.valStr, progress: 0, goLive: "\u2014", owner: "JD", submittedAt: new Date().toISOString(), files: attachments });
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
const UploadIntake = ({ onSubmit, onNav, llmSettings }) => {
  const [phase, setPhase] = useState("idle");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState(null);
  const [extractError, setExtractError] = useState("");
  const [ext, setExt] = useState({ name: "", problem: "", dept: "Finance", tools: ["Claude"], impact: 2 });
  const fileRef = useRef(null);

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

    var hasLLM = llmSettings && llmSettings.apiKey;
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
      if (!hasLLM) setExtractError("No API key configured. Text was extracted and parsed from the document. Connect an LLM in Settings for more accurate extraction.");
    } else {
      setExt({
        name: baseName,
        problem: fileText.length > 0 ? fileText.slice(0, 300) : "Could not extract text from this file. Please enter details manually.",
        dept: "Finance",
        tools: [],
        impact: 1,
      });
      if (fileText.length === 0) setExtractError("Could not extract text from this file format. Please fill in the details manually.");
      else if (!hasLLM) setExtractError("No API key configured. Go to Settings to connect an LLM for intelligent document parsing.");
    }
    setPhase("editing");
  };

  const handleSubmit = () => {
    var tier = IMPACT_TIERS[ext.impact];
    var files = [];
    if (fileData) files.push({ name: fileData.name, size: fileData.size, type: fileData.type, dataUrl: fileData.dataUrl, uploadedAt: new Date().toISOString() });
    onSubmit({ id: Date.now(), name: ext.name, problem: ext.problem, dept: ext.dept, tools: ext.tools, status: "Submitted", valNum: tier.valNum, value: tier.valStr, progress: 0, goLive: "\u2014", owner: "JD", submittedAt: new Date().toISOString(), files: files });
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
            <div style={{ fontSize: 10, color: W.textLight, marginTop: 8 }}>{llmSettings && llmSettings.apiKey ? "AI will extract project details automatically" : "Add an API key in Settings for AI-powered extraction"}</div>
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
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Project name</label>
            <input value={ext.name} onChange={e => setExt(d => ({ ...d, name: e.target.value }))} style={is} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Problem</label>
            <textarea value={ext.problem} onChange={e => setExt(d => ({ ...d, problem: e.target.value }))} rows={3} style={{ ...is, resize: "vertical", lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Department</label>
            <select value={ext.dept} onChange={e => setExt(d => ({ ...d, dept: e.target.value }))} style={{ ...is, cursor: "pointer" }}>
              {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Tools</label>
            <ToolSelector tools={ext.tools} onChange={(t) => setExt(d => ({ ...d, tools: t }))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 3 }}>Impact</label>
            <div style={{ display: "flex", gap: 6 }}>
              {IMPACT_TIERS.map((v, i) => (
                <div key={i} onClick={() => setExt(d => ({ ...d, impact: i }))} style={{ flex: 1, padding: "6px 4px", borderRadius: 6, textAlign: "center", cursor: "pointer", background: ext.impact===i ? W.successLight : "#fff", border: "1.5px solid "+(ext.impact===i ? W.success : W.borderLight) }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ext.impact===i ? W.success : W.text }}>{v.label}</div>
                  <div style={{ fontSize: 8, color: ext.impact===i ? W.success : W.textMuted }}>{v.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid "+W.borderLight, paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setPhase("idle"); setFileName(""); setExtractError(""); }} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid "+W.border, background: "transparent", fontSize: 11, color: W.text, cursor: "pointer", fontFamily: font }}>Re-upload</button>
            <button onClick={handleSubmit} style={{ padding: "7px 22px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font }}>Submit \u2192</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Project Submission Screen
const ProjectSubmission = ({ onNav, onSubmit, llmSettings }) => {
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
              {mode==="chat" && <ChatIntake onSubmit={onSubmit} onNav={onNav} llmSettings={llmSettings} />}
              {mode==="form" && <FormIntake onSubmit={onSubmit} onNav={onNav} />}
              {mode==="upload" && <UploadIntake onSubmit={onSubmit} onNav={onNav} llmSettings={llmSettings} />}
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
  const [sortBy, setSortBy] = useState("newest");
  const [hoverRow, setHoverRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  var depts = [...new Set(projects.map(p => p.dept))];
  var filtered = projects.filter(p => statusFilter==="All" || p.status===statusFilter).filter(p => deptFilter==="All" || p.dept===deptFilter).sort((a,b) => { if (sortBy==="value") return b.valNum-a.valNum; if (sortBy==="name") return a.name.localeCompare(b.name); return (b.submittedAt||"").localeCompare(a.submittedAt||""); });
  var totalVal = projects.reduce((s,p) => s+p.valNum, 0);
  var atRisk = projects.filter(p => p.status==="At Risk").length;
  var pipeline = ALL_STATUSES.map(s => ({ stage: s, count: projects.filter(p => p.status===s).length, color: STATUS_META[s].color }));
  var toolCounts = {};
  projects.forEach(p => (p.tools||[]).forEach(t => { toolCounts[t]=(toolCounts[t]||0)+1; }));
  var topTools = Object.entries(toolCounts).sort((a,b) => b[1]-a[1]).slice(0,5);

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
              {topTools.map(function(pair) { return (
                <div key={pair[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: W.text }}>{pair[0]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: W.accent }}>{pair[1]}</span>
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
          <div style={{ flex: 1 }} />
          {[{k:"newest",l:"Newest"},{k:"value",l:"Value"},{k:"name",l:"Name"}].map(s => (
            <button key={s.k} onClick={() => setSortBy(s.k)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid "+(sortBy===s.k ? W.accent : W.borderLight), background: sortBy===s.k ? W.accentLight : "transparent", color: sortBy===s.k ? W.accent : W.textMuted, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: font }}>{s.l}</button>
          ))}
          <span style={{ fontSize: 10, color: W.textMuted }}>{filtered.length} results</span>
        </div>
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.2fr 1fr 0.8fr 0.5fr", padding: "10px 20px", background: W.accentDark, gap: 8 }}>
            {["Project","Department","Status","Tools","Value",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{h}</div>)}
          </div>
          {filtered.map((p, i) => (
            <div key={p.id}>
              <div onMouseEnter={() => setHoverRow(p.id)} onMouseLeave={() => setHoverRow(null)} onClick={() => setExpandedId(expandedId===p.id ? null : p.id)} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.2fr 1fr 0.8fr 0.5fr", padding: "12px 20px", gap: 8, alignItems: "center", background: hoverRow===p.id ? W.accentLight+"40" : i%2===0 ? W.surfaceAlt+"50" : "transparent", borderBottom: expandedId===p.id ? "none" : (i<filtered.length-1 ? "1px solid "+W.borderLight : "none"), cursor: "pointer" }}>
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
  return (
    <div style={{ flex: 1, background: W.bg, overflowY: "auto", minHeight: "100vh" }}>
      <TopBar title="AI Portfolio Home" subtitle="Welcome back, Jane">
        <button onClick={() => onNav("submit")} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font }}>+ New Project</button>
      </TopBar>
      <div style={{ padding: "20px 24px", maxWidth: 1100 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Active Projects" value={projects.length} color={W.accent} />
          <KpiCard label="Portfolio Value" value={totalVal>0 ? formatVal(totalVal) : "$0"} color={W.success} />
          <KpiCard label="Submitted" value={projects.filter(p => p.status==="Submitted").length} color={W.purple} />
          <KpiCard label="At Risk" value={projects.filter(p => p.status==="At Risk").length} color={W.danger} />
        </div>
        {projects.length===0 ? (
          <EmptyState icon={"\uD83D\uDE80"} title="Your AI portfolio is empty" sub="Submit your first project to get started" action="Submit a Project" onAction={() => onNav("submit")} />
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 2, background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>All projects</div>
                <button onClick={() => onNav("portfolio")} style={{ padding: "4px 12px", borderRadius: 5, border: "1px solid "+W.border, background: "transparent", fontSize: 10, color: W.text, cursor: "pointer", fontFamily: font }}>View portfolio \u2192</button>
              </div>
              {projects.slice(0,8).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i<Math.min(projects.length,8)-1 ? "1px solid "+W.borderLight : "none" }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onViewProject(p.id)}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: W.accent }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: W.textMuted }}>{p.dept}</div>
                  </div>
                  <Badge text={p.status} color={getStatusColor(p.status)} bg={getStatusColor(p.status)+"18"} small />
                  <div style={{ width: 60, textAlign: "right", marginLeft: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>{p.value || formatVal(p.valNum)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div onClick={() => onNav("submit")} style={{ background: W.accentLight, border: "1px solid "+W.accent+"30", borderRadius: 10, padding: "16px 20px", cursor: "pointer" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.accent, marginBottom: 4 }}>Submit a new project</div>
                <div style={{ fontSize: 10, color: W.textMuted }}>Chat with AI, fill a form, or upload a doc</div>
              </div>
              <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 12 }}>By status</div>
                {ALL_STATUSES.map(s => {
                  var count = projects.filter(p => p.status===s).length;
                  if (count===0) return null;
                  return (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: W.text }}>{s}</span>
                      <Badge text={count} color={getStatusColor(s)} bg={getStatusColor(s)+"18"} small />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Expected Value</label>
                    <div style={{ fontSize: 20, fontWeight: 700, color: W.accent }}>{p.value || formatVal(p.valNum || 0)}</div>
                  </div>
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
                  ["Files", (p.files||[]).length + " attached"],
                  ["Tools", (p.tools||[]).join(", ") || "None"],
                ].map(function(pair) { return (
                  <div key={pair[0]} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: W.textMuted }}>{pair[0]}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: W.text }}>{pair[1]}</span>
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
const SettingsScreen = ({ llmSettings, onSave }) => {
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

        {/* Backend API */}
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>Backend API (optional)</div>
          <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>Connect to a backend server to persist data across devices. Leave blank to use browser-only localStorage.</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: W.textMuted, display: "block", marginBottom: 4 }}>API Base URL</label>
            <input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="e.g. http://your-azure-vm:3001" style={is} />
            <div style={{ fontSize: 9, color: W.textLight, marginTop: 4 }}>The Express server URL where project data is stored. Deploy the server folder to your Azure VM.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { localStorage.setItem("ai-ppm-api-base", apiBase); setApiSaved(true); setTimeout(() => setApiSaved(false), 2000); }} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: W.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font }}>Save</button>
            {apiSaved && <span style={{ fontSize: 11, color: W.success, fontWeight: 600, alignSelf: "center" }}>Saved!</span>}
          </div>
        </div>

        {/* App Data */}
        <div style={{ background: W.surface, border: "1px solid "+W.borderLight, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: W.text, marginBottom: 4 }}>App Data</div>
          <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>{apiBase ? "Data is synced with your backend at " + apiBase : "Data is stored locally in your browser. Connect a backend API above to persist across devices."}</div>
          <button onClick={handleClearData} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid "+W.danger, background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, color: W.danger }}>Clear All Data & Reset</button>
        </div>
      </div>
    </div>
  );
};

// App Shell
export default function App() {
  const [screen, setScreen] = useState("home");
  const [detailId, setDetailId] = useState(null);
  const [projects, setProjects] = useState(() => loadProjects());
  const [llmSettings, setLLMSettings] = useState(() => loadLLMSettings());
  useEffect(() => { saveProjects(projects); }, [projects]);
  var addProject = (p) => setProjects(prev => [p, ...prev]);
  var updateProject = (updated) => setProjects(prev => prev.map(p => p.id===updated.id ? updated : p));
  var deleteProject = (id) => setProjects(prev => prev.filter(p => p.id!==id));
  var handleSaveLLM = (s) => { setLLMSettings(s); saveLLMSettings(s); };
  var viewProject = (id) => { setDetailId(id); setScreen("detail"); };
  var detailProject = projects.find(p => p.id === detailId) || null;

  return (
    <div style={{ fontFamily: font, display: "flex", minHeight: "100vh", background: W.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <SidebarNav active={screen==="detail" ? "portfolio" : screen} onNav={(s) => { setScreen(s); setDetailId(null); }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {screen==="home" && <HomeDashboard projects={projects} onNav={setScreen} onViewProject={viewProject} />}
        {screen==="submit" && <ProjectSubmission onNav={setScreen} onSubmit={addProject} llmSettings={llmSettings} />}
        {screen==="portfolio" && <PortfolioOverview projects={projects} onNav={setScreen} onUpdateProject={updateProject} onDeleteProject={deleteProject} onViewProject={viewProject} />}
        {screen==="detail" && detailProject && <ProjectDetail project={detailProject} onNav={setScreen} onUpdateProject={updateProject} onBack={() => setScreen("portfolio")} />}
        {screen==="settings" && <SettingsScreen llmSettings={llmSettings} onSave={handleSaveLLM} />}
      </div>
    </div>
  );
}
