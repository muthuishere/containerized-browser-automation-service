import { file } from "bun";

async function handleGoto(browserManager, body) {
  try {
    await browserManager.goto(body.url);
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Detailed error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        details: error,
      }),
      { status: 500 },
    );
  }
}

async function handleClick(browserManager, body) {
  await browserManager.click(body.selector);
  return new Response(JSON.stringify({ success: true }));
}

async function handleType(browserManager, body) {
  await browserManager.type(body.selector, body.text);
  return new Response(JSON.stringify({ success: true }));
}

async function handleBrowserClose(browserManager) {
  await browserManager.cleanup();
  return new Response(
    JSON.stringify({
      success: true,
      message: "Browser closed successfully",
    }),
  );
}

async function handleBrowserRestart(browserManager) {
  await browserManager.cleanup();
  const success = await browserManager.init();
  if (!success) {
    throw new Error("Failed to restart browser");
  }
  return new Response(
    JSON.stringify({
      success: true,
      message: "Browser restarted successfully",
    }),
  );
}

async function handleShowBrowser() {
  try {
    const vncTemplate = await file("src/templates/vnc-viewer.html").text();
    return new Response(vncTemplate, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error serving VNC viewer:", error);
    return new Response("Error loading VNC viewer", { status: 500 });
  }
}

const routeHandlers = {
  "/api/goto": handleGoto,
  "/api/click": handleClick,
  "/api/type": handleType,
  "/api/browser/close": handleBrowserClose,
  "/api/browser/restart": handleBrowserRestart,
  "/show-browser": handleShowBrowser, // New endpoint
};
export async function setupRoutes(req, browserManager) {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/show-browser") {
    return handleShowBrowser();
  }

  // Handle POST requests for API endpoints
  if (req.method !== "POST") {
    return new Response("Not Found", { status: 404 });
  }
  const handler = routeHandlers[url.pathname];

  if (!handler) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const body = await req.json();
    return await handler(browserManager, body);
  } catch (error) {
    console.error("Route error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      { status: 500 },
    );
  }
}
