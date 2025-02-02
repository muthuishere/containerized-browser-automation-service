// src/server.js
import { serve } from "bun";
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { BrowserManager } from "./services/browserManager";
import { setupRoutes } from "./routes";
import { CONFIG } from "./config";

// Initialize Browser Manager with specific profile
const browserManager = new BrowserManager("profile1"); // You can make this configurable via env

const server = serve({
  port: CONFIG.serverPort,
  fetch: async (req) => setupRoutes(req, browserManager),
});

// Initialize browser when server starts
browserManager
  .init()
  .then(() => {
    console.log(`Server running at http://localhost:${CONFIG.serverPort}`);
  })
  .catch((error) => {
    console.error("Failed to initialize browser:", error);
    process.exit(1);
  });

// Handle cleanup on shutdown
process.on("SIGTERM", () => browserManager.cleanup());
process.on("SIGINT", () => browserManager.cleanup());
