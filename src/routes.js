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

async function handleStopScript(browserManager, body) {
  const { scriptId } = body;
  const success = await browserManager.stopScript(scriptId);
  return new Response(JSON.stringify({ success }));
}

async function handleShowBrowserWindow(browserManager) {
  await browserManager.showBrowser();
  return new Response(
    JSON.stringify({
      success: true,
      message: "Browser window shown successfully",
    }),
  );
}

async function handleHideBrowserWindow(browserManager) {
  await browserManager.hideBrowser();
  return new Response(
    JSON.stringify({
      success: true,
      message: "Browser window hidden successfully",
    }),
  );
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

async function handleShowVNCViewer() {
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

async function handleGetScreenshot(browserManager) {
  try {
    const screenshot = await browserManager.getScreenshot();

    if (!screenshot || screenshot.length === 0) {
      throw new Error("Screenshot data is empty");
    }

    // Create a ReadableStream from the screenshot buffer
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(screenshot);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": screenshot.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("Screenshot handler error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

async function handleGetHtml(browserManager) {
  try {
    const html = await browserManager.getHtml();
    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

async function handleExecuteScript(browserManager, req, url) {
  let script;

  // Check if the request contains a file
  const contentType = req.headers.get("content-type");
  if (contentType && contentType.includes("multipart/form-data")) {
    // Handle file upload
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
      });
    }
    script = await file.text();
  } else {
    // Handle direct script text
    script = await req.text();
  }
  return handleExecuteScriptWithContent(browserManager, script, req, url);
}
async function handleExecuteScriptWithContent(
  browserManager,
  script,
  req,
  url,
) {
  const continuous = url.searchParams.get("type") === "continuous";

  console.log("handleExecuteScript: ", script);
  console.log("continuous: ", continuous);

  if (continuous) {
    try {
      const { stream, scriptId } =
        await browserManager.executeContinuousScript(script);

      // Create a ReadableStream for SSE
      const readableStream = new ReadableStream({
        start(controller) {
          // Handle incoming data from the script's stream
          stream.on("data", (data) => {
            // Convert Buffer to string if needed and parse it
            const jsonData =
              typeof data === "string" ? data : data.toString("utf-8");
            const eventData = `data: ${jsonData}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
          });

          // Handle stream end
          stream.on("end", () => {
            console.log(
              `[Stream End] Script ${scriptId} stream ended naturally`,
            );
            controller.close();
            browserManager.stopScript(scriptId);
          });

          // Handle errors
          stream.on("error", (error) => {
            console.log(
              `[Stream Error] Script ${scriptId} encountered error:`,
              error,
            );
            controller.error(error);
            browserManager.stopScript(scriptId);
          });
        },
        cancel() {
          console.log(
            `[Client Disconnect] Script ${scriptId} - client disconnected`,
          );
          // Clean up when the client disconnects
          browserManager.stopScript(scriptId);
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Script-ID": scriptId,
        },
      });
    } catch (error) {
      console.error("[Execute Error]", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }
  } else {
    try {
      const result = await browserManager.executeScript(script);
      return new Response(JSON.stringify({ result }));
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }
  }
}

async function handleShowDevTools(browserManager) {
  await browserManager.showDevTools();
  return new Response(
    JSON.stringify({
      success: true,
      message: "DevTools shown successfully",
    }),
  );
}

async function handleHideDevTools(browserManager) {
  await browserManager.hideDevTools();
  return new Response(
    JSON.stringify({
      success: true,
      message: "DevTools hidden successfully",
    }),
  );
}
export async function setupRoutes(req, browserManager) {
  const url = new URL(req.url);
  // Handle GET requests
  if (req.method === "GET") {
    const handler = getRouteHandlers[url.pathname];
    if (handler) {
      return await handler(browserManager);
    }
    return new Response("Not Found", { status: 404 });
  }

  // Handle POST requests for API endpoints
  if (req.method === "POST") {
    try {
      console.log("URL Pathname: ", url.pathname);
      if (url.pathname === "/api/execute") {
        // Special handling for execute endpoint
        return await handleExecuteScript(browserManager, req, url);
      }

      const handler = postRouteHandlers[url.pathname];

      if (!handler) {
        return new Response("Not Found", { status: 404 });
      }

      // For other endpoints that expect JSON
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
}

const getRouteHandlers = {
  "/show-vnc-viewer": handleShowVNCViewer,
  "/api/browser/show": handleShowBrowserWindow,
  "/api/browser/hide": handleHideBrowserWindow,
  "/api/devtools/show": handleShowDevTools,
  "/api/devtools/hide": handleHideDevTools,
  "/api/screenshot": handleGetScreenshot,
  "/api/html": handleGetHtml,
};

const postRouteHandlers = {
  "/api/goto": handleGoto,
  "/api/click": handleClick,
  "/api/type": handleType,
  "/api/browser/close": handleBrowserClose,
  "/api/browser/restart": handleBrowserRestart,
  "/api/execute/stop": handleStopScript,
};
