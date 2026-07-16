import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from .env if present
dotenv.config();

// Helper to resolve the GAS Web App URL, prioritizing env, then constants.ts
function resolveGasUrl(): string | null {
  if (process.env.GAS_URL && process.env.GAS_URL.startsWith("https://script.google.com")) {
    return process.env.GAS_URL;
  }

  try {
    const constantsPath = path.join(process.cwd(), "src", "utils", "constants.ts");
    if (fs.existsSync(constantsPath)) {
      const content = fs.readFileSync(constantsPath, "utf-8");
      const match = content.match(/SPREADSHEET_WEB_APP_URL\s*=\s*['"`](https:\/\/script\.google\.com\/macros\/s\/[^'"`]+)['"`]/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (err) {
    console.error("Gagal membaca constants.ts untuk konfigurasi GAS_URL:", err);
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware for API proxying
  app.use(express.json());

  // API Route: check if GAS_URL is configured
  app.get("/api/gas-config", (req, res) => {
    const gasUrl = resolveGasUrl();
    const hasGasUrl = !!gasUrl;
    res.json({
      configured: hasGasUrl,
      message: hasGasUrl 
        ? "Google Apps Script Web App URL terdeteksi dan siap digunakan." 
        : "Google Apps Script Web App URL belum dikonfigurasi."
    });
  });

  // API Proxy GET: forward to Google Apps Script
  app.get("/api/gas", async (req, res) => {
    const gasUrl = resolveGasUrl();
    if (!gasUrl) {
      return res.status(404).json({
        status: "error",
        message: "GAS_URL belum dikonfigurasi. Atur di file .env atau src/utils/constants.ts."
      });
    }

    try {
      const urlObj = new URL(gasUrl);
      // Copy all incoming search params to the target URL
      Object.entries(req.query).forEach(([key, val]) => {
        if (val !== undefined) {
          urlObj.searchParams.set(key, String(val));
        }
      });

      const response = await fetch(urlObj.toString(), {
        method: "GET"
      });

      if (!response.ok) {
        return res.status(response.status).json({
          status: "error",
          message: `Google Apps Script mengembalikan status HTTP ${response.status}`
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Gagal melakukan proxy GET ke GAS:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Gagal menghubungi Google Apps Script."
      });
    }
  });

  // API Proxy POST: forward data to Google Apps Script
  app.post("/api/gas", async (req, res) => {
    const gasUrl = resolveGasUrl();
    if (!gasUrl) {
      return res.status(404).json({
        status: "error",
        message: "GAS_URL belum dikonfigurasi. Atur di file .env atau src/utils/constants.ts."
      });
    }

    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        return res.status(response.status).json({
          status: "error",
          message: `Google Apps Script mengembalikan status HTTP ${response.status}`
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Gagal melakukan proxy POST ke GAS:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Gagal menghubungi Google Apps Script."
      });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server PLN ES Logimat berjalan di http://localhost:${PORT}`);
  });
}

startServer();
