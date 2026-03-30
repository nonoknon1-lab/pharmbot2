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

  // Cloud API Router
  const cloudRouter = express.Router();

  // Request Logger for Cloud API
  cloudRouter.use((req, res, next) => {
    console.log(`[Cloud-API] ${req.method} ${req.url}`);
    next();
  });

  // API: Get all guidelines
  cloudRouter.get("/guidelines", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      console.error("[Server] Error reading guidelines:", err);
      res.status(500).json({ error: "Failed to read database" });
    }
  });

  // API: Add a guideline
  cloudRouter.post("/guidelines", async (req, res) => {
    try {
      console.log(`[Cloud-API] POST /guidelines - Content-Type: ${req.headers['content-type']}`);
      const newGuideline = req.body;
      
      if (!newGuideline || !newGuideline.id) {
        console.warn("[Cloud-API] Received invalid or empty guideline data. Body keys:", Object.keys(req.body || {}));
        return res.status(400).json({ error: "Invalid guideline data", receivedKeys: Object.keys(req.body || {}) });
      }

      const bodySize = JSON.stringify(req.body).length;
      console.log(`[Server] Saving guideline: "${newGuideline.name}" - Size: ${(bodySize / 1024).toFixed(2)} KB`);
      
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
  cloudRouter.delete("/guidelines/:id", async (req, res) => {
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

  // API: Health Check
  cloudRouter.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      db_file: DATA_FILE
    });
  });

  // API: Debug Routes
  cloudRouter.get("/debug", (req, res) => {
    res.json({
      message: "Cloud API Debug Info",
      routes: [
        "GET /guidelines",
        "POST /guidelines",
        "DELETE /guidelines/:id",
        "GET /health",
        "GET /debug",
        "GET /raw-data"
      ],
      cwd: process.cwd(),
      data_file: DATA_FILE
    });
  });

  // API: Raw Data
  cloudRouter.get("/raw-data", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.header("Content-Type", "application/json");
      res.send(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Catch-all for unmatched /cloud-v1 requests
  cloudRouter.all("*", (req, res) => {
    console.warn(`[Cloud-API] 404 Not Found in Router: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "Cloud API Endpoint Not Found", 
      method: req.method, 
      path: req.url,
      fullPath: `/cloud-v1${req.url}`,
      hint: "The request reached the Cloud API router but didn't match any specific route."
    });
  });

  // Mount the router
  app.use("/cloud-v1", cloudRouter);

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
    console.log(`[Server] API endpoints: /cloud-v1/health, /cloud-v1/guidelines`);
  });
}

startServer().catch(err => {
  console.error("[Server] CRITICAL: Server failed to start!", err);
});
