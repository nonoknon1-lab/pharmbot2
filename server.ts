import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "data", "guidelines.json");

async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
}

async function startServer() {
  await ensureDataDir();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API: Get all guidelines
  app.get("/api/guidelines", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Failed to read guidelines" });
    }
  });

  // API: Add a guideline
  app.post("/api/guidelines", async (req, res) => {
    try {
      const newGuideline = req.body;
      const data = await fs.readFile(DATA_FILE, "utf-8");
      const guidelines = JSON.parse(data);
      guidelines.push(newGuideline);
      await fs.writeFile(DATA_FILE, JSON.stringify(guidelines, null, 2));
      res.status(201).json(newGuideline);
    } catch (err) {
      res.status(500).json({ error: "Failed to save guideline" });
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
