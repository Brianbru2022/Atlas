import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("scripts.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS styles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    style_id TEXT,
    premise TEXT,
    criteria TEXT,
    length_minutes INTEGER,
    video_clips TEXT, -- Store as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (style_id) REFERENCES styles(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/styles", (req, res) => {
    const styles = db.prepare("SELECT * FROM styles").all();
    res.json(styles);
  });

  app.post("/api/styles", (req, res) => {
    const { id, name, description } = req.body;
    db.prepare("INSERT INTO styles (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
    res.status(201).json({ id, name, description });
  });

  app.put("/api/styles/:id", (req, res) => {
    const { name, description } = req.body;
    db.prepare("UPDATE styles SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/styles/:id", (req, res) => {
    db.prepare("DELETE FROM styles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    const { id, name } = req.body;
    db.prepare("INSERT INTO projects (id, name) VALUES (?, ?)").run(id, name);
    res.status(201).json({ id, name });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const projectId = req.params.id;
    db.prepare("DELETE FROM scripts WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    res.json({ success: true });
  });

  app.get("/api/projects/:projectId/scripts", (req, res) => {
    const scripts = db.prepare("SELECT * FROM scripts WHERE project_id = ? ORDER BY created_at DESC").all(req.params.projectId);
    res.json(scripts);
  });

  app.post("/api/scripts", (req, res) => {
    const { id, project_id, title, content, style_id, premise, criteria, length_minutes, video_clips } = req.body;
    db.prepare(`
      INSERT INTO scripts (id, project_id, title, content, style_id, premise, criteria, length_minutes, video_clips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, title, content, style_id, premise, criteria, length_minutes, JSON.stringify(video_clips));
    res.status(201).json({ id, title });
  });

  app.put("/api/scripts/:id", (req, res) => {
    const { content, title } = req.body;
    if (content !== undefined && title !== undefined) {
      db.prepare("UPDATE scripts SET content = ?, title = ? WHERE id = ?").run(content, title, req.params.id);
    } else if (content !== undefined) {
      db.prepare("UPDATE scripts SET content = ? WHERE id = ?").run(content, req.params.id);
    } else if (title !== undefined) {
      db.prepare("UPDATE scripts SET title = ? WHERE id = ?").run(title, req.params.id);
    }
    res.json({ success: true });
  });

  app.delete("/api/scripts/:id", (req, res) => {
    db.prepare("DELETE FROM scripts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
