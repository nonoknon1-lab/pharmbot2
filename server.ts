import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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
      const newGuideline = req.body;
      if (!newGuideline || !newGuideline.id) {
        console.warn("[Server] Received invalid guideline data:", req.body);
        return res.status(400).json({ error: "Invalid guideline data" });
      }

      const bodySize = JSON.stringify(req.body).length;
      console.log(`[Server] Saving guideline: "${newGuideline.name}" (${newGuideline.type}) - Size: ${(bodySize / 1024).toFixed(2)} KB`);
      
      const data = await fs.readFile(DATA_FILE, "utf-8");
      const guidelines = JSON.parse(data);
      
      // Prevent duplicates
      const filtered = guidelines.filter((g: any) => g.id !== newGuideline.id);
      filtered.push(newGuideline);
      
      await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2));
      console.log(`[Server] Successfully saved: "${newGuideline.name}"`);
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
