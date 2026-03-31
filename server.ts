import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

console.log("[Server] Starting server process...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "guidelines_db.json");

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE, fs.constants.W_OK);
    console.log("[Server] Database file is accessible and writable:", DATA_FILE);
  } catch (err) {
    try {
      await fs.access(path.dirname(DATA_FILE), fs.constants.W_OK);
      console.log("[Server] Database file not found, but directory is writable. Creating file...");
      await fs.writeFile(DATA_FILE, JSON.stringify([]));
    } catch (dirErr) {
      console.error("[Server] CRITICAL: Database directory is NOT writable!", dirErr);
    }
  }
}

async function startServer() {
  await ensureDataFile();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Global Request Logger
  app.use((req, res, next) => {
    console.log(`[Server-Log] ${req.method} ${req.url}`);
    next();
  });

  // API: Health Check (Directly on app for maximum reliability)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // API: Get all guidelines
  app.get("/api/guidelines", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      console.error("[Server] Error reading guidelines:", err);
      res.status(500).json({ error: "Failed to read database" });
    }
  });

  // API: Add a guideline
  app.post("/api/guidelines", async (req, res) => {
    try {
      console.log(`[Server] POST /api/guidelines - Content-Type: ${req.headers['content-type']}`);
      const newGuideline = req.body;
      
      if (!newGuideline || !newGuideline.id) {
        console.warn("[Server] Received invalid or empty guideline data.");
        return res.status(400).json({ error: "Invalid guideline data" });
      }

      const data = await fs.readFile(DATA_FILE, "utf-8");
      const guidelines = JSON.parse(data);
      
      const filtered = guidelines.filter((g: any) => g.id !== newGuideline.id);
      filtered.push(newGuideline);
      
      await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2));
      res.status(201).json(newGuideline);
    } catch (err) {
      console.error("[Server] Save error:", err);
      res.status(500).json({ error: "Cloud save failed", details: String(err) });
    }
  });

  // API: Delete a guideline
  app.delete("/api/guidelines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = await fs.readFile(DATA_FILE, "utf-8");
      let guidelines = JSON.parse(data);
      guidelines = guidelines.filter((g: any) => g.id !== id);
      await fs.writeFile(DATA_FILE, JSON.stringify(guidelines, null, 2));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete guideline" });
    }
  });

  // API: Debug
  app.get("/api/debug", (req, res) => {
    res.json({
      message: "API Debug Info",
      cwd: process.cwd(),
      data_file: DATA_FILE,
      node_version: process.version
    });
  });

  // Catch-all for unmatched /api requests
  app.all("/api/*", (req, res) => {
    console.warn(`[Server] 404 Not Found on /api: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API Endpoint Not Found", 
      method: req.method, 
      url: req.url 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server is listening on http://0.0.0.0:${PORT}`);
    console.log(`[Server] API endpoints: /api/health, /api/guidelines`);
  });
}

startServer().catch(err => {
  console.error("[Server] CRITICAL: Server failed to start!", err);
});
