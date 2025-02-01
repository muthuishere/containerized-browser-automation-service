import { serve } from "bun";
import { chromium } from "playwright";

let browser;
let currentPage;
let isInitialized = false;

// Initialize browser with specific configuration
async function initBrowser() {
  try {
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--display=" + process.env.DISPLAY,
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Create initial context and page
    const context = await browser.newContext({
      viewport: {
        width: parseInt(process.env.DISPLAY_WIDTH) || 1024,
        height: parseInt(process.env.DISPLAY_HEIGHT) || 768,
      },
    });

    currentPage = await context.newPage();
    isInitialized = true;

    // Monitor browser disconnection
    browser.on("disconnected", () => {
      isInitialized = false;
      reconnectBrowser();
    });

    return true;
  } catch (error) {
    console.error("Browser initialization failed:", error);
    return false;
  }
}

async function reconnectBrowser() {
  console.log("Attempting to reconnect browser...");
  let retries = 3;
  while (retries > 0 && !isInitialized) {
    try {
      await initBrowser();
      if (isInitialized) {
        console.log("Browser reconnected successfully");
        return true;
      }
    } catch (error) {
      console.error(
        `Reconnection attempt failed. Retries left: ${retries - 1}`,
      );
    }
    retries--;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between retries
  }
  return false;
}

// Check and ensure browser/page are available
async function ensureBrowserAndPage() {
  if (
    !isInitialized ||
    !browser ||
    !currentPage ||
    browser.isConnected() === false
  ) {
    await reconnectBrowser();
  }

  if (!isInitialized) {
    throw new Error("Browser initialization failed");
  }
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST") {
      const body = await req.json();

      switch (url.pathname) {
        case "/goto": {
          try {
            await ensureBrowserAndPage();
            await currentPage.goto(body.url, {
              waitUntil: "networkidle",
            });
            return new Response(JSON.stringify({ success: true }));
          } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
            });
          }
        }

        case "/click": {
          try {
            await ensureBrowserAndPage();
            await currentPage.click(body.selector, {
              timeout: 5000,
              waitFor: "visible",
            });
            return new Response(JSON.stringify({ success: true }));
          } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
            });
          }
        }

        case "/type": {
          try {
            await ensureBrowserAndPage();
            await currentPage.fill(body.selector, body.text);
            return new Response(JSON.stringify({ success: true }));
          } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
            });
          }
        }
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

// Initialize browser when server starts
initBrowser()
  .then((success) => {
    if (success) {
      console.log("Browser initialized successfully");
    } else {
      console.error("Initial browser initialization failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Failed to initialize browser:", error);
    process.exit(1);
  });

console.log(`Server running at http://localhost:3000`);
