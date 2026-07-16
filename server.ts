import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables from .env if present
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware for API proxying
  app.use(express.json());

  // API Route: check if GAS_URL is configured
  app.get("/api/gas-config", (req, res) => {
    const hasGasUrl = !!process.env.GAS_URL;
    res.json({
      configured: hasGasUrl,
      message: hasGasUrl 
        ? "Google Apps Script Web App URL terdeteksi di backend." 
        : "Google Apps Script Web App URL belum dikonfigurasi di backend."
    });
  });

  // API Proxy GET: forward to Google Apps Script
  app.get("/api/gas", async (req, res) => {
    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) {
      return res.status(404).json({
        status: "error",
        message: "GAS_URL belum dikonfigurasi pada server backend (.env)."
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
    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) {
      return res.status(404).json({
        status: "error",
        message: "GAS_URL belum dikonfigurasi pada server backend (.env)."
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
    console.log(`Server PLN Logimat berjalan di http://localhost:${PORT}`);
  });
}

startServer();
