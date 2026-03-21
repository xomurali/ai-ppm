const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// File upload config
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".docx", ".pptx", ".doc", ".txt", ".md", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── Helper: read/write projects ──
function readProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading projects:", e.message);
  }
  return [];
}

function writeProjects(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// ── API Routes ──

// GET /api/projects — list all projects
app.get("/api/projects", (req, res) => {
  res.json(readProjects());
});

// PUT /api/projects — replace all projects (full sync from frontend)
app.put("/api/projects", (req, res) => {
  const projects = req.body;
  if (!Array.isArray(projects)) return res.status(400).json({ error: "Expected array" });
  writeProjects(projects);
  res.json({ ok: true, count: projects.length });
});

// POST /api/projects — add a single project
app.post("/api/projects", (req, res) => {
  const project = req.body;
  if (!project.name) return res.status(400).json({ error: "Project name required" });
  const projects = readProjects();
  project.id = project.id || Date.now();
  project.submittedAt = project.submittedAt || new Date().toISOString();
  projects.unshift(project);
  writeProjects(projects);
  res.json(project);
});

// PATCH /api/projects/:id — update a project
app.patch("/api/projects/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const updates = req.body;
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Project not found" });
  projects[idx] = { ...projects[idx], ...updates };
  writeProjects(projects);
  res.json(projects[idx]);
});

// DELETE /api/projects/:id — delete a project
app.delete("/api/projects/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let projects = readProjects();
  const before = projects.length;
  projects = projects.filter((p) => p.id !== id);
  if (projects.length === before) return res.status(404).json({ error: "Project not found" });
  writeProjects(projects);
  res.json({ ok: true });
});

// POST /api/upload — upload a document, return its text content
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  // For text files, read directly
  if ([".txt", ".md", ".csv"].includes(ext)) {
    const text = fs.readFileSync(filePath, "utf-8");
    res.json({
      fileName: originalName,
      text: text.slice(0, 10000),
      storedAs: path.basename(filePath),
    });
    return;
  }

  // For binary files (PDF, DOCX, PPTX), do best-effort text extraction
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const readable = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim();
    res.json({
      fileName: originalName,
      text: readable.slice(0, 10000),
      storedAs: path.basename(filePath),
      note: "Basic text extraction. For better PDF/DOCX parsing, add pdf-parse or mammoth packages.",
    });
  } catch (e) {
    res.json({
      fileName: originalName,
      text: "",
      storedAs: path.basename(filePath),
      note: "Could not extract text from this file type.",
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", projects: readProjects().length, uptime: process.uptime() });
});

// ── Start ──
app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI-PPM API server running on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Endpoints:`);
  console.log(`  GET    /api/projects      - list all`);
  console.log(`  POST   /api/projects      - add one`);
  console.log(`  PUT    /api/projects      - replace all`);
  console.log(`  PATCH  /api/projects/:id  - update one`);
  console.log(`  DELETE /api/projects/:id  - delete one`);
  console.log(`  POST   /api/upload        - upload document`);
  console.log(`  GET    /api/health        - health check`);
});
